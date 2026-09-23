'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  Search, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Lock,
  Layers
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/Input';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  created_at?: string;
}

interface PermissionItem {
  id: string;
  label: string;
  category: string;
  description: string;
}

const AVAILABLE_PERMISSIONS: PermissionItem[] = [
  // ── 1. System & Administration ──
  { id: 'all', label: 'Super Admin Access (Universal Bypass)', category: 'System & Security', description: 'Universal root control over all system modules, configurations, and data' },
  { id: 'manage_system', label: 'Manage System Settings & Masters', category: 'System & Security', description: 'Configure company profile, bank settings, branches, prefixes, and global rules' },
  { id: 'view_audit_logs', label: 'View System Audit & Activity Logs', category: 'System & Security', description: 'Access audit trails, activity history, and authentication logs' },
  { id: 'manage_employees', label: 'Manage Staff & System Users', category: 'System & Security', description: 'Create, edit, and assign roles to internal employees and staff' },
  { id: 'view_employees', label: 'View Staff Registry Directory', category: 'System & Security', description: 'View staff members directory and employee profiles' },

  // ── 2. Factory Operations & Production Floor ──
  { id: 'factory_po_handler', label: 'Factory PO Handler & Job Cards', category: 'Factory Operations', description: 'Issue job cards, review approved purchase orders, and allocate fabrics' },
  { id: 'factory_floor', label: 'Production Queue & Factory Floor Execution', category: 'Factory Operations', description: 'Execute cutting, stitching, finishing, packing, and dispatch on the floor' },

  // ── 3. Multi-Branch Hub & Retail POS ──
  { id: 'branch_inventory', label: 'Branch Stock & Local Inventory', category: 'Multi-Branch Hub', description: 'Manage local outlet stock, variants, stock inwards, and branch counts' },
  { id: 'branch_sales', label: 'Branch Sales & Counter Orders', category: 'Multi-Branch Hub', description: 'Create and process customer counter orders, retail sales, and dispatches' },
  { id: 'branch_transfers', label: 'Inter-Branch Stock Transfers', category: 'Multi-Branch Hub', description: 'Issue, request, dispatch, and accept stock transfers between branches' },

  // ── 4. Marketing & Quotations ──
  { id: 'manage_quotations', label: 'Create & Manage Quotations & Work Orders', category: 'Marketing & Sales', description: 'Issue quotations, pricing, terms, corporate approvals, and order placements' },
  { id: 'view_quotations', label: 'View Quotations & Proposals', category: 'Marketing & Sales', description: 'View client quotations, discount structures, and proposals' },
  { id: 'corporate_approver', label: 'Corporate Approver & Order Triage', category: 'Marketing & Sales', description: 'Review, accept, reject with reason, or hold sales orders submitted by branch managers' },

  // ── 5. Billing & Invoicing ──
  { id: 'manage_invoices', label: 'Manage Invoices & Delivery Challans (DC)', category: 'Billing & Invoicing', description: 'Generate GST customer invoices, record payments, and issue delivery challans' },
  { id: 'view_invoices', label: 'View Billing & Invoice History', category: 'Billing & Invoicing', description: 'Access invoice history, DC logs, and client account statements' },

  // ── 6. Measurements & Fitting ──
  { id: 'manage_measurements', label: 'Execute & Record Measurements', category: 'Measurements & Sizing', description: 'Record bespoke customer measurements, use fitting templates, and manage tokens' },
  { id: 'view_measurements', label: 'View Measurement History', category: 'Measurements & Sizing', description: 'Inspect historic customer measurements, sizing logs, and fitting trends' },

  // ── 7. Organizations & School Registry ──
  { id: 'view_schools', label: 'View Schools & Organizations', category: 'Organizations & Registry', description: 'Browse schools, corporate institutions, and client accounts' },
  { id: 'manage_schools', label: 'Manage Schools & Organizations', category: 'Organizations & Registry', description: 'Register, edit, configure, and onboard organizations and schools' },
  { id: 'view_organizations', label: 'View Organization Profiles & Portals', category: 'Organizations & Registry', description: 'View client accounts, billing information, departments, and details' },

  // ── 8. Members & Student Registry ──
  { id: 'view_students', label: 'View Student / Member Registry', category: 'Members & Students', description: 'Browse enrolled students, employees, and organization members' },
  { id: 'register_students', label: 'Register New Students / Members', category: 'Members & Students', description: 'Enroll individual students and members into registry' },
  { id: 'manage_students', label: 'Edit & Manage Members / Students', category: 'Members & Students', description: 'Update student profiles, departments, admission info, and details' },
  { id: 'manage_classes', label: 'Manage Classes & Sections', category: 'Members & Students', description: 'Configure school grades, classes, and section divisions' },

  // ── 9. Catalogs & Product Master ──
  { id: 'view_products', label: 'View Products & Design Catalogs', category: 'Product Catalog', description: 'Browse products, art number hub, designs, fabrics, and trim catalogs' },
  { id: 'manage_products', label: 'Manage Products, Types & Designs', category: 'Product Catalog', description: 'Create and update products, product types, group designs, and art numbers' },
  { id: 'view_size_charts', label: 'View Standard Size Charts', category: 'Product Catalog', description: 'View US/UK size specifications and standard measurements' },
  { id: 'manage_size_charts', label: 'Manage Size Charts & Grading', category: 'Product Catalog', description: 'Create and modify standard size charts and dimension matrices' },

  // ── 10. Central Warehouse & Inventory ──
  { id: 'view_inventory', label: 'View Central Warehouse Stock & POs', category: 'Warehouse & Inventory', description: 'View central fabric, button, thread, and finished product stock' },
  { id: 'manage_inventory', label: 'Manage Stock Levels & Purchase Orders', category: 'Warehouse & Inventory', description: 'Inward materials, issue purchase orders, and adjust central warehouse stock' },

  // ── 11. Apparel Engineering / SAM ──
  { id: 'manage_sam', label: 'Manage SAM Calculator & Operations', category: 'Engineering & SAM', description: 'Configure Standard Allowed Minute operations, fabric SAMs, and machine studies' },

  // ── 12. Master Configurations ──
  { id: 'manage_industries', label: 'Manage Industry Sectors', category: 'Industry Masters', description: 'Configure industry verticals (Schools, Healthcare, Hospitality, Corporate)' },
  { id: 'manage_departments', label: 'Manage Departments & Wings', category: 'Industry Masters', description: 'Configure organization departments, wings, and divisions' },

  // ── 13. Client Portal Access ──
  { id: 'view_own_students', label: 'Client Portal: View Own Members/Students', category: 'Client Portal', description: 'Allows client organization users to view their own enrolled students' },
  { id: 'view_own_measurements', label: 'Client Portal: View Own Measurements', category: 'Client Portal', description: 'Allows client organization/entity users to view fitting and size data' },
];

const PROTECTED_ROLES = ['Admin', 'Super Admin', 'Branch Manager', 'Factory PO Handler'];

interface RolePreset {
  name: string;
  badge: string;
  description: string;
  permissions: string[];
}

const ROLE_PRESETS: RolePreset[] = [
  {
    name: 'Branch Manager',
    badge: 'Retail Hub',
    description: 'Full store management, inventory, sales, quotes, invoices, measurements & registry',
    permissions: [
      'branch_inventory', 'branch_sales', 'branch_transfers',
      'view_employees', 'view_organizations', 'manage_schools', 'view_schools',
      'manage_classes', 'manage_departments', 'view_students', 'register_students',
      'manage_students', 'view_products', 'manage_products', 'view_measurements',
      'manage_measurements', 'manage_quotations', 'view_quotations', 'manage_invoices', 'view_invoices'
    ]
  },
  {
    name: 'Branch Staff',
    badge: 'Store Counter',
    description: 'Store counter sales, measurements, stock view, student registry & quotes view',
    permissions: [
      'branch_inventory', 'branch_sales', 'view_organizations',
      'view_schools', 'view_students', 'register_students',
      'view_products', 'view_measurements', 'manage_measurements',
      'view_quotations', 'view_invoices'
    ]
  },
  {
    name: 'Factory PO Handler',
    badge: 'Manufacturing',
    description: 'Factory job cards, PO allocations, production queue & warehouse inventory',
    permissions: [
      'factory_po_handler', 'factory_floor', 'view_inventory', 'manage_inventory'
    ]
  },
  {
    name: 'Factory Production Staff',
    badge: 'Floor Execution',
    description: 'Production queue execution, cutting, stitching, finishing & packing',
    permissions: [
      'factory_floor'
    ]
  },
  {
    name: 'Marketing Executive',
    badge: 'Sales & Quotes',
    description: 'Quotations, pricing, proposals, sales leads, and client accounts',
    permissions: [
      'manage_quotations', 'view_quotations', 'branch_sales', 'view_organizations', 'view_schools', 'view_products'
    ]
  },
  {
    name: 'Corporate Approver',
    badge: 'HQ Sign-off',
    description: 'Review branch sales orders, accept/reject/hold triage, view client quotes & products',
    permissions: [
      'corporate_approver', 'view_quotations', 'view_organizations', 'view_schools', 'view_products'
    ]
  },
  {
    name: 'Client Organization',
    badge: 'Portal',
    description: 'Client portal access to school registry, own students, classes & measurements',
    permissions: [
      'view_schools', 'view_own_students', 'manage_classes', 'view_own_measurements'
    ]
  }
];

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] as string[] });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/user/types');
      setRoles(res.data || []);
    } catch (err) {
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({ name: role.name, permissions: role.permissions || [] });
    } else {
      setEditingRole(null);
      setFormData({ name: '', permissions: [] });
    }
    setSearchQuery('');
    setSelectedCategory('All');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Role name is required');

    const loadingToast = toast.loading(editingRole ? 'Deploying role configuration...' : 'Creating new role...');
    try {
      if (editingRole) {
        await api.put(`/user/types/${editingRole.id}`, formData);
        toast.success('Role permissions updated successfully', { id: loadingToast });
      } else {
        await api.post('/user/types', formData);
        toast.success('Role created successfully', { id: loadingToast });
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string, roleName: string) => {
    if (PROTECTED_ROLES.some(p => p.toLowerCase() === roleName.toLowerCase())) {
      toast.error(`'${roleName}' is a core system role and cannot be deleted.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the '${roleName}' role? This cannot be undone.`)) return;
    try {
      await api.delete(`/user/types/${id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete role');
    }
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id]
    }));
  };

  const toggleCategory = (category: string) => {
    const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const hasAll = categoryPerms.every(id => formData.permissions.includes(id));

    if (hasAll) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => !categoryPerms.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...categoryPerms]))
      }));
    }
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
    }));
    toast.success('All permissions selected');
  };

  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
    toast.success('All permissions cleared');
  };

  const applyPreset = (preset: RolePreset) => {
    setFormData(prev => ({
      name: prev.name || preset.name,
      permissions: [...preset.permissions]
    }));
    toast.success(`Applied '${preset.name}' template`);
  };

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)))];
  }, []);

  const filteredPermissions = useMemo(() => {
    return AVAILABLE_PERMISSIONS.filter(p => {
      const matchesSearch = 
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const columns: Column<Role>[] = [
    {
      header: 'Role Identity',
      accessor: (r) => {
        const isProtected = PROTECTED_ROLES.some(p => p.toLowerCase() === r.name.toLowerCase());
        const isSuperAdmin = r.permissions?.includes('all') || r.name.toLowerCase().includes('admin');

        return (
          <div className="flex items-center gap-4 py-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
              isSuperAdmin ? 'bg-[#3a525d] text-white' : 'bg-[#2d8d9b]/10 text-[#2d8d9b]'
            }`}>
              {isSuperAdmin ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black text-[13px] tracking-tight text-[#3a525d] uppercase">{r.name}</p>
                {isProtected && (
                  <span className="text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock size={10} />
                    System Core
                  </span>
                )}
              </div>
              <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-widest mt-1 opacity-80">
                {r.permissions?.includes('all') 
                  ? 'Universal Super Admin Access' 
                  : `${r.permissions?.length || 0} Active Permissions`}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Configured Access Matrix',
      accessor: (r) => {
        const perms = r.permissions || [];
        if (perms.includes('all')) {
          return (
            <div className="flex items-center gap-2 py-2">
              <span className="text-[9px] font-black uppercase tracking-widest bg-[#3a525d] text-white px-3 py-1 rounded-lg">
                Universal Root Bypass (All)
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-wrap gap-1.5 py-2 max-w-[480px]">
            {perms.slice(0, 4).map(p => (
              <span key={p} className="text-[8px] font-black uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md text-zinc-600">
                {p.replace(/_/g, ' ')}
              </span>
            ))}
            {perms.length > 4 && (
              <span className="text-[8px] font-black bg-[#2d8d9b]/10 text-[#2d8d9b] px-2.5 py-1 rounded-md uppercase tracking-wide">
                +{perms.length - 4} More Modules
              </span>
            )}
            {perms.length === 0 && (
              <span className="text-[8px] font-bold text-zinc-300 italic">No Permissions Configured</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (r) => {
        const isProtected = PROTECTED_ROLES.some(p => p.toLowerCase() === r.name.toLowerCase());

        return (
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => openModal(r)}
              className="p-2.5 bg-zinc-50 hover:bg-[#2d8d9b] hover:text-white transition-all rounded-xl text-zinc-500 group flex items-center gap-1.5 text-xs font-bold px-3"
              title="Edit Permissions"
            >
              <Edit2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-wider">Configure</span>
            </button>
            <button
              onClick={() => handleDelete(r.id, r.name)}
              disabled={isProtected}
              className={`p-2.5 transition-all rounded-xl ${
                isProtected 
                  ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed' 
                  : 'bg-zinc-50 hover:bg-red-500 hover:text-white text-zinc-400'
              }`}
              title={isProtected ? "Core system roles cannot be deleted" : "Delete Role"}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-8 md:p-10 rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden relative group gap-6">
        <div className="absolute right-0 top-0 w-72 h-72 bg-[#2d8d9b]/5 rounded-full -mr-36 -mt-36 transition-all group-hover:scale-110" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-[#2d8d9b]/10 text-[#2d8d9b] text-[9px] font-black uppercase tracking-widest">
              Admin Controls
            </span>
            <span className="px-3 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
              Dynamic RBAC
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#3a525d] tracking-tighter italic">User Roles & Access Control</h1>
          <p className="text-xs font-medium text-zinc-400 mt-1 max-w-xl">
            Configure granular access permissions for all internal operations, branch hubs, factory floors, and client portals in real time.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="relative px-8 py-4 bg-[#2d8d9b] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#2d8d9b]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shrink-0"
        >
          <Plus size={18} strokeWidth={3} />
          Define New Role
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#3a525d]/10 text-[#3a525d] flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#3a525d] tracking-tight">{roles.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Defined Roles</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#2d8d9b] tracking-tight">{AVAILABLE_PERMISSIONS.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Permissions</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600 tracking-tight">{ROLE_PRESETS.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Operational Presets</p>
          </div>
        </div>
      </div>

      {/* Roles Data Table */}
      <DataTable
        title="Active System Roles"
        subtitle="Manage dynamic permissions applied to users upon session authentication"
        columns={columns}
        data={roles}
        isLoading={isLoading}
      />

      {/* Role Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-8 bg-[#3a525d] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  <Shield size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter leading-none">
                    {editingRole ? `Configure: ${editingRole.name}` : 'Define New System Role'}
                  </h2>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mt-2">
                    Access Control Policy & Permission Matrix Center
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 md:p-10 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
              {/* Role Name */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-[#2d8d9b] rounded-full" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Role Identity Name</h4>
                </div>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter role title (e.g. Branch Manager, Factory Supervisor, Sales Rep)"
                  className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-[1.2rem] font-bold text-base text-[#3a525d] focus:outline-none focus:ring-4 focus:ring-[#2d8d9b]/10 focus:border-[#2d8d9b] transition-all"
                />
              </div>

              {/* Operational Presets */}
              <div className="space-y-3 bg-zinc-50/70 p-6 rounded-[1.8rem] border border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#2d8d9b]" />
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                      Quick Operational Presets
                    </h5>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400">Click to apply baseline permissions</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ROLE_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-3.5 py-2 bg-white hover:bg-[#2d8d9b] hover:text-white text-zinc-700 rounded-xl text-xs font-bold border border-zinc-200/80 shadow-sm transition-all flex items-center gap-2 group"
                      title={preset.description}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#2d8d9b] group-hover:text-white">
                        [{preset.badge}]
                      </span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Matrix Controls */}
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-5 bg-[#f2994a] rounded-full" />
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3a525d]">
                        Granular Permission Matrix
                      </h4>
                    </div>
                    <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-wider mt-1">
                      {formData.permissions.length} of {AVAILABLE_PERMISSIONS.length} Permissions Active
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="px-3.5 py-1.5 bg-zinc-100 hover:bg-[#2d8d9b] hover:text-white text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <CheckSquare size={13} />
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-3.5 py-1.5 bg-zinc-100 hover:bg-red-500 hover:text-white text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Square size={13} />
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search permissions by name, module, or key (e.g. factory, invoice, stock)..."
                      className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-[#3a525d] focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat} {cat !== 'All' ? 'Module' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Categorized Permissions Grid */}
                <div className="space-y-6 pt-2">
                  {Array.from(new Set(filteredPermissions.map(p => p.category))).map(category => {
                    const permsInCategory = filteredPermissions.filter(p => p.category === category);
                    const allCatIds = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
                    const hasAllInCategory = allCatIds.every(id => formData.permissions.includes(id));
                    const selectedCount = allCatIds.filter(id => formData.permissions.includes(id)).length;

                    return (
                      <div key={category} className="space-y-3 bg-zinc-50/40 p-5 rounded-[2rem] border border-zinc-100">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#2d8d9b]" />
                            <h5 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d]">
                              {category}
                            </h5>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
                              {selectedCount}/{allCatIds.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className="text-[9px] font-black uppercase text-[#2d8d9b] hover:text-[#3a525d] transition-colors"
                          >
                            {hasAllInCategory ? 'Unselect Module' : 'Select All In Module'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {permsInCategory.map(permission => {
                            const isChecked = formData.permissions.includes(permission.id);

                            return (
                              <label
                                key={permission.id}
                                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                                  isChecked
                                    ? 'bg-[#2d8d9b]/5 border-[#2d8d9b]/40 shadow-xs'
                                    : 'bg-white border-zinc-200/70 hover:border-zinc-300'
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-black transition-colors ${
                                      isChecked ? 'text-[#2d8d9b]' : 'text-zinc-700'
                                    }`}>
                                      {permission.label}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 line-clamp-1 leading-normal">
                                    {permission.description}
                                  </p>
                                  <span className="text-[8px] font-mono font-bold text-zinc-300 uppercase tracking-tight mt-0.5">
                                    key: {permission.id}
                                  </span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(permission.id)}
                                  className="mt-1 w-4 h-4 rounded-md border-2 border-zinc-300 text-[#2d8d9b] focus:ring-[#2d8d9b] transition-all accent-[#2d8d9b] shrink-0"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {filteredPermissions.length === 0 && (
                    <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                      <p className="text-xs font-bold text-zinc-400">No permissions match your search query "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 bg-zinc-50 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Active Selection:</span>
                <span className="text-xs font-black text-[#2d8d9b] bg-[#2d8d9b]/10 px-3 py-1 rounded-lg">
                  {formData.permissions.length} Permissions
                </span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-200/60 transition-all border border-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-[#3a525d] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#3a525d]/20 flex items-center gap-2.5"
                >
                  <Save size={15} strokeWidth={3} />
                  Deploy Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>
    </div>
  );
}
