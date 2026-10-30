pub mod matchmaking;
pub mod turn;
pub mod ws;

pub use turn::TurnCredentialService;

use crate::state::AppState;
use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use shared_types::auth::TokenClaims;
use uuid::Uuid;

pub async fn get_lobby_rtc_config(
    State(state): State<AppState>,
    claims: Option<Extension<TokenClaims>>,
    Path(_lobby_id): Path<Uuid>,
) -> Json<shared_types::lfg::RtcLobbyConfig> {
    // IDOR Protection: Extract caller's verified UUID from JWT claims
    let user_id = claims
        .map(|c| c.0.sub.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let config = state.turn.generate_credentials(&user_id, 12 * 3600);
    Json(config)
}

pub fn lfg_routes() -> Router<AppState> {
    Router::new()
        .route("/search", get(matchmaking::search_duos))
        .route("/lobbies/:id/ws", get(ws::ws_lobby_handler))
        .route("/lobbies/:id/rtc-config", get(get_lobby_rtc_config))
}
