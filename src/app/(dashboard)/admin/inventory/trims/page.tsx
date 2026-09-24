'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { DynamicForm } from '@/components/ui/DynamicForm';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatCurrency, formatQuantity } from '@/lib/formatters';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowLeft, 
  FolderPlus,
  Layers,
  X,
  Package
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface TrimCategory {
  id: string;
  name: string;
  code_prefix: string;
  default_uom: string;
  is_system: boolean;
  created_at?: string;
}

interface TrimItem {
  id: string;
  category_id: string;
  code: string;
  name: string;
  type?: string | null;
  uom: string;
  description?: string | null;
  unit_price: number | null;
  quantity: number;
  low_stock_threshold: number;
  images?: string[];
  vendors?: any[];
  category?: TrimCategory;
  created_at?: string;
}

// Vendor Checklist Component matching Fabric CatalogManager
const VendorChecklistInput: React.FC<{
  value: any[];
  onChange: (val: any[]) => void;
}> = ({ value = [], onChange }) => {
  const [globalVendors, setGlobalVendors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const loadVendors = () => {
    api.get('/vendors')
      .then(res => {
        setGlobalVendors((res.data || []).filter((v: any) => v.status === 'active'));
      })
      .catch(err => {
        console.error('Failed to load global vendors list:', err);
      });
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const selectedIds = (value || []).map(v => 
    typeof v === 'object' && v !== null ? (v.id || v.code) : v
  ).map(String);

  const handleToggle = (id: any) => {
    const stringId = String(id);
    let updatedIds;
    if (selectedIds.includes(stringId)) {
      updatedIds = selectedIds.filter(x => x !== stringId);
    } else {
      updatedIds = [...selectedIds, stringId];
    }

    const typedUpdated = updatedIds.map(val => {
      const match = globalVendors.find(v => String(v.id) === val);
      return match ? match.id : val;
    });

    onChange(typedUpdated);
  };

  const handleRegisterVendor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Vendor name is required');
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading('Registering new vendor...');
    try {
      const payload = {
        code: code.trim() || undefined,
        name: trimmedName,
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        status: 'active'
      };

      const res = await api.post('/vendors', payload);
      toast.success('Vendor registered successfully!', { id: loadingToast });
      
      setCode('');
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsModalOpen(false);

      const newVendor = res.data;
      if (newVendor && newVendor.id) {
        const typedUpdated = selectedIds.map(val => {
          const match = globalVendors.find(v => String(v.id) === val);
          return match ? match.id : val;
        });
        onChange([...typedUpdated, newVendor.id]);
      }
      loadVendors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to register vendor', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Select Supplying Vendors</label>
        <button 
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-[10px] font-black text-[#2d8d9b] hover:text-[#3a525d] hover:underline uppercase tracking-wider transition-all cursor-pointer bg-transparent border-none outline-none"
        >
          + Add New Vendor
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-3 bg-zinc-50/60 border border-zinc-200/80 rounded-2xl">
        {globalVendors.length === 0 ? (
          <p className="text-xs text-zinc-400 font-medium py-2 col-span-full text-center">No active vendors found. Click "+ Add New Vendor" above.</p>
        ) : (
          globalVendors.map(vendor => {
            const isChecked = selectedIds.includes(String(vendor.id));
            return (
              <label 
                key={vendor.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
                  isChecked 
                    ? 'bg-[#2d8d9b]/10 border-[#2d8d9b]/40 text-[#3a525d] font-bold shadow-sm' 
                    : 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-600'
                }`}
              >
                <input 
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(vendor.id)}
                  className="mt-0.5 rounded border-zinc-300 text-[#2d8d9b] focus:ring-[#2d8d9b] h-3.5 w-3.5"
                />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-xs truncate font-bold">{vendor.name}</p>
                  {vendor.code && (
                    <span className="text-[9px] text-[#2d8d9b] uppercase tracking-wider font-mono font-bold block mt-0.5">
                      {vendor.code}
                    </span>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* Modal for Quick Vendor Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-100 relative space-y-4">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-lg font-black text-[#3a525d]">Quick Register Vendor</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Add a new supplier profile directly to the catalog.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Company / Vendor Name *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Apex Fasteners Ltd"
                  className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Vendor Code</label>
                  <input 
                    type="text" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    placeholder="e.g. V-001"
                    className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Contact Person</label>
                  <input 
                    type="text" 
                    value={contactPerson} 
                    onChange={e => setContactPerson(e.target.value)} 
                    placeholder="e.g. Rahul"
                    className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Phone</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="+91..."
                    className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="sales@..."
                    className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleRegisterVendor()}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#2d8d9b]/20 disabled:opacity-50"
              >
                {isSaving ? 'Registering...' : 'Save & Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TrimsCatalogPage() {
  const [categories, setCategories] = useState<TrimCategory[]>([]);
  const [trims, setTrims] = useState<TrimItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Views & Modals matching Fabric CatalogManager
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<TrimItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  // State for Add Category Modal
  const [newCatData, setNewCatData] = useState({
    name: '',
    code_prefix: '',
    default_uom: 'Pcs'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, trimsRes] = await Promise.allSettled([
        api.get('/inventory/trim-categories'),
        api.get('/inventory/trims')
      ]);

      if (catsRes.status === 'fulfilled') {
        const catData = catsRes.value.data;
        if (!catData?.error) {
          setCategories(catData || []);
        }
      }

      if (trimsRes.status === 'fulfilled') {
        const trimsData = trimsRes.value.data;
        if (!trimsData?.error) {
          setTrims(trimsData || []);
        }
      }
    } catch (err: any) {
      console.error('Error fetching trims catalog data:', err);
      toast.error('Failed to load trims catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSavingCategory(true);
    const loadingToast = toast.loading('Creating trim category...');
    try {
      const prefix = newCatData.code_prefix.trim().toUpperCase() || 
        newCatData.name.trim().substring(0, 3).toUpperCase();

      await api.post('/inventory/trim-categories', {
        name: newCatData.name.trim(),
        code_prefix: prefix,
        default_uom: newCatData.default_uom || 'Pcs'
      });

      toast.success('Trim category registered successfully!', { id: loadingToast });
      setNewCatData({ name: '', code_prefix: '', default_uom: 'Pcs' });
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create category', { id: loadingToast });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSubmit = async (data: any) => {
    const loadingToast = toast.loading(editingItem ? 'Updating trim...' : 'Adding trim...');
    try {
      const payload = {
        category_id: data.category_id,
        code: data.code?.trim() || undefined,
        name: data.name?.trim(),
        type: data.type?.trim() || null,
        uom: data.uom || 'Pcs',
        description: data.description?.trim() || null,
        unit_price: data.unit_price ? parseFloat(data.unit_price) : null,
        low_stock_threshold: data.low_stock_threshold ? parseFloat(data.low_stock_threshold) : 10,
        images: data.images || [],
        vendors: data.vendors || []
      };

      if (editingItem) {
        await api.put(`/inventory/trims/${editingItem.id}`, payload);
        toast.success('Trim article updated successfully!', { id: loadingToast });
      } else {
        await api.post('/inventory/trims', payload);
        toast.success('New trim article added successfully!', { id: loadingToast });
      }

      setView('list');
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.delete(`/inventory/trims/${deleteConfirm.id}`);
      toast.success('Deleted successfully');
      setDeleteConfirm({ isOpen: false, id: null });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  // Filter trims by category pill if selected
  const filteredTrims = useMemo(() => {
    if (selectedCategoryId === 'ALL') return trims;
    return trims.filter(t => t.category_id === selectedCategoryId);
  }, [trims, selectedCategoryId]);

  // Columns styled identically to Fabric CatalogManager
  const columns: Column<TrimItem>[] = [
    { 
      header: 'Trim Number', 
      accessor: 'code', 
      className: 'font-black text-[#2d8d9b]' 
    },
    { 
      header: 'Trim Name', 
      accessor: ((item: TrimItem) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {item.images && item.images.length > 0 ? (
              <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-zinc-300 font-bold uppercase">No Img</span>
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-[#3a525d]">{item.name}</p>
            {item.description && (
              <p className="text-[10px] text-zinc-400 font-medium line-clamp-1 max-w-[200px]">{item.description}</p>
            )}
          </div>
        </div>
      )) as any
    },
    {
      header: 'Category',
      accessor: ((item: TrimItem) => (
        <span className="px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-xl text-[11px] font-black text-amber-700">
          {item.category?.name || 'Trim'}
        </span>
      )) as any
    },
    {
      header: 'Type / Variant',
      accessor: ((item: TrimItem) => (
        item.type ? (
          <span className="text-xs font-bold text-[#3a525d]">{item.type}</span>
        ) : (
          <span className="text-[10px] italic text-zinc-350">—</span>
        )
      )) as any
    },
    {
      header: 'UOM',
      accessor: 'uom',
      className: 'font-bold text-xs text-zinc-600'
    },
    {
      header: 'Unit Price',
      accessor: ((item: TrimItem) => (
        <span className="font-bold text-xs text-[#3a525d]">
          {item.unit_price ? formatCurrency(item.unit_price) : '—'}
        </span>
      )) as any
    },
    {
      header: 'Stock Quantity',
      accessor: ((item: TrimItem) => (
        <span className="font-black text-sm text-[#3a525d]">
          {formatQuantity(item.quantity)} {item.uom}
        </span>
      )) as any
    },
    {
      header: 'Action',
      accessor: ((item: TrimItem) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditingItem(item);
              setView('edit');
            }}
            variant="secondary"
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-[#3a525d]/10 text-[#3a525d] hover:bg-[#3a525d] hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={() => setDeleteConfirm({ isOpen: true, id: item.id })}
            variant="secondary"
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )) as any,
      className: 'w-32'
    }
  ];

  // View: Add or Edit Form matching Fabric CatalogManager
  if (view !== 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Button
          onClick={() => {
            setView('list');
            setEditingItem(null);
          }}
          variant="secondary"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] hover:text-[#3a525d] transition-colors bg-transparent border-none shadow-none px-0 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to List
        </Button>

        <div className="max-w-2xl mx-auto">
          <DynamicForm
            title={editingItem ? 'Edit Trim Article' : 'Add New Trim Article'}
            fields={[
              {
                name: 'category_id',
                label: 'Trim Category',
                type: 'select',
                required: true,
                options: [
                  { label: 'Select Category', value: '' },
                  ...categories.map(c => ({
                    label: `${c.name} (${c.code_prefix})`,
                    value: c.id
                  }))
                ],
                defaultValue: editingItem?.category_id || (categories[0]?.id || '')
              },
              {
                name: 'code',
                label: 'Trim Number (auto-generated)',
                type: 'text',
                required: false,
                readOnly: true,
                placeholder: 'Auto-generating...',
                defaultValue: editingItem?.code || '',
                allowSpecialCharacters: true
              },
              {
                name: 'name',
                label: 'Trim Name',
                type: 'text',
                required: true,
                placeholder: 'e.g. YKK Brass Zipper 7", 24L Pearl Button, 40/2 Spun Poly Thread',
                defaultValue: editingItem?.name || ''
              },
              {
                name: 'type',
                label: 'Type / Material Variant',
                type: 'text',
                required: false,
                placeholder: 'e.g. Polyester, Brass, Resin, Nylon, Cotton',
                defaultValue: editingItem?.type || ''
              },
              {
                name: 'uom',
                label: 'Unit of Measure (UOM)',
                type: 'select',
                required: true,
                options: [
                  { label: 'Pcs (Pieces)', value: 'Pcs' },
                  { label: 'Spools', value: 'Spools' },
                  { label: 'Meters', value: 'Meters' },
                  { label: 'Gross (144 pcs)', value: 'Gross' },
                  { label: 'Sets', value: 'Sets' },
                  { label: 'Rolls', value: 'Rolls' },
                  { label: 'Kgs', value: 'Kgs' }
                ],
                defaultValue: editingItem?.uom || 'Pcs'
              },
              {
                name: 'unit_price',
                label: 'Unit Price (₹)',
                type: 'number',
                step: 'any',
                placeholder: '0.00',
                defaultValue: editingItem?.unit_price !== null && editingItem?.unit_price !== undefined ? String(editingItem.unit_price) : ''
              },
              {
                name: 'low_stock_threshold',
                label: 'Low Stock Alert Threshold',
                type: 'number',
                step: 'any',
                placeholder: 'e.g. 10',
                defaultValue: editingItem?.low_stock_threshold !== null && editingItem?.low_stock_threshold !== undefined ? String(editingItem.low_stock_threshold) : '10'
              },
              {
                name: 'description',
                label: 'Trim Specification / Remarks',
                type: 'textarea',
                placeholder: 'Detailed specifications, size (e.g. 24L, 32L, #5), tensile strength, color shade code...',
                defaultValue: editingItem?.description || ''
              },
              {
                name: 'images',
                label: 'Trim Images',
                type: 'image-upload',
                maxImages: 5,
                uploadLabel: 'Upload Trim Images',
                defaultValue: editingItem?.images || []
              },
              {
                name: 'vendors',
                label: 'Trim Supplying Vendors',
                type: 'custom',
                className: 'md:col-span-2',
                defaultValue: editingItem?.vendors || [],
                render: (val: any, onChange: (v: any) => void) => (
                  <VendorChecklistInput
                    value={val || []}
                    onChange={onChange}
                  />
                )
              }
            ]}
            onSubmit={handleSubmit}
            onCancel={() => {
              setView('list');
              setEditingItem(null);
            }}
            submitLabel={editingItem ? 'Update' : 'Add Item'}
          />
        </div>
      </div>
    );
  }

  // View: Main List View matching Fabric CatalogManager
  return (
    <>
      <div className="space-y-4">
        {/* Category Pill Filters Bar */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedCategoryId === 'ALL'
                  ? 'bg-[#3a525d] text-white shadow-md shadow-[#3a525d]/20'
                  : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'
              }`}
            >
              All Trims ({trims.length})
            </button>
            {categories.map(cat => {
              const count = trims.filter(t => t.category_id === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#3a525d] text-white shadow-md shadow-[#3a525d]/20'
                      : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <DataTable
          title="Trim Catalog"
          subtitle="Thread, Buttons, Zippers, Labels & Finishing Accessories"
          columns={columns}
          data={filteredTrims}
          isLoading={isLoading}
          searchPlaceholder="Search trims by code, name, category, material..."
          headerAction={
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => setIsCategoryModalOpen(true)}
                variant="secondary"
                className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.15em] px-4 bg-white hover:bg-zinc-50 text-[#3a525d] border border-zinc-200 shadow-sm cursor-pointer"
              >
                <FolderPlus size={14} className="text-[#2d8d9b]" />
                + Category
              </Button>

              <Button
                onClick={() => {
                  setEditingItem(null);
                  setView('add');
                }}
                className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white border-none shadow-lg shadow-[#3a525d]/20 cursor-pointer"
              >
                <Plus size={14} strokeWidth={3} />
                Add Trim Article
              </Button>
            </div>
          }
        />
      </div>

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Trim Article?"
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        variant="danger"
      />

      {/* Quick Add Trim Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-100 relative space-y-4">
            <button 
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-lg font-black text-[#3a525d]">New Trim Category</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Define a new article group (e.g. Elastic, Velcro, Buckle, Label).</p>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">
                  Category Name *
                </label>
                <input 
                  type="text" 
                  value={newCatData.name} 
                  onChange={e => setNewCatData(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="e.g. Elastic, Metal Buckles, Hang Tags"
                  className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">
                    Code Prefix
                  </label>
                  <input 
                    type="text" 
                    value={newCatData.code_prefix} 
                    onChange={e => setNewCatData(prev => ({ ...prev, code_prefix: e.target.value.toUpperCase() }))} 
                    placeholder="e.g. ELA, BCK"
                    maxLength={5}
                    className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none uppercase" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">
                    Default UOM
                  </label>
                  <select
                    value={newCatData.default_uom}
                    onChange={e => setNewCatData(prev => ({ ...prev, default_uom: e.target.value }))}
                    className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Meters">Meters</option>
                    <option value="Spools">Spools</option>
                    <option value="Gross">Gross</option>
                    <option value="Sets">Sets</option>
                    <option value="Rolls">Rolls</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button 
                  type="button" 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingCategory}
                  className="px-6 py-2.5 bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#2d8d9b]/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCategory ? 'Saving...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
