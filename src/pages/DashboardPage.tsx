import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Correcao } from '../types';
import { 
  FileEdit, 
  Files, 
  Table, 
  Download, 
  TrendingUp, 
  Award, 
  Sparkles, 
  Users, 
  GraduationCap 
} from 'lucide-react';

interface DashboardPageProps {
  correcoes: Correcao[];
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ correcoes, onNavigate }) => {
  const { user } = useAuth();

  // Cálculos estatísticos
  const total = correcoes.length;
  const turmasUnicas = Array.from(new Set(correcoes.map((c) => c.turma).filter(Boolean)));
  
  const calcMedia = (key: 'nota_final' | 'c1_final' | 'c2_final' | 'c3_final' | 'c4_final' | 'c5_final') => {
    if (total === 0) return 0;
    const soma = correcoes.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    return Math.round(soma / total);
  };

  const mediaGeral = calcMedia('nota_final');
  const mediaC1 = calcMedia('c1_final');
  const mediaC2 = calcMedia('c2_final');
  const mediaC3 = calcMedia('c3_final');
  const mediaC4 = calcMedia('c4_final');
  const mediaC5 = calcMedia('c5_final');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero / Boas-vindas */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
              Painel Pedagógico Avalia ENEM 2026
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              Olá, professora {user?.nome ? user.nome.split(' ')[0] : ''}!
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              "Da fotografia da redação à planilha final." Acompanhe em tempo real o desempenho de suas turmas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('nova-correcao')}
              className="bg-brand-700 hover:bg-brand-800 text-white font-extrabold px-5 py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <FileEdit className="w-4 h-4" />
              <span>Nova Correção</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Redações Corrigidas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Files className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Redações Corrigidas
            </span>
            <div className="text-2xl font-black text-slate-900">{total}</div>
          </div>
        </div>

        {/* Turmas Cadastradas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Turmas Cadastradas
            </span>
            <div className="text-2xl font-black text-slate-900">{turmasUnicas.length}</div>
          </div>
        </div>

        {/* Média Geral da Turma */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Média Geral da Turma
            </span>
            <div className="text-2xl font-black text-slate-900">
              {mediaGeral} <span className="text-xs font-bold text-slate-400">/ 1000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Médias das 5 Competências */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Médias por Competência (0 a 200 pontos)
            </h3>
            <p className="text-xs text-slate-500">
              Desempenho consolidado das redações avaliadas segundo os critérios oficiais do ENEM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* C1 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <span className="text-xs font-black text-slate-500 block">C1 • Norma Culta</span>
            <span className="text-2xl font-black text-brand-700 mt-1 block">{mediaC1}</span>
            <span className="text-[10px] text-slate-400">meta: 160+</span>
          </div>

          {/* C2 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <span className="text-xs font-black text-slate-500 block">C2 • Tema/Repertório</span>
            <span className="text-2xl font-black text-brand-700 mt-1 block">{mediaC2}</span>
            <span className="text-[10px] text-slate-400">meta: 160+</span>
          </div>

          {/* C3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <span className="text-xs font-black text-slate-500 block">C3 • Argumentação</span>
            <span className="text-2xl font-black text-brand-700 mt-1 block">{mediaC3}</span>
            <span className="text-[10px] text-slate-400">meta: 160+</span>
          </div>

          {/* C4 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <span className="text-xs font-black text-slate-500 block">C4 • Coesão</span>
            <span className="text-2xl font-black text-brand-700 mt-1 block">{mediaC4}</span>
            <span className="text-[10px] text-slate-400">meta: 160+</span>
          </div>

          {/* C5 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center col-span-2 sm:col-span-1">
            <span className="text-xs font-black text-slate-500 block">C5 • Intervenção</span>
            <span className="text-2xl font-black text-brand-700 mt-1 block">{mediaC5}</span>
            <span className="text-[10px] text-slate-400">meta: 160+</span>
          </div>
        </div>
      </div>

      {/* Quatro Botões Principais de Ação Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('nova-correcao')}
          className="bg-brand-700 hover:bg-brand-800 text-white p-6 rounded-2xl cursor-pointer shadow-md transition transform hover:-translate-y-0.5"
        >
          <FileEdit className="w-8 h-8 text-brand-200 mb-3" />
          <h4 className="font-extrabold text-base mb-1">NOVA CORREÇÃO</h4>
          <p className="text-xs text-brand-100">
            Fotografe a folha e avalie as 5 competências com auxílio da IA.
          </p>
        </div>

        <div
          onClick={() => onNavigate('redacoes')}
          className="bg-white hover:bg-slate-50 text-slate-800 p-6 rounded-2xl border border-slate-200 cursor-pointer shadow-sm transition transform hover:-translate-y-0.5"
        >
          <Files className="w-8 h-8 text-brand-600 mb-3" />
          <h4 className="font-extrabold text-base mb-1 text-slate-900">REDAÇÕES</h4>
          <p className="text-xs text-slate-500">
            Consulte, filtre e revise o histórico completo de notas da turma.
          </p>
        </div>

        <div
          onClick={() => onNavigate('planilha-turma')}
          className="bg-white hover:bg-slate-50 text-slate-800 p-6 rounded-2xl border border-slate-200 cursor-pointer shadow-sm transition transform hover:-translate-y-0.5"
        >
          <Table className="w-8 h-8 text-brand-600 mb-3" />
          <h4 className="font-extrabold text-base mb-1 text-slate-900">PLANILHA DA TURMA</h4>
          <p className="text-xs text-slate-500">
            Visualize em tempo real a tabela consolidada de notas oficiais.
          </p>
        </div>

        <div
          onClick={() => onNavigate('gerar-planilha')}
          className="bg-white hover:bg-slate-50 text-slate-800 p-6 rounded-2xl border border-slate-200 cursor-pointer shadow-sm transition transform hover:-translate-y-0.5"
        >
          <Download className="w-8 h-8 text-brand-600 mb-3" />
          <h4 className="font-extrabold text-base mb-1 text-slate-900">GERAR PLANILHA</h4>
          <p className="text-xs text-slate-500">
            Exporte o arquivo oficial .XLSX com duas abas e fórmulas prontas.
          </p>
        </div>
      </div>
    </div>
  );
};
