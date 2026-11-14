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
    /// Normalizes RSA PEM strings injected via Fly.io secrets or environment variables,
    /// stripping surrounding quotes and converting escaped `\n` sequences into real newlines.
    pub fn normalize_pem(raw: &str) -> String {
        let trimmed = raw.trim();
        let unquoted = if (trimmed.starts_with('"') && trimmed.ends_with('"'))
            || (trimmed.starts_with('\'') && trimmed.ends_with('\''))
        {
            &trimmed[1..trimmed.len() - 1]
        } else {
            trimmed
        };

        unquoted
            .replace("\\r\\n", "\n")
            .replace("\\n", "\n")
            .replace("\r\n", "\n")
            .trim()
            .to_string()
    }

    fn non_empty_env(key: &str) -> Option<String> {
        let raw = env::var(key).ok()?;
        let normalized = Self::normalize_pem(&raw);
        (!normalized.is_empty()).then_some(normalized)
    }

    fn read_pem_file(path: &str) -> Option<String> {
        let raw = std::fs::read_to_string(path).ok()?;
        let normalized = Self::normalize_pem(&raw);
        (!normalized.is_empty()).then_some(normalized)
    }

    /// Resolves the RSA private key PEM from `JWT_PRIVATE_KEY_PEM` (Fly.io production secret),
    /// falling back to `JWT_PRIVATE_KEY` or `docs/keys/dev_private.pem` in local development.
    pub fn resolve_jwt_private_key_pem() -> String {
        Self::non_empty_env("JWT_PRIVATE_KEY_PEM")
            .or_else(|| Self::non_empty_env("JWT_PRIVATE_KEY"))
            .or_else(|| Self::read_pem_file("docs/keys/dev_private.pem"))
            .unwrap_or_default()
    }

    /// Resolves the RSA public key PEM from `JWT_PUBLIC_KEY_PEM` (Fly.io production secret),
    /// falling back to `JWT_PUBLIC_KEY` or `docs/keys/dev_public.pem` in local development.
    pub fn resolve_jwt_public_key_pem() -> String {
        Self::non_empty_env("JWT_PUBLIC_KEY_PEM")
            .or_else(|| Self::non_empty_env("JWT_PUBLIC_KEY"))
            .or_else(|| Self::read_pem_file("docs/keys/dev_public.pem"))
            .unwrap_or_default()
    }

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
            jwt_private_key_pem: Self::resolve_jwt_private_key_pem(),
            jwt_public_key_pem: Self::resolve_jwt_public_key_pem(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_pem_handles_escaped_newlines_and_quotes() {
        let raw = "\"-----BEGIN PUBLIC KEY-----\\nMOCK_RSA_PEM_BODY\\n-----END PUBLIC KEY-----\"";
        let normalized = AppConfig::normalize_pem(raw);
        assert!(normalized.starts_with("-----BEGIN PUBLIC KEY-----\n"));
        assert!(normalized.ends_with("\n-----END PUBLIC KEY-----"));
        assert!(!normalized.contains("\\n"));
    }

    #[test]
    fn test_resolve_jwt_private_key_pem_prefers_fly_secret_name() {
        env::set_var(
            "JWT_PRIVATE_KEY_PEM",
            "-----BEGIN PUBLIC KEY-----\\nFLY_PROD_PEM_TEST\\n-----END PUBLIC KEY-----",
        );
        env::set_var("JWT_PRIVATE_KEY", "LEGACY_FALLBACK_KEY");

        let resolved = AppConfig::resolve_jwt_private_key_pem();
        assert_eq!(
            resolved,
            "-----BEGIN PUBLIC KEY-----\nFLY_PROD_PEM_TEST\n-----END PUBLIC KEY-----"
        );

        env::remove_var("JWT_PRIVATE_KEY_PEM");
        env::remove_var("JWT_PRIVATE_KEY");
    }
}
