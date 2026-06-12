'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;

        // Save token to cookies for the Next.js Proxy to read
        Cookies.set('auth_token', token, { expires: 7 });
        localStorage.setItem('user', JSON.stringify(user));

        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Access Denied. Check credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4 sm:p-6 bg-[#eae8e4] font-sans">
      {/* Container holding both panels */}
      <div className="w-full max-w-[960px] min-h-[520px] lg:min-h-[580px] grid grid-cols-1 lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25)] bg-white border border-[#d6d3cc] my-4">

        {/* Left Side: Dark Premium Gradient */}
        <div className="hidden lg:flex flex-col justify-between p-8 lg:p-10 relative overflow-hidden bg-gradient-to-b from-[#1c1a17] via-[#151311] to-[#0f0e0d]">
          {/* Radial light source glow */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[300px] h-[300px] bg-[#614728] opacity-25 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10">
            {/* Top Empty Space */}
          </div>

          {/* Bottom Branding */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="border-2 border-white/60 p-2 rounded-[10px] flex items-center justify-center w-[40px] h-[56px] bg-transparent">
              <svg viewBox="0 0 24 40" className="w-5 h-9 text-white" fill="currentColor">
                {/* Knot */}
                <polygon points="9,7 15,7 14,11 10,11" />
                {/* Body */}
                <polygon points="10.5,11 13.5,11 15.5,27 12,34 8.5,27" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-2xl font-black tracking-[0.18em] leading-none uppercase">INLAND</span>
              <span className="text-white/60 text-[9px] font-black tracking-[0.62em] uppercase mt-2 leading-none">UNIFORMS</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white relative min-h-[460px] lg:min-h-0">

          {/* Top Row: Logo & Sign Up link */}
          <div className="flex justify-between items-center w-full">
            {/* Left Top Logo (Inland) */}
            <div className="border border-black p-1 rounded-[6px] flex items-center justify-center w-[26px] h-[36px] bg-transparent">
              <svg viewBox="0 0 24 40" className="w-3.5 h-6 text-black" fill="currentColor">
                {/* Knot */}
                <polygon points="9,7 15,7 14,11 10,11" />
                {/* Body */}
                <polygon points="10.5,11 13.5,11 15.5,27 12,34 8.5,27" />
              </svg>
            </div>

            {/* Right Top Sign up link */}
            <p className="text-xs font-semibold text-zinc-550">
              Don't have an account? <span className="underline cursor-pointer font-bold text-black hover:text-[#EA8F08]">Sign Up</span>
            </p>
          </div>

          {/* Center Form Section */}
          <div className="max-w-[340px] w-full mx-auto my-auto py-4">
            <div className="text-center mb-5">
              <h1 className="text-2xl font-black text-black tracking-tight">Welcome to Inland!</h1>
              <p className="text-[11px] text-zinc-400 font-semibold mt-1.5">Please enter your details to sign in to your account</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-150 rounded-xl flex items-center gap-2.5 text-red-650">
                <AlertCircle size={14} className="shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wider leading-none">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-zinc-700 tracking-wide">Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="johndoe@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold border border-zinc-200 rounded-xl text-black placeholder:text-zinc-350 focus:outline-none focus:border-[#EA8F08] focus:ring-1 focus:ring-[#EA8F08]/20 bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-zinc-700 tracking-wide">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="minimum 8 character"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold border border-zinc-200 rounded-xl text-black placeholder:text-zinc-350 focus:outline-none focus:border-[#EA8F08] focus:ring-1 focus:ring-[#EA8F08]/20 bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors bg-transparent border-none p-0 flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#EA8F08] hover:bg-[#EA8F08]/90 text-white rounded-xl font-black tracking-wide text-xs shadow-lg shadow-[#EA8F08]/15 border-none transition-all flex items-center justify-center gap-2 group"
                >
                  {isLoading ? 'Sign In...' : 'Sign In'}
                  {!isLoading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />}
                </Button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[11px] font-bold text-[#3a525d] underline cursor-pointer hover:text-black">
                  Forgot password?
                </span>
              </div>
            </form>
          </div>

          {/* Bottom Footer Section */}
          <div className="w-full pt-4 border-t border-zinc-100 flex justify-between items-center text-[9px] font-bold text-zinc-400 tracking-wider">
            <span>© 2024 Inland Uniforms</span>
            <div className="flex gap-3">
              <span className="hover:text-black cursor-pointer">Privacy Policy</span>
              <span>|</span>
              <span className="hover:text-black cursor-pointer">Support</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
