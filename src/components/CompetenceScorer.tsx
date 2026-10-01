import React from 'react';
import { 
  CompetenciaScore, 
  PONTUACOES_VALIDAS, 
  QuadroC5, 
  AnaliseCompetencia 
} from '../types';
import { 
  Check, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Layers, 
  FileCheck, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface CompetenceScorerProps {
  c1Sugerida: CompetenciaScore;
  c1Final: CompetenciaScore;
  c1Justificativa: string;
  c1Analise?: AnaliseCompetencia;
  onChangeC1: (val: CompetenciaScore) => void;

  c2Sugerida: CompetenciaScore;
  c2Final: CompetenciaScore;
  c2Justificativa: string;
  c2Analise?: AnaliseCompetencia;
  onChangeC2: (val: CompetenciaScore) => void;

  c3Sugerida: CompetenciaScore;
  c3Final: CompetenciaScore;
  c3Justificativa: string;
  c3Analise?: AnaliseCompetencia;
  onChangeC3: (val: CompetenciaScore) => void;

  c4Sugerida: CompetenciaScore;
  c4Final: CompetenciaScore;
  c4Justificativa: string;
  c4Analise?: AnaliseCompetencia;
  onChangeC4: (val: CompetenciaScore) => void;

  c5Sugerida: CompetenciaScore;
  c5Final: CompetenciaScore;
  c5Justificativa: string;
  c5Quadro?: QuadroC5;
  onChangeC5: (val: CompetenciaScore) => void;
}

export const CompetenceScorer: React.FC<CompetenceScorerProps> = ({
  c1Sugerida,
  c1Final,
  c1Justificativa,
  c1Analise,
  onChangeC1,

  c2Sugerida,
  c2Final,
  c2Justificativa,
  c2Analise,
  onChangeC2,

  c3Sugerida,
  c3Final,
  c3Justificativa,
  c3Analise,
  onChangeC3,

  c4Sugerida,
  c4Final,
  c4Justificativa,
  c4Analise,
  onChangeC4,

  c5Sugerida,
  c5Final,
  c5Justificativa,
  c5Quadro,
  onChangeC5,
}) => {
  const notaFinal = c1Final + c2Final + c3Final + c4Final + c5Final;

  const renderScoreButtons = (
    currentVal: CompetenciaScore,
    sugeridoVal: CompetenciaScore,
    onSelect: (val: CompetenciaScore) => void
  ) => {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {PONTUACOES_VALIDAS.map((pt) => {
          const isSelected = currentVal === pt;
          const isSugerido = sugeridoVal === pt;
          return (
            <button
              key={pt}
              type="button"
              onClick={() => onSelect(pt)}
              className={`flex-1 min-w-[50px] py-2 px-2 rounded-lg font-extrabold text-xs transition border relative ${
                isSelected
                  ? 'bg-brand-700 text-white border-brand-800 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{pt}</span>
              {isSugerido && !isSelected && (
                <span className="block text-[9px] font-normal text-brand-600 mt-0.5">
                  (sugerida)
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        As sugestões foram geradas pela IA Gemini. Confira os trechos e as justificativas
        de cada competência. A professora revisa e define a nota final.
      </p>
      {/* Placar de Pontuação Total em Tempo Real */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-800 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-brand-200 uppercase tracking-wider">
            Pontuação em revisão pela professora
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-black">{notaFinal}</span>
            <span className="text-lg font-bold text-brand-300">/ 1000 pontos</span>
          </div>
          <p className="text-xs text-brand-200 mt-1">
            Soma calculada: C1 ({c1Final}) + C2 ({c2Final}) + C3 ({c3Final}) + C4 ({c4Final}) + C5 ({c5Final})
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full font-bold border border-white/20">
            Escala ENEM: 0 a 200 por competência
          </span>
        </div>
      </div>

      {/* Competência I */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
              C1
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                DOMÍNIO DA MODALIDADE ESCRITA FORMAL
              </h4>
              <p className="text-xs text-slate-500">
                Ortografia, acentuação, concordância, regência, sintaxe, frases truncadas e justapostas.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Nota Confirmada:</span>
            <div className="text-xl font-black text-brand-700">{c1Final}</div>
          </div>
        </div>

        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <p className="font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-600" />
            Sugestão da IA Gemini: <span className="font-bold text-brand-700">{c1Sugerida}</span>
          </p>
          <p className="text-slate-600 mt-1">{c1Justificativa}</p>
        </div>

        <div className="mt-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Selecione a Nota Confirmada pela Professora:
          </label>
          {renderScoreButtons(c1Final, c1Sugerida, onChangeC1)}
        </div>
      </div>

      {/* Competência II */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
              C2
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                COMPREENSÃO DO TEMA E TIPOLOGIA TEXTUAL
              </h4>
              <p className="text-xs text-slate-500">
                Tema, texto dissertativo-argumentativo e repertório sociocultural (legitimação, pertinência e produtividade).
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Nota Confirmada:</span>
            <div className="text-xl font-black text-brand-700">{c2Final}</div>
          </div>
        </div>

        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <p className="font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-600" />
            Sugestão da IA Gemini: <span className="font-bold text-brand-700">{c2Sugerida}</span>
          </p>
          <p className="text-slate-600 mt-1">{c2Justificativa}</p>
        </div>

        <div className="mt-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Selecione a Nota Confirmada pela Professora:
          </label>
          {renderScoreButtons(c2Final, c2Sugerida, onChangeC2)}
        </div>
      </div>

      {/* Competência III */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
              C3
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                PROJETO DE TEXTO E ARGUMENTAÇÃO
              </h4>
              <p className="text-xs text-slate-500">
                Seleção, organização, coerência, interpretação de fatos e defesa de ponto de vista.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Nota Confirmada:</span>
            <div className="text-xl font-black text-brand-700">{c3Final}</div>
          </div>
        </div>

        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <p className="font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-600" />
            Sugestão da IA Gemini: <span className="font-bold text-brand-700">{c3Sugerida}</span>
          </p>
          <p className="text-slate-600 mt-1">{c3Justificativa}</p>
        </div>

        <div className="mt-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Selecione a Nota Confirmada pela Professora:
          </label>
          {renderScoreButtons(c3Final, c3Sugerida, onChangeC3)}
        </div>
      </div>

      {/* Competência IV */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
              C4
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                COESÃO E MECANISMOS LINGUÍSTICOS
              </h4>
              <p className="text-xs text-slate-500">
                Conectivos interparágrafos e intraparágrafos, pronomes, sinônimos e fluidez textual.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Nota Confirmada:</span>
            <div className="text-xl font-black text-brand-700">{c4Final}</div>
          </div>
        </div>

        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <p className="font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-600" />
            Sugestão da IA Gemini: <span className="font-bold text-brand-700">{c4Sugerida}</span>
          </p>
          <p className="text-slate-600 mt-1">{c4Justificativa}</p>
        </div>

        <div className="mt-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Selecione a Nota Confirmada pela Professora:
          </label>
          {renderScoreButtons(c4Final, c4Sugerida, onChangeC4)}
        </div>
      </div>

      {/* Competência V com Quadro dos 5 Elementos */}
      <div className="bg-white border-2 border-brand-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-700 text-white font-bold text-xs flex items-center justify-center">
              C5
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  PROPOSTA DE INTERVENÇÃO (5 ELEMENTOS)
                </h4>
                <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Oficial ENEM
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Agente, Ação, Modo/Meio, Efeito e Detalhamento. 5 elementos = 200; 4 = 160; 3 = 120; 2 = 80; 1 = 40; 0 = 0.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Nota Confirmada:</span>
            <div className="text-xl font-black text-brand-700">{c5Final}</div>
          </div>
        </div>

        {/* Quadro Visual dos 5 Elementos */}
        {c5Quadro && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Quadro de Análise dos 5 Elementos da Intervenção:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {/* 1. Agente */}
              <div className={`p-2.5 rounded-lg border ${c5Quadro.agente.encontrado ? 'bg-green-50 border-green-200 text-green-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{c5Quadro.agente.encontrado ? '✅' : '❌'}</span>
                  <span>1. AGENTE</span>
                </div>
                <p className="text-[10px] mt-1 line-clamp-2">
                  {c5Quadro.agente.encontrado ? `"${c5Quadro.agente.trecho}"` : 'Não identificado'}
                </p>
              </div>

              {/* 2. Ação */}
              <div className={`p-2.5 rounded-lg border ${c5Quadro.acao.encontrado ? 'bg-green-50 border-green-200 text-green-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{c5Quadro.acao.encontrado ? '✅' : '❌'}</span>
                  <span>2. AÇÃO</span>
                </div>
                <p className="text-[10px] mt-1 line-clamp-2">
                  {c5Quadro.acao.encontrado ? `"${c5Quadro.acao.trecho}"` : 'Não identificada'}
                </p>
              </div>

              {/* 3. Modo/Meio */}
              <div className={`p-2.5 rounded-lg border ${c5Quadro.modo.encontrado ? 'bg-green-50 border-green-200 text-green-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{c5Quadro.modo.encontrado ? '✅' : '❌'}</span>
                  <span>3. MODO/MEIO</span>
                </div>
                <p className="text-[10px] mt-1 line-clamp-2">
                  {c5Quadro.modo.encontrado ? `"${c5Quadro.modo.trecho}"` : 'Não identificado'}
                </p>
              </div>

              {/* 4. Efeito */}
              <div className={`p-2.5 rounded-lg border ${c5Quadro.efeito.encontrado ? 'bg-green-50 border-green-200 text-green-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{c5Quadro.efeito.encontrado ? '✅' : '❌'}</span>
                  <span>4. EFEITO</span>
                </div>
                <p className="text-[10px] mt-1 line-clamp-2">
                  {c5Quadro.efeito.encontrado ? `"${c5Quadro.efeito.trecho}"` : 'Não identificado'}
                </p>
              </div>

              {/* 5. Detalhamento */}
              <div className={`p-2.5 rounded-lg border ${c5Quadro.detalhamento.encontrado ? 'bg-green-50 border-green-200 text-green-900' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{c5Quadro.detalhamento.encontrado ? '✅' : '❌'}</span>
                  <span>5. DETALHAMENTO</span>
                </div>
                <p className="text-[10px] mt-1 line-clamp-2">
                  {c5Quadro.detalhamento.encontrado ? `"${c5Quadro.detalhamento.trecho}"` : 'Não identificado'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <p className="font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-600" />
            Sugestão da IA Gemini: <span className="font-bold text-brand-700">{c5Sugerida}</span>
          </p>
          <p className="text-slate-600 mt-1">{c5Justificativa}</p>
        </div>

        <div className="mt-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Selecione a Nota Confirmada pela Professora:
          </label>
          {renderScoreButtons(c5Final, c5Sugerida, onChangeC5)}
        </div>
      </div>
    </div>
  );
};
