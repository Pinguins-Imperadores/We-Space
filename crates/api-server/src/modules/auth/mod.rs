pub mod crypto;
pub mod handlers;

pub use crypto::CryptoService;

use crate::state::AppState;
use axum::{routing::post, Router};

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(handlers::register))
        .route("/login", post(handlers::login))
}
