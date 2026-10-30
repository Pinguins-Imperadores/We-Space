use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserKarmaProfile {
    pub user_id: Uuid,
    pub username: String,
    pub karma_score: f32,
    pub radar_mechanics: u8,
    pub radar_comms: u8,
    pub radar_resilience: u8,
    pub radar_gamesense: u8,
    pub radar_leadership: u8,
    pub positive_reviews_count: u32,
    pub negative_reviews_count: u32,
    pub top_badges: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostMatchReviewRequest {
    pub lobby_id: Uuid,
    pub target_id: Uuid,
    pub is_positive: bool,
    pub badges: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewOutcomeResponse {
    pub review_id: Uuid,
    pub delta_karma: f32,
    pub weight_applied: f32,
    pub new_target_karma: f32,
}
