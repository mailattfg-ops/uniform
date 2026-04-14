'use client';

import React from 'react';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Eye, Edit2, MoreHorizontal, UserPlus, FileUp } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  class: string;
  school: string;
  status: 'Incomplete' | 'Completed' | 'Pending Payment' | 'Ordered';
  uniform: string;
}

const mockStudents: Student[] = [
  { id: '1', name: 'James Wilson', class: 'Grade 5', school: 'Greenwood High', status: 'Incomplete', uniform: 'Summer Prep' },
  { id: '2', name: 'Sophia Chen', class: 'Grade 3', school: 'Riverdale Academy', status: 'Completed', uniform: 'Full Set' },
  { id: '3', name: 'Liam Garcia', class: 'Grade 5', school: 'Greenwood High', status: 'Pending Payment', uniform: 'Winter Gear' },
  { id: '4', name: 'Emma Brown', class: 'Grade 1', school: 'St. Xavier School', status: 'Incomplete', uniform: 'Primary Set' },
  { id: '5', name: 'Noah Miller', class: 'Grade 2', school: 'Riverdale Academy', status: 'Ordered', uniform: 'Standard' },
];

export const StudentTable: React.FC = () => {
  const columns: Column<Student>[] = [
    {
      header: 'Student Name',
      accessor: (s) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center font-bold text-zinc-900 dark:text-zinc-100 text-[10px] shadow-sm">
            {s.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight text-foreground leading-none">{s.name}</p>
            <p className="text-[9px] text-[#2d8d9b] font-bold uppercase tracking-[0.1em] mt-1.5 opacity-80">SID-{s.id}2024</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Class / School',
      accessor: (s) => (
        <div className="flex flex-col gap-1">
          <p className="font-bold text-[12px] tracking-tight text-foreground">{s.class}</p>
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] leading-none">{s.school}</p>
        </div>
      ),
    },
    {
      header: 'Uniform Template',
      accessor: (s) => (
        <span className="px-4 py-1.5 bg-white dark:bg-zinc-900 rounded-full text-[9px] font-black uppercase tracking-[0.15em] text-[#2d8d9b] border border-[#fce4d4]">
          {s.uniform}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (s) => (
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
          s.status === 'Completed' ? 'text-success' : 'text-[#1a1a1a] dark:text-white'
        }`}>
          {s.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: () => (
        <div className="flex gap-1">
          <button className="p-2 h-auto text-muted-foreground hover:text-[#2d8d9b] transition-colors">
            <Eye size={18} />
          </button>
          <button className="p-2 h-auto text-muted-foreground hover:text-zinc-900 dark:hover:text-white transition-colors">
            <Edit2 size={16} />
          </button>
          <button className="p-2 h-auto text-muted-foreground hover:text-zinc-900 transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      ),
      className: 'text-center pr-6',
    },
  ];

  return (
    <DataTable 
      title="Student Directory"
      subtitle="Registry & Status Tracking"
      columns={columns}
      data={mockStudents}
      searchPlaceholder="Search by name, grade or ID..."
      headerAction={
        <div className="flex gap-2">
          <Link href="/students/registration">
            <Button className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#f2994a] hover:bg-[#e68a3d] text-white border-none shadow-lg shadow-orange-500/20">
              <UserPlus size={14} strokeWidth={3} />
              Register
            </Button>
          </Link>
          <Link href="/students/bulk-upload">
            <Button variant="secondary" className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 border border-[#fce4d4] text-[#3a525d] bg-white hover:bg-[#fce4d4]">
              <FileUp size={14} strokeWidth={3} />
              Bulk Upload
            </Button>
          </Link>
        </div>
      }
    />
  );
};
