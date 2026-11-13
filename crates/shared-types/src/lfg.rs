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

/// Dynamic queue ticket stored in Redis memory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueTicket {
    pub user_id: Uuid,
    pub username: String,
    pub game: GameTitle,
    pub rank_tier: i16,
    pub primary_role: String,
    pub comm_preferences: Vec<CommStyle>,
    pub karma_score: f32,
    pub joined_at: i64,
    pub weighted_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinQueueRequest {
    pub game: GameTitle,
    pub rank_tier: Option<i16>,
    pub primary_role: Option<String>,
    pub comm_preferences: Option<Vec<CommStyle>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaveQueueRequest {
    pub game: GameTitle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStatusResponse {
    pub in_queue: bool,
    pub game: Option<GameTitle>,
    pub position: Option<usize>,
    pub total_in_queue: usize,
    pub elapsed_seconds: Option<u64>,
    pub current_tolerance: Option<f64>,
    pub weighted_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuoMatchResult {
    pub match_id: Uuid,
    pub lobby_id: Uuid,
    pub game: GameTitle,
    pub player_a: QueueTicket,
    pub player_b: QueueTicket,
    pub score_delta: f64,
    pub matched_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchMatchmakingResponse {
    pub game: GameTitle,
    pub matched_duos: Vec<DuoMatchResult>,
    pub remaining_in_queue: usize,
    pub batch_timestamp: i64,
}

/// Computes the weighted behavioral and rank matchmaking score for the Redis Sorted Set.
/// - Rank Tier (1-30) carries a weight of 20.0 (tier base separation)
/// - Karma Score (0.0 - 150.0) provides fine-grained behavioral proximity grouping
pub fn calculate_weighted_score(rank_tier: i16, karma_score: f32) -> f64 {
    let rank_component = (rank_tier as f64) * 20.0;
    let karma_component = (karma_score as f64).clamp(0.0, 150.0);
    rank_component + karma_component
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_weighted_score_ordering() {
        // Player 1: Rank 10, Karma 95 -> 200 + 95 = 295.0
        let score1 = calculate_weighted_score(10, 95.0);
        // Player 2: Rank 10, Karma 98 -> 200 + 98 = 298.0
        let score2 = calculate_weighted_score(10, 98.0);
        // Player 3: Rank 15, Karma 100 -> 300 + 100 = 400.0
        let score3 = calculate_weighted_score(15, 100.0);

        assert!((score1 - 295.0).abs() < 1e-4);
        assert!((score2 - 298.0).abs() < 1e-4);
        assert!((score3 - 400.0).abs() < 1e-4);
        assert!(score1 < score2);
        assert!(score2 < score3);
        // Proximity delta between similar players in same rank is small
        assert!((score2 - score1) <= 5.0);
    }

    #[test]
    fn test_karma_clamping() {
        let min_clamped = calculate_weighted_score(10, -50.0);
        assert_eq!(min_clamped, 200.0);

        let max_clamped = calculate_weighted_score(10, 250.0);
        assert_eq!(max_clamped, 350.0);
    }

    #[test]
    fn test_queue_ticket_json_roundtrip() {
        let ticket = QueueTicket {
            user_id: Uuid::new_v4(),
            username: "TacticalViper".into(),
            game: GameTitle::Valorant,
            rank_tier: 22,
            primary_role: "Controller".into(),
            comm_preferences: vec![CommStyle::CleanCalls, CommStyle::ChillNoTilt],
            karma_score: 96.5,
            joined_at: 1730000000,
            weighted_score: 536.5,
        };

        let serialized = serde_json::to_string(&ticket).expect("Serialization failed");
        let deserialized: QueueTicket =
            serde_json::from_str(&serialized).expect("Deserialization failed");

        assert_eq!(ticket.user_id, deserialized.user_id);
        assert_eq!(ticket.username, deserialized.username);
        assert_eq!(ticket.game, deserialized.game);
        assert_eq!(ticket.rank_tier, deserialized.rank_tier);
        assert_eq!(ticket.comm_preferences, deserialized.comm_preferences);
        assert!((ticket.weighted_score - deserialized.weighted_score).abs() < 1e-4);
    }
}
