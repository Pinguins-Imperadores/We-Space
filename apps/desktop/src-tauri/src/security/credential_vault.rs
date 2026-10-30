use keyring::Entry;
use tracing::info;

const SERVICE_NAME: &str = "WeSpaceDesktopAuth";

pub struct CredentialVault;

impl CredentialVault {
    /// Stores the Refresh Token securely in Windows Credential Manager.
    /// Completely isolated from WebView2 / Chromium browser storage.
    pub fn save_refresh_token(username: &str, token: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, username).map_err(|e| e.to_string())?;
        entry.set_password(token).map_err(|e| e.to_string())?;
        info!("Refresh token securely stored in Windows Credential Manager.");
        Ok(())
    }

    /// Retrieves the Refresh Token from Windows Credential Manager.
    pub fn get_refresh_token(username: &str) -> Result<String, String> {
        let entry = Entry::new(SERVICE_NAME, username).map_err(|e| e.to_string())?;
        entry.get_password().map_err(|e| e.to_string())
    }

    /// Deletes credentials on user logout.
    pub fn clear_credentials(username: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, username).map_err(|e| e.to_string())?;
        let _ = entry.delete_password();
        Ok(())
    }
}
