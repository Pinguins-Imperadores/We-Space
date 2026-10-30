use base64::{engine::general_purpose::STANDARD, Engine as _};
use hmac::{Hmac, Mac};
use sha1::Sha1;
use shared_types::lfg::{RtcIceServer, RtcLobbyConfig};
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha1 = Hmac<Sha1>;

pub struct TurnCredentialService {
    turn_host: String,
    turn_port: u16,
    turn_secret: String,
    realm: String,
}

impl TurnCredentialService {
    pub fn new(turn_host: String, turn_port: u16, turn_secret: String, realm: String) -> Self {
        Self {
            turn_host,
            turn_port,
            turn_secret,
            realm,
        }
    }

    /// Generates time-limited HMAC-SHA1 Coturn credentials.
    /// Format: username = "<expiry_unix_timestamp>:<user_id>"
    /// password = base64(hmac_sha1(turn_secret, username))
    pub fn generate_credentials(&self, user_id: &str, ttl_seconds: u64) -> RtcLobbyConfig {
        let expiration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            + ttl_seconds;

        let username = format!("{}:{}", expiration, user_id);

        let mut mac = HmacSha1::new_from_slice(self.turn_secret.as_bytes())
            .expect("HMAC-SHA1 accepts keys of any size");
        mac.update(username.as_bytes());
        let credential = STANDARD.encode(mac.finalize().into_bytes());

        let stun_url = format!("stun:{}:{}", self.turn_host, self.turn_port);
        let turn_udp_url = format!("turn:{}:{}?transport=udp", self.turn_host, self.turn_port);
        let turn_tcp_url = format!("turn:{}:{}?transport=tcp", self.turn_host, self.turn_port);

        let ice_servers = vec![
            RtcIceServer {
                urls: vec![stun_url],
                username: None,
                credential: None,
            },
            RtcIceServer {
                urls: vec![turn_udp_url, turn_tcp_url],
                username: Some(username),
                credential: Some(credential),
            },
        ];

        RtcLobbyConfig {
            ice_servers,
            ttl_seconds,
        }
    }
}
