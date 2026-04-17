'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, X, Pencil } from 'lucide-react';

interface AdHocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (field: { label: string, unit: string }) => void;
}

export function AdHocFieldModal({ isOpen, onClose, onAdd }: AdHocModalProps) {
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('Inches');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd({ label, unit });
    setLabel('');
    setUnit('Inches');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-sm bg-white p-8 border-none shadow-[0_30px_100px_rgba(0,0,0,0.3)] rounded-[2.5rem] relative">
         <button onClick={onClose} className="absolute top-6 right-6 text-zinc-300 hover:text-[#3a525d] transition-colors"><X size={20} /></button>
         
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
               <Pencil size={18} />
            </div>
            <div>
               <h3 className="text-lg font-black italic tracking-tighter text-[#3a525d]">New Custom Metric</h3>
               <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">Record-level personalization</p>
            </div>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input 
                autoFocus
                label="LABEL NAME"
                placeholder="e.g. Wrist Diameter..." 
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="bg-zinc-50 border-none h-12"
              />
              
              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">UNIT OF MEASURE</label>
                 <div className="flex gap-2">
                    {['Inches', 'CM'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${unit === u ? 'bg-[#3a525d] text-white border-[#3a525d]' : 'bg-white text-zinc-400 border-zinc-100 hover:bg-zinc-50'}`}
                      >
                         {u}
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-14 rounded-2xl bg-[#3a525d] text-white font-black uppercase tracking-widest flex gap-2">
               <Plus size={16} /> Add to Current Session
            </Button>
         </form>
      </Card>
    </div>
  );
}
