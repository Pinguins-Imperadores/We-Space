# Arquitetura e Engenharia de Sistemas — We Space (v2.0)

## 1. Visão Geral da Topologia Monorepo

O projeto opera sob o padrão **Cargo Workspace + pnpm/npm Workspaces**, unificando:
- `apps/desktop`: Cliente desktop em Tauri v2 (Rust) com WebView2 isolada e React 19.
- `apps/web-pwa`: Portal Web para compartilhamento público e Progressive Web App.
- `crates/api-server`: Monolito modular em Rust (Axum + Tokio + SQLx + Redis + NATS).
- `crates/shared-types`: Modelos de dados e contratos compartilhados.
- `packages/ui`: Design System e componentes de interface compartilhados.
- `packages/api-client`: SDK cliente HTTP e WebSocket fortemente tipado.

## 2. Inovações Críticas de Engenharia

### 2.1. Buffer Circular de GOPs (Zero-Copy)
- **Problema anterior**: Manter 45s de frames brutos consome ~22,3 GB de RAM.
- **Solução v2.0**: A captura via `Windows.Graphics.Capture` passa diretamente por texturas Direct3D11 para o `GStreamer` nativo em Rust, codificando em H.264 na GPU via NVENC/AMF a cada 1,0 segundo (`gop-size=60`, `config-interval=-1`). O Ring Buffer em RAM armazena apenas pacotes comprimidos, consumindo **apenas ~67,5 MB de RAM**.

### 2.2. Upload Zero-Proxy via Cloudflare R2
- O cliente calcula o hash `SHA-256` em Rust e solicita uma *Presigned PUT URL*.
- O Cloudflare R2 valida o cabeçalho `x-amz-checksum-sha256` na borda, rejeitando automaticamente qualquer upload divergente sem onerar a banda do backend.

### 2.3. Sistema de Gatilhos Multi-Modal
- **CS2**: Integração via Valve Game State Integration (GSI) local em `127.0.0.1:48150`.
- **Valorant**: Detecção acústica via WASAPI Loopback + ROI OCR de 300x80px.
- **Fórmula de Disparo**:
  $$T_{\text{score}} = (0.45 \cdot K) + (0.15 \cdot HS) + (0.60 \cdot Clutch) + (0.25 \cdot Audio) + (0.40 \cdot OCR)$$
  Disparo automático quando $T_{\text{score}} \ge 1.0$.

### 2.4. Karma Comportamental Anti-Brigading
- Atualização ponderada com decaimento exponencial por reincidência de par nos últimos 7 dias:
  $$\Delta K = S_{\text{base}} \cdot \left(\frac{K_{\text{avaliador}}}{100}\right)^{1.2} \cdot e^{-\lambda \cdot N_{7\text{d}}}$$
