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

    /// System Tray & OS Level Notification for Matchmaking Duo Discovery
    /// Requests critical user attention on taskbar/tray and triggers native OS toast notification
    #[tauri::command]
    pub fn notify_match_found(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
        use tauri::Manager;

        // 1. Flash and demand user attention on Windows Taskbar / System Tray
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.request_user_attention(Some(tauri::window::UserAttentionType::Critical));
            let _ = window.unminimize();
            let _ = window.show();
        }

        // 2. Native OS Notification Toast on Windows
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            let clean_title = title.replace('\'', "''").replace('"', "\\\"");
            let clean_body = body.replace('\'', "''").replace('"', "\\\"");

            let ps_script = format!(
                r#"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
$textNodes = $template.GetElementsByTagName('text');
$textNodes.Item(0).AppendChild($template.CreateTextNode('{}')) > $null;
$textNodes.Item(1).AppendChild($template.CreateTextNode('{}')) > $null;
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('We Space — Hub Gamer');
$notification = [Windows.UI.Notifications.ToastNotification]::new($template);
$notifier.Show($notification);"#,
                clean_title, clean_body
            );

            let _ = Command::new("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
                .spawn();
        }

        Ok(())
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
            commands::validate_media_path,
            commands::notify_match_found
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
