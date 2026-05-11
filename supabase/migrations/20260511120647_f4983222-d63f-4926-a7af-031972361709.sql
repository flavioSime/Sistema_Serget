-- 1. Document validation columns
ALTER TABLE public.documentos_pj
  ADD COLUMN IF NOT EXISTS validado_em   timestamptz,
  ADD COLUMN IF NOT EXISTS validado_por  uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS obs_reenvio   text;

-- 2. Storage policies — fornecedor envia/lê seus próprios documentos
DROP POLICY IF EXISTS "Fornecedor envia documentos próprios" ON storage.objects;
CREATE POLICY "Fornecedor envia documentos próprios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-pj'
  AND public.has_role(auth.uid(), 'fornecedor'::public.app_role)
  AND (storage.foldername(name))[1] = (
    SELECT cv.prestador_id::text
    FROM public.convites_fornecedor cv
    WHERE cv.user_id = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "Fornecedor lê documentos próprios" ON storage.objects;
CREATE POLICY "Fornecedor lê documentos próprios"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-pj'
  AND public.has_role(auth.uid(), 'fornecedor'::public.app_role)
  AND (storage.foldername(name))[1] = (
    SELECT cv.prestador_id::text
    FROM public.convites_fornecedor cv
    WHERE cv.user_id = auth.uid()
    LIMIT 1
  )
);

-- 3. Permite que o fornecedor insira em documentos_pj seus próprios documentos
DROP POLICY IF EXISTS "Fornecedor insere documentos próprios" ON public.documentos_pj;
CREATE POLICY "Fornecedor insere documentos próprios"
ON public.documentos_pj FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'fornecedor'::public.app_role)
  AND prestador_id = (
    SELECT cv.prestador_id FROM public.convites_fornecedor cv
    WHERE cv.user_id = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "Fornecedor lê documentos do seu prestador" ON public.documentos_pj;
CREATE POLICY "Fornecedor lê documentos do seu prestador"
ON public.documentos_pj FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'fornecedor'::public.app_role)
  AND prestador_id = (
    SELECT cv.prestador_id FROM public.convites_fornecedor cv
    WHERE cv.user_id = auth.uid()
    LIMIT 1
  )
);