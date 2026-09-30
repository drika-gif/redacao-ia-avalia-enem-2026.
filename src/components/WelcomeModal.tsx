import React from 'react';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const passos = [
    'Cadastre ou informe seu IEMA Pleno.',
    'Escolha a turma correspondente.',
    'Informe o nome do estudante.',
    'Fotografe ou anexe a redação manuscrita.',
    'Confira e ajuste a transcrição do texto.',
    'Revise as 5 competências avaliadas pela IA.',
    'Confirme as notas oficiais atribuídas.',
    'Salve a correção no banco de dados.',
    'Ao finalizar a turma, gere e baixe a planilha oficial .XLSX.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 transform transition-all">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand-50 border border-brand-200 text-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            BEM-VINDA AO REDAÇÃO IA
          </h2>
          <p className="text-sm font-semibold text-brand-700 mt-1">
            Corretor Avalia ENEM 2026
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            "Da fotografia da redação à planilha final."
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Fluxo Simples em 9 Passos:
          </p>
          <ol className="space-y-2.5 text-xs text-slate-700">
            {passos.map((passo, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-bold text-[11px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="leading-snug">{passo}</span>
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition transform active:scale-[0.99]"
        >
          <span>COMEÇAR AGORA</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
