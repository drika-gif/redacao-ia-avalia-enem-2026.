import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileEdit, 
  Files, 
  Table, 
  Download, 
  User, 
  LogOut, 
  Home,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  totalCorrecoes: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, totalCorrecoes }) => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Aviso de Privacidade e Finalidade Pedagógica */}
      <div className="bg-brand-50 border-b border-brand-100 py-1.5 px-4 text-center text-xs text-brand-800 font-medium flex items-center justify-center gap-1.5">
        <span>🔒</span>
        <span>As informações inseridas neste sistema são destinadas exclusivamente ao acompanhamento pedagógico.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Marca */}
          <div 
            onClick={() => onSelectTab('inicio')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-extrabold text-base shadow-sm group-hover:bg-brand-800 transition">
              IA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">REDAÇÃO IA</span>
                <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-200">
                  Avalia ENEM 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Da fotografia da redação à planilha final.
              </p>
            </div>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('inicio')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                currentTab === 'inicio'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Início</span>
            </button>

            <button
              onClick={() => onSelectTab('nova-correcao')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                currentTab === 'nova-correcao'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
              }`}
            >
              <FileEdit className="w-4 h-4" />
              <span>Nova Correção</span>
            </button>

            <button
              onClick={() => onSelectTab('redacoes')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                currentTab === 'redacoes'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Files className="w-4 h-4" />
              <span>Redações</span>
              {totalCorrecoes > 0 && (
                <span className="bg-slate-200 text-slate-700 text-xs px-1.5 py-0.2 rounded-full font-bold">
                  {totalCorrecoes}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('planilha-turma')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                currentTab === 'planilha-turma'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Planilha da Turma</span>
            </button>

            <button
              onClick={() => onSelectTab('gerar-planilha')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                currentTab === 'gerar-planilha'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Gerar Planilha</span>
            </button>
          </nav>

          {/* Área do Usuário / Professora */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('minha-conta')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                currentTab === 'minha-conta'
                  ? 'border-brand-300 bg-brand-50 text-brand-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              title="Acessar perfil e configurações da conta"
            >
              <User className="w-3.5 h-3.5 text-brand-600" />
              <span className="max-w-[130px] truncate hidden sm:inline">
                {user?.nome || user?.email || 'Professora'}
              </span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Deseja realmente sair da sua conta?')) {
                  signOut();
                }
              }}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Menu Mobile (Barra inferior ou horizontal rolável) */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => onSelectTab('inicio')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              currentTab === 'inicio' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
            }`}
          >
            Início
          </button>
          <button
            onClick={() => onSelectTab('nova-correcao')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              currentTab === 'nova-correcao' ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-700'
            }`}
          >
            ➕ Nova Correção
          </button>
          <button
            onClick={() => onSelectTab('redacoes')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              currentTab === 'redacoes' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
            }`}
          >
            Redações ({totalCorrecoes})
          </button>
          <button
            onClick={() => onSelectTab('planilha-turma')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              currentTab === 'planilha-turma' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
            }`}
          >
            Planilha
          </button>
          <button
            onClick={() => onSelectTab('gerar-planilha')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              currentTab === 'gerar-planilha' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
            }`}
          >
            Exportar XLSX
          </button>
        </div>
      </div>
    </header>
  );
};
