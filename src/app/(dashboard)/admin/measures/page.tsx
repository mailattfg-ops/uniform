'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Save, Ruler, Settings2, GripVertical, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function MeasuresArchitectPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('Inches');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/measurements/config');
      setFields(response.data.sort((a: any, b: any) => a.display_order - b.display_order));
    } catch (err) {
      toast.error('Failed to load measures registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;
    setIsSaving(true);
    try {
      const newField = {
        label: newFieldName,
        unit: newFieldUnit,
        display_order: fields.length + 1,
        is_required: true
      };

      await api.post('/measurements/config', newField);
      setNewFieldName('');
      fetchConfig();
      toast.success('Label added to measures registry');
    } catch (err) {
      toast.error('Failed to add label');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteField = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/measurements/config/${deletingId}`);
      setFields(fields.filter(f => f.id !== deletingId));
      toast.success('Label removed');
    } catch (err) {
      toast.error('Cannot delete: This label might be in use by existing records.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) return <div className="p-20 flex justify-center"><div className="w-12 h-12 border-4 border-[#2d8d9b]/10 border-t-[#2d8d9b] rounded-full animate-spin" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Measures Architect</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Master Measurement Registry</p>
         </div>
         <div className="w-14 h-14 bg-zinc-50 rounded-[2rem] flex items-center justify-center text-[#3a525d] shadow-sm border border-zinc-100">
            <Settings2 size={24} />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* ADD NEW LABEL CARD */}
         <div className="lg:col-span-1">
            <Card className="p-8 border-none bg-[#3a525d] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-2xl" />
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Plus size={20} />
                     </div>
                     <h3 className="font-black text-lg italic tracking-tighter">Define New Metric</h3>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 block">Label Name</label>
                        <Input 
                          placeholder="e.g. Inseam" 
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 block">Unit of Measure</label>
                        <Input 
                          placeholder="e.g. Inches" 
                          value={newFieldUnit}
                          onChange={(e) => setNewFieldUnit(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                        />
                     </div>
                     <Button 
                       onClick={handleAddField}
                       disabled={!newFieldName || isSaving}
                       isLoading={isSaving}
                       className="w-full h-14 rounded-xl bg-[#f2994a] hover:bg-[#d4813a] text-white font-black uppercase text-[10px] tracking-widest shadow-lg border-none transition-all mt-4"
                     >
                       Install Label
                     </Button>
                  </div>
               </div>
            </Card>

            <div className="mt-8 p-6 bg-orange-50 rounded-[2rem] border border-orange-100 flex items-start gap-4">
               <AlertTriangle className="text-orange-500 shrink-0" size={20} />
               <p className="text-[10px] font-bold text-orange-800 leading-relaxed uppercase tracking-tight">
                  Changing labels will only affect new entries. Existing records will keep their historical labels for audit purposes.
               </p>
            </div>
         </div>

         {/* CURRENT CONFIGURATION LIST */}
         <div className="lg:col-span-2 space-y-4">
            <div className="px-6 py-2 bg-zinc-50 rounded-full inline-flex items-center gap-2 border border-zinc-100 mb-2">
               <Ruler size={12} className="text-[#2d8d9b]" />
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Registry: {fields.length} Labels</span>
            </div>

            <div className="space-y-3">
               {fields.map((field) => (
                 <Card key={field.id} className="p-6 border-none shadow-xl hover:shadow-2xl transition-all group bg-white">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300">
                             <GripVertical size={16} />
                          </div>
                          <div>
                             <h4 className="text-xl font-black italic tracking-tighter text-[#3a525d] group-hover:text-[#2d8d9b] transition-colors">{field.label}</h4>
                             <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300">{field.unit || 'No Unit Set'}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-4">
                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${field.is_required ? 'bg-green-50 text-green-600 border-green-100' : 'bg-zinc-50 text-zinc-400 border-zinc-100'}`}>
                             {field.is_required ? 'Mandatory' : 'Optional'}
                          </div>
                          <button 
                            onClick={() => setDeletingId(field.id)}
                            className="p-3 text-zinc-200 hover:text-red-500 transition-colors"
                          >
                             <Trash2 size={20} />
                          </button>
                       </div>
                    </div>
                 </Card>
               ))}

               {fields.length === 0 && (
                 <div className="py-20 text-center opacity-20 italic">
                    No custom labels defined yet.
                 </div>
               )}
            </div>
         </div>
      </div>

      <ConfirmModal 
        isOpen={!!deletingId}
        title="Remove Measurement Metric?"
        message="Are you sure you want to remove this label from your registry? Historical records will not be affected, but it will be hidden from new sizing entries."
        confirmLabel="Permanently Delete"
        cancelLabel="Keep Metric"
        variant="danger"
        onConfirm={handleDeleteField}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
