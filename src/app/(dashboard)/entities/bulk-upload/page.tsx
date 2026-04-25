'use client';

import React from 'react';
import { BulkUpload } from '../_components/BulkUpload';
import { useRouter } from 'next/navigation';

export default function BulkUploadPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Bulk Registration</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Excel Data Sync</p>
        </div>
      </div>

      <BulkUpload onComplete={() => router.push('/students/directory')} />
    </div>
  );
}
