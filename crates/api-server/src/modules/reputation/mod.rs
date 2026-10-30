pub mod handlers;
pub mod karma;

pub use karma::KarmaCalculationEngine;

use crate::state::AppState;
use axum::{routing::post, Router};

pub fn reputation_routes() -> Router<AppState> {
    Router::new().route("/reviews", post(handlers::submit_review))
}
