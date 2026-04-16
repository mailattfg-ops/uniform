'use client';

import React from 'react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import { Layers, School, Info, CheckCircle2 } from 'lucide-react';

const classFields: FormField[] = [
  { 
    name: 'className', 
    label: 'Class / Grade Name', 
    type: 'text', 
    placeholder: 'e.g. Grade 10, Kindergarten', 
    required: true 
  },
  { 
    name: 'section', 
    label: 'Section', 
    type: 'text', 
    placeholder: 'e.g. A, B, North, Primary', 
    required: true 
  },
  { 
    name: 'schoolId', 
    label: 'Assign to School', 
    type: 'select', 
    options: [
      { label: 'Greenwood High', value: 'greenwood' },
      { label: 'Riverdale Academy', value: 'riverdale' },
      { label: 'St. Xavier School', value: 'xavier' },
    ], 
    required: true 
  },
];

interface ClassAddFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClassAddForm: React.FC<ClassAddFormProps> = ({ onSuccess, onCancel }) => {
  const handleSubmit = (data: any) => {
    console.log('Creating New Class:', data);
    alert(`Success: ${data.className} - Section ${data.section} has been created.`);
    onSuccess();
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f2994a] rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d]">New Class Configuration</h3>
            <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.3em] mt-1">Registry Setup • Group Logistics</p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="px-6 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-[3rem] p-4 lg:p-8 border border-zinc-100 dark:border-zinc-800 shadow-xl">
        <DynamicForm 
          title="Class Details"
          subtitle="Define organizational groups for student categorization"
          fields={classFields}
          onSubmit={handleSubmit}
          submitLabel="Create Class"
          columns={2}
          onCancel={onCancel}
        />
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-[#6fa1ac]/5 rounded-3xl border border-[#6fa1ac]/10 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#6fa1ac]/10 flex items-center justify-center shrink-0">
               <School size={16} className="text-[#6fa1ac]" />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] mb-1">School Affiliation</h4>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">
                Classes are unique to their assigned school registry.
              </p>
            </div>
          </div>
          <div className="p-6 bg-[#f2994a]/5 rounded-3xl border border-[#f2994a]/10 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#f2994a]/10 flex items-center justify-center shrink-0">
               <Info size={16} className="text-[#f2994a]" />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] mb-1">Section Entry</h4>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">
                Multiple sections can be created for the same grade.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 py-4 bg-zinc-50 dark:bg-transparent rounded-3xl opacity-40">
        <CheckCircle2 size={14} className="text-success" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Validation System Active</span>
      </div>
    </div>
  );
};
