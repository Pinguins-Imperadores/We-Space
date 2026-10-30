use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, Params,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use shared_types::auth::TokenClaims;
use std::sync::Arc;
use tokio::sync::Semaphore;
use uuid::Uuid;

/// Semaphore bounded to 2 concurrent Argon2id hashes to protect instance RAM on Fly.io
pub struct CryptoService {
    argon2_semaphore: Arc<Semaphore>,
    encoding_key: EncodingKey,
}

impl CryptoService {
    pub fn new(encoding_key_pem: &[u8]) -> Result<Self, jsonwebtoken::errors::Error> {
        let encoding_key = EncodingKey::from_rsa_pem(encoding_key_pem)?;
        Ok(Self {
            argon2_semaphore: Arc::new(Semaphore::new(2)),
            encoding_key,
        })
    }

    /// Transient fallback for development when external PEM is not configured
    pub fn new_transient_dev() -> Result<Self, anyhow::Error> {
        let dummy_rsa = include_str!("../../../../../docs/keys/dev_public.pem");
        let dummy_private = include_bytes!("../../../../../docs/keys/dev_public.pem");
        // For dev fallback, allow initialization
        Ok(Self {
            argon2_semaphore: Arc::new(Semaphore::new(2)),
            encoding_key: EncodingKey::from_secret(b"dev_transient_secret_32bytes_min!"),
        })
    }

    /// Hashes password with OWASP-recommended Argon2id parameters:
    /// m_cost = 19456 KiB, t_cost = 2, p_cost = 1
    pub async fn hash_password(&self, password: String) -> Result<String, String> {
        let _permit = self
            .argon2_semaphore
            .acquire()
            .await
            .map_err(|e| e.to_string())?;

        tokio::task::spawn_blocking(move || {
            let salt = SaltString::generate(&mut OsRng);
            let params = Params::new(19456, 2, 1, None).map_err(|e| e.to_string())?;
            let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

            argon2
                .hash_password(password.as_bytes(), &salt)
                .map(|h| h.to_string())
                .map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    /// Verifies password against Argon2id hash.
    pub async fn verify_password(&self, password: String, hash: String) -> Result<bool, String> {
        let _permit = self
            .argon2_semaphore
            .acquire()
            .await
            .map_err(|e| e.to_string())?;

        tokio::task::spawn_blocking(move || {
            let parsed_hash = PasswordHash::new(&hash).map_err(|e| e.to_string())?;
            Ok(Argon2::default()
                .verify_password(password.as_bytes(), &parsed_hash)
                .is_ok())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    /// Generates short-lived Access Token signed with RS256 (15 minutes).
    pub fn generate_access_token(
        &self,
        user_id: Uuid,
        username: String,
        role: String,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = chrono::Utc::now().timestamp() as usize;
        let claims = TokenClaims {
            sub: user_id,
            username,
            role,
            iat: now,
            exp: now + 15 * 60, // 15 minutes
        };

        let mut header = Header::new(jsonwebtoken::Algorithm::RS256);
        header.kid = Some("wespace-core-key-1".to_string());
        encode(&header, &claims, &self.encoding_key)
    }
}
