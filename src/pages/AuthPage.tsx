import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  ArrowRight, 
  Settings, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { setStoredCredentials, getSupabaseCredentials, SUPABASE_SQL_SCHEMA } from '../lib/supabase';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword, enterDemoMode } = useAuth();
  const [tab, setTab] = useState<'entrar' | 'cadastrar' | 'esqueci'>('entrar');
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confSenha, setConfSenha] = useState('');

  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal de configuração rápida do Supabase
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await signIn(email, senha);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (senha !== confSenha) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(email, senha, nome);
      if (res.needEmailConfirm) {
        setSuccessMsg(
          `Conta criada com sucesso! Enviamos um link de confirmação para ${email}. Após confirmar seu email, você poderá entrar no sistema.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleEsqueciSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccessMsg('Link de redefinição enviado para seu email. Verifique sua caixa de entrada.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao solicitar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    setStoredCredentials(supabaseUrl, supabaseKey);
    alert('Configurações salvas! A página será atualizada.');
    window.location.reload();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Banner de Privacidade */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 border border-brand-200">
          <span>🔒</span>
          <span>Acesso individual e restrito para professoras e professores</span>
        </span>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-xl">
        {/* Identidade */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand-700 text-white rounded-2xl flex items-center justify-center font-black text-xl mx-auto shadow-md mb-3">
            IA
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            REDAÇÃO IA
          </h1>
          <p className="text-sm font-bold text-brand-700">Corretor Avalia ENEM 2026</p>
          <p className="text-xs text-slate-500 mt-1 italic">
            "Da fotografia da redação à planilha final."
          </p>
          <p className="text-xs text-slate-700 mt-3">
            Projeto pedagógico da Professora Adriana Aguiar.
            Não é um serviço oficial do Inep ou do ENEM.
          </p>
        </div>

        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
          Use a conta criada neste aplicativo. A senha do Redação IA deve ser exclusiva:
          não use a senha do seu e-mail, Google ou outros serviços.
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => { setTab('entrar'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition ${
              tab === 'entrar'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setTab('cadastrar'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition ${
              tab === 'cadastrar'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Alertas de Erro ou Sucesso */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulário: ENTRAR */}
        {tab === 'entrar' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                E-mail da Professora:
              </label>
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professora@iema.edu.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Senha do Redação IA:
              </label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Entrando...' : 'Entrar no Redação IA'}</span>
            </button>

            <div className="flex justify-between items-center text-xs pt-2">
              <button
                type="button"
                onClick={() => setTab('esqueci')}
                className="text-brand-700 hover:underline font-semibold"
              >
                Esqueci minha senha
              </button>
              <button
                type="button"
                onClick={() => setTab('cadastrar')}
                className="text-slate-600 hover:underline"
              >
                Criar nova conta
              </button>
            </div>
          </form>
        )}

        {/* Formulário: CRIAR CONTA */}
        {tab === 'cadastrar' && (
          <form onSubmit={handleCadastro} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nome da Professora:
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                E-mail:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professora@iema.edu.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Crie uma senha exclusiva (mínimo 6 caracteres):
              </label>
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Confirmar Senha:
              </label>
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confSenha}
                onChange={(e) => setConfSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Cadastrando...' : 'Criar Minha Conta'}</span>
            </button>

            <div className="text-center text-xs pt-2">
              <span className="text-slate-500">Já possui conta? </span>
              <button
                type="button"
                onClick={() => setTab('entrar')}
                className="text-brand-700 font-bold hover:underline"
              >
                Fazer Login
              </button>
            </div>
          </form>
        )}

        {/* Formulário: ESQUECI MINHA SENHA */}
        {tab === 'esqueci' && (
          <form onSubmit={handleEsqueciSenha} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Informe seu e-mail cadastrado para receber o link seguro de redefinição de senha.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Seu E-mail:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professora@iema.edu.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Enviando...' : 'Enviar Link de Recuperação'}</span>
            </button>

            <div className="text-center text-xs pt-2">
              <button
                type="button"
                onClick={() => setTab('entrar')}
                className="text-brand-700 font-bold hover:underline"
              >
                ⬅ Voltar ao Login
              </button>
            </div>
          </form>
        )}

        {/* Rodapé: Modo Teste e Configuração */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-2.5 text-center">
          <p className="text-xs text-slate-400">
            Deseja testar sem credenciais ou conectar sua nuvem?
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={enterDemoMode}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Entrar em Modo Demonstração</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const creds = getSupabaseCredentials();
                setSupabaseUrl(creds.url);
                setSupabaseKey(creds.key);
                setShowConfigModal(true);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Configurar Supabase</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Configuração do Supabase */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Configurar Conexão com o Supabase
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Insira a Project URL e a Anon Public Key do seu projeto Supabase gratuito.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">VITE_SUPABASE_URL:</label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">VITE_SUPABASE_ANON_KEY:</label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  {copiedSql ? '✅ SQL Copiado!' : '📋 Copiar Script SQL Oficial com RLS'}
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-xs"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
