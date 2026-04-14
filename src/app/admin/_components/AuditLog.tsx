'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Activity, Clock, Edit, UserPlus, Database } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  details: string;
  time: string;
  impact: 'Low' | 'Medium' | 'High';
}

const mockLogs: AuditEntry[] = [
  { id: 'LOG-001', action: 'Login', user: 'Admin', details: 'Successful login from 192.168.1.1', time: '10:05 AM', impact: 'Low' },
  { id: 'LOG-002', action: 'Update', user: 'Sarah J.', details: 'Updated measurements for RID-M-101', time: '11:30 AM', impact: 'Medium' },
  { id: 'LOG-003', action: 'Delete', user: 'System', details: 'Auto-purged temporary cache logs', time: '12:00 PM', impact: 'Low' },
];

export const AuditLog: React.FC = () => {
  const getActionIcon = (action: string) => {
    if (action === 'Login') return <Activity size={16} className="text-success" />;
    if (action === 'Update') return <Edit size={16} className="text-[#2d8d9b]" />;
    return <Database size={16} className="text-muted-foreground" />;
  };

  const columns: Column<AuditEntry>[] = [
    {
      header: 'System Activity',
      accessor: (l) => (
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100">
            {getActionIcon(l.action)}
          </div>
          <div>
            <p className="font-bold text-[12px]">{l.action}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5 tracking-widest">{l.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Performed By',
      accessor: (l) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">{l.user}</span>
      ),
    },
    {
       header: 'Event Details',
       accessor: (l) => (
         <p className="text-xs text-muted-foreground font-medium italic">"{l.details}"</p>
       ),
    },
    {
       header: 'Timestamp',
       accessor: (l) => (
         <div className="flex items-center gap-2 text-muted-foreground">
           <Clock size={12} />
           <span className="text-[10px] font-bold tracking-widest">{l.time}</span>
         </div>
       ),
    },
  ];

  return (
    <DataTable 
      title="Audit Logs" 
      subtitle="Complete system trace and activity monitoring"
      columns={columns} 
      data={mockLogs} 
    />
  );
};
