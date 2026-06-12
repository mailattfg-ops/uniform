'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Users, MapPin, Edit2, Trash2, Calendar, Target, ShieldCheck, UserCheck } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface Lead {
  id: number;
  lead_code: string;
  name: string;
  phone: string | null;
  industry_id: number | null;
  industries?: { id: number; name: string } | null;
  address: string | null;
  assigned_staff_id: number | null;
  employees?: { id: number; full_name: string; employee_id: string } | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Industry {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  full_name: string;
  employee_id: string;
  department?: string;
}

export default function LeadsRegistryPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });
  const [convertConfirm, setConvertConfirm] = useState<{ isOpen: boolean; lead: Lead | null }>({
    isOpen: false,
    lead: null
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, indRes, empRes] = await Promise.all([
        api.get('/leads'),
        api.get('/industries'),
        api.get('/employees')
      ]);
      setLeads(leadsRes.data || []);
      setIndustries(indRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      toast.error('Failed to load leads registry details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddOrUpdate = async (formData: any) => {
    const loadingToast = toast.loading(editingLead ? 'Updating lead details...' : 'Creating new lead...');
    
    // Normalize fields
    const payload = {
      name: formData.name,
      phone: formData.phone || null,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address || null,
      assigned_staff_id: formData.assigned_staff_id ? parseInt(formData.assigned_staff_id, 10) : null,
      status: formData.status || 'New'
    };

    try {
      if (editingLead) {
        await api.put(`/leads/${editingLead.id}`, payload);
        toast.success('Lead updated successfully!', { id: loadingToast });
      } else {
        await api.post('/leads', payload);
        toast.success('New lead registered successfully!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingLead(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Removing lead record...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/leads/${deleteConfirm.id}`);
      toast.success('Lead removed successfully', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete lead', { id: loadingToast });
    }
  };

  const handleConvertLead = async () => {
    if (!convertConfirm.lead) return;
    const leadId = convertConfirm.lead.id;
    const loadingToast = toast.loading('Converting lead to customer organization...');
    setConvertConfirm({ isOpen: false, lead: null });
    try {
      const response = await api.post(`/leads/${leadId}/convert`);
      toast.success('Lead converted to customer successfully!', { id: loadingToast });
      
      setCredsModal({
        isOpen: true,
        data: {
          full_name: response.data.organization.name,
          username: response.data.credentials.username,
          password: response.data.credentials.password
        }
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to convert lead to customer', { id: loadingToast });
    }
  };

  const leadFields: FormField[] = [
    {
      name: 'name',
      label: 'Lead / Company Name',
      type: 'text',
      placeholder: 'e.g. Acme Corporation',
      required: true,
      defaultValue: editingLead?.name
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'text',
      placeholder: 'e.g. +91 98765 43210',
      required: false,
      defaultValue: editingLead?.phone || undefined
    },
    {
      name: 'industry_id',
      label: 'Industry Sector',
      type: 'select',
      options: [
        { label: 'Select Industry Sector', value: '' },
        ...industries.map(i => ({ label: i.name, value: String(i.id) }))
      ],
      required: false,
      defaultValue: editingLead?.industry_id ? String(editingLead.industry_id) : undefined
    },
    {
      name: 'address',
      label: 'Full Address',
      type: 'text',
      placeholder: 'e.g. Suite 500, Tech Park, City',
      maxLength: 200,
      defaultValue: editingLead?.address || undefined
    },
    {
      name: 'assigned_staff_id',
      label: 'Assign Marketing Operator (Staff)',
      type: 'select',
      options: [
        { label: 'Unassigned', value: '' },
        ...employees.map(e => ({ 
          label: `${e.full_name} (${e.employee_id})`, 
          value: String(e.id) 
        }))
      ],
      required: false,
      defaultValue: editingLead?.assigned_staff_id ? String(editingLead.assigned_staff_id) : undefined
    },
    {
      name: 'status',
      label: 'Lead Status',
      type: 'select',
      options: [
        { label: 'New', value: 'New' },
        { label: 'Contacted', value: 'Contacted' },
        { label: 'Qualified', value: 'Qualified' },
        { label: 'Proposal Sent', value: 'Proposal Sent' },
        { label: 'Converted', value: 'Converted' },
        { label: 'Lost', value: 'Lost' }
      ],
      required: true,
      defaultValue: editingLead?.status || 'New'
    }
  ];

  const columns: Column<Lead>[] = [
    {
      header: 'Lead Details',
      accessor: (l) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm flex-shrink-0">
            <Target size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{l.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{l.lead_code || `Lead ID: #${l.id}`}</p>
              {l.phone && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <p className="text-[9px] font-bold text-zinc-500">{l.phone}</p>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <p className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest">{l.industries?.name || 'Unknown Sector'}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Assigned Operator',
      accessor: (l) => (
        l.employees ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-[#3a525d]">{l.employees.full_name}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{l.employees.employee_id}</p>
            </div>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-zinc-50 border border-zinc-150 rounded-lg text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Unassigned</span>
        )
      )
    },
    {
      header: 'Status',
      accessor: (l) => {
        const colors: Record<string, string> = {
          'New': 'bg-blue-50 text-blue-750 border-blue-150',
          'Contacted': 'bg-amber-50 text-amber-700 border-amber-150',
          'Qualified': 'bg-indigo-50 text-indigo-700 border-indigo-150',
          'Proposal Sent': 'bg-purple-50 text-purple-750 border-purple-150',
          'Converted': 'bg-green-50 text-green-700 border-green-150',
          'Lost': 'bg-red-50 text-red-650 border-red-150'
        };
        const cls = colors[l.status] || 'bg-zinc-50 text-zinc-500 border-zinc-200';
        return (
          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${cls}`}>
            {l.status}
          </span>
        );
      }
    },
    {
      header: 'Address / Location',
      accessor: (l) => (
        <div className="flex items-center gap-2 text-zinc-500">
          <MapPin size={14} className="text-[#2d8d9b] flex-shrink-0" />
          <span className="text-xs font-semibold truncate max-w-[200px]">{l.address || 'No Address Listed'}</span>
        </div>
      )
    },
    {
      header: 'Registered Date',
      accessor: (l) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-[#3a525d] flex items-center gap-1.5">
            <Calendar size={12} className="text-zinc-400" />
            {l.created_at ? new Date(l.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5 pl-4.5">Registry Log</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (l) => (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingLead(l);
              setIsAdding(true);
            }}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm !p-0"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={() => setDeleteConfirm({ isOpen: true, id: l.id })}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm !p-0"
          >
            <Trash2 size={16} />
          </Button>
          {l.status !== 'Converted' && (
            <Button
              onClick={() => setConvertConfirm({ isOpen: true, lead: l })}
              variant="secondary"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all shadow-sm !p-0"
              title="Convert to Customer"
            >
              <UserCheck size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <DynamicForm 
          title={editingLead ? "Edit Lead Profile" : "Register New Lead"}
          subtitle={editingLead ? `Update details for ${editingLead.name}` : "Configure a new sales prospect profile"}
          fields={leadFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
            setIsAdding(false);
            setEditingLead(null);
          }}
          submitLabel={editingLead ? "Save Changes" : "Register Lead"}
          columns={1}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Leads Registry</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Prospecting Directory & Staff Assignments
          </p>
        </div>

        <Button
          onClick={() => setIsAdding(true)}
          className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
        >
          <Plus size={20} strokeWidth={3} />
          Register Lead
        </Button>
      </div>

      <DataTable 
        title="Leads Registry"
        subtitle="Manage and assign operators to prospective clients"
        columns={columns}
        data={leads}
        isLoading={isLoading}
        searchPlaceholder="Search by name, status, industry or operator..."
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Remove Lead Profile?"
        message="This will permanently delete the lead record and all assignment logs. This action cannot be undone."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Yes, Delete"
        variant="danger"
      />

      <ConfirmModal 
        isOpen={convertConfirm.isOpen}
        title="Convert Lead to Customer?"
        message={`This will register ${convertConfirm.lead?.name} as a new customer organization, assign their marketing operator as Relationship Manager, and auto-generate login credentials. This status change is permanent.`}
        onConfirm={handleConvertLead}
        onCancel={() => setConvertConfirm({ isOpen: false, lead: null })}
        confirmLabel="Yes, Convert"
        variant="primary"
      />

      <CredentialsModal
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />
    </div>
  );
}
