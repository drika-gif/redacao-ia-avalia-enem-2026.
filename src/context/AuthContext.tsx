import React, { createContext, useContext, useEffect, useState } from 'react';
import { ProfessorUser } from '../types';
import { supabase, getSupabaseClient, getSupabaseCredentials } from '../lib/supabase';

interface AuthContextType {
  user: ProfessorUser | null;
  loading: boolean;
  isConfigured: boolean;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<{ needEmailConfirm: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const DEMO_USER_KEY = 'redacao_ia_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ProfessorUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setIsConfigured(creds.isConfigured);

    // 0. Verifica se a URL contém parâmetros de recuperação de senha
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setIsRecoveryMode(true);
      }
    }

    // 1. Verifica se há um usuário demo ativo salvo localmente
    const savedDemo = localStorage.getItem(DEMO_USER_KEY);
    if (savedDemo) {
      try {
        setUser(JSON.parse(savedDemo));
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }

    // 2. Se houver Supabase configurado, verifica sessão real
    const client = getSupabaseClient() || supabase;
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          });
        }
        setLoading(false);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          });
        } else {
          // Não limpa se estiver em modo demo
          if (!localStorage.getItem(DEMO_USER_KEY)) {
            setUser(null);
          }
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const client = getSupabaseClient() || supabase;
    if (!client) {
      throw new Error('Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env ou clique em "Modo Demonstração".');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        msg = 'Email ou senha incorretos. Verifique suas credenciais.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Email ainda não confirmado. Verifique sua caixa de entrada.';
      }
      throw new Error(msg);
    }

    if (data.user) {
      localStorage.removeItem(DEMO_USER_KEY);
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        nome: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
      });
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const client = getSupabaseClient() || supabase;
    if (!client) {
      throw new Error('Supabase não configurado. Adicione as variáveis de ambiente no arquivo .env.');
    }

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: nome.trim(),
          role: 'professora',
        },
      },
    });

    if (error) throw error;

    if (data.user && data.session) {
      localStorage.removeItem(DEMO_USER_KEY);
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        nome: nome.trim(),
      });
      return { needEmailConfirm: false };
    }

    return { needEmailConfirm: true };
  };

  const resetPassword = async (email: string) => {
    const client = getSupabaseClient() || supabase;
    if (!client) {
      throw new Error('Supabase não configurado.');
    }

    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : 'https://redacao-ia-avalia-enem-2026.vercel.app/';

    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const client = getSupabaseClient() || supabase;
    if (!client) {
      throw new Error('Supabase não configurado.');
    }

    const { error } = await client.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    localStorage.removeItem(DEMO_USER_KEY);
    const client = getSupabaseClient() || supabase;
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Erro ao deslogar no Supabase:', err);
      }
    }
    setUser(null);
  };

  const enterDemoMode = () => {
    const demo: ProfessorUser = {
      id: 'demo-professora-iema-2026',
      email: 'professora.demo@iema.edu.br',
      nome: 'Professora (Modo Teste)',
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
    setUser(demo);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured,
        isRecoveryMode,
        setIsRecoveryMode,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        signOut,
        enterDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
