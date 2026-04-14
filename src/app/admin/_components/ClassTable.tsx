'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { GraduationCap, Layers, Grid } from 'lucide-react';

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
  const columns: Column<ClassData>[] = [
    {
      header: 'Class / Section',
      accessor: (c) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#f2994a]/10 flex items-center justify-center text-[#f2994a] shadow-sm">
            <Layers size={18} />
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight">{c.name}</p>
            <p className="text-[9px] text-[#8b6b5a] font-bold uppercase tracking-[0.1em] mt-1">Section {c.section}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'School',
      accessor: (c) => (
        <span className="text-[11px] font-black uppercase tracking-widest text-[#2d8d9b]">{c.school}</span>
      ),
    },
    {
       header: 'Total Students',
       accessor: (c) => (
         <div className="flex items-center gap-2">
           <Grid size={12} className="text-muted-foreground" />
           <span className="text-[11px] font-black">{c.count}</span>
         </div>
       ),
    },
  ];

  return (
    <DataTable 
      title="Class Management"
      subtitle="Organize students by grade and section"
      columns={columns}
      data={mockClasses}
    />
  );
};
