# Sprint 1 Revisado — Portal Fornecedor + Documentação

## Etapa 1 — Banco de dados (uma migration)
- `ALTER TYPE app_role ADD VALUE 'fornecedor'` e `'lider'`
- Tabela `convites_fornecedor` (token, expira em 7d, RLS para admin/controladoria + leitura pública por token via RPC `validar_convite`)
- Tabela `documentacao_projeto` (tipo `sistema`/`gestao`, conteúdo markdown, versão) + seeds iniciais
- `solicitacoes_pj.lider_user_id` + policy "líder vê suas solicitações"
- Função `is_admin(uuid)` se ainda não existir, e RPC `validar_convite_token(text)` SECURITY DEFINER que retorna o convite válido (sem expor a tabela inteira)

## Etapa 2 — Server functions
- `src/lib/controladoria/convite-fornecedor.functions.ts` → `criarConviteFornecedor` (admin client para `auth.admin.inviteUserByEmail` + insert em `convites_fornecedor`)
- `src/lib/fornecedor/aceitar-convite.functions.ts` → `aceitarConvite` (valida token via RPC, marca `usado_em`, vincula `user_id`)
- `src/lib/fornecedor/ficha.functions.ts` → `salvarFichaFornecedor` (atualiza `prestadores` apenas se o convite do user vincula ao prestador)
- `src/lib/fornecedor/assinar-contrato.functions.ts` → `assinarContratoFornecedor`
- Helpers em `*.server.ts` para o admin client

## Etapa 3 — Hook auth atualizado
Adicionar `fornecedor` e `lider` ao tipo `AppRole` e helpers `isFornecedor`, `isLider`, `isAdmin`.

## Etapa 4 — Portal Fornecedor (rotas novas)
- `src/routes/fornecedor.tsx` — layout simples com Logo + Outlet (gate: precisa estar logado E ter papel fornecedor; senão redirect)
- `src/routes/fornecedor.convite.$token.tsx` — pública, valida token, formulário de senha
- `src/routes/fornecedor.ficha.tsx` — formulário cadastro + upload documentos com checklist
- `src/routes/fornecedor.contrato.$id.tsx` — leitura + botão "Li e aceito"
- `src/routes/fornecedor.index.tsx` — dashboard mínimo (status do processo)

## Etapa 5 — Ajustes Controladoria
- Em `_authenticated.controladoria.prestadores.$id.tsx`:
  - Botão "Enviar convite de acesso" (aba Cadastrais)
  - Badge de status do fornecedor (convite enviado / ficha em preenchimento / enviada / aprovada)
  - Aprovar / Solicitar reenvio em cada documento (modal de observação)

## Etapa 6 — Documentação
- `src/routes/_authenticated.documentacao.tsx` — duas abas (Sistema / Gestão), markdown via `react-markdown` (instalar), edição inline somente para admin, salvar incrementa versão.
- Adicionar item no menu lateral do `AppShell` visível para admin/diretoria.

## Etapa 7 — Emails (escopo reduzido neste sprint)
Usar Supabase Auth `inviteUserByEmail` para o convite do fornecedor (já cobre o email principal). Os outros emails (ficha aprovada, doc inválido, contrato pronto) ficam como TODO marcado em código + nota ao usuário, para evitar inflar o sprint sem domínio configurado de email. Vou avisar o usuário e oferecer ativar Lovable Emails depois.

## Detalhes técnicos
- `react-markdown` será instalado via `bun add`.
- O admin client já existe em `src/integrations/supabase/client.server.ts`.
- RLS do `convites_fornecedor`: leitura/escrita só admin/controladoria; validação por token vai por RPC SECURITY DEFINER para a página pública.
- Storage: usar bucket `documentos-pj` existente, prefixo `prestador_id/`.

## Fora deste sprint (avisado ao usuário)
- Certificado digital na assinatura
- Templates oficiais de contrato (continua geração IA)
- Domínio de email customizado / templates dos demais emails

Aviso: vou executar a migration primeiro (precisa aprovação) e depois implementar tudo numa sequência só.