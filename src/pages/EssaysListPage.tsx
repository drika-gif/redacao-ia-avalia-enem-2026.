import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Correcao } from '../types';
import { DbService } from '../lib/db';
import { 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Edit3, 
  Files, 
  ArrowUpDown, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import { DevolutiveView } from '../components/DevolutiveView';

interface EssaysListPageProps {
  correcoes: Correcao[];
  onReload: () => void;
  onEdit: (c: Correcao) => void;
}

export const EssaysListPage: React.FC<EssaysListPageProps> = ({
  correcoes,
  onReload,
  onEdit,
}) => {
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('todas');
  const [viewingCorrecao, setViewingCorrecao] = useState<Correcao | null>(null);

  const turmas = Array.from(new Set(correcoes.map((c) => c.turma).filter(Boolean)));

  const filtradas = correcoes.filter((c) => {
    const matchTurma = turmaFiltro === 'todas' || c.turma === turmaFiltro;
    const matchBusca =
      !busca.trim() ||
      c.nome_estudante.toLowerCase().includes(busca.toLowerCase()) ||
      c.tema.toLowerCase().includes(busca.toLowerCase());
    return matchTurma && matchBusca;
  });

  const handleDelete = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a correção de "${nome}"? Esta ação não pode ser desfeita.`)) {
      await DbService.delete(id, user?.id || null);
      onReload();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabeçalho da Página */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
              Histórico de Avaliações
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              Redações Corrigidas
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consulte, filtre por turma e revise os registros detalhados das correções realizadas.
            </p>
          </div>
          <div className="bg-brand-50 border border-brand-100 px-4 py-2 rounded-2xl text-xs font-bold text-brand-900 text-center">
            Total: {filtradas.length} redações
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-100">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome do estudante ou tema..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <select
              value={turmaFiltro}
              onChange={(e) => setTurmaFiltro(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none appearance-none"
            >
              <option value="todas">Todas as Turmas ({turmas.length})</option>
              {turmas.map((t) => (
                <option key={t} value={t}>
                  Turma {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Redações */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {filtradas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Files className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma redação encontrada</p>
            <p className="text-xs text-slate-400 mt-1">
              Verifique os filtros selecionados ou cadastre uma nova correção.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Estudante</th>
                  <th className="py-3.5 px-3 text-center">Turma</th>
                  <th className="py-3.5 px-2 text-center">C1</th>
                  <th className="py-3.5 px-2 text-center">C2</th>
                  <th className="py-3.5 px-2 text-center">C3</th>
                  <th className="py-3.5 px-2 text-center">C4</th>
                  <th className="py-3.5 px-2 text-center">C5</th>
                  <th className="py-3.5 px-4 text-center">Nota Final</th>
                  <th className="py-3.5 px-4 text-center">Data</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{c.nome_estudante}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.tema}</div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                      {c.turma}
                    </td>
                    <td className="py-3.5 px-2 text-center text-slate-600 font-semibold">{c.c1_final}</td>
                    <td className="py-3.5 px-2 text-center text-slate-600 font-semibold">{c.c2_final}</td>
                    <td className="py-3.5 px-2 text-center text-slate-600 font-semibold">{c.c3_final}</td>
                    <td className="py-3.5 px-2 text-center text-slate-600 font-semibold">{c.c4_final}</td>
                    <td className="py-3.5 px-2 text-center text-slate-600 font-semibold">{c.c5_final}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block bg-brand-50 text-brand-800 font-black px-2.5 py-1 rounded-lg text-xs border border-brand-100">
                        {c.nota_final}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => setViewingCorrecao(c)}
                        className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                        title="Visualizar ficha e devolutiva"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(c)}
                        className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                        title="Editar notas"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.nome_estudante)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Excluir correção"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Visualização da Ficha Completa */}
      {viewingCorrecao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900">
                Visualização da Ficha de Correção
              </h3>
              <button
                onClick={() => setViewingCorrecao(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DevolutiveView
              correcao={viewingCorrecao}
              devolutiva={viewingCorrecao.relatorio_pedagogico}
            />

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingCorrecao(null)}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
