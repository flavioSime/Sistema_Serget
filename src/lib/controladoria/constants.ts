export const STATUS_PRESTADOR = {
  aguardando_aprovacao: { label: "Aguardando aprovação", className: "bg-amber-100 text-amber-800 border-amber-200" },
  aprovado: { label: "Aprovado", className: "bg-blue-100 text-blue-800 border-blue-200" },
  em_processo: { label: "Em processo", className: "bg-blue-100 text-blue-800 border-blue-200" },
  aguardando_validacao: { label: "Aguardando validação", className: "bg-amber-100 text-amber-800 border-amber-200" },
  aguardando_contrato: { label: "Aguardando contrato", className: "bg-amber-100 text-amber-800 border-amber-200" },
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-border" },
  suspenso: { label: "Suspenso", className: "bg-orange-100 text-orange-800 border-orange-200" },
} as const;

export const STATUS_SOLICITACAO: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground border-border" },
  aguardando_aprovacao: { label: "Aguardando aprovação", className: "bg-amber-100 text-amber-800 border-amber-200" },
  aprovado: { label: "Aprovado", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  devolvido: { label: "Devolvido", className: "bg-orange-100 text-orange-800 border-orange-200" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
};

export const STATUS_CONTRATO: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground border-border" },
  em_revisao: { label: "Em revisão", className: "bg-amber-100 text-amber-800 border-amber-200" },
  assinado_tatiane: { label: "Assinado por Tatiane", className: "bg-blue-100 text-blue-800 border-blue-200" },
  assinado_testemunhas: { label: "Assinado pelas testemunhas", className: "bg-blue-100 text-blue-800 border-blue-200" },
  assinado_dani: { label: "Assinado por Dani", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  enviado_prestador: { label: "Enviado ao prestador", className: "bg-blue-100 text-blue-800 border-blue-200" },
  assinado_prestador: { label: "Assinado pelo prestador", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  vigente: { label: "Vigente", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  encerrado: { label: "Encerrado", className: "bg-muted text-muted-foreground border-border" },
};

export const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  contrato: "Contrato",
  aditivo: "Aditivo",
  cnd: "CND",
  nota_fiscal: "Nota fiscal",
  ficha_cadastral: "Ficha cadastral",
  documento_colaborador: "Documento de colaborador",
  outro: "Outro",
};
