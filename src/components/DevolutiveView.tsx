import React from 'react';
import { DevolutivaPedagogica, Correcao } from '../types';
import { 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Bookmark, 
  FileCheck2 
} from 'lucide-react';

interface DevolutiveViewProps {
  correcao: Partial<Correcao>;
  devolutiva?: DevolutivaPedagogica;
}

export const DevolutiveView: React.FC<DevolutiveViewProps> = ({ correcao, devolutiva }) => {
  const handlePrint = () => {
    window.print();
  };

  const dev = devolutiva || {
    pontosFortes: ['Adequação ao gênero dissertativo-argumentativo.'],
    precisaMelhorar: ['Aprofundar repertório sociocultural.'],
    errosCategorizados: {
      ortografia: [],
      pontuacao: [],
      concordancia: [],
      estrutura: [],
      argumentacao: [],
      coesao: [],
      propostaDeIntervencao: [],
    },
    trechosParaRevisar: [],
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações Superior */}
      <div className="flex items-center justify-between no-print bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="font-extrabold text-slate-900 text-sm">
            Devolutiva Pedagógica & Ficha do Estudante
          </h4>
          <p className="text-xs text-slate-500">
            Orientações construtivas e diagnóstico por competência sem reescrita integral.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider border border-brand-200 transition flex items-center gap-1.5 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Ficha (A4)</span>
        </button>
      </div>

      {/* Container Imprimível */}
      <div id="printable-devolutiva" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Cabeçalho da Ficha */}
        <div className="border-b-2 border-brand-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-700">
              AVALIA ENEM 2026 • IEMA
            </span>
            <h3 className="text-xl font-black text-slate-900">
              FICHA DE DEVOLUTIVA PEDAGÓGICA DA REDAÇÃO
            </h3>
            <p className="text-xs text-slate-500">
              Coordenação de Avaliação e Inteligência Pedagógica
            </p>
          </div>
          <div className="text-left sm:text-right bg-brand-50 p-2.5 rounded-xl border border-brand-100">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Nota Final</span>
            <span className="text-2xl font-black text-brand-700">
              {correcao.nota_final || 0}
            </span>
            <span className="text-xs font-bold text-slate-500"> / 1000</span>
          </div>
        </div>

        {/* Dados do Estudante */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block font-bold text-[10px] uppercase">IEMA Pleno:</span>
            <span className="font-bold text-slate-800">{correcao.iema_pleno || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold text-[10px] uppercase">Turma:</span>
            <span className="font-bold text-slate-800">{correcao.turma || '—'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400 block font-bold text-[10px] uppercase">Estudante:</span>
            <span className="font-bold text-slate-900 text-sm">{correcao.nome_estudante || '—'}</span>
          </div>
          <div className="col-span-2 sm:col-span-4 mt-1 border-t border-slate-200 pt-1.5">
            <span className="text-slate-400 block font-bold text-[10px] uppercase">Tema da Redação:</span>
            <span className="font-semibold text-slate-800">{correcao.tema || '—'}</span>
          </div>
        </div>

        {/* Quadro Resumo das 5 Competências */}
        <div>
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Notas por Competência:
          </h5>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-500 text-[10px]">C1</span>
              <span className="text-base font-black text-brand-700">{correcao.c1_final}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-500 text-[10px]">C2</span>
              <span className="text-base font-black text-brand-700">{correcao.c2_final}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-500 text-[10px]">C3</span>
              <span className="text-base font-black text-brand-700">{correcao.c3_final}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-500 text-[10px]">C4</span>
              <span className="text-base font-black text-brand-700">{correcao.c4_final}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-500 text-[10px]">C5</span>
              <span className="text-base font-black text-brand-700">{correcao.c5_final}</span>
            </div>
          </div>
        </div>

        {/* Pontos Fortes e Precisa Melhorar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50/60 border border-green-200 rounded-xl p-4">
            <h5 className="font-extrabold text-green-900 text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <span>Pontos Fortes da Redação</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-green-950">
              {dev.pontosFortes.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
            <h5 className="font-extrabold text-blue-900 text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Oportunidades de Melhoria</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-blue-950">
              {dev.precisaMelhorar.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-brand-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Diagnóstico de Erros por Categoria */}
        <div>
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Diagnóstico Pedagógico por Categoria:
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {Object.entries(dev.errosCategorizados).map(([cat, itens]) => {
              if (!itens || itens.length === 0) return null;
              const nomesFormatados: Record<string, string> = {
                ortografia: 'Ortografia & Acentuação',
                pontuacao: 'Pontuação & Sintaxe',
                concordancia: 'Concordância & Regência',
                estrutura: 'Estrutura dos Parágrafos',
                argumentacao: 'Argumentação & Repertório',
                coesao: 'Coesão & Conectivos',
                propostaDeIntervencao: 'Proposta de Intervenção',
              };
              return (
                <div key={cat} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-800 text-[11px] block mb-1">
                    {nomesFormatados[cat] || cat}
                  </span>
                  <ul className="space-y-1 text-slate-600">
                    {itens.map((err, i) => (
                      <li key={i} className="text-[11px] leading-tight">
                        - {err}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trechos Selecionados para Revisar */}
        {dev.trechosParaRevisar.length > 0 && (
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Trechos para Revisar com o Estudante:
            </h5>
            <div className="space-y-2">
              {dev.trechosParaRevisar.map((tr, idx) => (
                <div key={idx} className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs">
                  <p className="font-serif italic text-slate-800">"{tr.original}"</p>
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[11px]">
                    <span className="text-red-700 font-semibold">Problema: {tr.problema}</span>
                    <span className="text-green-800 font-semibold">Orientação: {tr.orientacao}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observações da Professora */}
        {correcao.observacoes && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            <span className="font-bold text-slate-700 block uppercase tracking-wide mb-1">
              Observações Personalizadas da Professora:
            </span>
            <p className="text-slate-700 whitespace-pre-wrap">{correcao.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
