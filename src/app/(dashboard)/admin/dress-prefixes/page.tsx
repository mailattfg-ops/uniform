'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, Scissors, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface DressPrefix {
  id: number;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
}

export default function DressPrefixManagementPage() {
  const [dressPrefixes, setDressPrefixes] = useState<DressPrefix[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPrefix, setEditingPrefix] = useState<DressPrefix | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DressPrefix | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchDressPrefixes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/art-number-hub/dresses');
      const enriched = res.data.map((dp: any) => ({
        ...dp,
        search_uid: `DRS-${dp.id}`,
        search_string: `${dp.code} ${dp.name} ${dp.description || ''} DRS-${dp.id}`.toLowerCase()
      }));
      setDressPrefixes(enriched);
    } catch (err) {
      toast.error('Failed to load dress prefixes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDressPrefixes();
  }, []);

  const handleSubmit = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedCode) {
      toast.error('Dress Prefix code is required');
      return;
    }

    if (!trimmedName) {
      toast.error('Dress Category name is required');
      return;
    }

    if (!/^[a-zA-Z0-9\-]+$/.test(trimmedCode)) {
      toast.error('Dress Prefix can only contain alphanumeric characters and hyphens');
      return;
    }

    if (trimmedCode.length > 10) {
      toast.error('Dress Prefix must be 10 characters or less');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      toast.error('Name must be between 2 and 50 characters');
      return;
    }

    const payload = { code: trimmedCode, name: trimmedName, description: trimmedDesc || null };
    const loadingToast = toast.loading(editingPrefix ? 'Updating dress prefix...' : 'Registering new dress prefix...');

    try {
      if (editingPrefix) {
        await api.put(`/art-number-hub/dresses/${editingPrefix.id}`, payload);
        toast.success('Dress Prefix updated successfully!', { id: loadingToast });
      } else {
        await api.post('/art-number-hub/dresses', payload);
        toast.success('New Dress Prefix registered!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingPrefix(null);
      setCode('');
      setName('');
      setDescription('');
      fetchDressPrefixes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed', { id: loadingToast });
    }
  };

  const startEdit = (dp: DressPrefix) => {
    setEditingPrefix(dp);
    setCode(dp.code);
    setName(dp.name);
    setDescription(dp.description || '');
    setIsAdding(true);
  };

  const columns: Column<DressPrefix>[] = [
    {
      header: 'Dress Prefix Code',
      accessor: (dp) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
            <Scissors size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{dp.code}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: DRS-{dp.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Dress Category Name',
      accessor: (dp) => <span className="text-sm font-bold text-[#3a525d]">{dp.name}</span>
    },
    {
      header: 'Description',
      accessor: (dp) => <span className="text-xs text-zinc-500 font-medium">{dp.description || '—'}</span>
    },
    {
      header: 'Registration Date',
      accessor: (dp) => (
        <p className="text-xs font-bold text-zinc-500">
          {dp.created_at ? new Date(dp.created_at).toLocaleDateString() : 'N/A'}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (dp) => (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => startEdit(dp)}
            variant="none"
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/20 p-0"
            title="Edit Prefix"
          >
            <Edit2 size={16} className="text-[#2d8d9b] shrink-0" />
          </Button>
          <Button
            onClick={() => setDeleteCandidate(dp)}
            variant="none"
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-200 p-0"
            title="Delete Prefix"
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
      await api.delete(`/art-number-hub/dresses/${deleteCandidate.id}`);
      toast.success('Dress Prefix removed');
      fetchDressPrefixes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Unable to delete: Dress prefix may be linked to registered art numbers');
    } finally {
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Dress Prefixes</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Manage Dress Prefix codes for dynamic catalog generation
          </p>
        </div>

        {!isAdding ? (
          <Button
            onClick={() => setIsAdding(true)}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={20} strokeWidth={3} />
            Add Dress Prefix
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => { setIsAdding(false); setEditingPrefix(null); setCode(''); setName(''); setDescription(''); }}
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
                <Scissors size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">
                  {editingPrefix ? 'Modify Dress Prefix' : 'Define New Dress Prefix'}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">
                  Specification component registry
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Prefix Code</label>
                <Input
                  placeholder="e.g. 4J, JK, SH"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 10 && /^[a-zA-Z0-9\-]*$/.test(val)) {
                      setCode(val.toUpperCase());
                    }
                  }}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all font-black uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Dress Category Name</label>
                <Input
                  placeholder="e.g. Cotton Shirt, Blazer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Description</label>
                <Input
                  placeholder="Detailed description of the dress prefix..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all"
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-20 rounded-[2rem] bg-[#3a525d] hover:bg-[#2d8d9b] text-white font-black italic text-xl shadow-2xl shadow-[#3a525d]/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {editingPrefix ? 'Commit Changes' : 'Initialize Dress Prefix'}
              <ArrowRight />
            </Button>
          </div>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={dressPrefixes}
          isLoading={isLoading}
          searchPlaceholder="Search defined dress prefixes..."
        />
      )}

      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Remove Dress Prefix"
        message="Permanently remove this dress prefix? This may affect combined Art Numbers or configurations linked to this prefix."
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        confirmLabel="Yes, Remove It"
        variant="danger"
      />
    </div>
  );
}
