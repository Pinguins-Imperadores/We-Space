pub mod capture;
pub mod security;
pub mod triggers;

use capture::{CaptureEngineConfig, NativeCapturePipeline};
use security::{ClipIntegrity, CredentialVault};
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub pipeline: Mutex<NativeCapturePipeline>,
}

pub mod commands {
    use super::*;
    use shared_types::sanitize::sanitize_username;
    use std::path::Path;

    #[tauri::command]
    pub fn start_capture(state: State<AppState>) -> Result<String, String> {
        let pipeline = state.pipeline.lock().map_err(|e| e.to_string())?;
        pipeline.start();
        Ok("Hardware capture started (GOP Ring Buffer active)".into())
    }

    #[tauri::command]
    pub fn stop_capture(state: State<AppState>) -> Result<String, String> {
        let pipeline = state.pipeline.lock().map_err(|e| e.to_string())?;
        pipeline.stop();
        Ok("Hardware capture stopped".into())
    }

    #[tauri::command]
    pub fn get_capture_status(state: State<AppState>) -> Result<bool, String> {
        let pipeline = state.pipeline.lock().map_err(|e| e.to_string())?;
        Ok(pipeline.is_active())
    }

    #[tauri::command]
    pub fn save_auth_token(username: String, token: String) -> Result<(), String> {
        let clean_user = sanitize_username(&username).map_err(|e| e.to_string())?;
        CredentialVault::save_refresh_token(&clean_user, &token)
    }

    #[tauri::command]
    pub fn get_auth_token(username: String) -> Result<String, String> {
        let clean_user = sanitize_username(&username).map_err(|e| e.to_string())?;
        CredentialVault::get_refresh_token(&clean_user)
    }

    #[tauri::command]
    pub fn clear_auth_token(username: String) -> Result<(), String> {
        let clean_user = sanitize_username(&username).map_err(|e| e.to_string())?;
        CredentialVault::clear_credentials(&clean_user)
    }

    #[tauri::command]
    pub fn compute_clip_sha256(data: Vec<u8>) -> String {
        ClipIntegrity::compute_sha256_hex(&data)
    }

    /// Hardened Media Path Validator (Anti-Path Traversal / Sandbox Integrity)
    /// Rejects parent directory traversal (`..`), null bytes, and non-media extensions.
    #[tauri::command]
    pub fn validate_media_path(path: String) -> Result<String, String> {
        if path.contains("..") || path.contains('\0') {
            return Err("Invalid path: Directory traversal characters detected".into());
        }

        let p = Path::new(&path);
        let extension = p
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !matches!(extension.as_str(), "mp4" | "webm" | "mkv" | "png" | "jpg") {
            return Err("Invalid media extension: Only MP4, WebM, MKV, PNG, JPG allowed".into());
        }

        Ok(path)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = CaptureEngineConfig::default();
    let pipeline = NativeCapturePipeline::new(config);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            pipeline: Mutex::new(pipeline),
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_capture,
            commands::stop_capture,
            commands::get_capture_status,
            commands::save_auth_token,
            commands::get_auth_token,
            commands::clear_auth_token,
            commands::compute_clip_sha256,
            commands::validate_media_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running We Space desktop application");
}

#[cfg(test)]
mod tests {
    use super::commands::validate_media_path;

    #[test]
    fn test_path_traversal_rejected() {
        assert!(validate_media_path("../../../etc/shadow.mp4".into()).is_err());
        assert!(validate_media_path("C:\\Windows\\System32\\..\\clip.mp4".into()).is_err());
        assert!(validate_media_path("normal/path/clip.mp4".into()).is_ok());
    }

    #[test]
    fn test_unauthorized_extension_rejected() {
        assert!(validate_media_path("safe/path/payload.exe".into()).is_err());
        assert!(validate_media_path("safe/path/script.sh".into()).is_err());
        assert!(validate_media_path("safe/path/highlight.mp4".into()).is_ok());
    }
}
