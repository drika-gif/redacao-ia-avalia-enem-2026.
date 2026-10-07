import React from 'react';
import { X, Info, Sparkles, ShieldCheck } from 'lucide-react';
import { AUTHORSHIP } from '../constants/authorship';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Info className="w-6 h-6 text-brand-700" />
          </div>
          <div>
            <h3 id="about-modal-title" className="text-lg font-black text-slate-900 tracking-tight">
              {AUTHORSHIP.aboutTitle}
            </h3>
            <p className="text-xs font-semibold text-brand-700">
              {AUTHORSHIP.appName} • {AUTHORSHIP.appSubtitle}
            </p>
          </div>
        </div>

        {/* Conteúdo Principal de Autoria e Finalidade */}
        <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="font-medium text-slate-800">
            {AUTHORSHIP.aboutText}
          </p>
          <div className="border-t border-slate-200/80 pt-3 flex items-start gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
            <p>
              {AUTHORSHIP.institutionClarification}
            </p>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <span>{AUTHORSHIP.copyright}</span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
