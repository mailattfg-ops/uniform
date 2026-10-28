'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Trash2, Settings2, GripVertical, X } from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface LabelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LabelConfigModal({ isOpen, onClose }: LabelModalProps) {
  const [fields, setFields] = useState<any[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('Inches');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/measurements/config/${deletingId}`);
      fetchConfig();
      toast.success('Label removed');
    } catch (err) { 
        toast.error('Cannot remove label in use'); 
    } finally {
        setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-xl bg-white p-10 border border-zinc-200/80 shadow-2xl rounded-[3rem] relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0 right-0" />

        <Button onClick={onClose} variant="secondary" className="absolute top-8 right-8 text-zinc-400 hover:text-zinc-700 transition-colors bg-transparent border-none shadow-none p-1 cursor-pointer"><X size={24} /></Button>
        
        <div className="flex items-center gap-3 mb-8 pt-1">
           <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-xs">
              <Settings2 size={20} />
           </div>
           <div>
              <h3 className="text-xl font-black italic tracking-tight text-zinc-900">Label Blueprint</h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Configure measurement schema</p>
           </div>
        </div>

        <div className="space-y-6">
           {/* Add New with Unit */}
           <div className="space-y-3 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200/80">
              <div className="flex gap-3">
                <Input 
                    placeholder="New Label Name..." 
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="bg-white flex-1"
                />
                <Select
                    options={[
                      { label: 'Inches', value: 'Inches' },
                      { label: 'CM', value: 'CM' },
                      { label: 'Meter', value: 'Meter' }
                    ]}
                    value={newFieldUnit}
                    onChange={(val) => setNewFieldUnit(val)}
                    className="h-10 !py-0 !rounded-xl"
                />
              </div>
              <Button onClick={handleAddField} className="w-full h-10 bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-md shadow-[#C82A2B]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">Install Metric</Button>
           </div>

           {/* List */}
           <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-2 pr-2">
              {fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-4 bg-white border border-zinc-150 rounded-2xl hover:border-[#C82A2B]/40 transition-all group">
                   <div className="flex items-center gap-4">
                      <GripVertical size={14} className="text-zinc-300" />
                      <div>
                        <span className="font-black italic text-zinc-900 text-base block leading-none">{f.label}</span>
                        <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{f.unit || 'Inches'}</span>
                      </div>
                   </div>
                    <Button onClick={() => setDeletingId(f.id)} variant="secondary" className="text-zinc-300 hover:text-red-500 p-2 bg-transparent border-none shadow-none cursor-pointer"><Trash2 size={16} /></Button>
                </div>
              ))}
           </div>

            <Button onClick={onClose} className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest shadow-xl transition-all cursor-pointer">Done / Close Blueprint</Button>
        </div>
      </Card>

      <ConfirmModal 
        isOpen={!!deletingId}
        title="Remove Metric?"
        message="Are you sure? This will remove the field from future sizing entries."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
