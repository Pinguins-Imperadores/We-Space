pub mod handlers;
pub mod karma;

pub use karma::KarmaCalculationEngine;

use axum::{routing::post, Router};
use crate::state::AppState;

pub fn reputation_routes() -> Router<AppState> {
    Router::new().route("/reviews", post(handlers::submit_review))
}
