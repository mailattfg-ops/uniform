'use client';

import React from 'react';
import { X, Key, Clipboard, Check, ShieldCheck } from 'lucide-react';
import { Button } from './Button';
import toast from '@/components/ui/toast';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    username?: string;
    email?: string;
    password?: string;
    full_name?: string;
  } | null;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({ isOpen, onClose, data }) => {
  const [hasCopied, setHasCopied] = React.useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    const text = `Entity: ${data.full_name}\nUsername: ${data.username || 'Unchanged'}${data.email ? `\nEmail: ${data.email}` : ''}\nPassword: ${data.password || 'Unchanged'}`;
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success('Credentials copied!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200/80 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />

        {/* Executive Brand Obsidian Header */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-7 text-white">
          <div className="flex items-center justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck size={24} />
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white">Security Update</h3>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-1">Credentials generated for {data.full_name}</p>
        </div>

        <div className="p-7 space-y-6">
          <div className="space-y-3.5">
            {data.username && (
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">New Username</label>
                <p className="text-sm font-bold text-zinc-900 font-mono">{data.username}</p>
              </div>
            )}
            {data.email && (
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Account Email</label>
                <p className="text-sm font-bold text-zinc-900">{data.email}</p>
              </div>
            )}
            {data.password && (
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <label className="text-[9px] font-black text-[#9E1B1D] uppercase tracking-widest block mb-1">Secure Password</label>
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-[#9E1B1D]" />
                  <p className="text-base font-black text-zinc-900 tracking-[0.2em] font-mono">{data.password}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <Button 
              onClick={handleCopy} 
              className={`h-13 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg transition-all ${
                hasCopied 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                  : 'bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-[#C82A2B]/20'
              }`}
            >
              {hasCopied ? <Check size={14} /> : <Clipboard size={14} />}
              {hasCopied ? 'Copied to clipboard' : 'Copy All Details'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="h-13 rounded-2xl font-black uppercase text-[10px] tracking-widest text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            >
              Close Window
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
