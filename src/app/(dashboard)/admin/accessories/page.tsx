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
  ChevronRight,
  ShieldCheck,
  Tag,
  FolderPlus,
  SlidersHorizontal,
  Check,
  ShoppingBag,
  Store,
  DollarSign,
  Percent,
  Sparkles,
  Info
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
  retail_sam_value?: number | null; // Used for cost price / procurement price
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

const DEFAULT_TRADE_CATEGORIES = [
  'T-Shirt',
  'Polo Shirt',
  'Tracksuit / Joggers',
  'Lab Coat / Apron',
  'Blazer / Corporate Suit',
  'Corporate Formal Shirt',
  'Windcheater / Jacket',
  'Sweatshirt / Hoodie',
  'Industrial Workwear',
  'Cap / Hat',
  'Other Trade Item'
];

const SIZE_PRESETS_MULTI = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const SIZE_PRESETS_NUMERIC = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
const COLOR_PRESETS = ['White', 'Navy Blue', 'Black', 'Heather Grey', 'Sky Blue', 'Maroon', 'Bottle Green', 'Beige', 'Royal Blue', 'Khaki'];

const LOCAL_STORAGE_CAT_KEY = 'forma_accessory_categories';

const parseArtNumber = (artNumber: string, dresses: any[], genders: any[], patterns: any[]) => {
  if (!artNumber) return { dressCode: '', genderCode: '', patternCode: '', fitCode: '', allowance: '' };

  const parts = artNumber.split('-');

  // Option 1 format: [DressPrefix]-[GenderPattern]-[FitAllowance] (e.g. 4J-1012-R2, 4J-1012-R)
  if (parts.length === 3) {
    const [dressCode, middle, lastPart] = parts;
    const fitMatch = lastPart.match(/^([A-Za-z]+)(.*)$/);
    if (fitMatch && isNaN(Number(lastPart))) {
      const fitCode = fitMatch[1].toUpperCase();
      const allowance = fitMatch[2] ? fitMatch[2].trim() : '';
      const genderCode = middle.slice(0, 1);
      const patternCode = middle.slice(1);
      return { dressCode, genderCode, patternCode, fitCode, allowance };
    }
    return { dressCode, genderCode: middle, patternCode: lastPart, fitCode: '', allowance: '' };
  }

  // Fallback for 2-part legacy format
  if (parts.length === 2) {
    const isFirstDress = dresses.some(d => d.code === parts[0]);
    if (isFirstDress) {
      const dressCode = parts[0];
      const rest = parts[1];
      for (const g of genders) {
        if (rest.startsWith(g.code)) {
          const remainder = rest.slice(g.code.length);
          return { dressCode, genderCode: g.code, patternCode: remainder, fitCode: '', allowance: '' };
        }
      }
    }
  }

  return { dressCode: '', genderCode: '', patternCode: '', fitCode: '', allowance: '' };
};

const MultiEntryInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  buttonText?: string;
}> = ({ value, onChange, placeholder = "Type a size (e.g. 2XL) and press Enter", buttonText = "Add" }) => {
  const [inputVal, setInputVal] = useState('');
  const items = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      toast.error('Value already added');
      return;
    }
    const updated = [...items, trimmed];
    onChange(updated.join(', '));
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-10 bg-white border border-zinc-200 rounded-xl px-3 text-xs font-bold outline-none focus:border-indigo-500 text-[#3a525d]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
        >
          {buttonText}
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 rounded-xl border border-zinc-150">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-zinc-200 text-zinc-700 text-xs font-black rounded-lg hover:border-red-200 hover:text-red-600 transition-all cursor-pointer group shadow-2xs"
              onClick={() => handleRemove(idx)}
              title="Click to remove"
            >
              {item}
              <span className="text-[10px] text-zinc-400 group-hover:text-red-500 font-normal">×</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AccessoriesAndTradeCatalogPage() {
  const [items, setItems] = useState<AccessoryItem[]>([]);
  const [categories, setCategories] = useState<AccessoryCategory[]>(DEFAULT_ACCESSORY_CATEGORIES);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'ALL' | 'ACCESSORIES' | 'TRADE_READYMADE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Master Data for Manufactured-spec Art Numbers and US Standard Sizing
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [dresses, setDresses] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [fitsList, setFitsList] = useState<any[]>([]);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [nextPatternCode, setNextPatternCode] = useState('001');

  // --- ACCESSORY MODAL STATE ---
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccessoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // --- READYMADE (TRADE) MODAL STATE (Matching Manufactured Spec + US Standard Size) ---
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTradeItem, setEditingTradeItem] = useState<AccessoryItem | null>(null);
  const [isTradeSubmitting, setIsTradeSubmitting] = useState(false);
  const [tradeFormData, setTradeFormData] = useState({
    name: '',
    product_type_id: '',
    dress_prefix: '',
    gender_code: '',
    pattern_code: '',
    fit: 'Regular Fit',
    allowance: '',
    color: '',
    size_chart_id: '',
    base_size: 'M',
    other_sizes: 'S, L, XL, 2XL',
    other_fits: '',
    trader_name: '',
    cost_price: '', // Purchase / Trader Cost
    selling_price: '', // Quoted Customer Price
    moq: '1',
    description: '',
    image_url: ''
  });

  // --- CATEGORY MODALS ---
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [isManageCatModalOpen, setIsManageCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrefix, setNewCatPrefix] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatPrefix, setEditCatPrefix] = useState('');

  // --- DELETE CONFIRM ---
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: AccessoryItem | null }>({
    isOpen: false,
    item: null
  });

  // Helper: Detect Classification
  const getItemClassification = (item: AccessoryItem): 'ACCESSORY' | 'TRADE_READYMADE' => {
    const cat = (item.category || '').toLowerCase();
    const pType = (item.product_type || '').toLowerCase();
    const mat = (item.materials || '').toLowerCase();
    if (
      cat === 'trade_readymade' ||
      cat === 'readymade_trade' ||
      pType === 'trade_readymade' ||
      pType === 'readymade_trade' ||
      mat.includes('[producttype: trade_readymade]') ||
      mat.includes('[producttype: readymade_trade]')
    ) {
      return 'TRADE_READYMADE';
    }
    return 'ACCESSORY';
  };

  // Helper: Extract Category
  const extractCategoryName = (item: AccessoryItem): string => {
    const isTrade = getItemClassification(item) === 'TRADE_READYMADE';
    const mat = item.materials || '';
    const matchMat = mat.match(/\[Category:\s*([^\]]+)\]/i);
    if (matchMat && matchMat[1]) {
      return matchMat[1].trim();
    }

    const rawRemark = item.remarks?.[0]?.text || '';
    const matchRemark = rawRemark.match(/\[([^\]]+)\]/);
    if (matchRemark && matchRemark[1] && !matchRemark[1].toLowerCase().includes('producttype')) {
      return matchRemark[1].trim();
    }

    if (isTrade) return 'Trade Readymade';

    const found = categories.find(c => item.name.toLowerCase().includes(c.name.toLowerCase()));
    if (found) return found.name;

    return 'Other Accessory';
  };

  // Helper: Extract Trade Metadata
  const extractTradeMetadata = (item: AccessoryItem) => {
    const mat = item.materials || '';
    const traderMatch = mat.match(/\[Trader:\s*([^\]]+)\]/i);
    const catMatch = mat.match(/\[Category:\s*([^\]]+)\]/i);
    const colorMatch = mat.match(/\[Color:\s*([^\]]+)\]/i);
    const moqMatch = mat.match(/\[MOQ:\s*([^\]]+)\]/i);
    
    const cleanSpecs = mat
      .replace(/\[ProductType:[^\]]+\]/gi, '')
      .replace(/\[Trader:[^\]]+\]/gi, '')
      .replace(/\[Category:[^\]]+\]/gi, '')
      .replace(/\[Color:[^\]]+\]/gi, '')
      .replace(/\[MOQ:[^\]]+\]/gi, '')
      .trim();

    return {
      trader_name: traderMatch ? traderMatch[1].trim() : '',
      trade_category: catMatch ? catMatch[1].trim() : 'Trade Garment',
      colors: colorMatch ? colorMatch[1].trim() : '',
      moq: moqMatch ? moqMatch[1].trim() : '1',
      fabric_details: cleanSpecs
    };
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

  // 2. Fetch Catalog Items (Accessories + Readymade Trade) & Master Data
  const fetchCatalogData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, typeRes, dressRes, genderRes, patternRes, nextPatternRes, fitsRes, chartRes] = await Promise.all([
        api.get('/products'),
        api.get('/product-types').catch(() => ({ data: [] })),
        api.get('/art-number-hub/dresses').catch(() => ({ data: [] })),
        api.get('/art-number-hub/genders').catch(() => ({ data: [] })),
        api.get('/art-number-hub/patterns').catch(() => ({ data: [] })),
        api.get('/art-number-hub/patterns/next').catch(() => ({ data: { nextCode: '001' } })),
        api.get('/art-number-hub/fits').catch(() => ({ data: [] })),
        api.get('/size-charts').catch(() => ({ data: [] })),
        fetchCategories()
      ]);

      setProductTypes(typeRes.data || []);
      setDresses(dressRes.data || []);
      setGenders(genderRes.data || []);
      setPatterns(patternRes.data || []);
      setFitsList(fitsRes.data || []);
      setSizeCharts(chartRes.data || []);
      setNextPatternCode(nextPatternRes.data?.nextCode || '001');

      const allProds: any[] = prodsRes.data || [];
      const relevantItems = allProds.filter((p: any) => {
        const mat = (p.materials || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const pType = (p.product_type || '').toLowerCase();
        
        const isAccessory = cat === 'accessories' || pType === 'accessories' || mat.includes('[producttype: accessories]');
        const isTrade = cat === 'trade_readymade' || cat === 'readymade_trade' || pType === 'trade_readymade' || pType === 'readymade_trade' || mat.includes('[producttype: trade_readymade]') || mat.includes('[producttype: readymade_trade]');
        
        return isAccessory || isTrade;
      });

      setItems(relevantItems);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  // Compute category item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const cat = extractCategoryName(item);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [items, categories]);

  // Overall metrics
  const stats = useMemo(() => {
    const accessoriesList = items.filter(i => getItemClassification(i) === 'ACCESSORY');
    const tradeList = items.filter(i => getItemClassification(i) === 'TRADE_READYMADE');
    return {
      total: items.length,
      accessoriesCount: accessoriesList.length,
      tradeCount: tradeList.length,
      active: items.filter(a => a.is_active !== false).length,
      categoriesCount: categories.length
    };
  }, [items, categories]);

  // Filtered List based on tab, category, gender, search
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const classification = getItemClassification(item);

      // Tab filter
      if (activeCatalogTab === 'ACCESSORIES' && classification !== 'ACCESSORY') {
        return false;
      }
      if (activeCatalogTab === 'TRADE_READYMADE' && classification !== 'TRADE_READYMADE') {
        return false;
      }

      // Gender filter
      if (genderFilter !== 'ALL' && item.gender !== genderFilter) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        const itemCat = extractCategoryName(item);
        if (itemCat.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const meta = extractTradeMetadata(item);
        const matches = 
          item.name.toLowerCase().includes(term) ||
          item.art_number.toLowerCase().includes(term) ||
          (item.base_size || '').toLowerCase().includes(term) ||
          meta.trader_name.toLowerCase().includes(term) ||
          meta.trade_category.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, activeCatalogTab, selectedCategory, genderFilter, searchTerm, categories]);

  // --- ACCESSORY MODAL ACTIONS ---
  const getPrefixForCategory = (catName: string): string => {
    const found = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return found?.code_prefix || catName.substring(0, 3).toUpperCase();
  };

  const handleOpenAddAccessory = () => {
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

  const handleOpenEditAccessory = (item: AccessoryItem) => {
    setEditingItem(item);
    const cat = extractCategoryName(item);
    const isMultiSize = item.base_size && !item.base_size.toLowerCase().includes('free size');
    
    setFormData({
      name: item.name,
      art_number: item.art_number,
      category_name: cat,
      gender: item.gender || 'Unisex',
      sizing_mode: isMultiSize ? 'MULTI_SIZE' : 'FREE_SIZE',
      custom_sizes: isMultiSize ? (item.base_size || '') : '28, 30, 32, 34',
      base_price: item.base_price?.toString() || '',
      cost_price: item.retail_sam_value?.toString() || '',
      description: item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim() || '',
      image_url: item.images?.[0] || ''
    });
    setIsItemModalOpen(true);
  };

  const handleFormCategoryChange = (catName: string) => {
    const prefix = getPrefixForCategory(catName);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setFormData(prev => ({
      ...prev,
      category_name: catName,
      art_number: editingItem ? prev.art_number : `ACC-${prefix}-${randomSuffix}`
    }));
  };

  const handleAccessorySubmit = async (e: React.FormEvent) => {
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
      fetchCatalogData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save accessory', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- READYMADE (TRADE) MODAL ACTIONS (Manufactured Art Number + US Standard Size) ---
  const computeTradeArtNumber = useMemo(() => {
    const { dress_prefix, gender_code, pattern_code, fit, allowance } = tradeFormData;
    if (!dress_prefix || !gender_code) return '';
    const pat = pattern_code || nextPatternCode || '001';
    let fitCode = 'R';
    if (fit) {
      const matched = fitsList.find(f => f.name.toLowerCase() === fit.toLowerCase() || f.code === fit.toUpperCase());
      if (matched) {
        fitCode = matched.code;
      } else {
        fitCode = fit.toLowerCase().includes('slim') ? 'S' : fit.toLowerCase().includes('loose') ? 'L' : 'R';
      }
    }
    const cleanAllowance = allowance ? allowance.trim() : '';
    return `${dress_prefix}-${gender_code}${pat}-${fitCode}${cleanAllowance}`;
  }, [tradeFormData.dress_prefix, tradeFormData.gender_code, tradeFormData.pattern_code, tradeFormData.fit, tradeFormData.allowance, nextPatternCode, fitsList]);

  const toggleTradeQuickSize = (sz: string) => {
    const current = tradeFormData.other_sizes ? tradeFormData.other_sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
    let updated: string[];
    if (current.includes(sz)) {
      updated = current.filter(s => s !== sz);
    } else {
      updated = [...current, sz];
    }
    setTradeFormData(prev => ({ ...prev, other_sizes: updated.join(', ') }));
  };

  const selectTradeColor = (col: string) => {
    setTradeFormData(prev => ({ ...prev, color: col }));
  };

  const tradeCost = parseFloat(tradeFormData.cost_price) || 0;
  const tradeSelling = parseFloat(tradeFormData.selling_price) || 0;
  const tradeMarginAmt = tradeSelling - tradeCost;
  const tradeMarginPct = tradeSelling > 0 ? ((tradeMarginAmt / tradeSelling) * 100).toFixed(1) : '0';

  const handleOpenAddTrade = () => {
    setEditingTradeItem(null);
    const defaultDress = dresses[0]?.code || '4J';
    const defaultGender = genders[0]?.code || '1';
    const defaultPattern = nextPatternCode || '001';
    const defaultPt = productTypes[0]?.id?.toString() || '';

    setTradeFormData({
      name: '',
      product_type_id: defaultPt,
      dress_prefix: defaultDress,
      gender_code: defaultGender,
      pattern_code: defaultPattern,
      fit: 'Regular Fit',
      allowance: '',
      color: '',
      size_chart_id: sizeCharts[0]?.id?.toString() || '',
      base_size: 'M',
      other_sizes: 'S, L, XL, 2XL',
      other_fits: '',
      trader_name: '',
      cost_price: '',
      selling_price: '',
      moq: '1',
      description: '',
      image_url: ''
    });
    api.get('/art-number-hub/patterns/next').then(res => setNextPatternCode(res.data?.nextCode || '001')).catch(() => {});
    setIsTradeModalOpen(true);
  };

  const handleOpenEditTrade = (item: AccessoryItem) => {
    setEditingTradeItem(item);
    const meta = extractTradeMetadata(item);
    const parsed = parseArtNumber(item.art_number, dresses, genders, patterns);
    
    setTradeFormData({
      name: item.name || '',
      product_type_id: (item as any).product_type_id?.toString() || (item as any).product_types?.id?.toString() || '',
      dress_prefix: parsed.dressCode || dresses[0]?.code || '4J',
      gender_code: parsed.genderCode || genders[0]?.code || '1',
      pattern_code: parsed.patternCode || '001',
      fit: (item as any).fit || (parsed.fitCode === 'S' ? 'Slim Fit' : parsed.fitCode === 'L' ? 'Loose Fit' : 'Regular Fit'),
      allowance: (item as any).allowance || parsed.allowance || '',
      color: meta.colors || '',
      size_chart_id: (item as any).size_chart_id?.toString() || '',
      base_size: item.base_size || 'M',
      other_sizes: (item as any).other_sizes || '',
      other_fits: (item as any).other_fits || '',
      trader_name: meta.trader_name || '',
      cost_price: item.retail_sam_value ? String(item.retail_sam_value) : '',
      selling_price: item.base_price ? String(item.base_price) : '',
      moq: meta.moq || '1',
      description: meta.fabric_details || item.materials?.replace(/\[[^\]]+\]/g, '').trim() || '',
      image_url: item.images?.[0] || ''
    });
    setIsTradeModalOpen(true);
  };

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeFormData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    const finalArtNumber = computeTradeArtNumber || tradeFormData.art_number;
    if (!finalArtNumber) {
      toast.error('Dress prefix and gender code are required to compute Art Number');
      return;
    }

    setIsTradeSubmitting(true);
    const loadingToast = toast.loading(editingTradeItem ? 'Updating Readymade (Trade) product...' : 'Registering Readymade (Trade) product...');

    try {
      const traderTag = tradeFormData.trader_name.trim() ? `[Trader: ${tradeFormData.trader_name.trim()}]` : '';
      const colorTag = tradeFormData.color.trim() ? `[Color: ${tradeFormData.color.trim()}]` : '';
      const moqTag = tradeFormData.moq.trim() ? `[MOQ: ${tradeFormData.moq.trim()}]` : '';

      const materialsStr = `[ProductType: trade_readymade] ${traderTag} ${colorTag} ${moqTag} ${tradeFormData.description.trim()}`.trim();

      const matchedGender = genders.find(g => g.code === tradeFormData.gender_code);
      const genderName = matchedGender ? matchedGender.name : 'Unisex';

      const payload = {
        name: tradeFormData.name.trim(),
        art_number: finalArtNumber,
        category: 'trade_readymade',
        product_type: 'trade_readymade',
        product_type_id: tradeFormData.product_type_id ? parseInt(tradeFormData.product_type_id, 10) : null,
        gender: genderName,
        base_size: tradeFormData.base_size.trim() || 'M',
        other_sizes: tradeFormData.other_sizes.trim() || null,
        other_fits: tradeFormData.other_fits.trim() || null,
        fit: tradeFormData.fit || 'Regular Fit',
        allowance: tradeFormData.allowance.trim() || null,
        size_chart_id: tradeFormData.size_chart_id ? parseInt(tradeFormData.size_chart_id, 10) : null,
        measurement_type: 'size', // US standard size chart only
        entry_methods: ['us_size_chart'], // Only US standard size exists
        base_price: tradeFormData.selling_price ? parseFloat(tradeFormData.selling_price) : 0,
        retail_sam_value: tradeFormData.cost_price ? parseFloat(tradeFormData.cost_price) : 0,
        materials: materialsStr,
        images: tradeFormData.image_url ? [tradeFormData.image_url.trim()] : [],
        remarks: [{ text: `[Trade Readymade] Color: ${tradeFormData.color} | Trader: ${tradeFormData.trader_name} | Art: ${finalArtNumber}`, images: [] }],
        // Strictly NO fabrics and trims assigned
        main_fabric: null,
        main_fabric_id: null,
        button_id: null,
        button_count: 0,
        thread_id: null,
        thread_count: 0,
        trims: [],
        attachment_fabrics: [],
        class_fabric_consumption: {},
        is_active: true
      };

      if (editingTradeItem) {
        await api.put(`/products/${editingTradeItem.id}`, payload);
        toast.success('Readymade (Trade) product updated!', { id: loadingToast });
      } else {
        await api.post('/products', payload);
        toast.success('Readymade (Trade) product registered!', { id: loadingToast });
      }

      setIsTradeModalOpen(false);
      fetchCatalogData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save trade product', { id: loadingToast });
    } finally {
      setIsTradeSubmitting(false);
    }
  };

  // --- DELETE ITEM ---
  const handleDeleteItem = async () => {
    if (!deleteConfirm.item) return;
    try {
      await api.delete(`/products/${deleteConfirm.item.id}`);
      toast.success('Item deleted successfully');
      setDeleteConfirm({ isOpen: false, item: null });
      fetchCatalogData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete item');
    }
  };

  // --- CATEGORY CRUD (FOR ACCESSORIES) ---
  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    const trimmedPrefix = (newCatPrefix.trim() || trimmedName.substring(0, 3)).toUpperCase();

    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error(`Category "${trimmedName}" already exists`);
      return;
    }

    setIsSavingCat(true);
    const loadingToast = toast.loading('Adding category...');
    try {
      let createdCat: AccessoryCategory;
      try {
        const res = await api.post('/inventory/accessory-categories', {
          name: trimmedName,
          code_prefix: trimmedPrefix
        });
        createdCat = res.data;
      } catch (apiErr) {
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

      if (isItemModalOpen) {
        handleFormCategoryChange(createdCat.name);
      }
    } catch (err: any) {
      toast.error('Failed to create category', { id: loadingToast });
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleStartEditCat = (cat: AccessoryCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatPrefix(cat.code_prefix);
  };

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

  const handleDeleteCategory = async (cat: AccessoryCategory) => {
    const itemsCount = categoryCounts[cat.name] || 0;
    if (itemsCount > 0) {
      toast.error(`Cannot delete category "${cat.name}". It is used by ${itemsCount} item(s).`);
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

  // Trade margin calculation helper
  const sellingNum = parseFloat(tradeFormData.selling_price) || 0;
  const costNum = parseFloat(tradeFormData.cost_price) || 0;
  const marginAmt = sellingNum - costNum;
  const marginPct = sellingNum > 0 ? ((marginAmt / sellingNum) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Tag size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Accessories & Trade Hub</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Uniform Accessories (Ties, Belts, Badges) & Vendor Readymade (Trade) Articles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={fetchCatalogData}
            disabled={isLoading}
            className="h-12 px-4 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh Catalog"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
            Sync
          </button>

          {/* + Category Button */}
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

          {/* Manage Categories */}
          <button 
            onClick={() => setIsManageCatModalOpen(true)}
            className="h-12 px-4 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-2xl font-black text-[11px] uppercase tracking-wider text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Customize & Edit Categories"
          >
            <SlidersHorizontal size={14} className="text-[#CC9448]" />
            Categories
          </button>

          {/* Add Accessory Button */}
          <button 
            onClick={handleOpenAddAccessory}
            className="h-12 px-5 bg-[#2d8d9b] hover:bg-[#236f7a] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#2d8d9b]/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            + Accessory
          </button>

          {/* Add Readymade (Trade) Button */}
          <button 
            onClick={handleOpenAddTrade}
            className="h-12 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-indigo-500/30"
          >
            <ShoppingBag size={16} />
            + Readymade (Trade)
          </button>
        </div>
      </div>

      {/* Catalog Main Tabs: All, Accessories, Readymade (Trade) */}
      <div className="flex items-center gap-3 p-1.5 bg-zinc-100/80 rounded-2xl w-fit border border-zinc-200/60 shadow-inner">
        <button
          onClick={() => setActiveCatalogTab('ALL')}
          className={`h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeCatalogTab === 'ALL'
              ? 'bg-white text-[#3a525d] shadow-md shadow-zinc-300/40'
              : 'text-zinc-500 hover:text-[#3a525d]'
          }`}
        >
          <span>All Articles</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeCatalogTab === 'ALL' ? 'bg-[#3a525d] text-white' : 'bg-zinc-200 text-zinc-600'}`}>
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveCatalogTab('ACCESSORIES')}
          className={`h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeCatalogTab === 'ACCESSORIES'
              ? 'bg-[#2d8d9b] text-white shadow-md shadow-[#2d8d9b]/25'
              : 'text-zinc-500 hover:text-[#2d8d9b]'
          }`}
        >
          <Tag size={14} />
          <span>Accessories</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeCatalogTab === 'ACCESSORIES' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
            {stats.accessoriesCount}
          </span>
        </button>

        <button
          onClick={() => setActiveCatalogTab('TRADE_READYMADE')}
          className={`h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeCatalogTab === 'TRADE_READYMADE'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-500 hover:text-indigo-600'
          }`}
        >
          <ShoppingBag size={14} />
          <span>Readymade (Trade)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeCatalogTab === 'TRADE_READYMADE' ? 'bg-white/25 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
            {stats.tradeCount}
          </span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20 shrink-0">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]/60">Total Catalog</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] mt-0.5">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20 shrink-0">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b]">Accessories</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#2d8d9b] mt-0.5">{stats.accessoriesCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-indigo-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Readymade (Trade)</p>
            <h3 className="text-2xl font-black italic tracking-tight text-indigo-700 mt-0.5">{stats.tradeCount}</h3>
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
      </div>

      {/* Dynamic Category Pills */}
      {activeCatalogTab !== 'TRADE_READYMADE' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-[#3a525d] text-white shadow-md shadow-[#3a525d]/20'
                : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'
            }`}
          >
            <span>All Categories</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
              {items.length}
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
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search items by name, SKU, vendor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] placeholder:text-zinc-400 focus:outline-none focus:border-[#2d8d9b] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
            <option value="Men">Men</option>
            <option value="Women">Women</option>
          </select>
        </div>
      </div>

      {/* Catalog Grid */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <RotateCw size={32} className="animate-spin text-[#2d8d9b]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#3a525d]/60">Loading catalog items...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => {
            const classification = getItemClassification(item);
            const isTrade = classification === 'TRADE_READYMADE';
            const currentCat = extractCategoryName(item);
            const tradeMeta = isTrade ? extractTradeMetadata(item) : null;

            return (
              <div 
                key={item.id}
                className={`bg-white rounded-[2rem] border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                  isTrade ? 'border-indigo-150 hover:border-indigo-300' : 'border-[#fce4d4] hover:border-[#2d8d9b]/40'
                }`}
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border ${
                        isTrade ? 'bg-indigo-50/60 border-indigo-100 text-indigo-600' : 'bg-zinc-50 border-zinc-100 text-[#2d8d9b]'
                      }`}>
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                        ) : isTrade ? (
                          <ShoppingBag size={22} className="text-indigo-500" />
                        ) : (
                          <Tag size={22} className="text-[#2d8d9b]/60" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-[#2d8d9b] uppercase tracking-wider block">
                            {item.art_number}
                          </span>
                          {isTrade ? (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-[9px] font-black uppercase tracking-wider">
                              Readymade (Trade)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 text-[#2d8d9b] rounded-md text-[9px] font-black uppercase tracking-wider">
                              Accessory
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-base text-[#3a525d] line-clamp-1 mt-1">
                          {item.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => isTrade ? handleOpenEditTrade(item) : handleOpenEditAccessory(item)}
                        className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-[#2d8d9b] transition-colors cursor-pointer"
                        title={isTrade ? "Edit Trade Product" : "Edit Accessory"}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ isOpen: true, item })}
                        className="p-2 hover:bg-red-50 rounded-xl text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Attributes Section */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2 text-xs">
                    
                    {/* Trader Name if Trade Product */}
                    {isTrade && tradeMeta?.trader_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 font-bold">Trader / Vendor:</span>
                        <span className="font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg text-[11px] border border-indigo-100">
                          🏢 {tradeMeta.trader_name}
                        </span>
                      </div>
                    )}

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

                    {/* Price and Margin */}
                    <div className="flex items-center justify-between pt-1 border-t border-dashed border-zinc-100">
                      <span className="text-zinc-400 font-bold">Selling Price:</span>
                      <div className="text-right">
                        <span className="font-black text-emerald-600 text-sm">
                          {item.base_price ? formatCurrency(item.base_price) : 'Quote-Based'}
                        </span>
                        {isTrade && item.retail_sam_value ? (
                          <div className="text-[10px] text-zinc-400 font-medium">
                            Cost: {formatCurrency(item.retail_sam_value)}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Margin Tag if Trade Product */}
                    {isTrade && item.base_price && item.retail_sam_value && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400 font-bold">Gross Margin:</span>
                        <span className="font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                          +{(((item.base_price - item.retail_sam_value) / item.base_price) * 100).toFixed(0)}% ({formatCurrency(item.base_price - item.retail_sam_value)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-400">
                  <span className="truncate max-w-[190px]">
                    {item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim() || (isTrade ? 'Vendor Traded Article' : 'Uniform Accessory')}
                  </span>
                  <a 
                    href={isTrade ? "/admin/inventory/product-stock" : "/admin/inventory/accessories-stock"}
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
              <ShoppingBag size={32} />
            </div>
            <p className="text-xl font-black italic text-[#3a525d]">
              No Articles Found
            </p>
            <p className="text-xs font-bold max-w-md text-zinc-500 leading-relaxed">
              Manage your ties, belts, badges, or vendor traded readymade products here.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button 
                onClick={handleOpenAddAccessory}
                className="px-5 py-2.5 bg-[#2d8d9b] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#236f7a] transition-all cursor-pointer"
              >
                + Add Accessory
              </button>
              <button 
                onClick={handleOpenAddTrade}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
              >
                + Add Readymade (Trade)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT ACCESSORY                                            */}
      {/* ========================================================================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white rounded-[2.5rem] border border-[#fce4d4] p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
            
            <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
              <div>
                <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d]">
                  {editingItem ? 'Edit Accessory' : 'Register New Accessory'}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1">
                  School Ties, Belts, Socks, Badges & Uniform Accessories
                </p>
              </div>
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAccessorySubmit} className="mt-6 space-y-4 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
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
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
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
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none font-mono"
                    />
                  </div>
                )}

                {/* Base Selling Price */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Quoted Selling Price (₹)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150.00"
                    value={formData.base_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Unit Cost Price (₹)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="e.g. 85.00"
                    value={formData.cost_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Image URL
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
                    Specifications & Description
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Material specs, school embroidery details, packaging notes..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                  />
                </div>
              </div>

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
                  className="px-6 py-2.5 bg-[#2d8d9b] hover:bg-[#236f7a] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Register Accessory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NEW / EDIT READYMADE (TRADE) PRODUCT                             */}
      {/* ========================================================================= */}
      {isTradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] border border-indigo-200 p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-indigo-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d]">
                      {editingTradeItem ? 'Edit Readymade (Trade) Article' : 'New Readymade (Trade) Product'}
                    </h3>
                    <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                      Option 1 Art No
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                    Vendor Procured Ready Garments • Option 1 Art Number • Standard Size Scaling • Zero Fabrics/Trims
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsTradeModalOpen(false)}
                className="w-10 h-10 rounded-2xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTradeSubmit} className="mt-6 space-y-6 max-h-[76vh] overflow-y-auto pr-2 scrollbar-thin">
              
              {/* ========================================================================= */}
              {/* SECTION 1: ART NUMBER ENGINE (MANUFACTURED SPEC - OPTION 1)               */}
              {/* ========================================================================= */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/60 via-zinc-50 to-indigo-50/40 rounded-2xl border border-indigo-150 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                      Art Number Engine (Manufactured-spec Option 1)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Format: [Prefix]-[Gender][Pattern]-[Fit][Allowance]
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {/* Dress Prefix */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Dress Prefix *
                    </label>
                    <select
                      required
                      value={tradeFormData.dress_prefix}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, dress_prefix: e.target.value }))}
                      className="w-full h-11 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Prefix</option>
                      {dresses.map(d => (
                        <option key={d.code} value={d.code}>[{d.code}] {d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Gender Code */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Gender Segment *
                    </label>
                    <select
                      required
                      value={tradeFormData.gender_code}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, gender_code: e.target.value }))}
                      className="w-full h-11 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      {genders.map(g => (
                        <option key={g.code} value={g.code}>[{g.code}] {g.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pattern Code */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Pattern Code *
                    </label>
                    <select
                      required
                      value={tradeFormData.pattern_code || nextPatternCode || '001'}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, pattern_code: e.target.value }))}
                      className="w-full h-11 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      {nextPatternCode && !patterns.some(p => p.code === nextPatternCode) && (
                        <option value={nextPatternCode}>[{nextPatternCode}] Auto Next</option>
                      )}
                      {patterns.map(p => (
                        <option key={p.code} value={p.code}>[{p.code}] {p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Base Fit */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Base Fit
                    </label>
                    <select
                      value={tradeFormData.fit}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, fit: e.target.value }))}
                      className="w-full h-11 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      {fitsList.length > 0 ? (
                        fitsList.map(f => (
                          <option key={f.code} value={f.name}>[{f.code}] {f.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Regular Fit">[R] Regular Fit</option>
                          <option value="Slim Fit">[S] Slim Fit</option>
                          <option value="Loose Fit">[L] Loose Fit</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Allowance */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Allowance (in)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5, 2, 1.5"
                      value={tradeFormData.allowance}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, allowance: e.target.value }))}
                      className="w-full h-11 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Generated Art Number Banner */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-900 via-[#2d4957] to-[#3a525d] rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200 block">
                      Generated Art Number (Official Option 1)
                    </span>
                    <span className="text-lg md:text-xl font-mono font-black tracking-wider text-white">
                      {computeTradeArtNumber || 'Select Dress & Gender to Preview...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-xs border border-white/20 rounded-lg text-[10px] font-black uppercase tracking-wider text-indigo-100">
                      Standard Size Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 2: GARMENT IDENTITY & DETAILS                                     */}
              {/* ========================================================================= */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-[#3a525d]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                    Garment Identity & Details
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Article Name */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Article / Product Name *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Poly-Cotton Bio-Washed Round Neck T-Shirt"
                      value={tradeFormData.name}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Garment Category / Product Type */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Garment Category / Product Type *
                    </label>
                    <select
                      value={tradeFormData.product_type_id}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, product_type_id: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Category / Type</option>
                      {productTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Trader / Vendor Source */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Trader / Vendor Source
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Supreme Garments / Tirupur Hub"
                      value={tradeFormData.trader_name}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, trader_name: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Garment Color / Shade with quick chips */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Garment Color / Shade
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Navy Blue, Heather Grey, White"
                      value={tradeFormData.color}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COLOR_PRESETS.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => selectTradeColor(col)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            tradeFormData.color === col 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image URL */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Product Image URL
                    </label>
                    <input 
                      type="url"
                      placeholder="https://..."
                      value={tradeFormData.image_url}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Specifications & Trader Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Specifications & Trader Reference Notes
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="180 GSM Bio-Washed Combed Cotton, shrink-free, trader reference invoice..."
                      value={tradeFormData.description}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 3: SIZING SPECIFICATIONS (US STANDARD SIZE ONLY)                  */}
              {/* ========================================================================= */}
              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                      Sizing Specifications (US Standard Size Chart Only)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[9px] font-black uppercase tracking-wider">
                    Bespoke Tailoring Disabled
                  </span>
                </div>

                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                  <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Standard Grading:</strong> Readymade trade products strictly use pre-graded US standard size charts. Custom individual body measurements and tailor-made measurement matrices are disabled for traded articles.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Linked US Size Chart */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Linked US Size Chart
                    </label>
                    <select
                      value={tradeFormData.size_chart_id}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, size_chart_id: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Preferred Chart</option>
                      {sizeCharts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.category.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Sample Size */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Base Sample Size
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. M, L, or 38"
                      value={tradeFormData.base_size}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, base_size: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Other Available Sizes (Multi-Entry + Quick Chips) */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                      Other Available Standard Sizes
                    </label>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold text-zinc-400 mr-1">Alpha:</span>
                        {SIZE_PRESETS_MULTI.map(sz => {
                          const active = tradeFormData.other_sizes?.split(',').map(s => s.trim()).includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleTradeQuickSize(sz)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                                active 
                                  ? 'bg-indigo-600 text-white shadow-xs scale-105'
                                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-indigo-300'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold text-zinc-400 mr-1">Numeric:</span>
                        {SIZE_PRESETS_NUMERIC.map(sz => {
                          const active = tradeFormData.other_sizes?.split(',').map(s => s.trim()).includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleTradeQuickSize(sz)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                active 
                                  ? 'bg-indigo-600 text-white shadow-xs scale-105'
                                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-indigo-300'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <MultiEntryInput
                      value={tradeFormData.other_sizes}
                      onChange={(newVal) => setTradeFormData(prev => ({ ...prev, other_sizes: newVal }))}
                      placeholder="Type custom size (e.g. 5XL) and press Enter"
                      buttonText="Add Size"
                    />
                  </div>

                  {/* Other Fits (Optional) */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                      Other Available Fits (Optional)
                    </label>
                    <MultiEntryInput
                      value={tradeFormData.other_fits}
                      onChange={(newVal) => setTradeFormData(prev => ({ ...prev, other_fits: newVal }))}
                      placeholder="Type a fit (e.g. Comfort Fit, Slim Fit) and press Enter"
                      buttonText="Add Fit"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 4: FABRICS & TRIMS CONFIGURATION (EXPLICITLY DISABLED / NONE)     */}
              {/* ========================================================================= */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-200/80 flex items-center justify-center text-zinc-500 shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                    Fabrics & Trims Assignment: Disabled
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    As a vendor-procured finished trade garment, this article does <strong>not</strong> assign raw fabric consumption (main or attachment fabrics) or sewing trims (buttons, thread cones, zippers). Finished unit quantities are tracked directly through trade purchasing.
                  </p>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 5: COMMERCIAL PRICING & MARGINS                                   */}
              {/* ========================================================================= */}
              <div className="p-5 bg-gradient-to-br from-zinc-50 to-indigo-50/30 rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                    Commercial Pricing & Trade Margin
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Purchase Cost */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Trader Purchase Cost (₹) *
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 180.00"
                      value={tradeFormData.cost_price}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Quoted Selling Price */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Quoted Selling Price (₹) *
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 290.00"
                      value={tradeFormData.selling_price}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* MOQ */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Minimum Order Qty (MOQ)
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 1 pc, 10 pcs"
                      value={tradeFormData.moq}
                      onChange={(e) => setTradeFormData(prev => ({ ...prev, moq: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Margin Calculation Card */}
                <div className="p-3 bg-white rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Percent size={15} className="text-indigo-600" />
                    <span className="text-xs font-bold text-zinc-600">Calculated Commercial Margin:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-500">
                      Markup: <span className="font-mono text-zinc-800">{formatCurrency(tradeMarginAmt > 0 ? tradeMarginAmt : 0)}</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                      parseFloat(tradeMarginPct) >= 25 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : parseFloat(tradeMarginPct) > 0 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {tradeMarginPct}% Gross Margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-4 border-t border-indigo-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTradeModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTradeSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTradeSubmitting ? 'Saving...' : editingTradeItem ? 'Save Trade Changes' : 'Register Trade Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD CATEGORY MODAL                                               */}
      {/* ========================================================================= */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-100 relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-xl font-black text-[#3a525d]">New Category</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Add custom accessory group</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddCatModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                  Category Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Scarf, Dupatta, Badge"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                  SKU Prefix (3-4 Letters)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. SCF, DPT, BDG"
                  value={newCatPrefix}
                  onChange={e => setNewCatPrefix(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-full text-xs font-mono font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCat || !newCatName.trim()}
                  className="px-5 py-2 bg-[#2d8d9b] hover:bg-[#236f7a] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCat ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MANAGE CATEGORIES MODAL                                          */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE ITEM CONFIRMATION                                         */}
      {/* ========================================================================= */}
      {deleteConfirm.isOpen && deleteConfirm.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-red-100 p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-3">
              <Trash2 size={24} />
            </div>
            <h4 className="text-lg font-black text-[#3a525d]">
              {getItemClassification(deleteConfirm.item) === 'TRADE_READYMADE' ? 'Delete Readymade Article?' : 'Delete Accessory?'}
            </h4>
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
