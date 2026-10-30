use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub nats_url: String,
    pub jwt_private_key_pem: String,
    pub jwt_public_key_pem: String,
    pub turn_host: String,
    pub turn_port: u16,
    pub turn_secret: String,
    pub turn_realm: String,
    pub r2_account_id: String,
    pub r2_bucket_name: String,
    pub r2_access_key_id: String,
    pub r2_secret_access_key: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
            database_url: env::var("DATABASE_URL").unwrap_or_else(|_| {
                "postgres://wespace_admin:dev_secret_pass_change_me@127.0.0.1:5432/wespace_core"
                    .into()
            }),
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://127.0.0.1:4222".into()),
            jwt_private_key_pem: env::var("JWT_PRIVATE_KEY")
                .or_else(|_| std::fs::read_to_string("docs/keys/dev_private.pem"))
                .unwrap_or_default(),
            jwt_public_key_pem: env::var("JWT_PUBLIC_KEY")
                .or_else(|_| std::fs::read_to_string("docs/keys/dev_public.pem"))
                .unwrap_or_default(),
            turn_host: env::var("TURN_HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            turn_port: env::var("TURN_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3478),
            turn_secret: env::var("TURN_HMAC_SECRET")
                .unwrap_or_else(|_| "dev_turn_hmac_secret_32bytes_min!".into()),
            turn_realm: env::var("TURN_REALM").unwrap_or_else(|_| "turn.wespace.gg".into()),
            r2_account_id: env::var("R2_ACCOUNT_ID").unwrap_or_else(|_| "dev_r2_account".into()),
            r2_bucket_name: env::var("R2_BUCKET_NAME")
                .unwrap_or_else(|_| "wespace-clips-prod".into()),
            r2_access_key_id: env::var("R2_ACCESS_KEY_ID")
                .unwrap_or_else(|_| "dev_access_key".into()),
            r2_secret_access_key: env::var("R2_SECRET_ACCESS_KEY")
                .unwrap_or_else(|_| "dev_secret_access_key".into()),
        }
    }
}
