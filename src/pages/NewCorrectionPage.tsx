import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Correcao, 
  ImagemFolha, 
  CompetenciaScore, 
  PossivelNotaZero, 
  QuadroC5, 
  AnaliseCompetencia, 
  DevolutivaPedagogica 
} from '../types';
import { analisarComIA } from '../lib/ai';
import { DbService } from '../lib/db';
import { ImageViewer } from '../components/ImageViewer';
import { TranscriptionView } from '../components/TranscriptionView';
import { ZeroAlertModal } from '../components/ZeroAlertModal';
import { CompetenceScorer } from '../components/CompetenceScorer';
import { DevolutiveView } from '../components/DevolutiveView';
import { 
  FileEdit, 
  Camera, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Save, 
  CheckSquare, 
  AlertTriangle 
} from 'lucide-react';

interface NewCorrectionPageProps {
  onSaved: () => void;
  initialData?: {
    iema?: string;
    turma?: string;
    tema?: string;
  };
}

export const NewCorrectionPage: React.FC<NewCorrectionPageProps> = ({ onSaved, initialData }) => {
  const { user } = useAuth();

  // Etapa atual: 1: Dados -> 2: Fotos -> 3: Transcrição (opcional) -> 4: Competências -> 5: Devolutiva e Salvar
  const [etapa, setEtapa] = useState<number>(1);

  // Dados do Cabeçalho
  const [iemaPleno, setIemaPleno] = useState(initialData?.iema || 'IEMA Pleno Santa Inês');
  const [turma, setTurma] = useState(initialData?.turma || '201');
  const [estudante, setEstudante] = useState('');
  const [tema, setTema] = useState(initialData?.tema || 'Desafios para a valorização de comunidades e povos tradicionais no Brasil');
  const [manterDados, setManterDados] = useState(true);

  // Mídias e Transcrição
  const [imagens, setImagens] = useState<ImagemFolha[]>([]);
  const [transcricao, setTranscricao] = useState('');
  const [limitacoesLeitura, setLimitacoesLeitura] = useState('');
  const [motivoNovaFoto, setMotivoNovaFoto] = useState('');
  const [showNovaFotoAviso, setShowNovaFotoAviso] = useState(false);
  const [mostrarTranscricaoNaRevisao, setMostrarTranscricaoNaRevisao] = useState(false);

  // Verificação de Nota Zero
  const [zeroData, setZeroData] = useState<PossivelNotaZero | null>(null);
  const [showZeroModal, setShowZeroModal] = useState(false);
  const [isNotaZeroConfirmada, setIsNotaZeroConfirmada] = useState(false);

  // Competências
  const [c1Sugerida, setC1Sugerida] = useState<CompetenciaScore>(160);
  const [c1Final, setC1Final] = useState<CompetenciaScore>(160);
  const [c1Justificativa, setC1Justificativa] = useState('');
  const [c1Analise, setC1Analise] = useState<AnaliseCompetencia>();

  const [c2Sugerida, setC2Sugerida] = useState<CompetenciaScore>(160);
  const [c2Final, setC2Final] = useState<CompetenciaScore>(160);
  const [c2Justificativa, setC2Justificativa] = useState('');
  const [c2Analise, setC2Analise] = useState<AnaliseCompetencia>();

  const [c3Sugerida, setC3Sugerida] = useState<CompetenciaScore>(160);
  const [c3Final, setC3Final] = useState<CompetenciaScore>(160);
  const [c3Justificativa, setC3Justificativa] = useState('');
  const [c3Analise, setC3Analise] = useState<AnaliseCompetencia>();

  const [c4Sugerida, setC4Sugerida] = useState<CompetenciaScore>(160);
  const [c4Final, setC4Final] = useState<CompetenciaScore>(160);
  const [c4Justificativa, setC4Justificativa] = useState('');
  const [c4Analise, setC4Analise] = useState<AnaliseCompetencia>();

  const [c5Sugerida, setC5Sugerida] = useState<CompetenciaScore>(160);
  const [c5Final, setC5Final] = useState<CompetenciaScore>(160);
  const [c5Justificativa, setC5Justificativa] = useState('');
  const [c5Quadro, setC5Quadro] = useState<QuadroC5>();

  // Devolutiva e Salvamento
  const [devolutiva, setDevolutiva] = useState<DevolutivaPedagogica>();
  const [observacoes, setObservacoes] = useState('');
  const [confirmouRevisao, setConfirmouRevisao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  const [analisando, setAnalisando] = useState(false);
  const [erroAnalise, setErroAnalise] = useState('');

  // 1. Avançar da etapa 1 (Dados) para etapa 2 (Fotos)
  const handleAvancarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iemaPleno.trim() || !turma.trim() || !estudante.trim() || !tema.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Prevenção de duplicidade
    const dup = await DbService.findDuplicate(iemaPleno, turma, estudante, user?.id || null);
    if (dup) {
      const resp = window.confirm(
        `O estudante "${estudante}" já possui correção registrada na turma ${turma} com nota ${dup.nota_final}. Deseja prosseguir com uma nova avaliação?`
      );
      if (!resp) return;
    }

    setEtapa(2);
  };

  // 2. Análise DIRETA PELA FOTO (sem exigir transcrição digitada prévia)
  const handleAnalisarDiretoPelaFoto = async () => {
    if (analisando || imagens.length === 0) return;
    setAnalisando(true);
    setErroAnalise('');
    setShowNovaFotoAviso(false);
    setMotivoNovaFoto('');
    setIsNotaZeroConfirmada(false);
    setConfirmouRevisao(false);

    try {
      const result = await analisarComIA({ tema, imagens });

      // Se a foto não permitir avaliação confiável por falta de nitidez
      if (result.precisaNovaFoto) {
        setMotivoNovaFoto(result.motivoNovaFoto || 'A foto da folha está ilegível ou borrada.');
        setShowNovaFotoAviso(true);
        setLimitacoesLeitura(result.limitacoesLeitura || result.motivoNovaFoto || '');
        return;
      }

      // Preenche transcrição gerada pelo Gemini a partir da foto
      if (result.transcricao) {
        setTranscricao(result.transcricao);
      }
      setLimitacoesLeitura(result.limitacoesLeitura || '');

      // Preenche as 5 competências
      setC1Sugerida(result.c1.sugerida); setC1Final(result.c1.sugerida);
      setC1Justificativa(result.c1.justificativa); setC1Analise(result.c1);

      setC2Sugerida(result.c2.sugerida); setC2Final(result.c2.sugerida);
      setC2Justificativa(result.c2.justificativa); setC2Analise(result.c2);

      setC3Sugerida(result.c3.sugerida); setC3Final(result.c3.sugerida);
      setC3Justificativa(result.c3.justificativa); setC3Analise(result.c3);

      setC4Sugerida(result.c4.sugerida); setC4Final(result.c4.sugerida);
      setC4Justificativa(result.c4.justificativa); setC4Analise(result.c4);

      setC5Sugerida(result.c5.sugerida); setC5Final(result.c5.sugerida);
      setC5Justificativa(result.c5.justificativa); setC5Quadro(result.c5.quadro);

      setDevolutiva(result.devolutiva);
      setZeroData(result.notaZero);

      if (result.notaZero?.isZeroRisk) {
        setShowZeroModal(true);
      } else {
        setEtapa(4); // Avança diretamente para a revisão das notas pela professora!
      }
    } catch (err) {
      setErroAnalise(err instanceof Error ? err.message : 'Não foi possível analisar a foto da redação. Tente novamente.');
    } finally {
      setAnalisando(false);
    }
  };

  // 3. Análise a partir da transcrição (fluxo manual opcional)
  const handleConfirmarTranscricao = async () => {
    if (analisando || !transcricao.trim()) return;
    setAnalisando(true);
    setErroAnalise('');
    setShowNovaFotoAviso(false);
    setIsNotaZeroConfirmada(false);
    setConfirmouRevisao(false);
    try {
      const result = await analisarComIA({ 
        tema, 
        transcricao, 
        imagens: imagens.length > 0 ? imagens : undefined 
      });

      if (result.precisaNovaFoto) {
        setMotivoNovaFoto(result.motivoNovaFoto || 'A foto da folha está ilegível ou borrada.');
        setShowNovaFotoAviso(true);
        return;
      }

      if (result.transcricao && !transcricao.trim()) {
        setTranscricao(result.transcricao);
      }
      setLimitacoesLeitura(result.limitacoesLeitura || '');

      setC1Sugerida(result.c1.sugerida); setC1Final(result.c1.sugerida);
      setC1Justificativa(result.c1.justificativa); setC1Analise(result.c1);
      setC2Sugerida(result.c2.sugerida); setC2Final(result.c2.sugerida);
      setC2Justificativa(result.c2.justificativa); setC2Analise(result.c2);
      setC3Sugerida(result.c3.sugerida); setC3Final(result.c3.sugerida);
      setC3Justificativa(result.c3.justificativa); setC3Analise(result.c3);
      setC4Sugerida(result.c4.sugerida); setC4Final(result.c4.sugerida);
      setC4Justificativa(result.c4.justificativa); setC4Analise(result.c4);
      setC5Sugerida(result.c5.sugerida); setC5Final(result.c5.sugerida);
      setC5Justificativa(result.c5.justificativa); setC5Quadro(result.c5.quadro);

      setDevolutiva(result.devolutiva);
      setZeroData(result.notaZero);
      if (result.notaZero?.isZeroRisk) setShowZeroModal(true);
      else setEtapa(4);
    } catch (err) {
      setErroAnalise(err instanceof Error ? err.message : 'Não foi possível analisar. Tente novamente.');
    } finally { 
      setAnalisando(false); 
    }
  };

  const handleConfirmarZero = () => {
    setShowZeroModal(false);
    setIsNotaZeroConfirmada(true);
    setC1Final(0); setC2Final(0); setC3Final(0); setC4Final(0); setC5Final(0);
    setEtapa(4);
  };

  const handleContinuarAposAlertaZero = () => {
    setShowZeroModal(false);
    setIsNotaZeroConfirmada(false);
    setEtapa(4);
  };

  // Salvar no Banco
  const handleSalvarCorrecao = async () => {
    if (!confirmouRevisao) {
      alert('Por favor, marque a caixa confirmando a revisão das notas antes de salvar.');
      return;
    }

    setSalvando(true);
    try {
      const nova: Partial<Correcao> = {
        iema_pleno: iemaPleno.trim(),
        turma: turma.trim(),
        nome_estudante: estudante.trim(),
        tema: tema.trim(),
        transcricao: transcricao || '[Redação avaliada diretamente pela foto]',
        c1_sugerida: c1Sugerida,
        c1_final: c1Final,
        c1_justificativa: c1Justificativa,
        c2_sugerida: c2Sugerida,
        c2_final: c2Final,
        c2_justificativa: c2Justificativa,
        c3_sugerida: c3Sugerida,
        c3_final: c3Final,
        c3_justificativa: c3Justificativa,
        c4_sugerida: c4Sugerida,
        c4_final: c4Final,
        c4_justificativa: c4Justificativa,
        c5_sugerida: c5Sugerida,
        c5_final: c5Final,
        c5_justificativa: c5Justificativa,
        nota_zero: isNotaZeroConfirmada,
        motivo_nota_zero: isNotaZeroConfirmada ? zeroData?.motivo : '',
        relatorio_pedagogico: devolutiva,
        observacoes,
      };

      await DbService.save(nova as Correcao, user?.id || null);
      setSalvoComSucesso(true);
    } catch (err: any) {
      alert(`Falha ao salvar correção: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  // Corrigir Próxima Redação
  const handleCorrigirProxima = () => {
    setEstudante('');
    setImagens([]);
    setTranscricao('');
    setLimitacoesLeitura('');
    setMotivoNovaFoto('');
    setShowNovaFotoAviso(false);
    setZeroData(null);
    setIsNotaZeroConfirmada(false);
    setDevolutiva(undefined);
    setObservacoes('');
    setConfirmouRevisao(false);
    setSalvoComSucesso(false);

    if (!manterDados) {
      setIemaPleno('');
      setTurma('');
      setTema('');
    }

    setEtapa(1);
    onSaved();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Barra de Progresso das Etapas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 overflow-x-auto no-scrollbar gap-4">
          <div className={`flex items-center gap-1.5 ${etapa >= 1 ? 'text-brand-700 font-extrabold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa >= 1 ? 'bg-brand-700 text-white' : 'bg-slate-200'}`}>1</span>
            <span>Identificação</span>
          </div>
          <span>➔</span>
          <div className={`flex items-center gap-1.5 ${etapa >= 2 ? 'text-brand-700 font-extrabold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa >= 2 ? 'bg-brand-700 text-white' : 'bg-slate-200'}`}>2</span>
            <span>Foto da Redação</span>
          </div>
          <span>➔</span>
          <div className={`flex items-center gap-1.5 ${etapa === 3 ? 'text-amber-700 font-extrabold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa === 3 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>*</span>
            <span className="text-[11px]">Transcrição (Opcional)</span>
          </div>
          <span>➔</span>
          <div className={`flex items-center gap-1.5 ${etapa >= 4 ? 'text-brand-700 font-extrabold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa >= 4 ? 'bg-brand-700 text-white' : 'bg-slate-200'}`}>3</span>
            <span>Competências</span>
          </div>
          <span>➔</span>
          <div className={`flex items-center gap-1.5 ${etapa >= 5 ? 'text-brand-700 font-extrabold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa >= 5 ? 'bg-brand-700 text-white' : 'bg-slate-200'}`}>4</span>
            <span>Devolutiva & Salvar</span>
          </div>
        </div>
      </div>

      {/* TELA DE SUCESSO APÓS SALVAMENTO */}
      {salvoComSucesso ? (
        <div className="bg-white border-2 border-green-200 rounded-3xl p-8 sm:p-12 text-center shadow-lg animate-fadeIn">
          <div className="w-16 h-16 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            CORREÇÃO SALVA COM SUCESSO!
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            A redação de <strong>{estudante}</strong> ({turma} - {iemaPleno}) com nota final{' '}
            <strong>{c1Final + c2Final + c3Final + c4Final + c5Final} pontos</strong> foi registrada com sucesso.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button
              onClick={handleCorrigirProxima}
              className="bg-brand-700 hover:bg-brand-800 text-white font-extrabold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
            >
              <span>CORRIGIR PRÓXIMA REDAÇÃO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ==========================================
              ETAPA 1: IDENTIFICAÇÃO E DADOS DA REDAÇÃO
              ========================================== */}
          {etapa === 1 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-black text-slate-900">
                  Nova Correção • Identificação do Estudante
                </h3>
                <p className="text-xs text-slate-500">
                  Informe os dados da turma e do estudante para vincular à planilha oficial.
                </p>
              </div>

              <form onSubmit={handleAvancarDados} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      IEMA PLENO: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={iemaPleno}
                      onChange={(e) => setIemaPleno(e.target.value)}
                      placeholder="Ex: IEMA Pleno Santa Inês"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      TURMA: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={turma}
                      onChange={(e) => setTurma(e.target.value)}
                      placeholder="Ex: 201"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    NOME DO ESTUDANTE: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={estudante}
                    onChange={(e) => setEstudante(e.target.value)}
                    placeholder="Nome completo do estudante"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    TEMA DA REDAÇÃO: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                    placeholder="Ex: Desafios para a valorização de comunidades e povos tradicionais no Brasil"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={manterDados}
                      onChange={(e) => setManterDados(e.target.checked)}
                      className="w-4 h-4 text-brand-700 rounded border-slate-300 focus:ring-brand-600"
                    />
                    <span>Manter IEMA Pleno, turma e tema para a próxima redação.</span>
                  </label>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-brand-700 hover:bg-brand-800 text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2"
                  >
                    <span>CONTINUAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==========================================
              ETAPA 2: FOTO DA REDAÇÃO (ANÁLISE DIRETA)
              ========================================== */}
          {etapa === 2 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Foto da Redação • {estudante} ({turma})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tire uma foto com o celular ou anexe o arquivo da folha de redação. A IA analisará diretamente a partir da imagem!
                  </p>
                </div>
              </div>

              {/* Alerta de Foto Ilegível / Baixa Nitidez */}
              {showNovaFotoAviso && (
                <div role="alert" className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-950 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span>Atenção: A foto enviada não permitiu uma avaliação confiável</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {motivoNovaFoto || 'A imagem está excessivamente borrada, cortada ou escura para permitir a leitura justa dos parágrafos.'}
                  </p>
                  <p className="text-[11px] font-semibold text-amber-900">
                    Nenhuma nota foi penalizada. Por favor, tire outra foto mais nítida, com boa iluminação e enquadrando a folha inteira antes de sugerir notas.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNovaFotoAviso(false)}
                      className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                    >
                      Entendido, vou capturar outra foto
                    </button>
                  </div>
                </div>
              )}

              {/* Mensagem de Erro Geral */}
              {erroAnalise && (
                <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{erroAnalise}</span>
                </div>
              )}

              {/* Mensagem de Carregamento da IA */}
              {analisando && (
                <div role="status" className="p-4 sm:p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2 animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
                    <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
                    <span>Lendo caligrafia e analisando redação diretamente pela foto...</span>
                  </div>
                  <p className="text-blue-800">
                    O Gemini está transcrevendo o manuscrito e avaliando as 5 competências do ENEM 2026. Isso pode levar alguns segundos.
                  </p>
                </div>
              )}

              <ImageViewer
                imagens={imagens}
                onAddImages={(novas) => {
                  setImagens([...imagens, ...novas]);
                  setShowNovaFotoAviso(false);
                  setErroAnalise('');
                }}
                onUpdateImage={(idx, att) => {
                  const copy = [...imagens];
                  copy[idx] = att;
                  setImagens(copy);
                }}
                onRemoveImage={(idx) => {
                  setImagens(imagens.filter((_, i) => i !== idx));
                }}
              />

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={analisando}
                  onClick={() => setEtapa(1)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar aos Dados</span>
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  {/* Opção para quem preferir transcrição manual */}
                  <button
                    type="button"
                    disabled={analisando}
                    onClick={() => setEtapa(3)}
                    className="text-xs font-bold text-slate-500 hover:text-brand-700 underline py-2 transition"
                  >
                    Transcrição manual / OCR local (opcional)
                  </button>

                  {/* Botão Principal de Análise Direta pela Foto */}
                  <button
                    type="button"
                    onClick={handleAnalisarDiretoPelaFoto}
                    disabled={analisando || imagens.length === 0}
                    className="bg-brand-700 hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{analisando ? 'Analisando Foto com IA...' : 'ANALISAR REDAÇÃO PELA FOTO COM IA'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              ETAPA 3: TRANSCRIÇÃO (OPCIONAL / MANUAL)
              ========================================== */}
          {etapa === 3 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900">
                  Transcrição da Redação (Opcional) • {estudante} ({turma})
                </h3>
                <p className="text-xs text-slate-500">
                  Caso deseje, você pode digitar, colar ou ajustar o texto antes de enviar para a análise da IA.
                </p>
              </div>

              <TranscriptionView
                imagens={imagens}
                transcricao={transcricao}
                onChangeTranscricao={setTranscricao}
                onConfirm={handleConfirmarTranscricao}
                busy={analisando}
                error={erroAnalise}
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  disabled={analisando}
                  onClick={() => setEtapa(2)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar às Fotos</span>
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              ETAPA 4: AVALIAÇÃO DAS 5 COMPETÊNCIAS
              ========================================== */}
          {etapa === 4 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Avaliação das 5 Competências • {estudante}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Revise as notas sugeridas pela IA Gemini e confirme sua avaliação. A professora tem total autonomia para ajustar as notas.
                  </p>
                </div>
                <div className="bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-800">
                  Turma: {turma} • {iemaPleno}
                </div>
              </div>

              {/* Observações de Limitações de Leitura / Nitidez */}
              {limitacoesLeitura && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Observações de leitura da imagem:</p>
                    <p className="mt-0.5 text-amber-800">{limitacoesLeitura}</p>
                    <p className="mt-1 text-[11px] text-amber-700 italic">
                      A aluna não foi penalizada nas competências por eventuais limitações de nitidez ou trechos ilegíveis da foto.
                    </p>
                  </div>
                </div>
              )}

              {/* Visualizador / Editor expansível da Transcrição lida pela IA */}
              {transcricao && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                  <button
                    type="button"
                    onClick={() => setMostrarTranscricaoNaRevisao(!mostrarTranscricaoNaRevisao)}
                    className="w-full flex items-center justify-between text-left font-bold text-slate-800 hover:text-brand-700 transition"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600" />
                      <span>Texto Transcrito da Redação pela IA {mostrarTranscricaoNaRevisao ? '(Ocultar)' : '(Visualizar / Ajustar)'}</span>
                    </span>
                    <span className="text-slate-400 font-normal">{mostrarTranscricaoNaRevisao ? '▲' : '▼'}</span>
                  </button>
                  {mostrarTranscricaoNaRevisao && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <p className="text-[11px] text-slate-500">
                        Você pode conferir ou ajustar o texto transcrito pela IA. Trechos ilegíveis foram sinalizados com <code>[trecho ilegível]</code>.
                      </p>
                      <textarea
                        rows={6}
                        value={transcricao}
                        onChange={(e) => setTranscricao(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <CompetenceScorer
                c1Sugerida={c1Sugerida}
                c1Final={c1Final}
                c1Justificativa={c1Justificativa}
                c1Analise={c1Analise}
                onChangeC1={setC1Final}

                c2Sugerida={c2Sugerida}
                c2Final={c2Final}
                c2Justificativa={c2Justificativa}
                c2Analise={c2Analise}
                onChangeC2={setC2Final}

                c3Sugerida={c3Sugerida}
                c3Final={c3Final}
                c3Justificativa={c3Justificativa}
                c3Analise={c3Analise}
                onChangeC3={setC3Final}

                c4Sugerida={c4Sugerida}
                c4Final={c4Final}
                c4Justificativa={c4Justificativa}
                c4Analise={c4Analise}
                onChangeC4={setC4Final}

                c5Sugerida={c5Sugerida}
                c5Final={c5Final}
                c5Justificativa={c5Justificativa}
                c5Quadro={c5Quadro}
                onChangeC5={setC5Final}
              />

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEtapa(2)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar às Fotos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEtapa(5)}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2"
                >
                  <span>AVANÇAR PARA DEVOLUTIVA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              ETAPA 5: DEVOLUTIVA E CONFIRMAÇÃO FINAL
              ========================================== */}
          {etapa === 5 && (
            <div className="space-y-6">
              <DevolutiveView
                correcao={{
                  iema_pleno: iemaPleno,
                  turma,
                  nome_estudante: estudante,
                  tema,
                  c1_final: c1Final,
                  c2_final: c2Final,
                  c3_final: c3Final,
                  c4_final: c4Final,
                  c5_final: c5Final,
                  nota_final: c1Final + c2Final + c3Final + c4Final + c5Final,
                  observacoes,
                }}
                devolutiva={devolutiva}
              />

              {/* Bloco de Confirmação e Salvamento */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 no-print">
                <h4 className="text-base font-extrabold text-slate-900">
                  Confirmação e Salvamento da Correção
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Observações Pedagógicas Adicionais (Opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione recomendações personalizadas para o estudante..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>

                <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmouRevisao}
                      onChange={(e) => setConfirmouRevisao(e.target.checked)}
                      className="w-5 h-5 text-brand-700 rounded border-slate-300 focus:ring-brand-600 mt-0.5"
                    />
                    <div className="text-xs text-brand-950">
                      <span className="font-extrabold block text-sm">
                        "Revisei as notas e confirmo esta correção."
                      </span>
                      <span>
                        A nota registrada no banco de dados e na planilha será a nota confirmada por você:{' '}
                        <strong>{c1Final + c2Final + c3Final + c4Final + c5Final} pontos</strong>.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapa(4)}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Revisar Notas</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSalvarCorrecao}
                    disabled={salvando || !confirmouRevisao}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{salvando ? 'Salvando no Banco...' : 'CONFIRMAR E SALVAR'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Alerta de Possível Nota Zero */}
      <ZeroAlertModal
        isOpen={showZeroModal}
        zeroData={zeroData}
        onConfirmZero={handleConfirmarZero}
        onContinueCorrection={handleContinuarAposAlertaZero}
      />
    </div>
  );
};
