'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { FileUp, Download, Info, ArrowLeft } from 'lucide-react';

export const BulkUpload: React.FC = () => {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-border p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-6">
      <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary">
        <FileUp size={40} />
      </div>
      
      <div>
        <h3 className="text-xl font-black italic tracking-tight">Bulk Import Students</h3>
        <p className="max-w-xs text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">
          Upload your Excel or CSV file to register multiple students at once.
        </p>
      </div>

      <div className="flex gap-4">
        <Button variant="primary" className="px-10 rounded-2xl shadow-xl shadow-primary/20">
          Choose File
        </Button>
        <Button variant="secondary" className="gap-2 rounded-2xl border border-border">
          <Download size={18} />
          Template
        </Button>
      </div>

      <button 
        onClick={() => router.push('/students/directory')}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] hover:text-[#3a525d] transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Directory
      </button>

      <div className="flex items-center gap-2 text-warning bg-warning/5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-warning/10">
        <Info size={14} />
        Ensure columns match the sample template EXACTLY
      </div>
    </div>
  );
};
