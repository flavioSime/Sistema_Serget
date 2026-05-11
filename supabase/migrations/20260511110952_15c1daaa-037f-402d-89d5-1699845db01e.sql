
-- 1a. Novos papéis
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fornecedor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lider';

-- 1b. Convites de fornecedor
CREATE TABLE IF NOT EXISTS public.convites_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  usado_em timestamptz,
  user_id uuid
);

ALTER TABLE public.convites_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Controladoria gerencia convites"
  ON public.convites_fornecedor FOR ALL
  TO authenticated
  USING (public.is_controladoria(auth.uid()))
  WITH CHECK (public.is_controladoria(auth.uid()));

-- RPC pública para validar token (não expõe a tabela inteira)
CREATE OR REPLACE FUNCTION public.validar_convite_token(_token text)
RETURNS TABLE (
  id uuid,
  prestador_id uuid,
  email text,
  expira_em timestamptz,
  usado_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, prestador_id, email, expira_em, usado_em
  FROM public.convites_fornecedor
  WHERE token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validar_convite_token(text) TO anon, authenticated;

-- 1c. Documentação do projeto
CREATE TABLE IF NOT EXISTS public.documentacao_projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('sistema','gestao')),
  titulo text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  versao int NOT NULL DEFAULT 1,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);

ALTER TABLE public.documentacao_projeto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e diretoria leem docs"
  ON public.documentacao_projeto FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria'));

CREATE POLICY "Admin gerencia docs"
  ON public.documentacao_projeto FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seeds
INSERT INTO public.documentacao_projeto (tipo, titulo, conteudo) VALUES
('sistema','Sistema SERGET — Documento Técnico',
$md$# Sistema SERGET — Documento Técnico

## Stack
TanStack Start · TypeScript · Tailwind · Supabase (sa-east-1)

## Módulos

### Módulo 0 — Autenticação
Login, recuperação de senha, troca de senha.
Papéis: admin, diretoria, controladoria, lider, fornecedor, operador.

### Módulo 1 — Controladoria (Sprint 1)
Fluxo PJ: pedido → aprovação → abertura → ficha → validação → contrato → assinaturas → envio.
Portal do Fornecedor: convite por email, acesso restrito ao próprio processo.
GED: arquivamento de documentos e contratos.

## Decisões de arquitetura
- Assinatura do contrato pelo fornecedor: clique simples (registra user_id + timestamp). Certificado digital: ponto aberto.
- Acesso do fornecedor: criado pela controladoria via convite com token.
$md$),
('gestao','Gestão do Projeto SERGET',
$md$# Gestão do Projeto SERGET

## Status atual
Sprint 1 — Controladoria · Processo PJ

## Roadmap
| Sprint | Escopo | Status |
|---|---|---|
| Sprint 1 | Controladoria — Processo PJ completo | Em andamento |
| Sprint 2 | Módulo de Processos | Próximo |
| Sprint 3 | RH — Sessão inaugural | Backlog |

## Pendências abertas
- Modelos de contrato Tipo A e B
- Formulário oficial de solicitação
- Ficha cadastral oficial
- Certificado digital para assinatura do fornecedor
$md$);

-- 1d. Coluna lider_user_id em solicitacoes_pj
ALTER TABLE public.solicitacoes_pj
  ADD COLUMN IF NOT EXISTS lider_user_id uuid;

CREATE POLICY "Lider vê suas solicitações"
  ON public.solicitacoes_pj FOR SELECT
  TO authenticated
  USING (lider_user_id = auth.uid());
