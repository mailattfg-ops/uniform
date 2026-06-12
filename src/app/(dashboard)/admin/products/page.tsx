'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Edit2, Trash2, Box, Tag, Layers } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Card } from '@/components/ui/Card';

interface Product {
  id: number;
  name: string;
  art_number: string;
  design_number?: string | null;
  gender: string;
  category: string;
  measurements: string[];
  materials: string;
  images?: string[];
  sam_value?: number | null;
  retail_sam_value?: number | null;
  entry_methods?: string[];
  size_chart_id?: string;
  product_type_id?: number | string;
  product_types?: { id: number; name: string };
  main_fabric?: number | null;
  attachment_fabric1?: number | null;
  attachment_fabric2?: number | null;
  main_fabric_id?: string | number | null;
  button_id?: string | null;
  thread_id?: string | null;
  button_count?: number | null;
  thread_count?: number | null;
  created_at: string;
  base_size?: string | null;
  fit?: string | null;
  other_sizes?: string | null;
  other_fits?: string | null;
  measurement_type?: string | null;
  class_fabric_consumption?: Record<string, Record<string, string>> | null;
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

export const parseMaterialsField = (rawText: string | undefined | null) => {
  if (!rawText) return { type: '', materials: '' };
  const match = rawText.match(/^\[ProductType:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { type: match[1], materials: match[2] };
  }
  return { type: '', materials: rawText };
};

const AccessorySizeInput: React.FC<{
  sizes: string[];
  setSizes: (sizes: string[]) => void;
  onChange: (val: string[]) => void;
}> = ({ sizes, setSizes, onChange }) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (sizes.includes(trimmed)) {
      toast.error('Size already added.');
      return;
    }
    const updated = [...sizes, trimmed];
    setSizes(updated);
    onChange(updated);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    const updated = sizes.filter((_, i) => i !== index);
    setSizes(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a size (e.g. 24, Large, One Size) and press Enter"
          className="flex-1 h-12 bg-white border border-[#fce4d4] rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 text-[#3a525d]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="h-12 px-6 bg-[#2d8d9b] hover:bg-[#3a525d] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center shadow-md active:scale-95"
        >
          Add Size
        </button>
      </div>

      {sizes.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-4 bg-zinc-50/50 rounded-2xl border border-zinc-150/50">
          {sizes.map((size, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 text-[#2d8d9b] text-xs font-black uppercase rounded-lg hover:bg-red-50 hover:text-red-650 hover:border-red-200 transition-all cursor-pointer group"
              onClick={() => handleRemove(idx)}
              title="Click to remove"
            >
              {size}
              <span className="text-[10px] text-[#2d8d9b] group-hover:text-red-500 font-normal">×</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-400 font-bold italic ml-1">No sizes added yet. Please specify at least one size option.</p>
      )}
    </div>
  );
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });

  // Variant design number states
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any | null>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [newVariantBtn, setNewVariantBtn] = useState('');
  const [newVariantBtnCount, setNewVariantBtnCount] = useState('0');
  const [newVariantThread, setNewVariantThread] = useState('');
  const [newVariantThreadCount, setNewVariantThreadCount] = useState('0');
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);

  const fetchProductVariants = async (prodId: any) => {
    try {
      const res = await api.get(`/products/${prodId}/variants`);
      setProductVariants(res.data || []);
    } catch (err) {
      toast.error('Failed to load product variants');
    }
  };

  useEffect(() => {
    if (selectedProductForVariants) {
      fetchProductVariants(selectedProductForVariants.id);
      setNewVariantBtn('');
      setNewVariantBtnCount('0');
      setNewVariantThread('');
      setNewVariantThreadCount('0');
    }
  }, [selectedProductForVariants]);

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariants) return;

    if (!newVariantBtn && !newVariantThread) {
      toast.error('Please specify at least a button or thread type for the variant combination.');
      return;
    }

    setIsCreatingVariant(true);
    const loadingToast = toast.loading('Registering variant combination...');
    try {
      await api.post(`/products/${selectedProductForVariants.id}/variants`, {
        button_id: newVariantBtn || null,
        button_count: parseInt(newVariantBtnCount, 10) || 0,
        thread_id: newVariantThread || null,
        thread_count: parseInt(newVariantThreadCount, 10) || 0
      });
      toast.success('Variant Design Number registered!', { id: loadingToast });
      fetchProductVariants(selectedProductForVariants.id);
      setNewVariantBtn('');
      setNewVariantBtnCount('0');
      setNewVariantThread('');
      setNewVariantThreadCount('0');
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to create variant';
      const code = err.response?.data?.design_number;
      if (code) {
        toast.error(`${errMsg} (Design Code: ${code})`, { id: loadingToast, duration: 6000 });
      } else {
        toast.error(errMsg, { id: loadingToast });
      }
    } finally {
      setIsCreatingVariant(false);
    }
  };

  // Local state for dynamic form reactivity
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['manual']);
  const [selectedDress, setSelectedDress] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');
  const [baseSize, setBaseSize] = useState('');
  const [fit, setFit] = useState('');
  const [nextDesignNumber, setNextDesignNumber] = useState('');
  const [nextPatternCode, setNextPatternCode] = useState('');
  const [productType, setProductType] = useState('');
  const [accessorySizes, setAccessorySizes] = useState<string[]>([]);

  // Design Catalog tab states
  const [activeTab, setActiveTab] = useState<'products' | 'designs'>('products');
  const [groupDesigns, setGroupDesigns] = useState<any[]>([]);
  const [editingCombination, setEditingCombination] = useState<any | null>(null);
  const [buttonsList, setButtonsList] = useState<any[]>([]);
  const [threadsList, setThreadsList] = useState<any[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, configRes, chartRes, typeRes, dressRes, genderRes, patternRes, nextPatternRes, fabricRes, nextDnRes, gdRes, buttonsRes, threadsRes] = await Promise.all([
        api.get('/products'),
        api.get('/measurements/config'),
        api.get('/size-charts'),
        api.get('/product-types').catch(() => ({ data: [] })),
        api.get('/art-number-hub/dresses').catch(() => ({ data: [] })),
        api.get('/art-number-hub/genders').catch(() => ({ data: [] })),
        api.get('/art-number-hub/patterns').catch(() => ({ data: [] })),
        api.get('/art-number-hub/patterns/next').catch(() => ({ data: { nextCode: '001' } })),
        api.get('/inventory/fabrics').catch(() => ({ data: [] })),
        api.get('/products/next-design-number').catch(() => ({ data: { nextDesignNumber: 'DNS-0001' } })),
        api.get('/quotations/group-designs').catch(() => ({ data: [] })),
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
      setNextPatternCode(nextPatternRes.data.nextCode || '001');
      setFabrics(fabricRes.data);
      setNextDesignNumber(nextDnRes.data.nextDesignNumber || 'DNS-0001');
      setGroupDesigns(gdRes.data || []);
      setButtonsList(buttonsRes.data || []);
      setThreadsList(threadsRes.data || []);
    } catch (err) {
      toast.error('Failed to load catalog data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Additional states for new fields
  const [otherSizes, setOtherSizes] = useState('');
  const [otherFits, setOtherFits] = useState('');
  const [measurementType, setMeasurementType] = useState('both');
  const [classFabricConsumption, setClassFabricConsumption] = useState<Record<string, Record<string, string>>>({});

  const classesList = [
    'Class1', 'Class2', 'Class3', 'Class4', 'Class5', 'Class6',
    'Class7', 'Class8', 'Class9', 'Class10', 'Class11', 'Class12',
    'C1', 'C2', 'Corporate'
  ];

  useEffect(() => {
    if (editingProduct) {
      setSelectedMethods(editingProduct.entry_methods || ['manual']);
      const parsed = parseArtNumber(editingProduct.art_number, dresses, genders, patterns);
      setSelectedDress(parsed.dressCode);
      setSelectedGender(parsed.genderCode);
      setSelectedPattern(parsed.patternCode);
      setBaseSize(editingProduct.base_size || '');
      setFit(editingProduct.fit || '');
      setOtherSizes(editingProduct.other_sizes || '');
      setOtherFits(editingProduct.other_fits || '');
      setMeasurementType(editingProduct.measurement_type || 'both');
      setClassFabricConsumption(editingProduct.class_fabric_consumption || {});

      const parsedMat = parseMaterialsField(editingProduct.materials);
      setProductType(parsedMat.type || '');
      if (parsedMat.type === 'accessories' && editingProduct.base_size) {
        setAccessorySizes(editingProduct.base_size.split(',').map(s => s.trim()).filter(Boolean));
      } else {
        setAccessorySizes([]);
      }
    } else {
      setSelectedMethods(['manual']);
      setSelectedDress('');
      setSelectedGender('');
      setSelectedPattern('');
      setBaseSize('');
      setFit('');
      setOtherSizes('');
      setOtherFits('');
      setMeasurementType('both');
      setClassFabricConsumption({});
      setProductType('');
      setAccessorySizes([]);
      // Refresh next pattern code on form open
      api.get('/art-number-hub/patterns/next').then(res => setNextPatternCode(res.data.nextCode || '001')).catch(() => { });
    }
  }, [editingProduct, isAdding, dresses, genders, patterns]);

  useEffect(() => {
    if (isAdding && !editingProduct) {
      api.get('/products/next-design-number')
        .then(res => {
          setNextDesignNumber(res.data.nextDesignNumber || 'DNS-0001');
        })
        .catch(() => {
          setNextDesignNumber('DNS-0001');
        });
    }
  }, [isAdding, editingProduct]);

  const productFields: FormField[] = [
    {
      name: 'product_type',
      label: 'Product Type',
      type: 'select',
      options: [
        { label: 'Select Product Type', value: '' },
        { label: 'Readymade (Manufactured)', value: 'readymade' },
        { label: 'Readymade (Trade)', value: 'trade_readymade' },
        { label: 'Accessories', value: 'accessories' },
      ],
      value: productType,
      onChange: (val) => setProductType(val),
      required: true
    },
    {
      name: 'product_type_id',
      label: 'Garment Category',
      type: 'select',
      options: [
        { label: 'Select Garment Category', value: '' },
        ...productTypes.map(pt => ({ label: pt.name, value: pt.id.toString() }))
      ],
      defaultValue: editingProduct?.product_type_id?.toString() || editingProduct?.product_types?.id?.toString() || '',
      required: true
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
      type: 'text',
      value: editingProduct ? selectedPattern : nextPatternCode,
      readOnly: true,
      placeholder: 'Auto-generating...'
    },
    {
      name: 'art_number',
      label: 'Generated Art Number',
      type: 'text',
      value: (selectedGender && selectedDress)
        ? `${selectedGender}-${selectedDress}${editingProduct ? selectedPattern : nextPatternCode}`
        : '',
      readOnly: true,
      placeholder: 'Will generate automatically...',
      required: true
    },
    {
      name: 'name',
      label: 'Product Name',
      type: 'text',
      placeholder: 'e.g. Cotton Shirt',
      required: true,
      defaultValue: editingProduct?.name
    },
    {
      name: 'materials',
      label: 'Specification',
      type: 'textarea',
      placeholder: 'e.g. Cotton shirt with chest pocket',
      defaultValue: parseMaterialsField(editingProduct?.materials).materials
    },
    {
      name: 'base_size',
      label: 'Base Size',
      type: 'text',
      placeholder: 'e.g. 38, M, L',
      required: false,
      value: baseSize,
      onChange: (val) => setBaseSize(val),
      hidden: productType === 'accessories'
    },
    {
      name: 'base_size_accessories',
      label: 'Base Size Options (Accessories)',
      type: 'custom',
      className: 'md:col-span-2',
      hidden: productType !== 'accessories',
      render: (val, onChange) => (
        <AccessorySizeInput
          sizes={accessorySizes}
          setSizes={setAccessorySizes}
          onChange={onChange}
        />
      ),
      defaultValue: accessorySizes,
      required: false
    },
    {
      name: 'other_sizes',
      label: 'Other Sizes',
      type: 'text',
      placeholder: 'e.g. S, L, XL, XXL (comma-separated)',
      value: otherSizes,
      onChange: (val) => setOtherSizes(val)
    },
    {
      name: 'fit',
      label: 'Base Fit',
      type: 'select',
      options: [
        { label: 'Select Fit Type', value: '' },
        { label: 'Regular Fit', value: 'regular fit' },
        { label: 'Slim Fit', value: 'slim fit' }
      ],
      required: false,
      value: fit,
      onChange: (val) => setFit(val),
      hidden: productType === 'accessories'
    },
    {
      name: 'other_fits',
      label: 'Other Fits',
      type: 'text',
      placeholder: 'e.g. Loose Fit, Comfort Fit (comma-separated)',
      value: otherFits,
      onChange: (val) => setOtherFits(val)
    },
    {
      name: 'sam_value',
      label: 'SAM Value',
      type: 'number',
      placeholder: 'e.g. 1.25',
      step: 'any',
      defaultValue: editingProduct?.sam_value !== null && editingProduct?.sam_value !== undefined ? String(editingProduct.sam_value) : ''
    },
    {
      name: 'measurement_type',
      label: 'Measurement Types (Size, custom, or both)',
      type: 'select',
      options: [
        { label: 'Standard Size Chart only', value: 'size' },
        { label: 'Custom Measurements only', value: 'custom' },
        { label: 'Both Size & Custom', value: 'both' }
      ],
      value: measurementType,
      onChange: (val) => setMeasurementType(val),
      required: true
    },
    {
      name: 'images',
      label: 'Product Images',
      type: 'image-upload',
      defaultValue: editingProduct?.images || [],
      className: 'md:col-span-2'
    },
    {
      name: 'main_fabric',
      label: 'Main Fabric (meters)',
      type: 'number',
      placeholder: 'e.g. 2',
      defaultValue: editingProduct?.main_fabric !== null && editingProduct?.main_fabric !== undefined ? String(editingProduct.main_fabric) : '',
      required: true,
      step: 'any'
    },
    {
      name: 'attachment_fabric1',
      label: 'Attachment Fabric 1 (meters)',
      type: 'number',
      placeholder: 'e.g. 1',
      defaultValue: editingProduct?.attachment_fabric1 !== null && editingProduct?.attachment_fabric1 !== undefined ? String(editingProduct.attachment_fabric1) : '',
      required: false,
      step: 'any'
    },
    {
      name: 'attachment_fabric2',
      label: 'Attachment Fabric 2 (meters)',
      type: 'number',
      placeholder: 'e.g. 1',
      defaultValue: editingProduct?.attachment_fabric2 !== null && editingProduct?.attachment_fabric2 !== undefined ? String(editingProduct.attachment_fabric2) : '',
      required: false,
      step: 'any'
    },
    {
      name: 'button_count',
      label: 'Buttons Count',
      type: 'number',
      placeholder: 'e.g. 6',
      defaultValue: editingProduct?.button_count !== null && editingProduct?.button_count !== undefined ? String(editingProduct.button_count) : '',
      required: true
    },
    {
      name: 'thread_count',
      label: 'Thread Count (cones/meters)',
      type: 'number',
      placeholder: 'e.g. 1',
      defaultValue: editingProduct?.thread_count !== null && editingProduct?.thread_count !== undefined ? String(editingProduct.thread_count) : '',
      required: true
    },
    {
      name: 'class_fabric_consumption',
      label: 'Fabric Consumption details for Classes & Corporate (Optional)',
      type: 'custom',
      className: 'md:col-span-2',
      defaultValue: classFabricConsumption,
      required: false,
      onChange: (val) => setClassFabricConsumption(val),
      render: (val, onChange) => {
        const handleCellChange = (cls: string, field: string, value: string) => {
          const currentObj = val || {};
          const updatedCls = { ...(currentObj[cls] || {}), [field]: value };
          const updatedObj = { ...currentObj, [cls]: updatedCls };
          onChange(updatedObj);
        };

        return (
          <div className="overflow-x-auto border border-zinc-150 rounded-2xl bg-white shadow-sm p-4">
            <table className="min-w-full text-xs font-bold text-zinc-700">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                  <th className="p-3 uppercase tracking-wider">Class / Corporate</th>
                  <th className="p-3 uppercase tracking-wider">Main Fabric (m)</th>
                  <th className="p-3 uppercase tracking-wider">Att Fabric 1 (m)</th>
                  <th className="p-3 uppercase tracking-wider">Att Fabric 2 (m)</th>
                  <th className="p-3 uppercase tracking-wider">Buttons (pcs)</th>
                  <th className="p-3 uppercase tracking-wider">Thread (cones)</th>
                </tr>
              </thead>
              <tbody>
                {classesList.map((cls) => {
                  const rowData = (val && val[cls]) || {};
                  return (
                    <tr key={cls} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                      <td className="p-3 text-[#3a525d] font-black">{cls === 'Corporate' ? 'Corporate' : cls}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          value={rowData.main_fabric || ''}
                          onChange={(e) => handleCellChange(cls, 'main_fabric', e.target.value)}
                          placeholder="e.g. 1.25"
                          className="w-20 px-2 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          value={rowData.attachment_fabric1 || ''}
                          onChange={(e) => handleCellChange(cls, 'attachment_fabric1', e.target.value)}
                          placeholder="e.g. 0.5"
                          className="w-20 px-2 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          value={rowData.attachment_fabric2 || ''}
                          onChange={(e) => handleCellChange(cls, 'attachment_fabric2', e.target.value)}
                          placeholder="e.g. 0.2"
                          className="w-20 px-2 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={rowData.button_count || ''}
                          onChange={(e) => handleCellChange(cls, 'button_count', e.target.value)}
                          placeholder="e.g. 6"
                          className="w-20 px-2 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={rowData.thread_count || ''}
                          onChange={(e) => handleCellChange(cls, 'thread_count', e.target.value)}
                          placeholder="e.g. 1"
                          className="w-20 px-2 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
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
    if (!data.main_fabric_id || data.main_fabric_id === '') data.main_fabric_id = null;
    if (!data.button_id || data.button_id === '') data.button_id = null;
    if (!data.thread_id || data.thread_id === '') data.thread_id = null;

    // Process fabric meters as float numbers to support decimals
    data.main_fabric = data.main_fabric !== '' && data.main_fabric !== null && data.main_fabric !== undefined ? parseFloat(data.main_fabric) : 0;
    data.attachment_fabric1 = data.attachment_fabric1 !== '' && data.attachment_fabric1 !== null && data.attachment_fabric1 !== undefined ? parseFloat(data.attachment_fabric1) : null;
    data.attachment_fabric2 = data.attachment_fabric2 !== '' && data.attachment_fabric2 !== null && data.attachment_fabric2 !== undefined ? parseFloat(data.attachment_fabric2) : null;

    data.button_count = data.button_count !== '' && data.button_count !== null && data.button_count !== undefined ? parseInt(data.button_count, 10) : 0;
    data.thread_count = data.thread_count !== '' && data.thread_count !== null && data.thread_count !== undefined ? parseInt(data.thread_count, 10) : 0;
    if (!data.product_type_id || data.product_type_id === '') data.product_type_id = null;
    else data.product_type_id = parseInt(data.product_type_id);

    // SAM value: send as number or null
    if (!data.sam_value || data.sam_value === '') data.sam_value = null;
    else data.sam_value = parseFloat(data.sam_value);

    data.retail_sam_value = null;
    data.images = data.images || [];

    // Map new fields
    data.other_sizes = otherSizes.trim() || null;
    data.other_fits = otherFits.trim() || null;
    data.measurement_type = measurementType || 'both';
    data.class_fabric_consumption = data.class_fabric_consumption || {};

    // Generate dynamic art_number and map gender name
    const effectivePattern = editingProduct ? selectedPattern : nextPatternCode;
    data.art_number = (selectedGender && selectedDress && effectivePattern)
      ? `${selectedGender}-${selectedDress}${effectivePattern}`
      : '';
    const genderObj = genders.find(g => g.code === selectedGender);
    data.gender = genderObj ? genderObj.name : 'Unisex';

    // Set base size and fit
    if (productType === 'accessories') {
      data.base_size = accessorySizes.join(', ') || null;
      data.fit = null;
    } else {
      data.base_size = baseSize.trim() || null;
      data.fit = fit || null;
    }
    delete data.base_size_accessories;
    data.design_number = data.design_number || (editingProduct ? editingProduct.design_number : nextDesignNumber) || null;

    // Serialize product_type into materials
    const pType = data.product_type || '';
    const pMats = data.materials || '';
    data.materials = pType ? `[ProductType: ${pType}] ${pMats}` : pMats;

    try {
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, data);
        if (res.data?.variant_created) {
          toast.success('Product updated! A new Design Number was auto-created for the changed button/thread combination.', { id: loadingToast, duration: 5000 });
        } else {
          toast.success('Product updated!', { id: loadingToast });
        }
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
          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#3a525d] border border-zinc-100 shadow-inner overflow-hidden flex-shrink-0">
            {p.images && p.images.length > 0 ? (
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <Box size={24} />
            )}
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{p.name}</p>
            <p className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-widest mt-1">
              {p.design_number ? `DN: ${p.design_number} | ` : ''}SN: {p.art_number}
            </p>
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
      accessor: (p) => {
        const { type: parsedType } = parseMaterialsField(p.materials);
        const typeLabels: Record<string, string> = {
          readymade: 'Readymade',
          accessories: 'Accessories',
          trade_readymade: 'Trade Readymade'
        };
        return (
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
            {parsedType && (
              <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[8px] font-black uppercase rounded border border-teal-100 w-fit">
                {typeLabels[parsedType] || parsedType}
              </span>
            )}
          </div>
        );
      }
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
              <span className="font-bold text-zinc-400">Buttons:</span>
              <span className="text-zinc-700 font-semibold">{p.button_count !== null && p.button_count !== undefined ? `${p.button_count} pcs` : '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-zinc-400">Thread:</span>
              <span className="text-zinc-700 font-semibold">{p.thread_count !== null && p.thread_count !== undefined ? `${p.thread_count} unit(s)` : '—'}</span>
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
      header: 'SAM Value',
      accessor: (p) => (
        p.sam_value !== null && p.sam_value !== undefined ? (
          <span className="px-2 py-0.5 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-lg text-[10px] font-black text-[#2d8d9b] font-mono">
            {Number(p.sam_value).toFixed(2)}
          </span>
        ) : (
          <span className="text-[10px] italic text-zinc-300">—</span>
        )
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
            title="Edit Product"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setSelectedProductForVariants(p)}
            className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-amber-100"
            title="Manage Design Variants"
          >
            <Layers size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm({ isOpen: true, id: p.id })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
            title="Delete Product"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="py-10 animate-in zoom-in duration-500">Product Type
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

      {/* Product Variants Modal */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-2xl max-w-4xl w-full p-8 max-h-[85vh] overflow-y-auto space-y-6 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black italic text-[#3a525d]">Manage Design Variants</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1">
                  Product: {selectedProductForVariants.name} ({selectedProductForVariants.art_number})
                </p>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">
                  Default Design Number: <span className="text-[#3a525d] font-bold">{selectedProductForVariants.design_number}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForVariants(null)}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-xs uppercase bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl transition-all"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start overflow-y-auto pr-1">

              {/* LIST OF VARIANTS */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d] border-b border-zinc-100 pb-2">
                  Registered Design Numbers ({productVariants.length})
                </h4>
                {productVariants.length === 0 ? (
                  <div className="bg-zinc-50 border border-zinc-150 p-6 rounded-2xl text-center text-zinc-400 text-xs font-medium">
                    No variant design numbers registered for this product. Use the form to add one.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {productVariants.map((v) => (
                      <div key={v.id} className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex flex-col gap-1.5 relative hover:border-[#2d8d9b]/35 transition-all">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 text-[9px] font-black uppercase rounded">
                            {v.design_code}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded">
                            {v.variant_status}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-semibold grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <span className="font-bold text-zinc-400">Buttons: </span>
                            <span className="text-[#3a525d]">{v.button_name} ({v.button_count} pcs)</span>
                          </div>
                          <div>
                            <span className="font-bold text-zinc-400">Thread: </span>
                            <span className="text-[#3a525d]">{v.thread_name} ({v.thread_count} unit)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CREATE VARIANT FORM */}
              <form onSubmit={handleCreateVariant} className="bg-zinc-50/50 border border-zinc-200/60 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d] border-b border-zinc-100 pb-2">
                  Create Design Variant
                </h4>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Button Brand</label>
                  <select
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                    value={newVariantBtn}
                    onChange={(e) => setNewVariantBtn(e.target.value)}
                  >
                    <option value="">Select button...</option>
                    {buttonsList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Buttons Count (pcs)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                    value={newVariantBtnCount}
                    onChange={(e) => setNewVariantBtnCount(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Thread Brand/Color</label>
                  <select
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                    value={newVariantThread}
                    onChange={(e) => setNewVariantThread(e.target.value)}
                  >
                    <option value="">Select thread...</option>
                    {threadsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Thread Count (units)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                    value={newVariantThreadCount}
                    onChange={(e) => setNewVariantThreadCount(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingVariant}
                  className="w-full py-3 bg-[#3a525d] hover:bg-[#2d8d9b] disabled:bg-zinc-300 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
                >
                  {isCreatingVariant ? 'Registering...' : 'Register Variant Design Number'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
