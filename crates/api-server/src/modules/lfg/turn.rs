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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_coturn_hmac_sha1_generation() {
        let secret = "wespace_super_secret_turn_key";
        let service = TurnCredentialService::new(
            "turn.wespace.gg".into(),
            3478,
            secret.into(),
            "wespace.gg".into(),
        );

        let config = service.generate_credentials("player_uuid_42", 3600);
        assert_eq!(config.ttl_seconds, 3600);
        assert_eq!(config.ice_servers.len(), 2);

        // 1. Verify STUN entry
        let stun = &config.ice_servers[0];
        assert_eq!(stun.urls, vec!["stun:turn.wespace.gg:3478"]);
        assert!(stun.username.is_none());
        assert!(stun.credential.is_none());

        // 2. Verify TURN entry with HMAC-SHA1
        let turn = &config.ice_servers[1];
        assert_eq!(turn.urls.len(), 2);
        assert!(turn.urls[0].starts_with("turn:turn.wespace.gg:3478?transport=udp"));

        let username = turn.username.as_ref().expect("Username must exist");
        let credential = turn.credential.as_ref().expect("Credential must exist");

        assert!(username.ends_with(":player_uuid_42"));

        // Validate HMAC signature independently
        let mut expected_mac = HmacSha1::new_from_slice(secret.as_bytes()).unwrap();
        expected_mac.update(username.as_bytes());
        let expected_cred = STANDARD.encode(expected_mac.finalize().into_bytes());

        assert_eq!(credential, &expected_cred);
    }
}
