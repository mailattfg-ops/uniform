'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Check, X, Eye, ShieldAlert, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ApprovalItem {
  id: string;
  studentName: string;
  module: string;
  requestType: string;
  submittedBy: string;
  date: string;
  priority: 'High' | 'Medium' | 'Low';
}

const mockApprovals: ApprovalItem[] = [
  { id: 'REQ-01', studentName: 'James Wilson', module: 'Measurements', requestType: 'Modification', submittedBy: 'Sarah J.', date: '2024-04-14', priority: 'High' },
  { id: 'REQ-02', studentName: 'Sophia Chen', module: 'Registration', requestType: 'New Entry', submittedBy: 'Admin', date: '2024-04-14', priority: 'Low' },
  { id: 'REQ-03', studentName: 'Liam Garcia', module: 'Order', requestType: 'Bulk Change', submittedBy: 'Mike T.', date: '2024-04-13', priority: 'Medium' },
];

export const ApprovalTable: React.FC = () => {
  const columns: Column<ApprovalItem>[] = [
    {
      header: 'Request Info',
      accessor: (r) => (
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
            r.priority === 'High' ? 'bg-error/10 text-error' : 'bg-[#2d8d9b]/10 text-[#2d8d9b]'
          }`}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight">{r.requestType}</p>
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] mt-1 italic">{r.id}</p>
          </div>
        </div>
      ),
    },
    {
       header: 'Student / Target',
       accessor: (r) => (
         <div>
           <p className="font-bold text-[12px] tracking-tight">{r.studentName}</p>
           <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-[0.1em] mt-1">{r.module}</p>
         </div>
       ),
    },
    {
       header: 'Submitted By',
       accessor: (r) => (
         <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[8px] font-black border border-zinc-200">
             {r.submittedBy.charAt(0)}
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">{r.submittedBy}</p>
         </div>
       ),
    },
    {
       header: 'Actions',
       accessor: () => (
         <div className="flex gap-2">
           <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all shadow-sm">
             <Check size={18} />
           </button>
           <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm">
             <X size={18} />
           </button>
           <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-all text-muted-foreground">
             <Eye size={18} />
           </button>
         </div>
       ),
      //  className: 'text-right pr-6',
    },
  ];

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-[#fce4d4]/40 border-2 border-white rounded-[2.5rem] flex items-center gap-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#f2994a] shadow-sm">
              <History size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Awaiting Review</p>
              <h4 className="text-3xl font-black italic tracking-tighter">14</h4>
            </div>
          </div>
       </div>
       <DataTable 
         title="Pending Approvals" 
         subtitle="Data verification and system control center"
         columns={columns} 
         data={mockApprovals} 
       />
    </div>
  );
};
