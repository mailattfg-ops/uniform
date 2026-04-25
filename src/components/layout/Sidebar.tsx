'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Star, 
  Settings,
  Grid,
  Building2,
  Library,
  GraduationCap,
  ChevronLeft,
  Ruler,
  ShieldAlert,
  ChevronDown,
  User,
  Box,
} from 'lucide-react';

interface Subsection {
  label: string;
  href: string;
}

interface ModuleItem {
  icon: any;
  label: string;
  href: string;
  subsections: Subsection[];
}

const modules: ModuleItem[] = [
  { 
    icon: Star, label: 'Dashboard', href: '/dashboard',
    subsections: []
  },
  { 
    icon: Building2, label: 'Sector Operations', href: '/organizations/registry',
    subsections: [
      { label: 'Member Organizations', href: '/organizations/registry' },
      { label: 'Department Units', href: '/organizations/departments' },
      { label: 'Master Registry', href: '/entities/directory' },
      // { label: 'Functional Groups', href: '/entities/groups' }
    ]
  },
  { 
    icon: Ruler, label: 'Measurements', href: '/measurements/entry',
    subsections: [
      { label: 'Record Entry', href: '/measurements/entry' },
      { label: 'History', href: '/measurements/history' },
      { label: 'Industry Templates', href: '/measurements/templates' }
    ]
  },
  { 
    icon: ShieldAlert, label: 'Admin Controls', href: '/admin/settings',
    subsections: [
      { label: 'Industry Sectors', href: '/admin/industries' },
      { label: 'Measurement Setup', href: '/admin/measures' },
      { label: 'Product Registry', href: '/admin/products' },
      { label: 'Audit Logs', href: '/admin/audit' },
      { label: 'Staff Management', href: '/admin/employees' },
      { label: 'System Settings', href: '/admin/settings' },
      { label: 'User Roles', href: '/admin/roles' },
      { label: 'US Size Charts', href: '/admin/size-charts' }
    ]
  },
  {
    icon: Box, label: 'Inventory Hub', href: '/admin/inventory/fabrics',
    subsections: [
      { label: 'Fabric Catalog', href: '/admin/inventory/fabrics' },
      { label: 'Button Catalog', href: '/admin/inventory/buttons' },
      { label: 'Thread Catalog', href: '/admin/inventory/threads' },
      { label: 'Design Hub', href: '/admin/inventory/designs' },
    ]
  },
  { 
    icon: Settings, label: 'Settings', href: '/settings/profile',
    subsections: [
      { label: 'Profile', href: '/settings/profile' },
      // { label: 'Company Info', href: '/settings/company' }
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
  const [user, setUser] = useState<any>(null);

  // Load user on mount and sync with identity updates
  const loadUser = () => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener('storage', loadUser);
    return () => window.removeEventListener('storage', loadUser);
  }, []);

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
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-all duration-300 ease-in-out
        fixed lg:static inset-y-0 left-0 z-50
        ${isExpanded ? 'w-72' : 'w-24'}
        bg-[#F5CAAD] text-[#1a1d21]/70 flex flex-col border-r border-black/5 shadow-2xl
      `}>
        {/* Brand Identity Section */}
        <div className={`w-full justify-between h-24 flex items-center px-6 mb-6 transition-all bg-black/6 ${isExpanded ? 'active' : 'justify-center overflow-hidden'}`}>
          <div className="flex items-center gap-3">
             {!isExpanded ? (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                  <Image 
                    src="/logosmall.jpeg" 
                    alt="Inland Logo" 
                    width={40} 
                    height={40} 
                    className="object-contain"
                    priority
                  />
                </div>
              ):(
                <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                  <Image 
                    src="/logoimg.jpeg" 
                    alt="Inland Logo" 
                    width={140} 
                    height={40} 
                    className="object-contain"
                    priority
                  />
                </div>
              )}
          </div>

          <button 
            onClick={toggleSidebar}
            className={`w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 items-center justify-center transition-all hidden lg:flex ${!isExpanded ? 'rotate-180' : ''}`}
          >
            <ChevronLeft size={16} className="text-[#1a1d21]" />
          </button>
        </div>

        {/* Navigation Container */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col px-2">
          <nav className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-2">
            {modules.map((item) => {
              // Get user from localStorage safely
              const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
              const user = userStr ? JSON.parse(userStr) : null;
              const userPermissions = user?.permissions || [];
              const isAdmin = userPermissions.includes('all');

              // Permission Logic Mapping
              const modulePermissionMap: Record<string, string[]> = {
                'Industry Registry': ['view_schools', 'manage_classes', 'view_students', 'view_own_students'],
                'Measurements': ['manage_measurements'],
                'Admin Controls': ['manage_system'],
                'Inventory Hub': ['manage_system']
              };

              const requiredPermissions = modulePermissionMap[item.label] || [];
              const hasPermission = isAdmin || requiredPermissions.length === 0 || 
                                   requiredPermissions.some(rp => userPermissions.includes(rp));
              
              if (!hasPermission) {
                  return null;
              }

              const isPathActive = item.subsections.some(sub => pathname === sub.href || (sub.href !== '/' && pathname.startsWith(sub.href))) || 
                                   (item.href !== '/' && pathname === item.href) ||
                                   (item.label === 'Dashboard' && pathname === '/dashboard');
              const Icon = item.icon;
              const isOpen = activeMenu === item.label || (isPathActive && activeMenu === null);
              
              return (
                <div key={item.label} className={`transition-all ${isExpanded ? 'px-4' : 'px-0 flex flex-col items-center'}`}>
                  <div 
                    onClick={() => handleModuleClick(item)}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 w-full bg-black/6 cursor-pointer ${
                      isPathActive ? '!bg-white text-[#1a1d21] shadow-xl scale-105' : 'hover:bg-black/5 text-[#1a1d21] opacity-50 hover:opacity-100'
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
                        
                        // Sub-permission logic
                        const subPermissionMap: Record<string, string[]> = {
                          'Organizations Registry': ['view_schools'],
                          'Department Management': ['view_schools', 'manage_classes'],
                          'Entity Directory': ['view_students', 'view_own_students'],
                          'Entity Groups': ['view_students', 'view_own_students'],
                          'Profiles': ['view_students', 'view_own_students'],
                          'Record Entry': ['manage_measurements'],
                          'History': ['view_measurements'],
                          'Templates': ['manage_measurements'],
                          'Fabric Catalog': ['manage_system'],
                          'Button Catalog': ['manage_system'],
                          'Thread Catalog': ['manage_system'],
                          'Design Hub': ['manage_system']
                        };

                        const requiredSubPerms = subPermissionMap[sub.label] || [];
                        const hasSubPerm = isAdmin || requiredSubPerms.length === 0 || 
                                          requiredSubPerms.some(rp => userPermissions.includes(rp));

                        if (!hasSubPerm) return null;
                        
                        return (
                          <Link 
                            key={idx}
                            href={sub.href}
                            onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                            className={`flex items-center gap-3 group text-xs font-bold transition-all ${
                              isSubActive ? 'text-[#1a1d21]' : 'text-[#1a1d21]/40 hover:text-[#1a1d21]'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              isSubActive ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-black/20 group-hover:bg-black'
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

        {/* User Profile Footer */}
        <div className={`mt-auto p-4 border-t border-black/10 ${!isExpanded && 'flex justify-center'}`}>
           <div className={`flex items-center gap-3 p-3 rounded-2xl bg-black/5 group hover:bg-black/10 transition-all cursor-pointer ${!isExpanded && 'w-12 h-12 p-0 justify-center'}`}>
              <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0 overflow-hidden border border-black/5 group-hover:border-red-500/30 transition-all">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-red-500" />
                )}
              </div>
              {isExpanded && (
                <div className="flex flex-col min-w-0 pr-4">
                  <p className="text-xs font-black truncate leading-tight text-[#1a1d21]">
                    {user?.fullName || 'User Profile'}
                  </p>
                  <p className="text-[10px] font-bold text-[#1a1d21]/40 uppercase tracking-widest mt-0.5">
                    {user?.role || 'Portal'}
                  </p>
                </div>
              )}
           </div>
        </div>
      </aside>
    </>
  );
};
