'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Edit2, Trash2, Box, Tag, Layers } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Product {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  category: string;
  measurements: string[];
  materials: string;
  entry_methods?: string[];
  size_chart_id?: string;
  created_at: string;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [measureConfig, setMeasureConfig] = useState<any[]>([]);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });

  // Local state for dynamic form reactivity
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['manual']);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, configRes, chartRes] = await Promise.all([
        api.get('/products'),
        api.get('/measurements/config'),
        api.get('/size-charts')
      ]);
      setProducts(prodRes.data);
      setMeasureConfig(configRes.data);
      setSizeCharts(chartRes.data);
    } catch (err) {
      toast.error('Failed to load catalog data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingProduct) {
        setSelectedMethods(editingProduct.entry_methods || ['manual']);
    } else {
        setSelectedMethods(['manual']);
    }
  }, [editingProduct, isAdding]);

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
       name: 'category', 
       label: 'Product Category', 
       type: 'select', 
       options: [
         { label: 'Top Wear', value: 'top_wear' },
         { label: 'Bottom Wear', value: 'bottom_wear' },
         { label: 'Accessory', value: 'accessory' },
         { label: 'Other', value: 'other' }
       ],
       defaultValue: editingProduct?.category || 'top_wear',
       required: true
    },
    {
       name: 'entry_methods',
       label: 'Measurement Entry Logic',
       type: 'checkbox-group',
       options: [
         { label: 'Manual Measurements', value: 'manual' },
         { label: 'US Size Chart Scaling', value: 'us_size_chart' }
       ],
       defaultValue: selectedMethods,
       className: 'md:col-span-2',
       onChange: (val: string[]) => setSelectedMethods(val)
    },
    {
       name: 'size_chart_id',
       label: 'Linked US Size Chart',
       type: 'select',
       options: [
         { label: 'Select Preferred Chart', value: '' },
         ...sizeCharts.map(c => ({ label: `${c.name} (${c.category.replace('_', ' ')})`, value: c.id }))
       ],
       defaultValue: editingProduct?.size_chart_id || '',
       className: 'md:col-span-1',
       disabled: !selectedMethods.includes('us_size_chart')
    },
    {
       name: 'measurements',
       label: 'Required Manual Metrics',
       type: 'checkbox-group',
       options: measureConfig.map(m => ({ label: m.label, value: m.label })),
       defaultValue: editingProduct?.measurements || [],
       className: 'md:col-span-2',
       disabled: !selectedMethods.includes('manual')
    }
  ];

  const handleAddOrUpdate = async (data: any) => {
    const loadingToast = toast.loading(editingProduct ? 'Updating product...' : 'Creating product...');
    
    // Normalize arrays
    const normalize = (val: any) => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    };

    data.measurements = normalize(data.measurements);
    data.entry_methods = normalize(data.entry_methods);
    
    if (!data.size_chart_id) data.size_chart_id = null;

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
      header: 'Category',
      accessor: (p) => (
        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded border w-fit ${
          p.category === 'top_wear' ? 'bg-green-50 text-green-600 border-green-100' :
          p.category === 'bottom_wear' ? 'bg-orange-50 text-orange-600 border-orange-100' :
          'bg-zinc-50 text-zinc-600 border-zinc-100'
        }`}>
          {p.category?.replace('_', ' ') || 'top wear'}
        </span>
      )
    },
    {
      header: 'Strategy',
      accessor: (p) => (
        <div className="flex flex-col gap-1">
           {p.entry_methods?.includes('manual') && (
             <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded border border-blue-100 w-fit">Manual</span>
           )}
           {p.entry_methods?.includes('us_size_chart') && (
             <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-black uppercase rounded border border-purple-100 w-fit">US Size Chart</span>
           )}
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
                )) || <span className="text-zinc-300 italic text-[10px]">Standard</span>}
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
        message="This action will remove the article from the catalog database permanently."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
}
