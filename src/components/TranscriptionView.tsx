import React, { useState } from 'react';
import { ImagemFolha } from '../types';
import { Sparkles, Edit3, CheckCircle2, RotateCw, ZoomIn, FileText, AlertCircle } from 'lucide-react';

interface TranscriptionViewProps {
  imagens: ImagemFolha[];
  transcricao: string;
  onChangeTranscricao: (texto: string) => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  imagens,
  transcricao,
  onChangeTranscricao,
  onConfirm,
  busy = false,
  error = '',
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>('');

  const currentImg = imagens[activeImageIndex];

  // OCR Gratuito com Tesseract.js via CDN sob demanda (evita dependências pesadas no bundle)
  const executarOcrGratuito = async () => {
    if (!currentImg) {
      alert('Nenhuma imagem disponível para leitura.');
      return;
    }

    setIsOcrLoading(true);
    setOcrProgress('Carregando motor OCR...');

    try {
      // Carrega Tesseract dinamicamente se necessário
      let tesseractObj = (window as any).Tesseract;
      if (!tesseractObj) {
        setOcrProgress('Baixando biblioteca OCR...');
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Falha ao carregar Tesseract'));
          document.head.appendChild(s);
        });
        tesseractObj = (window as any).Tesseract;
      }

      setOcrProgress('Reconhecendo manuscrito...');
      const worker = await tesseractObj.createWorker('por');
      const ret = await worker.recognize(currentImg.dataUrl);
      await worker.terminate();

      const textoReconhecido = (ret.data.text || '').trim();
      if (textoReconhecido) {
        onChangeTranscricao(
          transcricao ? `${transcricao}\n\n${textoReconhecido}` : textoReconhecido
        );
      } else {
        alert('Nenhum texto pôde ser reconhecido automaticamente. Você pode digitar ou colar diretamente.');
      }
    } catch (err: any) {
      console.warn('Erro no OCR:', err);
      alert('Não foi possível ler o manuscrito automaticamente nesta imagem. Por favor, digite ou cole a transcrição.');
    } finally {
      setIsOcrLoading(false);
      setOcrProgress('');
    }
  };

  const inserirTrechoIlegivel = () => {
    const trecho = ' [trecho ilegível] ';
    onChangeTranscricao(transcricao + trecho);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Ao confirmar, o texto e o tema serão enviados ao Gemini para sugerir notas. Revise a transcrição antes de continuar.</p>
      {error && <p role="alert" className="p-3 rounded-xl bg-red-50 text-red-700">{error}</p>}
      {busy && <p role="status" className="p-3 rounded-xl bg-blue-50 text-blue-700">Analisando com IA. Aguarde, isso pode levar até um minuto.</p>}
      {/* Botões superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={executarOcrGratuito}
            disabled={busy || isOcrLoading || imagens.length === 0}
            className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 border border-brand-200 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isOcrLoading ? (ocrProgress || 'Processando...') : 'Tentar Reconhecimento Automático'}</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={inserirTrechoIlegivel}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition"
            title="Inserir marcação padrão [trecho ilegível]"
          >
            <span>+ [trecho ilegível]</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          {transcricao.split(/\s+/).filter(Boolean).length} palavras digitadas
        </span>
      </div>

      {/* Grid Principal: Lado a Lado no Computador, Vertical no Celular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Painel Esquerdo / Superior: Imagem da Redação */}
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col h-[480px]">
          <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-white">
            <span className="font-semibold">Folha da Redação</span>
            {imagens.length > 1 && (
              <div className="flex gap-1">
                {imagens.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      activeImageIndex === i ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Pág. {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-3">
            {currentImg ? (
              <img
                src={currentImg.dataUrl}
                alt="Folha da Redação"
                style={{
                  transform: `rotate(${currentImg.rotation}deg)`,
                  transition: 'transform 0.2s',
                }}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p className="text-xs text-slate-400">Nenhuma imagem carregada</p>
            )}
          </div>
        </div>

        {/* Painel Direito / Inferior: Transcrição Totalmente Editável */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[480px] shadow-sm">
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
            <span className="font-bold flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-brand-600" />
              <span>Transcrição da Redação (Editável)</span>
            </span>
            <span className="text-[11px] text-slate-500">Nunca inventar palavras</span>
          </div>

          <div className="flex-1 p-3 flex flex-col">
            <textarea
              disabled={busy}
              value={transcricao}
              onChange={(e) => onChangeTranscricao(e.target.value)}
              placeholder="Digite, cole ou ajuste a transcrição da redação aqui...&#10;&#10;Dica: Divida em parágrafos exatamente como o estudante escreveu na folha de resposta."
              className="w-full flex-1 resize-none border-0 focus:ring-0 p-0 text-sm leading-relaxed text-slate-800 font-sans focus:outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>A análise começa após a confirmação.</span>
            </div>

            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || isOcrLoading || !transcricao.replace(/\[trecho ilegível\]/gi, '').trim()}
              className="bg-brand-700 hover:bg-brand-800 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{busy ? 'Analisando...' : 'Confirmar e analisar com IA'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
