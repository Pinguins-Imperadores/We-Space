use crate::config::AppConfig;
use crate::modules::auth::CryptoService;
use crate::modules::clips::CloudflareR2Service;
use crate::modules::lfg::TurnCredentialService;
use fred::prelude::*;
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisClient,
    pub nats: async_nats::Client,
    pub crypto: Arc<CryptoService>,
    pub turn: Arc<TurnCredentialService>,
    pub r2: Arc<CloudflareR2Service>,
    pub config: Arc<AppConfig>,
}
