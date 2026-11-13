# Correção de CI e infraestrutura — 13/11/2026

## Causas encontradas e alterações

- `cargo fmt --all -- --check` falhava em lib.rs do desktop, queue.rs e lfg.rs. Aplicado rustfmt ao workspace.
- Rust 1.100 do canal stable apresentou erro de inferência de tipo dentro do SQLx 0.7.4. Fixado Rust 1.95.0 em rust-toolchain.toml, workflows e imagem de compilação Docker; Cargo.lock passa a ser versionado.
- CI frontend passa a instalar com npm ci e executar os testes Node; mudanças nos testes também disparam o workflow.
- CI backend considera alterações do desktop, lockfile, toolchain e do próprio workflow.
- Release Tauri aponta explicitamente para apps/desktop e usa npm ci.
- Workflow de infraestrutura valida sintaxe Compose e configuração NATS.
- NATS usa arquivo de configuração válido, preservando limites de payload (2 MB), memória (256 MB) e armazenamento (2 GB).
- PostgreSQL, Redis, NATS e MinIO locais expõem portas apenas em localhost. Redis usa noeviction para evitar descarte silencioso de estado de fila/sessão; ao atingir o limite, gravações podem falhar e exigem monitoramento.
- Coturn carrega configuração explicitamente; intervalo UDP de relay alinhado ao Compose (49160–49200). Removida opção obsoleta no-loopback-peers; loopback permanece desabilitado por padrão e a faixa IPv4 é negada explicitamente.
- Coturn local sem TLS/DTLS para não anunciar listeners sem certificados. Produção requer configuração própria, segredo exclusivo, certificados e IP público/external-ip correto. O segredo de desenvolvimento não deve ser reutilizado.
- Imagem API executa como usuário não root.

## Verificações executadas

- Rustfmt aprovado.
- TypeScript dos dois pacotes compartilhados aprovado.
- 9 testes Node aprovados.
- Builds Vite desktop e PWA aprovados.
- Compose válido; NATS iniciado com configuração e limites confirmados, healthcheck retornando ok.
- PostgreSQL aceitando conexões; Redis saudável; Coturn inicializado com realm configurado após tornar o arquivo legível no ambiente local.
- Serviços de teste parados após a validação, com volumes preservados.

## Limites

Não houve deploy de produção, teste de tráfego WebRTC entre redes externas, build Windows ou assinatura Authenticode. A imagem Docker da API não foi compilada integralmente nesta rodada. A subida de serviços não equivale a teste de integração ponta a ponta.

PR centralizador: https://github.com/Pinguins-Imperadores/We-Space/pull/6. Os resultados finais de Clippy e testes Rust devem ser conferidos nos checks desse PR antes da integração.
