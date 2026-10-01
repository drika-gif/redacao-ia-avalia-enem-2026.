import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Database, 
  LogOut, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Settings,
  KeyRound 
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  setStoredCredentials, 
  SUPABASE_SQL_SCHEMA 
} from '../lib/supabase';

export const MyAccountPage: React.FC = () => {
  const { user, signOut, isConfigured, setIsRecoveryMode } = useAuth();
  const [copiedSql, setCopiedSql] = useState(false);
  const [url, setUrl] = useState(getSupabaseCredentials().url);
  const [key, setKey] = useState(getSupabaseCredentials().key);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSaveCredentials = () => {
    setStoredCredentials(url, key);
    alert('Configurações do Supabase salvas no navegador! A página será recarregada.');
    window.location.reload();
  };

  const handleExportBackup = () => {
    const raw = localStorage.getItem('redacao_ia_correcoes_cache') || '[]';
    const blob = new Blob([raw], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `backup_redacao_ia_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(u);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          localStorage.setItem('redacao_ia_correcoes_cache', JSON.stringify(parsed));
          alert(`Backup importado com sucesso! ${parsed.length} registros restaurados. A página será atualizada.`);
          window.location.reload();
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err: any) {
        alert('Erro ao ler arquivo JSON de backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Cabeçalho do Perfil */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              <User className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
                Conta de Professora
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {user?.nome || 'Professora do IEMA'}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRecoveryMode(true)}
              className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition border border-brand-200 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Alterar Senha</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Deseja realmente sair da sua conta?')) {
                  signOut();
                }
              }}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition border border-red-200 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status da Conexão Supabase */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-700" />
            <span>Conexão Supabase & Nuvem Multi-tenant</span>
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isConfigured
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            <span>{isConfigured ? '🟢 Conectado' : '🟡 Modo Local / Demo'}</span>
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Cada professora possui sua conta individual. As tabelas utilizam <strong>Row Level Security (RLS)</strong> com a regra <code>auth.uid() = user_id</code>, garantindo que suas turmas, redações e notas fiquem 100% isoladas e privadas.
        </p>

        {/* Formulário de Configuração Rápida */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
          <span className="font-bold text-slate-800 block uppercase tracking-wide">
            Credenciais de Acesso ao Supabase:
          </span>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">VITE_SUPABASE_URL:</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">VITE_SUPABASE_ANON_KEY:</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={handleSaveCredentials}
              className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm"
            >
              Salvar Credenciais
            </button>
          </div>
        </div>

        {/* Script SQL Oficial */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase">
              Script SQL com Políticas RLS:
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] overflow-x-auto max-h-48 font-mono">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      </div>

      {/* Backup e Recuperação Local */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-700" />
          <span>Backup e Segurança dos Dados</span>
        </h3>
        <p className="text-xs text-slate-500">
          Você pode baixar uma cópia completa de suas correções em arquivo JSON ou restaurá-la a qualquer momento.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Backup (JSON)</span>
          </button>

          <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restaurar Backup (JSON)</span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportBackup}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
