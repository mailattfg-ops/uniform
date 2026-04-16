'use client';

import React, { useState } from 'react';
import { StudentTable } from '../_components/StudentTable';
import { StudentRegisterForm } from '../_components/StudentRegisterForm';
import { BulkUpload } from '../_components/BulkUpload';
import { ArrowLeft } from 'lucide-react';

type ViewState = 'list' | 'register' | 'bulk';

export default function StudentDirectoryPage() {
  const [view, setView] = useState<ViewState>('list');

  const renderContent = () => {
    switch (view) {
      case 'register':
        return (
          <div className="space-y-6">
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] hover:text-[#3a525d] transition-colors mb-4"
            >
              <ArrowLeft size={14} />
              Back to List
            </button>
            <StudentRegisterForm />
          </div>
        );
      case 'bulk':
        return (
          <div className="space-y-6">
             <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] hover:text-[#3a525d] transition-colors mb-4"
            >
              <ArrowLeft size={14} />
              Back to List
            </button>
            <BulkUpload />
          </div>
        );
      default:
        return (
          <div className="space-y-6 md:space-y-8">
            {/* Quick Stats (Keep as part of directory) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="p-4 md:p-6 bg-[#fce4d4] rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between h-28 md:h-32 shadow-lg border border-white">
                <span className="font-black text-[9px] md:text-[11px] text-[#8b6b5a] uppercase tracking-widest">Total Students</span>
                <h4 className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#1a1a1a]">1,248</h4>
              </div>
              <div className="p-4 md:p-6 bg-[#6fa1ac]/10 rounded-[2rem] md:rounded-[2.5rem] border border-[#6fa1ac]/30 flex flex-col justify-between h-28 md:h-32">
                <span className="font-black text-[9px] md:text-[11px] text-[#2d8d9b] uppercase tracking-widest">Pending Measures</span>
                <h4 className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#2d8d9b]">84</h4>
              </div>
              <div className="p-4 md:p-6 bg-[#f2994a] rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between h-28 md:h-32 shadow-lg border-white">
                <span className="font-black text-[9px] md:text-[11px] text-white uppercase tracking-widest leading-none">Completed Orders</span>
                <h4 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white">312</h4>
              </div>
            </div>
            <StudentTable 
              onRegister={() => setView('register')} 
              onBulkUpload={() => setView('bulk')} 
            />
          </div>
        );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderContent()}
    </div>
  );
}
