'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { DynamicForm } from '@/components/ui/DynamicForm';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatCurrency, formatQuantity } from '@/lib/formatters';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FolderPlus,
  X,
  ArrowLeft
} from 'lucide-react';
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
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
                  isChecked 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
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

  // Trims filters state
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

  const uniqueSizes = useMemo(() => {
    const set = new Set<string>();
    trims.forEach(t => {
      const text = `${t.name} ${t.description || ''} ${t.type || ''}`;
      const sizeMatch = (t.description || '').match(/(?:size|dimensions?|width|length)\s*:\s*([^,;|\n]+)/i);
      if (sizeMatch && sizeMatch[1]) {
        set.add(sizeMatch[1].trim());
      }
      const matches = text.match(/\b(\d+(?:\.\d+)?(?:["']|L|mm|cm|m)\b|#\d+|XS|S|M|L|XL|2XL|3XL|4XL|Free Size)/gi);
      if (matches) {
        matches.forEach(m => {
          if (m && isNaN(Number(m))) set.add(m.trim());
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
      'Bottle Green', 'Green', 'Beige', 'Khaki', 'Yellow', 'Brown', 'Bronze'
    ];
    trims.forEach(t => {
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
      if (filterSize !== 'ALL') {
        const text = `${t.name} ${t.description || ''} ${t.type || ''}`.toLowerCase();
        if (!text.includes(filterSize.toLowerCase())) return false;
      }
      if (filterColour !== 'ALL') {
        const text = `${t.name} ${t.description || ''} ${t.type || ''}`.toLowerCase();
        if (!text.includes(filterColour.toLowerCase())) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          (t.name || '').toLowerCase().includes(term) ||
          (t.code || '').toLowerCase().includes(term) ||
          (t.description || '').toLowerCase().includes(term) ||
          (t.type || '').toLowerCase().includes(term) ||
          (t.uom || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [trims, selectedCategoryId, filterSize, filterColour, searchTerm]);

  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintTrims = (sortedData?: TrimItem[], sortInfo?: SortInfo<TrimItem>) => {
    const dataToPrint = sortedData && sortedData.length > 0 ? sortedData : filteredTrims;
    const rowsHtml = dataToPrint.map((item, idx) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace; font-weight: 800; color: #2d8d9b;">${item.code || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 700;">${item.name || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.description || item.type || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: 600;">${item.uom || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 700;">${item.unit_price ? formatCurrency(item.unit_price) : '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 700; font-family: monospace;">${formatQuantity(item.quantity)} ${item.uom}</td>
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
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; }
    td { border: 1px solid #e2e8f0; padding: 8px 10px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>Trim Catalog</h1>
  <p>Generated on ${new Date().toLocaleDateString('en-GB')} | Total Items: ${dataToPrint.length}${sortInfo?.headerLabel && sortInfo.headerLabel !== 'Default' ? ` | Sorted by: ${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending' : 'Descending'})` : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Trim No.</th>
        <th>Item Name</th>
        <th>Description</th>
        <th style="text-align: center;">UOM</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Quantity</th>
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

  // Columns styled identically to Fabric CatalogManager
  const columns: Column<TrimItem>[] = [
    { 
      header: 'Trim No.', 
      accessor: 'code', 
      className: 'font-black text-[#9E1B1D]',
      sortValue: (item) => item.code
    },
    { 
      header: 'Item Name', 
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
            <p className="font-bold text-sm text-zinc-900">{item.name}</p>
            {item.category?.name && (
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{item.category.name}</span>
            )}
          </div>
        </div>
      )) as any,
      sortValue: (item) => item.name
    },
    {
      header: 'Description',
      accessor: ((item: TrimItem) => (
        <div className="max-w-xs">
          <p className="text-xs font-medium text-zinc-600 line-clamp-2">
            {item.description || item.type || '—'}
          </p>
        </div>
      )) as any,
      sortValue: (item) => item.description || item.type || ''
    },
    {
      header: 'UOM',
      accessor: 'uom',
      className: 'font-bold text-xs text-zinc-600',
      sortValue: (item) => item.uom
    },
    {
      header: 'Unit Price',
      accessor: ((item: TrimItem) => (
        <span className="font-bold text-xs text-zinc-900">
          {item.unit_price ? formatCurrency(item.unit_price) : '—'}
        </span>
      )) as any,
      sortValue: (item) => item.unit_price || 0
    },
    {
      header: 'Quantity',
      accessor: ((item: TrimItem) => (
        <span className="font-black text-sm text-zinc-900">
          {formatQuantity(item.quantity)} {item.uom}
        </span>
      )) as any,
      sortValue: (item) => item.quantity || 0
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
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-[#3a525d]/10 text-zinc-900 hover:bg-[#3a525d] hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
            title="Edit Trim"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={() => setDeleteConfirm({ isOpen: true, id: item.id })}
            variant="secondary"
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
            title="Delete Trim"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )) as any,
      className: 'w-28'
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

        <DataTable
          columns={columns}
          data={filteredTrims}
          isLoading={isLoading}
          searchPlaceholder="Search"
          onSearch={setSearchTerm}
          onPrint={handlePrintTrims}
          hideTablePrint={true}
          printTriggerRef={printTriggerRef}
          userReportTriggerRef={userReportTriggerRef}
          headerAction={
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Dropdown */}
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
                maxWidth="max-w-[220px]"
              />

              {/* Size Filter Dropdown */}
              <FilterDropdown
                label="Size"
                allLabel="All Sizes"
                value={filterSize}
                onChange={setFilterSize}
                options={uniqueSizes}
              />

              {/* Colour Filter Dropdown */}
              <FilterDropdown
                label="Colour"
                allLabel="All Colours"
                value={filterColour}
                onChange={setFilterColour}
                options={uniqueColours}
              />
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
                  <select
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
                  className="px-6 py-2.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#C82A2B]/25 disabled:opacity-50 cursor-pointer active:scale-95"
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
