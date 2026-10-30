# We Space 🚀

> **Hub de Reputação Gamer & Matchmaking com Clipes Verificados por Telemetria**  
> *Projeto Integrador — 6º SENAC InnovaDay*

---

## 🎮 O Que É o We Space?

O **We Space** é uma plataforma híbrida (Desktop nativo + Web PWA) que une:
1. **LFG Competitivo Inteligente**: Encontre duplas e equipes 5-stack filtrando por ranque, horário e estilo de comunicação (*Call Limpa*, *Zero Tilt*).
2. **Auto-Clipper de Baixa Latência**: Gravação local contínua em segundo plano via `Windows.Graphics.Capture` e Direct3D11, codificando em H.264 direto na GPU via GStreamer (GOP Ring Buffer de 45s consumindo apenas ~67 MB de RAM). Zero queda de FPS e 100% indetectável por anti-cheats (Riot Vanguard, Valve VAC).
3. **Reputação Comportamental com Anti-Brigading**: Avaliações pós-partida com pontuação de *Karma* dinâmico e proteção contra manipulação via decaimento exponencial.

---

## 🏛️ Topologia Monorepo (v2.0)

```text
We-Space/
├── apps/
│   ├── desktop/          # Cliente Desktop Tauri v2 + React 19 + Tailwind v4 + Vite
│   └── web-pwa/          # Portal Web & PWA para links públicos e mobile
├── crates/
│   ├── api-server/       # Monolito Modular Axum + Tokio + SQLx + Redis + NATS
│   └── shared-types/     # Modelos de dados e contratos compartilhados
├── packages/
│   ├── ui/               # Design System (RadarChart, Modais, SoundEngine)
│   └── api-client/       # SDK Cliente HTTP e WebSocket fortemente tipado
├── infra/
│   ├── docker/           # PostgreSQL 16, Redis 7, NATS, Coturn, MinIO
│   └── observability/    # OpenTelemetry Collector & Prometheus
└── docs/                 # Documentação de Arquitetura e Segurança
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js**: v20+ e **npm** / **pnpm**
- **Rust**: v1.80+ (com `cargo`)
- **Docker** & **Docker Compose**

### 1. Subir a Infraestrutura Local
```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```
*Serviços disponíveis:*
- PostgreSQL 16: `127.0.0.1:5432` (banco `wespace_core`)
- Redis 7: `127.0.0.1:6379`
- NATS JetStream: `127.0.0.1:4222` (Dashboard: `http://localhost:8222`)
- MinIO (Mock R2): `http://localhost:9001`
- Coturn (STUN/TURN): `127.0.0.1:3478`

### 2. Executar o Backend API (Axum)
```bash
cd crates/api-server
cargo run
```
*Healthcheck:* `GET http://localhost:8080/api/v1/healthcheck`

### 3. Executar o Cliente Desktop
```bash
npm run dev:desktop
```

---

## 👥 Equipe do Projeto

| Papel | Nome |
| :--- | :--- |
| **Product Owner** | Jaziel Vitor |
| **Scrum Masters** | Eric e Luan |
| **Time de Desenvolvimento** | Matheus, Luan, Eric e Jaziel Vitor |

---

## 📄 Licença
Distribuído sob licença MIT. Consulte `LICENSE` para obter mais detalhes.
