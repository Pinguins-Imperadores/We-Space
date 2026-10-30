# Política de Segurança — We Space

A plataforma **We Space** adota uma postura rigorosa de **Zero-Trust**, minimização de superfície de ataque e estrita conformidade com os sistemas anti-cheat dos principais jogos competitivos do mercado (*Riot Vanguard* e *Valve Anti-Cheat - VAC*).

---

## 1. Arquitetura de Segurança e Defesas Zero-Trust

### 1.1. Autenticação e Criptografia de Sessão
- **Assinatura Assimétrica de Tokens (JWT RS256):** Tokens de acesso são assinados exclusivamente com chave privada RSA de 2048/4096 bits em formato PEM no backend Axum. O frontend e o cliente Tauri validam a assinatura estritamente com a chave pública correspondente.
- **Hashing de Senhas (Argon2id):** Implementado com parâmetros de memória (64 MB), tempo (3 iterações) e paralelismo (4 threads), superando o padrão recomendado pela OWASP para resistência contra quebra acelerada por GPU/ASIC.
- **Isolamento de Credenciais Nativas (Tauri Credential Vault):** Em ambiente Windows Desktop, o Refresh Token é persistido no *Windows Credential Manager* via API de keyring nativo do sistema operacional, mantendo-o completamente inacessível para o motor WebView2/Chromium e imune a roubo de cookies/LocalStorage via extensões maliciosas.

### 1.2. Proveniência e Integridade de Clipes de Mídia
- **Esteganografia LSB (Least Significant Bit):** Cada thumbnail/frame extraído pelo encoder de hardware (NVENC/AMF) recebe uma marca d'água criptográfica invisível no bit menos significativo do canal azul. O payload de 64 bytes contém `[ user_id (16B) | timestamp (8B) | gpu_id (8B) | hmac_sha256 (32B) ]`, assegurando a autenticidade da jogada e impedindo o upload de clipes fraudulentos de terceiros.
- **Validação de Checksum SHA-256 no Edge (Cloudflare R2):** Os clipes gravados são transmitidos diretamente do cliente para o bucket Cloudflare R2 por meio de Presigned URLs. O cabeçalho `x-amz-checksum-sha256` é exigido no contrato de upload, garantindo integridade de ponta a ponta sem expor credenciais de nuvem ao cliente.

### 1.3. Infraestrutura WebRTC e Defesa Anti-SSRF (Coturn)
- **Credenciais Efêmeras TURN:** As credenciais ICE/TURN para salas de voz P2P utilizam o mecanismo HMAC-SHA1 temporário com expiração programada de até 12 horas.
- **Proteção Anti-SSRF:** O servidor Coturn é configurado com regras rígidas de negação para faixas privadas (`denied-peer-ip=10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8` e metadados de nuvem `169.254.169.254`), impedindo que o relay WebRTC seja explorado para pivotar tráfego contra serviços internos da rede.

### 1.4. Conformidade Anti-Cheat (Riot Vanguard & Valve Anti-Cheat)
- O cliente nativo We Space **NÃO injeta DLLs**, **NÃO lê a memória de processos de jogos** e **NÃO utiliza hooks de teclado em nível de kernel**.
- A captura visual opera via `Windows.Graphics.Capture API` oficial do Windows, idêntica ao Xbox Game Bar e OBS Studio.
- A telemetria de CS2 utiliza o protocolo oficial suportado pela Valve: **Game State Integration (GSI)** via porta HTTP local configurada em `gamestate_integration_wespace.cfg`.

### 1.5. Integridade do Código-Fonte e Proteção de Branch (GitHub Rulesets)
- **Blindagem da Branch `main`**: A integridade do código-fonte é protegida no nível da infraestrutura do repositório por **GitHub Rulesets**. As regras aplicadas bloqueiam deleção de branch (`deletion`) e reescrita de histórico via force-push (`non_fast_forward`), assegurando a rastreabilidade total de commits e prevenindo adulteração maliciosa ou acidental da linha principal de desenvolvimento.

---

## 2. Reporte de Vulnerabilidades

Caso você descubra uma vulnerabilidade de segurança no We Space:
1. **NÃO crie uma issue pública.**
2. Envie os detalhes técnicos, prova de conceito (PoC) e impacto estimado diretamente para o time de segurança:
   - **E-mail:** `security@wespace.gg` ou `luansbflu@gmail.com`
3. Nossa equipe acusará o recebimento em até **48 horas** e manterá comunicação coordenada até a disponibilização do patch corretivo.
