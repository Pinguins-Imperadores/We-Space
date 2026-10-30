## 📋 Descrição das Alterações
<!-- Descreva de forma concisa o objetivo deste PR, as decisões técnicas e os módulos impactados. -->

## 🎯 Tipo de Mudança
- [ ] `feat`: Nova funcionalidade
- [ ] `fix`: Correção de bug
- [ ] `sec`: Hardening, sanitização ou correção de vulnerabilidade
- [ ] `perf`: Otimização de performance ou encode/rede
- [ ] `refactor`: Refatoração estrutural sem alteração de comportamento
- [ ] `test`: Adição ou refatoração de testes unitários/integração
- [ ] `chore` / `ci`: Ajustes de dependências, workflows ou build

---

## 🛡️ Checklist de Engenharia e Segurança (Obrigatório)

### 1. Qualidade de Código & Linting
- [ ] `cargo fmt --all -- --check` executado com zero divergências de formatação.
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` sem qualquer aviso no Rust.
- [ ] `npm run build:desktop` e `npm run build:web` geram bundles limpos sem erros de tipagem.

### 2. Testes Automatizados
- [ ] `cargo test --workspace` executado localmente (100% de testes aprovados).
- [ ] Testes unitários novos adicionados para cobrir novos handlers, algoritmos ou validações.

### 3. Segurança (AppSec & Zero-Trust)
- [ ] Entradas de usuário passam pelo utilitário central de sanitização (`sanitize_text` / schemas Zod).
- [ ] Ações sensíveis extraem identificadores (`author_id`, `reviewer_id`) estritamente de claims JWT (`auth_guard.rs`), impedindo IDOR.
- [ ] Nenhuma chave privada, token ou segredo incluído no diff ou histórico (`gitleaks`).
- [ ] Chamadas Tauri IPC validam caminhos contra Path Traversal (`..` e extensões proibidas).

---

## 👥 Revisão e Governança Ágil
- **Revisão Técnica Necessária:** [ ] Eric (Scrum Master) / [ ] Luan (Scrum Master)
- **Validação de Produto (PO):** [ ] Jaziel Vitor
- **Engenharia:** [ ] Matheus
