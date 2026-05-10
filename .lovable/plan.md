## Sprint 1 — Controladoria · Processo PJ

Vou entregar o fluxo completo de Prestadores PJ, da solicitação até o arquivamento no GED após a assinatura do CEO. Antes de partir para a implementação, preciso confirmar alguns pontos para não construir suposição errada.

### O que entra neste sprint

1. **Banco (migration única)** — tabelas `prestadores`, `prestador_colaboradores`, `solicitacoes_pj`, `contratos_pj`, `documentos_pj`, `processos`, `historico` (log), com RLS por papel (admin, controladoria, diretoria, operador).
2. **Papéis** — adicionar `controladoria` e `diretoria` ao enum `app_role` (já existem `admin` e `operador`).
3. **Storage** — bucket privado `documentos-pj` com policies por papel.
4. **Layout** — sidebar navegável com grupo "Controladoria → Prestadores PJ" e "Aprovações", visível apenas para admin/controladoria/diretoria.
5. **Telas**
   - `/controladoria/prestadores` — lista com filtros, busca, badges de status.
   - `/controladoria/prestadores/$id` — detalhe com abas (Cadastrais, Contratos, Documentos/GED, Colaboradores [B], Histórico) + alertas de CND e contrato vencendo.
   - `/controladoria/prestadores/novo` — formulário de solicitação (etapa 1).
   - `/controladoria/aprovacoes` — fila do Dani (aprovar/devolver com comentário obrigatório).
   - `/controladoria/solicitacoes/$id/ficha` — ficha cadastral pós-aprovação (Tipo A / Tipo B com colaboradores) + uploads.
   - `/controladoria/contratos/$id` — geração com IA, edição inline, fluxo de assinaturas sequencial com barra de progresso.
6. **Geração do contrato com IA** — server function via Lovable AI Gateway (`google/gemini-2.5-pro`), modelo A vs B selecionado pelo tipo, pré-preenchido com dados da solicitação + ficha.
7. **Arquivamento automático no GED** — após `assinado_dani`, registro em `documentos_pj` (tipo `contrato`, status `vigente`) + entrada em `historico` + mensagem na UI.
8. **Validações de negócio**
   - Comentário obrigatório ao devolver.
   - Contrato só pode ser gerado com ficha completa.
   - CND vencida bloqueia geração de contrato (mensagem explicativa).
   - Assinaturas em ordem rígida (Tatiane gestora → testemunha+resp. contratação → Dani).
9. **Tom** — todas as toasts/mensagens seguem o DNA SERGET (humano, direto).

### Detalhes técnicos (resumo)

- **RLS**: `has_role()` já existe; vou adicionar funções helper para "qualquer papel de controladoria" e usar em todas as policies. Solicitante sempre vê suas próprias solicitações.
- **Assinaturas**: papel "Tatiane gestora" e "Tatiane testemunha" identificadas por papel + ação manual (não há perfil distinto entre os dois — controlado pelo status do contrato). A assinatura do Dani requer papel `diretoria`. Resp. contratação assina como testemunha 2 (definido na solicitação).
- **Histórico**: tabela genérica `historico (entidade, entidade_id, acao, payload jsonb, user_id, criado_em)`.
- **Storage path**: `documentos-pj/{prestador_id}/{contrato_id|_}/{uuid}-{nome}`.

### Perguntas antes de implementar

1. **Assinatura do contrato** — neste sprint é uma assinatura "interna do sistema" (clique em "Assinar" registra `user_id + timestamp`), sem certificado digital. Confirma? (a Sprint 1 diz isso; só quero garantir antes de codar.)
2. **Modelos de contrato A e B** — você tem o texto-modelo dos contratos para eu gravar como template, ou a IA gera do zero a partir das instruções do tipo? Por ora vou criar dois templates curtos genéricos e pedir para você substituir depois — ok?
3. **Tatiane / Dani** — devo identificá-los por **papel** (`gestor_controladoria`, `diretoria`) ou por **usuário específico** (e-mail fixo)? Sugiro papel — qualquer usuário com o papel pode assinar a etapa correspondente.

Se concordar com essas três premissas, sigo direto para a migration e a implementação completa nesta mesma rodada após a aprovação.
