'use client';

import React from 'react';
import { X, Key, Clipboard, Check, ShieldCheck } from 'lucide-react';
import { Button } from './Button';
import toast from 'react-hot-toast';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    username?: string;
    password?: string;
    full_name?: string;
  } | null;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({ isOpen, onClose, data }) => {
  const [hasCopied, setHasCopied] = React.useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    const text = `Student: ${data.full_name}\nUsername: ${data.username || 'Unchanged'}\nPassword: ${data.password || 'Unchanged'}`;
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success('Credentials copied!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300">
        <div className="bg-[#2d8d9b] p-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
               <ShieldCheck size={24} />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
          <h3 className="text-xl font-black italic">Security Update</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">Credentials generated for {data.full_name}</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
             {data.username && (
               <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">New Username</label>
                  <p className="text-sm font-black text-[#3a525d]">{data.username}</p>
               </div>
             )}
             {data.password && (
               <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                  <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest block mb-1">New Secure Password</label>
                  <div className="flex items-center gap-2">
                     <Key size={14} className="text-orange-500" />
                     <p className="text-lg font-black text-orange-600 tracking-[0.2em]">{data.password}</p>
                  </div>
               </div>
             )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={handleCopy} className={`h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 ${hasCopied ? 'bg-green-500' : 'bg-[#3a525d]'}`}>
               {hasCopied ? <Check size={14} /> : <Clipboard size={14} />}
               {hasCopied ? 'Copied to clipboard' : 'Copy All Details'}
            </Button>
            <Button variant="outline" onClick={onClose} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-zinc-400">
               Close Window
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
