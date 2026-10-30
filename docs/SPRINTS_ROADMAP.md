# Roadmap de Sprints — We Space (Projeto Integrador)

| Sprint | Período | Objetivo Principal | Entregáveis Técnicos |
| :--- | :--- | :--- | :--- |
| **Sprint 1** | 01/11 a 14/11/2026 | Fundação & Ambiente Local | • Monorepo unificado (Cargo + pnpm)<br>• Docker Compose local (Postgres 16, Redis 7, NATS, Coturn, MinIO)<br>• Axum `/healthcheck`<br>• Shell Tauri v2 inicial |
| **Sprint 2** | 15/11 a 28/11/2026 | Banco, Segurança & Auth | • Migrations SQLx do schema relacional<br>• Argon2id + JWT RS256<br>• Rate Limiting Lua no Redis<br>• Telas de Login/Registro integradas |
| **Sprint 3** | 29/11 a 12/12/2026 | NATS JetStream & LFG Core | • Conexão Axum <-> NATS JetStream<br>• WebSocket Hub para salas e signaling WebRTC<br>• Algoritmo de busca por compatibilidade LFG |
| **Sprint 4** | 13/12 a 26/12/2026 | Capture Engine & Highlights | • Pipeline GStreamer D3D11 + GOP Ring Buffer (60s em VRAM)<br>• CS2 GSI listener em 127.0.0.1:48150<br>• WASAPI audio peak + ROI OCR |
| **Sprint 5** | 27/12 a 10/01/2027 | Storage R2, Coturn & Deploy | • Uploads Presigned PUT R2 com x-amz-checksum-sha256<br>• Servidor Coturn em SP (Bypass CG-NAT)<br>• Deploy Fly.io (GRU) + Cloudflare Pages |
