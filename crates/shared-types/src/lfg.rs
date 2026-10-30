use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameTitle {
    Valorant,
    Cs2,
    Lol,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CommStyle {
    CleanCalls,
    TryhardIgl,
    ChillNoTilt,
    ObjectiveFocused,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LfgPlayerProfile {
    pub user_id: Uuid,
    pub username: String,
    pub game: GameTitle,
    pub rank_tier: i16,
    pub primary_role: String,
    pub comm_preferences: Vec<CommStyle>,
    pub karma_score: f32,
    pub looking_for_group: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LobbySession {
    pub lobby_id: Uuid,
    pub host_id: Uuid,
    pub game: GameTitle,
    pub max_players: u8,
    pub current_players: Vec<Uuid>,
    pub is_voice_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RtcIceServer {
    pub urls: Vec<String>,
    pub username: Option<String>,
    pub credential: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RtcLobbyConfig {
    pub ice_servers: Vec<RtcIceServer>,
    pub ttl_seconds: u64,
}
