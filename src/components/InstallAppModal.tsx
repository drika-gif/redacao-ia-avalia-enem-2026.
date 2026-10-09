import React from 'react';
import { X, Download, Share, PlusSquare, Monitor, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePwa } from '../context/PwaContext';

export const InstallAppModal: React.FC = () => {
  const { 
    isInstallModalOpen, 
    closeInstallModal, 
    canInstallDirectly, 
    promptInstall, 
    isIos, 
    isInstalled 
  } = usePwa();

  if (!isInstallModalOpen || isInstalled) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={closeInstallModal}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={closeInstallModal}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3.5 pr-8">
          <img 
            src="/icons/icon-192.png" 
            alt="Ícone Redação IA" 
            className="w-14 h-14 rounded-2xl shadow-md border border-brand-200 object-cover flex-shrink-0" 
          />
          <div>
            <h3 id="install-modal-title" className="text-lg font-black text-slate-900 tracking-tight">
              Instalar Redação IA
            </h3>
            <p className="text-xs font-semibold text-brand-700">
              Professora Adriana Aguiar
            </p>
          </div>
        </div>

        {/* Cenário 1: Navegador com instalação direta (Chrome, Edge, Android) */}
        {canInstallDirectly ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Instale o aplicativo no seu computador ou celular para acessar mais rápido diretamente da sua área de trabalho ou tela de início, em modo de tela cheia.
            </p>

            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2 font-bold text-brand-800">
                <CheckCircle2 className="w-4 h-4 text-brand-700" />
                <span>Vantagens do atalho:</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-slate-600 text-[11px]">
                <li>Acesso direto com um clique na tela inicial</li>
                <li>Visual limpo sem barras de navegação do navegador</li>
                <li>Preservação segura da sua sessão de professora</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={promptInstall}
                className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Agora</span>
              </button>
              <button
                type="button"
                onClick={closeInstallModal}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Agora não
              </button>
            </div>
          </div>
        ) : isIos ? (
          /* Cenário 2: iPhone / iPad (Safari iOS) */
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Smartphone className="w-4 h-4 text-brand-700" />
              <span>Como adicionar à tela de início no iPhone ou iPad:</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-bold text-[11px] flex items-center justify-center">
                  1
                </span>
                <span className="leading-snug">
                  No Safari, toque no botão <strong>Compartilhar</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-brand-700" /> na barra inferior.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-bold text-[11px] flex items-center justify-center">
                  2
                </span>
                <span className="leading-snug">
                  Role a lista e selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-brand-700" />.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-bold text-[11px] flex items-center justify-center">
                  3
                </span>
                <span className="leading-snug">
                  Toque em <strong>Adicionar</strong> no canto superior direito para confirmar.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={closeInstallModal}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm"
            >
              Entendido
            </button>
          </div>
        ) : (
          /* Cenário 3: Outros navegadores (ex: Firefox ou menu do navegador) */
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Monitor className="w-4 h-4 text-brand-700" />
              <span>Instalação pelo menu do navegador:</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700">
              <p className="leading-relaxed">
                Você pode criar o atalho diretamente pelo menu do seu navegador:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-[11px] text-slate-600">
                <li>
                  <strong>No computador:</strong> Abra o menu do navegador (três pontinhos no topo) e escolha <strong>"Instalar Redação IA"</strong> ou <strong>"Criar atalho..."</strong>.
                </li>
                <li>
                  <strong>No celular:</strong> Abra as opções do navegador e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={closeInstallModal}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
