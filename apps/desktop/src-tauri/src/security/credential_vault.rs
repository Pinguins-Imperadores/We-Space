use tracing::info;

#[cfg(target_os = "windows")]
use keyring::Entry;

#[cfg(target_os = "windows")]
const SERVICE_NAME: &str = "WeSpaceDesktopAuth";

pub struct CredentialVault;

impl CredentialVault {
    /// Stores the Refresh Token securely in Windows Credential Manager.
    /// Completely isolated from WebView2 / Chromium browser storage.
    pub fn save_refresh_token(username: &str, token: &str) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            let entry = Entry::new(SERVICE_NAME, username).map_err(|e| e.to_string())?;
            entry.set_password(token).map_err(|e| e.to_string())?;
            info!("Refresh token securely stored in Windows Credential Manager.");
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = (username, token);
            info!("CredentialVault stub: token stored (non-windows platform).");
            Ok(())
        }
    }

    /// Retrieves the Refresh Token from Windows Credential Manager.
    pub fn get_refresh_token(username: &str) -> Result<String, String> {
        #[cfg(target_os = "windows")]
        {
            let entry = Entry::new(SERVICE_NAME, username).map_err(|e| e.to_string())?;
            entry.get_password().map_err(|e| e.to_string())
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = username;
            info!("CredentialVault stub: token retrieved (non-windows platform).");
            Ok("stub_refresh_token_for_non_windows".into())
        }
    }

    /// Deletes credentials on user logout.
    pub fn clear_credentials(username: &str) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            let entry = Entry::new(SERVICE_NAME, username).map_err(|e| e.to_string())?;
            let _ = entry.delete_password();
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = username;
            info!("CredentialVault stub: credentials cleared (non-windows platform).");
            Ok(())
        }
    }
}
