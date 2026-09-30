import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';
import { PossivelNotaZero } from '../types';

interface ZeroAlertModalProps {
  isOpen: boolean;
  zeroData: PossivelNotaZero | null;
  onConfirmZero: () => void;
  onContinueCorrection: () => void;
}

export const ZeroAlertModal: React.FC<ZeroAlertModalProps> = ({
  isOpen,
  zeroData,
  onConfirmZero,
  onContinueCorrection,
}) => {
  if (!isOpen || !zeroData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-red-200">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded">
              Alerta de Validação
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              POSSÍVEL NOTA ZERO
            </h3>
          </div>
        </div>

        <div className="space-y-3.5 mb-6 text-sm">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3.5">
            <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Motivo:</p>
            <p className="font-bold text-red-900 text-base mt-0.5">{zeroData.motivo}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Evidência Encontrada:</p>
            <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-1 font-mono text-xs">
              {zeroData.evidencia}
            </p>
          </div>

          {zeroData.trecho && (
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Trecho Relacionado:</p>
              <p className="text-slate-700 italic bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-1 text-xs">
                "{zeroData.trecho}"
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Explicação Técnica:</p>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
              {zeroData.explicacao}
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900 leading-relaxed flex items-start gap-2">
            <span>ℹ️</span>
            <span>
              <strong>Atenção:</strong> A decisão final é sempre soberana da professora. Se a redação tratar-se de desrespeito a Direitos Humanos, apenas a Competência V deve receber nota 0.
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onConfirmZero}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
          >
            CONFIRMAR NOTA ZERO
          </button>
          <button
            onClick={onContinueCorrection}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>CONTINUAR CORREÇÃO</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
