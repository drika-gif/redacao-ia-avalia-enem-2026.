import React, { useState } from 'react';
import { Correcao } from '../types';
import { Table, Filter, Download, GraduationCap } from 'lucide-react';

interface ClassSpreadsheetPageProps {
  correcoes: Correcao[];
  onExport: () => void;
}

export const ClassSpreadsheetPage: React.FC<ClassSpreadsheetPageProps> = ({
  correcoes,
  onExport,
}) => {
  const turmas = Array.from(new Set(correcoes.map((c) => c.turma).filter(Boolean)));
  const [selectedTurma, setSelectedTurma] = useState<string>(turmas[0] || 'todas');

  const filtradas = correcoes.filter((c) => {
    if (selectedTurma === 'todas') return true;
    return c.turma === selectedTurma;
  });

  const mediaTurma =
    filtradas.length > 0
      ? Math.round(filtradas.reduce((a, b) => a + (Number(b.nota_final) || 0), 0) / filtradas.length)
      : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
              Visualização Consolidada
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              Planilha da Turma • Avalia ENEM 2026
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Estrutura idêntica à planilha oficial da Coordenação de Avaliação e Inteligência Pedagógica.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="bg-brand-700 hover:bg-brand-800 text-white font-extrabold px-5 py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Gerar Arquivo .XLSX</span>
            </button>
          </div>
        </div>

        {/* Filtro por Turma e Indicadores */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="todas">Todas as Turmas Cadastradas</option>
              {turmas.map((t) => (
                <option key={t} value={t}>
                  Turma {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <span>
              Estudantes listados: <strong className="text-slate-900">{filtradas.length}</strong>
            </span>
            <span>•</span>
            <span>
              Média da Turma: <strong className="text-brand-700">{mediaTurma} / 1000</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tabela no Padrão Oficial */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="bg-brand-900 text-white p-4 text-center">
          <h3 className="font-black text-sm tracking-wider uppercase">
            PLANILHA DE NOTAS DA REDAÇÃO AVALIA - IEMA - 2026
          </h3>
          <p className="text-[11px] text-brand-200 font-semibold mt-0.5">
            COORDENAÇÃO DE AVALIAÇÃO E INTELIGÊNCIA PEDAGÓGICA
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-brand-800 text-white font-extrabold uppercase text-[11px] border-b border-brand-700">
                <th className="py-3 px-4">IEMA PLENO</th>
                <th className="py-3 px-3 text-center">TURMA</th>
                <th className="py-3 px-6">NOME DO ESTUDANTE</th>
                <th className="py-3 px-3 text-center">COMPETÊNCIA I</th>
                <th className="py-3 px-3 text-center">COMPETÊNCIA II</th>
                <th className="py-3 px-3 text-center">COMPETÊNCIA III</th>
                <th className="py-3 px-3 text-center">COMPETÊNCIA IV</th>
                <th className="py-3 px-3 text-center">COMPETÊNCIA V</th>
                <th className="py-3 px-4 text-center">NOTA FINAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhum estudante registrado nesta turma.
                  </td>
                </tr>
              ) : (
                filtradas.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60'}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.iema_pleno}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{item.turma}</td>
                    <td className="py-3 px-6 font-bold text-slate-900">{item.nome_estudante}</td>
                    <td className="py-3 px-3 text-center">{item.c1_final}</td>
                    <td className="py-3 px-3 text-center">{item.c2_final}</td>
                    <td className="py-3 px-3 text-center">{item.c3_final}</td>
                    <td className="py-3 px-3 text-center">{item.c4_final}</td>
                    <td className="py-3 px-3 text-center">{item.c5_final}</td>
                    <td className="py-3 px-4 text-center font-black text-brand-700 bg-brand-50/40">
                      {item.nota_final}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
