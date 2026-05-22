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
  sam_value?: number | null;
  retail_sam_value?: number | null;
  entry_methods?: string[];
  size_chart_id?: string;
  product_type_id?: number | string;
  product_types?: { id: number; name: string };
  main_fabric?: number | null;
  attachment_fabric1?: number | null;
  attachment_fabric2?: number | null;
  button_id?: string | null;
  thread_id?: string | null;
  buttons?: { name: string } | null;
  threads?: { name: string } | null;
  created_at: string;
  base_size?: string | null;
  fit?: string | null;
}

const parseArtNumber = (artNumber: string, dresses: any[], genders: any[], patterns: any[]) => {
  if (!artNumber) return { dressCode: '', genderCode: '', patternCode: '' };

  // Format is [GenderCode]-[DressPrefix][PatternCode]
  const parts = artNumber.split('-');
  if (parts.length !== 2) return { dressCode: '', genderCode: '', patternCode: '' };

  const genderCode = parts[0];
  const rest = parts[1]; // e.g. "4J012"

  // Find matching gender
  const hasGender = genders.some(g => g.code === genderCode);
  if (!hasGender) return { dressCode: '', genderCode: '', patternCode: '' };

  // Find which dress code starts the rest string, and which pattern code is the remainder
  let dressCode = '';
  let patternCode = '';

  for (const dress of dresses) {
    if (rest.startsWith(dress.code)) {
      const remainder = rest.slice(dress.code.length);
      const hasPattern = patterns.some(p => p.code === remainder);
      if (hasPattern) {
        dressCode = dress.code;
        patternCode = remainder;
        break;
      }
    }
  }

  return { dressCode, genderCode, patternCode };
};

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [measureConfig, setMeasureConfig] = useState<any[]>([]);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [dresses, setDresses] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [buttons, setButtons] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });

  // Local state for dynamic form reactivity
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['manual']);
  const [selectedDress, setSelectedDress] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');
  const [baseSize, setBaseSize] = useState('');
  const [fit, setFit] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, configRes, chartRes, typeRes, dressRes, genderRes, patternRes, fabricRes, buttonRes, threadRes] = await Promise.all([
        api.get('/products'),
        api.get('/measurements/config'),
        api.get('/size-charts'),
        api.get('/product-types').catch(() => ({ data: [] })),
        api.get('/art-number-hub/dresses').catch(() => ({ data: [] })),
        api.get('/art-number-hub/genders').catch(() => ({ data: [] })),
        api.get('/art-number-hub/patterns').catch(() => ({ data: [] })),
        api.get('/inventory/fabrics').catch(() => ({ data: [] })),
        api.get('/inventory/buttons').catch(() => ({ data: [] })),
        api.get('/inventory/threads').catch(() => ({ data: [] }))
      ]);
      setProducts(prodRes.data);
      setMeasureConfig(configRes.data);
      setSizeCharts(chartRes.data);
      setProductTypes(typeRes.data);
      setDresses(dressRes.data);
      setGenders(genderRes.data);
      setPatterns(patternRes.data);
      setFabrics(fabricRes.data);
      setButtons(buttonRes.data);
      setThreads(threadRes.data);
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
      const parsed = parseArtNumber(editingProduct.art_number, dresses, genders, patterns);
      setSelectedDress(parsed.dressCode);
      setSelectedGender(parsed.genderCode);
      setSelectedPattern(parsed.patternCode);
      setBaseSize(editingProduct.base_size || '');
      setFit(editingProduct.fit || '');
    } else {
      setSelectedMethods(['manual']);
      setSelectedDress('');
      setSelectedGender('');
      setSelectedPattern('');
      setBaseSize('');
      setFit('');
    }
  }, [editingProduct, isAdding, dresses, genders, patterns]);

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
      name: 'gender_code',
      label: 'Gender Code',
      type: 'select',
      options: [
        { label: 'Select Gender Code', value: '' },
        ...genders.map(g => ({
          label: `${g.code} (${g.name})`,
          value: g.code
        }))
      ],
      required: true,
      value: selectedGender,
      onChange: (val) => setSelectedGender(val)
    },
    {
      name: 'dress_prefix',
      label: 'Dress Prefix',
      type: 'select',
      options: [
        { label: 'Select Dress Prefix', value: '' },
        ...dresses.map(d => ({
          label: `${d.code} (${d.name})`,
          value: d.code
        }))
      ],
      required: true,
      value: selectedDress,
      onChange: (val) => setSelectedDress(val)
    },
    {
      name: 'pattern_code',
      label: 'Pattern Code',
      type: 'select',
      options: [
        { label: 'Select Pattern Code', value: '' },
        ...patterns.map(p => ({
          label: `${p.code} (${p.name})`,
          value: p.code
        }))
      ],
      required: true,
      value: selectedPattern,
      onChange: (val) => setSelectedPattern(val)
    },
    {
      name: 'art_number',
      label: 'Generated Art Number',
      type: 'text',
      value: (selectedGender && selectedDress && selectedPattern)
        ? `${selectedGender}-${selectedDress}${selectedPattern}`
        : '',
      readOnly: true,
      placeholder: 'Will generate automatically...',
      required: true
    },
    {
      name: 'base_size',
      label: 'Base Size',
      type: 'text',
      placeholder: 'e.g. 38, M, L',
      required: false,
      value: baseSize,
      onChange: (val) => setBaseSize(val)
    },
    {
      name: 'fit',
      label: 'Fit',
      type: 'select',
      options: [
        { label: 'Select Fit Type', value: '' },
        { label: 'Regular Fit', value: 'regular fit' },
        { label: 'Slim Fit', value: 'slim fit' }
      ],
      required: false,
      value: fit,
      onChange: (val) => setFit(val)
    },
    {
      name: 'product_type_id',
      label: 'Product Type',
      type: 'select',
      options: [
        { label: 'Select Product Type', value: '' },
        ...productTypes.map(pt => ({ label: pt.name, value: pt.id.toString() }))
      ],
      defaultValue: editingProduct?.product_type_id?.toString() || editingProduct?.product_types?.id?.toString() || '',
      required: true
    },
    {
      name: 'main_fabric',
      label: 'Main Fabric (meters)',
      type: 'number',
      placeholder: 'e.g. 2',
      defaultValue: editingProduct?.main_fabric !== null && editingProduct?.main_fabric !== undefined ? String(editingProduct.main_fabric) : '0',
      required: true,
      step: '1'
    },
    {
      name: 'attachment_fabric1',
      label: 'Attachment Fabric 1 (meters)',
      type: 'number',
      placeholder: 'e.g. 1',
      defaultValue: editingProduct?.attachment_fabric1 !== null && editingProduct?.attachment_fabric1 !== undefined ? String(editingProduct.attachment_fabric1) : '',
      required: false,
      step: '1'
    },
    {
      name: 'attachment_fabric2',
      label: 'Attachment Fabric 2 (meters)',
      type: 'number',
      placeholder: 'e.g. 1',
      defaultValue: editingProduct?.attachment_fabric2 !== null && editingProduct?.attachment_fabric2 !== undefined ? String(editingProduct.attachment_fabric2) : '',
      required: false,
      step: '1'
    },
    {
      name: 'button_id',
      label: 'Buttons Selection',
      type: 'select',
      options: [
        { label: 'Select Button Style', value: '' },
        ...buttons.map(b => ({ label: b.name, value: b.id }))
      ],
      defaultValue: editingProduct?.button_id || '',
      required: true
    },
    {
      name: 'thread_id',
      label: 'Thread Colour',
      type: 'select',
      options: [
        { label: 'Select Thread Colour', value: '' },
        ...threads.map(t => ({ label: t.name, value: t.id }))
      ],
      defaultValue: editingProduct?.thread_id || '',
      required: true
    },
    {
      name: 'materials',
      label: 'Composition / Materials',
      type: 'text',
      placeholder: 'e.g. 100% Cotton',
      defaultValue: editingProduct?.materials
    },
    {
      name: 'sam_value',
      label: 'Production SAM Price (₹)',
      type: 'number',
      placeholder: 'e.g. 1.25',
      step: 'any',
      defaultValue: editingProduct?.sam_value !== null && editingProduct?.sam_value !== undefined ? String(editingProduct.sam_value) : ''
    },
    {
      name: 'retail_sam_value',
      label: 'Retail SAM Price (₹)',
      type: 'number',
      placeholder: 'e.g. 1.50',
      step: 'any',
      defaultValue: editingProduct?.retail_sam_value !== null && editingProduct?.retail_sam_value !== undefined ? String(editingProduct.retail_sam_value) : ''
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

    // Process fabric meters as integers
    data.main_fabric = data.main_fabric !== '' && data.main_fabric !== null && data.main_fabric !== undefined ? parseInt(data.main_fabric, 10) : 0;
    data.attachment_fabric1 = data.attachment_fabric1 !== '' && data.attachment_fabric1 !== null && data.attachment_fabric1 !== undefined ? parseInt(data.attachment_fabric1, 10) : null;
    data.attachment_fabric2 = data.attachment_fabric2 !== '' && data.attachment_fabric2 !== null && data.attachment_fabric2 !== undefined ? parseInt(data.attachment_fabric2, 10) : null;

    if (!data.button_id || data.button_id === '') data.button_id = null;
    if (!data.thread_id || data.thread_id === '') data.thread_id = null;
    if (!data.product_type_id || data.product_type_id === '') data.product_type_id = null;
    else data.product_type_id = parseInt(data.product_type_id);

    // SAM value: send as number or null
    if (!data.sam_value || data.sam_value === '') data.sam_value = null;
    else data.sam_value = parseFloat(data.sam_value);

    if (!data.retail_sam_value || data.retail_sam_value === '') data.retail_sam_value = null;
    else data.retail_sam_value = parseFloat(data.retail_sam_value);

    // Generate dynamic art_number and map gender name
    data.art_number = (selectedGender && selectedDress && selectedPattern)
      ? `${selectedGender}-${selectedDress}${selectedPattern}`
      : '';
    const genderObj = genders.find(g => g.code === selectedGender);
    data.gender = genderObj ? genderObj.name : 'Unisex';

    // Set base size and fit
    data.base_size = baseSize.trim() || null;
    data.fit = fit || null;

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
            {(p.base_size || p.fit) && (
              <div className="grid items-center gap-1.5 mt-1 text-[9px] font-bold text-zinc-400 uppercase">
                {p.base_size && (
                  <>
                    <span>Size: <span className="text-[#3a525d] font-black">{p.base_size}</span></span>
                    {/* {p.fit && <span className="text-zinc-300">|</span>} */}
                  </>
                )}
                {p.fit && (
                  <span>Fit: <span className="text-[#3a525d] font-black">{p.fit}</span></span>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Category & Type',
      accessor: (p) => (
        <div className="flex flex-col gap-1.5">
          <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded border w-fit ${p.category === 'top_wear' ? 'bg-green-50 text-green-600 border-green-100' :
            p.category === 'bottom_wear' ? 'bg-orange-50 text-orange-600 border-orange-100' :
              'bg-zinc-50 text-zinc-600 border-zinc-100'
            }`}>
            {p.category?.replace('_', ' ') || 'top wear'}
          </span>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded border border-blue-100 w-fit">
            {p.product_types?.name || 'Standard'}
          </span>
        </div>
      )
    },
    {
      header: 'Technical Specs',
      accessor: (p) => (
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[#3a525d]">Main:</span>
            <span className="px-1.5 py-0.5 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-md font-medium text-[#2d8d9b]">
              {p.main_fabric !== null && p.main_fabric !== undefined ? `${p.main_fabric}m` : 'Not Set'}
            </span>
          </div>
          {(p.attachment_fabric1 !== null && p.attachment_fabric1 !== undefined ||
            p.attachment_fabric2 !== null && p.attachment_fabric2 !== undefined) && (
              <div className="flex flex-col gap-0.5 pl-3 border-l border-zinc-100 mt-0.5">
                {p.attachment_fabric1 !== null && p.attachment_fabric1 !== undefined && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="font-bold text-zinc-400">Att 1:</span>
                    <span className="text-zinc-600 font-medium">{p.attachment_fabric1}m</span>
                  </div>
                )}
                {p.attachment_fabric2 !== null && p.attachment_fabric2 !== undefined && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="font-bold text-zinc-400">Att 2:</span>
                    <span className="text-zinc-600 font-medium">{p.attachment_fabric2}m</span>
                  </div>
                )}
              </div>
            )}
          <div className="grid items-center gap-1 mt-1 text-[10px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="font-bold text-zinc-400">Button:</span>
              <span className="text-zinc-700 font-semibold">{p.buttons?.name || '—'}</span>
            </span>
            {/* <span className="w-1 h-1 rounded-full bg-zinc-300" /> */}
            <span className="flex items-center gap-1">
              <span className="font-bold text-zinc-400">Thread:</span>
              <span className="text-zinc-700 font-semibold">{p.threads?.name || '—'}</span>
            </span>
          </div>
        </div>
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
    // {
    //   header: 'Materials',
    //   accessor: (p) => (
    //     <div className="flex items-center gap-2 text-zinc-500">
    //       <Layers size={14} className="text-[#2d8d9b]" />
    //       <span className="text-xs font-bold truncate max-w-[150px]">{p.materials || 'Not Set'}</span>
    //     </div>
    //   )
    // },
    {
      header: 'SAM Prices',
      accessor: (p) => (
        <div className="flex flex-col gap-1">
          {p.sam_value !== null && p.sam_value !== undefined ? (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-[#3a525d] uppercase w-10">Prod:</span>
              <span className="px-2 py-0.5 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-lg text-[10px] font-black text-[#2d8d9b] font-mono">
                ₹{Number(p.sam_value).toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase w-10">Prod:</span>
              <span className="text-[10px] italic text-zinc-300">—</span>
            </div>
          )}
          {p.retail_sam_value !== null && p.retail_sam_value !== undefined ? (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-[#3a525d] uppercase w-10">Retail:</span>
              <span className="px-2 py-0.5 bg-purple-50 border border-purple-100 rounded-lg text-[10px] font-black text-purple-600 font-mono">
                ₹{Number(p.retail_sam_value).toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase w-10">Retail:</span>
              <span className="text-[10px] italic text-zinc-300">—</span>
            </div>
          )}
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
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Product Registry</h1>
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
        title="Delete Product?"
        message="This action will remove the product from the catalog database permanently."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
}
