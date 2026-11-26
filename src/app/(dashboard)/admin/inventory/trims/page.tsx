'use client';
import { Select } from '@/components/ui/Select';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { DynamicForm } from '@/components/ui/DynamicForm';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatCurrency, formatQuantity, formatDate } from '@/lib/formatters';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import {
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  X,
  ArrowLeft,
  RotateCcw,
  Maximize2,
  Copy,
  Check,
  Box,
  Tag,
  Building2,
  FileText
} from 'lucide-react';
import { ZoomableImageLightbox, parseImageGallery } from '@/components/ui/ZoomableImageLightbox';
import api from '@/lib/api';
import toast from '@/components/ui/toast';

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
  brand_name?: string | null;
  specification?: string | null;
  color?: string | null;
  shade_no?: string | null;
  size?: string | null;
  size_uom?: string | null;
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
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Select Supplying Vendors</label>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-[10px] font-black text-[#9E1B1D] hover:text-[#C82A2B] hover:underline uppercase tracking-wider transition-all cursor-pointer bg-transparent border-none outline-none"
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
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left ${isChecked
                  ? 'bg-[#FFF1F1] border-[#C82A2B] text-[#9E1B1D] font-bold shadow-2xs'
                  : 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-600'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(vendor.id)}
                  className="mt-0.5 rounded border-zinc-300 text-[#C82A2B] focus:ring-[#C82A2B] accent-[#C82A2B] h-3.5 w-3.5"
                />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-xs truncate font-bold">{vendor.name}</p>
                  {vendor.code && (
                    <span className="text-[9px] text-[#9E1B1D] uppercase tracking-wider font-mono font-bold block mt-0.5">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200 relative space-y-4 overflow-hidden"><div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0 right-0" />
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-lg font-black text-zinc-900">Quick Register Vendor</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Add a new supplier profile directly to the catalog.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Apex Fasteners Ltd"
                  className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">Vendor Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="e.g. V-001"
                    className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sales@..."
                    className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
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
                className="px-6 py-2.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#C82A2B]/25 disabled:opacity-50 cursor-pointer active:scale-95"
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
  const [selectedTrimForDetails, setSelectedTrimForDetails] = useState<TrimItem | null>(null);
  const [activeDetailImageIndex, setActiveDetailImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
        brand_name: data.brand_name?.trim() || null,
        specification: data.specification?.trim() || null,
        color: data.color?.trim() || null,
        shade_no: data.shade_no?.trim() || null,
        size: data.size?.trim() || null,
        size_uom: null,
        quantity: data.quantity !== undefined && data.quantity !== '' ? parseFloat(data.quantity) : 0,
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

  // Trims filters state
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [filterSize, setFilterSize] = useState<string>('ALL');
  const [filterColour, setFilterColour] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Helper: Extract Colour strictly from database trim fields (type, description, or remarks)
  const extractTrimColor = (t: TrimItem): string => {
    const desc = t.description || '';
    const colorMatch = desc.match(/(?:color|shade)\s*:\s*([^,;|\n]+)/i);
    if (colorMatch && colorMatch[1]) return colorMatch[1].trim();

    if (t.type && !t.type.toLowerCase().includes('button') && !t.type.toLowerCase().includes('thread') && !t.type.toLowerCase().includes('trim')) {
      return t.type.trim();
    }
    return '';
  };

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    trims.forEach(t => {
      if (t.brand_name && t.brand_name.trim()) {
        set.add(t.brand_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [trims]);

  const uniqueSizes = useMemo(() => {
    const set = new Set<string>();
    trims.forEach(t => {
      if (t.size && t.size.trim()) {
        const full = t.size_uom && !t.size.toLowerCase().includes(t.size_uom.toLowerCase())
          ? `${t.size.trim()} ${t.size_uom.trim()}`
          : t.size.trim();
        set.add(full);
      }
      const text = `${t.name} ${t.description || ''} ${t.type || ''}`;
      const sizeMatch = (t.description || '').match(/(?:size|dimensions?|width|length)\s*:\s*([^,;|\n]+)/i);
      if (sizeMatch && sizeMatch[1]) {
        set.add(sizeMatch[1].trim());
      }
      const matches = text.match(/\b(\d+(?:\.\d+)?(?:["']|L|mm|cm|m)\b|#\d+|XS|S|M|L|XL|2XL|3XL|4XL|Free Size)/gi);
      if (matches) {
        matches.forEach(m => {
          if (m && m.length <= 12) set.add(m);
        });
      }
    });
    return Array.from(set).sort();
  }, [trims]);

  const uniqueColours = useMemo(() => {
    const set = new Set<string>();
    const commonColors = [
      'White', 'Black', 'Gold', 'Silver', 'Brass', 'Navy Blue', 'Navy',
      'Royal Blue', 'Sky Blue', 'Grey', 'Heather Grey', 'Maroon', 'Red',
      'Bottle Green', 'Green', 'Beige', 'Khaki', 'Yellow', 'Brown', 'Bronze', 'Rama Blue'
    ];
    trims.forEach(t => {
      if (t.color && t.color.trim()) {
        set.add(t.color.trim());
      }
      const col = extractTrimColor(t);
      if (col) {
        set.add(col);
      }
      const descMatch = (t.description || '').match(/(?:color|shade)\s*:\s*([^,;|\n]+)/i);
      if (descMatch && descMatch[1]) {
        set.add(descMatch[1].trim());
      }
      const text = `${t.name || ''} ${t.description || ''} ${t.type || ''}`;
      commonColors.forEach(cc => {
        const regex = new RegExp(`\\b${cc}\\b`, 'i');
        if (regex.test(text)) {
          set.add(cc);
        }
      });
    });
    return Array.from(set).sort();
  }, [trims]);

  // Filter trims by category, size, colour, and search
  const filteredTrims = useMemo(() => {
    return trims.filter(t => {
      if (selectedCategoryId !== 'ALL' && t.category_id !== selectedCategoryId) {
        return false;
      }
      if (filterBrand !== 'ALL') {
        const itemBrand = (t.brand_name || '').toLowerCase();
        if (itemBrand !== filterBrand.toLowerCase()) return false;
      }
      if (filterSize !== 'ALL') {
        const itemSize = t.size ? `${t.size} ${t.size_uom || ''}`.trim().toLowerCase() : '';
        const text = `${t.name} ${t.description || ''} ${t.type || ''}`.toLowerCase();
        if (!text.includes(filterSize.toLowerCase()) && !itemSize.includes(filterSize.toLowerCase())) return false;
      }
      if (filterColour !== 'ALL') {
        const itemColor = (t.color || extractTrimColor(t) || '').toLowerCase();
        const text = `${t.name} ${t.description || ''} ${t.type || ''}`.toLowerCase();
        if (!text.includes(filterColour.toLowerCase()) && !itemColor.includes(filterColour.toLowerCase())) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          (t.name || '').toLowerCase().includes(term) ||
          (t.code || '').toLowerCase().includes(term) ||
          (t.brand_name || '').toLowerCase().includes(term) ||
          (t.specification || '').toLowerCase().includes(term) ||
          (t.color || '').toLowerCase().includes(term) ||
          (t.shade_no || '').toLowerCase().includes(term) ||
          (t.size || '').toLowerCase().includes(term) ||
          (t.description || '').toLowerCase().includes(term) ||
          (t.type || '').toLowerCase().includes(term) ||
          (t.uom || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [trims, selectedCategoryId, filterBrand, filterSize, filterColour, searchTerm]);

  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const getTrimFullName = (item: TrimItem) => {
    const trimType = item.category?.name || item.type;
    const brand = item.brand_name;
    const name = item.name;
    const spec = item.specification;
    const col = item.color || extractTrimColor(item);
    const shade = item.shade_no;
    const sz = item.size ? (
      item.size_uom && !item.size.toLowerCase().includes(item.size_uom.toLowerCase())
        ? `${item.size} ${item.size_uom}`
        : item.size
    ) : (item.size_uom || '');

    return [trimType, brand, name, spec, col, shade, sz]
      .map(val => (val || '').trim())
      .filter(val => val && val !== '—')
      .join(' ');
  };

  const handlePrintTrims = (sortedData?: TrimItem[], sortInfo?: SortInfo<TrimItem>) => {
    const dataToPrint = sortedData && sortedData.length > 0 ? sortedData : filteredTrims;
    const rowsHtml = dataToPrint.map((item, idx) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #ddd; padding: 6px; font-family: monospace; font-weight: 800; color: #9E1B1D;">${item.code || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 6px; font-weight: 700;">${getTrimFullName(item) || item.name || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${item.description || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: 700; font-family: monospace;">${formatQuantity(item.quantity)}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: 600;">${item.uom || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: 700;">${item.unit_price ? formatCurrency(item.unit_price) : '—'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Trim Catalog</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
    h1 { margin: 0 0 6px 0; color: #3a525d; font-size: 22px; font-style: italic; }
    p { margin: 0 0 16px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { border: 1px solid #cbd5e1; background: #f8fafc; padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; }
    td { border: 1px solid #e2e8f0; padding: 6px 8px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>Trim Catalog</h1>
  <p>Generated on ${formatDate(new Date())} | Total Items: ${dataToPrint.length}${sortInfo?.headerLabel && sortInfo.headerLabel !== 'Default' ? ` | Sorted by: ${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending' : 'Descending'})` : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th>Trim No.</th>
        <th>Item Name</th>
        <th>Description</th>
        <th style="text-align: right;">Quantity</th>
        <th style="text-align: center;">UOM</th>
        <th style="text-align: right;">Rate</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No trims found</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 250);
    }
  };

  const columns: Column<TrimItem>[] = [
    {
      header: 'Trim No.',
      accessor: 'code',
      className: 'font-black text-[#9E1B1D]',
      sortValue: (item) => item.code
    },
    {
      header: 'Item Name',
      accessor: ((item: TrimItem) => {
        const fullName = getTrimFullName(item);
        const itemImgs = parseImageGallery(item.images);
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center overflow-hidden shrink-0">
              {itemImgs.length > 0 ? (
                <img src={itemImgs[0]} alt={fullName || item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] text-zinc-300 font-bold uppercase">No Img</span>
              )}
            </div>
            <div>
              <p className="font-bold text-xs text-zinc-900">{fullName || item.name || '—'}</p>
            </div>
          </div>
        );
      }) as any,
      sortValue: (item) => getTrimFullName(item) || item.name
    },
    {
      header: 'Description',
      accessor: ((item: TrimItem) => (
        <div className="max-w-xs truncate text-xs font-medium text-zinc-600" title={item.description || ''}>
          {item.description || '—'}
        </div>
      )) as any,
      sortValue: (item) => item.description || ''
    },
    {
      header: 'Quantity',
      accessor: ((item: TrimItem) => (
        <span className="font-black text-xs text-zinc-900 font-mono">
          {formatQuantity(item.quantity)}
        </span>
      )) as any,
      sortValue: (item) => item.quantity || 0
    },
    {
      header: 'UOM',
      accessor: 'uom',
      className: 'font-bold text-xs text-zinc-700 text-center',
      sortValue: (item) => item.uom
    },
    {
      header: 'Rate',
      accessor: ((item: TrimItem) => (
        <span className="font-bold text-xs text-zinc-900">
          {item.unit_price ? formatCurrency(item.unit_price) : '—'}
        </span>
      )) as any,
      sortValue: (item) => item.unit_price || 0
    },
    {
      header: 'Action',
      accessor: ((item: TrimItem) => (
        <div className="flex items-center gap-1.5">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setEditingItem(item);
              setView('edit');
            }}
            variant="secondary"
            className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-[#3a525d]/10 text-zinc-900 hover:bg-[#3a525d] hover:text-white transition-all shadow-xs p-0 border-none cursor-pointer"
            title="Edit Trim"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({ isOpen: true, id: item.id });
            }}
            variant="secondary"
            className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-xs p-0 border-none cursor-pointer"
            title="Delete Trim"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )) as any,
      className: 'w-24'
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
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-900 transition-colors bg-transparent border-none shadow-none px-0 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to List
        </Button>

        <div className="max-w-4xl mx-auto">
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
                name: 'brand_name',
                label: 'Brand Name',
                type: 'text',
                required: false,
                placeholder: 'e.g. YKK, Coats, Madura, Prym',
                defaultValue: editingItem?.brand_name || '',
                allowSpecialCharacters: true
              },
              {
                name: 'name',
                label: 'Trim Name',
                type: 'text',
                required: true,
                placeholder: 'e.g. Brass Zipper, Pearl Button, Spun Poly Thread',
                defaultValue: editingItem?.name || '',
                allowSpecialCharacters: true
              },
              {
                name: 'type',
                label: 'Type / Material Variant',
                type: 'text',
                required: false,
                placeholder: 'e.g. Polyester, Brass, Resin, Nylon, Cotton',
                defaultValue: editingItem?.type || '',
                allowSpecialCharacters: true
              },
              {
                name: 'specification',
                label: 'Specification',
                type: 'text',
                required: false,
                placeholder: 'e.g. Auto Lock, 4-Hole Rimmed, 3-Ply High Tenacity',
                defaultValue: editingItem?.specification || '',
                allowSpecialCharacters: true
              },
              {
                name: 'color',
                label: 'Colour',
                type: 'text',
                required: false,
                placeholder: 'e.g. Navy Blue, White, Antique Brass, Jet Black',
                defaultValue: editingItem?.color || '',
                allowSpecialCharacters: true
              },
              {
                name: 'shade_no',
                label: 'Shade No.',
                type: 'text',
                required: false,
                placeholder: 'e.g. SH-402, 001, D-12',
                defaultValue: editingItem?.shade_no || '',
                allowSpecialCharacters: true
              },
              {
                name: 'size',
                label: 'Size / Dimension',
                type: 'text',
                required: false,
                placeholder: 'e.g. 7", 24L, 32L, #5, 40/2, 25mm',
                defaultValue: editingItem?.size ? (
                  editingItem?.size_uom && !editingItem.size.toLowerCase().includes(editingItem.size_uom.toLowerCase())
                    ? `${editingItem.size} ${editingItem.size_uom}`
                    : editingItem.size
                ) : (editingItem?.size_uom || ''),
                allowSpecialCharacters: true
              },
              {
                name: 'uom',
                label: 'Inventory Unit (UOM)',
                type: 'select',
                required: true,
                options: [
                  { label: 'Pcs (Pieces)', value: 'Pcs' },
                  { label: 'Spools', value: 'Spools' },
                  { label: 'Cones', value: 'Cones' },
                  { label: 'Meters', value: 'Meters' },
                  { label: 'Gross (144 pcs)', value: 'Gross' },
                  { label: 'Sets', value: 'Sets' },
                  { label: 'Rolls', value: 'Rolls' },
                  { label: 'Kgs', value: 'Kgs' }
                ],
                defaultValue: editingItem?.uom || 'Pcs'
              },
              {
                name: 'quantity',
                label: 'Current Stock Quantity',
                type: 'number',
                step: 'any',
                placeholder: '0',
                defaultValue: editingItem?.quantity !== null && editingItem?.quantity !== undefined ? String(editingItem.quantity) : '0'
              },
              {
                name: 'unit_price',
                label: 'Unit Price / Rate (₹)',
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
                label: 'Additional Remarks / Notes',
                type: 'textarea',
                className: 'md:col-span-2',
                placeholder: 'Optional storage location, vendor part references, packaging details...',
                defaultValue: editingItem?.description || ''
              },
              {
                name: 'images',
                label: 'Trim Images',
                type: 'image-upload',
                maxImages: 5,
                uploadLabel: 'Upload Trim Images',
                className: 'md:col-span-2',
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
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Top Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative">
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Trim Catalog</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1 opacity-70">
              Thread, Buttons, Zippers, Labels &amp; Finishing Accessories
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setEditingItem(null);
                setView('add');
              }}
              className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={3} />
              New Trim
            </Button>
            <PageActionsMenu
              onPrint={() => {
                if (printTriggerRef.current) {
                  printTriggerRef.current();
                } else {
                  handlePrintTrims(filteredTrims);
                }
              }}
              printLabel="Print Trims"
              onUserReport={() => userReportTriggerRef.current?.()}
              userReportLabel="My Report"
              extraActions={[
                {
                  label: 'Add Category',
                  description: 'Create & define new trim category',
                  onClick: () => setIsCategoryModalOpen(true),
                  icon: <FolderPlus size={16} className="text-[#C82A2B]" />
                }
              ]}
            />
          </div>
        </div>

        {/* Table Content */}
        <DataTable
          columns={columns}
          data={filteredTrims}
          isLoading={isLoading}
          searchPlaceholder="Search trims"
          onSearch={setSearchTerm}
          onPrint={handlePrintTrims}
          hideTablePrint={true}
          printTriggerRef={printTriggerRef}
          userReportTriggerRef={userReportTriggerRef}
          onRowClick={(trim) => {
            setSelectedTrimForDetails(trim);
            setActiveDetailImageIndex(0);
          }}
          headerAction={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <FilterDropdown
                label="Category"
                allLabel={`All Categories (${trims.length})`}
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                options={categories.map(c => ({
                  label: c.name,
                  value: c.id,
                  badge: trims.filter(t => t.category_id === c.id).length
                }))}
              />

              {/* Brand Filter */}
              <FilterDropdown
                label="Brand"
                allLabel="All Brands"
                value={filterBrand}
                onChange={setFilterBrand}
                options={uniqueBrands}
              />

              {/* Colour Filter */}
              <FilterDropdown
                label="Colour"
                allLabel="All Colours"
                value={filterColour}
                onChange={setFilterColour}
                options={uniqueColours}
              />

              {/* Size Filter */}
              <FilterDropdown
                label="Size"
                allLabel="All Sizes"
                value={filterSize}
                onChange={setFilterSize}
                options={uniqueSizes}
              />

              {(selectedCategoryId !== 'ALL' || filterBrand !== 'ALL' || filterColour !== 'ALL' || filterSize !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId('ALL');
                    setFilterBrand('ALL');
                    setFilterColour('ALL');
                    setFilterSize('ALL');
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Trim Article Details Modal */}
      {selectedTrimForDetails && (() => {
        const trimImages = parseImageGallery(selectedTrimForDetails.images);
        const currentActiveImg = trimImages[activeDetailImageIndex] || trimImages[0];
        const fullName = getTrimFullName(selectedTrimForDetails) || selectedTrimForDetails.name;
        const categoryName = categories.find(c => c.id === selectedTrimForDetails.category_id)?.name || selectedTrimForDetails.category?.name;

        return (
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
            onClick={() => setSelectedTrimForDetails(null)}
          >
            <div
              className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedTrimForDetails.code && (
                      <span className="px-3 py-1 bg-zinc-900 text-white rounded-xl text-xs font-black font-mono flex items-center gap-1.5 shadow-xs">
                        <Tag size={12} className="text-zinc-400" />
                        {selectedTrimForDetails.code}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTrimForDetails.code);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="hover:text-amber-400 transition ml-0.5 cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </span>
                    )}
                    {categoryName && (
                      <span className="px-2.5 py-1 bg-[#C82A2B]/10 text-[#9E1B1D] border border-[#C82A2B]/20 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {categoryName}
                      </span>
                    )}
                    {selectedTrimForDetails.brand_name && (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {selectedTrimForDetails.brand_name}
                      </span>
                    )}
                    {selectedTrimForDetails.type && (
                      <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {selectedTrimForDetails.type}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                    {fullName}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedTrimForDetails;
                      setSelectedTrimForDetails(null);
                      setEditingItem(item);
                      setView('edit');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#C82A2B] hover:bg-[#9E1B1D] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Edit2 size={13} />
                    Edit Trim
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTrimForDetails(null)}
                    className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Photos */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="relative aspect-4/3 sm:aspect-square w-full rounded-2xl bg-zinc-50 border border-zinc-200/90 overflow-hidden flex items-center justify-center group shadow-inner">
                      {currentActiveImg ? (
                        <>
                          <img
                            src={currentActiveImg}
                            alt={fullName}
                            className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                            onClick={() => setIsLightboxOpen(true)}
                          />
                          <button
                            type="button"
                            onClick={() => setIsLightboxOpen(true)}
                            className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white rounded-xl backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                            title="Click to Zoom / Enlarge"
                          >
                            <Maximize2 size={13} />
                            <span className="text-[10px] font-black uppercase tracking-wider">Enlarge</span>
                          </button>
                          {trimImages.length > 1 && (
                            <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-xs">
                              {activeDetailImageIndex + 1} / {trimImages.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-2">
                            <Box size={32} />
                          </div>
                          <p className="text-xs font-bold text-zinc-600">No Image Available</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Edit this trim to upload sample photos</p>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    {trimImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {trimImages.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveDetailImageIndex(idx)}
                            className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                              activeDetailImageIndex === idx
                                ? 'border-[#C82A2B] ring-2 ring-[#C82A2B]/20 shadow-sm scale-105'
                                : 'border-zinc-200 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Key Details & Specifications */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Specification Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Trim Number</span>
                        <span className="text-sm font-black text-[#9E1B1D] font-mono mt-0.5 block">{selectedTrimForDetails.code || '—'}</span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Category</span>
                        <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{categoryName || '—'}</span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Brand</span>
                        <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedTrimForDetails.brand_name || '—'}</span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Trim Type</span>
                        <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedTrimForDetails.type || '—'}</span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Specification</span>
                        <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedTrimForDetails.specification || '—'}</span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Colour / Shade No.</span>
                        <span className="text-sm font-bold text-zinc-900 mt-0.5 block">
                          {[selectedTrimForDetails.color, selectedTrimForDetails.shade_no ? `Shade: ${selectedTrimForDetails.shade_no}` : null].filter(Boolean).join(' • ') || '—'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Size</span>
                        <span className="text-sm font-black text-zinc-900 font-mono mt-0.5 block">
                          {selectedTrimForDetails.size ? (
                            selectedTrimForDetails.size_uom && !selectedTrimForDetails.size.toLowerCase().includes(selectedTrimForDetails.size_uom.toLowerCase())
                              ? `${selectedTrimForDetails.size} ${selectedTrimForDetails.size_uom}`
                              : selectedTrimForDetails.size
                          ) : (selectedTrimForDetails.size_uom || '—')}
                        </span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Rate / Unit Price</span>
                        <span className="text-sm font-black text-zinc-900 font-mono mt-0.5 block">
                          {selectedTrimForDetails.unit_price ? formatCurrency(selectedTrimForDetails.unit_price) : '—'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Current Stock</span>
                        <span className="text-sm font-black text-emerald-600 font-mono mt-0.5 block">
                          {formatQuantity(selectedTrimForDetails.quantity)} {selectedTrimForDetails.uom || 'Pcs'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedTrimForDetails.description && (
                      <div className="p-4 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 space-y-1.5">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9E1B1D] flex items-center gap-1.5">
                          <FileText size={13} className="text-[#C82A2B]" />
                          Description & Notes
                        </h4>
                        <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                          {selectedTrimForDetails.description}
                        </p>
                      </div>
                    )}

                    {/* Vendors & Suppliers */}
                    {selectedTrimForDetails.vendors && Array.isArray(selectedTrimForDetails.vendors) && selectedTrimForDetails.vendors.length > 0 && (
                      <div className="p-4 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 flex items-center gap-1.5">
                          <Building2 size={13} className="text-zinc-500" />
                          Associated Vendors ({selectedTrimForDetails.vendors.length})
                        </h4>
                        <div className="divide-y divide-zinc-200/60 border border-zinc-200/60 rounded-xl overflow-hidden bg-white">
                          {selectedTrimForDetails.vendors.map((v: any, idx: number) => (
                            <div key={v.id || idx} className="p-2.5 text-xs flex items-center justify-between gap-3">
                              <div>
                                <span className="font-bold text-zinc-800">{v.name || v.vendor_name || 'Vendor'}</span>
                                {v.code && <span className="text-[10px] text-zinc-400 font-mono ml-2">[{v.code}]</span>}
                              </div>
                              {v.phone && <span className="text-[11px] text-zinc-500 font-mono">{v.phone}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTrimForDetails(null)}
                  className="px-6 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox Viewer */}
      <ZoomableImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={selectedTrimForDetails?.images || []}
        initialIndex={activeDetailImageIndex}
        title={selectedTrimForDetails ? (getTrimFullName(selectedTrimForDetails) || selectedTrimForDetails.name) : ''}
      />

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200 relative space-y-4 overflow-hidden"><div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0 right-0" />
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-lg font-black text-zinc-900">New Trim Category</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Define a new article group (e.g. Elastic, Velcro, Buckle, Label).</p>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCatData.name}
                  onChange={e => setNewCatData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Elastic, Metal Buckles, Hang Tags"
                  className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">
                    Code Prefix
                  </label>
                  <input
                    type="text"
                    value={newCatData.code_prefix}
                    onChange={e => setNewCatData(prev => ({ ...prev, code_prefix: e.target.value.toUpperCase() }))}
                    placeholder="e.g. ELA, BCK"
                    maxLength={5}
                    className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">
                    Default UOM
                  </label>
                  <Select
                    value={newCatData.default_uom}
                    onChange={e => setNewCatData(prev => ({ ...prev, default_uom: e.target.value }))}
                    className="w-full text-xs font-bold text-zinc-900 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Meters">Meters</option>
                    <option value="Spools">Spools</option>
                    <option value="Gross">Gross</option>
                    <option value="Sets">Sets</option>
                    <option value="Rolls">Rolls</option>
                  </Select>
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
                  className="px-6 py-2.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#C82A2B]/25 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isSavingCategory ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
