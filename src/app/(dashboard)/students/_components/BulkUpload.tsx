'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { FileUp, Download, Info } from 'lucide-react';

interface BulkUploadProps {
  onCancel?: () => void;
}

export const BulkUpload: React.FC<BulkUploadProps> = () => {
  return (
    <div className="bg-white border-2 border-dashed border-[#fce4d4] p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-6">
      <div className="w-20 h-20 bg-[#2d8d9b]/5 rounded-3xl flex items-center justify-center text-[#2d8d9b]">
        <FileUp size={40} />
      </div>
      
      <div>
        <h3 className="text-xl font-black italic tracking-tight text-[#3a525d]">Bulk Import Students</h3>
        <p className="max-w-xs text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">
          Upload your Excel or CSV file to register multiple students at once.
        </p>
      </div>

      <div className="flex gap-4">
        <Button variant="primary" className="px-10 rounded-2xl shadow-xl shadow-[#2d8d9b]/20 bg-[#2d8d9b] text-white">
          Choose File
        </Button>
        <Button variant="secondary" className="gap-2 rounded-2xl border border-[#fce4d4] bg-white text-[#3a525d]">
          <Download size={18} />
          Template
        </Button>
      </div>

      <div className="flex items-center gap-2 text-[#f2994a] bg-[#f2994a]/5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#f2994a]/10">
        <Info size={14} />
        Ensure columns match the sample template EXACTLY
      </div>
    </div>
  );
};
