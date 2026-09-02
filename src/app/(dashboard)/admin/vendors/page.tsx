'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Vendor {
  id: number;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  created_at?: string;
}

export default function VendorManagementPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Vendor | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/vendors');
      const enriched = res.data.map((v: any) => ({
        ...v,
        search_uid: `VND-${v.id}`,
        search_string: `${v.code} ${v.name} ${v.contact_person || ''} ${v.phone || ''} ${v.email || ''} VND-${v.id}`.toLowerCase()
      }));
      setVendors(enriched);
    } catch (err) {
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Vendor name is required');
      return;
    }

    const payload = {
      code: code.trim() || undefined,
      name: trimmedName,
      contact_person: contactPerson.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      status: status || 'active'
    };

    const loadingToast = toast.loading(editingVendor ? 'Updating vendor details...' : 'Registering new vendor...');

    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor.id}`, payload);
        toast.success('Vendor details updated successfully!', { id: loadingToast });
      } else {
        await api.post('/vendors', payload);
        toast.success('New vendor registered successfully!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingVendor(null);
      resetForm();
      fetchVendors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const startEdit = (v: Vendor) => {
    setEditingVendor(v);
    setCode(v.code);
    setName(v.name);
    setContactPerson(v.contact_person || '');
    setPhone(v.phone || '');
    setEmail(v.email || '');
    setAddress(v.address || '');
    setStatus(v.status || 'active');
    setIsAdding(true);
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setStatus('active');
  };

  const columns: Column<Vendor>[] = [
    {
      header: 'Vendor Code',
      accessor: (v) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{v.code}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: VND-{v.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Vendor Name',
      accessor: (v) => <span className="text-sm font-bold text-[#3a525d]">{v.name}</span>
    },
    {
      header: 'Contact Person',
      accessor: (v) => <span className="text-xs text-zinc-500 font-medium">{v.contact_person || '—'}</span>
    },
    {
      header: 'Phone / Email',
      accessor: (v) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500 font-mono font-bold">{v.phone || '—'}</span>
          <span className="text-[10px] text-zinc-400 font-medium">{v.email || '—'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (v) => (
        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
          v.status === 'active' 
            ? 'bg-green-50 text-green-700 border border-green-150' 
            : 'bg-zinc-50 text-zinc-400 border border-zinc-150'
        }`}>
          {v.status}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: (v) => (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => startEdit(v)}
            variant="none"
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/20 p-0"
            title="Edit Vendor"
          >
            <Edit2 size={16} className="text-[#2d8d9b] shrink-0" />
          </Button>
          <Button
            onClick={() => setDeleteCandidate(v)}
            variant="none"
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-200 p-0"
            title="Delete Vendor"
          >
            <Trash2 size={16} className="text-red-500 shrink-0" />
          </Button>
        </div>
      )
    }
  ];

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await api.delete(`/vendors/${deleteCandidate.id}`);
      toast.success('Vendor successfully removed');
      fetchVendors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Unable to delete vendor');
    } finally {
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Vendors Manager</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Unified Registry for Fabrics, Buttons, & Thread Suppliers
          </p>
        </div>

        {!isAdding ? (
          <Button
            onClick={() => setIsAdding(true)}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={20} strokeWidth={3} />
            Register Vendor
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => { setIsAdding(false); setEditingVendor(null); resetForm(); }}
            className="h-16 px-10 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px]"
          >
            Cancel Entry
          </Button>
        )}
      </div>

      {isAdding ? (
        <Card className="max-w-3xl mx-auto p-10 border-2 border-dashed border-[#2d8d9b]/20 shadow-2xl shadow-[#2d8d9b]/5 rounded-[3rem] animate-in slide-in-from-top-10 duration-500">
          <div className="space-y-8">
            <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
              <div className="w-14 h-14 bg-[#2d8d9b] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#2d8d9b]/20">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">
                  {editingVendor ? 'Modify Vendor Profile' : 'Register New Vendor'}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">
                  Basic Info & Contact Details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Vendor Code (Optional)</label>
                <Input
                  placeholder="Leave blank to auto-generate (e.g. VND-0001)"
                  value={code}
                  readOnly={!!editingVendor}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all font-black uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Vendor Name</label>
                <Input
                  placeholder="e.g. Raymond Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Contact Person</label>
                <Input
                  placeholder="e.g. Mr. Anil Sharma"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Phone Number</label>
                <Input
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all font-mono font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Email Address</label>
                <Input
                  placeholder="e.g. sales@raymond.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-14 bg-white border border-zinc-200 rounded-2xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/25 focus:border-[#2d8d9b] text-[#3a525d]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Address / Notes</label>
                <Input
                  placeholder="Registered company address or notes..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all"
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-20 rounded-[2rem] bg-[#3a525d] hover:bg-[#2d8d9b] text-white font-black italic text-xl shadow-2xl shadow-[#3a525d]/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {editingVendor ? 'Commit Changes' : 'Register Vendor'}
              <ArrowRight />
            </Button>
          </div>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={vendors}
          isLoading={isLoading}
          searchPlaceholder="Search registered vendors..."
        />
      )}

      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Remove Vendor"
        message="Are you sure you want to permanently delete this vendor? This will remove their record from the registry."
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        confirmLabel="Yes, Delete"
        variant="danger"
      />
    </div>
  );
}
