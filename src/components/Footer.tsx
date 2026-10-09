import React from 'react';
import { Info, Download } from 'lucide-react';
import { AUTHORSHIP } from '../constants/authorship';
import { usePwa } from '../context/PwaContext';

interface FooterProps {
  onOpenAbout?: () => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAbout, className = '' }) => {
  const { isInstallable, promptInstall } = usePwa();

  return (
    <footer className={`w-full py-6 px-4 mt-auto border-t border-slate-200 bg-white text-slate-700 no-print ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-bold text-slate-800">
            {AUTHORSHIP.createdAndDevelopedBy}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
            {AUTHORSHIP.copyright}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          {isInstallable && (
            <button
              type="button"
              onClick={promptInstall}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl transition shadow-xs"
              title="Instalar aplicativo Redação IA no dispositivo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar aplicativo</span>
            </button>
          )}

          {onOpenAbout && (
            <button
              type="button"
              onClick={onOpenAbout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl transition shadow-xs"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Sobre o aplicativo</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
