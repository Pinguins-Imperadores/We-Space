# Guia de Hardening e Segurança — We Space

## 1. Autenticação e Armazenamento de Tokens
- **Web**: Cookies `HttpOnly`, `Secure`, `SameSite=Strict` com proteção contra CSRF.
- **Desktop (Tauri v2)**: Refresh token salvo no **Windows Credential Manager** via crate `keyring`, completamente inacessível pela camada web/WebView2.
- **Argon2id**: `m_cost = 19456` KiB, `t_cost = 2`, `p_cost = 1`. Concorrência limitada via `tokio::sync::Semaphore` com limite de 2 instâncias simultâneas para prevenir exaustão de CPU.

## 2. Rate Limiting Atômico com Sliding Window no Redis
- Script Lua atômico com membro único (`req_uuid`) impedindo colisões de timestamp idêntico no mesmo milissegundo.

## 3. Servidor TURN (Coturn) Anti-SSRF
- Portas de escuta restritas: 3478 e 5349.
- Bloqueio explícito de peers em redes privadas:
  - `127.0.0.0/8` (Loopback)
  - `169.254.0.0/16` (Link-local / Metadados de cloud)
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC1918)
- Credenciais temporárias geradas pelo backend com HMAC-SHA1 e TTL de 12 horas.

## 4. Content Security Policy (CSP) no Tauri v2
```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.wespace.gg wss://api.wespace.gg https://*.r2.cloudflarestorage.com http://127.0.0.1:*; img-src 'self' data: blob: https://cdn.wespace.gg; media-src 'self' blob: https://cdn.wespace.gg; frame-src 'none'; object-src 'none'
```
