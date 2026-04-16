'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';

const studentFields: FormField[] = [
  { 
    name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'e.g. Alex Johnson', required: true 
  },
  { 
    name: 'admissionNo', label: 'Admission Number', type: 'text', placeholder: 'e.g. SD-2024-001', required: true 
  },
  { 
    name: 'school', label: 'School', type: 'select', 
    options: [
      { label: 'Greenwood High', value: 'greenwood' },
      { label: 'Riverdale Academy', value: 'riverdale' },
      { label: 'St. Xavier School', value: 'xavier' },
    ],
    required: true 
  },
  { 
    name: 'class', label: 'Class / Grade', type: 'select', 
    options: [
      { label: 'Grade 1', value: '1' },
      { label: 'Grade 2', value: '2' },
      { label: 'Grade 3', value: '3' },
    ],
    required: true 
  },
  { 
    name: 'guardianName', label: 'Guardian Name', type: 'text', placeholder: 'Father / Mother name' 
  },
  { 
    name: 'contactMobile', label: 'Contact Mobile', type: 'tel', placeholder: 'e.g. +91 9876543210' 
  },
];

interface StudentRegisterFormProps {
  onCancel?: () => void;
}

export const StudentRegisterForm: React.FC<StudentRegisterFormProps> = ({ onCancel }) => {
  const router = useRouter();

  const handleSubmit = (data: any) => {
    console.log('Registering Student:', data);
    alert(`Success: ${data.fullName} has been registered!`);
    if (onCancel) onCancel();
    else router.push('/students/directory');
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else router.push('/students/directory');
  };

  return (
    <div className="space-y-6">
      <DynamicForm 
        title="Student Registration"
        subtitle="Manual Entry for New Students"
        fields={studentFields}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Register Student"
        columns={2}
      />
      
      {/* Informational Note (Themed) */}
      <div className="max-w-5xl mx-auto bg-[#6fa1ac]/5 p-6 rounded-[2rem] border border-[#6fa1ac]/20">
        <p className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-[0.2em] mb-1">💡 System Notice</p>
        <p className="text-xs text-muted-foreground font-medium italic">
          Uniform templates and measurement requirements will be auto-calculated based on the selected Class and School during registration.
        </p>
      </div>
    </div>
  );
};
