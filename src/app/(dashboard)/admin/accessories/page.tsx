'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  RotateCw, 
  X,
  Package,
  Layers,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  Tag,
  FolderPlus,
  SlidersHorizontal,
  Check,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export interface AccessoryCategory {
  id: string;
  name: string;
  code_prefix: string;
  is_system?: boolean;
  created_at?: string;
}

export interface AccessoryItem {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  category: string;
  product_type?: string;
  materials?: string;
  base_size?: string | null;
  base_price?: number | null;
  retail_sam_value?: number | null;
  images?: string[];
  remarks?: any[];
  is_active?: boolean;
  created_at?: string;
}

const DEFAULT_ACCESSORY_CATEGORIES: AccessoryCategory[] = [
  { id: 'cat-tie', name: 'Tie', code_prefix: 'TIE', is_system: true },
  { id: 'cat-belt', name: 'Belt', code_prefix: 'BLT', is_system: true },
  { id: 'cat-socks', name: 'Socks', code_prefix: 'SCK', is_system: true },
  { id: 'cat-badge', name: 'Badge / Crest', code_prefix: 'BDG', is_system: true },
  { id: 'cat-cap', name: 'Cap / Hat', code_prefix: 'CAP', is_system: true },
  { id: 'cat-lanyard', name: 'Lanyard / ID Card', code_prefix: 'LAN', is_system: true },
  { id: 'cat-scarf', name: 'Scarf / Dupatta', code_prefix: 'SCF', is_system: true },
  { id: 'cat-bottle', name: 'Water Bottle / Lunchbox', code_prefix: 'BOT', is_system: true },
  { id: 'cat-other', name: 'Other Accessory', code_prefix: 'ACC', is_system: true }
];

const LOCAL_STORAGE_CAT_KEY = 'forma_accessory_categories';

export default function AccessoriesCatalogPage() {
  const [accessories, setAccessories] = useState<AccessoryItem[]>([]);
  const [categories, setCategories] = useState<AccessoryCategory[]>(DEFAULT_ACCESSORY_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccessoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Category Modals
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [isManageCatModalOpen, setIsManageCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrefix, setNewCatPrefix] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);
  
  // Inline category editing in Manager Modal
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatPrefix, setEditCatPrefix] = useState('');

  // Delete item confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: AccessoryItem | null }>({
    isOpen: false,
    item: null
  });

  // Item Form State
  const [formData, setFormData] = useState({
    name: '',
    art_number: '',
    category_name: 'Tie',
    gender: 'Unisex',
    sizing_mode: 'FREE_SIZE', // 'FREE_SIZE' | 'MULTI_SIZE'
    custom_sizes: '28, 30, 32, 34',
    base_price: '',
    cost_price: '',
    description: '',
    image_url: ''
  });

  // Helper to extract category name from an item
  const extractCategoryName = (item: AccessoryItem): string => {
    const rawRemark = item.remarks?.[0]?.text || '';
    const matchRemark = rawRemark.match(/\[([^\]]+)\]/);
    if (matchRemark && matchRemark[1] && !matchRemark[1].toLowerCase().includes('producttype')) {
      return matchRemark[1].trim();
    }

    const mat = item.materials || '';
    const matchMat = mat.match(/\[Category:\s*([^\]]+)\]/i);
    if (matchMat && matchMat[1]) {
      return matchMat[1].trim();
    }

    // Try matching category names against item name
    const found = categories.find(c => item.name.toLowerCase().includes(c.name.toLowerCase()));
    if (found) return found.name;

    return 'Other Accessory';
  };

  // 1. Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/accessory-categories');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setCategories(res.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(res.data));
        }
        return res.data;
      }
    } catch (err) {
      console.warn('Backend accessory categories endpoint unavailable, checking local store:', err);
    }

    // Fallback to local storage or defaults
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOCAL_STORAGE_CAT_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse cached categories', e);
        }
      }
    }

    setCategories(DEFAULT_ACCESSORY_CATEGORIES);
    return DEFAULT_ACCESSORY_CATEGORIES;
  };

  // 2. Fetch Accessories
  const fetchAccessories = async () => {
    setIsLoading(true);
    try {
      const [prodsRes] = await Promise.all([
        api.get('/products'),
        fetchCategories()
      ]);

      const allProds: any[] = prodsRes.data || [];
      const accessoryItems = allProds.filter((p: any) => {
        const mat = (p.materials || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const pType = (p.product_type || '').toLowerCase();
        return cat === 'accessories' || pType === 'accessories' || mat.includes('[producttype: accessories]');
      });

      setAccessories(accessoryItems);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load accessories catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessories();
  }, []);

  // Compute category item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    accessories.forEach(item => {
      const cat = extractCategoryName(item);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [accessories, categories]);

  // Overall metrics
  const stats = useMemo(() => {
    return {
      total: accessories.length,
      active: accessories.filter(a => a.is_active !== false).length,
      categoriesCount: categories.length
    };
  }, [accessories, categories]);

  // Filtered List
  const filteredAccessories = useMemo(() => {
    return accessories.filter(item => {
      if (genderFilter !== 'ALL' && item.gender !== genderFilter) {
        return false;
      }
      if (selectedCategory !== 'ALL') {
        const itemCat = extractCategoryName(item);
        if (itemCat.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = 
          item.name.toLowerCase().includes(term) ||
          item.art_number.toLowerCase().includes(term) ||
          (item.base_size || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [accessories, selectedCategory, genderFilter, searchTerm, categories]);

  // Generate SKU suggestion based on category prefix
  const getPrefixForCategory = (catName: string): string => {
    const found = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return found?.code_prefix || catName.substring(0, 3).toUpperCase();
  };

  // Open Add Accessory Modal
  const handleOpenAdd = () => {
    const initialCat = categories[0]?.name || 'Tie';
    const prefix = getPrefixForCategory(initialCat);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setEditingItem(null);
    setFormData({
      name: '',
      art_number: `ACC-${prefix}-${randomSuffix}`,
      category_name: initialCat,
      gender: 'Unisex',
      sizing_mode: 'FREE_SIZE',
      custom_sizes: '28, 30, 32, 34',
      base_price: '',
      cost_price: '',
      description: '',
      image_url: ''
    });
    setIsItemModalOpen(true);
  };

  // Open Edit Accessory Modal
  const handleOpenEdit = (item: AccessoryItem) => {
    setEditingItem(item);
    const isMultiSize = item.base_size && item.base_size.includes(',');
    const currentCat = extractCategoryName(item);
    setFormData({
      name: item.name,
      art_number: item.art_number,
      category_name: currentCat,
      gender: item.gender || 'Unisex',
      sizing_mode: isMultiSize ? 'MULTI_SIZE' : 'FREE_SIZE',
      custom_sizes: item.base_size || '28, 30, 32, 34',
      base_price: item.base_price !== null && item.base_price !== undefined ? String(item.base_price) : '',
      cost_price: item.retail_sam_value !== null && item.retail_sam_value !== undefined ? String(item.retail_sam_value) : '',
      description: item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim() || '',
      image_url: item.images?.[0] || ''
    });
    setIsItemModalOpen(true);
  };

  // Category switch in item modal -> updates suggested ART number if not manually customized
  const handleFormCategoryChange = (newCat: string) => {
    const prefix = getPrefixForCategory(newCat);
    setFormData(prev => {
      let updatedArt = prev.art_number;
      if (!editingItem && prev.art_number.startsWith('ACC-')) {
        const parts = prev.art_number.split('-');
        const suffix = parts[2] || Math.floor(1000 + Math.random() * 9000);
        updatedArt = `ACC-${prefix}-${suffix}`;
      }
      return {
        ...prev,
        category_name: newCat,
        art_number: updatedArt
      };
    });
  };

  // Submit Accessory Item
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Accessory name is required');
      return;
    }
    if (!formData.art_number.trim()) {
      toast.error('Accessory code / art number is required');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(editingItem ? 'Updating accessory...' : 'Creating accessory...');

    try {
      const finalBaseSize = formData.sizing_mode === 'FREE_SIZE' 
        ? 'Free Size' 
        : formData.custom_sizes.trim();

      const remarksPayload = formData.description.trim() 
        ? [{ text: `[${formData.category_name}] ${formData.description.trim()}`, images: [] }]
        : [{ text: `[${formData.category_name}] Accessory Item`, images: [] }];

      const payload = {
        name: formData.name.trim(),
        art_number: formData.art_number.trim(),
        gender: formData.gender,
        category: 'accessories',
        product_type: 'accessories',
        product_type_id: 30,
        base_size: finalBaseSize,
        base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
        retail_sam_value: formData.cost_price ? parseFloat(formData.cost_price) : 0,
        materials: `[ProductType: accessories] [Category: ${formData.category_name}] ${formData.category_name} Accessory`,
        images: formData.image_url ? [formData.image_url.trim()] : [],
        remarks: remarksPayload,
        is_active: true
      };

      if (editingItem) {
        await api.put(`/products/${editingItem.id}`, payload);
        toast.success('Accessory updated successfully!', { id: loadingToast });
      } else {
        await api.post('/products', payload);
        toast.success('Accessory created successfully!', { id: loadingToast });
      }

      setIsItemModalOpen(false);
      fetchAccessories();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save accessory', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Accessory Item
  const handleDeleteItem = async () => {
    if (!deleteConfirm.item) return;
    try {
      await api.delete(`/products/${deleteConfirm.item.id}`);
      toast.success('Accessory deleted successfully');
      setDeleteConfirm({ isOpen: false, item: null });
      fetchAccessories();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete accessory item');
    }
  };

  // --- CATEGORY CRUD (Editable / Customizable like Trims) ---

  // 1. Create Category
  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    const trimmedPrefix = (newCatPrefix.trim() || trimmedName.substring(0, 3)).toUpperCase();

    // Check duplicate
    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error(`Category "${trimmedName}" already exists`);
      return;
    }

    setIsSavingCat(true);
    const loadingToast = toast.loading('Adding accessory category...');
    try {
      let createdCat: AccessoryCategory;
      try {
        const res = await api.post('/inventory/accessory-categories', {
          name: trimmedName,
          code_prefix: trimmedPrefix
        });
        createdCat = res.data;
      } catch (apiErr) {
        // Fallback to client-side generation
        createdCat = {
          id: `cat-${Date.now()}`,
          name: trimmedName,
          code_prefix: trimmedPrefix,
          is_system: false,
          created_at: new Date().toISOString()
        };
      }

      const updated = [...categories, createdCat];
      setCategories(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(updated));
      }

      toast.success(`Category "${trimmedName}" created!`, { id: loadingToast });
      setNewCatName('');
      setNewCatPrefix('');
      setIsAddCatModalOpen(false);

      // If item modal is open, select the newly created category
      if (isItemModalOpen) {
        handleFormCategoryChange(createdCat.name);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create category', { id: loadingToast });
    } finally {
      setIsSavingCat(false);
    }
  };

  // 2. Start editing an existing category
  const handleStartEditCat = (cat: AccessoryCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatPrefix(cat.code_prefix);
  };

  // 3. Save edited category
  const handleSaveEditCat = async (catId: string) => {
    const trimmedName = editCatName.trim();
    const trimmedPrefix = editCatPrefix.trim().toUpperCase();
    if (!trimmedName) {
      toast.error('Category name cannot be empty');
      return;
    }

    const loadingToast = toast.loading('Saving category changes...');
    try {
      try {
        await api.put(`/inventory/accessory-categories/${catId}`, {
          name: trimmedName,
          code_prefix: trimmedPrefix
        });
      } catch (apiErr) {
        console.warn('API update failed, updating locally:', apiErr);
      }

      const updated = categories.map(c => 
        c.id === catId ? { ...c, name: trimmedName, code_prefix: trimmedPrefix || c.code_prefix } : c
      );
      setCategories(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(updated));
      }

      toast.success('Category updated successfully!', { id: loadingToast });
      setEditingCatId(null);
    } catch (err: any) {
      toast.error('Failed to update category', { id: loadingToast });
    }
  };

  // 4. Delete custom category
  const handleDeleteCategory = async (cat: AccessoryCategory) => {
    const itemsCount = categoryCounts[cat.name] || 0;
    if (itemsCount > 0) {
      toast.error(`Cannot delete category "${cat.name}". It is used by ${itemsCount} accessory item(s).`);
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete category "${cat.name}"?`);
    if (!confirmDelete) return;

    try {
      try {
        await api.delete(`/inventory/accessory-categories/${cat.id}`);
      } catch (apiErr) {
        console.warn('API delete failed, removing locally:', apiErr);
      }

      const updated = categories.filter(c => c.id !== cat.id);
      setCategories(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(updated));
      }

      if (selectedCategory === cat.name) {
        setSelectedCategory('ALL');
      }

      toast.success(`Category "${cat.name}" removed`);
    } catch (err: any) {
      toast.error('Failed to remove category');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Tag size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Accessories Catalog</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Define Ties, Belts, Socks, Badges & Uniform Accessories
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={fetchAccessories}
            disabled={isLoading}
            className="h-12 px-4 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh Catalog"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
            Sync
          </button>

          {/* + Category Button (styled like Trims) */}
          <button 
            onClick={() => {
              setNewCatName('');
              setNewCatPrefix('');
              setIsAddCatModalOpen(true);
            }}
            className="h-12 px-4 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-2xl font-black text-[11px] uppercase tracking-wider text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <FolderPlus size={15} className="text-[#2d8d9b]" />
            + Category
          </button>

          {/* Manage Categories (Customize / Edit Categories) */}
          <button 
            onClick={() => setIsManageCatModalOpen(true)}
            className="h-12 px-4 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-2xl font-black text-[11px] uppercase tracking-wider text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Customize & Edit Categories"
          >
            <SlidersHorizontal size={14} className="text-[#CC9448]" />
            Manage Categories
          </button>

          {/* Add Accessory Button */}
          <button 
            onClick={handleOpenAdd}
            className="h-12 px-6 bg-[#2d8d9b] hover:bg-[#236f7a] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#2d8d9b]/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            Add Accessory
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20 shrink-0">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]/60">Total Accessories</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] mt-0.5">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Active Articles</p>
            <h3 className="text-2xl font-black italic tracking-tight text-emerald-600 mt-0.5">{stats.active}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#CC9448]/10 flex items-center justify-center text-[#CC9448] border border-[#CC9448]/20 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#CC9448]/70">Accessory Categories</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#CC9448] mt-0.5">{stats.categoriesCount}</h3>
          </div>
        </div>
      </div>

      {/* Dynamic Category Pills (Exactly like Trims) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === 'ALL'
              ? 'bg-[#3a525d] text-white shadow-md shadow-[#3a525d]/20'
              : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <span>All Accessories</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
            {accessories.length}
          </span>
        </button>

        {categories.map(cat => {
          const count = categoryCounts[cat.name] || 0;
          const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#2d8d9b] text-white shadow-md shadow-[#2d8d9b]/25 font-black'
                  : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSelected ? 'bg-white/25 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Quick Add category inline button */}
        <button
          onClick={() => {
            setNewCatName('');
            setNewCatPrefix('');
            setIsAddCatModalOpen(true);
          }}
          className="h-9 px-3 rounded-xl text-xs font-bold text-[#2d8d9b] bg-[#2d8d9b]/5 hover:bg-[#2d8d9b]/15 border border-dashed border-[#2d8d9b]/40 whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} />
          <span>New Category</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search accessories by name, code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] placeholder:text-zinc-400 focus:outline-none focus:border-[#2d8d9b] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:border-[#2d8d9b] cursor-pointer"
          >
            <option value="ALL">All Categories ({accessories.length})</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>
                {c.name} ({categoryCounts[c.name] || 0})
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:border-[#2d8d9b] cursor-pointer"
          >
            <option value="ALL">All Genders</option>
            <option value="Unisex">Unisex</option>
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
          </select>
        </div>
      </div>

      {/* Accessories Grid */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <RotateCw size={32} className="animate-spin text-[#2d8d9b]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#3a525d]/60">Loading accessories catalog...</p>
        </div>
      ) : filteredAccessories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccessories.map(item => {
            const currentCat = extractCategoryName(item);
            return (
              <div 
                key={item.id}
                className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Tag size={22} className="text-[#2d8d9b]/50" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#2d8d9b] uppercase tracking-wider block">
                          {item.art_number}
                        </span>
                        <h4 className="font-black text-base text-[#3a525d] line-clamp-1 mt-0.5">
                          {item.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-[#2d8d9b] transition-colors cursor-pointer"
                        title="Edit Accessory"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ isOpen: true, item })}
                        className="p-2 hover:bg-red-50 rounded-xl text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete Accessory"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-bold">Category:</span>
                      <span className="font-bold text-[#3a525d] bg-zinc-100 px-2.5 py-0.5 rounded-lg text-[11px]">
                        {currentCat}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-bold">Target Gender:</span>
                      <span className="font-bold text-[#3a525d]">{item.gender || 'Unisex'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-bold">Sizes Available:</span>
                      <span className="font-black text-[#2d8d9b] bg-[#2d8d9b]/5 px-2 py-0.5 rounded-md text-[11px]">
                        {item.base_size || 'Free Size'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-bold">Selling Price:</span>
                      <span className="font-black text-emerald-600">
                        {item.base_price ? formatCurrency(item.base_price) : 'Quote-Based'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-400">
                  <span className="truncate max-w-[190px]">
                    {item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim() || 'Uniform Accessory'}
                  </span>
                  <a 
                    href="/admin/inventory/accessories-stock"
                    className="text-[#2d8d9b] hover:underline flex items-center gap-0.5 font-black uppercase tracking-wider text-[9px]"
                  >
                    View Stock <ChevronRight size={10} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#fce4d4] rounded-[3rem] p-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Tag size={32} />
            </div>
            <p className="text-xl font-black italic text-[#3a525d]">
              {selectedCategory !== 'ALL' ? `No Accessories Found in "${selectedCategory}"` : 'No Accessories Registered Yet'}
            </p>
            <p className="text-xs font-bold max-w-md text-zinc-500 leading-relaxed">
              Create school ties, belts, socks, badges, and crests here. They will automatically link to Quotations and Stock.
            </p>
            <button 
              onClick={handleOpenAdd}
              className="mt-3 px-6 py-3 bg-[#2d8d9b] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#236f7a] transition-all cursor-pointer"
            >
              Add First Accessory
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 1: ADD / EDIT ACCESSORY --- */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white rounded-[2.5rem] border border-[#fce4d4] p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
            
            <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
              <div>
                <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d]">
                  {editingItem ? 'Edit Accessory' : 'Register New Accessory'}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1">
                  Customizable Accessories & Finished Items
                </p>
              </div>
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Accessory Name */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Accessory Name *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Standard Navy Silk Tie"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                  />
                </div>

                {/* Category Selection + Quick Add Button */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                      Accessory Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatName('');
                        setNewCatPrefix('');
                        setIsAddCatModalOpen(true);
                      }}
                      className="text-[10px] font-black text-[#2d8d9b] hover:text-[#3a525d] hover:underline uppercase tracking-wider cursor-pointer bg-transparent border-none outline-none flex items-center gap-1"
                    >
                      <Plus size={11} /> Add New Category
                    </button>
                  </div>
                  <select
                    value={formData.category_name}
                    onChange={(e) => handleFormCategoryChange(e.target.value)}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.code_prefix})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Art Number / Code */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Accessory Code / SKU *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. ACC-TIE-001"
                    value={formData.art_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, art_number: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none font-mono"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Target Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none cursor-pointer"
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                  </select>
                </div>

                {/* Sizing Structure Mode */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Sizing Mode
                  </label>
                  <select
                    value={formData.sizing_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, sizing_mode: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none cursor-pointer"
                  >
                    <option value="FREE_SIZE">Single Size (Free Size / Standard)</option>
                    <option value="MULTI_SIZE">Multi-Size (e.g. Belts 28, 30, 32 or Socks S, M, L)</option>
                  </select>
                </div>

                {/* Multi-Size input if enabled */}
                {formData.sizing_mode === 'MULTI_SIZE' && (
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mb-1.5">
                      Sizes List (Comma-separated)
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 28, 30, 32, 34, 36"
                      value={formData.custom_sizes}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_sizes: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-[#2d8d9b]/30 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Each size will have its own individual warehouse stock counter.</p>
                  </div>
                )}

                {/* Selling Price */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Selling Price (₹)
                  </label>
                  <input 
                    type="number"
                    step="any"
                    placeholder="e.g. 150.00"
                    value={formData.base_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Product Image URL
                  </label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Description & Specs
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Fabric specifications, buckle type, length, etc."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-2.5 bg-[#2d8d9b] hover:bg-[#236f7a] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={12} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingItem ? 'Save Changes' : 'Create Accessory'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: QUICK ADD ACCESSORY CATEGORY (Like Trims) --- */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-100 relative space-y-4">
            <button 
              type="button"
              onClick={() => setIsAddCatModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-lg font-black text-[#3a525d]">New Accessory Category</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Define a custom category group (e.g. Bowtie, Suspenders, Beret, Pin).</p>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">
                  Category Name *
                </label>
                <input 
                  type="text" 
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)} 
                  placeholder="e.g. Bowtie or Suspenders"
                  className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">
                  Code Prefix (3-4 Letters)
                </label>
                <input 
                  type="text" 
                  value={newCatPrefix} 
                  onChange={e => setNewCatPrefix(e.target.value.toUpperCase())} 
                  placeholder="e.g. BOW, SUS, PIN"
                  maxLength={5}
                  className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none font-mono" 
                />
                <p className="text-[10px] text-zinc-400 mt-1">Used in SKU generation (e.g. ACC-BOW-001)</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingCat}
                  className="px-6 py-2.5 bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#2d8d9b]/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCat ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: MANAGE CATEGORIES (EDIT & CUSTOMIZE LIKE TRIMS) --- */}
      {isManageCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-zinc-100 relative space-y-5 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-xl font-black text-[#3a525d]">Manage Accessory Categories</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Customize category names, SKU prefixes, and remove unused types.</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setEditingCatId(null);
                  setIsManageCatModalOpen(false);
                }}
                className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Add Bar */}
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mb-2">+ Add Category</p>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Category Name (e.g. Scarf)"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 text-xs font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none"
                />
                <input 
                  type="text"
                  placeholder="Prefix"
                  value={newCatPrefix}
                  onChange={e => setNewCatPrefix(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-20 text-xs font-mono font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCreateCategory()}
                  disabled={!newCatName.trim()}
                  className="px-4 py-2 bg-[#2d8d9b] hover:bg-[#236f7a] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 scrollbar-thin">
              {categories.map(cat => {
                const count = categoryCounts[cat.name] || 0;
                const isEditing = editingCatId === cat.id;

                if (isEditing) {
                  return (
                    <div key={cat.id} className="p-3 bg-[#2d8d9b]/10 rounded-2xl border border-[#2d8d9b]/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={editCatName}
                          onChange={e => setEditCatName(e.target.value)}
                          placeholder="Category Name"
                          className="flex-1 text-xs font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none"
                        />
                        <input 
                          type="text"
                          value={editCatPrefix}
                          onChange={e => setEditCatPrefix(e.target.value.toUpperCase())}
                          placeholder="Prefix"
                          maxLength={5}
                          className="w-20 text-xs font-mono font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditCat(cat.id)}
                          className="px-4 py-1.5 bg-[#2d8d9b] text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm cursor-pointer flex items-center gap-1"
                        >
                          <Check size={11} /> Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-[#2d8d9b] bg-[#2d8d9b]/10 px-2 py-1 rounded-lg">
                        {cat.code_prefix}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-[#3a525d]">{cat.name}</p>
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          {count} item{count === 1 ? '' : 's'} linked
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditCat(cat)}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-[#2d8d9b] transition-colors cursor-pointer"
                        title="Edit Name & Prefix"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={count > 0}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={count > 0 ? "Cannot delete category in use" : "Delete Category"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingCatId(null);
                  setIsManageCatModalOpen(false);
                }}
                className="px-6 py-2.5 bg-[#3a525d] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: DELETE ACCESSORY ITEM CONFIRMATION --- */}
      {deleteConfirm.isOpen && deleteConfirm.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-red-100 p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-3">
              <Trash2 size={24} />
            </div>
            <h4 className="text-lg font-black text-[#3a525d]">Delete Accessory?</h4>
            <p className="text-xs text-zinc-500 mt-1 mb-5">
              Are you sure you want to remove <span className="font-bold text-zinc-700">{deleteConfirm.item.name}</span>?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, item: null })}
                className="px-5 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteItem}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
