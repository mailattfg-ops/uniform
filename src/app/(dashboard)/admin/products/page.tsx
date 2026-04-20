'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Edit2, Trash2, Box, Tag, Users, Ruler, BookOpen, Layers } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Product {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  measurements: string[];
  materials: string;
  created_at: string;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [measureConfig, setMeasureConfig] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, configRes] = await Promise.all([
        api.get('/products'),
        api.get('/measurements/config')
      ]);
      setProducts(prodRes.data);
      setMeasureConfig(configRes.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const productFields: FormField[] = [
    { 
       name: 'name', 
       label: 'Product Name', 
       type: 'text', 
       placeholder: 'e.g. Cotton Shirt', 
       required: true, 
       defaultValue: editingProduct?.name 
    },
    { 
       name: 'art_number', 
       label: 'Art Number', 
       type: 'text', 
       placeholder: 'e.g. AR-101', 
       required: true, 
       defaultValue: editingProduct?.art_number 
    },
    { 
       name: 'gender', 
       label: 'Gender Target', 
       type: 'select', 
       options: [
         { label: 'Male', value: 'Male' },
         { label: 'Female', value: 'Female' },
         { label: 'Unisex', value: 'Unisex' }
       ],
       defaultValue: editingProduct?.gender || 'Unisex'
    },
    { 
       name: 'materials', 
       label: 'Composition / Materials', 
       type: 'text', 
       placeholder: 'e.g. 100% Cotton', 
       defaultValue: editingProduct?.materials 
    },
    {
       name: 'measurements',
       label: 'Required Measurement Metrics',
       type: 'checkbox-group',
       options: measureConfig.map(m => ({ label: m.label, value: m.label })),
       defaultValue: editingProduct?.measurements || [],
       className: 'md:col-span-2'
    }
  ];

  const handleAddOrUpdate = async (data: any) => {
    const loadingToast = toast.loading(editingProduct ? 'Updating product...' : 'Creating product...');
    
    // Ensure measurements is always an array
    if (data.measurements && !Array.isArray(data.measurements)) {
        data.measurements = [data.measurements];
    } else if (!data.measurements) {
        data.measurements = [];
    }

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
        toast.success('Product updated!', { id: loadingToast });
      } else {
        await api.post('/products', data);
        toast.success('Product created!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingProduct(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Deleting product...');
    try {
      await api.delete(`/products/${deleteConfirm.id}`);
      toast.success('Product removed', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete', { id: loadingToast });
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const columns: Column<Product>[] = [
    {
      header: 'Product Details',
      accessor: (p) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#3a525d] border border-zinc-100 shadow-inner">
            <Box size={24} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{p.name}</p>
            <p className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-widest mt-1">SN: {p.art_number}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Gender / Target',
      accessor: (p) => (
        <div className="flex items-center gap-2">
            <Tag size={12} className="text-zinc-300" />
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                p.gender === 'Female' ? 'bg-pink-50 text-pink-500' : 
                p.gender === 'Male' ? 'bg-blue-50 text-blue-500' : 'bg-zinc-50 text-zinc-500'
            }`}>
                {p.gender}
            </span>
        </div>
      )
    },
    {
        header: 'Metrics',
        accessor: (p) => (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
                {p.measurements?.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-orange-50 text-[#f2994a] text-[8px] font-black uppercase rounded-md border border-orange-100/50">
                        {m}
                    </span>
                )) || <span className="text-zinc-300 italic text-[10px]">None</span>}
            </div>
        )
    },
    {
        header: 'Materials',
        accessor: (p) => (
            <div className="flex items-center gap-2 text-zinc-500">
                <Layers size={14} className="text-[#2d8d9b]" />
                <span className="text-xs font-bold truncate max-w-[150px]">{p.materials || 'Not Set'}</span>
            </div>
        )
    },
    {
      header: 'Actions',
      accessor: (p) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
                setEditingProduct(p);
                setIsAdding(true);
            }}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteConfirm({ isOpen: true, id: p.id })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="py-10 animate-in zoom-in duration-500">
        <DynamicForm 
          title={editingProduct ? "Edit Product Details" : "New Product Specification"}
          subtitle={editingProduct ? `Refining ${editingProduct.name}` : "Define a new article for the catalog"}
          fields={productFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
              setIsAdding(false);
              setEditingProduct(null);
          }}
          submitLabel={editingProduct ? "Save Updates" : "Register Product"}
          columns={2}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Product Catalog</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Inventory & Specification Hub</p>
         </div>
         <Button 
            onClick={() => setIsAdding(true)}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
         >
            <Plus size={20} strokeWidth={3} />
            Add New
         </Button>
      </div>

      <DataTable 
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchPlaceholder="Filter articles by name or SN..."
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Product Article?"
        message="This will remove the product from the catalog. Historical records using this product may still exist but it will be hidden from new selections."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
}
