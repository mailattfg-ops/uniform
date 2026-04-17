'use client';

import React from 'react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import { School, MapPin, Phone, Mail, User } from 'lucide-react';

const schoolFields: FormField[] = [
  { name: 'schoolName', label: 'School Name', type: 'text', placeholder: 'e.g. Greenwood International', required: true },
  { name: 'address', label: 'Physical Address', type: 'text', placeholder: 'Street, City, Zip', required: true },
  { name: 'city', label: 'City', type: 'select', options: [
    { label: 'Downtown', value: 'downtown' },
    { label: 'North Side', value: 'north' },
    { label: 'South Hill', value: 'south' },
  ], required: true },
  { name: 'contactPerson', label: 'Primary Contact Person', type: 'text', placeholder: 'Name of Principal/Admin', required: true },
  { name: 'phone', label: 'Contact Phone', type: 'tel', placeholder: '+91 0000 0000', required: true },
  { name: 'email', label: 'Official Email', type: 'email', placeholder: 'contact@school.edu' },
];

interface SchoolAddFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const SchoolAddForm: React.FC<SchoolAddFormProps> = ({ onSuccess, onCancel }) => {
  const handleSubmit = (data: any) => {
    console.log('Registering New School:', data);
    alert(`Success: ${data.schoolName} has been added to the registry.`);
    onSuccess();
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2d8d9b] rounded-2xl flex items-center justify-center text-white shadow-lg">
            <School size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d]">New School Onboarding</h3>
            <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.3em] mt-1">Registry Entry • Admin Control</p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="px-6 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-[3rem] p-4 lg:p-8 border border-zinc-100 shadow-xl">
        <DynamicForm 
          title="School Credentials"
          subtitle="Please ensure all official contact details are accurate"
          fields={schoolFields}
          onSubmit={handleSubmit}
          submitLabel="Initialize School"
          columns={2}
        />
        
        <div className="mt-8 p-6 bg-[#fce4d4]/20 rounded-3xl border border-[#fce4d4]/40 flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-[#f2994a]/10 flex items-center justify-center shrink-0">
             <MapPin size={16} className="text-[#f2994a]" />
          </div>
          <p className="text-xs text-[#8b6b5a] font-medium leading-relaxed italic">
            Tip: Onboarding a new school will automatically enable uniform template assignments and class group creation for this institution.
          </p>
        </div>
      </div>
    </div>
  );
};
