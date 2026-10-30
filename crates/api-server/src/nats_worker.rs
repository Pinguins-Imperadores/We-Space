use async_nats::Client;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::{error, info, warn};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipUploadedEvent {
    pub clip_id: Uuid,
    pub author_id: Uuid,
    pub file_sha256: String,
    pub r2_object_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LobbyEvent {
    pub lobby_id: Uuid,
    pub user_id: Uuid,
    pub event_type: String, // e.g. "CREATED", "PLAYER_JOINED", "PLAYER_LEFT", "VOICE_STARTED"
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModerationAlertEvent {
    pub target_id: Uuid,
    pub reporter_id: Uuid,
    pub reason: String,
    pub severity: u8, // 1 to 5
}

/// Start NATS JetStream & Core background subscribers
pub async fn start_nats_worker(nats: Client, db: PgPool) {
    info!("Starting We Space NATS JetStream Worker...");

    // Spawn clips.uploaded subscriber
    let nats_clips = nats.clone();
    let db_clips = db.clone();
    tokio::spawn(async move {
        if let Ok(mut sub) = nats_clips.subscribe("wespace.clips.uploaded").await {
            info!("Subscribed to 'wespace.clips.uploaded'");
            while let Some(msg) = sub.next().await {
                if let Ok(event) = serde_json::from_slice::<ClipUploadedEvent>(&msg.payload) {
                    info!("Processing clips.uploaded event for clip {}", event.clip_id);
                    let res = sqlx::query(
                        r#"
                        UPDATE clips 
                        SET status = 'VERIFIED'
                        WHERE id = $1 AND file_sha256 = $2
                        "#,
                    )
                    .bind(event.clip_id)
                    .bind(&event.file_sha256)
                    .execute(&db_clips)
                    .await;

                    match res {
                        Ok(rows) => {
                            info!(
                                "Clip {} marked as VERIFIED ({} rows updated)",
                                event.clip_id,
                                rows.rows_affected()
                            );
                        }
                        Err(e) => {
                            error!("Failed to update clip {}: {}", event.clip_id, e);
                        }
                    }
                } else {
                    warn!("Invalid payload on wespace.clips.uploaded");
                }
            }
        }
    });

    // Spawn lfg.lobby.events subscriber
    let nats_lfg = nats.clone();
    tokio::spawn(async move {
        if let Ok(mut sub) = nats_lfg.subscribe("wespace.lfg.lobby.events").await {
            info!("Subscribed to 'wespace.lfg.lobby.events'");
            while let Some(msg) = sub.next().await {
                if let Ok(event) = serde_json::from_slice::<LobbyEvent>(&msg.payload) {
                    info!(
                        "LFG Event received: lobby {} user {} type {}",
                        event.lobby_id, event.user_id, event.event_type
                    );
                } else {
                    warn!("Invalid payload on wespace.lfg.lobby.events");
                }
            }
        }
    });

    // Spawn moderation.alerts subscriber
    let nats_mod = nats.clone();
    let db_mod = db.clone();
    tokio::spawn(async move {
        if let Ok(mut sub) = nats_mod.subscribe("wespace.moderation.alerts").await {
            info!("Subscribed to 'wespace.moderation.alerts'");
            while let Some(msg) = sub.next().await {
                if let Ok(alert) = serde_json::from_slice::<ModerationAlertEvent>(&msg.payload) {
                    warn!(
                        "Moderation Alert: Target {} reported by {} (Severity: {}, Reason: {})",
                        alert.target_id, alert.reporter_id, alert.severity, alert.reason
                    );

                    // Automatic penalty for high-severity toxicity or verified cheating
                    if alert.severity >= 3 {
                        let penalty = if alert.severity >= 4 { 15.00 } else { 5.00 };
                        let _ = sqlx::query(
                            r#"
                            UPDATE users 
                            SET karma_score = GREATEST(0.00, karma_score - $1)
                            WHERE id = $2
                            "#,
                        )
                        .bind(penalty)
                        .bind(alert.target_id)
                        .execute(&db_mod)
                        .await;
                        info!(
                            "Applied {} Karma penalty to target user {}",
                            penalty, alert.target_id
                        );
                    }
                } else {
                    warn!("Invalid payload on wespace.moderation.alerts");
                }
            }
        }
    });
}

// Publishing helper methods
pub async fn publish_clip_uploaded(nats: &Client, event: &ClipUploadedEvent) -> anyhow::Result<()> {
    let payload = serde_json::to_vec(event)?;
    nats.publish("wespace.clips.uploaded", payload.into())
        .await?;
    Ok(())
}

pub async fn publish_lobby_event(nats: &Client, event: &LobbyEvent) -> anyhow::Result<()> {
    let payload = serde_json::to_vec(event)?;
    nats.publish("wespace.lfg.lobby.events", payload.into())
        .await?;
    Ok(())
}

pub async fn publish_moderation_alert(
    nats: &Client,
    event: &ModerationAlertEvent,
) -> anyhow::Result<()> {
    let payload = serde_json::to_vec(event)?;
    nats.publish("wespace.moderation.alerts", payload.into())
        .await?;
    Ok(())
}
