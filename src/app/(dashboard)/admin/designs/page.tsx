'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Edit2, Box } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function DesignCatalog() {
  const [groupDesigns, setGroupDesigns] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [buttonsList, setButtonsList] = useState<any[]>([]);
  const [threadsList, setThreadsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCombination, setEditingCombination] = useState<any | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [gdRes, fabricsRes, buttonsRes, threadsRes] = await Promise.all([
        api.get('/quotations/group-designs'),
        api.get('/inventory/fabrics').catch(() => ({ data: [] })),
        api.get('/inventory/buttons').catch(() => ({ data: [] })),
        api.get('/inventory/threads').catch(() => ({ data: [] }))
      ]);
      setGroupDesigns(gdRes.data || []);
      setFabrics(fabricsRes.data || []);
      setButtonsList(buttonsRes.data || []);
      setThreadsList(threadsRes.data || []);
    } catch (err) {
      toast.error('Failed to load design catalog details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateCombination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCombination) return;

    const loadingToast = toast.loading('Saving combination details...');
    try {
      await api.put(`/quotations/group-designs/${editingCombination.id}`, {
        name: editingCombination.name,
        description: editingCombination.description,
        products: editingCombination.products
      });
      toast.success('Combination details updated!', { id: loadingToast });
      setEditingCombination(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update combination details', { id: loadingToast });
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Design Details',
      accessor: (gd) => (
        <div>
          <p className="font-black text-sm tracking-tight text-[#3a525d]">{gd.name}</p>
          <span className="px-2 py-0.5 mt-1 block text-[10px] font-black uppercase rounded bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 w-fit">
            {gd.code}
          </span>
          {gd.description && <p className="text-xs text-zinc-500 mt-1 font-semibold">{gd.description}</p>}
        </div>
      )
    },
    {
      header: 'Array of Items & Specifications',
      accessor: (gd) => (
        <div className="flex flex-col gap-3 min-w-[550px]">
          {(gd.products || []).map((p: any, idx: number) => {
            const fabric = fabrics.find(f => String(f.id) === String(p.main_fabric_id));
            const button = buttonsList.find(b => String(b.id) === String(p.button_id));
            const thread = threadsList.find(t => String(t.id) === String(p.thread_id));
            
            return (
              <div key={p.id || idx} className="bg-zinc-50 border border-zinc-150/70 p-3 rounded-2xl flex flex-col gap-2 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#2d8d9b] block uppercase tracking-widest">{p.design_number || 'DNS-xxxx'}</span>
                    <p className="text-xs font-black text-[#3a525d]">{p.name}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-200 border border-zinc-300 text-zinc-600 text-[8px] font-black uppercase rounded">
                    ART: {p.art_number}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-zinc-500 border-t border-zinc-150/50 pt-2">
                  <div>
                    <span className="font-bold text-zinc-400">Fabric: </span>
                    <span className="text-[#3a525d]">{fabric?.brand_name || 'Standard Fabric'} ({p.main_fabric_meters || p.main_fabric || '1.25'}m)</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-400">SAM: </span>
                    <span className="text-[#3a525d] font-mono">{p.sam_value || '—'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-400">Buttons: </span>
                    <span className="text-[#3a525d]">{button?.brand_name || 'Standard'} ({p.button_count || '0'} pcs)</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-400">Thread: </span>
                    <span className="text-[#3a525d]">{thread?.color_code || 'Standard'} ({p.thread_count || '0'} unit)</span>
                  </div>
                </div>

                {p.remarks && (
                  <div className="mt-1 bg-amber-50/50 border border-amber-100/50 rounded-xl p-2 text-[9px] font-bold text-amber-700 italic">
                    Remarks: {p.remarks}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (gd) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditingCombination(gd)}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
            title="Edit Catalog Details"
          >
            <Edit2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Design Catalog</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
          Design Combinations & Specifications Hub
        </p>
      </div>

      <DataTable
        columns={columns}
        data={groupDesigns}
        isLoading={isLoading}
        searchPlaceholder="Filter design combinations by code or name..."
      />

      {editingCombination && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="p-8 border border-zinc-100 rounded-[2.5rem] shadow-2xl bg-white max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-6">
            <div>
              <h3 className="text-2xl font-black italic text-[#3a525d]">Edit Design Catalog Details</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1">
                Combination: {editingCombination.code}
              </p>
            </div>

            <form onSubmit={handleUpdateCombination} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Design Name</label>
                <input
                  type="text"
                  required
                  value={editingCombination.name || ''}
                  onChange={(e) => setEditingCombination({ ...editingCombination, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Description</label>
                <textarea
                  value={editingCombination.description || ''}
                  onChange={(e) => setEditingCombination({ ...editingCombination, description: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                  rows={2}
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block border-b border-zinc-100 pb-1">
                  Item Remarks
                </label>
                {(editingCombination.products || []).map((p: any, idx: number) => (
                  <div key={p.id || idx} className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-500">
                      {p.design_number} - {p.name}
                    </p>
                    <input
                      type="text"
                      placeholder="Add remarks or specifications..."
                      value={p.remarks || ''}
                      onChange={(e) => {
                        const updatedProducts = [...editingCombination.products];
                        updatedProducts[idx] = { ...p, remarks: e.target.value };
                        setEditingCombination({ ...editingCombination, products: updatedProducts });
                      }}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCombination(null)}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#3a525d] hover:bg-[#2d8d9b] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
