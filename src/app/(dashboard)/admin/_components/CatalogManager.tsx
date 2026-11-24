'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { DynamicForm } from '@/components/ui/DynamicForm';
import { Plus, Edit2, Trash2, ArrowLeft, X, Maximize2, Copy, Check, ChevronLeft, ChevronRight, Box, Layers, Tag, Scissors, Sparkles, Building2, Store, FileText } from 'lucide-react';
import { ZoomableImageLightbox, parseImageGallery } from '@/components/ui/ZoomableImageLightbox';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatFabricDisplayName } from '@/lib/fabricFormatter';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { formatDate } from '@/lib/formatters';

interface Item {
  id: string;
  code: string;
  name: string;
  brand_name?: string;
  brand_type?: string;
  quality?: string;
  description?: string;
  quantity?: number;
  low_stock_threshold?: number;
  shade?: string;
  width?: string;
  image?: string;
  images?: string[];
  latest_sam?: number | string;
  vendors?: any[];
  type?: string;
  unit_price?: number | null;
  garment_category?: string;
}

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

  // Normalize selected value array to string IDs for robust comparison.
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
      
      // Reset form & close modal
      setCode('');
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsModalOpen(false);

      // Refresh local vendors registry and auto-check the newly registered vendor
      const newVendor = res.data;
      if (newVendor && newVendor.id) {
        // Resolve original values
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRegisterVendor();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Select Supplying Vendors</label>
        <button 
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-[10px] font-black text-[#9E1B1D] hover:text-[#C82A2B] hover:underline uppercase tracking-wider transition-all cursor-pointer bg-transparent border-none outline-none"
        >
          + Register New Vendor
        </button>
      </div>
      
      {globalVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-150/50 max-h-56 overflow-y-auto shadow-inner">
          {globalVendors.map(v => {
            const isChecked = selectedIds.includes(String(v.id));
            return (
              <label 
                key={v.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all duration-250 active:scale-98 ${
                  isChecked 
                    ? 'bg-[#FFF1F1] border-[#C82A2B] text-[#9E1B1D] shadow-2xs' 
                    : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(v.id)}
                  className="rounded border-zinc-300 text-[#C82A2B] focus:ring-[#C82A2B]/25 accent-[#C82A2B] h-4 w-4 transition-all"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-black leading-tight">{v.name}</span>
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider mt-0.5">
                    {v.code}{v.contact_person ? ` · ${v.contact_person}` : ''}{v.phone ? ` · ${v.phone}` : ''}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-400 font-bold italic ml-1 bg-zinc-50 p-3 rounded-xl border border-zinc-150/30">
          No active vendors registered in the registry. Please register vendors first.
        </p>
      )}

      {/* Register Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => { if (!isSaving) setIsModalOpen(false); }}
          />
          
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.4)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300">
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Header */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" /><div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 flex justify-between items-center text-white border-b border-white/10">
                <div>
                  <h3 className="text-lg md:text-xl font-black tracking-tight text-white">Register New Supplier</h3>
                  <p className="text-[9px] text-zinc-300 font-black uppercase tracking-[0.2em] mt-0.5">
                    Add to Global Vendors Registry
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/10 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-900 ml-1">Vendor Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="Leave blank to auto-generate"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-11 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-zinc-900 uppercase"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-900 ml-1">Vendor Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Raymond Ltd"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      required
                      className="h-11 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-zinc-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-900 ml-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. Anil Sharma"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-11 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-zinc-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-900 ml-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-11 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold font-mono outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-zinc-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-900 ml-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. sales@raymond.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-11 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-zinc-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-900 ml-1">Address / Notes</label>
                    <input
                      type="text"
                      placeholder="Registered company address or notes..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-11 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-zinc-100 flex items-center justify-end gap-3 bg-zinc-50/50">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-5 h-11 rounded-xl font-black uppercase tracking-wider text-[10px] text-zinc-500 hover:text-zinc-700 bg-white border border-zinc-200 transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => handleRegisterVendor()}
                  disabled={isSaving}
                  className="px-6 h-11 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white font-black uppercase tracking-wider text-[10px] flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-[#C82A2B]/25 cursor-pointer disabled:opacity-40"
                >
                  {isSaving ? 'Registering...' : 'Register Vendor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CatalogManagerProps {
  type: 'fabrics' | 'buttons' | 'threads';
  title: string;
  subtitle: string;
}

export default function CatalogManager({ type, title, subtitle }: CatalogManagerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Item | null>(null);
  const [activeDetailImageIndex, setActiveDetailImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/inventory/${type}`);
      setItems(response.data);
    } catch (err) {
      toast.error(`Failed to load ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [type]);

  const handleSubmit = async (data: any) => {
    const loadingToast = toast.loading(editingItem ? 'Updating...' : 'Adding...');
    try {
      if (type === 'fabrics') {
        // Extract the first image from the images array if it exists
        data.image = data.images && data.images.length > 0 ? data.images[0] : null;
        data.name = formatFabricDisplayName(data);
      }
      if (editingItem) {
        await api.put(`/inventory/${type}/${editingItem.id}`, data);
        toast.success(`${title} updated`, { id: loadingToast });
      } else {
        await api.post(`/inventory/${type}`, data);
        toast.success(`${title} added`, { id: loadingToast });
      }
      setView('list');
      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.delete(`/inventory/${type}/${deleteConfirm.id}`);
      toast.success('Deleted successfully');
      setDeleteConfirm({ isOpen: false, id: null });
      fetchItems();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  // Fabrics filters state
  const [garmentCategoryFilter, setGarmentCategoryFilter] = useState<string>('ALL');
  const [brandTypeFilter, setBrandTypeFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [qualityFilter, setQualityFilter] = useState<string>('ALL');
  const [shadeFilter, setShadeFilter] = useState<string>('ALL');
  const [widthFilter, setWidthFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const uniqueGarmentCategories = useMemo(() => {
    const set = new Set<string>();
    ['BOTTOM', 'SHIRTING', 'SUITING'].forEach(c => set.add(c));
    items.forEach(i => {
      if (i.garment_category) set.add(i.garment_category);
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueBrandTypes = useMemo(() => {
    const set = new Set<string>();
    ['Branded', 'Semi-Branded', 'Non-Branded'].forEach(b => set.add(b));
    items.forEach(i => {
      if (i.brand_type) set.add(i.brand_type);
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueBrands = useMemo(() => {
    return (Array.from(new Set(items.map(i => i.brand_name).filter(Boolean))) as string[]).sort();
  }, [items]);

  const uniqueQualities = useMemo(() => {
    return (Array.from(new Set(items.map(i => i.quality).filter(Boolean))) as string[]).sort();
  }, [items]);

  const uniqueShades = useMemo(() => {
    return (Array.from(new Set(items.map(i => i.shade).filter(Boolean))) as string[]).sort();
  }, [items]);


  const uniqueWidths = useMemo(() => {
    return (Array.from(new Set(items.map(i => i.width).filter(Boolean))) as string[]).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    if (type !== 'fabrics') return items;
    return items.filter(item => {
      if (garmentCategoryFilter !== 'ALL' && (item.garment_category || '').toLowerCase() !== garmentCategoryFilter.toLowerCase()) {
        return false;
      }
      if (brandTypeFilter !== 'ALL' && (item.brand_type || '').toLowerCase() !== brandTypeFilter.toLowerCase()) {
        return false;
      }
      if (brandFilter !== 'ALL' && (item.brand_name || '').toLowerCase() !== brandFilter.toLowerCase()) {
        return false;
      }
      if (qualityFilter !== 'ALL' && (item.quality || '').toLowerCase() !== qualityFilter.toLowerCase()) {
        return false;
      }
      if (shadeFilter !== 'ALL' && (item.shade || '').toLowerCase() !== shadeFilter.toLowerCase()) {
        return false;
      }
      if (widthFilter !== 'ALL' && String(item.width || '') !== String(widthFilter)) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          (item.name || '').toLowerCase().includes(term) ||
          (item.code || '').toLowerCase().includes(term) ||
          (item.brand_name || '').toLowerCase().includes(term) ||
          (item.garment_category || '').toLowerCase().includes(term) ||
          (item.brand_type || '').toLowerCase().includes(term) ||
          (item.quality || '').toLowerCase().includes(term) ||
          (item.shade || '').toLowerCase().includes(term) ||
          (item.description || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, type, garmentCategoryFilter, brandTypeFilter, brandFilter, qualityFilter, shadeFilter, widthFilter, searchTerm]);

  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintFabrics = (sortedData?: Item[], sortInfo?: SortInfo<Item>) => {
    const dataToPrint = sortedData && sortedData.length > 0 ? sortedData : filteredItems;
    const rowsHtml = dataToPrint.map((item, idx) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 700;">${item.garment_category || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">${item.brand_type || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 700;">${item.name || '—'} ${item.shade ? `(${item.shade})` : ''}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.width ? `${item.width}"` : '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 700; font-family: monospace;">${item.quantity !== null && item.quantity !== undefined ? Number(item.quantity).toFixed(2) : '0.00'} m</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Fabric Catalog</title>
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
  <h1>Fabric Catalog</h1>
  <p>Generated on ${formatDate(new Date())} | Total Items: ${dataToPrint.length}${sortInfo?.headerLabel && sortInfo.headerLabel !== 'Default' ? ` | Sorted by: ${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending' : 'Descending'})` : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Garment Category</th>
        <th>Brand Type</th>
        <th>Item Name</th>
        <th style="text-align: center;">Width</th>
        <th style="text-align: right;">Quantity</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 20px;">No fabrics found</td></tr>'}
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

  const columns: Column<Item>[] = type === 'fabrics' ? [
    {
      header: 'Garment Category',
      accessor: (item: Item) => (
        <span className="px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-xl text-xs font-black text-amber-700 uppercase tracking-wider inline-block">
          {item.garment_category || '—'}
        </span>
      ),
      sortValue: (item) => item.garment_category || ''
    },
    {
      header: 'Brand Type',
      accessor: (item: Item) => (
        <span className="px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-xl text-xs font-black text-teal-700 uppercase tracking-wider inline-block">
          {item.brand_type || '—'}
        </span>
      ),
      sortValue: (item) => item.brand_type || ''
    },
    {
      header: 'Item Name',
      accessor: (item: Item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {(() => {
              const displayImg = item.image || parseImageGallery(item.images)[0];
              return displayImg ? (
                <img src={displayImg} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] text-zinc-300 font-bold uppercase">No Img</span>
              );
            })()}
          </div>
          <div>
            <p className="font-bold text-sm text-zinc-900">{formatFabricDisplayName(item)}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {item.brand_name && (
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  {item.brand_name} {item.quality ? `• ${item.quality}` : ''}
                </span>
              )}
              {item.shade && (
                <span className="text-[10px] font-bold text-[#2d8d9b] bg-[#2d8d9b]/10 px-1.5 py-0.5 rounded">
                  Shade: {item.shade}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
      sortValue: (item) => item.name
    },
    {
      header: 'Width',
      accessor: (item: Item) => (
        item.width
          ? <span className="px-2.5 py-1 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-xl text-xs font-black text-[#2d8d9b] font-mono">{item.width}&quot;</span>
          : <span className="text-xs italic text-zinc-350">—</span>
      ),
      sortValue: (item) => item.width || ''
    },
    {
      header: 'Quantity',
      accessor: (item: Item) => (
        <span className="px-2.5 py-1 bg-green-50 border border-green-100 rounded-xl text-xs font-black text-green-700 font-mono">
          {item.quantity !== null && item.quantity !== undefined ? Number(item.quantity).toFixed(2) : '0.00'} m
        </span>
      ),
      sortValue: (item) => item.quantity || 0
    },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setEditingItem(item);
              setView('edit');
            }}
            variant="secondary"
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
            title="Edit Item"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({ isOpen: true, id: item.id });
            }}
            variant="secondary"
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
            title="Delete Item"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
      className: 'w-28'
    }
  ] : [
    { 
      header: type === 'buttons' ? 'Button Number' : 'Thread Number', 
      accessor: 'code', 
      className: 'font-black text-[#2d8d9b]' 
    },
    { 
      header: type === 'buttons' ? 'Button Name' : 'Thread Name', 
      accessor: ((item: Item) => (
        <div>
          <p className="font-bold text-sm text-zinc-900">{item.name}</p>
          {item.description && (
            <p className="text-[10px] text-zinc-400 font-medium line-clamp-1 max-w-[200px]">{item.description}</p>
          )}
        </div>
      )) as any
    },
    ...(type === 'threads' ? [
      {
        header: 'Thread Type',
        accessor: ((item: Item) => (
          <span className="px-2.5 py-1 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-xl text-[11px] font-black text-[#2d8d9b]">
            {item.type || '—'}
          </span>
        )) as any
      },
      {
        header: 'Quantity',
        accessor: ((item: Item) => (
          <span className="px-2.5 py-1 bg-green-50 border border-green-100 rounded-xl text-[11px] font-black text-green-700 font-mono">
            {item.quantity !== null && item.quantity !== undefined ? Number(item.quantity).toFixed(0) : '0'} spools
          </span>
        )) as any
      },
      {
        header: 'Unit Price (₹)',
        accessor: ((item: Item) => (
          item.unit_price !== null && item.unit_price !== undefined
            ? <span className="px-2.5 py-1 bg-green-50 border border-green-100 rounded-xl text-[11px] font-black text-green-700 font-mono">₹{Number(item.unit_price).toFixed(2)}</span>
            : <span className="text-[10px] italic text-zinc-300">—</span>
        )) as any
      }
    ] : []),
    ...(type === 'buttons' ? [
      {
        header: 'Quantity',
        accessor: ((item: Item) => (
          <span className="px-2.5 py-1 bg-green-50 border border-green-100 rounded-xl text-[11px] font-black text-green-700 font-mono">
            {item.quantity !== null && item.quantity !== undefined ? Number(item.quantity).toFixed(0) : '0'} pieces
          </span>
        )) as any
      },
      {
        header: 'Unit Price (₹)',
        accessor: ((item: Item) => (
          item.unit_price !== null && item.unit_price !== undefined
            ? <span className="px-2.5 py-1 bg-green-50 border border-green-100 rounded-xl text-[11px] font-black text-green-700 font-mono">₹{Number(item.unit_price).toFixed(2)}</span>
            : <span className="text-[10px] italic text-zinc-300">—</span>
        )) as any
      }
    ] : []),
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setEditingItem(item);
              setView('edit');
            }}
            variant="secondary"
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({ isOpen: true, id: item.id });
            }}
            variant="secondary"
            className="!p-0 h-9 w-9 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm p-0 border-none cursor-pointer"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
      className: 'w-32',
    }
  ];

  if (view !== 'list') {
    return (
      <div className="space-y-6">
        <Button
          onClick={() => {
            setView('list');
            setEditingItem(null);
          }}
          variant="secondary"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-900 transition-colors bg-transparent border-none shadow-none px-0"
        >
          <ArrowLeft size={14} />
          Back to List
        </Button>

        <div className="max-w-2xl mx-auto">
          <DynamicForm
            title={editingItem ? `Edit ${title}` : `Add New ${title}`}
            fields={[
              { 
                name: 'code', 
                label: type === 'fabrics' 
                  ? 'Fabric Number (auto-generated)' 
                  : type === 'buttons' 
                    ? 'Button Number (auto-generated)' 
                    : 'Thread Number', 
                type: 'text', 
                required: type !== 'fabrics' && type !== 'buttons', 
                defaultValue: editingItem?.code, 
                readOnly: type === 'fabrics' || type === 'buttons',
                placeholder: (type === 'fabrics' || type === 'buttons') ? 'Auto-generating...' : undefined,
                allowSpecialCharacters: true 
              },
              { 
                name: 'name', 
                label: type === 'fabrics' 
                  ? 'Fabric Name' 
                  : type === 'buttons' 
                    ? 'Button Name' 
                    : 'Thread Name', 
                type: 'text', 
                required: true, 
                defaultValue: editingItem?.name 
              },
              ...(type === 'buttons' ? [
                {
                  name: 'description',
                  label: 'Specifications',
                  type: 'textarea' as const,
                  placeholder: 'Detailed specifications of the button',
                  defaultValue: editingItem?.description || ''
                },
                {
                  name: 'low_stock_threshold',
                  label: 'Low Stock Threshold',
                  type: 'number' as const,
                  step: 'any',
                  placeholder: 'e.g. 10',
                  defaultValue: editingItem?.low_stock_threshold !== null && editingItem?.low_stock_threshold !== undefined ? String(editingItem.low_stock_threshold) : ''
                },
                {
                  name: 'images',
                  label: 'Button Images',
                  type: 'image-upload' as const,
                  maxImages: 5,
                  uploadLabel: 'Upload Button Images',
                  defaultValue: editingItem?.images || []
                },
                {
                  name: 'vendors',
                  label: 'Button Supplying Vendors',
                  type: 'custom' as const,
                  className: 'md:col-span-2',
                  defaultValue: editingItem?.vendors || [],
                  render: (val: any, onChange: (v: any) => void) => (
                    <VendorChecklistInput
                      value={val || []}
                      onChange={onChange}
                    />
                  )
                }
              ] : []),
              ...(type === 'threads' ? [
                {
                  name: 'type',
                  label: 'Thread Type',
                  type: 'text' as const,
                  placeholder: 'e.g. Polyester, Cotton, Silk',
                  defaultValue: editingItem?.type || ''
                },
                {
                  name: 'description',
                  label: 'Specification',
                  type: 'textarea' as const,
                  placeholder: 'Detailed specifications of the thread',
                  defaultValue: editingItem?.description || ''
                },
                {
                  name: 'low_stock_threshold',
                  label: 'Low Stock Threshold',
                  type: 'number' as const,
                  step: 'any',
                  placeholder: 'e.g. 10',
                  defaultValue: editingItem?.low_stock_threshold !== null && editingItem?.low_stock_threshold !== undefined ? String(editingItem.low_stock_threshold) : ''
                },
                {
                  name: 'images',
                  label: 'Thread Images',
                  type: 'image-upload' as const,
                  maxImages: 5,
                  uploadLabel: 'Upload Thread Images',
                  defaultValue: editingItem?.images || []
                },
                {
                  name: 'vendors',
                  label: 'Thread Supplying Vendors',
                  type: 'custom' as const,
                  className: 'md:col-span-2',
                  defaultValue: editingItem?.vendors || [],
                  render: (val: any, onChange: (v: any) => void) => (
                    <VendorChecklistInput
                      value={val || []}
                      onChange={onChange}
                    />
                  )
                }
              ] : []),
              ...(type === 'fabrics' ? [
                { 
                  name: 'brand_name', 
                  label: 'Brand Name', 
                  type: 'text' as const, 
                  placeholder: 'e.g. Raymond, Arvind', 
                  defaultValue: editingItem?.brand_name || '' 
                },
                { 
                  name: 'garment_category', 
                  label: 'Garment Category', 
                  type: 'select' as const, 
                  options: [
                    { label: 'Select Category', value: '' },
                    { label: 'BOTTOM', value: 'BOTTOM' },
                    { label: 'SHIRTING', value: 'SHIRTING' },
                    { label: 'SUITING', value: 'SUITING' }
                  ], 
                  defaultValue: editingItem?.garment_category || '' 
                },
                { 
                  name: 'brand_type', 
                  label: 'Brand Type', 
                  type: 'select' as const, 
                  options: [
                    { label: 'Select Brand Type', value: '' },
                    { label: 'Branded', value: 'Branded' },
                    { label: 'Semi-Branded', value: 'Semi-Branded' },
                    { label: 'Non-Branded', value: 'Non-Branded' }
                  ], 
                  defaultValue: editingItem?.brand_type || '' 
                },
                {
                  name: 'quality',
                  label: 'Quality',
                  type: 'text' as const,
                  placeholder: 'e.g. Super 120s, Cotton Blend',
                  defaultValue: editingItem?.quality || ''
                },
                { 
                  name: 'description', 
                  label: 'Fabric Specification', 
                  type: 'textarea' as const, 
                  placeholder: 'Detailed specifications of the fabric', 
                  defaultValue: editingItem?.description || '' 
                },
                {
                  name: 'low_stock_threshold',
                  label: 'Low Stock Threshold (Optional)',
                  type: 'number' as const,
                  step: 'any',
                  placeholder: 'e.g. 10',
                  defaultValue: editingItem?.low_stock_threshold !== null && editingItem?.low_stock_threshold !== undefined ? String(editingItem.low_stock_threshold) : '',
                  required: false
                },
                { 
                  name: 'shade', 
                  label: 'Shade', 
                  type: 'text' as const, 
                  placeholder: 'e.g. Navy Blue, Charcoal Grey', 
                  defaultValue: editingItem?.shade || '' 
                },
                {
                  name: 'width', 
                  label: 'Width (inches)', 
                  type: 'select' as const, 
                  options: [
                    { label: 'Select Width', value: '' },
                    { label: '36"', value: '36' },
                    { label: '44"', value: '44' },
                    { label: '58"', value: '58' }
                  ], 
                  defaultValue: editingItem?.width || ''
                },
                {
                  name: 'latest_sam',
                  label: 'Latest SAM',
                  type: 'number' as const,
                  step: 'any',
                  readOnly: true,
                  placeholder: 'Auto-updated from quotations',
                  defaultValue: editingItem?.latest_sam !== null && editingItem?.latest_sam !== undefined ? String(editingItem.latest_sam) : '0'
                },
                {
                  name: 'images',
                  label: 'Fabric Images',
                  type: 'image-upload' as const,
                  maxImages: 5,
                  uploadLabel: 'Upload Fabric Images',
                  defaultValue: editingItem?.images || (editingItem?.image ? [editingItem.image] : [])
                },
                {
                  name: 'vendors',
                  label: 'Fabric Supplying Vendors',
                  type: 'custom' as const,
                  className: 'md:col-span-2',
                  defaultValue: editingItem?.vendors || [],
                  render: (val: any, onChange: (v: any) => void) => (
                    <VendorChecklistInput
                      value={val || []}
                      onChange={onChange}
                    />
                  )
                }
              ] : [])
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Page Header - Matching Readymades Standard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">{title}</h1>
            <span className="px-3 py-1 bg-[#FFF1F1] border border-[#C82A2B]/20 text-[#9E1B1D] rounded-full text-[10px] font-black uppercase tracking-wider">
              {type === 'fabrics' ? 'Material Grade & Coding' : 'Specification Hub'}
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mt-1">
            {type === 'fabrics' ? 'Fabric Specification Hub & Vendor Registry' : subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => {
              setEditingItem(null);
              setView('add');
            }}
            className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={3} />
            Add {type === 'fabrics' ? 'Fabric' : title.replace(/Catalog/i, '').trim() || 'Item'}
          </Button>
          {type === 'fabrics' && (
            <PageActionsMenu
              onPrint={() => {
                if (printTriggerRef.current) {
                  printTriggerRef.current();
                } else {
                  handlePrintFabrics(filteredItems);
                }
              }}
              printLabel="Print Fabrics"
              onUserReport={() => userReportTriggerRef.current?.()}
              userReportLabel="My Report"
            />
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        searchPlaceholder={type === 'fabrics' ? 'Search' : 'Search...'}
        onSearch={type === 'fabrics' ? setSearchTerm : undefined}
        onPrint={type === 'fabrics' ? handlePrintFabrics : undefined}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        onRowClick={(item) => {
          setSelectedItemForDetails(item);
          setActiveDetailImageIndex(0);
        }}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {type === 'fabrics' && (
              <>
                {/* Garment Category Filter */}
                <FilterDropdown
                  label="Garment Category"
                  allLabel="All Garment Categories"
                  value={garmentCategoryFilter}
                  onChange={setGarmentCategoryFilter}
                  options={uniqueGarmentCategories}
                  maxWidth="max-w-[210px]"
                />

                {/* Brand Type Filter */}
                <FilterDropdown
                  label="Brand Type"
                  allLabel="All Brand Types"
                  value={brandTypeFilter}
                  onChange={setBrandTypeFilter}
                  options={uniqueBrandTypes}
                  maxWidth="max-w-[190px]"
                />

                {/* Brand Filter */}
                <FilterDropdown
                  label="Brand"
                  allLabel="All Brands"
                  value={brandFilter}
                  onChange={setBrandFilter}
                  options={uniqueBrands}
                  maxWidth="max-w-[190px]"
                />

                {/* Quality Name Filter */}
                <FilterDropdown
                  label="Quality Name"
                  allLabel="All Quality Names"
                  value={qualityFilter}
                  onChange={setQualityFilter}
                  options={uniqueQualities}
                  maxWidth="max-w-[190px]"
                />

                {/* Shade Filter */}
                <FilterDropdown
                  label="Shade"
                  allLabel="All Shades"
                  value={shadeFilter}
                  onChange={setShadeFilter}
                  options={uniqueShades}
                  maxWidth="max-w-[180px]"
                />

                {/* Width Filter */}
                <FilterDropdown
                  label="Width"
                  allLabel="All Widths"
                  value={widthFilter}
                  onChange={setWidthFilter}
                  options={uniqueWidths.map(w => ({ label: `${w}"`, value: w }))}
                  maxWidth="max-w-[160px]"
                />

                {/* Reset Filters button if any filter is active */}
                {(garmentCategoryFilter !== 'ALL' || brandTypeFilter !== 'ALL' || brandFilter !== 'ALL' || qualityFilter !== 'ALL' || shadeFilter !== 'ALL' || widthFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setGarmentCategoryFilter('ALL');
                      setBrandTypeFilter('ALL');
                      setBrandFilter('ALL');
                      setQualityFilter('ALL');
                      setShadeFilter('ALL');
                      setWidthFilter('ALL');
                    }}
                    className="h-10 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Clear all active filters"
                  >
                    Reset
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Fabric / Item Details Modal */}
      {selectedItemForDetails && (() => {
        // Collect all images safely
        const fabricImages = (() => {
          const list = parseImageGallery(selectedItemForDetails.images);
          if (selectedItemForDetails.image && typeof selectedItemForDetails.image === 'string' && selectedItemForDetails.image.trim()) {
            const single = selectedItemForDetails.image.trim();
            if (!list.includes(single)) {
              list.unshift(single);
            }
          }
          return list;
        })();

        const currentActiveImg = fabricImages[activeDetailImageIndex] || fabricImages[0];
        const isFabric = type === 'fabrics';
        const displayName = isFabric ? formatFabricDisplayName(selectedItemForDetails) : selectedItemForDetails.name;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
            onClick={() => setSelectedItemForDetails(null)}
          >
            <div
              className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedItemForDetails.code && (
                      <span className="px-3 py-1 bg-zinc-900 text-white rounded-xl text-xs font-black font-mono flex items-center gap-1.5 shadow-xs">
                        <Tag size={12} className="text-zinc-400" />
                        {selectedItemForDetails.code}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedItemForDetails.code);
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
                    {selectedItemForDetails.garment_category && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {selectedItemForDetails.garment_category}
                      </span>
                    )}
                    {selectedItemForDetails.brand_type && (
                      <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {selectedItemForDetails.brand_type}
                      </span>
                    )}
                    {selectedItemForDetails.brand_name && (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {selectedItemForDetails.brand_name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                    {displayName}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedItemForDetails;
                      setSelectedItemForDetails(null);
                      setEditingItem(item);
                      setView('edit');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#C82A2B] hover:bg-[#9E1B1D] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Edit2 size={13} />
                    Edit {isFabric ? 'Fabric' : 'Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItemForDetails(null)}
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
                            alt={displayName}
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
                          {fabricImages.length > 1 && (
                            <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-xs">
                              {activeDetailImageIndex + 1} / {fabricImages.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-2">
                            <Box size={32} />
                          </div>
                          <p className="text-xs font-bold text-zinc-600">No Image Available</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Edit this item to upload swatch or article photos</p>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    {fabricImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {fabricImages.map((imgUrl, idx) => (
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
                      {isFabric ? (
                        <>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Garment Category</span>
                            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedItemForDetails.garment_category || '—'}</span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Brand Type</span>
                            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedItemForDetails.brand_type || '—'}</span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Brand Name</span>
                            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedItemForDetails.brand_name || '—'}</span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Quality Name</span>
                            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedItemForDetails.quality || '—'}</span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Shade</span>
                            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedItemForDetails.shade || '—'}</span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Fabric Width</span>
                            <span className="text-sm font-black text-[#2d8d9b] font-mono mt-0.5 block">
                              {selectedItemForDetails.width ? `${selectedItemForDetails.width}"` : '—'}
                            </span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Current Stock</span>
                            <span className="text-sm font-black text-emerald-600 font-mono mt-0.5 block">
                              {selectedItemForDetails.quantity !== null && selectedItemForDetails.quantity !== undefined
                                ? `${Number(selectedItemForDetails.quantity).toFixed(2)} meters`
                                : '0.00 meters'}
                            </span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Latest SAM</span>
                            <span className="text-sm font-bold text-zinc-900 font-mono mt-0.5 block">
                              {selectedItemForDetails.latest_sam ? `${selectedItemForDetails.latest_sam}` : '—'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Item Code</span>
                            <span className="text-sm font-bold text-zinc-900 font-mono mt-0.5 block">{selectedItemForDetails.code || '—'}</span>
                          </div>
                          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Current Stock</span>
                            <span className="text-sm font-black text-emerald-600 font-mono mt-0.5 block">
                              {selectedItemForDetails.quantity ?? 0} {type === 'threads' ? 'spools' : 'pieces'}
                            </span>
                          </div>
                          {selectedItemForDetails.type && (
                            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Type</span>
                              <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedItemForDetails.type}</span>
                            </div>
                          )}
                          {selectedItemForDetails.unit_price !== null && selectedItemForDetails.unit_price !== undefined && (
                            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Unit Price</span>
                              <span className="text-sm font-black text-zinc-900 font-mono mt-0.5 block">₹{Number(selectedItemForDetails.unit_price).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Description */}
                    {selectedItemForDetails.description && (
                      <div className="p-4 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 space-y-1.5">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9E1B1D] flex items-center gap-1.5">
                          <FileText size={13} className="text-[#C82A2B]" />
                          Description & Notes
                        </h4>
                        <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                          {selectedItemForDetails.description}
                        </p>
                      </div>
                    )}

                    {/* Vendors & Suppliers */}
                    {selectedItemForDetails.vendors && Array.isArray(selectedItemForDetails.vendors) && selectedItemForDetails.vendors.length > 0 && (
                      <div className="p-4 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 flex items-center gap-1.5">
                          <Building2 size={13} className="text-zinc-500" />
                          Associated Vendors ({selectedItemForDetails.vendors.length})
                        </h4>
                        <div className="divide-y divide-zinc-200/60 border border-zinc-200/60 rounded-xl overflow-hidden bg-white">
                          {selectedItemForDetails.vendors.map((v: any, idx: number) => (
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
                  onClick={() => setSelectedItemForDetails(null)}
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
        images={(() => {
          if (!selectedItemForDetails) return [];
          const list = parseImageGallery(selectedItemForDetails.images);
          if (selectedItemForDetails.image && typeof selectedItemForDetails.image === 'string' && selectedItemForDetails.image.trim()) {
            const single = selectedItemForDetails.image.trim();
            if (!list.includes(single)) {
              list.unshift(single);
            }
          }
          return list;
        })()}
        initialIndex={activeDetailImageIndex}
        title={selectedItemForDetails ? (type === 'fabrics' ? formatFabricDisplayName(selectedItemForDetails) : selectedItemForDetails.name) : ''}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${title}?`}
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        variant="danger"
      />
    </div>
  );
}
