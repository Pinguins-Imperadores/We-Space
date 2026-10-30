// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod capture;
mod security;
mod triggers;

use capture::{CaptureEngineConfig, NativeCapturePipeline};
use security::{ClipIntegrity, CredentialVault};
use std::sync::Mutex;
use tauri::State;

struct AppState {
    pipeline: Mutex<NativeCapturePipeline>,
}

#[tauri::command]
fn start_capture(state: State<AppState>) -> Result<String, String> {
    let pipeline = state.pipeline.lock().map_err(|e| e.to_string())?;
    pipeline.start();
    Ok("Hardware capture started (GOP Ring Buffer active)".into())
}

#[tauri::command]
fn stop_capture(state: State<AppState>) -> Result<String, String> {
    let pipeline = state.pipeline.lock().map_err(|e| e.to_string())?;
    pipeline.stop();
    Ok("Hardware capture stopped".into())
}

#[tauri::command]
fn get_capture_status(state: State<AppState>) -> Result<bool, String> {
    let pipeline = state.pipeline.lock().map_err(|e| e.to_string())?;
    Ok(pipeline.is_active())
}

#[tauri::command]
fn save_auth_token(username: String, token: String) -> Result<(), String> {
    CredentialVault::save_refresh_token(&username, &token)
}

#[tauri::command]
fn get_auth_token(username: String) -> Result<String, String> {
    CredentialVault::get_refresh_token(&username)
}

#[tauri::command]
fn clear_auth_token(username: String) -> Result<(), String> {
    CredentialVault::clear_credentials(&username)
}

#[tauri::command]
fn compute_clip_sha256(data: Vec<u8>) -> String {
    ClipIntegrity::compute_sha256_hex(&data)
}

fn main() {
    let config = CaptureEngineConfig::default();
    let pipeline = NativeCapturePipeline::new(config);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            pipeline: Mutex::new(pipeline),
        })
        .invoke_handler(tauri::generate_handler![
            start_capture,
            stop_capture,
            get_capture_status,
            save_auth_token,
            get_auth_token,
            clear_auth_token,
            compute_clip_sha256
        ])
        .run(tauri::generate_context!())
        .expect("error while running We Space desktop application");
}
