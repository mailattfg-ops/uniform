'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Star, 
  Settings,
  Grid,
  Users,
  GraduationCap,
  ChevronLeft,
  Ruler,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

interface Subsection {
  label: string;
  href: string;
}

interface ModuleItem {
  icon: any;
  label: string;
  href: string; // Base href for icon click (first subsection)
  subsections: Subsection[];
}

const modules: ModuleItem[] = [
  { 
    icon: Star, label: 'Dashboard', href: '/dashboard',
    subsections: []
  },
  { 
    icon: GraduationCap, label: 'Students', href: '/students/directory',
    subsections: [
      { label: 'Directory', href: '/students/directory' },
      { label: 'Groups', href: '/students/groups' },
      { label: 'Profiles', href: '/students/profiles' }
    ]
  },
  { 
    icon: Ruler, label: 'Measurements', href: '/measurements/entry',
    subsections: [
      { label: 'Record Entry', href: '/measurements/entry' },
      { label: 'History', href: '/measurements/history' },
      { label: 'Templates', href: '/measurements/templates' }
    ]
  },
  { 
    icon: ShieldAlert, label: 'Admin Controls', href: '/admin/approvals',
    subsections: [
      { label: 'Approvals', href: '/admin/approvals' },
      { label: 'Audit Logs', href: '/admin/audit' },
      { label: 'Schools', href: '/admin/schools' },
      { label: 'Classes', href: '/admin/classes' },
      { label: 'Employees', href: '/admin/employees' }
    ]
  },
  { 
    icon: Settings, label: 'Settings', href: '/settings/profile',
    subsections: [
      { label: 'Profile', href: '/settings/profile' },
      { label: 'Company', href: '/settings/company' }
    ]
  },
];

import { useLayout } from '@/hooks/useLayout';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen, toggleSidebar: toggleMobileSidebar } = useLayout();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const handleModuleClick = (item: ModuleItem) => {
    if (item.subsections.length > 0) {
      setActiveMenu(activeMenu === item.label ? null : item.label);
    } else {
      router.push(item.href);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 lg:hidden ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Content */}
      <aside 
        className={`bg-[#3a525d] text-white transition-all duration-500 ease-in-out h-full flex flex-col z-[100] overflow-hidden 
          fixed lg:relative left-0 top-0 bottom-0 shadow-2xl shrink-0
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-0 lg:w-auto'}
          ${isExpanded && !isSidebarOpen ? 'lg:w-64' : !isSidebarOpen ? 'lg:w-20' : 'w-64'}
        `}
      >
        <div className="w-64 lg:w-full flex flex-col h-full shrink-0">
        {/* Brand Section */}
        <div className={`flex items-center justify-between py-8 transition-all ${isExpanded ? 'px-6' : 'px-0 flex-col gap-4'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg shrink-0">
              <Grid className="text-[#3a525d]" size={20} fill="currentColor" />
            </div>
            {isExpanded && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-sm font-black tracking-[0.2em] leading-none">INLAND UNIFORM</span>
                <span className="text-[10px] opacity-40 font-bold tracking-widest mt-0.5 uppercase">Enterprise</span>
              </div>
            )}
          </div>

          <button 
            onClick={toggleSidebar}
            className={`w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition-all hidden lg:flex ${!isExpanded ? 'rotate-180' : ''}`}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Navigation Container */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col px-2">
          <nav className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-2">
            {modules.map((item) => {
              const isPathActive = pathname.startsWith(item.href.split('/').slice(0, 2).join('/'));
              const Icon = item.icon;
              const isOpen = activeMenu === item.label || (isPathActive && activeMenu === null);
              
              return (
                <div key={item.label} className={`transition-all ${isExpanded ? 'px-4' : 'px-0 flex flex-col items-center'}`}>
                  <div 
                    onClick={() => handleModuleClick(item)}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 w-full cursor-pointer ${
                      isPathActive ? 'bg-white text-[#3a525d] shadow-xl scale-105' : 'hover:bg-white/10 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="shrink-0">
                        <Icon size={20} strokeWidth={isPathActive ? 2.5 : 2} />
                      </div>
                      {isExpanded && (
                        <span className="text-sm font-black tracking-tight animate-in fade-in slide-in-from-left-4">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {isExpanded && item.subsections.length > 0 && (
                      <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                  </div>

                  {isExpanded && isOpen && item.subsections.length > 0 && (
                    <div className="ml-10 mt-3 space-y-3 animate-in fade-in slide-in-from-top-4 duration-700 pb-2">
                      {item.subsections.map((sub, idx) => {
                        const isSubActive = pathname === sub.href;
                        
                        return (
                          <Link 
                            key={idx}
                            href={sub.href}
                            onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                            className={`flex items-center gap-3 group text-xs font-bold transition-all ${
                              isSubActive ? 'text-white' : 'text-white/40 hover:text-white'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              isSubActive ? 'bg-[#f2994a] shadow-[0_0_8px_#f2994a]' : 'bg-white/20 group-hover:bg-white'
                            }`} />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="h-4 w-full bg-black/10" />
        </div>
      </aside>
    </>
  );
};
