# Relatório de melhorias — 13/11/2026

## Entregas

- Desktop: carregamento sob demanda de captura, matchmaking, perfil e reputação, com mensagem acessível durante carregamento.
- Guia de demonstração com atalhos para captura, busca de dupla e reputação.
- Identificação explícita dos dados de exemplo e das limitações de captura Windows. Removida indicação estática de motor online no rodapé.
- PWA: indicação de dados demonstrativos e mensagem de convite sem alegar conexão de voz inexistente.
- Acessibilidade: link para pular ao conteúdo, foco de teclado visível e respeito à preferência por redução de movimento no desktop.
- Autenticação: falhas de login/cadastro não criam mais convidados automaticamente; usuário em cache sem token não é considerado autenticado; JSON inválido no cache não derruba a inicialização.
- API: renovação compartilhada de sessão resolve também em caso de falha, evitando requisições concorrentes penduradas; retry limitado a uma tentativa e com timeout; tratamento de respostas 204.
- Reprodutibilidade: package-lock.json incluído no versionamento para permitir npm ci.
- Teste de regressão para falha de refresh concorrente.

## Verificação

- 9 testes Node aprovados. Os testes existentes de matchmaking não substituem integração com Redis/backend.
- Builds Vite desktop e PWA aprovados. Isso não representa build do executável Tauri Windows.
- Chromium: abertura e navegação até reputação sem exceções JavaScript. Em viewport 390 × 844 foi detectado overflow horizontal, ainda pendente de correção.
- Quatro telas foram separadas em chunks. O bundle inicial ainda excede 500 kB; não foi medido ganho de FPS ou memória.
- Sem execução de cargo, testes Rust, captura in-game ou infraestrutura: cargo não está disponível neste ambiente.

## Pendências e critérios de aceite

1. Integrar feed/perfis e publicação ao backend: a aplicação principal ainda usa mocks; validar persistência após recarregar e em outra conta.
2. Autenticação: revisar refresh de ponta a ponta, rotação e armazenamento seguro. O cliente ainda utiliza localStorage; esta entrega não implementa cofre nativo nem cookies HttpOnly.
3. Voz: provisionar TURN e testar dois usuários em redes diferentes com relay; não confundir convite simulado com áudio conectado.
4. Captura: testar Windows físico com GPU, CS2 GSI, áudio/OCR, exportação e consumo de recursos; assinar instalador.
5. Deploy: configurar credenciais R2/Fly.io, banco, Redis, NATS, TURN e DNS. Nenhuma credencial foi disponibilizada ao ambiente.
6. Responsividade: corrigir overflow detectado em mobile e ampliar testes para todos os modais e telas.
7. Segurança: executar auditoria do backend e dependências, controles de autorização, testes de abuso de reputação e revisão de privacidade antes de produção.

## Roteiro para demonstração local

Executar `npm ci`, depois `npm run dev:desktop`. Abrir a URL indicada pelo Vite, apresentar o aviso de dados demonstrativos e usar os três atalhos. Navegar pelo feed e perfis. Para a PWA, executar `npm run dev:web`. Login real depende do backend. Não apresentar captura, voz, uploads ou autenticidade como validados por esta entrega.

Esta entrega é uma melhoria incremental verificada do protótipo, não certificação de prontidão para produção ou conclusão de todas as sprints.
