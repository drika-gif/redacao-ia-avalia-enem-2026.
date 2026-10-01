import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  canCancel?: boolean;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  canCancel = true,
}) => {
  const { updatePassword, user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      setSuccessMsg('Senha alterada com sucesso! Você já pode utilizar sua nova senha.');
      
      // Limpa hashes da URL para evitar reabertura involuntária
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setTimeout(() => {
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        {canCancel && !successMsg && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full text-lg leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center font-bold mx-auto mb-3 border border-brand-100 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Definir Nova Senha
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {user?.email
              ? `Atualize a senha de acesso para ${user.email}`
              : 'Digite sua nova senha para continuar com o Redação IA'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-800 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-bold">{successMsg}</p>
              <p className="text-[11px] text-green-700 mt-0.5">Retornando ao sistema...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nova Senha (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-700 hover:bg-brand-800 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Nova Senha</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
