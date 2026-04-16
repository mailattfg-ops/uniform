'use client';

import React from 'react';
import { StudentTable } from '../_components/StudentTable';

export default function StudentDirectoryPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Quick Stats (Keep as part of directory) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="p-4 md:p-6 bg-[#fce4d4] dark:bg-zinc-900 rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between h-28 md:h-32 shadow-lg border border-white dark:border-zinc-800">
          <span className="font-black text-[9px] md:text-[11px] text-[#8b6b5a] dark:text-zinc-500 uppercase tracking-widest">Total Students</span>
          <h4 className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#1a1a1a] dark:text-zinc-100">1,248</h4>
        </div>
        <div className="p-4 md:p-6 bg-[#6fa1ac]/10 dark:bg-zinc-900 rounded-[2rem] md:rounded-[2.5rem] border border-[#6fa1ac]/30 dark:border-zinc-800 flex flex-col justify-between h-28 md:h-32">
          <span className="font-black text-[9px] md:text-[11px] text-[#2d8d9b] dark:text-zinc-500 uppercase tracking-widest">Pending Measures</span>
          <h4 className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#2d8d9b] dark:text-zinc-100">84</h4>
        </div>
        <div className="p-4 md:p-6 bg-[#f2994a] dark:bg-orange-600/20 rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between h-28 md:h-32 shadow-lg border-white dark:border-orange-500/20">
          <span className="font-black text-[9px] md:text-[11px] text-white dark:text-orange-200 uppercase tracking-widest leading-none">Completed Orders</span>
          <h4 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white">312</h4>
        </div>
      </div>
      <StudentTable />
    </div>
  );
}
