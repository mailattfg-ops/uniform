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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-sm bg-white p-8 border border-zinc-200/80 shadow-2xl rounded-[2.5rem] relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0 right-0" />

        <Button onClick={onClose} variant="secondary" className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-700 transition-colors bg-transparent border-none shadow-none p-1 cursor-pointer"><X size={20} /></Button>
        
        <div className="flex items-center gap-3 mb-6 pt-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-xs">
            <Pencil size={18} />
          </div>
          <div>
            <h3 className="text-lg font-black italic tracking-tight text-zinc-900">New Custom Metric</h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#9E1B1D]">Record-level personalization</p>
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
              className="bg-zinc-50 border-zinc-200 h-12"
            />
            
            <div className="space-y-2">
               <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">UNIT OF MEASURE</label>
               <div className="flex gap-2">
                  {['Inches', 'CM'].map((u) => (
                    <Button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      variant="secondary"
                      className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${unit === u ? 'bg-[#C82A2B] text-white border-[#C82A2B]' : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50 shadow-none'}`}
                    >
                       {u}
                    </Button>
                  ))}
               </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white font-black uppercase tracking-widest flex gap-2 shadow-xl shadow-[#C82A2B]/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
             <Plus size={16} /> Add to Current Session
          </Button>
        </form>
      </Card>
    </div>
  );
}
