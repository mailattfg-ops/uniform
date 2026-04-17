'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Ruler, Settings2, GripVertical, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface LabelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LabelConfigModal({ isOpen, onClose }: LabelModalProps) {
  const [fields, setFields] = useState<any[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('Inches');
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/measurements/config');
      setFields(response.data.sort((a: any, b: any) => a.display_order - b.display_order));
    } catch (err) {
      toast.error('Failed to load sizing templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchConfig();
  }, [isOpen]);

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;
    try {
      await api.post('/measurements/config', {
        label: newFieldName,
        unit: newFieldUnit,
        display_order: fields.length + 1,
        is_required: true
      });
      setNewFieldName('');
      fetchConfig();
      toast.success('Label added');
    } catch (err) { toast.error('Failed to add'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/measurements/config/${id}`);
      fetchConfig();
      toast.success('Label removed');
    } catch (err) { toast.error('Cannot remove label in use'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-xl bg-white p-10 border-none shadow-[0_30px_100px_rgba(0,0,0,0.3)] rounded-[3rem] relative overflow-hidden">
        <button onClick={onClose} className="absolute top-8 right-8 text-zinc-300 hover:text-[#3a525d] transition-colors"><X size={24} /></button>
        
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
              <Settings2 size={20} />
           </div>
           <div>
              <h3 className="text-xl font-black italic tracking-tighter text-[#3a525d]">Label Blueprint</h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Configure measurement schema</p>
           </div>
        </div>

        <div className="space-y-6">
           {/* Add New with Unit */}
           <div className="space-y-3 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
              <div className="flex gap-3">
                <Input 
                    placeholder="New Label Name..." 
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="bg-white flex-1"
                />
                <select 
                    value={newFieldUnit}
                    onChange={(e) => setNewFieldUnit(e.target.value)}
                    className="h-10 px-4 rounded-xl bg-white border border-zinc-200 text-[#3a525d] font-bold text-xs outline-none focus:border-[#2d8d9b]"
                >
                    <option value="Inches">Inches</option>
                    <option value="CM">CM</option>
                    <option value="Meter">Meter</option>
                </select>
              </div>
              <Button onClick={handleAddField} className="w-full h-10 bg-[#3a525d] text-white">Install Metric</Button>
           </div>

           {/* List */}
           <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-2 pr-2">
              {fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl hover:border-[#2d8d9b]/30 transition-all group">
                   <div className="flex items-center gap-4">
                      <GripVertical size={14} className="text-zinc-200" />
                      <div>
                        <span className="font-black italic text-[#3a525d] text-base block leading-none">{f.label}</span>
                        <span className="text-[8px] font-black uppercase text-zinc-300 tracking-widest">{f.unit || 'Inches'}</span>
                      </div>
                   </div>
                   <button onClick={() => handleDelete(f.id)} className="text-zinc-200 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                </div>
              ))}
           </div>

           <Button onClick={onClose} className="w-full h-14 rounded-2xl bg-[#f2994a] text-white font-black uppercase tracking-widest">Update Form Schema</Button>
        </div>
      </Card>
    </div>
  );
}
