'use client';

import React, { useState } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { School, MapPin, Phone, Users, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SchoolAddForm } from './SchoolAddForm';

interface SchoolData {
  id: string;
  name: string;
  location: string;
  students: number;
  contact: string;
}

const mockSchools: SchoolData[] = [
  { id: 'SCH-001', name: 'Greenwood High', location: 'Downtown', students: 450, contact: '+91 123456789' },
  { id: 'SCH-002', name: 'Riverdale Academy', location: 'North Side', students: 320, contact: '+91 987654321' },
  { id: 'SCH-003', name: 'St. Xavier School', location: 'South Hill', students: 512, contact: '+91 555444333' },
];

export const SchoolTable: React.FC = () => {
  const [view, setView] = useState<'list' | 'add'>('list');

  const columns: Column<SchoolData>[] = [
    {
      header: 'School Info',
      accessor: (s) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <School size={18} />
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight text-foreground leading-none">{s.name}</p>
            <p className="text-[9px] text-[#2d8d9b] font-bold uppercase tracking-[0.1em] mt-1.5 opacity-80">ID-{s.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: (s) => (
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-muted-foreground" />
          <span className="text-[11px] font-bold text-foreground">{s.location}</span>
        </div>
      ),
    },
    {
       header: 'Students',
       accessor: (s) => (
         <div className="flex items-center gap-2">
           <Users size={12} className="text-muted-foreground" />
           <span className="text-[11px] font-black">{s.students}</span>
         </div>
       ),
    },
    {
       header: 'Contact',
       accessor: (s) => (
         <div className="flex items-center gap-2">
           <Phone size={12} className="text-muted-foreground" />
           <span className="text-[11px] font-bold tracking-tight">{s.contact}</span>
         </div>
       ),
    },
  ];

  if (view === 'add') {
    return <SchoolAddForm onSuccess={() => setView('list')} onCancel={() => setView('list')} />;
  }

  return (
    <DataTable 
      title="Schools Registry"
      subtitle="Manage all partner schools"
      columns={columns}
      data={mockSchools}
      headerAction={
        <Button 
          onClick={() => setView('add')}
          className="gap-2 text-[10px] items-center rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#2d8d9b] text-white hover:bg-[#3a525d] shadow-lg hover:scale-105 transition-all"
        >
          <PlusCircle size={16} />
          Add School
        </Button>
      }
    />
  );
};
