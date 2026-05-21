'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, Tags, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ProductType {
  id: number;
  name: string;
  created_at?: string;
}

export default function ProductTypeManagementPage() {
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ProductType | null>(null);

  // Form State
  const [name, setName] = useState('');

  const fetchProductTypes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/product-types');
      const enriched = res.data.map((pt: any) => ({
        ...pt,
        search_uid: `TYP-${pt.id}`,
        search_string: `${pt.name} TYP-${pt.id}`.toLowerCase()
      }));
      setProductTypes(enriched);
    } catch (err) {
      toast.error('Failed to load product types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductTypes();
  }, []);

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error('Product type name is required');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      toast.error('Product Type name must be between 2 and 50 characters');
      return;
    }

    if (!/^[a-zA-Z0-9\s\-\&]+$/.test(trimmedName)) {
      toast.error('Product Type name can only contain letters, numbers, spaces, hyphens, and ampersands');
      return;
    }

    const payload = { name: trimmedName };
    const loadingToast = toast.loading(editingType ? 'Updating product type...' : 'Registering new product type...');

    try {
      if (editingType) {
        await api.put(`/product-types/${editingType.id}`, payload);
        toast.success('Product type updated successfully!', { id: loadingToast });
      } else {
        await api.post('/product-types', payload);
        toast.success('New product type registered!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingType(null);
      setName('');
      fetchProductTypes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed', { id: loadingToast });
    }
  };

  const startEdit = (pt: ProductType) => {
    setEditingType(pt);
    setName(pt.name);
    setIsAdding(true);
  };

  const columns: Column<ProductType>[] = [
    {
      header: 'Product Type',
      accessor: (pt) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2d8d9b]/5 rounded-2xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shadow-sm">
            <Tags size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{pt.name}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: TYP-{pt.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Creation Date',
      accessor: (pt) => (
        <p className="text-xs font-bold text-zinc-500">
           {pt.created_at ? new Date(pt.created_at).toLocaleDateString() : 'N/A'}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (pt) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => startEdit(pt)}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteCandidate(pt)}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await api.delete(`/product-types/${deleteCandidate.id}`);
      toast.success('Product type removed');
      fetchProductTypes();
    } catch (err) {
      toast.error('Unable to delete: Product type may be linked to existing products');
    } finally {
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
         <div className="relative">
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Product Types</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Master definitions for specification catalog</p>
         </div>

         {!isAdding ? (
            <Button 
                onClick={() => setIsAdding(true)}
                className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
            >
                <Plus size={20} strokeWidth={3} />
                Add New Type
            </Button>
         ) : (
            <Button 
                variant="secondary"
                onClick={() => { setIsAdding(false); setEditingType(null); setName(''); }}
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
                    <Tags size={24} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">
                        {editingType ? 'Modify Product Type' : 'Define New Product Type'}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">Specification Categories Definition</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product Type Name</label>
                    <Input 
                        placeholder="e.g. Shirt, Blazer, Trousers, Skirt"
                        value={name}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length <= 50 && /^[a-zA-Z0-9\s\-\&]*$/.test(val)) {
                            setName(val);
                          }
                        }}
                        maxLength={50}
                        className="h-14 rounded-2xl border-zinc-200 focus:border-[#2d8d9b] transition-all"
                    />
                 </div>
              </div>

              <Button 
                onClick={handleSubmit}
                className="w-full h-20 rounded-[2rem] bg-[#3a525d] hover:bg-[#2d8d9b] text-white font-black italic text-xl shadow-2xl shadow-[#3a525d]/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                 {editingType ? 'Commit Changes' : 'Initialize Product Type'}
                 <ArrowRight />
              </Button>
           </div>
        </Card>
      ) : (
        <DataTable 
            columns={columns}
            data={productTypes}
            isLoading={isLoading}
            searchPlaceholder="Search defined product types..."
        />
      )}

      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Remove Product Type"
        message="Permanently remove this product type? This may affect linked products if they are using this type."
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        confirmLabel="Yes, Remove It"
        variant="danger"
      />
    </div>
  );
}
