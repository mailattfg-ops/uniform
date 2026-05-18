'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, FileUp, Users, ChevronRight } from 'lucide-react';

export default function StudentsRoot() {
  const actions = [
    {
      title: 'Student Directory',
      description: 'View and manage the complete list of registered students, track status, and edit profiles.',
      href: '/students/directory',
      icon: Users,
      color: 'bg-[#6fa1ac]',
      lightColor: 'bg-[#6fa1ac]/10',
      textColor: 'text-[#3a525d]',
      actionText: 'View Directory'
    },
    {
      title: 'Single Registration',
      description: 'Add a new student to the system manually by filling out the registration form.',
      href: '/students/registration',
      icon: UserPlus,
      color: 'bg-[#f2994a]',
      lightColor: 'bg-[#f2994a]/10',
      textColor: 'text-[#8b6b5a]',
      actionText: 'Register Now'
    },
    {
      title: 'Bulk Upload',
      description: 'Import multiple student records at once using an Excel or CSV file template.',
      href: '/students/bulk-upload',
      icon: FileUp,
      color: 'bg-[#3a525d]',
      lightColor: 'bg-[#3a525d]/10',
      textColor: 'text-[#3a525d]',
      actionText: 'Upload CSV'
    }
  ];

  return (
    <div className="space-y-8 md:space-y-12 py-4 md:py-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-[#3a525d]">
          Student Management
        </h1>
        <p className="text-[10px] md:text-sm font-bold text-[#2d8d9b] uppercase tracking-[0.2em] opacity-80">
          Registry, Registration & Bulk Operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {actions.map((action, idx) => (
          <Link 
            key={idx} 
            href={action.href}
            className="group relative flex flex-col justify-between p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-white border border-[#fce4d4] shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 overflow-hidden"
          >
            {/* Background Accent */}
            <div className={`absolute -right-12 -top-12 w-32 md:w-48 h-32 md:h-48 ${action.lightColor} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />
            
            <div className="relative z-10">
              <div className={`w-12 md:w-16 h-12 md:h-16 ${action.color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 md:mb-8 group-hover:rotate-6 transition-transform duration-500`}>
                <action.icon size={28} strokeWidth={2.5} />
              </div>
              
              <h3 className={`text-xl md:text-2xl font-black italic tracking-tight ${action.textColor} mb-3 md:mb-4`}>
                {action.title}
              </h3>
              
              <p className="text-xs md:text-sm font-medium text-zinc-500 leading-relaxed mb-6 md:mb-8">
                {action.description}
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#2d8d9b]">
              {action.actionText}
              <ChevronRight size={14} className="group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Info / Stats Footer */}
      <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-[#fce4d4]/20 border border-[#fce4d4] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-white shadow-xl flex items-center justify-center shrink-0">
             <Users className="text-[#2d8d9b]" size={24} />
          </div>
          <div>
            <h4 className="text-lg md:text-xl font-black italic text-[#3a525d]">Total Registered Students</h4>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] mt-1">Updated 2 minutes ago</p>
          </div>
        </div>
        <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-[#3a525d]">
          1,248
        </div>
      </div>
    </div>
  );
}
