pub mod capture;
pub mod security;
pub mod triggers;

use capture::{
    pipeline::{decode_base64, encode_base64},
    CaptureEngineConfig, CaptureStatusPayload, FlushedClipResult, MonitorInfo,
    NativeCapturePipeline,
};
use security::{ClipIntegrity, CredentialVault};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

pub struct AppState {
    pub pipeline: Arc<Mutex<NativeCapturePipeline>>,
}

pub mod commands {
    use super::*;
    use shared_types::sanitize::sanitize_username;
    use std::path::Path;

    #[tauri::command]
    pub async fn start_capture(state: State<'_, AppState>) -> Result<CaptureStatusPayload, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let mut guard = pipeline.lock().map_err(|e| e.to_string())?;
            guard.start()?;
            Ok(guard.status_payload())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[tauri::command]
    pub async fn stop_capture(state: State<'_, AppState>) -> Result<CaptureStatusPayload, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let mut guard = pipeline.lock().map_err(|e| e.to_string())?;
            guard.stop();
            Ok(guard.status_payload())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[tauri::command]
    pub async fn get_capture_status(state: State<'_, AppState>) -> Result<bool, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let mut guard = pipeline.lock().map_err(|e| e.to_string())?;
            Ok(guard.is_active())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[tauri::command]
    pub async fn get_capture_details(
        state: State<'_, AppState>,
    ) -> Result<CaptureStatusPayload, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let mut guard = pipeline.lock().map_err(|e| e.to_string())?;
            Ok(guard.status_payload())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[tauri::command]
    pub async fn list_monitors() -> Result<Vec<MonitorInfo>, String> {
        tauri::async_runtime::spawn_blocking(NativeCapturePipeline::list_monitors)
            .await
            .map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub async fn update_capture_config(
        state: State<'_, AppState>,
        ring_buffer_seconds: usize,
        target_fps: u32,
        width: u32,
        height: u32,
        bitrate_kbps: u32,
        selected_monitor_id: Option<String>,
    ) -> Result<CaptureStatusPayload, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let mut guard = pipeline.lock().map_err(|e| e.to_string())?;
            guard.update_config(CaptureEngineConfig {
                target_fps,
                width,
                height,
                bitrate_kbps,
                ring_buffer_seconds,
                selected_monitor_id,
            })?;
            Ok(guard.status_payload())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[tauri::command]
    pub async fn flush_highlight_clip(
        state: State<'_, AppState>,
        duration_seconds: usize,
    ) -> Result<FlushedClipResult, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let mut guard = pipeline.lock().map_err(|e| e.to_string())?;
            guard.flush_highlight_clip(duration_seconds)
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[derive(Debug, Serialize)]
    pub struct LoadedClipData {
        pub mime_type: String,
        pub data_base64: String,
    }

    #[tauri::command]
    pub async fn save_permanent_clip(
        state: State<'_, AppState>,
        clip_id: String,
        mime_type: String,
        data_base64: String,
    ) -> Result<String, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let clips_dir = {
                let guard = pipeline.lock().map_err(|e| e.to_string())?;
                guard.clips_dir().to_path_buf()
            };
            std::fs::create_dir_all(&clips_dir).map_err(|e| e.to_string())?;

            let safe_id: String = clip_id
                .chars()
                .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
                .collect();
            if safe_id.is_empty() {
                return Err("Invalid clip_id".into());
            }

            let ext = if mime_type.contains("mp4") {
                "mp4"
            } else {
                "webm"
            };
            let target_path = clips_dir.join(format!("{}.{}", safe_id, ext));
            let bytes = decode_base64(&data_base64)?;
            if bytes.is_empty() {
                return Err("Empty video payload".into());
            }
            std::fs::write(&target_path, bytes).map_err(|e| e.to_string())?;
            Ok(target_path.to_string_lossy().into_owned())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[tauri::command]
    pub async fn load_clip_data(
        state: State<'_, AppState>,
        file_path: String,
    ) -> Result<LoadedClipData, String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let clips_dir = {
                let guard = pipeline.lock().map_err(|e| e.to_string())?;
                guard.clips_dir().to_path_buf()
            };
            let requested = Path::new(&file_path)
                .canonicalize()
                .map_err(|e| format!("Clip file not found: {}", e))?;
            if let Ok(canon_clips) = clips_dir.canonicalize() {
                if !requested.starts_with(&canon_clips) {
                    return Err("Access denied: clip outside permanent clips directory".into());
                }
            }

            let ext = requested
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            let mime_type = match ext.as_str() {
                "mp4" => "video/mp4",
                "webm" => "video/webm",
                _ => return Err("Unsupported clip extension".into()),
            }
            .to_string();

            let bytes = std::fs::read(&requested).map_err(|e| e.to_string())?;
            Ok(LoadedClipData {
                mime_type,
                data_base64: encode_base64(&bytes),
            })
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[tauri::command]
    pub async fn delete_permanent_clip(
        state: State<'_, AppState>,
        file_path: String,
    ) -> Result<(), String> {
        let pipeline = state.pipeline.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let clips_dir = {
                let guard = pipeline.lock().map_err(|e| e.to_string())?;
                guard.clips_dir().to_path_buf()
            };
            let Ok(requested) = Path::new(&file_path).canonicalize() else {
                return Ok(());
            };
            if let Ok(canon_clips) = clips_dir.canonicalize() {
                if requested.starts_with(&canon_clips) && requested.is_file() {
                    let _ = std::fs::remove_file(requested);
                }
            }
            Ok(())
        })
        .await
        .map_err(|e| e.to_string())?
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
    pub fn notify_match_found(
        app: tauri::AppHandle,
        title: String,
        body: String,
    ) -> Result<(), String> {
        use tauri::Manager;

        // 1. Flash and demand user attention on Windows/Linux Taskbar / System Tray
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.request_user_attention(Some(tauri::UserAttentionType::Critical));
            let _ = window.unminimize();
            let _ = window.show();
        }

        // 2. Native OS Notification Toast
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("notify-send")
                .args([&title, &body])
                .spawn();
        }

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
                .args([
                    "-NoProfile",
                    "-WindowStyle",
                    "Hidden",
                    "-Command",
                    &ps_script,
                ])
                .spawn();
        }

        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }

        let in_appimage = std::env::var_os("APPIMAGE").is_some()
            || std::env::var_os("APPDIR").is_some()
            || std::env::var("LD_LIBRARY_PATH")
                .map(|v| v.contains(".mount_") || v.contains("AppDir"))
                .unwrap_or(false);
        if in_appimage {
            let sys_gst_dirs: Vec<&str> = [
                "/usr/lib/x86_64-linux-gnu/gstreamer-1.0",
                "/usr/lib/aarch64-linux-gnu/gstreamer-1.0",
                "/usr/lib/gstreamer-1.0",
                "/usr/lib64/gstreamer-1.0",
            ]
            .into_iter()
            .filter(|dir| std::path::Path::new(dir).is_dir())
            .collect();

            if !sys_gst_dirs.is_empty() {
                std::env::set_var("GST_PLUGIN_SYSTEM_PATH_1_0", sys_gst_dirs.join(":"));
                std::env::set_var("GST_PLUGIN_SYSTEM_PATH", sys_gst_dirs.join(":"));
            }
        }
    }

    let config = CaptureEngineConfig::default();
    let pipeline = NativeCapturePipeline::new(config);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            pipeline: Arc::new(Mutex::new(pipeline)),
        })
        .setup(|app| {
            if let Ok(app_dir) = app.path().app_data_dir() {
                let permanent_clips = app_dir.join("clips");
                let _ = std::fs::create_dir_all(&permanent_clips);
                if let Ok(mut guard) = app.state::<AppState>().pipeline.lock() {
                    guard.set_clips_dir(permanent_clips);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_capture,
            commands::stop_capture,
            commands::get_capture_status,
            commands::get_capture_details,
            commands::list_monitors,
            commands::update_capture_config,
            commands::flush_highlight_clip,
            commands::save_permanent_clip,
            commands::load_clip_data,
            commands::delete_permanent_clip,
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
