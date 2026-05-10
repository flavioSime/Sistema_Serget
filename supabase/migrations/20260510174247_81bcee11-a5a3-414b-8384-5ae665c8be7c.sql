
CREATE OR REPLACE FUNCTION public.is_controladoria(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role,'controladoria'::public.app_role,'diretoria'::public.app_role)
  )
$$;

CREATE TABLE public.prestadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo varchar NOT NULL CHECK (tipo IN ('A','B')),
  razao_social varchar NOT NULL,
  cnpj varchar,
  cpf varchar,
  email_contato varchar NOT NULL,
  telefone varchar,
  responsavel_nome varchar,
  responsavel_cpf varchar,
  endereco jsonb,
  dados_bancarios jsonb,
  status varchar NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','suspenso')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users
);
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Controladoria lê prestadores" ON public.prestadores
  FOR SELECT TO authenticated USING (public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria insere prestadores" ON public.prestadores
  FOR INSERT TO authenticated WITH CHECK (public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria atualiza prestadores" ON public.prestadores
  FOR UPDATE TO authenticated USING (public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria deleta prestadores" ON public.prestadores
  FOR DELETE TO authenticated USING (public.is_controladoria(auth.uid()));

CREATE TABLE public.prestador_colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL REFERENCES public.prestadores ON DELETE CASCADE,
  nome varchar NOT NULL,
  cpf varchar,
  funcao varchar,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prestador_colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Controladoria lê colaboradores" ON public.prestador_colaboradores
  FOR SELECT TO authenticated USING (public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria gerencia colaboradores" ON public.prestador_colaboradores
  FOR ALL TO authenticated USING (public.is_controladoria(auth.uid())) WITH CHECK (public.is_controladoria(auth.uid()));

CREATE TABLE public.solicitacoes_pj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid REFERENCES public.prestadores,
  tipo_pj varchar NOT NULL CHECK (tipo_pj IN ('A','B')),
  area_solicitante varchar NOT NULL,
  servico_descricao text NOT NULL,
  valor_estimado numeric(12,2) NOT NULL,
  centro_custo varchar NOT NULL,
  responsavel_contratacao_id uuid NOT NULL REFERENCES auth.users,
  solicitante_id uuid NOT NULL REFERENCES auth.users,
  status varchar NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','aguardando_aprovacao','aprovado','devolvido','cancelado')),
  comentario_devolucao text,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_pj ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Controladoria lê todas solicitações" ON public.solicitacoes_pj
  FOR SELECT TO authenticated USING (public.is_controladoria(auth.uid()) OR solicitante_id = auth.uid());
CREATE POLICY "Usuários autenticados criam solicitação" ON public.solicitacoes_pj
  FOR INSERT TO authenticated WITH CHECK (solicitante_id = auth.uid());
CREATE POLICY "Controladoria atualiza solicitações" ON public.solicitacoes_pj
  FOR UPDATE TO authenticated USING (
    public.is_controladoria(auth.uid()) OR (solicitante_id = auth.uid() AND status IN ('rascunho','devolvido'))
  );
CREATE POLICY "Controladoria deleta solicitações" ON public.solicitacoes_pj
  FOR DELETE TO authenticated USING (public.is_controladoria(auth.uid()));

CREATE TABLE public.contratos_pj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes_pj,
  prestador_id uuid NOT NULL REFERENCES public.prestadores,
  tipo_contrato varchar NOT NULL CHECK (tipo_contrato IN ('A','B')),
  modelo_utilizado varchar NOT NULL,
  conteudo_contrato text NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  status varchar NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho','em_revisao','assinado_tatiane','assinado_testemunhas','assinado_dani',
    'enviado_prestador','assinado_prestador','vigente','encerrado'
  )),
  assinado_tatiane_em timestamptz,
  assinado_tatiane_por uuid REFERENCES auth.users,
  assinado_testemunha1_em timestamptz,
  assinado_testemunha1_por uuid REFERENCES auth.users,
  assinado_testemunha2_em timestamptz,
  assinado_testemunha2_por uuid REFERENCES auth.users,
  assinado_dani_em timestamptz,
  assinado_dani_por uuid REFERENCES auth.users,
  enviado_prestador_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contratos_pj ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Controladoria lê contratos" ON public.contratos_pj
  FOR SELECT TO authenticated USING (public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria gerencia contratos" ON public.contratos_pj
  FOR ALL TO authenticated USING (public.is_controladoria(auth.uid())) WITH CHECK (public.is_controladoria(auth.uid()));

CREATE TABLE public.documentos_pj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL REFERENCES public.prestadores ON DELETE CASCADE,
  contrato_id uuid REFERENCES public.contratos_pj,
  tipo_documento varchar NOT NULL CHECK (tipo_documento IN (
    'contrato','aditivo','cnd','nota_fiscal','ficha_cadastral','documento_colaborador','outro'
  )),
  nome_arquivo varchar NOT NULL,
  storage_path varchar NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  validade_em date,
  status varchar NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','vencido','substituido')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users
);
ALTER TABLE public.documentos_pj ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Controladoria lê documentos" ON public.documentos_pj
  FOR SELECT TO authenticated USING (public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria gerencia documentos" ON public.documentos_pj
  FOR ALL TO authenticated USING (public.is_controladoria(auth.uid())) WITH CHECK (public.is_controladoria(auth.uid()));

CREATE TABLE public.processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar NOT NULL,
  descricao text,
  modulo varchar NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  status varchar NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','rascunho','descontinuado')),
  raci jsonb,
  conexoes jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users
);
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem processos" ON public.processos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia processos" ON public.processos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade varchar NOT NULL,
  entidade_id uuid NOT NULL,
  acao varchar NOT NULL,
  payload jsonb,
  user_id uuid REFERENCES auth.users,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historico_entidade_idx ON public.historico (entidade, entidade_id, criado_em DESC);
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Controladoria lê histórico" ON public.historico
  FOR SELECT TO authenticated USING (public.is_controladoria(auth.uid()));
CREATE POLICY "Autenticados inserem histórico" ON public.historico
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.touch_atualizado_em()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_prestadores_upd BEFORE UPDATE ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
CREATE TRIGGER trg_solicitacoes_pj_upd BEFORE UPDATE ON public.solicitacoes_pj
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
CREATE TRIGGER trg_contratos_pj_upd BEFORE UPDATE ON public.contratos_pj
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
CREATE TRIGGER trg_processos_upd BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-pj','documentos-pj', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Controladoria lê arquivos GED"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos-pj' AND public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria envia arquivos GED"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-pj' AND public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria atualiza arquivos GED"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos-pj' AND public.is_controladoria(auth.uid()));
CREATE POLICY "Controladoria deleta arquivos GED"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos-pj' AND public.is_controladoria(auth.uid()));
