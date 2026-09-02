'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Users, MapPin, Edit2, Trash2, Calendar, Target, ShieldCheck, UserCheck, Eye, Phone, Clock, Briefcase, FileText, X, Check, MessageSquarePlus } from 'lucide-react';
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
  remarks: string | null;
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
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [remarkingLead, setRemarkingLead] = useState<Lead | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');

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
      status: formData.status || 'New',
      remarks: formData.remarks || null
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
    },
    {
      name: 'remarks',
      label: 'Remarks / Notes',
      type: 'textarea',
      placeholder: 'e.g. Needs pricing details, contacted via email...',
      required: false,
      defaultValue: editingLead?.remarks || undefined
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
      header: 'Remarks',
      accessor: (l) => {
        const remarksList = Array.isArray(l.remarks) ? l.remarks : [];
        const latest = remarksList[remarksList.length - 1];
        const displayVal = latest ? latest.text : (typeof l.remarks === 'string' ? l.remarks : '—');
        return (
          <span className="text-xs font-semibold text-zinc-500 truncate max-w-[150px] inline-block" title={displayVal !== '—' ? displayVal : undefined}>
            {displayVal}
          </span>
        );
      }
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
            onClick={() => setViewingLead(l)}
            variant="none"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-100 text-zinc-650 border border-zinc-200 hover:bg-zinc-200 transition-all shadow-sm p-0"
            title="View Details"
          >
            <Eye size={16} className="text-zinc-650 shrink-0" />
          </Button>
          <Button
            onClick={() => setRemarkingLead(l)}
            variant="none"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-sm p-0"
            title="Add Remark"
          >
            <MessageSquarePlus size={16} className="text-indigo-600 shrink-0" />
          </Button>
          <Button
            onClick={() => {
              setEditingLead(l);
              setIsAdding(true);
            }}
            variant="none"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm p-0"
            title="Edit Lead"
          >
            <Edit2 size={16} className="text-[#2d8d9b] shrink-0" />
          </Button>
          <Button
            onClick={() => setDeleteConfirm({ isOpen: true, id: l.id })}
            variant="none"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white transition-all shadow-sm p-0"
            title="Delete Lead"
          >
            <Trash2 size={16} className="text-red-500 shrink-0" />
          </Button>
          {l.status !== 'Converted' && (
            <Button
              onClick={() => setConvertConfirm({ isOpen: true, lead: l })}
              variant="none"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-50 text-green-600 border border-green-200 hover:bg-green-600 hover:text-white transition-all shadow-sm p-0"
              title="Convert to Customer"
            >
              <UserCheck size={16} className="text-green-600 shrink-0" />
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
          fields={leadFields.filter(f => f.name !== 'remarks' || !editingLead)}
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
        title="Leads"
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

      <LeadViewModal
        isOpen={!!viewingLead}
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        onEdit={() => {
          setEditingLead(viewingLead);
          setViewingLead(null);
          setIsAdding(true);
        }}
        onConvert={() => {
          setConvertConfirm({ isOpen: true, lead: viewingLead });
          setViewingLead(null);
        }}
        onAddRemark={() => setRemarkingLead(viewingLead)}
      />

      {remarkingLead && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setRemarkingLead(null); setNewRemarkText(''); }} />
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col p-8 space-y-4">
            <div>
              <h3 className="text-lg font-black text-[#3a525d] italic">Add Lead Remark</h3>
              <p className="text-xs text-zinc-400 font-bold mt-0.5">Recording update for {remarkingLead.name}</p>
            </div>
            
            <textarea
              className="w-full min-h-[110px] p-4 text-xs border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#2d8d9b] resize-none font-semibold text-zinc-650"
              placeholder="Type new follow-up remark or update notes..."
              value={newRemarkText}
              onChange={(e) => setNewRemarkText(e.target.value)}
            />

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setRemarkingLead(null); setNewRemarkText(''); }}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl text-zinc-400 border border-zinc-200 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newRemarkText.trim()) return;
                  const loadingToast = toast.loading('Saving remark...');
                  try {
                    await api.post(`/leads/${remarkingLead.id}/remarks`, { text: newRemarkText.trim() });
                    toast.success('Remark added successfully!', { id: loadingToast });
                    setNewRemarkText('');
                    setRemarkingLead(null);
                    fetchData();
                  } catch (e: any) {
                    toast.error(e.response?.data?.error || 'Failed to save remark', { id: loadingToast });
                  }
                }}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl bg-[#2d8d9b] hover:bg-[#257a87] text-white border-none shadow-sm shadow-[#2d8d9b]/15"
              >
                Add Entry
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface LeadViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: () => void;
  onConvert: () => void;
  onAddRemark: () => void;
}

const LeadViewModal: React.FC<LeadViewModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
  onConvert,
  onAddRemark
}) => {
  if (!isOpen || !lead) return null;

  const statusColors: Record<string, string> = {
    'New': 'bg-blue-50 text-blue-750 border-blue-150',
    'Contacted': 'bg-amber-50 text-amber-700 border-amber-150',
    'Qualified': 'bg-indigo-50 text-indigo-700 border-indigo-150',
    'Proposal Sent': 'bg-purple-50 text-purple-750 border-purple-150',
    'Converted': 'bg-green-50 text-green-700 border-green-150',
    'Lost': 'bg-red-50 text-red-650 border-red-150'
  };

  const statusCls = statusColors[lead.status] || 'bg-zinc-50 text-zinc-500 border-zinc-200';

  // Roadmap Pipeline configuration
  const allStages = [
    { key: 'New', label: 'Lead Registered', description: 'Initial contact logged' },
    { key: 'Contacted', label: 'Contacted', description: 'Communication initiated' },
    { key: 'Qualified', label: 'Qualified', description: 'Requirements validated' },
    { key: 'Proposal Sent', label: 'Proposal Sent', description: 'Pricing details offered' },
    { key: 'Converted', label: 'Converted', description: 'Customer won!' }
  ];

  const getStatusIndex = (status: string) => {
    if (status === 'Lost') return 3; // Put Lost after Proposal Sent
    return allStages.findIndex(s => s.key === status);
  };

  const currentIndex = getStatusIndex(lead.status);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.4)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header banner */}
        <div className="bg-[#3a525d] py-5 px-6 text-white relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-white/10 border-white/20 text-white`}>
                {lead.lead_code || `Lead #${lead.id}`}
              </span>
              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${statusCls} bg-white text-zinc-800`}>
                {lead.status}
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <h3 className="text-2xl font-black italic tracking-tight">{lead.name}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2d8d9b] mt-0.5">Lead Profile & Details</p>
        </div>

        {/* Details Content */}
        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Roadmap Timeline Flow */}
          <div className="bg-zinc-50/80 border border-zinc-100 rounded-3xl p-6 px-8 relative">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Sales Pipeline Journey</h4>
            
            <div className="relative flex flex-col md:flex-row items-stretch md:items-start justify-between gap-6 md:gap-4">
              {/* Horizontal Line on Desktop */}
              <div className="absolute top-5 left-8 right-8 h-0.5 bg-zinc-200 hidden md:block z-0" />

              {allStages.map((stage, idx) => {
                const isLost = lead.status === 'Lost';
                const isLastStage = idx === allStages.length - 1;

                let isCompleted = false;
                let isActive = false;
                let isSpecialLost = false;

                if (isLost && isLastStage) {
                  isSpecialLost = true;
                } else if (idx <= currentIndex) {
                  isCompleted = idx < currentIndex || lead.status === stage.key;
                  isActive = lead.status === stage.key;
                }

                // Set proper timestamp text for pipeline node
                let dateText = '';
                if (idx === 0) {
                  dateText = lead.created_at ? new Date(lead.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '';
                } else if (isActive || (isLastStage && (lead.status === 'Converted' || lead.status === 'Lost'))) {
                  dateText = lead.updated_at ? new Date(lead.updated_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '';
                }

                // Class mappings for circles & labels
                let circleCls = 'bg-white border-zinc-200 text-zinc-400';
                let labelCls = 'text-zinc-400 font-bold';
                let descCls = 'text-zinc-400 font-semibold';

                if (isSpecialLost) {
                  circleCls = 'bg-red-50 border-red-300 text-red-650 ring-4 ring-red-100';
                  labelCls = 'text-red-650 font-black';
                  descCls = 'text-red-400 font-semibold';
                } else if (isActive) {
                  circleCls = stage.key === 'Converted'
                    ? 'bg-green-500 border-green-500 text-white ring-4 ring-green-100'
                    : 'bg-[#2d8d9b] border-[#2d8d9b] text-white ring-4 ring-[#2d8d9b]/25';
                  labelCls = 'text-[#3a525d] font-black';
                  descCls = 'text-[#2d8d9b] font-bold';
                } else if (isCompleted) {
                  circleCls = 'bg-green-50 border-green-200 text-green-600';
                  labelCls = 'text-zinc-700 font-bold';
                  descCls = 'text-zinc-500 font-medium';
                }

                return (
                  <div key={stage.key} className="flex md:flex-col items-center md:text-center gap-4 md:gap-2 z-10 flex-1 relative">
                    {/* Outer line for mobile vertical alignment */}
                    <div className="absolute top-10 left-5 bottom-[-24px] w-0.5 bg-zinc-200 md:hidden z-0 last:hidden" />

                    {/* Node Circle */}
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs shadow-sm transition-all duration-300 ${circleCls} z-10 bg-white`}>
                      {isSpecialLost ? (
                        <X size={14} strokeWidth={3} />
                      ) : (isCompleted && !isActive) || (isActive && stage.key === 'Converted') ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        <span>0{idx + 1}</span>
                      )}
                    </div>

                    {/* Content block */}
                    <div className="flex flex-col items-start md:items-center text-left md:text-center w-full">
                      <span className={`text-xs ${labelCls}`}>
                        {isSpecialLost ? 'Lost' : stage.label}
                      </span>
                      <span className={`text-[9px] mt-0.5 max-w-[110px] leading-tight ${descCls}`}>
                        {isSpecialLost ? 'Prospect lost' : stage.description}
                      </span>
                      {dateText && (
                        <span className="px-1.5 py-0.5 bg-white text-[#3a525d] rounded-md text-[9px] font-black border border-zinc-200 shadow-sm mt-1.5 inline-block w-fit">
                          {dateText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Phone Number</label>
              <div className="flex items-center gap-2 mt-1">
                <Phone size={14} className="text-[#2d8d9b]" />
                <p className="text-sm font-bold text-[#3a525d]">{lead.phone || 'No Phone Number'}</p>
              </div>
            </div>

            {/* Industry */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Industry Sector</label>
              <div className="flex items-center gap-2 mt-1">
                <Briefcase size={14} className="text-[#2d8d9b]" />
                <p className="text-sm font-bold text-[#3a525d]">{lead.industries?.name || 'Unknown Sector'}</p>
              </div>
            </div>

            {/* Assigned operator */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 col-span-1 md:col-span-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Assigned Operator</label>
              {lead.employees ? (
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#3a525d]">{lead.employees.full_name}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{lead.employees.employee_id}</p>
                  </div>
                </div>
              ) : (
                <span className="px-2 py-0.5 mt-1.5 inline-block bg-zinc-50 border border-zinc-150 rounded-lg text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Unassigned</span>
              )}
            </div>

            {/* Location */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 col-span-1 md:col-span-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Address / Location</label>
              <div className="flex items-start gap-2 mt-1">
                <MapPin size={16} className="text-[#2d8d9b] mt-0.5 flex-shrink-0" />
                <p className="text-sm font-bold text-[#3a525d]">{lead.address || 'No Address Listed'}</p>
              </div>
            </div>

            {/* Remarks History */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 col-span-1 md:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Remarks History</label>
                <Button
                  onClick={() => {
                    onAddRemark();
                    onClose();
                  }}
                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-[#2d8d9b] hover:bg-[#257a87] text-white rounded-lg h-auto border-none shadow-sm"
                >
                  + Add Remark
                </Button>
              </div>
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {Array.isArray(lead.remarks) && lead.remarks.length > 0 ? (
                  lead.remarks.map((r: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white border border-zinc-150 rounded-xl space-y-1 shadow-sm">
                      <div className="flex justify-between items-center text-[9px] font-black text-[#2d8d9b] uppercase tracking-wider">
                        <span>Entry #{idx + 1}</span>
                        <span>{r.date} {r.time && `@ ${r.time}`}</span>
                      </div>
                      <p className="text-xs text-zinc-650 font-medium whitespace-pre-wrap leading-relaxed">{r.text}</p>
                    </div>
                  ))
                ) : typeof lead.remarks === 'string' && lead.remarks.trim() !== '' ? (
                  <div className="p-3 bg-white border border-zinc-150 rounded-xl space-y-1 shadow-sm">
                    <div className="flex justify-between items-center text-[9px] font-black text-[#2d8d9b] uppercase tracking-wider">
                      <span>Initial Entry</span>
                    </div>
                    <p className="text-xs text-zinc-650 font-medium whitespace-pre-wrap leading-relaxed">{lead.remarks}</p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium italic">No remarks recorded for this lead.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest text-zinc-400 flex-1 order-3 sm:order-1"
          >
            Close
          </Button>
          
          <Button 
            onClick={onEdit} 
            className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#2d8d9b] text-white flex-1 gap-2 order-1 sm:order-2 hover:bg-[#257a87]"
          >
            <Edit2 size={14} />
            Edit Profile
          </Button>

          {lead.status !== 'Converted' && (
            <Button 
              onClick={onConvert} 
              className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest bg-green-600 text-white flex-1 gap-2 order-2 sm:order-3 hover:bg-green-700"
            >
              <UserCheck size={14} />
              Convert Lead
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
