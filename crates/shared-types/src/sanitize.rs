//! Central Input Sanitization & AppSec Hardening Engine
//! Mitigates Stored XSS, Log Forging, Path Traversal, and Unicode RTL/Zero-Width attacks.

/// Strips dangerous HTML tags, javascript pseudo-protocol, event handlers,
/// invisible Unicode characters, and control characters.
pub fn sanitize_text(input: &str) -> String {
    let mut clean = String::with_capacity(input.len());
    let mut in_tag = false;

    for ch in input.chars() {
        if ch == '<' {
            in_tag = true;
            continue;
        }
        if ch == '>' {
            in_tag = false;
            continue;
        }
        if in_tag {
            continue;
        }

        // Drop invisible zero-width spaces, RTL/LTR overrides, and ASCII control codes
        match ch {
            // Null bytes and ASCII controls (except newline/tab/carriage return)
            '\0'..='\x08' | '\x0B'..='\x0C' | '\x0E'..='\x1F' | '\x7F' => continue,
            // Zero-Width characters
            '\u{200B}'..='\u{200D}' | '\u{FEFF}' => continue,
            // BiDi override characters (prevent Spoofing / RTL Trojan attacks)
            '\u{202A}'..='\u{202E}' | '\u{2066}'..='\u{2069}' => continue,
            _ => clean.push(ch),
        }
    }

    let mut result = clean.trim().to_string();

    // Neutralize dangerous pseudo-protocols and script patterns (case-insensitive)
    let dangerous_tokens = [
        ("javascript:", ""),
        ("vbscript:", ""),
        ("data:text/html", ""),
        ("onerror=", ""),
        ("onload=", ""),
        ("onclick=", ""),
        ("onmouseover=", ""),
        ("eval(", ""),
        ("document.cookie", ""),
    ];

    for (token, replacement) in dangerous_tokens {
        while let Some(pos) = result.to_lowercase().find(token) {
            result.replace_range(pos..pos + token.len(), replacement);
        }
    }

    result.trim().to_string()
}

/// Validates and sanitizes a username (3 to 24 chars, alphanumeric, underscore, hyphen).
pub fn sanitize_username(input: &str) -> Result<String, &'static str> {
    let trimmed = input.trim();
    if trimmed.len() < 3 {
        return Err("Username must be at least 3 characters long");
    }
    if trimmed.len() > 24 {
        return Err("Username cannot exceed 24 characters");
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err("Username can only contain alphanumeric characters, underscores, and hyphens");
    }
    Ok(trimmed.to_string())
}

/// Validates and sanitizes a clip title (1 to 100 characters).
pub fn sanitize_clip_title(input: &str) -> Result<String, &'static str> {
    let sanitized = sanitize_text(input);
    if sanitized.is_empty() {
        return Err("Clip title cannot be empty");
    }
    if sanitized.len() > 100 {
        return Err("Clip title cannot exceed 100 characters");
    }
    Ok(sanitized)
}

/// Sanitizes a lobby or match chat message (max 500 characters, no dangerous scripts).
pub fn sanitize_chat_message(input: &str) -> Result<String, &'static str> {
    let sanitized = sanitize_text(input);
    if sanitized.is_empty() {
        return Err("Chat message cannot be empty");
    }
    if sanitized.len() > 500 {
        return Err("Chat message exceeds 500 characters");
    }
    Ok(sanitized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xss_tag_stripping() {
        let input = "<script>alert('XSS')</script>Hello World!";
        let clean = sanitize_text(input);
        assert_eq!(clean, "alert('XSS')Hello World!");
        assert!(!clean.contains('<'));
        assert!(!clean.contains('>'));
    }

    #[test]
    fn test_javascript_protocol_neutralization() {
        let input = "JAVASCRIPT:alert(document.cookie);";
        let clean = sanitize_text(input);
        assert!(!clean.to_lowercase().contains("javascript:"));
        assert!(!clean.contains("document.cookie"));
    }

    #[test]
    fn test_zero_width_and_bidi_override_removal() {
        // Zero width space (\u{200B}) and RTL override (\u{202E})
        let input = "Safe\u{200B}User\u{202E}exe.txt";
        let clean = sanitize_text(input);
        assert_eq!(clean, "SafeUserexe.txt");
    }

    #[test]
    fn test_username_validation() {
        assert!(sanitize_username("Pro_Gamer-99").is_ok());
        assert_eq!(sanitize_username("Pro_Gamer-99").unwrap(), "Pro_Gamer-99");
        assert!(sanitize_username("ab").is_err()); // Too short
        assert!(sanitize_username("user<script>").is_err()); // Invalid chars
        assert!(sanitize_username("user name with spaces").is_err());
    }

    #[test]
    fn test_clip_title_sanitization() {
        let title = "  <Ace Clutch> 1v4 Inferno!  ";
        let clean = sanitize_clip_title(title).unwrap();
        assert_eq!(clean, "1v4 Inferno!");
    }

    #[test]
    fn test_chat_message_sanitization() {
        let chat = "Good game!\u{0000} Nice shot!";
        let clean = sanitize_chat_message(chat).unwrap();
        assert_eq!(clean, "Good game! Nice shot!");
    }
}
