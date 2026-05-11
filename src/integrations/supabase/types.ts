export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contratos_pj: {
        Row: {
          assinado_dani_em: string | null
          assinado_dani_por: string | null
          assinado_tatiane_em: string | null
          assinado_tatiane_por: string | null
          assinado_testemunha1_em: string | null
          assinado_testemunha1_por: string | null
          assinado_testemunha2_em: string | null
          assinado_testemunha2_por: string | null
          atualizado_em: string
          conteudo_contrato: string
          criado_em: string
          enviado_prestador_em: string | null
          id: string
          modelo_utilizado: string
          prestador_id: string
          solicitacao_id: string
          status: string
          tipo_contrato: string
          versao: number
        }
        Insert: {
          assinado_dani_em?: string | null
          assinado_dani_por?: string | null
          assinado_tatiane_em?: string | null
          assinado_tatiane_por?: string | null
          assinado_testemunha1_em?: string | null
          assinado_testemunha1_por?: string | null
          assinado_testemunha2_em?: string | null
          assinado_testemunha2_por?: string | null
          atualizado_em?: string
          conteudo_contrato: string
          criado_em?: string
          enviado_prestador_em?: string | null
          id?: string
          modelo_utilizado: string
          prestador_id: string
          solicitacao_id: string
          status?: string
          tipo_contrato: string
          versao?: number
        }
        Update: {
          assinado_dani_em?: string | null
          assinado_dani_por?: string | null
          assinado_tatiane_em?: string | null
          assinado_tatiane_por?: string | null
          assinado_testemunha1_em?: string | null
          assinado_testemunha1_por?: string | null
          assinado_testemunha2_em?: string | null
          assinado_testemunha2_por?: string | null
          atualizado_em?: string
          conteudo_contrato?: string
          criado_em?: string
          enviado_prestador_em?: string | null
          id?: string
          modelo_utilizado?: string
          prestador_id?: string
          solicitacao_id?: string
          status?: string
          tipo_contrato?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_pj_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_pj_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_fornecedor: {
        Row: {
          criado_em: string
          criado_por: string | null
          email: string
          expira_em: string
          id: string
          prestador_id: string
          token: string
          usado_em: string | null
          user_id: string | null
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          email: string
          expira_em?: string
          id?: string
          prestador_id: string
          token?: string
          usado_em?: string | null
          user_id?: string | null
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          email?: string
          expira_em?: string
          id?: string
          prestador_id?: string
          token?: string
          usado_em?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_fornecedor_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      documentacao_projeto: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          conteudo: string
          id: string
          tipo: string
          titulo: string
          versao: number
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          conteudo?: string
          id?: string
          tipo: string
          titulo: string
          versao?: number
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          conteudo?: string
          id?: string
          tipo?: string
          titulo?: string
          versao?: number
        }
        Relationships: []
      }
      documentos_pj: {
        Row: {
          contrato_id: string | null
          criado_em: string
          criado_por: string | null
          id: string
          nome_arquivo: string
          obs_reenvio: string | null
          prestador_id: string
          status: string
          storage_path: string
          tipo_documento: string
          validade_em: string | null
          validado_em: string | null
          validado_por: string | null
          versao: number
        }
        Insert: {
          contrato_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome_arquivo: string
          obs_reenvio?: string | null
          prestador_id: string
          status?: string
          storage_path: string
          tipo_documento: string
          validade_em?: string | null
          validado_em?: string | null
          validado_por?: string | null
          versao?: number
        }
        Update: {
          contrato_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome_arquivo?: string
          obs_reenvio?: string | null
          prestador_id?: string
          status?: string
          storage_path?: string
          tipo_documento?: string
          validade_em?: string | null
          validado_em?: string | null
          validado_por?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_pj_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_pj"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_pj_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      historico: {
        Row: {
          acao: string
          criado_em: string
          entidade: string
          entidade_id: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          entidade: string
          entidade_id: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          entidade?: string
          entidade_id?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      prestador_colaboradores: {
        Row: {
          cpf: string | null
          criado_em: string
          funcao: string | null
          id: string
          nome: string
          prestador_id: string
        }
        Insert: {
          cpf?: string | null
          criado_em?: string
          funcao?: string | null
          id?: string
          nome: string
          prestador_id: string
        }
        Update: {
          cpf?: string | null
          criado_em?: string
          funcao?: string | null
          id?: string
          nome?: string
          prestador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestador_colaboradores_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      prestadores: {
        Row: {
          atualizado_em: string
          cnpj: string | null
          cpf: string | null
          criado_em: string
          criado_por: string | null
          dados_bancarios: Json | null
          email_contato: string
          endereco: Json | null
          id: string
          razao_social: string
          responsavel_cpf: string | null
          responsavel_nome: string | null
          status: string
          telefone: string | null
          tipo: string
        }
        Insert: {
          atualizado_em?: string
          cnpj?: string | null
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          dados_bancarios?: Json | null
          email_contato: string
          endereco?: Json | null
          id?: string
          razao_social: string
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          status?: string
          telefone?: string | null
          tipo: string
        }
        Update: {
          atualizado_em?: string
          cnpj?: string | null
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          dados_bancarios?: Json | null
          email_contato?: string
          endereco?: Json | null
          id?: string
          razao_social?: string
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
        }
        Relationships: []
      }
      processos: {
        Row: {
          atualizado_em: string
          conexoes: Json | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          modulo: string
          nome: string
          raci: Json | null
          status: string
          versao: number
        }
        Insert: {
          atualizado_em?: string
          conexoes?: Json | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modulo: string
          nome: string
          raci?: Json | null
          status?: string
          versao?: number
        }
        Update: {
          atualizado_em?: string
          conexoes?: Json | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modulo?: string
          nome?: string
          raci?: Json | null
          status?: string
          versao?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_pj: {
        Row: {
          area_solicitante: string
          atualizado_em: string
          centro_custo: string
          comentario_devolucao: string | null
          criado_em: string
          id: string
          lider_user_id: string | null
          observacoes: string | null
          prestador_id: string | null
          responsavel_contratacao_id: string
          servico_descricao: string
          solicitante_id: string
          status: string
          tipo_pj: string
          valor_estimado: number
        }
        Insert: {
          area_solicitante: string
          atualizado_em?: string
          centro_custo: string
          comentario_devolucao?: string | null
          criado_em?: string
          id?: string
          lider_user_id?: string | null
          observacoes?: string | null
          prestador_id?: string | null
          responsavel_contratacao_id: string
          servico_descricao: string
          solicitante_id: string
          status?: string
          tipo_pj: string
          valor_estimado: number
        }
        Update: {
          area_solicitante?: string
          atualizado_em?: string
          centro_custo?: string
          comentario_devolucao?: string | null
          criado_em?: string
          id?: string
          lider_user_id?: string | null
          observacoes?: string | null
          prestador_id?: string | null
          responsavel_contratacao_id?: string
          servico_descricao?: string
          solicitante_id?: string
          status?: string
          tipo_pj?: string
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_pj_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_controladoria: { Args: { _user_id: string }; Returns: boolean }
      validar_convite_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expira_em: string
          id: string
          prestador_id: string
          usado_em: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "operador"
        | "controladoria"
        | "diretoria"
        | "fornecedor"
        | "lider"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gestor",
        "operador",
        "controladoria",
        "diretoria",
        "fornecedor",
        "lider",
      ],
    },
  },
} as const
