import React, { useState } from 'react';
import { Correcao } from '../types';
import { ExcelOficialGenerator } from '../lib/excel';
import { 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Sparkles, 
  Table, 
  School, 
  Users 
} from 'lucide-react';

interface GenerateSpreadsheetPageProps {
  correcoes: Correcao[];
}

export const GenerateSpreadsheetPage: React.FC<GenerateSpreadsheetPageProps> = ({
  correcoes,
}) => {
  const turmas = Array.from(new Set(correcoes.map((c) => c.turma).filter(Boolean)));
  const [selectedTurma, setSelectedTurma] = useState<string>(turmas[0] || 'todas');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadConcluido, setDownloadConcluido] = useState(false);

  const filtradas = correcoes.filter((c) => {
    if (selectedTurma === 'todas') return true;
    return c.turma === selectedTurma;
  });

  const totalEstudantes = filtradas.length;
  const mediaGeral =
    totalEstudantes > 0
      ? Math.round(filtradas.reduce((a, b) => a + (Number(b.nota_final) || 0), 0) / totalEstudantes)
      : 0;
  const currentIema = filtradas[0]?.iema_pleno || 'IEMA Pleno Santa Inês';

  const handleDownloadXlsx = async () => {
    if (filtradas.length === 0) {
      alert('Não há redações corrigidas para exportar nesta seleção.');
      return;
    }

    setIsExporting(true);
    setDownloadConcluido(false);

    try {
      const { blob, filename } = await ExcelOficialGenerator.gerarPlanilhaOficial(
        filtradas,
        currentIema,
        selectedTurma !== 'todas' ? selectedTurma : 'COMPLETA'
      );

      ExcelOficialGenerator.downloadBlob(blob, filename);
      setDownloadConcluido(true);
    } catch (err: any) {
      alert(`Falha ao gerar o arquivo Excel: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
              Exportação Oficial • AVALIA ENEM 2026
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              Gerar Planilha Oficial de Notas (.XLSX)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gera internamente o arquivo Excel oficial com duas abas (Planilha1 e Planilha2) e fórmulas automáticas.
            </p>
          </div>
        </div>

        {/* Seletor de Escopo */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase">
            Selecionar Escopo de Exportação:
          </label>
          <select
            value={selectedTurma}
            onChange={(e) => {
              setSelectedTurma(e.target.value);
              setDownloadConcluido(false);
            }}
            className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            {turmas.map((t) => (
              <option key={t} value={t}>
                Gerar Planilha da Turma {t}
              </option>
            ))}
            <option value="todas">Gerar Planilha Completa (Todas as Turmas)</option>
          </select>
        </div>
      </div>

      {/* Painel de Conferência Obrigatório antes do Download */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-700" />
            <span>Dados de Conferência da Planilha Oficial</span>
          </h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Modelo Oficial IEMA 2026
          </span>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">IEMA Pleno</span>
            <span className="text-sm font-black text-slate-900 truncate block mt-0.5">
              {currentIema}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Turma</span>
            <span className="text-sm font-black text-slate-900 block mt-0.5">
              {selectedTurma === 'todas' ? 'Todas as Turmas' : selectedTurma}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Qtd. de Estudantes</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">
              {totalEstudantes}
            </span>
          </div>

          <div className="p-4 bg-brand-50 border border-brand-100 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-brand-700 block">Média Geral</span>
            <span className="text-2xl font-black text-brand-800 block mt-0.5">
              {mediaGeral} <span className="text-xs text-brand-600">/ 1000</span>
            </span>
          </div>
        </div>

        {/* Tabela de Conferência Rápida */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
            Prévia dos Estudantes Inclusos na Linha 6 em diante:
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">Estudante</th>
                  <th className="py-2.5 px-2 text-center">Turma</th>
                  <th className="py-2.5 px-2 text-center">C1</th>
                  <th className="py-2.5 px-2 text-center">C2</th>
                  <th className="py-2.5 px-2 text-center">C3</th>
                  <th className="py-2.5 px-2 text-center">C4</th>
                  <th className="py-2.5 px-2 text-center">C5</th>
                  <th className="py-2.5 px-4 text-center">Nota Final (=SUM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtradas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{c.nome_estudante}</td>
                    <td className="py-2.5 px-2 text-center">{c.turma}</td>
                    <td className="py-2.5 px-2 text-center">{c.c1_final}</td>
                    <td className="py-2.5 px-2 text-center">{c.c2_final}</td>
                    <td className="py-2.5 px-2 text-center">{c.c3_final}</td>
                    <td className="py-2.5 px-2 text-center">{c.c4_final}</td>
                    <td className="py-2.5 px-2 text-center">{c.c5_final}</td>
                    <td className="py-2.5 px-4 text-center font-black text-brand-700">
                      {c.nota_final}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botão de Download */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {downloadConcluido ? (
              <span className="text-green-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Arquivo .XLSX gerado e baixado com sucesso!</span>
              </span>
            ) : (
              <span>O arquivo gerado conterá as duas abas oficiais: Planilha1 e Planilha2.</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadXlsx}
            disabled={isExporting || totalEstudantes === 0}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Gerando Planilha...' : 'BAIXAR PLANILHA .XLSX'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
