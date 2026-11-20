'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Plus, Trash2, Edit2, ArrowRight, Scissors, UserCheck, Palette,
  Hash, Sparkles, RefreshCw, Eye, Tag, ListPlus, X, Check, FolderTree
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';

interface ItemSpecification {
  id: number;
  item_id: number;
  code: string;
  name: string;
  description?: string;
  display_order?: number;
  created_at?: string;
}

interface Item {
  id: number;
  code: string;
  name: string;
  description?: string;
  product_type_id?: number;
  product_types?: { id: number; name: string };
  art_item_specifications?: ItemSpecification[];
  created_at?: string;
}

interface Gender {
  id: number;
  code: string;
  name: string;
  created_at?: string;
}

interface Pattern {
  id: number;
  code: string;
  name: string;
  created_at?: string;
}

interface Fit {
  id: number;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
}

interface ArtNumber {
  id: number;
  item_id?: number;
  specification_id?: number;
  dress_id?: number;
  gender_id: number;
  pattern_id: number;
  fit_id?: number;
  code: string;
  allowance?: string;
  base_size?: string;
  fit?: string;
  created_at?: string;
  art_items?: { id: number; code: string; name: string };
  art_item_specifications?: { id: number; code: string; name: string };
  art_dresses?: { code: string; name: string };
  art_genders?: { code: string; name: string };
  art_patterns?: { code: string; name: string };
  art_fits?: { code: string; name: string };
}

type TabType = 'registry' | 'items' | 'genders' | 'patterns' | 'fits';

export default function ArtNumberHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<{ type: TabType | 'spec'; id: number; code: string; itemId?: number } | null>(null);

  // Core Data States
  const [items, setItems] = useState<Item[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [fits, setFits] = useState<Fit[]>([]);
  const [artNumbers, setArtNumbers] = useState<ArtNumber[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);

  // Editing States
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Field States (Items, Genders, Patterns, Fits)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');

  // Compound Generator Field States
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [selectedGenderId, setSelectedGenderId] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [selectedFitId, setSelectedFitId] = useState('');
  const [allowance, setAllowance] = useState('2');
  const [baseSize, setBaseSize] = useState('');
  const [fit, setFit] = useState('Regular Fit');

  // Specification Sub-Modal Manager
  const [specModalItem, setSpecModalItem] = useState<Item | null>(null);
  const [specCode, setSpecCode] = useState('');
  const [specName, setSpecName] = useState('');
  const [specDesc, setSpecDesc] = useState('');
  const [editingSpecId, setEditingSpecId] = useState<number | null>(null);
  const [isSavingSpec, setIsSavingSpec] = useState(false);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, gendersRes, patternsRes, fitsRes, artNumbersRes, typesRes] = await Promise.all([
        api.get('/art-number-hub/items'),
        api.get('/art-number-hub/genders'),
        api.get('/art-number-hub/patterns'),
        api.get('/art-number-hub/fits'),
        api.get('/art-number-hub/art-numbers'),
        api.get('/product-types').catch(() => ({ data: [] }))
      ]);

      setItems((itemsRes.data || []).map((it: any) => ({
        ...it,
        search_uid: `ITM-${it.id}`,
        search_string: `${it.code} ${it.name} ${it.art_item_specifications?.map((s: any) => `${s.code} ${s.name}`).join(' ') || ''} ITM-${it.id}`.toLowerCase()
      })));

      setGenders((gendersRes.data || []).map((g: any) => ({
        ...g,
        search_uid: `GND-${g.id}`,
        search_string: `${g.code} ${g.name} GND-${g.id}`.toLowerCase()
      })));

      setPatterns((patternsRes.data || []).map((p: any) => ({
        ...p,
        search_uid: `PAT-${p.id}`,
        search_string: `${p.code} ${p.name} PAT-${p.id}`.toLowerCase()
      })));

      setFits((fitsRes.data || []).map((f: any) => ({
        ...f,
        search_uid: `FIT-${f.id}`,
        search_string: `${f.code} ${f.name} FIT-${f.id}`.toLowerCase()
      })));

      setArtNumbers((artNumbersRes.data || []).map((an: any) => ({
        ...an,
        search_uid: `ART-${an.id}`,
        search_string: `${an.code} ${an.art_items?.name || an.art_dresses?.name || ''} ${an.art_item_specifications?.name || ''} ${an.art_genders?.name || ''} ${an.art_patterns?.name || ''} ${an.art_fits?.name || an.fit || ''} ${an.base_size || ''} ART-${an.id}`.toLowerCase()
      })));

      setProductTypes(typesRes.data || []);
    } catch (err) {
      toast.error('Failed to load Art Number Hub datasets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setCode('');
    setName('');
    setDescription('');
    setSelectedProductTypeId('');
    setSelectedItemId('');
    setSelectedSpecId('');
    setSelectedGenderId('');
    setSelectedPatternId('');
    setSelectedFitId('');
    setAllowance('2');
    setBaseSize('');
    setFit('Regular Fit');
  };

  // Live Generator dynamic calculation (New Standard: [item][specification]-[gender][pattern-code]-[fit][allowance] e.g. 1A-3053-R2)
  const getLivePreviewCode = () => {
    if (!selectedItemId || !selectedGenderId || !selectedPatternId) return '---';
    const activeItem = items.find(it => String(it.id) === selectedItemId);
    const activeGender = genders.find(g => String(g.id) === selectedGenderId);
    const activePattern = patterns.find(p => String(p.id) === selectedPatternId);
    const activeFit = fits.find(f => String(f.id) === selectedFitId);

    if (!activeItem || !activeGender || !activePattern) return '---';

    // Specification code (e.g. 'A')
    let specCode = '';
    if (selectedSpecId) {
      const activeSpec = (activeItem.art_item_specifications || []).find(s => String(s.id) === selectedSpecId);
      if (activeSpec) specCode = activeSpec.code;
    }

    const fitCode = activeFit ? activeFit.code : (fit ? fit.trim().slice(0, 1).toUpperCase() : 'R');
    const patCode = String(activePattern.code).padStart(3, '0');
    const cleanAllowance = allowance && allowance.trim() ? allowance.trim() : '';

    return `${activeItem.code}${specCode}-${activeGender.code}${patCode}-${fitCode}${cleanAllowance}`;
  };

  const handleCreateOrUpdate = async () => {
    // 1. COMPOUND CODE REGISTRY
    if (activeTab === 'registry') {
      if (!selectedItemId || !selectedGenderId || !selectedPatternId) {
        toast.error('Please select Item, Gender Code, and Pattern Code');
        return;
      }

      const activeFit = fits.find(f => String(f.id) === selectedFitId);
      const payload = {
        item_id: Number(selectedItemId),
        specification_id: selectedSpecId ? Number(selectedSpecId) : null,
        gender_id: Number(selectedGenderId),
        pattern_id: Number(selectedPatternId),
        fit_id: selectedFitId ? Number(selectedFitId) : undefined,
        allowance: allowance.trim() || null,
        base_size: baseSize.trim() || null,
        fit: activeFit ? activeFit.name : (fit || 'Regular Fit')
      };

      const loadingToast = toast.loading('Registering combined Art Number...');
      try {
        await api.post('/art-number-hub/art-numbers', payload);
        toast.success('Art Number registered successfully!', { id: loadingToast });
        handleCancel();
        fetchAllData();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Registration failed', { id: loadingToast });
      }
      return;
    }

    // 2. MASTER REGISTRIES (Item, Gender, Pattern, Fit)
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode || !trimmedName) {
      toast.error('Code and Name are both required');
      return;
    }

    if (activeTab === 'items') {
      if (!/^[a-zA-Z0-9\-]+$/.test(trimmedCode)) {
        toast.error('Item Code can only contain alphanumeric characters and hyphens');
        return;
      }
      if (trimmedCode.length > 10) {
        toast.error('Item Code must be 10 characters or less');
        return;
      }
    } else {
      if (!/^[a-zA-Z0-9]+$/.test(trimmedCode)) {
        toast.error('Code must be purely alphanumeric (no spaces or special characters)');
        return;
      }
      if (trimmedCode.length > 10) {
        toast.error('Code must be 10 characters or less');
        return;
      }
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      toast.error('Name must be between 2 and 50 characters');
      return;
    }

    const payload: any = { code: trimmedCode, name: trimmedName };
    if (activeTab === 'items') {
      payload.description = description.trim() || null;
      payload.product_type_id = selectedProductTypeId ? Number(selectedProductTypeId) : null;
    }

    const labelSingular = activeTab === 'items' ? 'Item' : activeTab === 'genders' ? 'Gender Code' : activeTab === 'fits' ? 'Fit Code' : 'Pattern Code';
    const endpoint = `/art-number-hub/${activeTab}`;
    const isEditing = editingId !== null;

    const loadingToast = toast.loading(isEditing ? `Updating ${labelSingular}...` : `Registering ${labelSingular}...`);

    try {
      if (isEditing) {
        await api.put(`${endpoint}/${editingId}`, payload);
        toast.success(`${labelSingular} updated successfully!`, { id: loadingToast });
      } else {
        await api.post(endpoint, payload);
        toast.success(`New ${labelSingular} registered!`, { id: loadingToast });
      }
      handleCancel();
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const startEdit = (entity: any) => {
    setEditingId(entity.id);
    setCode(entity.code);
    setName(entity.name);
    setDescription(entity.description || '');
    if (entity.product_type_id) setSelectedProductTypeId(String(entity.product_type_id));
    setIsAdding(true);
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    const { type, id } = deleteCandidate;

    try {
      if (type === 'spec') {
        await api.delete(`/art-number-hub/specifications/${id}`);
        toast.success('Specification removed');
        if (specModalItem) {
          const updatedSpecs = (specModalItem.art_item_specifications || []).filter(s => s.id !== id);
          setSpecModalItem({ ...specModalItem, art_item_specifications: updatedSpecs });
        }
      } else {
        const endpoint = `/art-number-hub/${type === 'registry' ? 'art-numbers' : type}/${id}`;
        await api.delete(endpoint);
        toast.success(`${type === 'registry' ? 'Art Number combination' : 'Item'} successfully deleted`);
      }
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Unable to delete. It might be referenced by products or configurations.');
    } finally {
      setDeleteCandidate(null);
    }
  };

  // --- Specifications Modal Handlers ---
  const handleOpenSpecModal = (item: Item) => {
    setSpecModalItem(item);
    setSpecCode('');
    setSpecName('');
    setSpecDesc('');
    setEditingSpecId(null);
  };

  const handleSaveSpecification = async () => {
    if (!specModalItem) return;
    const cleanCode = specCode.trim().toUpperCase();
    const cleanName = specName.trim();

    if (!cleanCode || !cleanName) {
      toast.error('Specification Code (e.g. A) and Name (e.g. Half Sleeve) are required');
      return;
    }

    if (cleanCode.length > 5) {
      toast.error('Specification Code should be 1-2 characters (e.g. A, B, C)');
      return;
    }

    setIsSavingSpec(true);
    const loadingToast = toast.loading(editingSpecId ? 'Updating specification...' : 'Adding specification...');
    try {
      const payload = {
        item_id: specModalItem.id,
        code: cleanCode,
        name: cleanName,
        description: specDesc.trim() || null
      };

      if (editingSpecId) {
        await api.put(`/art-number-hub/specifications/${editingSpecId}`, payload);
        toast.success('Specification updated!', { id: loadingToast });
      } else {
        await api.post(`/art-number-hub/items/${specModalItem.id}/specifications`, payload);
        toast.success('Specification added!', { id: loadingToast });
      }

      setSpecCode('');
      setSpecName('');
      setSpecDesc('');
      setEditingSpecId(null);

      // Refresh items
      const res = await api.get('/art-number-hub/items');
      const updatedItems = res.data || [];
      setItems(updatedItems);
      const refreshedItem = updatedItems.find((it: Item) => it.id === specModalItem.id);
      if (refreshedItem) setSpecModalItem(refreshedItem);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save specification', { id: loadingToast });
    } finally {
      setIsSavingSpec(false);
    }
  };

  // --- Columns Definitions ---
  const itemColumns: Column<Item>[] = [
    {
      header: 'Item Code',
      accessor: (it) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm font-black text-lg">
            {it.code}
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{it.name}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: ITM-{it.id}</p>
          </div>
        </div>
      )
    },

    {
      header: 'Item Specifications',
      accessor: (it) => {
        const specs = it.art_item_specifications || [];
        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
            {specs.length > 0 ? (
              specs.map(s => (
                <span
                  key={s.id}
                  className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                  title={s.description || s.name}
                >
                  <strong className="font-black text-amber-700 bg-amber-200/60 px-1 rounded text-[10px]">{s.code}</strong>
                  {s.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-400 italic">No specifications added</span>
            )}
            <button
              onClick={() => handleOpenSpecModal(it)}
              className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded-lg text-[11px] font-black border border-teal-200 transition-all cursor-pointer flex items-center gap-1 ml-1"
            >
              <ListPlus size={13} />
              Manage Specs ({specs.length})
            </button>
          </div>
        );
      }
    },
    {
      header: 'Registered',
      accessor: (it) => (
        <p className="text-xs font-bold text-zinc-500">
          {formatDate(it.created_at)}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (it) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenSpecModal(it)}
            className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center border border-amber-200 cursor-pointer"
            title="Manage Item Specifications"
          >
            <ListPlus size={16} />
          </button>
          <button
            onClick={() => startEdit(it)}
            className="w-9 h-9 rounded-xl bg-[#FFF1F1] text-[#9E1B1D] hover:bg-[#C82A2B] hover:text-white transition-all flex items-center justify-center border border-[#C82A2B]/20 cursor-pointer"
            title="Edit Item"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => setDeleteCandidate({ type: 'items', id: it.id, code: it.code })}
            className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 cursor-pointer"
            title="Delete Item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  const genderColumns: Column<Gender>[] = [
    {
      header: 'Gender Code',
      accessor: (g) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm font-black text-lg">
            {g.code}
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{g.name}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: GND-{g.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Gender Description',
      accessor: (g) => <span className="text-sm font-bold text-[#3a525d]">{g.name}</span>
    },
    {
      header: 'Registered',
      accessor: (g) => (
        <p className="text-xs font-bold text-zinc-500">
          {formatDate(g.created_at)}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (g) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => startEdit(g)}
            className="w-10 h-10 rounded-xl bg-[#FFF1F1] text-[#9E1B1D] hover:bg-[#C82A2B] hover:text-white transition-all flex items-center justify-center border border-[#C82A2B]/20 cursor-pointer"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeleteCandidate({ type: 'genders', id: g.id, code: g.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const patternColumns: Column<Pattern>[] = [
    {
      header: 'Pattern Code',
      accessor: (p) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
            <Palette size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{p.code}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: PAT-{p.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Pattern Name',
      accessor: (p) => <span className="text-sm font-bold text-[#3a525d]">{p.name}</span>
    },
    {
      header: 'Registered',
      accessor: (p) => (
        <p className="text-xs font-bold text-zinc-500">
          {formatDate(p.created_at)}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (p) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => startEdit(p)}
            className="w-10 h-10 rounded-xl bg-[#FFF1F1] text-[#9E1B1D] hover:bg-[#C82A2B] hover:text-white transition-all flex items-center justify-center border border-[#C82A2B]/20 cursor-pointer"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeleteCandidate({ type: 'patterns', id: p.id, code: p.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const fitColumns: Column<Fit>[] = [
    {
      header: 'Fit Code',
      accessor: (f) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{f.code}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: FIT-{f.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Fit Name / Description',
      accessor: (f) => (
        <div>
          <span className="text-sm font-bold text-[#3a525d]">{f.name}</span>
          {f.description && <p className="text-xs text-zinc-400 mt-0.5">{f.description}</p>}
        </div>
      )
    },
    {
      header: 'Registered',
      accessor: (f) => (
        <p className="text-xs font-bold text-zinc-500">
          {formatDate(f.created_at)}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (f) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => startEdit(f)}
            className="w-10 h-10 rounded-xl bg-[#FFF1F1] text-[#9E1B1D] hover:bg-[#C82A2B] hover:text-white transition-all flex items-center justify-center border border-[#C82A2B]/20 cursor-pointer"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeleteCandidate({ type: 'fits', id: f.id, code: f.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const registryColumns: Column<ArtNumber>[] = [
    {
      header: 'Generated Art Number',
      className: 'whitespace-nowrap',
      accessor: (an) => (
        <div className="flex flex-col whitespace-nowrap">
          <span className="px-3.5 py-1.5 bg-zinc-900 text-teal-400 rounded-full font-black text-sm tracking-widest border border-zinc-800 whitespace-nowrap w-fit font-mono shadow-sm">
            {an.code}
          </span>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1 ml-1 whitespace-nowrap">UID: ART-{an.id}</p>
        </div>
      )
    },
    {
      header: 'Product Format (Item Spec Gender)',
      accessor: (an) => {
        const itemObj = an.art_items || an.art_dresses;
        const specObj = an.art_item_specifications;
        const genderObj = an.art_genders;

        const rawItemName = itemObj?.name || '';
        const cleanItemName = rawItemName ? (rawItemName.charAt(0).toUpperCase() + rawItemName.slice(1).toLowerCase()) : '';
        const specName = specObj?.name || '';
        const genderName = genderObj?.name || '';

        const fullTitle = [cleanItemName, specName, genderName].filter(Boolean).join(' ');
        return (
          <div className="flex flex-col">
            <span className="font-black text-sm text-zinc-900 tracking-tight">{fullTitle || '—'}</span>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Item · Specification · Gender</span>
          </div>
        );
      }
    },
    {
      header: 'Component Breakdown',
      accessor: (an) => {
        const itemObj = an.art_items || an.art_dresses;
        const specObj = an.art_item_specifications;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-100 rounded text-[10px] font-bold text-[#3a525d]">
              Item: <strong className="font-black text-teal-700">{itemObj?.code || '—'}</strong> ({itemObj?.name || '—'})
            </span>
            {specObj && (
              <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-[#3a525d]">
                Spec: <strong className="font-black text-amber-700">[{specObj.code}]</strong> {specObj.name}
              </span>
            )}
            <span className="px-2.5 py-0.5 bg-[#8b6b5a]/10 border border-[#8b6b5a]/10 rounded text-[10px] font-bold text-[#3a525d]">
              Gender: <strong className="font-black text-[#8b6b5a]">{an.art_genders?.code || '—'}</strong> ({an.art_genders?.name || '—'})
            </span>
            <span className="px-2.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-[10px] font-bold text-[#3a525d]">
              Pattern: <strong className="font-black text-zinc-700">{an.art_patterns?.code || '—'}</strong> ({an.art_patterns?.name || '—'})
            </span>
            <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-100 rounded text-[10px] font-bold text-[#3a525d]">
              Fit: <strong className="font-black text-purple-700">{an.art_fits?.code || (an.fit ? an.fit.slice(0, 1).toUpperCase() : 'R')}</strong>
              {an.allowance ? ` (+${an.allowance}")` : ''}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Base Size',
      accessor: (an) => (
        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-black text-amber-700 font-mono">
          {an.base_size || '—'}
        </span>
      )
    },
    {
      header: 'Fit & Allowance',
      accessor: (an) => (
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border bg-blue-50 text-blue-700 border-blue-100">
          {an.art_fits ? `[${an.art_fits.code}] ${an.art_fits.name}` : (an.fit || 'Regular Fit')}
          {an.allowance ? ` • ${an.allowance}" allowance` : ''}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: (an) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDeleteCandidate({ type: 'registry', id: an.id, code: an.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const getTabLabelSingular = () => {
    switch (activeTab) {
      case 'items': return 'Item';
      case 'genders': return 'Gender Code';
      case 'patterns': return 'Pattern Code';
      case 'fits': return 'Fit Code';
      case 'registry': return 'Combined Art Number';
    }
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'items': return items;
      case 'genders': return genders;
      case 'patterns': return patterns;
      case 'fits': return fits;
      case 'registry': return artNumbers;
    }
  };

  const getActiveColumns = () => {
    switch (activeTab) {
      case 'items': return itemColumns;
      case 'genders': return genderColumns;
      case 'patterns': return patternColumns;
      case 'fits': return fitColumns;
      case 'registry': return registryColumns;
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'items': return 'Search by Item Code, Name, or Specification (e.g. 1, Shirt, Half Sleeve)...';
      case 'genders': return 'Search by Gender Code or Description...';
      case 'patterns': return 'Search by Pattern Code or Name...';
      case 'fits': return 'Search by Fit Code (S, R, L) or Name...';
      case 'registry': return 'Search combined Art Numbers (e.g. 1A-3053-R2)...';
    }
  };

  // Find specifications for the selected item in the Generator
  const currentSelectedItem = items.find(it => String(it.id) === selectedItemId);
  const currentItemSpecs = currentSelectedItem?.art_item_specifications || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Art Number Hub</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600 mt-1 opacity-80">
            Standard Format: [item][specification]-[gender][pattern-code]-[fit][allowance] (e.g. 1A-3053-R2)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="h-auto"
            onClick={fetchAllData}
            disabled={isLoading}
            className="w-14 h-14 rounded-[1.25rem] p-0 flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin text-teal-600' : 'text-teal-600'} />
          </Button>

          {!isAdding ? (
            <Button
              onClick={() => setIsAdding(true)}
              size="h-auto"
              className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={3} />
              Register {getTabLabelSingular()}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="h-auto"
              onClick={handleCancel}
              className="h-14 px-8 rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] cursor-pointer"
            >
              Cancel Entry
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Menu Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-zinc-100 p-2.5 rounded-[1.8rem] border border-zinc-200/50 shadow-inner">
        <Button
          onClick={() => { setActiveTab('registry'); handleCancel(); }}
          variant="secondary"
          size="h-auto"
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 h-auto border-none ${activeTab === 'registry'
            ? 'bg-zinc-900 text-teal-400 shadow-xl border border-zinc-800 scale-[1.02]'
            : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600 bg-transparent shadow-none'
            }`}
        >
          <Hash size={16} />
          Art Number Registry
        </Button>

        <Button
          onClick={() => { setActiveTab('items'); handleCancel(); }}
          variant="secondary"
          size="h-auto"
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 h-auto border-none ${activeTab === 'items'
            ? 'bg-white text-teal-600 shadow-md scale-[1.02] border border-zinc-200/40'
            : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600 bg-transparent shadow-none'
            }`}
        >
          <Scissors size={16} />
          Items & Specs
        </Button>

        <Button
          onClick={() => { setActiveTab('genders'); handleCancel(); }}
          variant="secondary"
          size="h-auto"
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 h-auto border-none ${activeTab === 'genders'
            ? 'bg-white text-teal-600 shadow-md scale-[1.02] border border-zinc-200/40'
            : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600 bg-transparent shadow-none'
            }`}
        >
          <UserCheck size={16} />
          Gender Codes
        </Button>

        <Button
          onClick={() => { setActiveTab('patterns'); handleCancel(); }}
          variant="secondary"
          size="h-auto"
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 h-auto border-none ${activeTab === 'patterns'
            ? 'bg-white text-teal-600 shadow-md scale-[1.02] border border-zinc-200/40'
            : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600 bg-transparent shadow-none'
            }`}
        >
          <Palette size={16} />
          Pattern Codes
        </Button>

        <Button
          onClick={() => { setActiveTab('fits'); handleCancel(); }}
          variant="secondary"
          size="h-auto"
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 h-auto border-none ${activeTab === 'fits'
            ? 'bg-white text-purple-600 shadow-md scale-[1.02] border border-zinc-200/40'
            : 'text-[#3a525d] hover:bg-white/60 hover:text-purple-600 bg-transparent shadow-none'
            }`}
        >
          <Sparkles size={16} />
          Fits Master
        </Button>
      </div>

      {/* Adding / Registering Form View */}
      {isAdding && (
        <div className="max-w-4xl mx-auto">
          {activeTab === 'registry' ? (
            /* Compound Generator Registry Form */
            <Card className="p-8 border border-zinc-200 shadow-2xl rounded-[3rem] bg-white animate-in slide-in-from-top-10 duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                  <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/20">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">Art Number Generator</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#9E1B1D] opacity-80">
                      Standard: [item][spec]-[gender][pattern]-[fit][allowance] (e.g. 1A-3053-R2)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Item Dropdown */}
                  <div className="space-y-2">
                    <Select
                      label="Item (e.g. 1: Shirt)"
                      value={selectedItemId}
                      onChange={(val) => {
                        setSelectedItemId(val);
                        setSelectedSpecId(''); // reset spec on item change
                      }}
                      placeholder="Select Garment Item"
                      options={items.map(it => ({
                        label: `[${it.code}] - ${it.name}`,
                        value: String(it.id)
                      }))}
                      icon={<Scissors size={18} />}
                    />
                  </div>

                  {/* Specification Dropdown (Cascading per Item) */}
                  <div className="space-y-2">
                    <Select
                      label="Specification (e.g. A: Half Sleeve)"
                      value={selectedSpecId}
                      onChange={(val) => setSelectedSpecId(val)}
                      placeholder={!selectedItemId ? "Select Item First" : currentItemSpecs.length === 0 ? "No Specs Defined" : "Select Specification"}
                      options={[
                        { label: 'None / Base Style', value: '' },
                        ...currentItemSpecs.map(s => ({
                          label: `[${s.code}] - ${s.name}`,
                          value: String(s.id)
                        }))
                      ]}
                      icon={<Tag size={18} />}
                      disabled={!selectedItemId}
                    />
                    {currentSelectedItem && currentItemSpecs.length === 0 && (
                      <p className="text-[11px] text-amber-600 font-bold">
                        Tip: Click &quot;Manage Specs&quot; in the Items tab to add Half Sleeve, Full Sleeve, etc.
                      </p>
                    )}
                  </div>

                  {/* Gender Code */}
                  <div className="space-y-2">
                    <Select
                      label="Gender Code (e.g. 3: Unisex)"
                      value={selectedGenderId}
                      onChange={(val) => setSelectedGenderId(val)}
                      placeholder="Select Gender"
                      options={genders.map(g => ({
                        label: `[${g.code}] - ${g.name}`,
                        value: String(g.id)
                      }))}
                      icon={<UserCheck size={18} />}
                    />
                  </div>

                  {/* Pattern Code */}
                  <div className="space-y-2">
                    <Select
                      label="Pattern Code (e.g. 053)"
                      value={selectedPatternId}
                      onChange={(val) => setSelectedPatternId(val)}
                      placeholder="Select Pattern"
                      options={patterns.map(p => ({
                        label: `[${p.code}] - ${p.name}`,
                        value: String(p.id)
                      }))}
                      icon={<Palette size={18} />}
                    />
                  </div>

                  {/* Fit Code */}
                  <div className="space-y-2">
                    <Select
                      label="Fit Code (e.g. R: Regular)"
                      value={selectedFitId}
                      onChange={(val) => {
                        setSelectedFitId(val);
                        const foundFit = fits.find(f => String(f.id) === val);
                        if (foundFit) setFit(foundFit.name);
                      }}
                      placeholder="Select Fit Profile"
                      options={fits.map(f => ({
                        label: `[${f.code}] - ${f.name}`,
                        value: String(f.id)
                      }))}
                      icon={<Sparkles size={18} />}
                    />
                  </div>

                  {/* Allowance */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1">
                      Allowance (inches)
                    </label>
                    <Input
                      placeholder="e.g. 2 or 1.5"
                      value={allowance}
                      onChange={(e) => setAllowance(e.target.value)}
                      className="h-14 rounded-2xl border-zinc-200 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 transition-all font-bold text-sm text-[#3a525d]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-100">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1">
                      Base Size (Optional)
                    </label>
                    <Input
                      placeholder="e.g. M, 38, 40"
                      value={baseSize}
                      onChange={(e) => setBaseSize(e.target.value)}
                      className="h-14 rounded-2xl border-zinc-200 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 transition-all font-bold text-sm text-[#3a525d]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Select
                      label="Fit Description Label"
                      value={fit}
                      onChange={(val) => {
                        setFit(val);
                        const match = fits.find(f => f.name.toLowerCase() === val.toLowerCase());
                        if (match) setSelectedFitId(String(match.id));
                      }}
                      placeholder="Select Fit Name"
                      options={fits.length > 0 ? fits.map(f => ({
                        label: `[${f.code}] ${f.name}`,
                        value: f.name
                      })) : [
                        { label: '[R] Regular Fit', value: 'Regular Fit' },
                        { label: '[S] Slim Fit', value: 'Slim Fit' },
                        { label: '[L] Loose Fit', value: 'Loose Fit' }
                      ]}
                      icon={<Sparkles size={18} />}
                    />
                  </div>
                </div>

                {/* Generator Live Preview Badge */}
                <div className="p-6 bg-zinc-50 border border-zinc-150 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                      <Eye size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Code Integration Preview</p>
                      <p className="text-xs font-bold text-[#3a525d]">Format: [item][specification]-[gender][pattern]-[fit][allowance] (e.g. 1A-3053-R2)</p>
                    </div>
                  </div>

                  <div className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3 shadow-lg shadow-black/10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400/60">Output:</span>
                    <span className="text-2xl font-black tracking-widest text-teal-400 font-mono">
                      {getLivePreviewCode()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCreateOrUpdate}
                  disabled={!selectedItemId || !selectedGenderId || !selectedPatternId}
                  size="h-auto"
                  className="w-full h-20 rounded-[2rem] bg-[#C82A2B] hover:bg-[#A81D1E] text-white font-black italic text-xl shadow-2xl shadow-[#C82A2B]/25 flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Pre-register Dynamic Combination
                  <ArrowRight />
                </Button>
              </div>
            </Card>
          ) : (
            /* Items, Gender, Pattern, Fit Forms */
            <Card className="p-8 border border-zinc-200/80 shadow-2xl rounded-[3rem] bg-white animate-in slide-in-from-top-10 duration-500 relative overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                  <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-zinc-900/20">
                    {activeTab === 'items' ? <Scissors size={24} /> : activeTab === 'genders' ? <UserCheck size={24} /> : activeTab === 'fits' ? <Sparkles size={24} /> : <Palette size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">
                      {editingId ? `Modify ${getTabLabelSingular()}` : `Define New ${getTabLabelSingular()}`}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 opacity-70">
                      Catalog Component Registry
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] ml-1">
                      {getTabLabelSingular()} Code {activeTab === 'items' ? '(e.g. 1)' : activeTab === 'genders' ? '(e.g. 3)' : activeTab === 'fits' ? '(e.g. R)' : '(e.g. 053)'}
                    </label>
                    <Input
                      placeholder={activeTab === 'items' ? 'e.g. 1' : activeTab === 'genders' ? 'e.g. 3' : activeTab === 'fits' ? 'e.g. R' : 'e.g. 053'}
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 10 && /^[a-zA-Z0-9\-]*$/.test(val)) {
                          setCode(val.toUpperCase());
                        }
                      }}
                      className="h-14 rounded-2xl border-zinc-200 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 transition-all font-black uppercase tracking-wider text-[#3a525d]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] ml-1">
                      Name {activeTab === 'items' ? '(e.g. Shirt)' : activeTab === 'genders' ? '(e.g. Unisex)' : activeTab === 'fits' ? '(e.g. Regular Fit)' : '(e.g. Striped)'}
                    </label>
                    <Input
                      placeholder={activeTab === 'items' ? 'e.g. Shirt' : activeTab === 'genders' ? 'e.g. Unisex' : activeTab === 'fits' ? 'e.g. Regular Fit' : 'e.g. Striped'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      className="h-14 rounded-2xl border-zinc-200 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 transition-all text-sm font-bold text-[#3a525d]"
                    />
                  </div>

                  {activeTab === 'items' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] ml-1">
                        Description (Optional)
                      </label>
                      <Input
                        placeholder="e.g. Standard corporate and school uniform shirts"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-14 rounded-2xl border-zinc-200 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 transition-all text-sm font-bold text-[#3a525d]"
                      />
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCreateOrUpdate}
                  size="h-auto"
                  className="w-full h-20 rounded-[2rem] bg-[#C82A2B] hover:bg-[#A81D1E] text-white font-black italic text-xl shadow-2xl shadow-[#C82A2B]/25 flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {editingId ? 'Commit Modifications' : `Initialize ${getTabLabelSingular()} Registry`}
                  <ArrowRight />
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Main DataTable Display */}
      {!isAdding && (
        <div className="bg-white rounded-[2.5rem] animate-in fade-in duration-500">
          <DataTable
            columns={getActiveColumns() as any}
            data={getActiveData() as any}
            isLoading={isLoading}
            searchPlaceholder={getSearchPlaceholder()}
          />
        </div>
      )}

      {/* Item Specifications Modal Manager */}
      {specModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="max-w-2xl w-full p-8 rounded-[2.5rem] bg-white border border-zinc-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSpecModalItem(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 border-b border-zinc-100 pb-5 mb-6">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-700 font-black text-xl border border-amber-200">
                {specModalItem.code}
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#3a525d]">
                  Specifications for &ldquo;{specModalItem.name}&rdquo;
                </h3>
                <p className="text-xs font-bold text-zinc-400">
                  Item Code: <strong className="text-teal-700 font-mono">[{specModalItem.code}]</strong> • Define sleeve styles, cuts, collars (e.g. Half Sleeve, Full Sleeve)
                </p>
              </div>
            </div>

            {/* Inline Add / Edit Spec Form */}
            <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 mb-6 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                {editingSpecId ? 'Edit Specification' : '+ Add New Specification'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                    Spec Code (e.g. A, B)
                  </label>
                  <Input
                    placeholder="e.g. A"
                    value={specCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (val.length <= 5 && /^[A-Z0-9]*$/.test(val)) setSpecCode(val);
                    }}
                    className="h-11 rounded-xl font-black text-center font-mono uppercase bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                    Specification Name
                  </label>
                  <Input
                    placeholder="e.g. Half Sleeve / Full Sleeve"
                    value={specName}
                    onChange={(e) => setSpecName(e.target.value)}
                    className="h-11 rounded-xl font-bold bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                  Optional Styling Description
                </label>
                <Input
                  placeholder="e.g. Short sleeve styling with hemmed cuff"
                  value={specDesc}
                  onChange={(e) => setSpecDesc(e.target.value)}
                  className="h-11 rounded-xl text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingSpecId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingSpecId(null);
                      setSpecCode('');
                      setSpecName('');
                      setSpecDesc('');
                    }}
                    className="rounded-xl"
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  onClick={handleSaveSpecification}
                  disabled={isSavingSpec || !specCode.trim() || !specName.trim()}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-5"
                >
                  <Check size={16} className="mr-1.5" />
                  {editingSpecId ? 'Save Changes' : 'Add Specification'}
                </Button>
              </div>
            </div>

            {/* Existing Specifications Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                Registered Specifications ({(specModalItem.art_item_specifications || []).length})
              </h4>
              {(specModalItem.art_item_specifications || []).length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <p className="text-sm font-bold text-zinc-400">No specifications added yet for this item.</p>
                  <p className="text-xs text-zinc-400 mt-1">Add specifications above (e.g. Code A: Half Sleeve, Code B: Full Sleeve).</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-150 rounded-2xl overflow-hidden bg-white">
                  {(specModalItem.art_item_specifications || []).map((spec) => (
                    <div key={spec.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-50/70 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-mono font-black flex items-center justify-center text-sm border border-amber-200">
                          {spec.code}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-[#3a525d]">{spec.name}</p>
                          {spec.description && (
                            <p className="text-xs text-zinc-400 mt-0.5">{spec.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSpecId(spec.id);
                            setSpecCode(spec.code);
                            setSpecName(spec.name);
                            setSpecDesc(spec.description || '');
                          }}
                          className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-amber-500 hover:text-white text-zinc-600 flex items-center justify-center transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate({ type: 'spec', id: spec.id, code: `${specModalItem.code}${spec.code}`, itemId: specModalItem.id })}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setSpecModalItem(null)}
                className="rounded-2xl px-6"
              >
                Close Manager
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title={`Remove ${deleteCandidate ? (deleteCandidate.type === 'registry' ? 'Art Number Combination' : deleteCandidate.type === 'spec' ? 'Item Specification' : getTabLabelSingular()) : ''}`}
        message={`Are you absolutely sure you want to permanently remove the item code '${deleteCandidate?.code}' from the database? This action is irreversible and might cause errors if this component is assigned to any products.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        confirmLabel="Yes, Remove Permanently"
        variant="danger"
      />
    </div>
  );
}
