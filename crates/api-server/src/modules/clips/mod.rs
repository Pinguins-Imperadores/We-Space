pub mod handlers;
pub mod r2;

pub use r2::CloudflareR2Service;

use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};

pub fn clips_routes() -> Router<AppState> {
    Router::new()
        .route("/intent", post(handlers::create_clip_intent))
        .route("/feed", get(handlers::get_feed))
}
