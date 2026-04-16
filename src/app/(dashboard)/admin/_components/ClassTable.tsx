'use client';

import React, { useState } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Layers, Grid, PlusCircle } from 'lucide-react';
import { ClassAddForm } from './ClassAddForm';

interface ClassData {
  id: string;
  name: string;
  section: string;
  school: string;
  count: number;
}

const mockClasses: ClassData[] = [
  { id: 'CLS-01', name: 'Grade 5', section: 'A', school: 'Greenwood High', count: 42 },
  { id: 'CLS-02', name: 'Grade 5', section: 'B', school: 'Greenwood High', count: 38 },
  { id: 'CLS-03', name: 'Grade 3', section: 'Primary', school: 'Riverdale Academy', count: 35 },
];

export const ClassTable: React.FC = () => {
  const [view, setView] = useState<'list' | 'add'>('list');

  const columns: Column<ClassData>[] = [
    {
      header: 'Class / Section',
      accessor: (c) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#f2994a]/10 flex items-center justify-center text-[#f2994a] shadow-sm">
            <Layers size={18} />
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight text-foreground leading-none">{c.name}</p>
            <p className="text-[9px] text-[#8b6b5a] font-bold uppercase tracking-[0.1em] mt-1.5 opacity-80">Section {c.section}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'School',
      accessor: (c) => (
        <span className="text-[11px] font-bold text-foreground opacity-90">{c.school}</span>
      ),
    },
    {
       header: 'Students',
       accessor: (c) => (
         <div className="flex items-center gap-2">
           <Grid size={12} className="text-[#2d8d9b]" />
           <span className="text-[11px] font-black italic">{c.count}</span>
         </div>
       ),
    },
  ];

  if (view === 'add') {
    return <ClassAddForm onSuccess={() => setView('list')} onCancel={() => setView('list')} />;
  }

  return (
    <DataTable 
      title="Class Management"
      subtitle="Registry & section tracking"
      columns={columns}
      data={mockClasses}
      headerAction={
        <Button 
          onClick={() => setView('add')}
          className="gap-2 text-[10px] items-center rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#f2994a] text-white hover:bg-[#d97d2d] shadow-lg hover:scale-105 transition-all"
        >
          <PlusCircle size={16} />
          Add Class
        </Button>
      }
    />
  );
};
