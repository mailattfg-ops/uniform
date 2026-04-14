'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StudentRegisterForm } from '../_components/StudentRegisterForm';

export default function StudentRegistrationPage() {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <Link 
        href="/students/directory"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] hover:text-[#3a525d] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={3} />
        Back to Directory
      </Link>
      <StudentRegisterForm />
    </div>
  );
}
