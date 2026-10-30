use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::IntoResponse,
};
use crate::state::AppState;
use futures::{SinkExt, StreamExt};
use uuid::Uuid;

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
            tracing::error!("Failed to subscribe to NATS channel {}: {}", channel_name, e);
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

    // Forward incoming WebSocket messages to NATS channel
    let nats_client = state.nats.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            let _ = nats_client.publish(channel_name.clone(), text.into()).await;
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }
}
