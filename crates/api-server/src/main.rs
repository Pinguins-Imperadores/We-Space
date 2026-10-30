mod config;
mod middleware;
mod modules;
mod state;

use axum::{
    http::{header, Method},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use config::AppConfig;
use fred::prelude::*;
use modules::{
    auth::{auth_routes, CryptoService},
    clips::{clips_routes, CloudflareR2Service},
    lfg::{lfg_routes, TurnCredentialService},
    reputation::reputation_routes,
};
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use std::sync::Arc;
use std::time::Duration;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::info;

async fn healthcheck() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "wespace-api",
        "version": "0.1.0",
        "region": "gru",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,wespace_api=debug,tower_http=info".into()),
        )
        .json()
        .init();

    info!("Starting We Space API Monolith v0.1.0 (Fly.io GRU target)...");

    let config = Arc::new(AppConfig::from_env());

    // 1. PostgreSQL 16 Pool
    let db = PgPoolOptions::new()
        .max_connections(50)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Postgres not connected (offline dev mode): {}", e);
            panic!("Cannot run without database pool");
        });

    // 2. Redis 7 Client
    let redis_config = RedisConfig::from_url(&config.redis_url)?;
    let redis = RedisClient::new(redis_config, None, None, None);
    let _ = redis.connect();

    // 3. NATS JetStream Client
    let nats = async_nats::connect(&config.nats_url)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("NATS not connected (offline dev mode): {}", e);
            panic!("Cannot run without NATS");
        });

    // 4. Crypto, Turn, and R2 services
    let crypto = Arc::new(
        CryptoService::new(config.jwt_private_key_pem.as_bytes()).unwrap_or_else(|e| {
            tracing::warn!("JWT private key invalid or empty, using transient dev key: {}", e);
            // Fallback for development if no PEM is supplied
            CryptoService::new_transient_dev().expect("Transient key generation failed")
        }),
    );
    let turn = Arc::new(TurnCredentialService::new(
        config.turn_host.clone(),
        config.turn_port,
        config.turn_secret.clone(),
        config.turn_realm.clone(),
    ));
    let r2 = Arc::new(CloudflareR2Service::new(
        config.r2_account_id.clone(),
        config.r2_bucket_name.clone(),
        config.r2_access_key_id.clone(),
        config.r2_secret_access_key.clone(),
    ));

    let state = AppState {
        db,
        redis,
        nats,
        crypto,
        turn,
        r2,
        config: config.clone(),
    };

    // 5. CORS Layer
    let cors = CorsLayer::new()
        .allow_origin([
            "https://wespace.gg".parse()?,
            "https://app.wespace.gg".parse()?,
            "http://localhost:5173".parse()?,
            "http://localhost:3000".parse()?,
            "tauri://localhost".parse()?,
            "http://tauri.localhost".parse()?,
        ])
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, header::ACCEPT])
        .allow_credentials(true);

    // 6. Router Assembly
    let api_routes = Router::new()
        .route("/healthcheck", get(healthcheck))
        .nest("/auth", auth_routes())
        .nest("/lfg", lfg_routes())
        .nest("/clips", clips_routes())
        .nest("/reputation", reputation_routes());

    let app = Router::new()
        .nest("/api/v1", api_routes)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("We Space API listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install CTRL+C signal handler");
    info!("Shutdown signal received, draining active connections...");
}
