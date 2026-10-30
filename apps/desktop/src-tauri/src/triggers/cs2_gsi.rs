use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cs2PlayerState {
    pub health: Option<i32>,
    pub armor: Option<i32>,
    pub helmet: Option<bool>,
    pub equip_value: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cs2MatchStats {
    pub kills: Option<u32>,
    pub assists: Option<u32>,
    pub deaths: Option<u32>,
    pub mvps: Option<u32>,
    pub score: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cs2GsiPayload {
    pub provider: Option<serde_json::Value>,
    pub map: Option<serde_json::Value>,
    pub round: Option<serde_json::Value>,
    pub player: Option<serde_json::Value>,
}

pub struct Cs2GsiManager;

impl Cs2GsiManager {
    /// Generates and installs the official Valve GSI configuration into CS2's cfg directory.
    pub fn install_gsi_config(cs2_cfg_dir: &Path) -> std::io::Result<()> {
        let content = r#""WeSpace Auto-Clipper Integration v1.0"
{
    "uri"               "http://127.0.0.1:48150/cs2-events"
    "timeout"           "2.0"
    "buffer"            "0.1"
    "throttle"          "0.2"
    "heartbeat"         "15.0"
    "data"
    {
        "provider"            "1"
        "map"                 "1"
        "round"               "1"
        "player_id"           "1"
        "player_state"        "1"
        "player_weapons"      "1"
        "player_match_stats"  "1"
    }
}
"#;
        let target_path = cs2_cfg_dir.join("gamestate_integration_wespace.cfg");
        fs::write(&target_path, content)?;
        info!("Installed CS2 GSI configuration to {:?}", target_path);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_install_gsi_config() {
        let temp_dir =
            std::env::temp_dir().join(format!("wespace_test_cs2_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).expect("failed to create temp dir");

        let res = Cs2GsiManager::install_gsi_config(&temp_dir);
        assert!(res.is_ok());

        let cfg_file = temp_dir.join("gamestate_integration_wespace.cfg");
        assert!(cfg_file.exists());

        let contents = fs::read_to_string(&cfg_file).expect("failed to read cfg");
        assert!(contents.contains("WeSpace Auto-Clipper Integration"));
        assert!(contents.contains("http://127.0.0.1:48150/cs2-events"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
