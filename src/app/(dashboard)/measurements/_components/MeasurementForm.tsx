'use client';

import React, { useState } from 'react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import { Ruler, CheckCircle2, Save, Camera, AlertCircle } from 'lucide-react';

const shirtFields: FormField[] = [
  { name: 'neck', label: 'Neck (Inches)', type: 'number', placeholder: '0.0' },
  { name: 'chest', label: 'Chest (Inches)', type: 'number', placeholder: '0.0' },
  { name: 'shoulder', label: 'Shoulder', type: 'number', placeholder: '0.0' },
  { name: 'sleeve', label: 'Sleeve Length', type: 'number', placeholder: '0.0' },
];

const trouserFields: FormField[] = [
  { name: 'waist', label: 'Waist', type: 'number', placeholder: '0.0' },
  { name: 'hip', label: 'Hip', type: 'number', placeholder: '0.0' },
  { name: 'length', label: 'Length', type: 'number', placeholder: '0.0' },
  { name: 'bottom', label: 'Bottom Hem', type: 'number', placeholder: '0.0' },
];

export const MeasurementForm: React.FC = () => {
  const [status, setStatus] = useState<'Pending' | 'Saved' | 'Completed'>('Pending');

  const handleSubmit = (data: any) => {
    console.log('Recording Measurements:', data);
    setStatus('Completed');
    alert('Measurements submitted and validated successfully!');
  };

  return (
    <div className="space-y-10">
      {/* Top Banner with Status */}
      <div className="bg-[#fce4d4]/10 dark:bg-zinc-900/40 p-10 rounded-[3rem] border-2 border-dashed border-[#fce4d4] flex items-center justify-between transition-all">
        <div className="flex items-center gap-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${
            status === 'Completed' ? 'bg-success text-white' : 'bg-[#f2994a] text-white'
          }`}>
            {status === 'Completed' ? <CheckCircle2 size={28} /> : <Ruler size={28} />}
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] dark:text-zinc-100">Take Measurements</h3>
            <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.3em] mt-1">Current Status: {status}</p>
          </div>
        </div>
        
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#8b6b5a] border border-[#fce4d4] shadow-sm hover:scale-105 transition-all">
             <Camera size={16} className="text-[#2d8d9b]" />
             Reference Photo
           </button>
           <button className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] border border-[#fce4d4] shadow-sm hover:scale-105 transition-all">
             <Save size={16} />
             Save Draft
           </button>
        </div>
      </div>

      {/* Dynamic Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <DynamicForm 
          title="Upper Body (Shirt/Blazer)"
          subtitle="All measurements in inches"
          fields={shirtFields}
          onSubmit={handleSubmit}
          submitLabel="Validate Section"
          columns={2}
        />
        <DynamicForm 
          title="Lower Body (Trouser/Skirt)" 
          subtitle="Ensure student stands straight"
          fields={trouserFields}
          onSubmit={handleSubmit}
          submitLabel="Validate Section"
          columns={2}
        />
      </div>

      {/* Final Submission Card */}
      <div className="bg-[#2d8d9b] p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="z-10 flex items-center gap-6">
           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
             <AlertCircle size={32} className="text-white animate-pulse" />
           </div>
           <div>
             <h4 className="text-white text-xl font-black tracking-tight italic">Final Submission</h4>
             <p className="text-white/60 text-xs font-medium max-w-xs mt-1">
               Ensure all sections are validated. Completed data will be synced with the warehouse for production.
             </p>
           </div>
        </div>
        <button 
          onClick={() => setStatus('Completed')}
          disabled={status === 'Completed'}
          className="z-10 bg-white text-[#2d8d9b] px-12 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
        >
          Finalize Measurement
        </button>
      </div>
    </div>
  );
};
