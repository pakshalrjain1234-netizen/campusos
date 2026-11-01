import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, 
  ShieldCheck, UserCheck, Copy, Check, Key, ChevronDown, ChevronUp 
} from 'lucide-react';
import { AppRole } from '../types/auth';
import { SIX_DEMO_CREDENTIALS, DEMO_TEMP_PASSWORD } from '../services/authService';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '../utils/permissions';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isDemoMode } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDemoSectionOpen, setIsDemoSectionOpen] = useState(true);

  const showDemoAccounts =
    import.meta.env.DEV ||
    (import.meta.env as any).VITE_ENABLE_DEMO_ACCOUNTS === 'true' ||
    isDemoMode;

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Return location if redirected from protected route
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please verify your credentials.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#F6F0E5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Decorative Pastel Ambient Orbs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #E6E9FF 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #E9DDFB 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 right-12 w-64 h-64 rounded-full opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D5F3E8 0%, transparent 70%)' }}
      />

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-white/95 shadow-[0_16px_40px_rgba(104,120,202,0.15)] p-7 sm:p-9">
          
          {/* Header Brand */}
          <div className="text-center mb-7">
            <div className="inline-flex relative mb-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAF5FF] via-[#EDE4F9] to-[#DFD0EF] text-[#6878CA] border border-white shadow-[0_6px_20px_rgba(104,120,202,0.25)]">
                <Zap size={26} className="text-[#6878CA]" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#BA3D6E] text-[8px] font-black text-white shadow-xs">
                  3D
                </span>
              </div>
            </div>
            <h1 className="font-space font-bold text-2xl text-[#24283B] tracking-tight">
              Sign In to CampusOps
            </h1>
            <p className="font-jakarta text-xs text-[#74788C] mt-1.5">
              Intelligent Campus Operations & Facility Control
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#FDF0F6] border border-[#F8DCE8] flex items-start gap-2.5 text-[#BA3D6E] text-xs font-jakarta animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@campusops.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] focus:bg-white focus:border-[#6878CA] focus:ring-2 focus:ring-[#E6E9FF] outline-none font-jakarta text-sm text-[#24283B] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-jakarta text-xs font-semibold text-[#24283B]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="font-jakarta text-xs font-semibold text-[#6878CA] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] focus:bg-white focus:border-[#6878CA] focus:ring-2 focus:ring-[#E6E9FF] outline-none font-jakarta text-sm text-[#24283B] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#74788C] hover:text-[#24283B]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#6878CA] to-[#4A5AA0] text-white font-jakarta font-bold text-sm flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(104,120,202,0.35)] hover:shadow-[0_8px_24px_rgba(104,120,202,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Operations</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Clearly Labelled Demo Accounts Section */}
          {showDemoAccounts && (
            <div className="mt-6 pt-5 border-t border-[#E7E2DD]">
              <div 
                className="flex items-center justify-between cursor-pointer select-none mb-2"
                onClick={() => setIsDemoSectionOpen(!isDemoSectionOpen)}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-[#6878CA]" />
                  <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#24283B]">
                    Demo Login Accounts (Six PS2 Roles)
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-[#74788C] bg-[#FAF7F1] px-2 py-0.5 rounded-full border border-[#E7E2DD]">
                    Evaluation
                  </span>
                  {isDemoSectionOpen ? <ChevronUp size={14} className="text-[#74788C]" /> : <ChevronDown size={14} className="text-[#74788C]" />}
                </div>
              </div>

              {isDemoSectionOpen && (
                <div className="space-y-2.5 mt-3 animate-in fade-in duration-200">
                  <p className="font-jakarta text-[11px] text-[#74788C] leading-relaxed">
                    Select an account to pre-fill credentials into the form, then sign in securely via Supabase Auth.
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                    {SIX_DEMO_CREDENTIALS.map((spec) => (
                      <div
                        key={spec.role}
                        className="p-2.5 rounded-2xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between gap-2 hover:border-[#C5CDFF] transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-space font-bold text-xs text-[#24283B]">
                              {spec.roleLabel}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E6E9FF] text-[#4A5AA0] uppercase">
                              {spec.role}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-[#74788C] truncate mt-0.5 select-all">
                            {spec.email}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Copy Email Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(spec.email, `email-${spec.role}`);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-[#E7E2DD] text-[#74788C] hover:text-[#24283B] hover:bg-[#F6F0E5] transition"
                            title="Copy email to clipboard"
                          >
                            {copiedKey === `email-${spec.role}` ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>

                          {/* Copy Password Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(spec.password, `pass-${spec.role}`);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-[#E7E2DD] text-[#74788C] hover:text-[#24283B] hover:bg-[#F6F0E5] transition"
                            title="Copy temporary password to clipboard"
                          >
                            {copiedKey === `pass-${spec.role}` ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Key size={12} />
                            )}
                          </button>

                          {/* Pre-fill Credentials for Real Supabase Submission */}
                          <button
                            type="button"
                            onClick={() => {
                              setEmail(spec.email);
                              setPassword(spec.password);
                              setError(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-[#24283B] hover:bg-[#383E58] text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                            title="Pre-fill email and password into form (requires Sign In)"
                          >
                            <span>Use</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>

        {/* Footer Note */}
        <p className="text-center font-jakarta text-xs text-[#74788C] mt-5">
          CampusOps · Protected with Supabase JWT & PostgreSQL RLS
        </p>
      </div>
    </div>
  );
}

