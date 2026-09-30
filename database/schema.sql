CREATE TABLE public.correcoes (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
iema_pleno text NOT NULL CHECK(length(trim(iema_pleno))>0),
turma text NOT NULL CHECK(length(trim(turma))>0),
nome_estudante text NOT NULL CHECK(length(trim(nome_estudante))>0),
tema text NOT NULL CHECK(length(trim(tema))>0),
transcricao text,
c1_sugerida integer NOT NULL DEFAULT 0 CHECK(c1_sugerida IN(0,40,80,120,160,200)),
c1_final integer NOT NULL DEFAULT 0 CHECK(c1_final IN(0,40,80,120,160,200)),
c1_justificativa text,
c2_sugerida integer NOT NULL DEFAULT 0 CHECK(c2_sugerida IN(0,40,80,120,160,200)),
c2_final integer NOT NULL DEFAULT 0 CHECK(c2_final IN(0,40,80,120,160,200)),
c2_justificativa text,
c3_sugerida integer NOT NULL DEFAULT 0 CHECK(c3_sugerida IN(0,40,80,120,160,200)),
c3_final integer NOT NULL DEFAULT 0 CHECK(c3_final IN(0,40,80,120,160,200)),
c3_justificativa text,
c4_sugerida integer NOT NULL DEFAULT 0 CHECK(c4_sugerida IN(0,40,80,120,160,200)),
c4_final integer NOT NULL DEFAULT 0 CHECK(c4_final IN(0,40,80,120,160,200)),
c4_justificativa text,
c5_sugerida integer NOT NULL DEFAULT 0 CHECK(c5_sugerida IN(0,40,80,120,160,200)),
c5_final integer NOT NULL DEFAULT 0 CHECK(c5_final IN(0,40,80,120,160,200)),
c5_justificativa text,
nota_final integer NOT NULL DEFAULT 0 CHECK(nota_final=c1_final+c2_final+c3_final+c4_final+c5_final),
nota_zero boolean NOT NULL DEFAULT false,
motivo_nota_zero text,
relatorio_pedagogico jsonb DEFAULT '{}'::jsonb,
observacoes text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX correcoes_user_turma_idx ON public.correcoes(user_id,turma);
ALTER TABLE public.correcoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.correcoes FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.correcoes TO authenticated;
CREATE POLICY correcoes_select_owner ON public.correcoes FOR SELECT TO authenticated USING((select auth.uid())=user_id);
CREATE POLICY correcoes_insert_owner ON public.correcoes FOR INSERT TO authenticated WITH CHECK((select auth.uid())=user_id);
CREATE POLICY correcoes_update_owner ON public.correcoes FOR UPDATE TO authenticated USING((select auth.uid())=user_id) WITH CHECK((select auth.uid())=user_id);
CREATE POLICY correcoes_delete_owner ON public.correcoes FOR DELETE TO authenticated USING((select auth.uid())=user_id);