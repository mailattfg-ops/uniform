'use client';
import { Select } from '@/components/ui/Select';
import { formatDate } from '@/lib/formatters';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
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
  Info,
  UploadCloud,
  Camera,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '@/lib/formatters';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { DataTable, Column, SortInfo, HeaderGroupItem } from '@/components/ui/DataTable';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';

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
  uom?: string;
  quantity?: number;
  images?: string[];
  remarks?: any[];
  is_active?: boolean;
  created_at?: string;
  brand_name?: string | null;
  specification?: string | null;
  color?: string | null;
  shade_no?: string | null;
  size?: string | null;
  size_uom?: string | null;
  description?: string | null;
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

export const DEFAULT_TRADE_CATEGORY_ITEMS: AccessoryCategory[] = DEFAULT_TRADE_CATEGORIES.map((name, idx) => ({
  id: `trd-cat-${idx + 1}`,
  name,
  code_prefix: (name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'TRD').padEnd(3, 'X'),
  is_system: true
}));

const SIZE_PRESETS_MULTI = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const SIZE_PRESETS_NUMERIC = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
const COLOR_PRESETS = ['White', 'Navy Blue', 'Black', 'Heather Grey', 'Sky Blue', 'Maroon', 'Bottle Green', 'Beige', 'Royal Blue', 'Khaki'];

const LOCAL_STORAGE_CAT_KEY = 'forma_accessory_categories';
const LOCAL_STORAGE_TRADE_CAT_KEY = 'forma_trade_categories';

const parseArtNumber = (artNumber: string, dresses: any[], genders: any[], patterns: any[]) => {
  if (!artNumber) return { itemCode: '', specCode: '', dressCode: '', genderCode: '', patternCode: '', fitCode: '', allowance: '' };

  const parts = artNumber.split('-');

  // Standard format: [item][spec]-[gender][pattern]-[fit][allowance] (e.g. 1A-3053-R2, 4J-1012-R2)
  if (parts.length === 3) {
    const [rawItem, middle, lastPart] = parts;
    const fitMatch = lastPart.match(/^([A-Za-z]+)(.*)$/);
    let fitCode = '';
    let allowance = '';
    if (fitMatch && isNaN(Number(lastPart))) {
      fitCode = fitMatch[1].toUpperCase();
      allowance = fitMatch[2] ? fitMatch[2].trim() : '';
    }

    let genderCode = '';
    let patternCode = '';
    if (middle.length >= 2) {
      genderCode = middle.slice(0, 1);
      patternCode = middle.slice(1);
    } else {
      genderCode = middle;
    }

    let itemCode = rawItem;
    let specCode = '';
    const exactMatch = (dresses || []).find(d => d.code === rawItem);
    if (exactMatch) {
      itemCode = exactMatch.code;
    } else {
      const match = rawItem.match(/^([0-9a-zA-Z]+?)([A-Za-z])$/);
      if (match) {
        itemCode = match[1];
        specCode = match[2].toUpperCase();
      }
    }

    return { itemCode, specCode, dressCode: itemCode, genderCode, patternCode, fitCode, allowance };
  }

  // Fallback for 2-part legacy format
  if (parts.length === 2) {
    const isFirstDress = (dresses || []).some(d => d.code === parts[0]);
    if (isFirstDress) {
      const dressCode = parts[0];
      const rest = parts[1];
      for (const g of (genders || [])) {
        if (rest.startsWith(g.code)) {
          const remainder = rest.slice(g.code.length);
          return { itemCode: dressCode, specCode: '', dressCode, genderCode: g.code, patternCode: remainder, fitCode: '', allowance: '' };
        }
      }
    }
  }

  return { itemCode: '', specCode: '', dressCode: '', genderCode: '', patternCode: '', fitCode: '', allowance: '' };
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
          className="flex-1 h-10 bg-white border border-zinc-200 rounded-xl px-3 text-xs font-bold outline-none focus:border-indigo-500 text-zinc-800"
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

const ImageUploadField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  colorTheme?: 'teal' | 'indigo';
}> = ({ label, value, onChange, colorTheme = 'teal' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onChange(base64);
      toast.success('Image loaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const accentBg = colorTheme === 'indigo' ? 'hover:border-indigo-400 focus:border-indigo-500' : 'hover:border-[#C82A2B] focus:border-[#C82A2B]';
  const accentColor = colorTheme === 'indigo' ? 'text-indigo-600' : 'text-[#9E1B1D]';
  const dragActiveBorder = colorTheme === 'indigo' ? 'border-indigo-500 bg-indigo-50/50' : 'border-[#C82A2B] bg-[#FFF1F1]/50';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-700">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={11} /> Remove Image
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-4 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-xs shrink-0 flex items-center justify-center">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Check size={10} /> Image Attached
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Ready for catalog</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded-lg text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Camera size={13} className={accentColor} />
                <span>Replace Image</span>
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="h-8 px-3 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-6 px-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer text-center bg-zinc-50/60 ${
            isDragging ? dragActiveBorder : `border-zinc-200 ${accentBg}`
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-110 shadow-2xs ${
            colorTheme === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-[#FFF1F1] text-[#9E1B1D]'
          }`}>
            <UploadCloud size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-zinc-900">
              Click to browse or drag & drop image here
            </p>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              Supports PNG, JPG, JPEG, WEBP or GIF (max 5MB)
            </p>
          </div>
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
  const [filterSize, setFilterSize] = useState('ALL');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterColour, setFilterColour] = useState('ALL');
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

  // --- TRADE CATEGORIES STATE ---
  const [tradeCategories, setTradeCategories] = useState<AccessoryCategory[]>(DEFAULT_TRADE_CATEGORY_ITEMS);

  // --- UNIFIED ARTICLE MODAL STATE (Accessory vs Readymade Trade) ---
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [articleType, setArticleType] = useState<'ACCESSORY' | 'TRADE_READYMADE'>('ACCESSORY');
  const [editingItem, setEditingItem] = useState<AccessoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [articleFormData, setArticleFormData] = useState({
    name: '',
    art_number: '',
    category_name: 'T-Shirt',
    brand_name: '',
    specification: '',
    color: '',
    shade_no: '',
    size: 'M',
    size_uom: '',
    gender: 'Unisex',
    sizing_mode: 'MULTI_SIZE',
    sizes: 'S, M, L, XL, 2XL',
    selling_price: '',
    cost_price: '',
    trader_name: '',
    quantity: '0',
    uom: 'Pcs',
    description: '',
    image_url: ''
  });

  // --- CATEGORY MODALS & TABS ---
  const [manageCatTab, setManageCatTab] = useState<'ACCESSORY' | 'TRADE'>('ACCESSORY');
  const [addCatType, setAddCatType] = useState<'ACCESSORY' | 'TRADE'>('ACCESSORY');
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

    const rawRemark = item.remarks?.[0]?.text || '';
    const remarkColorMatch = !colorMatch ? rawRemark.match(/Color:\s*([^|\]]+)/i) : null;
    const remarkTraderMatch = !traderMatch ? rawRemark.match(/Trader:\s*([^|\]]+)/i) : null;
    
    const cleanSpecs = mat
      .replace(/\[ProductType:[^\]]+\]/gi, '')
      .replace(/\[Trader:[^\]]+\]/gi, '')
      .replace(/\[Category:[^\]]+\]/gi, '')
      .replace(/\[Color:[^\]]+\]/gi, '')
      .replace(/\[MOQ:[^\]]+\]/gi, '')
      .trim();

    return {
      trader_name: traderMatch ? traderMatch[1].trim() : (remarkTraderMatch ? remarkTraderMatch[1].trim() : ''),
      trade_category: catMatch ? catMatch[1].trim() : 'T-Shirt',
      colors: colorMatch ? colorMatch[1].trim() : (remarkColorMatch ? remarkColorMatch[1].trim() : ''),
      moq: moqMatch ? moqMatch[1].trim() : '1',
      fabric_details: cleanSpecs
    };
  };

  // Helper: Extract Colour strictly from database item data (materials tag or remarks)
  const extractItemColor = (item: AccessoryItem): string => {
    const mat = item.materials || '';
    const colorMatch = mat.match(/\[Color:\s*([^\]]+)\]/i);
    if (colorMatch && colorMatch[1]) return colorMatch[1].trim();

    const rawRemark = item.remarks?.[0]?.text || '';
    const remarkColorMatch = rawRemark.match(/Color:\s*([^|\]\n]+)/i);
    if (remarkColorMatch && remarkColorMatch[1]) return remarkColorMatch[1].trim();

    return '';
  };

  // Helper: Extract Size for any accessory or item strictly from database
  const extractItemSize = (item: AccessoryItem): string => {
    return item.base_size || 'Free Size';
  };

  // 1. Fetch Categories (Accessories & Trade)
  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/accessory-categories');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setCategories(res.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(res.data));
        }
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(LOCAL_STORAGE_CAT_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCategories(parsed);
            }
          } catch (e) {}
        }
      }
    }

    if (typeof window !== 'undefined') {
      const cachedTrade = localStorage.getItem(LOCAL_STORAGE_TRADE_CAT_KEY);
      if (cachedTrade) {
        try {
          const parsedTrade = JSON.parse(cachedTrade);
          if (Array.isArray(parsedTrade) && parsedTrade.length > 0) {
            setTradeCategories(parsedTrade);
          }
        } catch (e) {}
      }
    }
  };

  // 2. Fetch Catalog Items (Accessories + Readymade Trade) & Master Data
  const fetchCatalogData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, typeRes, masterRes, nextPatternRes, chartRes, stockRes] = await Promise.all([
        api.get('/products'),
        api.get('/product-types').catch(() => ({ data: [] })),
        api.get('/art-number-hub/master-data').catch(() => ({ data: { dresses: [], genders: [], patterns: [], fits: [] } })),
        api.get('/art-number-hub/patterns/next').catch(() => ({ data: { nextCode: '001' } })),
        api.get('/size-charts').catch(() => ({ data: [] })),
        api.get('/inventory/stock').catch(() => ({ data: { products: [] } })),
        fetchCategories()
      ]);

      setProductTypes(typeRes.data || []);
      setDresses(masterRes.data?.dresses || []);
      setGenders(masterRes.data?.genders || []);
      setPatterns(masterRes.data?.patterns || []);
      setFitsList(masterRes.data?.fits || []);
      setSizeCharts(chartRes.data || []);
      setNextPatternCode(nextPatternRes.data?.nextCode || '001');

      const stockProds: any[] = stockRes.data?.products || (Array.isArray(stockRes.data) ? stockRes.data : []);
      const stockQtyMap: Record<number, number> = {};
      stockProds.forEach((sp: any) => {
        const qty = Array.isArray(sp.stocks) 
          ? sp.stocks.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0) 
          : (Number(sp.quantity) || 0);
        stockQtyMap[sp.id] = qty;
      });

      const allProds: any[] = prodsRes.data || [];
      const relevantItems = allProds.filter((p: any) => {
        const mat = (p.materials || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const pType = (p.product_type || '').toLowerCase();
        
        const isAccessory = cat === 'accessories' || pType === 'accessories' || mat.includes('[producttype: accessories]');
        const isTrade = cat === 'trade_readymade' || cat === 'readymade_trade' || pType === 'trade_readymade' || pType === 'readymade_trade' || mat.includes('[producttype: trade_readymade]') || mat.includes('[producttype: readymade_trade]');
        
        return isAccessory || isTrade;
      }).map((p: any) => ({
        ...p,
        quantity: stockQtyMap[p.id] ?? 0,
        uom: p.uom || 'Pcs'
      }));

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

  // Memoized categories list matching active tab selection
  const displayedCategories = useMemo(() => {
    if (activeCatalogTab === 'TRADE_READYMADE') return tradeCategories;
    if (activeCatalogTab === 'ACCESSORIES') return categories;
    return [
      ...categories,
      ...tradeCategories.filter(tc => !categories.some(ac => ac.name.toLowerCase() === tc.name.toLowerCase()))
    ];
  }, [activeCatalogTab, tradeCategories, categories]);

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

  // Unique Genders sourced strictly from database (art_genders master table + item catalog)
  const uniqueGenders = useMemo(() => {
    const set = new Set<string>();
    // Master genders from database art_genders table
    (genders || []).forEach(g => {
      if (g.name) set.add(g.name);
    });
    // Genders from database items
    (items || []).forEach(i => {
      if (i.gender) set.add(i.gender);
    });
    return Array.from(set).sort();
  }, [genders, items]);

  const uniqueSizes = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.base_size) {
        i.base_size.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) set.add(trimmed);
        });
      } else {
        set.add('Free Size');
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const b = i.brand_name || extractTradeMetadata(i).trader_name;
      if (b && b.trim()) set.add(b.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueColours = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const col = i.color || extractItemColor(i);
      if (col && col.trim()) set.add(col.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  const categoryOptions = useMemo(() => {
    const list: { label: string; value: string; badge?: number }[] = [];
    const all = [...categories, ...tradeCategories];
    const seen = new Set<string>();
    all.forEach(c => {
      if (c.name && !seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase());
        const count = items.filter(it => extractCategoryName(it).toLowerCase() === c.name.toLowerCase()).length;
        list.push({ label: c.name, value: c.name, badge: count });
      }
    });
    return list;
  }, [categories, tradeCategories, items]);

  // Filtered List based on tab, category, gender, size, colour, search
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

      // Gender filter matching database genders
      if (genderFilter !== 'ALL') {
        const targetGender = genderFilter.toLowerCase();
        const itemGender = (item.gender || '').toLowerCase();
        const matchedGenderObj = (genders || []).find(g => 
          (g.name && g.name.toLowerCase() === targetGender) || 
          (g.code && g.code.toLowerCase() === targetGender)
        );
        const matchCode = matchedGenderObj?.code?.toLowerCase();
        const matchName = matchedGenderObj?.name?.toLowerCase();

        const matches = itemGender === targetGender || 
          (matchCode && itemGender === matchCode) || 
          (matchName && itemGender === matchName);

        if (!matches) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        const itemCat = extractCategoryName(item);
        if (itemCat.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Brand filter
      if (filterBrand !== 'ALL') {
        const itemBrand = (item.brand_name || extractTradeMetadata(item).trader_name || '').toLowerCase();
        if (itemBrand !== filterBrand.toLowerCase()) {
          return false;
        }
      }

      // Size filter
      if (filterSize !== 'ALL') {
        const itemSizes = (item.size || item.base_size || 'Free Size').toLowerCase();
        if (!itemSizes.includes(filterSize.toLowerCase())) {
          return false;
        }
      }

      // Colour filter
      if (filterColour !== 'ALL') {
        const itemColor = (item.color || extractItemColor(item) || '').toLowerCase();
        if (!itemColor.includes(filterColour.toLowerCase())) {
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
          (item.brand_name || '').toLowerCase().includes(term) ||
          (item.specification || '').toLowerCase().includes(term) ||
          (item.color || '').toLowerCase().includes(term) ||
          (item.shade_no || '').toLowerCase().includes(term) ||
          (item.base_size || '').toLowerCase().includes(term) ||
          meta.trader_name.toLowerCase().includes(term) ||
          meta.trade_category.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, activeCatalogTab, selectedCategory, genderFilter, filterBrand, filterSize, filterColour, searchTerm, categories, genders]);

  // --- UNIFIED ARTICLE MODAL ACTIONS ---
  const getPrefixForCategory = (catName: string): string => {
    const clean = (catName || '').toLowerCase().trim();
    if (clean.includes('t-shirt') || clean.includes('tshirt') || clean.includes('tee')) return 'TSH';
    if (clean.includes('cap') || clean.includes('hat')) return 'CAP';
    if (clean.includes('tie') || clean.includes('necktie') || clean.includes('bow')) return 'TIE';
    if (clean.includes('shoe') || clean.includes('footwear')) return 'SHO';
    if (clean.includes('belt')) return 'BLT';
    if (clean.includes('sock')) return 'SCK';
    if (clean.includes('badge') || clean.includes('crest')) return 'BDG';
    if (clean.includes('lanyard')) return 'LAN';
    if (clean.includes('scarf') || clean.includes('dupatta')) return 'SCF';
    if (clean.includes('bottle')) return 'BOT';
    const found = categories.find(c => c.name.toLowerCase() === clean);
    return found?.code_prefix || catName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'ACC';
  };

  const generateNextAccessoryCode = (catName: string): string => {
    const prefix = getPrefixForCategory(catName);
    let maxNum = 0;
    items.forEach(i => {
      const art = (i.art_number || '').toUpperCase();
      const match = art.match(new RegExp(`^(?:ACC-)?${prefix}-(\\d+)`, 'i'));
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  };

  const handleOpenAddArticle = (defaultType?: 'ACCESSORY' | 'TRADE_READYMADE') => {
    const determinedType = defaultType 
      || (activeCatalogTab === 'TRADE_READYMADE' ? 'TRADE_READYMADE' : 'ACCESSORY');
    
    setEditingItem(null);
    setArticleType(determinedType);

    const initialCat = determinedType === 'TRADE_READYMADE'
      ? (tradeCategories[0]?.name || 'T-Shirt')
      : (categories[0]?.name || 'Tie');
    const autoCode = generateNextAccessoryCode(initialCat);

    setArticleFormData({
      name: '',
      art_number: autoCode,
      category_name: initialCat,
      brand_name: '',
      specification: '',
      color: '',
      shade_no: '',
      size: determinedType === 'TRADE_READYMADE' ? 'M' : 'Free Size',
      size_uom: '',
      gender: 'Unisex',
      sizing_mode: determinedType === 'TRADE_READYMADE' ? 'MULTI_SIZE' : 'FREE_SIZE',
      sizes: determinedType === 'TRADE_READYMADE' ? 'S, M, L, XL, 2XL' : 'Free Size',
      selling_price: '',
      cost_price: '',
      trader_name: '',
      quantity: '0',
      uom: 'Pcs',
      description: '',
      image_url: ''
    });
    setIsArticleModalOpen(true);
  };

  const handleOpenEditArticle = (item: AccessoryItem) => {
    setEditingItem(item);
    const isTrade = getItemClassification(item) === 'TRADE_READYMADE';
    setArticleType(isTrade ? 'TRADE_READYMADE' : 'ACCESSORY');

    const currentCat = extractCategoryName(item);
    const isMultiSize = !!(item.base_size && !item.base_size.toLowerCase().includes('free size'));
    const meta = extractTradeMetadata(item);

    setArticleFormData({
      name: item.name || '',
      art_number: item.art_number || '',
      category_name: (isTrade ? meta.trade_category : null) || currentCat || (categories[0]?.name || 'Tie'),
      brand_name: item.brand_name || meta.trader_name || '',
      specification: item.specification || '',
      color: item.color || meta.colors || extractItemColor(item) || '',
      shade_no: item.shade_no || '',
      size: item.size || item.base_size || 'Free Size',
      size_uom: item.size_uom || '',
      gender: item.gender || 'Unisex',
      sizing_mode: isMultiSize ? 'MULTI_SIZE' : 'FREE_SIZE',
      sizes: item.base_size || (isMultiSize ? 'S, M, L, XL, 2XL' : 'Free Size'),
      selling_price: item.base_price ? String(item.base_price) : '',
      cost_price: item.retail_sam_value ? String(item.retail_sam_value) : '',
      trader_name: meta.trader_name || item.brand_name || '',
      quantity: item.quantity !== undefined ? String(item.quantity) : '0',
      uom: item.uom || 'Pcs',
      description: item.description || meta.fabric_details || item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').replace(/Color:[^|]+\|?/i, '').replace(/Trader:[^|]+\|?/i, '').trim() || '',
      image_url: item.images?.[0] || ''
    });
    setIsArticleModalOpen(true);
  };

  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintAccessories = (sortedData?: AccessoryItem[], sortInfo?: SortInfo<AccessoryItem>) => {
    const dataToPrint = sortedData && sortedData.length > 0 ? sortedData : filteredItems;
    const rowsHtml = dataToPrint.map((item, idx) => {
      const rawRemark = item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim();
      const cleanMat = item.materials?.replace(/\[[^\]]+\]/g, '').trim();
      const desc = item.description || rawRemark || cleanMat || '—';
      const effectivePrice = (Number(item.base_price) > 0)
        ? Number(item.base_price)
        : (Number(item.retail_sam_value) > 0 ? Number(item.retail_sam_value) : null);

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-family: monospace; font-weight: 800; color: #9E1B1D;">${item.art_number || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-weight: 600;">${extractCategoryName(item) || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-weight: 600;">${item.brand_name || extractTradeMetadata(item).trader_name || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-weight: 700;">${item.name || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${item.specification || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${item.color || extractItemColor(item) || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-family: monospace;">${item.shade_no || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-family: monospace;">${item.size || item.base_size || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${desc}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: 700; font-family: monospace;">${formatQuantity(item.quantity ?? 0)}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: 600;">${item.uom || 'Pcs'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: 700;">${effectivePrice ? formatCurrency(effectivePrice) : '—'}</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Accessories Catalog</title>
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
  <h1>Accessories Catalog</h1>
  <p>Generated on ${formatDate(new Date())} | Total Items: ${dataToPrint.length}${sortInfo?.headerLabel && sortInfo.headerLabel !== 'Default' ? ` | Sorted by: ${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending' : 'Descending'})` : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th>Acc No.</th>
        <th>Category</th>
        <th>Brand Name</th>
        <th>Item Name</th>
        <th>Specification</th>
        <th>Colour</th>
        <th>Shade No.</th>
        <th>Size</th>
        <th>Description</th>
        <th style="text-align: right;">Quantity</th>
        <th style="text-align: center;">UOM</th>
        <th style="text-align: right;">Rate</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="13" style="text-align:center; padding: 20px;">No accessories found</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 300);
    }
  };

  const headerGroups: HeaderGroupItem[] = [
    { header: 'ACC NO.', colSpan: 1 },
    { header: 'ITEM NAME', colSpan: 7, className: 'bg-[#FEF08A]/75 text-zinc-900 border-[#FACC15] font-black tracking-widest' },
    { header: 'DESCRIPTION', colSpan: 1 },
    { header: 'QUANTITY', colSpan: 1 },
    { header: 'UOM', colSpan: 1 },
    { header: 'RATE', colSpan: 1 },
    { header: 'ACTION', colSpan: 1 }
  ];

  const columns: Column<AccessoryItem>[] = [
    {
      header: 'Acc No.',
      accessor: 'art_number',
      className: 'font-black text-[#9E1B1D]',
      sortValue: (item) => item.art_number
    },
    {
      header: 'Category',
      accessor: (item) => (
        <span className="font-bold text-xs text-zinc-800">
          {extractCategoryName(item) || '—'}
        </span>
      ),
      sortable: true,
      sortValue: (item) => extractCategoryName(item) || ''
    },
    {
      header: 'Brand Name',
      accessor: (item) => (
        <span className="font-semibold text-xs text-zinc-700">
          {item.brand_name || extractTradeMetadata(item).trader_name || '—'}
        </span>
      ),
      sortable: true,
      sortValue: (item) => item.brand_name || extractTradeMetadata(item).trader_name || ''
    },
    {
      header: 'Item Name',
      accessor: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
            {item.images && item.images.length > 0 ? (
              <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Tag size={15} className="text-[#9E1B1D]" />
            )}
          </div>
          <div>
            <div className="font-bold text-zinc-900 text-xs">{item.name}</div>
          </div>
        </div>
      ),
      sortable: true,
      sortValue: (item) => item.name || ''
    },
    {
      header: 'Specification',
      accessor: (item) => (
        <span className="text-xs text-zinc-600 font-mono">
          {item.specification || '—'}
        </span>
      ),
      sortable: true,
      sortValue: (item) => item.specification || ''
    },
    {
      header: 'Colour',
      accessor: (item) => {
        const col = item.color || extractItemColor(item);
        return col ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-bold text-xs">
            <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: col.toLowerCase() }} />
            {col}
          </span>
        ) : <span className="text-zinc-400 text-xs">—</span>;
      },
      sortable: true,
      sortValue: (item) => item.color || extractItemColor(item) || ''
    },
    {
      header: 'Shade No.',
      accessor: (item) => (
        <span className="text-xs font-mono font-medium text-zinc-600">
          {item.shade_no || '—'}
        </span>
      ),
      sortable: true,
      sortValue: (item) => item.shade_no || ''
    },
    {
      header: 'Size',
      accessor: (item) => {
        const sz = item.size || item.base_size || '—';
        return <span className="font-bold text-xs text-zinc-800 font-mono">{sz}</span>;
      },
      sortable: true,
      sortValue: (item) => item.size || item.base_size || ''
    },
    {
      header: 'Description',
      accessor: (item) => {
        const rawRemark = item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim();
        const cleanMat = item.materials?.replace(/\[[^\]]+\]/g, '').trim();
        const desc = item.description || rawRemark || cleanMat || '—';
        return (
          <div className="max-w-xs truncate text-xs text-zinc-600 font-medium" title={desc}>
            {desc}
          </div>
        );
      },
      sortable: true,
      sortValue: (item) => item.description || ''
    },
    {
      header: 'Quantity',
      accessor: (item) => (
        <span className="font-black text-xs text-zinc-900 font-mono">
          {formatQuantity(item.quantity ?? 0)}
        </span>
      ),
      sortable: true,
      sortValue: (item) => item.quantity ?? 0
    },
    {
      header: 'UOM',
      accessor: (item) => (
        <span className="font-bold text-xs text-zinc-700 text-center">
          {item.uom || 'Pcs'}
        </span>
      ),
      sortable: true,
      sortValue: (item) => item.uom || 'Pcs'
    },
    {
      header: 'Rate',
      accessor: (item) => {
        const effectivePrice = (Number(item.base_price) > 0)
          ? Number(item.base_price)
          : (Number(item.retail_sam_value) > 0 ? Number(item.retail_sam_value) : null);

        return effectivePrice !== null ? (
          <span className="font-bold text-xs text-zinc-900">
            {formatCurrency(effectivePrice)}
          </span>
        ) : (
          <span className="font-medium text-zinc-400 text-xs">—</span>
        );
      },
      sortable: true,
      sortValue: (item) => Number(item.base_price || item.retail_sam_value || 0)
    },
    {
      header: 'Action',
      accessor: (item) => (
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => handleOpenEditArticle(item)}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-[#9E1B1D] transition-colors cursor-pointer"
            title="Edit Article"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={() => setDeleteConfirm({ isOpen: true, item })}
            className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Delete Item"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
      className: 'w-24'
    }
  ];
const handleSwitchArticleType = (newType: 'ACCESSORY' | 'TRADE_READYMADE') => {
    if (newType === articleType) return;
    setArticleType(newType);

    if (newType === 'TRADE_READYMADE') {
      const matchTradeCat = tradeCategories.find(c => c.name.toLowerCase() === articleFormData.category_name.toLowerCase());
      setArticleFormData(prev => ({
        ...prev,
        category_name: matchTradeCat ? matchTradeCat.name : (tradeCategories[0]?.name || 'T-Shirt'),
        sizing_mode: 'MULTI_SIZE',
        sizes: prev.sizes && !prev.sizes.includes('Free') ? prev.sizes : 'S, M, L, XL, 2XL'
      }));
    } else {
      const matchAccCat = categories.find(c => c.name.toLowerCase() === articleFormData.category_name.toLowerCase());
      const initialCat = matchAccCat ? matchAccCat.name : (categories[0]?.name || 'Tie');
      const prefix = getPrefixForCategory(initialCat);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setArticleFormData(prev => ({
        ...prev,
        category_name: initialCat,
        art_number: editingItem ? prev.art_number : `ACC-${prefix}-${randomSuffix}`,
        sizing_mode: 'FREE_SIZE',
        sizes: prev.sizes && prev.sizes.match(/\d+/) ? prev.sizes : '28, 30, 32, 34'
      }));
    }
  };

  const handleFormCategoryChange = (catName: string) => {
    if (articleType === 'ACCESSORY') {
      const prefix = getPrefixForCategory(catName);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setArticleFormData(prev => ({
        ...prev,
        category_name: catName,
        art_number: editingItem ? prev.art_number : `ACC-${prefix}-${randomSuffix}`
      }));
    } else {
      setArticleFormData(prev => ({
        ...prev,
        category_name: catName
      }));
    }
  };

  const toggleQuickSize = (sz: string) => {
    const current = articleFormData.sizes ? articleFormData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
    let updated: string[];
    if (current.includes(sz)) {
      updated = current.filter(s => s !== sz);
    } else {
      updated = [...current, sz];
    }
    setArticleFormData(prev => ({ ...prev, sizes: updated.join(', ') }));
  };

  // Price & margin preview calculations
  const formSelling = parseFloat(articleFormData.selling_price) || 0;
  const formCost = parseFloat(articleFormData.cost_price) || 0;
  const formMarginAmt = formSelling - formCost;
  const formMarginPct = formSelling > 0 ? ((formMarginAmt / formSelling) * 100).toFixed(1) : '0';

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleFormData.name.trim()) {
      toast.error('Article name is required');
      return;
    }

    setIsSubmitting(true);
    const isTrade = articleType === 'TRADE_READYMADE';
    const actionLabel = editingItem ? 'Updating' : 'Creating';
    const itemLabel = isTrade ? 'Readymade (Trade) product' : 'Accessory';
    const loadingToast = toast.loading(`${actionLabel} ${itemLabel}...`);

    try {
      const finalSizes = articleFormData.sizing_mode === 'FREE_SIZE' 
        ? 'Free Size' 
        : articleFormData.sizes.trim() || 'Free Size';

      const finalArtNumber = editingItem?.art_number || articleFormData.art_number.trim() || generateNextAccessoryCode(articleFormData.category_name);
      const brandVal = articleFormData.brand_name.trim() || articleFormData.trader_name.trim() || null;

      const payload = {
        name: articleFormData.name.trim(),
        art_number: finalArtNumber,
        category: isTrade ? 'trade_readymade' : 'accessories',
        product_type: isTrade ? 'trade_readymade' : 'accessories',
        gender: articleFormData.gender || 'Unisex',
        base_size: articleFormData.size || finalSizes,
        brand_name: brandVal,
        specification: articleFormData.specification.trim() || null,
        color: articleFormData.color.trim() || null,
        shade_no: articleFormData.shade_no.trim() || null,
        size: articleFormData.size || finalSizes,
        size_uom: articleFormData.size_uom.trim() || null,
        uom: articleFormData.uom || 'Pcs',
        quantity: articleFormData.quantity ? parseFloat(articleFormData.quantity) : 0,
        base_price: articleFormData.selling_price ? parseFloat(articleFormData.selling_price) : 0,
        retail_sam_value: articleFormData.cost_price ? parseFloat(articleFormData.cost_price) : 0,
        materials: `[ProductType: ${isTrade ? 'trade_readymade' : 'accessories'}] [Category: ${articleFormData.category_name}] ${articleFormData.color ? `[Color: ${articleFormData.color}] ` : ''}${brandVal ? `[Brand: ${brandVal}] ` : ''}${articleFormData.description.trim()}`.trim(),
        images: articleFormData.image_url ? [articleFormData.image_url.trim()] : [],
        remarks: [{
          text: `[Category: ${articleFormData.category_name}] ${articleFormData.color ? `Color: ${articleFormData.color} | ` : ''}${brandVal ? `Brand: ${brandVal} | ` : ''}${articleFormData.description.trim()}`,
          images: []
        }],
        is_active: true
      };

      if (editingItem) {
        await api.put(`/products/${editingItem.id}`, payload);
        toast.success(`${itemLabel} updated successfully!`, { id: loadingToast });
      } else {
        await api.post('/products', payload);
        toast.success(`${itemLabel} registered successfully!`, { id: loadingToast });
      }

      setIsArticleModalOpen(false);
      fetchCatalogData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || `Failed to save ${itemLabel}`, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
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

  // --- CATEGORY CRUD (FOR ACCESSORIES & TRADE) ---
  const handleCreateCategory = async (e?: React.FormEvent, forceType?: 'ACCESSORY' | 'TRADE') => {
    if (e) e.preventDefault();
    const targetType = forceType || (isManageCatModalOpen ? manageCatTab : addCatType);
    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    const trimmedPrefix = (newCatPrefix.trim() || trimmedName.substring(0, 3)).toUpperCase();

    if (targetType === 'TRADE') {
      if (tradeCategories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        toast.error(`Trade category "${trimmedName}" already exists`);
        return;
      }

      setIsSavingCat(true);
      const loadingToast = toast.loading('Adding trade category...');
      try {
        const newCat: AccessoryCategory = {
          id: `trd-${Date.now()}`,
          name: trimmedName,
          code_prefix: trimmedPrefix,
          is_system: false,
          created_at: new Date().toISOString()
        };

        const updated = [...tradeCategories, newCat];
        setTradeCategories(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_TRADE_CAT_KEY, JSON.stringify(updated));
        }

        toast.success(`Trade category "${trimmedName}" created!`, { id: loadingToast });
        setNewCatName('');
        setNewCatPrefix('');
        setIsAddCatModalOpen(false);

        if (isArticleModalOpen && articleType === 'TRADE_READYMADE') {
          handleFormCategoryChange(newCat.name);
        }
      } catch (err: any) {
        toast.error('Failed to create trade category', { id: loadingToast });
      } finally {
        setIsSavingCat(false);
      }
    } else {
      if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        toast.error(`Accessory category "${trimmedName}" already exists`);
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

        toast.success(`Accessory category "${trimmedName}" created!`, { id: loadingToast });
        setNewCatName('');
        setNewCatPrefix('');
        setIsAddCatModalOpen(false);

        if (isArticleModalOpen && articleType === 'ACCESSORY') {
          handleFormCategoryChange(createdCat.name);
        }
      } catch (err: any) {
        toast.error('Failed to create accessory category', { id: loadingToast });
      } finally {
        setIsSavingCat(false);
      }
    }
  };

  const handleStartEditCat = (cat: AccessoryCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatPrefix(cat.code_prefix);
  };

  const handleSaveEditCat = async (catId: string, isTrade: boolean = false) => {
    const trimmedName = editCatName.trim();
    const trimmedPrefix = editCatPrefix.trim().toUpperCase();
    if (!trimmedName) {
      toast.error('Category name cannot be empty');
      return;
    }

    const loadingToast = toast.loading('Saving category changes...');
    try {
      if (isTrade) {
        const updated = tradeCategories.map(c => 
          c.id === catId ? { ...c, name: trimmedName, code_prefix: trimmedPrefix || c.code_prefix } : c
        );
        setTradeCategories(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_TRADE_CAT_KEY, JSON.stringify(updated));
        }
      } else {
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
      }

      toast.success('Category updated successfully!', { id: loadingToast });
      setEditingCatId(null);
    } catch (err: any) {
      toast.error('Failed to update category', { id: loadingToast });
    }
  };

  const handleDeleteCategory = async (cat: AccessoryCategory, isTrade: boolean = false) => {
    const itemsCount = categoryCounts[cat.name] || 0;
    if (itemsCount > 0) {
      toast.error(`Cannot delete category "${cat.name}". It is used by ${itemsCount} item(s).`);
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete category "${cat.name}"?`);
    if (!confirmDelete) return;

    try {
      if (isTrade) {
        const updated = tradeCategories.filter(c => c.id !== cat.id);
        setTradeCategories(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_TRADE_CAT_KEY, JSON.stringify(updated));
        }
      } else {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Header - Matching Readymades, Fabric and Trim Standards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-800">Accessories</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1 opacity-70">
            Accessories &amp; Readymade (Trade)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">

          <button 
            onClick={() => handleOpenAddArticle()}
            className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} strokeWidth={3} />
            New Accessories
          </button>

          <PageActionsMenu
            onPrint={() => {
              if (printTriggerRef.current) {
                printTriggerRef.current();
              } else {
                handlePrintAccessories(filteredItems);
              }
            }}
            printLabel="Print Accessories"
            onUserReport={() => userReportTriggerRef.current?.()}
            userReportLabel="My Updated Report"
            extraActions={[
              {
                label: 'Category Management',
                description: 'Manage, rename & edit categories',
                onClick: () => setIsManageCatModalOpen(true),
                icon: <FolderPlus size={16} className="text-[#9E1B1D]" />
              },
              {
                label: 'Add Category',
                description: 'Create new accessory or trade category',
                onClick: () => {
                  setAddCatType(articleType === 'TRADE_READYMADE' ? 'TRADE' : 'ACCESSORY');
                  setNewCatName('');
                  setNewCatPrefix('');
                  setIsAddCatModalOpen(true);
                },
                icon: <Plus size={16} className="text-[#9E1B1D]" />
              }
            ]}
          />
        </div>
      </div>

      {/* Table Content */}
      {/* Yellow Filter Toolbar matching spreadsheet plan */}
        <div className="relative z-20 bg-[#FEF08A]/75 border-2 border-[#FACC15] rounded-2xl p-3 md:px-5 md:py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-900 shrink-0">
            <span className="px-3 py-1 bg-[#FACC15] text-zinc-950 font-black text-xs uppercase tracking-widest rounded-lg shadow-2xs">
              FILTER
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Category Filter */}
            <FilterDropdown
              label="Categories"
              allLabel={`All Categories (${items.length})`}
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              maxWidth="max-w-[190px]"
            />

            {/* Brand Filter */}
            <FilterDropdown
              label="Brand Name"
              allLabel="All Brands"
              value={filterBrand}
              onChange={setFilterBrand}
              options={uniqueBrands}
              maxWidth="max-w-[190px]"
            />

            {/* Colour Filter */}
            <FilterDropdown
              label="Colour"
              allLabel="All Colours"
              value={filterColour}
              onChange={setFilterColour}
              options={uniqueColours}
              maxWidth="max-w-[190px]"
            />

            {/* Size Filter */}
            <FilterDropdown
              label="Size"
              allLabel="All Sizes"
              value={filterSize}
              onChange={setFilterSize}
              options={uniqueSizes}
              maxWidth="max-w-[190px]"
            />

            {(selectedCategory !== 'ALL' || filterBrand !== 'ALL' || filterColour !== 'ALL' || filterSize !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setFilterBrand('ALL');
                  setFilterColour('ALL');
                  setFilterSize('ALL');
                }}
                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <DataTable
          headerGroups={headerGroups}
          columns={columns}
          data={filteredItems}
          isLoading={isLoading}
          searchPlaceholder="Search accessories"
          onSearch={setSearchTerm}
          onPrint={handlePrintAccessories}
          hideTablePrint={true}
          printTriggerRef={printTriggerRef}
          userReportTriggerRef={userReportTriggerRef}
        />

      {/* ========================================================================= */}
      {/* UNIFIED MODAL: ADD / EDIT ARTICLE (ACCESSORY & READYMADE TRADE)          */}
      {/* ========================================================================= */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] border border-zinc-200/80 p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
            {/* Top Brand Accent Rail */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />
            
            {/* Modal Header with Title & Type Toggle Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-zinc-100 gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  articleType === 'TRADE_READYMADE'
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                    : 'bg-[#FFF1F1] border border-[#C82A2B]/20 text-[#9E1B1D]'
                }`}>
                  {articleType === 'TRADE_READYMADE' ? <ShoppingBag size={24} /> : <Tag size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black italic tracking-tight text-zinc-900">
                      {editingItem ? 'Edit Article' : 'New Catalog Article'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      articleType === 'TRADE_READYMADE'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20'
                    }`}>
                      {articleType === 'TRADE_READYMADE' ? 'Readymade (Trade)' : 'Accessory'}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                    {articleType === 'TRADE_READYMADE'
                      ? 'Vendor Procured Ready Garments • Simple Details • No Art Number Required'
                      : 'Uniform Accessory Specifications (Ties, Belts, Badges, Socks, etc.)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Switcher Toggle Pill */}
                <div className="flex items-center p-1 bg-zinc-100 rounded-2xl border border-zinc-200/80">
                  <button
                    type="button"
                    onClick={() => handleSwitchArticleType('ACCESSORY')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      articleType === 'ACCESSORY'
                        ? 'bg-[#9E1B1D] text-white shadow-md shadow-[#9E1B1D]/25'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <Tag size={13} />
                    <span>Accessory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchArticleType('TRADE_READYMADE')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      articleType === 'TRADE_READYMADE'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <ShoppingBag size={13} />
                    <span>Readymade (Trade)</span>
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="w-10 h-10 rounded-2xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleArticleSubmit} className="mt-5 space-y-5 max-h-[74vh] overflow-y-auto pr-2 scrollbar-thin">
              {/* Card 1: Article Identity & Classification */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className={articleType === 'TRADE_READYMADE' ? 'text-indigo-600' : 'text-[#9E1B1D]'} />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-800">
                      Article Identity &amp; Classification
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">
                    SKU Code: <span className="font-mono font-black text-[#9E1B1D]">{articleFormData.art_number || 'Auto-generated'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Item Name *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder={articleType === 'TRADE_READYMADE' ? 'e.g. Premium Tees, Round Neck T-Shirt...' : 'e.g. Stripe Woven Tie, School Baseball Cap...'}
                      value={articleFormData.name}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    />
                  </div>

                  {/* Brand Name */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Brand Name / Trader
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Spinnex, Arihant, Forma, Wildcraft..."
                      value={articleFormData.brand_name || articleFormData.trader_name}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, brand_name: e.target.value, trader_name: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    />
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        Category *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAddCatType(articleType === 'TRADE_READYMADE' ? 'TRADE' : 'ACCESSORY');
                          setNewCatName('');
                          setNewCatPrefix('');
                          setIsAddCatModalOpen(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] hover:underline cursor-pointer"
                      >
                        + New
                      </button>
                    </div>
                    <Select
                      value={articleFormData.category_name}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        const newCode = editingItem ? articleFormData.art_number : generateNextAccessoryCode(newCat);
                        setArticleFormData(prev => ({ ...prev, category_name: newCat, art_number: newCode }));
                      }}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    >
                      {(articleType === 'TRADE_READYMADE' ? tradeCategories : categories).map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Art Number / SKU Code */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      ACC No. / Art Number
                    </label>
                    <input 
                      type="text"
                      value={articleFormData.art_number}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, art_number: e.target.value }))}
                      placeholder="e.g. TSH-0001, CAP-0001"
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-zinc-800 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 focus:outline-none"
                    />
                  </div>

                  {/* Specification */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Specification
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. MR220, 100% Cotton Bio-Wash, Woven Jacquard..."
                      value={articleFormData.specification}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, specification: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 focus:outline-none"
                    />
                  </div>

                  {/* Target Gender */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Target Gender
                    </label>
                    <Select
                      value={articleFormData.gender}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    >
                      {uniqueGenders.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Colour / Shade */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Colour
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Rama Blue, White, Black, Navy Blue..."
                      value={articleFormData.color}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COLOR_PRESETS.slice(0, 6).map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setArticleFormData(prev => ({ ...prev, color: col }))}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            articleFormData.color === col 
                              ? 'bg-[#C82A2B] text-white shadow-xs'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shade No. */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Shade No.
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 001, #104, D-22"
                      value={articleFormData.shade_no}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, shade_no: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-zinc-800 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Sizing & Dimensions */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className={articleType === 'TRADE_READYMADE' ? 'text-indigo-600' : 'text-[#9E1B1D]'} />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-800">
                      Sizing &amp; Dimensions
                    </span>
                  </div>

                  <div className="flex items-center p-1 bg-zinc-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setArticleFormData(prev => ({ ...prev, sizing_mode: 'FREE_SIZE', size: 'Free Size' }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        articleFormData.sizing_mode === 'FREE_SIZE'
                          ? 'bg-white text-zinc-800 shadow-sm font-black'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Free Size
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticleFormData(prev => ({ ...prev, sizing_mode: 'MULTI_SIZE' }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        articleFormData.sizing_mode === 'MULTI_SIZE'
                          ? 'bg-[#C82A2B] text-white shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Multiple Sizes / Dimension
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Size Value */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Size Dimension / Value
                    </label>
                    <input 
                      type="text"
                      value={articleFormData.size}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, size: e.target.value }))}
                      placeholder="e.g. M, 8, 44, Free Size"
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['S', 'M', 'L', 'XL', '2XL', '8', 'Free Size'].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setArticleFormData(prev => ({ ...prev, size: sz }))}
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            articleFormData.size === sz 
                              ? 'bg-[#C82A2B] text-white shadow-xs'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size UOM */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Size Unit (UOM)
                    </label>
                    <input 
                      type="text"
                      value={articleFormData.size_uom}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, size_uom: e.target.value }))}
                      placeholder="e.g. Inchs., Mtrs., Pcs"
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Inchs.', 'Mtrs.', 'Pcs', 'Pairs'].map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setArticleFormData(prev => ({ ...prev, size_uom: u }))}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            articleFormData.size_uom === u 
                              ? 'bg-zinc-800 text-white shadow-xs'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Commercials & Stock Inventory */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-800">
                      Pricing &amp; Inventory Balance
                    </span>
                  </div>
                  {formMarginAmt > 0 && (
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} />
                      +₹{formMarginAmt.toFixed(2)} ({formMarginPct}% Margin)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Selling Price / Rate */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Rate / Selling Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={articleFormData.selling_price}
                        onChange={(e) => setArticleFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                        className="w-full h-11 pl-8 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Procurement / Cost Price */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Cost Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={articleFormData.cost_price}
                        onChange={(e) => setArticleFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                        className="w-full h-11 pl-8 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Stock Quantity
                    </label>
                    <input 
                      type="number"
                      step="any"
                      placeholder="0"
                      value={articleFormData.quantity}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Inventory UOM */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                      Inventory UOM
                    </label>
                    <Select
                      value={articleFormData.uom}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, uom: e.target.value }))}
                      className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer focus:border-[#C82A2B]"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Pairs">Pairs</option>
                      <option value="Sets">Sets</option>
                      <option value="Mtrs">Mtrs</option>
                      <option value="Inchs">Inchs</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Card 4: Image & Description */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <ImageUploadField
                  label={articleType === 'TRADE_READYMADE' ? 'Product Garment Image (Optional)' : 'Accessory Product Image (Optional)'}
                  value={articleFormData.image_url}
                  onChange={(val) => setArticleFormData(prev => ({ ...prev, image_url: val }))}
                  colorTheme={articleType === 'TRADE_READYMADE' ? 'indigo' : 'teal'}
                />

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                    Specifications &amp; Description
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Extended notes, fabric weave, application or packaging notes..."
                    value={articleFormData.description}
                    onChange={(e) => setArticleFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50 cursor-pointer bg-[#C82A2B] hover:bg-[#A81D1E] shadow-[#C82A2B]/25 active:scale-95"
                >
                  {isSubmitting ? 'Saving...' : (editingItem ? 'Update Article' : 'Create Article')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD CATEGORY MODAL (ACCESSORIES & TRADE GARMENTS)               */}
      {/* ========================================================================= */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200/80 relative space-y-5 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Top Brand Accent Rail */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  addCatType === 'TRADE' 
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-600' 
                    : 'bg-[#FFF1F1] border border-[#C82A2B]/20 text-[#9E1B1D]'
                }`}>
                  {addCatType === 'TRADE' ? <ShoppingBag size={20} /> : <Tag size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">New Category</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {addCatType === 'TRADE' ? 'Add readymade garment group' : 'Add custom accessory group'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddCatModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-2xl w-full border border-zinc-200/80">
              <button
                type="button"
                onClick={() => setAddCatType('ACCESSORY')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  addCatType === 'ACCESSORY'
                    ? 'bg-[#9E1B1D] text-white shadow-md shadow-[#9E1B1D]/25'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Tag size={13} />
                <span>Accessory</span>
              </button>
              <button
                type="button"
                onClick={() => setAddCatType('TRADE')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  addCatType === 'TRADE'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <ShoppingBag size={13} />
                <span>Trade Readymade</span>
              </button>
            </div>

            <form onSubmit={(e) => handleCreateCategory(e, addCatType)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                  {addCatType === 'TRADE' ? 'Garment Category Name *' : 'Accessory Category Name *'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={addCatType === 'TRADE' ? 'e.g. Polo T-Shirt, Round Neck Tee, Corporate Blazer...' : 'e.g. Scarf, Dupatta, Badge, Belt, Socks...'}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className={`w-full text-xs font-bold text-zinc-800 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none transition-all ${
                    addCatType === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/10'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1.5">
                  SKU Prefix (3-4 Letters)
                </label>
                <input 
                  type="text" 
                  placeholder={addCatType === 'TRADE' ? 'e.g. POL, RNK, BLZ' : 'e.g. SCF, DPT, BDG'}
                  value={newCatPrefix}
                  onChange={e => setNewCatPrefix(e.target.value.toUpperCase())}
                  maxLength={5}
                  className={`w-full text-xs font-mono font-bold text-zinc-800 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none transition-all ${
                    addCatType === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/10'
                  }`}
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
                  className={`px-5 py-2 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer ${
                    addCatType === 'TRADE' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30' 
                      : 'bg-[#C82A2B] hover:bg-[#A81D1E] shadow-[#C82A2B]/20'
                  }`}
                >
                  {isSavingCat ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MANAGE CATEGORIES MODAL (ACCESSORIES & TRADE GARMENTS)           */}
      {/* ========================================================================= */}
      {isManageCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border border-zinc-200/80 relative space-y-5 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Top Brand Accent Rail */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 flex items-center justify-center text-white border border-zinc-800">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">Manage Categories</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Customize categories, SKU prefixes & delete unused tags.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setEditingCatId(null);
                  setIsManageCatModalOpen(false);
                }}
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Switcher for Accessory vs Trade Categories */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-2xl w-full border border-zinc-200/80">
              <button
                type="button"
                onClick={() => {
                  setEditingCatId(null);
                  setManageCatTab('ACCESSORY');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  manageCatTab === 'ACCESSORY'
                    ? 'bg-[#9E1B1D] text-white shadow-md shadow-[#9E1B1D]/25'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Tag size={13} />
                <span>Accessories</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  manageCatTab === 'ACCESSORY' ? 'bg-white/25 text-white' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  {categories.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingCatId(null);
                  setManageCatTab('TRADE');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  manageCatTab === 'TRADE'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <ShoppingBag size={13} />
                <span>Trade Readymade</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  manageCatTab === 'TRADE' ? 'bg-white/25 text-white' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  {tradeCategories.length}
                </span>
              </button>
            </div>

            {/* Quick Add Bar */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              manageCatTab === 'TRADE' 
                ? 'bg-indigo-50/50 border-indigo-200/80' 
                : 'bg-zinc-50 border-zinc-200/80'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                manageCatTab === 'TRADE' ? 'text-indigo-600' : 'text-[#9E1B1D]'
              }`}>
                + Add {manageCatTab === 'TRADE' ? 'Readymade Garment' : 'Accessory'} Category
              </p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={manageCatTab === 'TRADE' ? 'Garment Category (e.g. Polo T-Shirt)' : 'Accessory Category (e.g. Scarf)'}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className={`flex-1 text-xs font-bold text-zinc-800 px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none ${
                    manageCatTab === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/10'
                  }`}
                />
                <input 
                  type="text" 
                  placeholder="Prefix"
                  value={newCatPrefix}
                  onChange={e => setNewCatPrefix(e.target.value.toUpperCase())}
                  maxLength={5}
                  className={`w-20 text-xs font-mono font-bold text-zinc-800 px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none ${
                    manageCatTab === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleCreateCategory(undefined, manageCatTab)}
                  disabled={!newCatName.trim()}
                  className={`px-4 py-2 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer ${
                    manageCatTab === 'TRADE'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                      : 'bg-zinc-900 hover:bg-zinc-800 shadow-sm'
                  }`}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 scrollbar-thin">
              {(manageCatTab === 'TRADE' ? tradeCategories : categories).map(cat => {
                const count = categoryCounts[cat.name] || 0;
                const isEditing = editingCatId === cat.id;

                if (isEditing) {
                  return (
                    <div key={cat.id} className={`p-3 rounded-2xl border space-y-2 ${
                      manageCatTab === 'TRADE'
                        ? 'bg-indigo-50/70 border-indigo-200'
                        : 'bg-[#FFF1F1] border-[#C82A2B]/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={editCatName}
                          onChange={e => setEditCatName(e.target.value)}
                          placeholder="Category Name"
                          className="flex-1 text-xs font-bold text-zinc-800 px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none"
                        />
                        <input 
                          type="text" 
                          value={editCatPrefix}
                          onChange={e => setEditCatPrefix(e.target.value.toUpperCase())}
                          placeholder="Prefix"
                          maxLength={5}
                          className="w-20 text-xs font-mono font-bold text-zinc-800 px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none"
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
                          onClick={() => handleSaveEditCat(cat.id, manageCatTab === 'TRADE')}
                          className={`px-4 py-1.5 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm cursor-pointer flex items-center gap-1 ${
                            manageCatTab === 'TRADE' ? 'bg-indigo-600' : 'bg-[#C82A2B]'
                          }`}
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
                    className="flex items-center justify-between p-3 rounded-2xl border border-zinc-150 bg-white hover:border-zinc-300 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs font-black px-2 py-1 rounded-lg ${
                        manageCatTab === 'TRADE'
                          ? 'text-indigo-600 bg-indigo-50 border border-indigo-100'
                          : 'text-[#9E1B1D] bg-[#FFF1F1] border border-[#C82A2B]/20'
                      }`}>
                        {cat.code_prefix}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-zinc-800">{cat.name}</p>
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          {count} article{count === 1 ? '' : 's'} linked
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditCat(cat)}
                        className={`p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors cursor-pointer ${
                          manageCatTab === 'TRADE' ? 'hover:text-indigo-600' : 'hover:text-[#9E1B1D]'
                        }`}
                        title="Edit Name & Prefix"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat, manageCatTab === 'TRADE')}
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
                className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-zinc-800 transition-all"
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
            <h4 className="text-lg font-black text-zinc-900">
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
