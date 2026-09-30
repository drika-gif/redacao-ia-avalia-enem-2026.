import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Correcao } from './types';
import { DbService } from './lib/db';
import { Navbar } from './components/Navbar';
import { WelcomeModal } from './components/WelcomeModal';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewCorrectionPage } from './pages/NewCorrectionPage';
import { EssaysListPage } from './pages/EssaysListPage';
import { ClassSpreadsheetPage } from './pages/ClassSpreadsheetPage';
import { GenerateSpreadsheetPage } from './pages/GenerateSpreadsheetPage';
import { MyAccountPage } from './pages/MyAccountPage';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('inicio');
  const [correcoes, setCorrecoes] = useState<Correcao[]>([]);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  // Carrega as correções exclusivas desta professora
  const carregarDados = async () => {
    if (!user) return;
    const dados = await DbService.getAll(user.id);
    
    setCorrecoes(dados);
  };

  useEffect(() => {
    if (user) {
      carregarDados();

      // Primeiro uso: exibe modal de boas-vindas
      const seen = localStorage.getItem('redacao_ia_welcome_seen');
      if (!seen) {
        setIsWelcomeOpen(true);
      }
    }
  }, [user]);

  const handleCloseWelcome = () => {
    localStorage.setItem('redacao_ia_welcome_seen', 'true');
    setIsWelcomeOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
            Carregando Redação IA...
          </p>
        </div>
      </div>
    );
  }

  // Se não autenticado -> Tela de Login / Cadastro
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        totalCorrecoes={correcoes.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'inicio' && (
          <DashboardPage correcoes={correcoes} onNavigate={setCurrentTab} />
        )}

        {currentTab === 'nova-correcao' && (
          <NewCorrectionPage
            onSaved={() => {
              carregarDados();
              setCurrentTab('redacoes');
            }}
          />
        )}

        {currentTab === 'redacoes' && (
          <EssaysListPage
            correcoes={correcoes}
            onReload={carregarDados}
            onEdit={() => setCurrentTab('nova-correcao')}
          />
        )}

        {currentTab === 'planilha-turma' && (
          <ClassSpreadsheetPage
            correcoes={correcoes}
            onExport={() => setCurrentTab('gerar-planilha')}
          />
        )}

        {currentTab === 'gerar-planilha' && (
          <GenerateSpreadsheetPage correcoes={correcoes} />
        )}

        {currentTab === 'minha-conta' && <MyAccountPage />}
      </main>

      {/* Modal de Boas-vindas para primeiro uso */}
      <WelcomeModal isOpen={isWelcomeOpen} onClose={handleCloseWelcome} />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
