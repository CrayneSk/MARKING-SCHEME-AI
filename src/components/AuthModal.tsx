import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signup' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, displayName);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in could not be completed.');
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-[#0F172A] text-slate-100 rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-[#0E1729] to-slate-950 text-white p-6 border-b border-amber-500/20 relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 font-display">
              Educator Portal
            </span>
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-white">
            {isLogin ? 'Teacher Sign In' : 'Join as an Educator'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-light">
            {isLogin
              ? 'Access your saved marking schemes and profile.'
              : 'Create your account and receive free exam marking schemes on the Focus plan.'}
          </p>
          <button
            id="auth-modal-close-btn"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white text-xl font-light"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div
              id="auth-error-alert"
              className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-display">
                  Full Name / School Department
                </label>
                <input
                  id="auth-fullname-input"
                  type="text"
                  required
                  placeholder="e.g. Mr. T. Moyo / Chitepo High"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-display">
                Email Address
              </label>
              <input
                id="auth-email-input"
                type="email"
                required
                placeholder="teacher@school.ac.zw or personal email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-display">
                Password
              </label>
              <input
                id="auth-password-input"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
              />
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 font-display"
            >
              {isLogin ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to Teacher Account
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Start with Focus Plan (3 Free)
                </>
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0F172A] px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            id="auth-google-btn"
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2 px-4 border border-slate-800 hover:bg-slate-900 text-slate-300 font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Google Educator Account
          </button>

          <div className="mt-5 text-center text-xs text-slate-500">
            {isLogin ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Apply for Focus (Free)
                </button>
              </p>
            ) : (
              <p>
                Already have a teacher account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Sign In here
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 text-center">
          <p className="text-[11px] font-medium text-slate-400 font-display tracking-wider">
            Secure Examination Assessment System
          </p>
        </div>
      </div>
    </div>
  );
};
