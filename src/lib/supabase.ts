import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Obtém as credenciais das variáveis de ambiente ou do localStorage (para configuração direta no navegador)
export const getSupabaseCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('redacao_supabase_url') || '' : '';
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('redacao_supabase_key') || '' : '';

  const url = (envUrl || localUrl).trim().replace(/\/+$/, '');
  const key = (envKey || localKey).trim();

  return { url, key, isConfigured: Boolean(url && key) };
};

export const setStoredCredentials = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('redacao_supabase_url', (url || '').trim().replace(/\/+$/, ''));
    localStorage.setItem('redacao_supabase_key', (key || '').trim());
  }
};

const credentials = getSupabaseCredentials();

if (!credentials.isConfigured) {
  console.warn(
    '[REDAÇÃO IA] Supabase não configurado. Para habilitar a nuvem, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env ou no painel do sistema.'
  );
}

let cachedClient: SupabaseClient | null = null;
let cachedCredentials = '';
export const getSupabaseClient = (): SupabaseClient | null => {
  const creds = getSupabaseCredentials();
  if (!creds.isConfigured) return null;
  const signature = `${creds.url}|${creds.key}`;
  if (cachedClient && signature === cachedCredentials) return cachedClient;
  cachedClient = createClient(creds.url, creds.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  cachedCredentials = signature;
  return cachedClient;
};
export const supabase = getSupabaseClient();

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCRIPT SQL OFICIAL: TABELA 'correcoes' COM ROW LEVEL SECURITY (RLS)
-- REDAÇÃO IA - CORRETOR AVALIA ENEM 2026
-- ==============================================================================
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/_/sql)

CREATE TABLE IF NOT EXISTS public.correcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    iema_pleno TEXT NOT NULL,
    turma TEXT NOT NULL,
    nome_estudante TEXT NOT NULL,
    tema TEXT NOT NULL,
    transcricao TEXT,
    c1_sugerida INTEGER DEFAULT 0,
    c1_final INTEGER DEFAULT 0,
    c1_justificativa TEXT,
    c2_sugerida INTEGER DEFAULT 0,
    c2_final INTEGER DEFAULT 0,
    c2_justificativa TEXT,
    c3_sugerida INTEGER DEFAULT 0,
    c3_final INTEGER DEFAULT 0,
    c3_justificativa TEXT,
    c4_sugerida INTEGER DEFAULT 0,
    c4_final INTEGER DEFAULT 0,
    c4_justificativa TEXT,
    c5_sugerida INTEGER DEFAULT 0,
    c5_final INTEGER DEFAULT 0,
    c5_justificativa TEXT,
    nota_final INTEGER DEFAULT 0,
    nota_zero BOOLEAN DEFAULT FALSE,
    motivo_nota_zero TEXT,
    relatorio_pedagogico JSONB DEFAULT '{}'::jsonb,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correcoes_user_id ON public.correcoes(user_id);
CREATE INDEX IF NOT EXISTS idx_correcoes_turma ON public.correcoes(turma);
CREATE INDEX IF NOT EXISTS idx_correcoes_estudante ON public.correcoes(nome_estudante);
CREATE INDEX IF NOT EXISTS idx_correcoes_iema ON public.correcoes(iema_pleno);

ALTER TABLE public.correcoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professores visualizam apenas suas proprias correcoes" ON public.correcoes;
CREATE POLICY "Professores visualizam apenas suas proprias correcoes" 
ON public.correcoes FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Professores criam correcoes com seu user_id" ON public.correcoes;
CREATE POLICY "Professores criam correcoes com seu user_id" 
ON public.correcoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Professores atualizam apenas suas proprias correcoes" ON public.correcoes;
CREATE POLICY "Professores atualizam apenas suas proprias correcoes" 
ON public.correcoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Professores excluem apenas suas proprias correcoes" ON public.correcoes;
CREATE POLICY "Professores excluem apenas suas proprias correcoes" 
ON public.correcoes FOR DELETE TO authenticated USING (auth.uid() = user_id);
`;
