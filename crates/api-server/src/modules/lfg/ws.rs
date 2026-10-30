use crate::state::AppState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use shared_types::sanitize::sanitize_text;
use uuid::Uuid;

const MAX_WS_MESSAGE_BYTES: usize = 64 * 1024; // 64 KB strictly enforced
const MAX_MALFORMED_MESSAGES: u8 = 3; // Disconnect after 3 malformed payloads

pub async fn ws_lobby_handler(
    ws: WebSocketUpgrade,
    Path(lobby_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, lobby_id, state))
}

async fn handle_socket(socket: WebSocket, lobby_id: Uuid, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let channel_name = format!("lobby.{}", lobby_id);

    // Subscribe to NATS JetStream / Core pub/sub for this lobby
    let mut nats_sub = match state.nats.subscribe(channel_name.clone()).await {
        Ok(sub) => sub,
        Err(e) => {
            tracing::error!(
                "Failed to subscribe to NATS channel {}: {}",
                channel_name,
                e
            );
            return;
        }
    };

    // Forward NATS messages to WebSocket client
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = nats_sub.next().await {
            if let Ok(text) = String::from_utf8(msg.payload.to_vec()) {
                if sender.send(Message::Text(text)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Forward incoming WebSocket messages to NATS channel with strict validation & sanitization
    let nats_client = state.nats.clone();
    let mut recv_task = tokio::spawn(async move {
        let mut malformed_count = 0u8;

        while let Some(msg_result) = receiver.next().await {
            let msg = match msg_result {
                Ok(m) => m,
                Err(_) => break,
            };

            match msg {
                Message::Text(text) => {
                    // 1. Enforce payload size limit (max 64 KB)
                    if text.len() > MAX_WS_MESSAGE_BYTES {
                        tracing::warn!(
                            "Dropping WS client: Message exceeded 64 KB limit ({} bytes)",
                            text.len()
                        );
                        break;
                    }

                    // 2. Enforce strict JSON structure validation
                    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&text);
                    match parsed {
                        Ok(mut json_val) => {
                            // 3. Sanitize text fields if payload contains chat message
                            if let Some(msg_str) = json_val.get("message").and_then(|m| m.as_str())
                            {
                                let clean = sanitize_text(msg_str);
                                if let Some(obj) = json_val.as_object_mut() {
                                    obj.insert("message".into(), serde_json::Value::String(clean));
                                }
                            }

                            let sanitized_payload = json_val.to_string();
                            let _ = nats_client
                                .publish(channel_name.clone(), sanitized_payload.into())
                                .await;
                        }
                        Err(e) => {
                            malformed_count += 1;
                            tracing::warn!(
                                "Malformed WS JSON payload (attempt {}/{}): {}",
                                malformed_count,
                                MAX_MALFORMED_MESSAGES,
                                e
                            );
                            if malformed_count >= MAX_MALFORMED_MESSAGES {
                                tracing::warn!(
                                    "Disconnecting abusive client sending malformed WS payloads"
                                );
                                break;
                            }
                        }
                    }
                }
                Message::Close(_) => break,
                Message::Ping(_) | Message::Pong(_) => continue,
                Message::Binary(_) => {
                    // We Space LFG voice signaling is strictly text/JSON; binary frames are rejected
                    tracing::warn!("Rejected unexpected binary WebSocket frame");
                    break;
                }
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }
}
