'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Grid, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#516d7a]">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#516d7a]/80 via-transparent to-[#2d8d9b]/40 backdrop-blur-[2px]" />

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-white/40">
        
        <div className="hidden lg:flex flex-col justify-between p-16 bg-[#3a525d] relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Grid className="text-[#3a525d]" size={28} />
              </div>
              <span className="text-white text-xl font-black tracking-[0.2em] uppercase">Inland Uniform</span>
            </div>

            <h2 className="text-5xl font-black italic text-white leading-[1.1] mb-6">
              Normal <br />
              <span className="text-[#f2994a]">Administrative</span> <br />
              Login.
            </h2>
          </div>
        </div>

        <div className="p-8 md:p-16 flex flex-col justify-center">
          <div className="space-y-2 mb-10">
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-[#3a525d]">System Access</h1>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] opacity-70">Enter Username & Password</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error">
              <AlertCircle size={18} />
              <p className="text-[11px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Username / Email" 
              placeholder="admin@uniform.com" 
              type="text" 
              icon={<Mail size={20} />} 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              allowSpecialCharacters={true}
            />
            
            <div className="relative">
              <Input 
                label="Password" 
                placeholder="••••••••••••" 
                type={showPassword ? 'text' : 'password'} 
                icon={<Lock size={20} />} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                allowSpecialCharacters={true}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-[46px] text-[#6fa1ac]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-16 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.25em] text-sm shadow-xl transition-all flex items-center justify-center gap-3 group"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-300" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
