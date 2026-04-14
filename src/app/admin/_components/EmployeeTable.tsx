'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { UserCheck, Shield, Briefcase, Mail } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'Active' | 'On Leave' | 'Terminated';
}

const mockEmployees: Employee[] = [
  { id: 'EMP-01', name: 'Sarah Johnson', role: 'Staff / Measurer', email: 'sarah.j@uniform.erp', status: 'Active' },
  { id: 'EMP-02', name: 'Mike Thompson', role: 'Inventory Manager', email: 'mike.t@uniform.erp', status: 'Active' },
  { id: 'EMP-03', name: 'James Wilson', role: 'Administrator', email: 'admin@uniform.erp', status: 'Active' },
];

export const EmployeeTable: React.FC = () => {
  const columns: Column<Employee>[] = [
    {
      header: 'Employee Name',
      accessor: (e) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] shadow-sm">
            <UserCheck size={18} />
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight">{e.name}</p>
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] mt-1">{e.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Professional Role',
      accessor: (e) => (
        <div className="flex items-center gap-2">
          <Briefcase size={12} className="text-[#8b6b5a]" />
          <span className="text-[11px] font-bold text-[#8b6b5a] uppercase tracking-widest">{e.role}</span>
        </div>
      ),
    },
    {
       header: 'Contact Info',
       accessor: (e) => (
         <div className="flex items-center gap-2">
           <Mail size={12} className="text-muted-foreground" />
           <span className="text-[11px] font-medium text-muted-foreground">{e.email}</span>
         </div>
       ),
    },
    {
       header: 'Status',
       accessor: (e) => (
         <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-success/10 text-success`}>
           {e.status}
         </span>
       ),
    },
  ];

  return (
    <DataTable 
      title="Employee Directory"
      subtitle="Manage internal staff and permissions"
      columns={columns}
      data={mockEmployees}
    />
  );
};
