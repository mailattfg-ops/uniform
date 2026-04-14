'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Eye, Clock, CheckCircle2, MoreHorizontal, User } from 'lucide-react';

interface MeasurementRecord {
  id: string;
  studentName: string;
  school: string;
  template: string;
  status: 'Pending' | 'Completed' | 'Draft';
  lastUpdated: string;
  staff: string;
}

const mockRecords: MeasurementRecord[] = [
  { id: 'M-101', studentName: 'James Wilson', school: 'Greenwood High', template: 'Boys Full Set', status: 'Completed', lastUpdated: '2024-04-12', staff: 'Sarah J.' },
  { id: 'M-102', studentName: 'Sophia Chen', school: 'Riverdale Academy', template: 'Girls Primary', status: 'Pending', lastUpdated: '2024-04-14', staff: 'Admin' },
  { id: 'M-103', studentName: 'Liam Garcia', school: 'Greenwood High', template: 'Boys Winter Set', status: 'Draft', lastUpdated: '2024-04-13', staff: 'Mike T.' },
  { id: 'M-104', studentName: 'Emma Brown', school: 'St. Xavier School', template: 'Girls Winter Set', status: 'Completed', lastUpdated: '2024-04-10', staff: 'Sarah J.' },
];

export const MeasurementTable: React.FC = () => {
  const columns: Column<MeasurementRecord>[] = [
    {
      header: 'Student & ID',
      accessor: (r) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] shadow-inner">
            <User size={18} />
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight text-foreground leading-none">{r.studentName}</p>
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] mt-1.5 opacity-70">RID-{r.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Uniform Template',
      accessor: (r) => (
        <div>
          <p className="font-bold text-[12px] tracking-tight text-foreground">{r.template}</p>
          <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-[0.1em] mt-1">{r.school}</p>
        </div>
      ),
    },
    {
      header: 'Last Update',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground">{r.lastUpdated}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            r.status === 'Completed' ? 'bg-success shadow-[0_0_8px_#22c55e]' : 
            r.status === 'Draft' ? 'bg-[#f2994a] shadow-[0_0_8px_#f2994a]' : 'bg-muted shadow-sm'
          }`} />
          <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${
            r.status === 'Completed' ? 'text-success' : 'text-foreground'
          }`}>
            {r.status}
          </span>
        </div>
      ),
    },
    {
      header: 'Captured By',
      accessor: (r) => (
        <span className="text-[10px] font-black text-[#8b6b5a] uppercase tracking-widest bg-[#fce4d4]/40 px-3 py-1 rounded-lg">
          {r.staff}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: () => (
        <div className="flex gap-1">
          <button className="p-2 h-auto hover:text-[#2d8d9b] transition-colors">
            <Eye size={18} />
          </button>
          <button className="p-2 h-auto text-muted-foreground">
            <MoreHorizontal size={18} />
          </button>
        </div>
      ),
      // className: 'text-right pr-6',
    },
  ];

  return (
    <DataTable 
      title="Measurement History"
      subtitle="Track Status of all captured measurements"
      columns={columns}
      data={mockRecords}
      searchPlaceholder="Search student or RID..."
    />
  );
};
