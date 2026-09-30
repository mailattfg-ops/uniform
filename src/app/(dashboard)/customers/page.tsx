'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { 
  Plus, 
  Building2, 
  MapPin, 
  Edit2, 
  Trash2, 
  Users, 
  Key, 
  ReceiptText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Star,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface Customer {
  id: number;
  customer_code: string | null;
  name: string;
  address: string;
  industry_id: number;
  industries?: { name: string };
  relationship_manager_id: number | null;
  relationship_manager?: { id: number; full_name: string; employee_id: string } | null;
  assigned_operator_id: number | null;
  assigned_operator?: { id: number; full_name: string; employee_id: string } | null;
  is_active?: boolean | null;
  is_special?: boolean | null;
  is_risk?: boolean | null;
  created_at: string;
}

interface Industry {
  id: number;
  name: string;
}

export default function CustomersRegistry() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Filters
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SPECIAL' | 'RISK'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const isClientUser = Boolean(
    currentUser?.organizationId || 
    currentUser?.memberId || 
    ['organisation', 'organization', 'school', 'entity', 'student', 'member'].includes((currentUser?.role || '').toLowerCase())
  );

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, indRes, empRes] = await Promise.all([
        api.get('/customers').catch(() => api.get('/organizations')).catch(() => ({ data: [] })),
        api.get('/industries').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] }))
      ]);
      setCustomers(custRes.data || []);
      setIndustries(indRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      toast.error('Failed to load customer directory data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = (cust: Customer) => {
    router.push(`/customers/${cust.id}`);
  };

  // Toggle Status: Active vs Inactive
  const handleToggleStatus = async (cust: Customer, nextActive: boolean) => {
    if (isClientUser) return;
    const oldActive = cust.is_active !== false;
    if (oldActive === nextActive) return;

    // Optimistic update
    setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_active: nextActive } : c));
    const loadingToast = toast.loading(`Marking ${cust.name} as ${nextActive ? 'Active' : 'Inactive'}...`);

    try {
      await api.put(`/customers/${cust.id}`, { is_active: nextActive })
        .catch(() => api.put(`/organizations/${cust.id}`, { is_active: nextActive }));
      toast.success(`${cust.name} is now ${nextActive ? 'Active' : 'Inactive'}`, { id: loadingToast });
    } catch (err: any) {
      // Rollback
      setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_active: oldActive } : c));
      toast.error(err.response?.data?.error || 'Failed to update status', { id: loadingToast });
    }
  };

  // Mutually Exclusive: Special vs Risk vs Standard
  const handleSetClassification = async (cust: Customer, newType: 'standard' | 'special' | 'risk') => {
    if (isClientUser) return;
    const oldSpecial = !!cust.is_special;
    const oldRisk = !!cust.is_risk;

    const nextSpecial = newType === 'special';
    const nextRisk = newType === 'risk';

    // Optimistic update
    setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_special: nextSpecial, is_risk: nextRisk } : c));
    
    const label = newType === 'special' ? 'Special Customer' : newType === 'risk' ? 'Risk Customer' : 'Standard Customer';
    const loadingToast = toast.loading(`Classifying ${cust.name} as ${label}...`);

    try {
      await api.put(`/customers/${cust.id}`, {
        is_special: nextSpecial,
        is_risk: nextRisk,
        client_tag: newType
      }).catch(() => api.put(`/organizations/${cust.id}`, {
        is_special: nextSpecial,
        is_risk: nextRisk,
        client_tag: newType
      }));
      toast.success(`${cust.name} classified as ${label}`, { id: loadingToast });
    } catch (err: any) {
      // Rollback
      setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_special: oldSpecial, is_risk: oldRisk } : c));
      toast.error(err.response?.data?.error || 'Failed to update classification', { id: loadingToast });
    }
  };

  const generateInitialPassword = () => Math.random().toString(36).slice(-6).toUpperCase();

  const customerFields: FormField[] = [
    {
      name: 'name',
      label: 'Customer / Institution Name',
      type: 'text',
      placeholder: 'e.g. St. Xavier International, Apollo Healthcare, Infosys Ltd.',
      required: true,
      defaultValue: editingCustomer?.name
    },
    {
      name: 'industry_id',
      label: 'Customer Sector / Type',
      type: 'select',
      options: industries.map(i => ({ label: i.name, value: String(i.id) })),
      required: true,
      defaultValue: editingCustomer?.industry_id ? String(editingCustomer.industry_id) : undefined
    },
    {
      name: 'address',
      label: 'Billing & Operational Address',
      type: 'text',
      placeholder: 'Campus address, Street, City, Pincode',
      maxLength: 200,
      defaultValue: editingCustomer?.address
    },
    {
      name: 'relationship_manager_id',
      label: 'Assign Account Relationship Manager (Staff)',
      type: 'select',
      options: [
        { label: 'Unassigned', value: '' },
        ...employees.map(e => ({
          label: `${e.full_name} (${e.employee_id})`,
          value: String(e.id)
        }))
      ],
      required: false,
      defaultValue: editingCustomer?.relationship_manager_id ? String(editingCustomer.relationship_manager_id) : undefined
    },
    {
      name: 'is_active',
      label: 'Account Status',
      type: 'select',
      options: [
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' }
      ],
      defaultValue: editingCustomer?.is_active === false ? 'false' : 'true'
    },
    {
      name: 'client_tag',
      label: 'Client Classification',
      type: 'select',
      options: [
        { label: 'Standard Customer', value: 'standard' },
        { label: '★ Special Customer (High Priority)', value: 'special' },
        { label: '⚠ Risk Customer (Payment/Credit Alert)', value: 'risk' }
      ],
      defaultValue: editingCustomer?.is_special ? 'special' : editingCustomer?.is_risk ? 'risk' : 'standard'
    },
    ...(!editingCustomer ? [
      { 
        name: 'username', 
        label: 'Portal Login Username', 
        type: 'text' as const, 
        placeholder: 'e.g. stxavier_admin', 
        required: true, 
        maxLength: 30 
      }
    ] : [])
  ];

  const handleAddOrUpdate = async (formData: any) => {
    const loadingToast = toast.loading(editingCustomer ? 'Updating customer profile...' : 'Registering new customer...');

    const isSpecial = formData.client_tag === 'special';
    const isRisk = formData.client_tag === 'risk';

    const payload = {
      name: formData.name,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address || null,
      relationship_manager_id: formData.relationship_manager_id ? parseInt(formData.relationship_manager_id, 10) : null,
      is_active: formData.is_active === 'true',
      is_special: isSpecial,
      is_risk: isRisk,
      client_tag: formData.client_tag || 'standard'
    };

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload).catch(() => api.put(`/organizations/${editingCustomer.id}`, payload));
        toast.success('Customer profile updated successfully!', { id: loadingToast });
      } else {
        const autoPassword = generateInitialPassword();
        const submissionData = {
          ...payload,
          username: formData.username,
          password: autoPassword
        };

        await api.post('/customers', submissionData).catch(() => api.post('/organizations', submissionData));
        toast.success('Customer registered successfully!', { id: loadingToast });

        setCredsModal({
          isOpen: true,
          data: {
            full_name: formData.name,
            username: formData.username,
            password: autoPassword
          }
        });
      }
      setIsAdding(false);
      setEditingCustomer(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;

    const loadingToast = toast.loading('Purging customer account...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/customers/${deleteConfirm.id}`).catch(() => api.delete(`/organizations/${deleteConfirm.id}`));
      toast.success('Customer account and linked data removed', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete customer', { id: loadingToast });
    }
  };

  const handleResetPassword = async (cust: Customer) => {
    const loadingToast = toast.loading('Generating secure portal access key...');
    try {
      const response = await api.post(`/customers/${cust.id}/reset-password`).catch(() => api.post(`/organizations/${cust.id}/reset-password`));
      const { newPassword, username } = response.data;

      toast.success('Portal Credentials Reset Successfully!', { id: loadingToast });

      setCredsModal({
        isOpen: true,
        data: {
          full_name: cust.name,
          username: username,
          password: newPassword
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset credentials', { id: loadingToast });
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let special = 0;
    let risk = 0;

    customers.forEach(c => {
      if (c.is_active !== false) active++;
      else inactive++;

      if (c.is_special) special++;
      else if (c.is_risk) risk++;
    });

    return {
      total: customers.length,
      activeCount: active,
      inactiveCount: inactive,
      specialCount: special,
      riskCount: risk
    };
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Sector filter
      if (selectedIndustry !== 'ALL' && String(c.industry_id) !== selectedIndustry) {
        return false;
      }

      // Status & Classification filter (USER REQUEST)
      if (statusFilter === 'ACTIVE' && c.is_active === false) return false;
      if (statusFilter === 'INACTIVE' && c.is_active !== false) return false;
      if (statusFilter === 'SPECIAL' && !c.is_special) return false;
      if (statusFilter === 'RISK' && !c.is_risk) return false;

      // Text search
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(t);
        const matchCode = c.customer_code?.toLowerCase().includes(t);
        const matchAddr = c.address?.toLowerCase().includes(t);
        const matchInd = c.industries?.name?.toLowerCase().includes(t);
        const matchRm = c.relationship_manager?.full_name?.toLowerCase().includes(t);
        return matchName || matchCode || matchAddr || matchInd || matchRm;
      }
      return true;
    });
  }, [customers, selectedIndustry, statusFilter, searchTerm]);

  // Columns definition
  const columns: Column<Customer>[] = [
    {
      header: 'Customer (Click to View Details)',
      accessor: (c) => (
        <div className="flex items-center gap-4">
          <div 
            onClick={() => handleViewDetails(c)}
            className="w-12 h-12 bg-[#3a525d]/5 hover:bg-[#2d8d9b]/15 rounded-2xl flex items-center justify-center text-[#3a525d] hover:text-[#2d8d9b] border border-[#3a525d]/10 transition-all cursor-pointer shrink-0 group"
            title="Click to view full customer details"
          >
            <Building2 size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            {/* USER REQUEST: Click customer name to open existing customer details page */}
            <button
              type="button"
              onClick={() => handleViewDetails(c)}
              className="text-left font-black text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline transition-all cursor-pointer flex items-center gap-1.5 group border-none bg-transparent p-0 outline-none"
              title="Click to view full customer details"
            >
              <span>{c.name}</span>
              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#2d8d9b]" />
            </button>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#fce4d4]/40 text-[#8b6b5a] rounded-md border border-[#fce4d4]">
                {c.customer_code ? `CUST: ${c.customer_code}` : `ID: #${c.id}`}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-wider">
                {c.industries?.name || 'Institutional'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Account Status',
      accessor: (c) => {
        const isActive = c.is_active !== false;

        if (isClientUser) {
          return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}>
              {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        }

        return (
          <div className="flex items-center">
            {/* Staff inline toggle for Active / Inactive */}
            <button
              type="button"
              onClick={() => handleToggleStatus(c, !isActive)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-zinc-100 text-zinc-500 border-zinc-300 hover:bg-zinc-200'
              }`}
              title="Click to toggle Active / Inactive"
            >
              {isActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  <span>Inactive</span>
                </>
              )}
            </button>
          </div>
        );
      }
    },
    {
      header: 'Client Health / Tag',
      accessor: (c) => {
        const isSpecial = !!c.is_special;
        const isRisk = !!c.is_risk;

        if (isClientUser) {
          if (isSpecial) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-300">
                <Star size={11} className="fill-amber-500 text-amber-500" /> Special Client
              </span>
            );
          }
          if (isRisk) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-300">
                <AlertTriangle size={11} className="text-red-600" /> Risk Alert
              </span>
            );
          }
          return <span className="text-zinc-400 text-xs font-semibold">Standard</span>;
        }

        // USER REQUEST: Allowed staff can mark either Special or Risk (mutually exclusive)
        const currentType = isSpecial ? 'special' : isRisk ? 'risk' : 'standard';

        return (
          <div className="flex items-center gap-1.5">
            <select
              value={currentType}
              onChange={(e) => handleSetClassification(c, e.target.value as any)}
              className={`h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-all shadow-2xs ${
                isSpecial
                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-black'
                  : isRisk
                  ? 'bg-red-50 text-red-700 border-red-300 font-black'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <option value="standard">Standard</option>
              <option value="special">★ Special (VIP)</option>
              <option value="risk">⚠ Risk Client</option>
            </select>
          </div>
        );
      }
    },
    {
      header: 'Relationship Manager',
      accessor: (c) => (
        c.relationship_manager ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <Users size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-[#3a525d]">{c.relationship_manager.full_name}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                Staff ID: {c.relationship_manager.employee_id}
              </p>
            </div>
          </div>
        ) : (
          <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Unassigned
          </span>
        )
      )
    },
    {
      header: 'Location / Campus',
      accessor: (c) => (
        <div className="flex items-center gap-2 text-zinc-600">
          <MapPin size={14} className="text-[#2d8d9b] shrink-0" />
          <span className="text-xs font-semibold truncate max-w-[200px]">
            {c.address || 'Address pending'}
          </span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (c) => (
        <div className="flex items-center gap-2">
          {/* USER REQUEST: Eye button removed. Customer name is clickable directly! */}
          <Button
            onClick={() => router.push(`/customers/${c.id}?tab=ledger`)}
            variant="none"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-xs p-0 cursor-pointer"
            title="Account Statement & Financial Ledger"
          >
            <ReceiptText size={16} className="shrink-0" />
          </Button>
          {!isClientUser && (
            <>
              <Button
                onClick={() => {
                  setEditingCustomer(c);
                  setIsAdding(true);
                }}
                variant="none"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-xs p-0 cursor-pointer"
                title="Edit Customer"
              >
                <Edit2 size={16} className="shrink-0" />
              </Button>
              <Button
                onClick={() => handleResetPassword(c)}
                variant="none"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white transition-all shadow-xs p-0 cursor-pointer"
                title="Reset Portal Password"
              >
                <Key size={16} className="shrink-0" />
              </Button>
              <Button
                onClick={() => setDeleteConfirm({ isOpen: true, id: c.id })}
                variant="none"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white transition-all shadow-xs p-0 cursor-pointer"
                title="Delete Customer Account"
              >
                <Trash2 size={16} className="shrink-0" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <DynamicForm
          title={editingCustomer ? "Edit Customer Profile" : "Register New Customer"}
          subtitle={editingCustomer ? `Update account record for ${editingCustomer.name}` : "Configure a new institutional, corporate, or retail customer"}
          fields={customerFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
            setIsAdding(false);
            setEditingCustomer(null);
          }}
          submitLabel={editingCustomer ? "Save Changes" : "Register Customer"}
          columns={1}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Customers */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#fce4d4] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Total Customers</p>
            <h3 className="text-3xl font-black text-[#3a525d] tracking-tight">{stats.total}</h3>
            <p className="text-[10px] font-bold text-zinc-500 mt-1">
              Active: {stats.activeCount} | Inactive: {stats.inactiveCount}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#3a525d]/5 flex items-center justify-center text-[#3a525d]">
            <Building2 size={22} />
          </div>
        </div>

        {/* Active Accounts */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'ACTIVE' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-[#fce4d4] hover:border-emerald-300'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Active Accounts</p>
            <h3 className="text-3xl font-black text-emerald-600 tracking-tight">{stats.activeCount}</h3>
            <p className="text-[10px] font-bold text-zinc-400 mt-1">
              Live Contracting Customers
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Special Customers (VIP) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'SPECIAL' ? 'ALL' : 'SPECIAL')}
          className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'SPECIAL' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30' : 'border-[#fce4d4] hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1">Special Customers</p>
            <h3 className="text-3xl font-black text-amber-700 tracking-tight">{stats.specialCount}</h3>
            <p className="text-[10px] font-bold text-amber-600/80 mt-1 uppercase">
              VIP / High Priority
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Star size={22} className="fill-amber-600 text-amber-600" />
          </div>
        </div>

        {/* Risk Customers */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'RISK' ? 'ALL' : 'RISK')}
          className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'RISK' ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-[#fce4d4] hover:border-red-300'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-1">Risk Customers</p>
            <h3 className="text-3xl font-black text-red-600 tracking-tight">{stats.riskCount}</h3>
            <p className="text-[10px] font-bold text-red-600/80 mt-1 uppercase">
              Credit / Delay Alerts
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertTriangle size={22} />
          </div>
        </div>

      </div>

      {/* Main Table with Header Actions */}
      <DataTable
        title="Customer Directory"
        subtitle="Manage client accounts, active status, special/risk classifications, and financial ledgers"
        columns={columns}
        data={filteredCustomers}
        isLoading={isLoading}
        searchPlaceholder="Search customers by code, name, location, sector, manager..."
        headerAction={
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            
            {/* USER REQUEST: Dropdown Filter for All, Active, Inactive, Special, Risk */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-11 px-3 bg-white border border-[#fce4d4] rounded-2xl text-xs font-black uppercase tracking-wider text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-xs"
              >
                <option value="ALL">All Statuses & Classifications ({customers.length})</option>
                <option value="ACTIVE">Active Customers ({stats.activeCount})</option>
                <option value="INACTIVE">Inactive Customers ({stats.inactiveCount})</option>
                <option value="SPECIAL">★ Special Customers ({stats.specialCount})</option>
                <option value="RISK">⚠ Risk Customers ({stats.riskCount})</option>
              </select>
            </div>

            {/* Sector / Industry Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="h-11 px-3 bg-white border border-zinc-200 rounded-2xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-xs"
              >
                <option value="ALL">All Sectors ({customers.length})</option>
                {industries.map(ind => {
                  const count = customers.filter(c => String(c.industry_id) === String(ind.id)).length;
                  return (
                    <option key={ind.id} value={String(ind.id)}>
                      {ind.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {!isClientUser && (
              <Button
                onClick={() => {
                  setEditingCustomer(null);
                  setIsAdding(true);
                }}
                className="h-11 px-5 rounded-2xl bg-[#3a525d] hover:bg-[#2d8d9b] text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-md shadow-[#3a525d]/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={3} />
                Register Customer
              </Button>
            )}
          </div>
        }
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Customer Account?"
        message="Are you sure you want to remove this customer? This will purge linked departments, students, and order linkages."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        variant="danger"
      />

      {/* Generated Credentials Modal */}
      <CredentialsModal
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

    </div>
  );
}
