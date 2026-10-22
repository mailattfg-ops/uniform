'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Info,
  UploadCloud,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '@/lib/formatters';
import { DataTable, Column } from '@/components/ui/DataTable';

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

  const accentBg = colorTheme === 'indigo' ? 'hover:border-indigo-400 focus:border-indigo-500' : 'hover:border-[#2d8d9b] focus:border-[#2d8d9b]';
  const accentColor = colorTheme === 'indigo' ? 'text-indigo-600' : 'text-[#2d8d9b]';
  const dragActiveBorder = colorTheme === 'indigo' ? 'border-indigo-500 bg-indigo-50/50' : 'border-[#2d8d9b] bg-[#2d8d9b]/5';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
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
            colorTheme === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-[#2d8d9b]/10 text-[#2d8d9b]'
          }`}>
            <UploadCloud size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-[#3a525d]">
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
    category_name: 'Tie',
    color: '',
    gender: 'Unisex',
    sizing_mode: 'FREE_SIZE', // 'FREE_SIZE' | 'MULTI_SIZE'
    sizes: '28, 30, 32, 34',
    selling_price: '',
    cost_price: '',
    trader_name: '',
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

  const uniqueColours = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const col = extractItemColor(i);
      if (col) set.add(col);
    });
    return Array.from(set).sort();
  }, [items]);

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

      // Size filter
      if (filterSize !== 'ALL') {
        const itemSizes = (item.base_size || 'Free Size').toLowerCase();
        if (!itemSizes.includes(filterSize.toLowerCase())) {
          return false;
        }
      }

      // Colour filter
      if (filterColour !== 'ALL') {
        const itemColor = extractItemColor(item).toLowerCase();
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
          (item.base_size || '').toLowerCase().includes(term) ||
          meta.trader_name.toLowerCase().includes(term) ||
          meta.trade_category.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, activeCatalogTab, selectedCategory, genderFilter, filterSize, filterColour, searchTerm, categories, genders]);

  // --- UNIFIED ARTICLE MODAL ACTIONS ---
  const getPrefixForCategory = (catName: string): string => {
    const found = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return found?.code_prefix || catName.substring(0, 3).toUpperCase();
  };

  const handleOpenAddArticle = (defaultType?: 'ACCESSORY' | 'TRADE_READYMADE') => {
    const determinedType = defaultType 
      || (activeCatalogTab === 'TRADE_READYMADE' ? 'TRADE_READYMADE' : 'ACCESSORY');
    
    setEditingItem(null);
    setArticleType(determinedType);

    if (determinedType === 'TRADE_READYMADE') {
      const initialTradeCat = tradeCategories[0]?.name || 'T-Shirt';
      setArticleFormData({
        name: '',
        art_number: '',
        category_name: initialTradeCat,
        color: '',
        gender: 'Unisex',
        sizing_mode: 'MULTI_SIZE',
        sizes: 'S, M, L, XL, 2XL',
        selling_price: '',
        cost_price: '',
        trader_name: '',
        description: '',
        image_url: ''
      });
    } else {
      const initialCat = categories[0]?.name || 'Tie';
      const prefix = getPrefixForCategory(initialCat);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setArticleFormData({
        name: '',
        art_number: `ACC-${prefix}-${randomSuffix}`,
        category_name: initialCat,
        color: '',
        gender: 'Unisex',
        sizing_mode: 'FREE_SIZE',
        sizes: '28, 30, 32, 34',
        selling_price: '',
        cost_price: '',
        trader_name: '',
        description: '',
        image_url: ''
      });
    }
    setIsArticleModalOpen(true);
  };

  const handleOpenEditArticle = (item: AccessoryItem) => {
    setEditingItem(item);
    const isTrade = getItemClassification(item) === 'TRADE_READYMADE';
    setArticleType(isTrade ? 'TRADE_READYMADE' : 'ACCESSORY');

    const currentCat = extractCategoryName(item);
    const isMultiSize = !!(item.base_size && !item.base_size.toLowerCase().includes('free size'));

    if (isTrade) {
      const meta = extractTradeMetadata(item);
      setArticleFormData({
        name: item.name || '',
        art_number: item.art_number || '',
        category_name: meta.trade_category || currentCat || (tradeCategories[0]?.name || 'T-Shirt'),
        color: meta.colors || extractItemColor(item) || '',
        gender: item.gender || 'Unisex',
        sizing_mode: isMultiSize ? 'MULTI_SIZE' : 'FREE_SIZE',
        sizes: isMultiSize ? (item.base_size || 'S, M, L, XL, 2XL') : 'S, M, L, XL, 2XL',
        selling_price: item.base_price ? String(item.base_price) : '',
        cost_price: item.retail_sam_value ? String(item.retail_sam_value) : '',
        trader_name: meta.trader_name || '',
        description: meta.fabric_details || item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').replace(/Color:[^|]+\|?/i, '').replace(/Trader:[^|]+\|?/i, '').trim() || '',
        image_url: item.images?.[0] || ''
      });
    } else {
      setArticleFormData({
        name: item.name || '',
        art_number: item.art_number || '',
        category_name: currentCat || (categories[0]?.name || 'Tie'),
        color: extractItemColor(item) || '',
        gender: item.gender || 'Unisex',
        sizing_mode: isMultiSize ? 'MULTI_SIZE' : 'FREE_SIZE',
        sizes: isMultiSize ? (item.base_size || '28, 30, 32, 34') : '28, 30, 32, 34',
        selling_price: item.base_price ? String(item.base_price) : '',
        cost_price: item.retail_sam_value ? String(item.retail_sam_value) : '',
        trader_name: '',
        description: item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').replace(/Color:[^|]+\|?/i, '').trim() || '',
        image_url: item.images?.[0] || ''
      });
    }
    setIsArticleModalOpen(true);
  };

  const handlePrintAccessories = (sortedData: AccessoryItem[]) => {
    const dataToPrint = sortedData && sortedData.length > 0 ? sortedData : filteredItems;
    const rowsHtml = dataToPrint.map((item, idx) => {
      const rawRemark = item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim();
      const cleanMat = item.materials?.replace(/\[[^\]]+\]/g, '').trim();
      const desc = rawRemark || cleanMat || 'Uniform Accessory';

      const effectivePrice = (Number(item.base_price) > 0)
        ? Number(item.base_price)
        : (Number(item.retail_sam_value) > 0 ? Number(item.retail_sam_value) : null);

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: 700;">${item.name || '—'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${desc}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: 600;">${item.uom || 'Pcs'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 700;">${effectivePrice !== null ? formatCurrency(effectivePrice) : 'Quote-Based'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 700; font-family: monospace;">${formatQuantity(item.quantity ?? 0)} ${item.uom || 'Pcs'}</td>
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
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; }
    td { border: 1px solid #e2e8f0; padding: 8px 10px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>Accessories Catalog</h1>
  <p>Generated on ${new Date().toLocaleDateString('en-GB')} | Total Items: ${dataToPrint.length}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Item Name</th>
        <th>Description</th>
        <th style="text-align: center;">UOM</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Quantity</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
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

  const columns: Column<AccessoryItem>[] = [
    {
      header: 'Item Name',
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
            {item.images && item.images.length > 0 ? (
              <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Tag size={18} className="text-[#2d8d9b]" />
            )}
          </div>
          <div>
            <div className="font-bold text-[#3a525d] text-sm">{item.name}</div>
            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
              <span>{item.art_number}</span>
              {item.gender && (
                <span className="px-1.5 py-0.2 bg-zinc-100 rounded text-[10px] text-zinc-600">
                  {item.gender}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
      sortable: true,
      sortValue: (item) => item.name || ''
    },
    {
      header: 'Description',
      accessor: (item) => {
        const rawRemark = item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim();
        const cleanMat = item.materials?.replace(/\[[^\]]+\]/g, '').trim();
        const desc = rawRemark || cleanMat || 'Uniform Accessory';
        return (
          <div className="max-w-xs truncate text-xs text-zinc-600 font-medium" title={desc}>
            {desc}
          </div>
        );
      },
      sortable: true,
      sortValue: (item) => {
        const rawRemark = item.remarks?.[0]?.text?.replace(/\[[^\]]+\]/g, '').trim();
        const cleanMat = item.materials?.replace(/\[[^\]]+\]/g, '').trim();
        return rawRemark || cleanMat || 'Uniform Accessory';
      }
    },
    {
      header: 'UOM',
      accessor: (item) => (
        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold text-xs uppercase">
          {item.uom || 'Pcs'}
        </span>
      ),
      sortable: true,
      sortValue: (item) => item.uom || 'Pcs'
    },
    {
      header: 'Unit Price',
      accessor: (item) => {
        const effectivePrice = (Number(item.base_price) > 0)
          ? Number(item.base_price)
          : (Number(item.retail_sam_value) > 0 ? Number(item.retail_sam_value) : null);

        if (effectivePrice !== null) {
          return (
            <div className="flex flex-col">
              <span className="font-bold text-emerald-600 text-sm">
                {formatCurrency(effectivePrice)}
              </span>
              {!item.base_price && item.retail_sam_value ? (
                <span className="text-[10px] text-zinc-400 font-medium">Cost Price</span>
              ) : null}
            </div>
          );
        }

        return <span className="font-medium text-zinc-400 text-xs">Quote-Based</span>;
      },
      sortable: true,
      sortValue: (item) => Number(item.base_price || item.retail_sam_value || 0)
    },
    {
      header: 'Quantity',
      accessor: (item) => (
        <span className="font-bold text-zinc-700 text-xs font-mono">
          {formatQuantity(item.quantity ?? 0)}
        </span>
      ),
      sortable: true,
      sortValue: (item) => item.quantity ?? 0
    },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleOpenEditArticle(item)}
            className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-[#2d8d9b] transition-colors cursor-pointer"
            title="Edit Article"
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
      )
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

      const colorTag = articleFormData.color.trim() ? `[Color: ${articleFormData.color.trim()}]` : '';
      const catTag = `[Category: ${articleFormData.category_name.trim()}]`;

      let payload: any;

      if (isTrade) {
        const prefix = (articleFormData.category_name || 'TRD').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'TRD';
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const finalArtNumber = editingItem?.art_number || `TRD-${prefix}-${randomSuffix}`;

        const traderTag = articleFormData.trader_name.trim() ? `[Trader: ${articleFormData.trader_name.trim()}]` : '';
        const materialsStr = `[ProductType: trade_readymade] ${catTag} ${traderTag} ${colorTag} ${articleFormData.description.trim()}`.trim();

        payload = {
          name: articleFormData.name.trim(),
          art_number: finalArtNumber,
          category: 'trade_readymade',
          product_type: 'trade_readymade',
          gender: articleFormData.gender || 'Unisex',
          base_size: finalSizes,
          base_price: articleFormData.selling_price ? parseFloat(articleFormData.selling_price) : 0,
          retail_sam_value: articleFormData.cost_price ? parseFloat(articleFormData.cost_price) : 0,
          materials: materialsStr,
          images: articleFormData.image_url ? [articleFormData.image_url.trim()] : [],
          remarks: [{ 
            text: `[Trade Readymade] [Category: ${articleFormData.category_name}] ${articleFormData.color ? `Color: ${articleFormData.color} | ` : ''}${articleFormData.trader_name ? `Trader: ${articleFormData.trader_name} | ` : ''}${articleFormData.description.trim()}`, 
            images: [] 
          }],
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
      } else {
        const prefix = getPrefixForCategory(articleFormData.category_name);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const finalArtNumber = editingItem?.art_number || articleFormData.art_number?.trim() || `ACC-${prefix}-${randomSuffix}`;

        const remarksPayload = articleFormData.description.trim() 
          ? [{ text: `[${articleFormData.category_name}] ${articleFormData.color ? `Color: ${articleFormData.color} | ` : ''}${articleFormData.description.trim()}`, images: [] }]
          : [{ text: `[${articleFormData.category_name}] ${articleFormData.color ? `Color: ${articleFormData.color} | ` : ''}Accessory Item`, images: [] }];

        payload = {
          name: articleFormData.name.trim(),
          art_number: finalArtNumber,
          gender: articleFormData.gender,
          category: 'accessories',
          product_type: 'accessories',
          base_size: finalSizes,
          base_price: articleFormData.selling_price ? parseFloat(articleFormData.selling_price) : 0,
          retail_sam_value: articleFormData.cost_price ? parseFloat(articleFormData.cost_price) : 0,
          materials: `[ProductType: accessories] ${catTag} ${colorTag} ${articleFormData.category_name} Accessory`.trim(),
          images: articleFormData.image_url ? [articleFormData.image_url.trim()] : [],
          remarks: remarksPayload,
          is_active: true
        };
      }

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
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Accessories</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Accessories &amp; Readymade (Trade)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={fetchCatalogData}
            disabled={isLoading}
            className="h-14 px-5 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Refresh Catalog"
          >
            <RotateCw size={15} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
            Sync
          </button>

          <button 
            onClick={() => setIsManageCatModalOpen(true)}
            className="h-14 px-5 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Customize & Edit Categories"
          >
            <FolderPlus size={16} className="text-[#2d8d9b]" />
            Categories
          </button>

          <button 
            onClick={() => handleOpenAddArticle()}
            className="h-14 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#3a525d]/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} strokeWidth={3} />
            New Accessories
          </button>
        </div>
      </div>

      {/* Table Content */}
      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onSearch={setSearchTerm}
        onPrint={handlePrintAccessories}
        headerAction={
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <select
              value={activeCatalogTab}
              onChange={(e) => {
                setActiveCatalogTab(e.target.value as any);
                setSelectedCategory('ALL');
              }}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Types ({stats.total})</option>
              <option value="ACCESSORIES">Accessories ({stats.accessoriesCount})</option>
              <option value="TRADE_READYMADE">Readymade (Trade) ({stats.tradeCount})</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs max-w-[200px]"
            >
              <option value="ALL">All Categories</option>
              {displayedCategories.map(cat => {
                const count = categoryCounts[cat.name] || 0;
                return (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Genders</option>
              {uniqueGenders.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Size Filter */}
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Sizes</option>
              {uniqueSizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Colour Filter */}
            <select
              value={filterColour}
              onChange={(e) => setFilterColour(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Colours</option>
              {uniqueColours.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* UNIFIED MODAL: ADD / EDIT ARTICLE (ACCESSORY & READYMADE TRADE)          */}
      {/* ========================================================================= */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] border border-[#fce4d4] p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
            
            {/* Modal Header with Title & Type Toggle Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-zinc-100 gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  articleType === 'TRADE_READYMADE'
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                    : 'bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 text-[#2d8d9b]'
                }`}>
                  {articleType === 'TRADE_READYMADE' ? <ShoppingBag size={24} /> : <Tag size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d]">
                      {editingItem ? 'Edit Article' : 'New Catalog Article'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      articleType === 'TRADE_READYMADE'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20'
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
                        ? 'bg-[#2d8d9b] text-white shadow-md shadow-[#2d8d9b]/25'
                        : 'text-zinc-500 hover:text-[#3a525d]'
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
                        : 'text-zinc-500 hover:text-[#3a525d]'
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
              {/* Card 1: Article Identity */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className={articleType === 'TRADE_READYMADE' ? 'text-indigo-600' : 'text-[#2d8d9b]'} />
                    <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                      Article Identity
                    </span>
                  </div>
                  {articleType === 'ACCESSORY' && (
                    <span className="text-[10px] font-bold text-zinc-400">
                      SKU Code: <span className="font-mono font-black text-[#2d8d9b]">{articleFormData.art_number || 'Auto-generated'}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className={articleType === 'TRADE_READYMADE' ? 'md:col-span-2' : 'md:col-span-1'}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      {articleType === 'TRADE_READYMADE' ? 'Garment / Product Name *' : 'Accessory Name *'}
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder={articleType === 'TRADE_READYMADE' ? 'e.g. Poly-Cotton Round Neck T-Shirt, Corporate Blazer...' : 'e.g. Navy Striped Woven Tie, School Crest Badge...'}
                      value={articleFormData.name}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none ${
                        articleType === 'TRADE_READYMADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                      }`}
                    />
                  </div>

                  {/* Art Number (Only for Accessory) */}
                  {articleType === 'ACCESSORY' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                        Art Number / SKU Code
                      </label>
                      <input 
                        type="text"
                        value={articleFormData.art_number}
                        onChange={(e) => setArticleFormData(prev => ({ ...prev, art_number: e.target.value }))}
                        placeholder="ACC-TIE-1001"
                        className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Category Dropdown (Contextual) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        {articleType === 'TRADE_READYMADE' ? 'Trade Garment Category *' : 'Accessory Category *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAddCatType(articleType === 'TRADE_READYMADE' ? 'TRADE' : 'ACCESSORY');
                          setNewCatName('');
                          setNewCatPrefix('');
                          setIsAddCatModalOpen(true);
                        }}
                        className={`text-[10px] font-black uppercase tracking-wider hover:underline cursor-pointer ${
                          articleType === 'TRADE_READYMADE' ? 'text-indigo-600' : 'text-[#2d8d9b]'
                        }`}
                      >
                        + New
                      </button>
                    </div>
                    <select
                      value={articleFormData.category_name}
                      onChange={(e) => handleFormCategoryChange(e.target.value)}
                      className={`w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none cursor-pointer ${
                        articleType === 'TRADE_READYMADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                      }`}
                    >
                      {(articleType === 'TRADE_READYMADE' ? tradeCategories : categories).map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Gender */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Target Gender
                    </label>
                    <select
                      value={articleFormData.gender}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className={`w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none cursor-pointer ${
                        articleType === 'TRADE_READYMADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                      }`}
                    >
                      {uniqueGenders.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Trader Name (For Trade Product) */}
                  {articleType === 'TRADE_READYMADE' && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                        Trader / Vendor Source (Optional)
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Apex Apparel Hub Tirupur, Classic Uniform Suppliers..."
                        value={articleFormData.trader_name}
                        onChange={(e) => setArticleFormData(prev => ({ ...prev, trader_name: e.target.value }))}
                        className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Colour / Shade */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Colour / Shade
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Navy Blue, Sky Blue, Heather Grey, Bottle Green..."
                      value={articleFormData.color}
                      onChange={(e) => setArticleFormData(prev => ({ ...prev, color: e.target.value }))}
                      className={`w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none ${
                        articleType === 'TRADE_READYMADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                      }`}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COLOR_PRESETS.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setArticleFormData(prev => ({ ...prev, color: col }))}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            articleFormData.color === col 
                              ? (articleType === 'TRADE_READYMADE' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-[#2d8d9b] text-white shadow-xs')
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Sizing & Dimensions */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className={articleType === 'TRADE_READYMADE' ? 'text-indigo-600' : 'text-[#2d8d9b]'} />
                    <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                      Sizing & Fit Specification
                    </span>
                  </div>

                  {/* Sizing Mode Toggle */}
                  <div className="flex items-center p-1 bg-zinc-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setArticleFormData(prev => ({ ...prev, sizing_mode: 'FREE_SIZE' }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        articleFormData.sizing_mode === 'FREE_SIZE'
                          ? 'bg-white text-[#3a525d] shadow-sm font-black'
                          : 'text-zinc-500 hover:text-[#3a525d]'
                      }`}
                    >
                      Free Size
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticleFormData(prev => ({ ...prev, sizing_mode: 'MULTI_SIZE' }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        articleFormData.sizing_mode === 'MULTI_SIZE'
                          ? (articleType === 'TRADE_READYMADE' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#2d8d9b] text-white shadow-sm')
                          : 'text-zinc-500 hover:text-[#3a525d]'
                      }`}
                    >
                      Multiple Sizes
                    </button>
                  </div>
                </div>

                {articleFormData.sizing_mode === 'MULTI_SIZE' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                        Available Size Options (Comma-Separated)
                      </label>
                      <input 
                        type="text"
                        value={articleFormData.sizes}
                        onChange={(e) => setArticleFormData(prev => ({ ...prev, sizes: e.target.value }))}
                        placeholder={articleType === 'TRADE_READYMADE' ? 'S, M, L, XL, 2XL' : '28, 30, 32, 34, 36'}
                        className={`w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none ${
                          articleType === 'TRADE_READYMADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                        }`}
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                        Quick Add / Toggle Presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(articleType === 'TRADE_READYMADE' ? SIZE_PRESETS_MULTI : [...SIZE_PRESETS_NUMERIC, 'Free Size']).map(sz => {
                          const isSelected = articleFormData.sizes.split(',').map(s => s.trim()).includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleQuickSize(sz)}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                isSelected
                                  ? (articleType === 'TRADE_READYMADE' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-[#2d8d9b] text-white shadow-xs')
                                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    Universal standard single size (e.g. standard necktie length, adjustable belt, universal badge pin, free-size garment).
                  </p>
                )}
              </div>

              {/* Card 3: Pricing & Commercials */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                      Commercials & Profit Margin
                    </span>
                  </div>
                  {formMarginAmt > 0 && (
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} />
                      +₹{formMarginAmt.toFixed(2)} ({formMarginPct}% Margin)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Procurement Price */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Cost / Procurement Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="e.g. 150.00"
                        value={articleFormData.cost_price}
                        onChange={(e) => setArticleFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                        className="w-full h-11 pl-8 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                      Selling / Base Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="e.g. 290.00"
                        value={articleFormData.selling_price}
                        onChange={(e) => setArticleFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                        className="w-full h-11 pl-8 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Image & Specifications */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                <ImageUploadField
                  label={articleType === 'TRADE_READYMADE' ? 'Product Garment Image (Optional)' : 'Accessory Product Image (Optional)'}
                  value={articleFormData.image_url}
                  onChange={(val) => setArticleFormData(prev => ({ ...prev, image_url: val }))}
                  colorTheme={articleType === 'TRADE_READYMADE' ? 'indigo' : 'teal'}
                />

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                    Specifications & Description
                  </label>
                  <textarea 
                    rows={2}
                    placeholder={articleType === 'TRADE_READYMADE' ? 'Fabric composition, GSM, washcare, packaging specifications...' : 'Material composition, embroidery or crest details, dimensions...'}
                    value={articleFormData.description}
                    onChange={(e) => setArticleFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none ${
                      articleType === 'TRADE_READYMADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                    }`}
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
                  className={`px-6 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50 cursor-pointer ${
                    articleType === 'TRADE_READYMADE'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                      : 'bg-[#2d8d9b] hover:bg-[#236f7a] shadow-[#2d8d9b]/30'
                  }`}
                >
                  {isSubmitting 
                    ? 'Saving...' 
                    : editingItem 
                      ? 'Save Article Changes' 
                      : (articleType === 'TRADE_READYMADE' ? 'Register Readymade Product' : 'Register Accessory')}
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
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#fce4d4] relative space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  addCatType === 'TRADE' 
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-600' 
                    : 'bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 text-[#2d8d9b]'
                }`}>
                  {addCatType === 'TRADE' ? <ShoppingBag size={20} /> : <Tag size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#3a525d]">New Category</h3>
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
                    ? 'bg-[#2d8d9b] text-white shadow-md shadow-[#2d8d9b]/25'
                    : 'text-zinc-500 hover:text-[#3a525d]'
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
                    : 'text-zinc-500 hover:text-[#3a525d]'
                }`}
              >
                <ShoppingBag size={13} />
                <span>Trade Readymade</span>
              </button>
            </div>

            <form onSubmit={(e) => handleCreateCategory(e, addCatType)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                  {addCatType === 'TRADE' ? 'Garment Category Name *' : 'Accessory Category Name *'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={addCatType === 'TRADE' ? 'e.g. Polo T-Shirt, Round Neck Tee, Corporate Blazer...' : 'e.g. Scarf, Dupatta, Badge, Belt, Socks...'}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className={`w-full text-xs font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none transition-all ${
                    addCatType === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                  SKU Prefix (3-4 Letters)
                </label>
                <input 
                  type="text" 
                  placeholder={addCatType === 'TRADE' ? 'e.g. POL, RNK, BLZ' : 'e.g. SCF, DPT, BDG'}
                  value={newCatPrefix}
                  onChange={e => setNewCatPrefix(e.target.value.toUpperCase())}
                  maxLength={5}
                  className={`w-full text-xs font-mono font-bold text-[#3a525d] px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none transition-all ${
                    addCatType === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
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
                      : 'bg-[#2d8d9b] hover:bg-[#236f7a] shadow-[#2d8d9b]/30'
                  }`}
                >
                  {isSavingCat ? 'Creating...' : 'Create Category'}
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
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#fce4d4] relative space-y-5 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-zinc-100 flex items-center justify-center text-[#3a525d] border border-zinc-200">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#3a525d]">Manage Categories</h3>
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
                    ? 'bg-[#2d8d9b] text-white shadow-md shadow-[#2d8d9b]/25'
                    : 'text-zinc-500 hover:text-[#3a525d]'
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
                    : 'text-zinc-500 hover:text-[#3a525d]'
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
                manageCatTab === 'TRADE' ? 'text-indigo-600' : 'text-[#2d8d9b]'
              }`}>
                + Add {manageCatTab === 'TRADE' ? 'Readymade Garment' : 'Accessory'} Category
              </p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={manageCatTab === 'TRADE' ? 'Garment Category (e.g. Polo T-Shirt)' : 'Accessory Category (e.g. Scarf)'}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className={`flex-1 text-xs font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none ${
                    manageCatTab === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                  }`}
                />
                <input 
                  type="text" 
                  placeholder="Prefix"
                  value={newCatPrefix}
                  onChange={e => setNewCatPrefix(e.target.value.toUpperCase())}
                  maxLength={5}
                  className={`w-20 text-xs font-mono font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none ${
                    manageCatTab === 'TRADE' ? 'focus:border-indigo-500' : 'focus:border-[#2d8d9b]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleCreateCategory(undefined, manageCatTab)}
                  disabled={!newCatName.trim()}
                  className={`px-4 py-2 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer ${
                    manageCatTab === 'TRADE'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                      : 'bg-[#2d8d9b] hover:bg-[#236f7a] shadow-sm'
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
                        : 'bg-[#2d8d9b]/10 border-[#2d8d9b]/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={editCatName}
                          onChange={e => setEditCatName(e.target.value)}
                          placeholder="Category Name"
                          className="flex-1 text-xs font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none"
                        />
                        <input 
                          type="text" 
                          value={editCatPrefix}
                          onChange={e => setEditCatPrefix(e.target.value.toUpperCase())}
                          placeholder="Prefix"
                          maxLength={5}
                          className="w-20 text-xs font-mono font-bold text-[#3a525d] px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none"
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
                            manageCatTab === 'TRADE' ? 'bg-indigo-600' : 'bg-[#2d8d9b]'
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
                          : 'text-[#2d8d9b] bg-[#2d8d9b]/10'
                      }`}>
                        {cat.code_prefix}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-[#3a525d]">{cat.name}</p>
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
                          manageCatTab === 'TRADE' ? 'hover:text-indigo-600' : 'hover:text-[#2d8d9b]'
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
                className="px-6 py-2.5 bg-[#3a525d] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#2b3e47] transition-all"
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
