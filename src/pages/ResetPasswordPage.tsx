import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F0E5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-white/95 shadow-[0_16px_40px_rgba(104,120,202,0.15)] p-7 sm:p-9">
          
          <div className="text-center mb-7">
            <div className="inline-flex relative mb-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAF5FF] via-[#EDE4F9] to-[#DFD0EF] text-[#6878CA] border border-white shadow-sm">
                <Zap size={26} className="text-[#6878CA]" />
              </div>
            </div>
            <h1 className="font-space font-bold text-2xl text-[#24283B] tracking-tight">
              Create New Password
            </h1>
            <p className="font-jakarta text-xs text-[#74788C] mt-1.5">
              Choose a secure, strong password for your CampusOps account
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#FDF0F6] border border-[#F8DCE8] flex items-start gap-2.5 text-[#BA3D6E] text-xs font-jakarta">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D5F3E8] border border-[#A7F3D0] text-[#2E8B67] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-space font-bold text-base text-[#24283B]">Password Updated!</h3>
              <p className="font-jakarta text-xs text-[#74788C] mt-2">
                Your new password has been verified. Redirecting to operations overview...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1.5">
                  New Password (min. 8 characters)
                </label>
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

              <div>
                <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] focus:bg-white focus:border-[#6878CA] focus:ring-2 focus:ring-[#E6E9FF] outline-none font-jakarta text-sm text-[#24283B] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#6878CA] to-[#4A5AA0] text-white font-jakarta font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="font-jakarta text-xs font-semibold text-[#74788C] hover:text-[#24283B] transition"
                >
                  Cancel and Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

