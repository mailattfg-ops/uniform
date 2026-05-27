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
  TrendingUp,
  Calculator,
  Package,
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
      { label: 'Organization', href: '/organizations/registry' },
      { label: 'Department Units', href: '/organizations/departments' },
      { label: 'Entity', href: '/entities/directory' }
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
      { label: 'Measurements Approvals', href: '/admin/approvals/measurements' },
      { label: 'Audit Logs', href: '/admin/audit' },
      { label: 'Staff Management', href: '/admin/employees' },
      { label: 'Company Profile & Bank', href: '/admin/company' },
      { label: 'User Roles', href: '/admin/roles' },
      { label: 'US Size Charts', href: '/admin/size-charts' }
    ]
  },
  {
    icon: Box, label: 'Product Managment', href: '/admin/products',
    subsections: [
      { label: 'Product Registry', href: '/admin/products' },
      { label: 'Product Types', href: '/admin/product-types' },
      { label: 'Group Design Catalog', href: '/admin/designs' },
      { label: 'Design Number Catalog', href: '/admin/design-numbers' },
      { label: 'Fabric Catalog', href: '/admin/inventory/fabrics' },
      { label: 'Button Catalog', href: '/admin/inventory/buttons' },
      { label: 'Thread Catalog', href: '/admin/inventory/threads' },
      { label: 'Purchase Orders', href: '/admin/purchase-orders' },
    ]
  },
  {
    icon: Package, label: 'Inventory', href: '/admin/inventory/product-stock',
    subsections: [
      { label: 'Product Stock', href: '/admin/inventory/product-stock' },
      { label: 'Fabric Stock', href: '/admin/inventory/fabric-stock' },
      { label: 'Thread Stock', href: '/admin/inventory/thread-stock' },
      { label: 'Button Stock', href: '/admin/inventory/button-stock' }
    ]
  },
  {
    icon: TrendingUp, label: 'Marketing', href: '/marketing/quotations',
    subsections: [
      { label: 'Quotation', href: '/marketing/quotations' },
      { label: 'Operation Team', href: '/marketing/operation-team' },
      { label: 'Initial Payment', href: '/marketing/initial-payment' },
      { label: 'Order Placement', href: '/marketing/order-placement' }
    ]
  },
  {
    icon: Calculator, label: 'SAM Managment', href: '/sam-management/calculator',
    subsections: [
      { label: 'SAM Calculator', href: '/sam-management/calculator' },
      { label: 'SAM Configurations', href: '/sam-management/configurations' },
      { label: 'Reports', href: '/sam-management/reports' },
      { label: 'Fabric SAM', href: '/sam-management/fabric' }
    ]
  },
  {
    icon: Settings, label: 'Settings', href: '/settings/profile',
    subsections: [
      { label: 'Profile', href: '/settings/profile' }
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
        className={`fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Content */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-all duration-300 ease-in-out
        fixed lg:static inset-y-0 left-0 z-50
        ${isExpanded ? 'w-72' : 'w-24'}
        bg-[#030303] text-white flex flex-col border-r border-white/5 shadow-2xl h-full
      `}>
        {/* Brand Identity Section */}
        <div className={`w-full justify-between h-24 flex items-center px-6 mb-6 transition-all border-b border-white/5 ${isExpanded ? 'active' : 'justify-center overflow-hidden'}`}>
          <div className="flex items-center gap-3">
            {!isExpanded ? (
              <div className="w-8 h-8 rounded-lg border border-white flex items-center justify-center animate-in fade-in duration-500 shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 2l4 2-1 8 4 6-5 4-5-4 4-6-1-8zm2 0v10" />
                </svg>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-4 duration-500 shrink-0">
                <div className="w-8 h-8 rounded-lg border border-white flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 2l4 2-1 8 4 6-5 4-5-4 4-6-1-8zm2 0v10" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black tracking-[0.2em] text-white leading-none">FORMA</span>
                  <span className="text-[8px] font-bold tracking-[0.2em] text-white/50 leading-none mt-1">APPARELS</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className={`w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-all hidden lg:flex ${!isExpanded ? 'rotate-180' : ''}`}
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
        </div>

        {/* Navigation Container */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col px-2">
          <nav className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-1.5">
            {modules.map((item) => {
              // Use the user state loaded in useEffect
              const userPermissions = user?.permissions || [];
              const isAdmin = userPermissions.includes('all');

              // Permission Logic Mapping - Must match Modules array labels exactly
              const modulePermissionMap: Record<string, string[]> = {
                'Sector Operations': ['view_schools', 'manage_schools', 'view_students', 'register_students'],
                'Measurements': ['manage_measurements', 'view_measurements', 'view_own_measurements'],
                'Admin Controls': ['manage_system', 'view_audit_logs'],
                'Product Managment': ['manage_inventory', 'view_inventory', 'manage_products', 'view_products'],
                'Marketing': ['manage_quotations', 'view_quotations'],
                'SAM Managment': ['manage_products', 'view_products', 'manage_quotations', 'view_quotations']
              };

              const requiredPermissions = modulePermissionMap[item.label] || [];
              const hasPermission = isAdmin || requiredPermissions.length === 0 ||
                requiredPermissions.some(rp => userPermissions.includes(rp));

              if (!hasPermission) return null;

              const isPathActive = item.subsections.some(sub => pathname === sub.href || (sub.href !== '/' && pathname.startsWith(sub.href))) ||
                (item.href !== '/' && pathname === item.href) ||
                (item.label === 'Dashboard' && pathname === '/dashboard');
              const Icon = item.icon;
              const isOpen = activeMenu === item.label || (isPathActive && activeMenu === null);

              return (
                <div key={item.label} className={`transition-all ${isExpanded ? 'px-3' : 'px-0 flex flex-col items-center'}`}>
                  <div
                    onClick={() => handleModuleClick(item)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-300 w-full cursor-pointer ${isPathActive ? '!bg-[#CC9448] text-white shadow-xl scale-102 font-semibold' : 'hover:bg-white/5 text-white/60 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="shrink-0">
                        <Icon size={18} strokeWidth={isPathActive ? 2.5 : 2} />
                      </div>
                      {isExpanded && (
                        <span className="text-xs font-semibold tracking-wide animate-in fade-in slide-in-from-left-4">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {isExpanded && item.subsections.length > 0 && (
                      <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                  </div>

                  {isExpanded && isOpen && item.subsections.length > 0 && (
                    <div className="relative ml-9 mt-2 pl-4 border-l border-[#CC9448]/30 space-y-2.5 animate-in fade-in slide-in-from-top-4 duration-500 pb-2 pt-1">
                      {item.subsections.map((sub, idx) => {
                        const isSubActive = pathname === sub.href;

                        // Sub-permission logic - Labels MUST match subsections array labels
                        const subPermissionMap: Record<string, string[]> = {
                          'Organization': ['view_schools', 'manage_schools'],
                          'Entity': ['view_students', 'register_students'],
                          'Record Entry': ['manage_measurements'],
                          'History': ['view_measurements'],
                          'Industry Templates': ['manage_measurements'],
                          'Industry Sectors': ['manage_system'],
                          'Measurement Setup': ['manage_system'],
                          'Measurements Approvals': ['manage_system'],
                          'Product Registry': ['manage_products', 'view_products'],
                          'Product Types': ['manage_products', 'view_products'],
                          'Group Design Catalog': ['manage_products', 'view_products'],
                          'Design Number Catalog': ['manage_products', 'view_products'],
                          'Audit Logs': ['view_audit_logs'],
                          'Staff Management': ['manage_employees', 'view_employees'],
                          'System Settings': ['manage_system'],
                          'User Roles': ['manage_system'],
                          'US Size Charts': ['manage_size_charts', 'view_size_charts'],
                          'Fabric Catalog': ['manage_inventory', 'view_inventory'],
                          'Button Catalog': ['manage_inventory', 'view_inventory'],
                          'Thread Catalog': ['manage_inventory', 'view_inventory'],
                          'Stock & Thresholds': ['manage_inventory', 'view_inventory'],
                          'Purchase Orders': ['manage_inventory', 'view_inventory'],
                          'Quotation': ['manage_quotations', 'view_quotations'],
                          'Operation Team': ['manage_quotations', 'view_quotations'],
                          'Initial Payment': ['manage_quotations', 'view_quotations'],
                          'Order Placement': ['manage_quotations', 'view_quotations'],
                          'SAM Calculator': ['view_products', 'manage_products', 'manage_quotations', 'view_quotations'],
                          'SAM Configurations': ['manage_products', 'manage_system'],
                          'Reports': ['view_products', 'manage_products', 'manage_quotations', 'view_quotations'],
                          'Fabric SAM': ['view_products', 'manage_products']
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
                            className={`relative flex items-center gap-2.5 group text-[11px] transition-all py-1.5 px-3 rounded-xl ${isSubActive
                              ? 'text-white bg-[#CC9448]/20 font-bold shadow-inner'
                              : 'text-white/60 hover:text-white hover:bg-white/5 font-medium'
                              }`}
                          >
                            {/* Horizontal gold line connector */}
                            <div
                              className={`absolute -left-4 transition-all duration-300 ${isSubActive ? 'w-4 h-[2px] bg-[#CC9448]' : 'w-3.5 h-[1px] bg-[#CC9448]/30'
                                }`}
                              style={{ top: '50%' }}
                            />
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
        <div className={`mt-auto p-4 border-t border-white/5 ${!isExpanded && 'flex justify-center'}`}>
          <div className={`flex items-center justify-between p-3 rounded-2xl bg-[#CC9448] text-white shadow-lg cursor-pointer ${!isExpanded && 'w-12 h-12 p-0 justify-center'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                <User size={16} className="text-[#CC9448]" strokeWidth={2.5} />
              </div>
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-bold truncate leading-tight text-white">
                    {user?.fullName || 'John Lee'}
                  </p>
                  <p className="text-[9px] font-semibold text-white/70 uppercase tracking-widest mt-0.5 leading-none">
                    {user?.role || 'Admin'}
                  </p>
                </div>
              )}
            </div>
            {isExpanded && (
              <svg className="w-4 h-4 text-white/85 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
              </svg>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
