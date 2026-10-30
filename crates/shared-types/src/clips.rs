use super::lfg::GameTitle;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ClipStatus {
    PendingUpload,
    Processing,
    Verified,
    FlaggedCheat,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClipIntentRequest {
    pub game: GameTitle,
    pub title: String,
    pub file_sha256: String,
    pub stego_watermark_hash: String,
    pub gpu_encoder_fingerprint: String,
    pub trigger_telemetry: serde_json::Value,
    pub duration_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresignedUploadResponse {
    pub clip_id: Uuid,
    pub upload_url: String,
    pub r2_object_key: String,
    pub required_headers: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipResponse {
    pub id: Uuid,
    pub author_id: Uuid,
    pub author_username: String,
    pub game: GameTitle,
    pub title: String,
    pub status: ClipStatus,
    pub video_url: String,
    pub file_sha256: String,
    pub trigger_telemetry: serde_json::Value,
    pub duration_ms: u32,
    pub created_at: DateTime<Utc>,
}
