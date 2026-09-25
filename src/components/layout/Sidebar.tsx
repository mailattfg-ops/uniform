'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Star,
  Settings,
  Grid,
  Building2,
  Library,
  ChevronLeft,
  Ruler,
  ShieldAlert,
  ChevronDown,
  User,
  Box,
  TrendingUp,
  Calculator,
  Package,
  LogOut,
  ReceiptText,
  Users,
  History,
  Home,
  Tag,
  ShoppingBag,
  ShoppingCart,
  Factory,
  Receipt,
  BarChart3
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
    icon: Users, label: 'CRM', href: '/organizations/registry',
    subsections: [
      { label: 'Customer Portal', href: '/coming-soon?feature=Customer%20Portal&module=CRM' },
      { label: 'Organizations CRM', href: '/organizations/registry' },
      { label: 'Leads Registry', href: '/organizations/leads' },
      { label: 'Quotations', href: '/marketing/quotations' },
    ]
  },
  {
    icon: Tag, label: 'Items', href: '/admin/products',
    subsections: [
      { label: 'Product Registry', href: '/admin/products' },
      { label: 'Product Types', href: '/admin/product-types' },
      { label: 'ART Number Hub', href: '/admin/art-number-hub' },
      { label: 'Design Numbers (DNS/DMG)', href: '/admin/design-numbers' },
      { label: 'Group Designs', href: '/admin/designs' },
      { label: 'Fabric Catalog', href: '/admin/inventory/fabrics' },
      { label: 'Trims Catalog', href: '/admin/inventory/trims' },
      { label: 'Button Catalog', href: '/admin/inventory/buttons' },
      { label: 'Thread Catalog', href: '/admin/inventory/threads' },
    ]
  },
  {
    icon: Ruler, label: 'Measurements', href: '/measurements/entry',
    subsections: [
      { label: 'Record Entry', href: '/measurements/entry' },
      { label: 'Measurement History', href: '/measurements/history' },
      { label: 'Industry Templates', href: '/measurements/templates' },
      { label: 'Fitting Tokens', href: '/measurements/tokens' },
      { label: 'Consumption List', href: '/coming-soon?feature=Consumption%20List&module=Measurements' }
    ]
  },
  {
    icon: Calculator, label: 'SAM Engineering', href: '/sam-management/calculator',
    subsections: [
      { label: 'SAM Calculator', href: '/sam-management/calculator' },
      { label: 'Configurations', href: '/sam-management/configurations' },
      { label: 'Fabric SAM', href: '/sam-management/fabric' },
    ]
  },
  {
    icon: Package, label: 'Inventory', href: '/admin/inventory/product-stock',
    subsections: [
      { label: 'Stock Transfers', href: '/branches/transfers' },
      { label: 'Fabric Stock', href: '/admin/inventory/fabric-stock' },
      { label: 'Trims Stock', href: '/admin/inventory/trims-stock' },
      { label: 'Button Stock', href: '/admin/inventory/button-stock' },
      { label: 'Thread Stock', href: '/admin/inventory/thread-stock' },
      { label: 'Product Stock', href: '/admin/inventory/product-stock' },
      { label: 'Branch Inventory', href: '/branches/inventory' },
      { label: 'Move Items', href: '/coming-soon?feature=Move%20Items&module=Inventory' },
    ]
  },
  {
    icon: ShoppingBag, label: 'Sales', href: '/marketing/order-placement',
    subsections: [
      { label: 'Sales Orders', href: '/marketing/order-placement' },
      { label: 'Operations Review', href: '/marketing/operation-team' },
      { label: 'Delivery Challans (DC)', href: '/billing/delivery-challans' },
      { label: 'Packages', href: '/coming-soon?feature=Packages&module=Sales' },
      { label: 'Alterations & Returns', href: '/coming-soon?feature=Alterations%20%26%20Returns&module=Sales' },
    ]
  },
  {
    icon: ShoppingCart, label: 'Purchase', href: '/admin/purchase-orders',
    subsections: [
      { label: 'Vendors Manager', href: '/admin/vendors' },
      { label: 'Purchase Orders (PO)', href: '/admin/purchase-orders' },
      { label: 'Purchase Bills & Receives', href: '/coming-soon?feature=Purchase%20Bills%20%26%20Receives&module=Purchase' },
    ]
  },
  {
    icon: Factory, label: 'Factory Operations', href: '/factory/job-cards',
    subsections: [
      { label: 'Job Cards & PO Handler', href: '/factory/job-cards' },
      { label: 'Production Queue', href: '/factory/production-queue' }
    ]
  },
  {
    icon: Receipt, label: 'Accounts', href: '/billing/invoices',
    subsections: [
      { label: 'Customer Invoices', href: '/billing/invoices' },
      { label: 'Customer Payments', href: '/marketing/initial-payment' },
      { label: 'Vendor Payments & Expenses', href: '/coming-soon?feature=Vendor%20Payments%20%26%20Expenses&module=Accounts' },
      { label: 'Company Bank & Profile', href: '/admin/company' },
    ]
  },
  {
    icon: BarChart3, label: 'Reports', href: '/sam-management/reports',
    subsections: [
      { label: 'SAM & Operations Reports', href: '/sam-management/reports' },
      { label: 'Audit Trail Logs', href: '/admin/audit' },
    ]
  },
  {
    icon: Settings, label: 'Admin Settings', href: '/admin/settings',
    subsections: [
      { label: 'Industry Sectors', href: '/admin/industries' },
      { label: 'Staff Management', href: '/admin/employees' },
      { label: 'User Roles & Permissions', href: '/admin/roles' },
      { label: 'US Size Charts', href: '/admin/size-charts' },
      { label: 'Measurement Approvals', href: '/admin/approvals/measurements' },
      { label: 'Branches & Outlets', href: '/branches/outlets' }
    ]
  }
];

// ── Static Permission Mapping Rules ──────────────────────────────────────────
const MODULE_PERMISSION_MAP: Record<string, string[]> = {
  'CRM': ['view_schools', 'manage_schools', 'view_organizations', 'manage_quotations', 'view_quotations', 'branch_sales'],
  'Items': ['manage_inventory', 'view_inventory', 'manage_products', 'view_products'],
  'Measurements': ['manage_measurements', 'view_measurements', 'view_own_measurements'],
  'SAM Engineering': ['manage_system', 'manage_sam'],
  'Inventory': ['manage_inventory', 'view_inventory', 'branch_transfers'],
  'Sales': ['manage_quotations', 'view_quotations', 'branch_sales', 'corporate_approver'],
  'Purchase': ['manage_system', 'manage_inventory', 'view_inventory'],
  'Factory Operations': ['manage_system', 'factory_po_handler', 'factory_floor'],
  'Accounts': ['manage_quotations', 'manage_system', 'branch_sales', 'manage_invoices', 'view_invoices'],
  'Reports': ['manage_system', 'manage_sam', 'view_audit_logs'],
  'Admin Settings': ['manage_system', 'view_audit_logs'],
  // Legacy aliases
  'Customer & Lead Management': ['view_schools', 'manage_schools', 'view_organizations'],
  'Product Management': ['manage_inventory', 'view_inventory', 'manage_products', 'view_products'],
  'Marketing': ['manage_quotations', 'view_quotations', 'branch_sales', 'corporate_approver'],
  'SAM Management': ['manage_system', 'manage_sam'],
  'Multi-Branch Hub': ['branch_sales', 'manage_system', 'branch_transfers'],
  'Billing & Invoicing': ['manage_quotations', 'manage_system', 'branch_sales', 'manage_invoices', 'view_invoices']
};

const SUB_PERMISSION_MAP: Record<string, string[]> = {
  'Customer Portal': ['view_schools', 'manage_schools', 'view_organizations'],
  'Organizations CRM': ['view_schools', 'manage_schools', 'view_organizations'],
  'Leads Registry': ['view_schools', 'manage_schools', 'view_organizations', 'branch_sales'],
  'Quotations': ['manage_quotations', 'view_quotations', 'branch_sales'],
  'Record Entry': ['manage_measurements', 'view_measurements'],
  'Measurement History': ['view_measurements', 'manage_measurements'],
  'Industry Templates': ['manage_measurements', 'view_measurements'],
  'Fitting Tokens': ['manage_measurements', 'view_measurements'],
  'Consumption List': ['manage_measurements', 'view_measurements'],
  'Industry Sectors': ['manage_system', 'manage_industries'],
  'Staff Management': ['manage_employees', 'view_employees', 'manage_system'],
  'User Roles & Permissions': ['manage_system'],
  'US Size Charts': ['manage_size_charts', 'view_size_charts', 'manage_system'],
  'Measurement Approvals': ['manage_system'],
  'Branches & Outlets': ['manage_system'],
  'Audit Trail Logs': ['view_audit_logs', 'manage_system'],
  'Product Registry': ['manage_products', 'view_products'],
  'Product Types': ['manage_products', 'view_products'],
  'Group Designs': ['manage_products', 'view_products'],
  'Design Numbers (DNS/DMG)': ['manage_products', 'view_products'],
  'Art Number Hub': ['manage_system', 'manage_products'],
  'Vendors Manager': ['manage_system', 'manage_inventory'],
  'Fabric Catalog': ['manage_inventory', 'view_inventory'],
  'Trims Catalog': ['manage_inventory', 'view_inventory'],
  'Button Catalog': ['manage_inventory', 'view_inventory'],
  'Thread Catalog': ['manage_inventory', 'view_inventory'],
  'Product Stock': ['manage_inventory', 'view_inventory'],
  'Fabric Stock': ['manage_inventory', 'view_inventory'],
  'Trims Stock': ['manage_inventory', 'view_inventory'],
  'Button Stock': ['manage_inventory', 'view_inventory'],
  'Thread Stock': ['manage_inventory', 'view_inventory'],
  'Branch Inventory': ['branch_inventory', 'manage_system'],
  'Stock Transfers': ['branch_transfers', 'manage_system'],
  'Move Items': ['manage_inventory', 'view_inventory', 'branch_transfers'],
  'Purchase Orders (PO)': ['manage_system', 'manage_inventory'],
  'Purchase Bills & Receives': ['manage_system', 'manage_inventory'],
  'Sales Orders': ['manage_quotations', 'corporate_approver', 'branch_sales', 'manage_system'],
  'Operations Review': ['manage_quotations', 'manage_system'],
  'Packages': ['manage_quotations', 'manage_system'],
  'Alterations & Returns': ['manage_quotations', 'manage_system'],
  'SAM Calculator': ['manage_sam', 'manage_system'],
  'Configurations': ['manage_sam', 'manage_system'],
  'Fabric SAM': ['manage_sam', 'manage_system'],
  'SAM & Operations Reports': ['manage_sam', 'manage_system'],
  'Job Cards & PO Handler': ['manage_system', 'factory_po_handler'],
  'Production Queue': ['manage_system', 'factory_po_handler', 'factory_floor'],
  'Customer Invoices': ['manage_quotations', 'manage_system', 'branch_sales', 'manage_invoices', 'view_invoices'],
  'Customer Payments': ['manage_quotations', 'view_quotations', 'branch_sales'],
  'Vendor Payments & Expenses': ['manage_system'],
  'Company Bank & Profile': ['manage_system'],
  'Delivery Challans (DC)': ['manage_system', 'manage_quotations', 'branch_sales', 'manage_invoices', 'view_invoices']
};

import { useLayout } from '@/hooks/useLayout';

// ── Client Portal Navigation ──────────────────────────────────────────────────
interface ClientNavItem {
  icon: any;
  label: string;
  href: string;
  badge?: string;
}

function buildClientOrgNav(organizationId: number | string): ClientNavItem[] {
  const orgId = String(organizationId);
  return [
    { icon: Star, label: 'Dashboard', href: '/dashboard' },
    { icon: Building2, label: 'My Organization', href: `/organizations/registry/${orgId}` },
    { icon: Users, label: 'Members Directory', href: `/organizations/registry/${orgId}?tab=entities` },
    { icon: ReceiptText, label: 'Account Statement', href: `/organizations/registry/${orgId}?tab=ledger`, badge: 'Finance' },
    { icon: History, label: 'Measurement History', href: '/measurements/history' },
  ];
}

function buildClientEntityNav(memberId: number | string): ClientNavItem[] {
  return [
    { icon: Star, label: 'Dashboard', href: '/dashboard' },
    { icon: Ruler, label: 'My Measurements', href: '/measurements/history' },
  ];
}

// Client Portal Sidebar — simplified, branded nav for org/entity accounts
function ClientPortalSidebar({
  user,
  isExpanded,
  toggleSidebar,
  handleLogout,
  isSidebarOpen,
  setIsSidebarOpen,
}: {
  user: any;
  isExpanded: boolean;
  toggleSidebar: () => void;
  handleLogout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleLower = (user?.role || '').toLowerCase();
  const isClientEntity = Boolean(user?.memberId || ['entity', 'student', 'member'].includes(roleLower));
  const organizationId = user?.organizationId;

  const navItems = isClientEntity
    ? buildClientEntityNav(user?.memberId)
    : buildClientOrgNav(organizationId);

  const portalLabel = isClientEntity ? 'Member Portal' : 'Client Portal';
  const displayName = isClientEntity
    ? (user?.fullName || 'Student Member')
    : (user?.organizationName || user?.fullName || 'Client');
  const subLabel = isClientEntity
    ? (user?.admissionNo ? `#${user.admissionNo} • ${user?.organizationName || 'Entity'}` : (user?.organizationName || 'Member'))
    : portalLabel;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isItemActive = (href: string) => {
    const hrefPath = href.split('?')[0];
    const hrefQuery = href.includes('?') ? href.split('?')[1] : '';
    if (hrefQuery) {
      // For items with query params (e.g. ?tab=ledger), match both path and query
      return pathname === hrefPath && typeof window !== 'undefined' && window.location.search.includes(hrefQuery.split('=')[1]);
    }
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === hrefPath || pathname.startsWith(hrefPath + '/') || pathname.startsWith(hrefPath + '?');
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-all duration-300 ease-in-out
        fixed lg:static inset-y-0 left-0 z-[100]
        ${isExpanded ? 'w-72' : 'w-24'}
        bg-[#030303] text-white flex flex-col border-r border-white/5 shadow-2xl h-full
      `}>
        {/* Brand Header */}
        <div className={`w-full justify-between h-24 flex items-center px-6 mb-2 transition-all border-b border-white/5 ${isExpanded ? 'active' : 'justify-center overflow-hidden'}`}>
          <div className="flex items-center gap-3">
            {!isExpanded ? (
              <div className="w-8 h-8 rounded-lg border border-white flex items-center justify-center shrink-0">
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

        {/* Client Portal Badge */}
        {isExpanded && (
          <div className="mx-4 mb-4 px-3 py-2 rounded-xl bg-[#CC9448]/10 border border-[#CC9448]/20 flex items-center gap-2 animate-in fade-in duration-500">
            <div className="w-2 h-2 rounded-full bg-[#CC9448] animate-pulse shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#CC9448]">{portalLabel}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col px-2">
          <nav className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.href);
              return (
                <div key={item.label} className={`transition-all ${isExpanded ? 'px-3' : 'px-0 flex flex-col items-center'}`}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-300 w-full ${isActive
                      ? '!bg-[#CC9448] text-white shadow-xl font-semibold'
                      : 'hover:bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="shrink-0">
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      {isExpanded && (
                        <span className="text-xs font-semibold tracking-wide animate-in fade-in slide-in-from-left-4">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {isExpanded && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}

            {/* Divider & Settings */}
            <div className={`px-3 mt-2`}>
              <div className="border-t border-white/5 pt-2">
                <Link
                  href="/settings/profile"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`flex items-center p-3 rounded-2xl transition-all duration-300 w-full ${
                    pathname === '/settings/profile'
                      ? '!bg-[#CC9448] text-white shadow-xl font-semibold'
                      : 'hover:bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Settings size={18} strokeWidth={2} />
                    {isExpanded && (
                      <span className="text-xs font-semibold tracking-wide">Profile & Settings</span>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          </nav>
        </div>

        {/* User Footer */}
        <div className={`mt-auto p-4 border-t border-white/5 relative ${!isExpanded && 'flex justify-center'}`} ref={dropdownRef}>
          {isDropdownOpen && (
            <div className={`absolute bottom-20 z-50 bg-[#121212]/95 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${isExpanded ? 'left-4 right-4' : 'left-4 w-48'}`}>
              <div className="flex flex-col gap-1">
                <Link
                  href="/settings/profile"
                  onClick={() => { setIsDropdownOpen(false); if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all"
                >
                  <User size={16} className="text-[#CC9448]" />
                  <span>Profile Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left w-full"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center justify-between p-3 rounded-2xl bg-[#CC9448] text-white shadow-lg cursor-pointer ${!isExpanded && 'w-12 h-12 p-0 justify-center'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-inner">
                {isClientEntity ? (
                  <User size={16} className="text-[#CC9448]" strokeWidth={2.5} />
                ) : (
                  <Building2 size={16} className="text-[#CC9448]" strokeWidth={2.5} />
                )}
              </div>
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-bold truncate leading-tight text-white">
                    {displayName}
                  </p>
                  <p className="text-[9px] font-semibold text-white/70 uppercase tracking-widest mt-0.5 leading-none truncate">
                    {subLabel}
                  </p>
                </div>
              )}
            </div>
            {isExpanded && (
              <svg className={`w-4 h-4 text-white/85 shrink-0 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
              </svg>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen, toggleSidebar: toggleMobileSidebar } = useLayout();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    Cookies.remove('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

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

  // ── Client Account Detection ─────────────────────────────────────────────────
  const roleLower = (user?.role || '').toLowerCase();
  const isClientEntity = Boolean(
    user?.memberId ||
    ['entity', 'student', 'member'].includes(roleLower)
  );
  const isClientOrg = !isClientEntity && Boolean(
    user?.organizationId ||
    ['organisation', 'organization', 'school'].includes(roleLower)
  );

  // Render dedicated client portal sidebar for org/entity accounts
  if (isClientOrg || isClientEntity) {
    return (
      <ClientPortalSidebar
        user={user}
        isExpanded={isExpanded}
        toggleSidebar={toggleSidebar}
        handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
    );
  }

  // ── Standard Admin / Staff Sidebar ───────────────────────────────────────────
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
        fixed lg:static inset-y-0 left-0 z-[100]
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
              const userRole = user?.role || '';
              const userPermissions: string[] = user?.permissions || [];
              const isAdmin = userPermissions.includes('all') || userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'SuperAdmin';

              // Module visibility: Admin universal bypass, or public module (no reqs), or user has any required permission
              const requiredPermissions = MODULE_PERMISSION_MAP[item.label] || [];
              const hasPermission = isAdmin || requiredPermissions.length === 0 ||
                requiredPermissions.some(rp => userPermissions.includes(rp));

              if (!hasPermission) return null;

              // If a module has subsections, ensure at least one subsection is permitted; otherwise hide the entire module
              if (item.subsections.length > 0 && !isAdmin) {
                const hasAnyVisibleSub = item.subsections.some(sub => {
                  const reqSub = SUB_PERMISSION_MAP[sub.label] || [];
                  return reqSub.length === 0 || reqSub.some(rp => userPermissions.includes(rp));
                });
                if (!hasAnyVisibleSub) return null;
              }

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

                        const requiredSubPerms = SUB_PERMISSION_MAP[sub.label] || [];
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
        <div className={`mt-auto p-4 border-t border-white/5 relative ${!isExpanded && 'flex justify-center'}`} ref={dropdownRef}>
          {isDropdownOpen && (
            <div className={`absolute bottom-20 z-50 bg-[#121212]/95 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${isExpanded ? 'left-4 right-4' : 'left-4 w-48'
              }`}>
              <div className="flex flex-col gap-1">
                <Link
                  href="/settings/profile"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all"
                >
                  <User size={16} className="text-[#CC9448]" />
                  <span>Profile Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left w-full"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center justify-between p-3 rounded-2xl bg-[#CC9448] text-white shadow-lg cursor-pointer ${!isExpanded && 'w-12 h-12 p-0 justify-center'}`}
          >
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
              <svg className={`w-4 h-4 text-white/85 shrink-0 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
              </svg>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
