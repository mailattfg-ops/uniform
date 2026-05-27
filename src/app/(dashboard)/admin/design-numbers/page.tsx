'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Edit2, Tag } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface DesignNumber {
  id: number;
  code: string;
  name: string;
  description: string;
  created_at: string;
  spec: {
    product_id: number;
    product_name: string;
    art_number: string;
    main_fabric_id: string | number;
    main_fabric_meters: string | number;
    sam_value: string | number | null;
    button_id: string;
    button_count: number;
    thread_id: string;
    thread_count: number;
    type: 'Main Product' | 'Variant';
  } | null;
}

export default function DesignNumberCatalog() {
  const [designNumbers, setDesignNumbers] = useState<DesignNumber[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [buttonsList, setButtonsList] = useState<any[]>([]);
  const [threadsList, setThreadsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDesign, setEditingDesign] = useState<DesignNumber | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dnRes, fabricsRes, buttonsRes, threadsRes] = await Promise.all([
        api.get('/quotations/design-numbers'),
        api.get('/inventory/fabrics').catch(() => ({ data: [] })),
        api.get('/inventory/buttons').catch(() => ({ data: [] })),
        api.get('/inventory/threads').catch(() => ({ data: [] }))
      ]);
      setDesignNumbers(dnRes.data || []);
      setFabrics(fabricsRes.data || []);
      setButtonsList(buttonsRes.data || []);
      setThreadsList(threadsRes.data || []);
    } catch (err) {
      toast.error('Failed to load design number catalog details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesign) return;

    const loadingToast = toast.loading('Saving design details...');
    try {
      await api.put(`/quotations/design-numbers/${editingDesign.id}`, {
        name: editingDesign.name,
        description: editingDesign.description
      });
      toast.success('Design details updated successfully!', { id: loadingToast });
      setEditingDesign(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update design details', { id: loadingToast });
    }
  };

  const columns: Column<DesignNumber>[] = [
    {
      header: 'Design Details',
      accessor: (dn) => (
        <div>
          <p className="font-black text-sm tracking-tight text-[#3a525d]">{dn.name || dn.code}</p>
          <span className="px-2 py-0.5 mt-1 block text-[10px] font-black uppercase rounded bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 w-fit">
            {dn.code}
          </span>
          {dn.description && (
            <p className="text-xs text-zinc-500 mt-1 font-semibold max-w-sm whitespace-normal leading-relaxed break-words">
              {dn.description}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Array of Items & Specifications',
      accessor: (dn) => {
        if (!dn.spec) {
          return (
            <span className="text-[10px] text-zinc-400 font-semibold italic">Unassigned (No linked products)</span>
          );
        }

        const p = dn.spec;
        const fabric = fabrics.find(f => String(f.id) === String(p.main_fabric_id));
        const button = buttonsList.find(b => String(b.id) === String(p.button_id));
        const thread = threadsList.find(t => String(t.id) === String(p.thread_id));

        return (
          <div className="bg-zinc-50 border border-zinc-150/70 p-3 rounded-2xl flex flex-col gap-2 relative min-w-[360px] max-w-md">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                  p.type === 'Main Product' 
                    ? 'bg-amber-50 text-amber-600 border-amber-100' 
                    : 'bg-[#2d8d9b]/5 text-[#2d8d9b] border-[#2d8d9b]/10'
                }`}>
                  {p.type}
                </span>
                <p className="text-xs font-black text-[#3a525d] mt-1.5">{p.product_name}</p>
              </div>
              <span className="px-2 py-0.5 bg-zinc-200 border border-zinc-300 text-zinc-600 text-[8px] font-black uppercase rounded">
                ART: {p.art_number}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-zinc-500 border-t border-zinc-150/50 pt-2">
              <div>
                <span className="font-bold text-zinc-400">Fabric: </span>
                <span className="text-[#3a525d]">{fabric?.brand_name || 'Standard Fabric'} ({p.main_fabric_meters}m)</span>
              </div>
              <div>
                <span className="font-bold text-zinc-400">SAM: </span>
                <span className="text-[#3a525d] font-mono">{p.sam_value || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-zinc-400">Buttons: </span>
                <span className="text-[#3a525d]">{button?.name || 'Standard'} ({p.button_count} pcs)</span>
              </div>
              <div>
                <span className="font-bold text-zinc-400">Thread: </span>
                <span className="text-[#3a525d]">{thread?.name || 'Standard'} {thread?.code ? `(${thread.code})` : ''} ({p.thread_count} unit)</span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (dn) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditingDesign(dn)}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
            title="Edit Design Details"
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
        <h1 className="text-4xl font-black tracking-tighter text-[#3a525d]">Design Number Catalog</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
          Individual Design Specifications & Assignments
        </p>
      </div>

      <DataTable
        columns={columns}
        data={designNumbers}
        isLoading={isLoading}
        searchPlaceholder="Filter design numbers by code or name..."
      />

      {editingDesign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="p-8 border border-zinc-100 rounded-[2.5rem] shadow-2xl bg-white max-w-lg w-full space-y-6">
            <div>
              <h3 className="text-2xl font-black text-[#3a525d]">Edit Design Number Details</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1">
                Design Code: {editingDesign.code}
              </p>
            </div>

            <form onSubmit={handleUpdateDesign} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Design Name</label>
                <input
                  type="text"
                  required
                  value={editingDesign.name || ''}
                  onChange={(e) => setEditingDesign({ ...editingDesign, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                  placeholder="e.g. DNS-0001 Standard Collar Fit"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Description / Spec Summary</label>
                <textarea
                  value={editingDesign.description || ''}
                  onChange={(e) => setEditingDesign({ ...editingDesign, description: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                  rows={4}
                  placeholder="Describe the styling cuts, sleeve types, fit measurements, or other technical specs..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingDesign(null)}
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
