'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, FileUp, Users, ChevronRight, Building2, History, Ruler } from 'lucide-react';

export default function EntitiesRoot() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        const roleLower = (user?.role || '').toLowerCase();
        const isClientEntity = Boolean(user?.memberId || ['entity', 'student', 'member'].includes(roleLower));
        const isClientOrg = !isClientEntity && Boolean(user?.organizationId || ['organisation', 'organization', 'school'].includes(roleLower));

        if (isClientEntity) {
          router.replace('/measurements/history');
          return;
        }
        if (isClientOrg && user?.organizationId) {
          router.replace(`/organizations/registry/${user.organizationId}?tab=entities`);
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setLoading(false);
  }, [router]);

  const actions = [
    {
      title: 'Organization Rosters & Directories',
      description: 'Access entity member directories, manage active student/employee rosters by partner organization.',
      href: '/organizations/registry',
      icon: Building2,
      color: 'bg-[#2d8d9b]',
      lightColor: 'bg-[#2d8d9b]/10',
      textColor: 'text-[#3a525d]',
      actionText: 'Open Registry'
    },
    {
      title: 'Capture Measurements',
      description: 'Record body measurements, assign standard size charts, and verify entity uniform fittings.',
      href: '/measurements/entry',
      icon: Ruler,
      color: 'bg-[#CC9448]',
      lightColor: 'bg-[#CC9448]/10',
      textColor: 'text-[#8b6b5a]',
      actionText: 'Enter Sizes'
    },
    {
      title: 'Measurement Archives & History',
      description: 'Review full history of member measurements, approval states, and historical fitting logs.',
      href: '/measurements/history',
      icon: History,
      color: 'bg-[#3a525d]',
      lightColor: 'bg-[#3a525d]/10',
      textColor: 'text-[#3a525d]',
      actionText: 'View History'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#2d8d9b] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 py-4 md:py-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-[#3a525d]">
          Entity & Member Hub
        </h1>
        <p className="text-[10px] md:text-sm font-bold text-[#2d8d9b] uppercase tracking-[0.2em] opacity-80">
          Directory Management, Measurements & Rosters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {actions.map((action, idx) => (
          <Link 
            key={idx} 
            href={action.href}
            className="group relative flex flex-col justify-between p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-white border border-zinc-150 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 overflow-hidden"
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
    </div>
  );
}
