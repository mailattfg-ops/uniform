'use client';

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { UnauthorizedAccess } from "@/components/ui/UnauthorizedAccess";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";

// Route-to-Permission Mapping for Dashboard Protection
const ROUTE_PERMISSIONS: { prefix: string; permissions: string[] }[] = [
  // Specific Product & Design Catalogs (Accessible to users with product permissions)
  { prefix: '/admin/products', permissions: ['manage_system', 'manage_products', 'view_products'] },
  { prefix: '/admin/product-types', permissions: ['manage_system', 'manage_products', 'view_products'] },
  { prefix: '/admin/designs', permissions: ['manage_system', 'manage_products', 'view_products'] },
  { prefix: '/admin/design-numbers', permissions: ['manage_system', 'manage_products', 'view_products'] },
  { prefix: '/admin/inventory', permissions: ['manage_system', 'manage_inventory', 'view_inventory'] },
  { prefix: '/admin/audit', permissions: ['manage_system', 'view_audit_logs'] },

  // Super Admin Controls & Master Settings
  { prefix: '/admin', permissions: ['manage_system'] },
  { prefix: '/settings/branches', permissions: ['manage_system'] },
  { prefix: '/employees', permissions: ['manage_employees', 'view_employees', 'manage_system'] },

  // SAM Industrial Engineering
  { prefix: '/sam-management', permissions: ['manage_system', 'manage_sam'] },

  // Factory Floor & PO Review Gate
  { prefix: '/factory/job-cards', permissions: ['manage_system', 'factory_po_handler'] },
  { prefix: '/factory', permissions: ['manage_system', 'factory_po_handler', 'factory_floor'] },

  // Marketing, Quotes & Order Placement
  { prefix: '/marketing/operation-team', permissions: ['manage_quotations', 'manage_system'] },
  { prefix: '/marketing/order-placement', permissions: ['manage_quotations', 'manage_system', 'corporate_approver'] },
  { prefix: '/marketing/quotations', permissions: ['manage_quotations', 'branch_sales', 'view_quotations'] },
  { prefix: '/marketing/initial-payment', permissions: ['manage_quotations', 'branch_sales', 'view_quotations'] },
  { prefix: '/marketing', permissions: ['manage_quotations', 'branch_sales', 'view_quotations'] },

  // Multi-Branch Hub & Transfers
  { prefix: '/branches/transfers', permissions: ['branch_transfers', 'manage_system'] },
  { prefix: '/branches/outlets', permissions: ['manage_system', 'branch_transfers'] },
  { prefix: '/branches/inventory', permissions: ['branch_inventory', 'manage_system'] },
  { prefix: '/branches', permissions: ['branch_inventory', 'manage_system', 'branch_sales'] },

  // Invoicing & Dispatch
  { prefix: '/billing', permissions: ['manage_quotations', 'manage_system', 'branch_sales', 'manage_invoices', 'view_invoices'] },

  // Registry & Client CRM
  { prefix: '/organizations', permissions: ['view_schools', 'manage_schools', 'view_organizations', 'view_own_students'] },
  { prefix: '/entities', permissions: ['view_students', 'register_students', 'view_own_students'] },
  { prefix: '/measurements', permissions: ['manage_measurements', 'view_measurements', 'view_own_measurements'] }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = Cookies.get('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    setIsAuthChecking(false);
  }, [router]);

  if (isAuthChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#030303]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#CC9448]/30 border-t-[#CC9448] rounded-full animate-spin shadow-2xl" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#CC9448] opacity-50">Checking Authorization</p>
        </div>
      </div>
    );
  }

  // Permission & Role Guard Check
  const userRole = user?.role || '';
  const userPermissions: string[] = user?.permissions || [];
  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'SuperAdmin' || userPermissions.includes('all');

  let isAuthorized = true;
  let requiredPerms: string[] = [];

  if (!isAdmin && pathname) {
    const roleLower = userRole.toLowerCase();
    const isClientEntity = Boolean(user?.memberId || ['entity', 'student', 'member'].includes(roleLower));
    const isClientOrg = !isClientEntity && Boolean(user?.organizationId || ['organisation', 'organization', 'school'].includes(roleLower));

    // Universal routes accessible to any authenticated user
    if (pathname === '/dashboard' || pathname === '/settings/profile') {
      isAuthorized = true;
    } else if (isClientEntity) {
      // Client Entity accounts can access their own entity profile, measurements and fitting tokens
      if (
        pathname.startsWith('/entities') ||
        pathname.startsWith('/measurements')
      ) {
        isAuthorized = true;
      } else {
        isAuthorized = false;
        requiredPerms = ['view_students', 'view_own_measurements'];
      }
    } else if (isClientOrg) {
      // Client Organization accounts can access their own organization registry, details, ledger, entities, and measurements
      if (
        pathname.startsWith('/organizations') ||
        pathname.startsWith('/entities') ||
        pathname.startsWith('/measurements')
      ) {
        isAuthorized = true;
      } else {
        isAuthorized = false;
        requiredPerms = ['view_schools', 'view_own_students'];
      }
    } else {
      // Internal operational staff: Dynamic permission check against database-assigned rules
      const matchedRule = ROUTE_PERMISSIONS.find(r => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
      if (matchedRule) {
        requiredPerms = matchedRule.permissions;
        isAuthorized = matchedRule.permissions.some(p => userPermissions.includes(p));
      } else {
        isAuthorized = true;
      }
    }
  }

  return (
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden relative w-full p-3 lg:p-4 gap-3 lg:gap-4 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 bg-[#F5F4F2] text-[#030303] rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {isAuthorized ? (
              children
            ) : (
              <UnauthorizedAccess 
                userRole={userRole}
                userEmail={user?.email}
                pathname={pathname}
                requiredPermissions={requiredPerms}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

