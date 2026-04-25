'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, Globe, Tags, ArrowRight, Briefcase } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Industry {
  id: number;
  name: string;
  type?: string;
  created_at?: string;
}

export default function IndustryManagementPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  const fetchIndustries = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/industries');
      setIndustries(res.data);
    } catch (err) {
      toast.error('Failed to load industry sectors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustries();
  }, []);

  const handleSubmit = async () => {
    if (!name) {
      toast.error('Sector name is required');
      return;
    }

    const payload = { name, type };
    const loadingToast = toast.loading(editingIndustry ? 'Updating sector...' : 'Registering new sector...');

    try {
      if (editingIndustry) {
        await api.put(`/industries/${editingIndustry.id}`, payload);
        toast.success('Sector updated successfully!', { id: loadingToast });
      } else {
        await api.post('/industries', payload);
        toast.success('New sector registered!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingIndustry(null);
      setName('');
      setType('');
      fetchIndustries();
    } catch (err) {
      toast.error('Action failed', { id: loadingToast });
    }
  };

  const startEdit = (ind: Industry) => {
    setEditingIndustry(ind);
    setName(ind.name);
    setType(ind.type || '');
    setIsAdding(true);
  };

  const columns: Column<Industry>[] = [
    {
      header: 'Industry Sector',
      accessor: (ind) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2d8d9b]/5 rounded-2xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shadow-sm">
            <Globe size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{ind.name}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: SEC-{ind.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Category / Type',
      accessor: (ind) => (
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b]">{ind.type || 'General'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Registration Date',
      accessor: (ind) => (
        <p className="text-xs font-bold text-zinc-500">
           {ind.created_at ? new Date(ind.created_at).toLocaleDateString() : 'N/A'}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (ind) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => startEdit(ind)}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={async () => {
              if (confirm('Permanently remove this industry sector? This may affect linked organizations.')) {
                try {
                  await api.delete(`/industries/${ind.id}`);
                  toast.success('Sector removed');
                  fetchIndustries();
                } catch (err) {
                  toast.error('Unable to delete: Sector may have linked organizations');
                }
              }
            }}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
         <div className="relative">
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Sector Registry</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Master definition of accessible industries</p>
         </div>

         {!isAdding ? (
            <Button 
                onClick={() => setIsAdding(true)}
                className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
            >
                <Plus size={20} strokeWidth={3} />
                Add New Sector
            </Button>
         ) : (
            <Button 
                variant="secondary"
                onClick={() => { setIsAdding(false); setEditingIndustry(null); setName(''); setType(''); }}
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
                    <Briefcase size={24} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">
                        {editingIndustry ? 'Modify Industry' : 'Define New Sector'}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">Architectural Core Configuration</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Sector Name</label>
                    <Input 
                        placeholder="e.g. Manufacturing or Healthcare"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Industry Type</label>
                    <Input 
                        placeholder="e.g. Industrial / Service / Public"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all"
                    />
                 </div>
              </div>

              <Button 
                onClick={handleSubmit}
                className="w-full h-20 rounded-[2rem] bg-[#3a525d] hover:bg-[#2d8d9b] text-white font-black italic text-xl shadow-2xl shadow-[#3a525d]/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                 {editingIndustry ? 'Commit Changes' : 'Initialize Sector Registry'}
                 <ArrowRight />
              </Button>
           </div>
        </Card>
      ) : (
        <DataTable 
            columns={columns}
            data={industries}
            isLoading={isLoading}
            searchPlaceholder="Search defined sectors..."
        />
      )}
    </div>
  );
}
