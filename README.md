# REDAÇÃO IA - AVALIA ENEM 2026

> **"Da fotografia da redação à planilha final."**  
> Aplicativo web completo, responsivo e funcional desenvolvido para professoras e professores avaliarem redações manuscritas com base nas regras oficiais do **Avalia ENEM 2026** e gerarem automaticamente a planilha oficial de notas preenchida.

## Estado desta versão

A correção usa o endpoint autenticado `/api/ai`, que envia somente tema e transcrição ao Gemini. A chave fica no servidor. A professora revisa todas as sugestões antes de salvar; o aplicativo não fornece uma nota oficial do Inep. O OCR com Tesseract continua separado e pode falhar em manuscritos, permitindo transcrição manual.

A IA exige `GEMINI_API_KEY`, `GEMINI_MODEL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Production na Vercel. Escolha um modelo Gemini disponível para sua chave com saída estruturada. O código ainda precisa passar por um teste real em produção após cadastrar essas variáveis. `npm run dev` serve apenas o frontend; use o ambiente de funções da Vercel para testar a API.

No projeto Supabase atual, a tabela de correções e o limite de IA já foram aplicados. Para uma instalação nova, use `database/schema.sql` e `database/ai-rate-limit.sql`. O limite é de 20 tentativas por conta a cada hora, inclusive tentativas que falhem no provedor. O modo demonstração salva apenas dados de teste no navegador e não chama a IA.

A confirmação de salvamento de contas reais depende do sucesso da escrita no Supabase. Uma falha mantém a correção na tela e pede nova tentativa, sem declarar que foi salva na nuvem.

Antes de compartilhar, verifique a implantação de produção, cadastro e confirmação de e-mail em outro navegador, análise real, revisão, salvamento e exportação. Investigue e resolva o alerta de site suspeito no Chrome. Não há comprovação de que o alerta tenha sido removido.

Para configurar recuperação e confirmação de conta, use a URL pública em Supabase Auth > URL Configuration. O fluxo de redefinição de senha ainda requer validação em produção.

Testes locais: `node --test tests/ai.test.js` e `npm run build`. Eles validam autenticação, limites, formato de notas, evidências e falhas do provedor; não comprovam disponibilidade ou qualidade da resposta real do Gemini.

---

## 🔒 Aviso de Privacidade e Finalidade Pedagógica

> *"As informações inseridas neste sistema são destinadas exclusivamente ao acompanhamento pedagógico."*  
> O sistema adota arquitetura multi-tenant com **Row Level Security (RLS)** no Supabase. Cada professora visualiza e gerencia exclusivamente suas próprias turmas, estudantes, notas e planilhas. Nenhuma professora tem acesso aos dados de outra.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Ícones:** Lucide React
- **Nuvem & Backend:** Supabase (Supabase Authentication, Supabase PostgreSQL Database, Row Level Security)
- **Geração de Planilha:** Gerador autônomo OpenXML/XLSX (JSZip) criando as abas oficiais `Planilha1` e `Planilha2` com fórmulas `=SUM(D6:H6)` sem dependência de upload externo.
- **Deploy:** Vercel (com suporte a SPA via rewrites em `vercel.json`).

---

## 🚀 Como Executar Localmente

### 1. Clonar ou Baixar o Projeto
```bash
git clone https://github.com/drika-gif/redacao-ia-avalia-enem-2026..git
cd redacao-ia-avalia-enem-2026.
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo e crie o `.env`:
```bash
cp .env.example .env
```
Preencha com os dados do seu projeto Supabase:
```ini
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```
*(Nota: O aplicativo possui Modo Demonstração integrado caso queira testar imediatamente sem configurar o Supabase).*

### 4. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
O Vite iniciará o servidor local em: [http://localhost:3000](http://localhost:3000).

### 5. Gerar a Build de Produção
```bash
npm run build
```
A build otimizada será gerada na pasta `dist/`.

---

## 🗄️ Configuração do Banco de Dados no Supabase

1. Crie uma conta gratuita em **[supabase.com](https://supabase.com)**;
2. Crie um novo projeto (*New Project*);
3. No menu lateral, acesse **SQL Editor** -> **New Query**;
4. Cole o script SQL abaixo e clique em **Run** (`Ctrl + Enter`):

```sql
-- ==============================================================================
-- SCRIPT OFICIAL: TABELA 'correcoes' COM ROW LEVEL SECURITY (RLS)
-- REDAÇÃO IA - CORRETOR AVALIA ENEM 2026
-- ==============================================================================

-- 1. Cria a tabela vinculada a auth.users
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

-- 2. Índices de performance
CREATE INDEX IF NOT EXISTS idx_correcoes_user_id ON public.correcoes(user_id);
CREATE INDEX IF NOT EXISTS idx_correcoes_turma ON public.correcoes(turma);
CREATE INDEX IF NOT EXISTS idx_correcoes_estudante ON public.correcoes(nome_estudante);
CREATE INDEX IF NOT EXISTS idx_correcoes_iema ON public.correcoes(iema_pleno);

-- 3. Habilita obrigatoriamente o Row Level Security (RLS)
ALTER TABLE public.correcoes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Isolamento por Professora (auth.uid() = user_id):
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
```

5. Em **Authentication** -> **Providers**, certifique-se de que **Email** está habilitado.
*(Opcional: para permitir login imediato sem confirmação de email, desmarque "Confirm email" em Authentication -> URL Configuration / Settings).*

---

## 📦 Instruções para Publicar no GitHub

```bash
git init
git add .
git commit -m "Publicação Redação IA Avalia ENEM 2026"
git branch -M main
git remote add origin https://github.com/drika-gif/redacao-ia-avalia-enem-2026..git
git push -u origin main
```

---

## ⚡ Instruções para Publicar na Vercel

1. Acesse **[vercel.com](https://vercel.com)** e faça login com sua conta do GitHub;
2. Clique no botão **Add New** -> **Project**;
3. Importe o repositório do projeto;
4. Na seção **Environment Variables**, cadastre as duas variáveis do Supabase:
   - **Key:** `VITE_SUPABASE_URL` | **Value:** *(Sua Project URL do Supabase)*
   - **Key:** `VITE_SUPABASE_ANON_KEY` | **Value:** *(Sua Anon/Public Key do Supabase)*
5. Verifique se as variáveis estão marcadas para *Production*, *Preview* e *Development*;
6. Clique no botão **Deploy**;
7. Em cerca de 1 minuto, o aplicativo estará no ar com HTTPS gratuito e roteamento SPA garantido pelo `vercel.json`.

### Checklist de Testes em Produção:
- [ ] Criar conta de professora
- [ ] Fazer login
- [ ] Cadastrar identificação de estudante e turma
- [ ] Tirar foto / anexar imagem
- [ ] Conferir e editar transcrição
- [ ] Avaliar as 5 competências (escala 0, 40, 80, 120, 160, 200)
- [ ] Quadro dos 5 elementos da intervenção (C5)
- [ ] Regra de Direitos Humanos (zera somente a C5, mantém C1-C4)
- [ ] Salvar correção
- [ ] Conferir lista de redações e planilha da turma
- [ ] Gerar e baixar a planilha oficial `.XLSX` (duas abas: `Planilha1` e `Planilha2`)
- [ ] Fazer logout e confirmar isolamento de dados entre contas

---

## 🛡️ Importante para Segurança

- **Chave Pública (Anon Key):** O frontend utiliza exclusivamente a `anon/public key` do Supabase. Toda a segurança dos dados é assegurada pelas políticas de **Row Level Security (RLS)** executadas diretamente no banco de dados.
- **Nunca utilize a `service_role key`** no frontend, pois ela ignora as regras do RLS.
- O arquivo `.env` está incluso no `.gitignore` para impedir que dados sensíveis sejam enviados ao GitHub.

---

*Coordenação de Avaliação e Inteligência Pedagógica / IEMA - 2026*
