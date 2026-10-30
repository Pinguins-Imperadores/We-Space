# Guia de Contribuição e Engenharia — We Space

Bem-vindo ao repositório central do **We Space**! Este documento orienta a equipe de engenharia (**Jaziel Vitor**, **Luan**, **Eric** e **Matheus**) sobre os padrões de arquitetura, fluxo de branches, convenções de commits e comandos de validação antes de cada submissão.

---

## 👥 Papéis e Governança no Repositório

| Membro | Papel Principal | Foco Técnico |
| :--- | :--- | :--- |
| **Jaziel Vitor** | Product Owner (PO) | Requisitos de produto, validação de regras de negócio, UX. |
| **Eric** | Scrum Master & Dev | Facilitação ágil, infraestrutura, automação de mídia GStreamer. |
| **Luan** | Scrum Master & Dev | AppSec, arquitetura Rust/Axum, CI/CD, Tauri v2. |
| **Matheus** | Engenheiro Full-Stack | Interfaces React/TypeScript, WebPWA, integração WebRTC. |

---

## 🌿 Padrão de Branches

Trabalhamos com o modelo trunk-based com branches temáticas curtas:

- `feat/<escopo>-<descricao>`: Novas funcionalidades (ex: `feat/lfg-webrtc-voice`, `feat/clipper-gsi`).
- `fix/<escopo>-<descricao>`: Correções de bugs (ex: `fix/token-refresh-interceptor`).
- `sec/<escopo>-<descricao>`: Hardening, sanitização e correções de segurança (ex: `sec/input-sanitizer`).
- `perf/<escopo>-<descricao>`: Otimizações de CPU/GPU, latência ou tamanho de bundle.
- `chore/<escopo>-<descricao>`: Dependências, configurações e documentação interna.

### 🛡️ Proteção da Branch Principal (`main`)

A branch `main` é o núcleo estável de produção do projeto e possui regras ativas de proteção via **GitHub Rulesets**:

- 🚫 **Bloqueio de Force Push (`non_fast_forward`)**: É terminantemente proibido sobrescrever ou reescrever o histórico de commits da branch `main` (`git push --force` ou `--force-with-lease`). O GitHub rejeitará automaticamente qualquer tentativa.
- 🚫 **Bloqueio de Deleção de Branch (`deletion`)**: A branch `main` está blindada contra deleção acidental ou intencional (`git push origin --delete main`).
- 🔄 **Fluxo de Integração e Pull Requests**: O desenvolvimento deve ocorrer em branches temáticas curtas (`feat/*`, `fix/*`, `sec/*`, etc.) e ser integrado à `main` via Pull Request, após validação da suíte local e aprovação das rotinas de CI (`ci-backend`, `ci-frontend`, `security-gitleaks`).

---

## ✍️ Conventional Commits

Todo commit deve seguir rigorosamente a especificação do Conventional Commits:

```bash
<tipo>(<escopo>): <mensagem em imperativo e minúsculo>

# Exemplos válidos:
feat(clipper): add lsb watermark embedding on thumbnail extraction
fix(ci): resolve tauri desktop library resolution on linux runners
sec(api): implement central input sanitizer against stored xss
test(karma): add anti-brigading exponential decay test suite
```

---

## 🛠️ Comandos de Diagnóstico e Validação Local

Antes de abrir um Pull Request ou enviar alterações para a branch principal, execute obrigatoriamente a suíte de validação:

### 1. Formatação e Linting no Rust
```bash
# Formatar todos os arquivos do workspace
cargo fmt --all

# Verificar se há desvios de formatação (o mesmo roda no CI)
cargo fmt --all -- --check

# Executar linter estrito sem tolerância a warnings
cargo clippy --workspace --all-targets -- -D warnings
```

### 2. Testes Automatizados no Rust
```bash
# Executa 100% dos testes unitários do servidor e do cliente nativo
cargo test --workspace
```

### 3. Build e Tipagem no Frontend
```bash
# Validar pacotes compartilhados
npm run build -w packages/ui
npm run build -w packages/api-client

# Gerar bundles de produção das aplicações
npm run build:desktop
npm run build:web
```

### 4. Varredura de Segredos
```bash
# Garantir zero vazamento de chaves ou credenciais privadas
gitleaks detect --source . --no-git --verbose
```

---

## 🚀 Ambiente de Desenvolvimento com Docker

Para subir o ecossistema completo de dependências locais (PostgreSQL 16, Redis 7, NATS JetStream e Coturn):

```bash
# Iniciar todos os serviços auxiliares em background
npm run docker:dev

# Derrubar containers e preservar volumes
npm run docker:down
```
