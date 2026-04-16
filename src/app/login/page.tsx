'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Grid } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#516d7a]">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60 scale-105 animate-pulse-slow"
        style={{ backgroundImage: 'url("/images/login-bg.png")' }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#516d7a]/80 via-transparent to-[#2d8d9b]/40 backdrop-blur-[2px]" />

      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#6fa1ac]/20 rounded-full blur-[120px] animate-bounce-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#f2994a]/10 rounded-full blur-[120px] animate-bounce-slow" style={{ animationDelay: '1s' }} />

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-white/40">
        
        {/* Left Side: Brand & Visuals (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-[#3a525d] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#f2994a]/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Grid className="text-[#3a525d]" size={28} />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-xl font-black tracking-[0.2em] leading-none uppercase">Inland Uniform</span>
                <span className="text-[#6fa1ac] text-[10px] font-bold tracking-[0.4em] mt-1 uppercase">Enterprise Suite</span>
              </div>
            </div>

            <h2 className="text-5xl font-black italic text-white leading-[1.1] tracking-tighter mb-6">
              Empowering <br />
              <span className="text-[#f2994a]">Corporate</span> <br />
              Uniformity.
            </h2>
            <p className="text-[#6fa1ac] text-lg font-medium max-w-sm leading-relaxed">
              Streamline your student inventory, measurements, and distribution with our high-fidelity ERP solution.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-8">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#3a525d] overflow-hidden bg-zinc-800">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar${i}`} alt="user" />
                </div>
              ))}
            </div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
              Trusted by <span className="text-white">500+</span> Schools
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10 lg:hidden flex items-center gap-3">
             <div className="w-10 h-10 bg-[#3a525d] rounded-2xl flex items-center justify-center shadow-lg">
                <Grid className="text-white" size={20} />
              </div>
              <span className="text-[#3a525d] text-lg font-black tracking-widest uppercase">Inland</span>
          </div>

          <div className="space-y-2 mb-10">
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-[#3a525d]">Welcome Back</h1>
            <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.3em] text-[#2d8d9b] opacity-70">Secured Enterprise Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Professional Email" 
              placeholder="name@company.com" 
              type="email" 
              icon={<Mail size={20} />} 
              required
            />
            
            <div className="relative">
              <Input 
                label="Access Password" 
                placeholder="••••••••••••" 
                type={showPassword ? 'text' : 'password'} 
                icon={<Lock size={20} />} 
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-[46px] text-[#6fa1ac] hover:text-[#2d8d9b] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-[#fce4d4] rounded-lg bg-white transition-all peer-checked:bg-[#2d8d9b] peer-checked:border-[#2d8d9b]" />
                  <div className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#8b6b5a] group-hover:text-[#3a525d] transition-colors">Remember Session</span>
              </label>
              
              <Link href="#" className="text-xs font-black text-[#2d8d9b] hover:text-[#f2994a] transition-colors uppercase tracking-widest">
                Recovery Password?
              </Link>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-16 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.25em] text-sm shadow-xl shadow-[#3a525d]/20 transition-all flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : (
                <>
                  Establish Connection
                  <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-300" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-[#fce4d4] text-center">
            <p className="text-xs font-bold text-[#8b6b5a]">
              Don't have an enterprise account? 
              <Link href="#" className="text-[#2d8d9b] font-black pointer-events-none opacity-40 ml-2 uppercase tracking-widest">Contact IT Admin</Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; transform: scale(1.05); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
