'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Users, MapPin, Edit2, Trash2, Calendar, Target, ShieldCheck, UserCheck, Phone, Mail, Clock, Briefcase, FileText, X, Check, MessageSquarePlus, CheckCircle2, PauseCircle, Sparkles, User, Building2, Tag } from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { formatDate } from '@/lib/formatters';

interface Lead {
  id: number;
  lead_code: string;
  name: string;
  phone: string | null;
  email?: string | null;
  industry_id: number | null;
  industries?: { id: number; name: string } | null;
  address: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  pin_code?: string | null;
  country?: string | null;
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
  const [contactLead, setContactLead] = useState<Lead | null>(null);
  const [contactNoteText, setContactNoteText] = useState('');
  const [contactResponseType, setContactResponseType] = useState<'hold' | 'positive'>('hold');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse current user from localStorage:', e);
    }
  }, []);

  const authorName = currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Muhammed Hafiz';
  const authorDesignation = currentUser?.designation || currentUser?.role || 'Relationship Manager';
  const authorDepartment = currentUser?.department || 'Corporate Sales';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, indRes, empRes] = await Promise.allSettled([
        api.get('/leads'),
        api.get('/industries'),
        api.get('/employees')
      ]);

      if (leadsRes.status === 'fulfilled') {
        setLeads(leadsRes.value.data || []);
      } else {
        console.error('Failed to load leads:', leadsRes.reason);
        toast.error('Failed to load leads registry details');
      }

      if (indRes.status === 'fulfilled') {
        setIndustries(indRes.value.data || []);
      } else {
        console.error('Failed to load industries:', indRes.reason);
      }

      if (empRes.status === 'fulfilled') {
        setEmployees(empRes.value.data || []);
      } else {
        console.error('Failed to load employees:', empRes.reason);
      }
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
    if (!formData.phone || !formData.phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }

    const loadingToast = toast.loading(editingLead ? 'Updating lead details...' : 'Creating new lead...');

    // Automatically resolve assigned staff from logged-in user if creating
    const matchedEmployee = employees.find(e => 
      (currentUser?.employeeId && e.employee_id === currentUser.employeeId) ||
      (currentUser?.fullName && e.full_name?.toLowerCase() === currentUser.fullName?.toLowerCase()) ||
      (currentUser?.id && (e as any).user_id === currentUser.id)
    );
    const resolvedAssignedStaffId = editingLead 
      ? editingLead.assigned_staff_id 
      : (matchedEmployee ? matchedEmployee.id : null);

    // Normalize fields
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email?.trim() || null,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      pincode: formData.pincode?.trim() || null,
      pin_code: formData.pincode?.trim() || null,
      country: formData.country?.trim() || 'India',
      assigned_staff_id: resolvedAssignedStaffId,
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
          email: response.data.credentials.email,
          password: response.data.credentials.password
        }
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to convert lead to customer', { id: loadingToast });
    }
  };

  const handleSaveContactOutcome = async () => {
    if (!contactLead) return;
    if (!contactNoteText.trim()) {
      toast.error('Please enter communication notes');
      return;
    }

    const isPositive = contactResponseType === 'positive';
    const loadingToast = toast.loading(
      isPositive ? 'Validating requirements & converting lead to customer...' : 'Saving contact note...'
    );

    try {
      const response = await api.post(`/leads/${contactLead.id}/contact-log`, {
        text: contactNoteText.trim(),
        response_type: contactResponseType,
        author: {
          name: authorName,
          designation: authorDesignation,
          department: authorDepartment
        }
      });

      toast.success(response.data.message || 'Contact outcome recorded successfully!', { id: loadingToast });

      const updatedLead = response.data.lead;
      const targetLeadId = contactLead.id;

      // Reset modal inputs
      setContactLead(null);
      setContactNoteText('');
      setContactResponseType('hold');

      // If positive outcome, open credentials modal with generated login details
      if (response.data.credentials && response.data.organization) {
        setCredsModal({
          isOpen: true,
          data: {
            full_name: response.data.organization.name,
            username: response.data.credentials.username,
            email: response.data.credentials.email,
            password: response.data.credentials.password
          }
        });
      }

      // Update viewing modal state if currently viewing this lead
      if (viewingLead && viewingLead.id === targetLeadId && updatedLead) {
        setViewingLead(updatedLead);
      }

      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save contact outcome', { id: loadingToast });
    }
  };



  const columns: Column<Lead>[] = [
    {
      header: 'Lead ID',
      className: 'w-[130px] whitespace-nowrap',
      sortValue: (l) => l.lead_code || String(l.id),
      accessor: (l) => {
        const idLabel = l.lead_code || `#${l.id}`;
        return (
          <button
            type="button"
            onClick={() => setViewingLead(l)}
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#fce4d4]/40 text-[#8b6b5a] border border-[#fce4d4] hover:bg-[#fce4d4]/70 transition-all cursor-pointer"
            title="Click to view details"
          >
            {idLabel}
          </button>
        );
      }
    },
    {
      header: 'Name',
      className: 'min-w-[200px]',
      sortValue: (l) => l.name,
      accessor: (l) => (
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setViewingLead(l)}
            className="w-9 h-9 bg-[#3a525d]/5 hover:bg-[#2d8d9b]/15 rounded-xl flex items-center justify-center text-[#3a525d] hover:text-[#2d8d9b] border border-[#3a525d]/10 transition-all cursor-pointer shrink-0 group"
            title="Click to view details"
          >
            <Target size={18} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <button
              type="button"
              onClick={() => setViewingLead(l)}
              className="text-left font-black text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline transition-all cursor-pointer border-none bg-transparent p-0 outline-none block"
              title="Click to view details"
            >
              {l.name}
            </button>
            <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-wider mt-0.5">
              {l.industries?.name || 'Institutional'}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Phone',
      className: 'w-[150px] whitespace-nowrap',
      sortValue: (l) => l.phone || '',
      accessor: (l) => (
        l.phone ? (
          <a
            href={`tel:${l.phone}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#3a525d] hover:text-[#2d8d9b] transition-colors"
            title={`Call ${l.phone}`}
          >
            <Phone size={13} className="text-[#2d8d9b] shrink-0" />
            <span>{l.phone}</span>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Sales Person',
      className: 'w-[180px] whitespace-nowrap',
      sortValue: (l) => l.employees?.full_name || '',
      accessor: (l) => (
        l.employees ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-[#3a525d]">{l.employees.full_name}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{l.employees.employee_id}</p>
            </div>
          </div>
        ) : (
          <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Unassigned</span>
        )
      )
    },
    {
      header: 'Status',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (l) => l.status,
      accessor: (l) => {
        const colors: Record<string, string> = {
          'New': 'bg-blue-50 text-blue-700 border-blue-200',
          'Contacted': 'bg-amber-50 text-amber-700 border-amber-200',
          'Qualified': 'bg-indigo-50 text-indigo-700 border-indigo-200',
          'Proposal Sent': 'bg-purple-50 text-purple-700 border-purple-200',
          'Converted': 'bg-green-50 text-green-700 border-green-200',
          'Lost': 'bg-red-50 text-red-650 border-red-200'
        };
        const cls = colors[l.status] || 'bg-zinc-50 text-zinc-500 border-zinc-200';
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${cls}`}>
            {l.status}
          </span>
        );
      }
    }
  ];



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
        onDelete={() => {
          if (viewingLead) {
            setDeleteConfirm({ isOpen: true, id: viewingLead.id });
            setViewingLead(null);
          }
        }}
        onAddRemark={() => {
          if (viewingLead) {
            setContactLead(viewingLead);
            setContactResponseType('hold');
            setContactNoteText('');
          }
        }}
        onOpenContactNote={(l: Lead) => {
          setContactLead(l);
          setContactResponseType('hold');
          setContactNoteText('');
        }}
      />

      {contactLead && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => {
              setContactLead(null);
              setContactNoteText('');
              setContactResponseType('hold');
            }}
          />
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col p-8 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2d8d9b]/10 text-[#2d8d9b] text-[10px] font-black uppercase tracking-wider">
                    {contactLead.lead_code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                    Stage: {contactLead.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#3a525d] italic mt-1.5">
                  Contacted Stage Note & Outcome
                </h3>
                <p className="text-xs text-zinc-400 font-bold mt-0.5">
                  Recording communication log for <span className="text-[#3a525d] font-black">{contactLead.name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setContactLead(null);
                  setContactNoteText('');
                  setContactResponseType('hold');
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Auto-Fetched Logged-In User Details */}
            <div className="bg-gradient-to-r from-teal-50/70 to-cyan-50/40 border border-teal-100/80 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-teal-700 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#2d8d9b]" />
                  Updating Staff Details (Auto-Fetched)
                </span>
                <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                  Active Session
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/80 rounded-xl p-2.5 border border-teal-100/60">
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Staff Name</p>
                  <p className="text-xs font-black text-[#3a525d] truncate mt-0.5">{authorName}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-2.5 border border-teal-100/60">
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Designation</p>
                  <p className="text-xs font-black text-[#2d8d9b] truncate mt-0.5">{authorDesignation}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-2.5 border border-teal-100/60">
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Department</p>
                  <p className="text-xs font-black text-zinc-700 truncate mt-0.5">{authorDepartment}</p>
                </div>
              </div>
            </div>

            {/* Radio Button for Response Outcome */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
                Pipeline Response Outcome *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Hold Option */}
                <label
                  onClick={() => setContactResponseType('hold')}
                  className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    contactResponseType === 'hold'
                      ? 'border-amber-400 bg-amber-50/50 shadow-sm shadow-amber-100'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        contactResponseType === 'hold' ? 'border-amber-500 bg-amber-500' : 'border-zinc-300'
                      }`}>
                        {contactResponseType === 'hold' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-black text-[#3a525d] flex items-center gap-1.5">
                        <PauseCircle size={14} className="text-amber-500" />
                        Hold
                      </span>
                    </div>
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded uppercase">
                      Stays Contacted
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed pl-6">
                    Awaiting decision or client follow-up pending. Lead maintains Contacted status.
                  </p>
                </label>

                {/* Positive Option */}
                <label
                  onClick={() => setContactResponseType('positive')}
                  className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    contactResponseType === 'positive'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-100'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        contactResponseType === 'positive' ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300'
                      }`}>
                        {contactResponseType === 'positive' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-black text-[#3a525d] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-600" />
                        Positive
                      </span>
                    </div>
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded uppercase">
                      Advances & Converts
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed pl-6">
                    Requirements validated! Moves to <span className="font-bold text-emerald-700">Qualified</span> and auto-converts to a <span className="font-bold text-emerald-700">Customer Organization</span>.
                  </p>
                </label>
              </div>
            </div>

            {/* Note text area */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
                Discussion Note & Requirements *
              </label>
              <textarea
                className="w-full min-h-[100px] p-4 text-xs border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 resize-none font-semibold text-zinc-650"
                placeholder="Document client interaction, garment styles requested, quantity targets, budget expectations..."
                value={contactNoteText}
                onChange={(e) => setContactNoteText(e.target.value)}
              />
            </div>

            {/* Dynamic Banner */}
            {contactResponseType === 'positive' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-emerald-800 leading-snug">
                  <span className="font-black">Auto-Conversion Notice:</span> Submitting with Positive will automatically create a Customer Organization profile and generate login credentials for this client.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <PauseCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-amber-800 leading-snug">
                  <span className="font-black">Hold Status:</span> Lead remains at Contacted stage. You can add further notes or qualify at any time.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setContactLead(null);
                  setContactNoteText('');
                  setContactResponseType('hold');
                }}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl text-zinc-400 border border-zinc-200 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveContactOutcome}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl text-white border-none shadow-sm transition-all ${
                  contactResponseType === 'positive'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-[#2d8d9b] hover:bg-[#257a87] shadow-[#2d8d9b]/20'
                }`}
              >
                {contactResponseType === 'positive' ? 'Qualify & Convert to Customer' : 'Save Note (Keep on Hold)'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <LeadFormModal
        isOpen={isAdding}
        onClose={() => {
          setIsAdding(false);
          setEditingLead(null);
        }}
        onSubmit={handleAddOrUpdate}
        editingLead={editingLead}
        industries={industries}
        authorName={authorName}
        authorDesignation={authorDesignation}
        authorDepartment={authorDepartment}
      />
    </div>
  );
}

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  editingLead: Lead | null;
  industries: Industry[];
  authorName: string;
  authorDesignation: string;
  authorDepartment: string;
}

const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingLead,
  industries,
  authorName,
  authorDesignation,
  authorDepartment
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');
  const [status, setStatus] = useState('New');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingLead) {
      setName(editingLead.name || '');
      setPhone(editingLead.phone || '');
      setEmail(editingLead.email || '');
      setIndustryId(editingLead.industry_id ? String(editingLead.industry_id) : '');
      setAddress(editingLead.address || '');
      setCity(editingLead.city || '');
      setState(editingLead.state || '');
      setPincode(editingLead.pincode || editingLead.pin_code || '');
      setCountry(editingLead.country || 'India');
      setStatus(editingLead.status || 'New');
      setRemarks('');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setIndustryId('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setCountry('India');
      setStatus('New');
      setRemarks('');
    }
  }, [editingLead, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Lead / Company name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        industry_id: industryId || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        pin_code: pincode.trim() || null,
        country: country.trim() || null,
        status: status || 'New',
        remarks: remarks.trim() || null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col my-8 z-10 max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3a525d] to-[#24343b] px-8 py-6 text-white relative flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-[#2d8d9b]/30 text-teal-200 border border-[#2d8d9b]/40 text-[9px] font-black uppercase tracking-wider">
                {editingLead ? (editingLead.lead_code || `Lead #${editingLead.id}`) : 'Lead Pipeline'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[9px] font-black uppercase tracking-wider">
                {editingLead ? 'Edit Profile' : 'New Prospect'}
              </span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tight">
              {editingLead ? 'Edit Lead Profile' : 'Register New Lead'}
            </h3>
            <p className="text-xs text-white/70 font-semibold mt-0.5">
              {editingLead ? `Update details for ${editingLead.name}` : 'Configure prospect profile to initiate the commercial sales pipeline'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
          {/* Company / Prospect Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#2d8d9b]" />
              Lead / Company Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corporation, St. Mary Academy"
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Phone & Email in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Phone size={13} className="text-[#2d8d9b]" />
                Primary Phone Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Mail size={13} className="text-[#2d8d9b]" />
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@acme.com"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Industry & Status in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#2d8d9b]" />
                Industry Sector
              </label>
              <select
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="">Select Industry Sector</option>
                {industries.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Tag size={13} className="text-[#2d8d9b]" />
                Pipeline Stage *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          {/* Address Breakdown: Street, City, State, Pin code, Country */}
          <div className="space-y-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <MapPin size={13} className="text-[#2d8d9b]" />
              Address Details
            </div>

            {/* Street / Building Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Street / Building Address
              </label>
              <input
                type="text"
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Suite 500, Tech Park, MG Road"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* City & State in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  City
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, Bengaluru"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  State
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra, Karnataka"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Pin Code & Country in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Pin Code
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 560001"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Country
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Remarks (Only when registering new lead) */}
          {!editingLead && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <FileText size={13} className="text-[#2d8d9b]" />
                Initial Notes & Remarks
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Initial client discussion on custom uniform specifications, order quantity range..."
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-semibold text-zinc-800 transition-all placeholder:text-zinc-400 resize-none"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-[#3a525d] hover:bg-[#2d8d9b] transition-all shadow-lg shadow-[#3a525d]/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : editingLead ? 'Save Changes' : 'Register Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface LeadViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: () => void;
  onConvert: () => void;
  onDelete?: () => void;
  onAddRemark: () => void;
  onOpenContactNote: (lead: Lead) => void;
}

const LeadViewModal: React.FC<LeadViewModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
  onConvert,
  onDelete,
  onAddRemark,
  onOpenContactNote
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
                  dateText = formatDate(lead.created_at);
                } else if (isActive || (isLastStage && (lead.status === 'Converted' || lead.status === 'Lost'))) {
                  dateText = formatDate(lead.updated_at);
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
                    <div
                      onClick={() => {
                        if (stage.key === 'Contacted') {
                          onOpenContactNote(lead);
                        }
                      }}
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs shadow-sm transition-all duration-300 ${circleCls} z-10 bg-white ${
                        stage.key === 'Contacted' ? 'cursor-pointer hover:scale-110 active:scale-95 hover:ring-4 hover:ring-[#2d8d9b]/25' : ''
                      }`}
                      title={stage.key === 'Contacted' ? 'Click to record contact note & outcome' : undefined}
                    >
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
                      {/* Action button specifically for Contacted stage */}
                      {stage.key === 'Contacted' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenContactNote(lead);
                          }}
                          className="mt-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-[#2d8d9b] hover:bg-[#257a87] text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <FileText size={10} />
                          <span>{lead.status === 'Contacted' ? 'Log Outcome' : 'Add Note'}</span>
                        </button>
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

            {/* Email */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Email Address</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail size={14} className="text-[#2d8d9b]" />
                <p className="text-sm font-bold text-[#3a525d] truncate">{lead.email || 'No Email Provided'}</p>
              </div>
            </div>

            {/* Industry */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 col-span-1 md:col-span-2">
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
              <div className="flex items-start gap-2.5 mt-1">
                <MapPin size={16} className="text-[#2d8d9b] mt-0.5 flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-bold text-[#3a525d]">
                    {lead.address || (lead.city || lead.state || lead.pincode || lead.pin_code || lead.country ? '' : 'No Address Listed')}
                  </p>
                  {(lead.city || lead.state || lead.pincode || lead.pin_code || lead.country) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-600">
                      {lead.city && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-zinc-200/80 shadow-2xs">
                          {lead.city}
                        </span>
                      )}
                      {lead.state && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-zinc-200/80 shadow-2xs">
                          {lead.state}
                        </span>
                      )}
                      {(lead.pincode || lead.pin_code) && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-zinc-200/80 shadow-2xs text-[#2d8d9b]">
                          PIN: {lead.pincode || lead.pin_code}
                        </span>
                      )}
                      {lead.country && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-zinc-200/80 shadow-2xs text-zinc-500">
                          {lead.country}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remarks History */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 col-span-1 md:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Remarks & Communication History</label>
                <Button
                  onClick={() => onOpenContactNote(lead)}
                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-[#2d8d9b] hover:bg-[#257a87] text-white rounded-lg h-auto border-none shadow-sm flex items-center gap-1.5"
                >
                  <MessageSquarePlus size={11} />
                  + Add Contact Note
                </Button>
              </div>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {Array.isArray(lead.remarks) && lead.remarks.length > 0 ? (
                  lead.remarks.map((r: any, idx: number) => (
                    <div key={idx} className="p-3.5 bg-white border border-zinc-150 rounded-2xl space-y-2 shadow-sm transition-all hover:border-[#2d8d9b]/30">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#2d8d9b]">Entry #{idx + 1}</span>
                          {r.response_type === 'positive' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black flex items-center gap-1">
                              <CheckCircle2 size={10} /> Positive • Qualified
                            </span>
                          ) : r.response_type === 'hold' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-black flex items-center gap-1">
                              <PauseCircle size={10} /> Hold • Contacted
                            </span>
                          ) : null}
                          {r.stage && (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[8px] font-bold">
                              {r.stage}
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-400 font-semibold">{r.date} {r.time && `@ ${r.time}`}</span>
                      </div>
                      <p className="text-xs text-zinc-650 font-medium whitespace-pre-wrap leading-relaxed">{r.text}</p>
                      {r.author && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 text-[10px] text-zinc-500 font-semibold">
                          <span className="text-[#3a525d] font-bold flex items-center gap-1">
                            <User size={12} className="text-[#2d8d9b]" />
                            {r.author.name}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold">{r.author.designation}</span>
                          <span className="text-zinc-300">•</span>
                          <span className="text-zinc-400 font-medium">{r.author.department}</span>
                        </div>
                      )}
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
        <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            {onDelete && (
              <Button 
                onClick={onDelete} 
                variant="outline" 
                className="h-12 w-full sm:w-auto px-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-1.5"
              >
                <Trash2 size={14} className="text-red-500" />
                Delete Lead
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="h-12 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest text-zinc-400"
            >
              Close
            </Button>
            
            <Button 
              onClick={onEdit} 
              className="h-12 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#2d8d9b] text-white gap-2 hover:bg-[#257a87]"
            >
              <Edit2 size={14} />
              Edit Profile
            </Button>

            {lead.status !== 'Converted' && (
              <Button 
                onClick={onConvert} 
                className="h-12 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-green-600 text-white gap-2 hover:bg-green-700"
              >
                <UserCheck size={14} />
                Convert Lead
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
