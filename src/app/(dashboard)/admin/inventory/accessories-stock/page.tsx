'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ChevronRight, RotateCcw, X } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { FilterDropdown } from '@/components/ui/FilterDropdown';

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
const STATUS_META: Record<StockStatus, { label: string; pill: string; text: string; row: string }> = {
  IN_STOCK: { label: 'In Stock', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-600', row: '' },
  LOW_STOCK: { label: 'Low Stock', pill: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-600', row: 'bg-amber-50/30' },
  OUT_OF_STOCK: { label: 'Out of Stock', pill: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-600', row: 'bg-rose-50/30' },
};

interface StockRecord {
  id: number;
  product_id: number;
  size: string;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  materials?: string;
  category?: string;
  product_type?: string;
  base_size?: string | null;
  base_price?: number | null;
  images?: string[];
  remarks?: any[];
  brand_name?: string | null;
  specification?: string | null;
  color?: string | null;
  shade_no?: string | null;
  size?: string | null;
  stocks: StockRecord[];
}

interface AccessoryCategory {
  id: string;
  name: string;
  code_prefix: string;
}

interface StockRow {
  id: string;
  product: Product;
  size: string;
  stock?: StockRecord;
  fullName: string;
  available: number;
  status: StockStatus;
}

// Same defaults as the Accessories Items page (used until categories load from API / cache)
const DEFAULT_ACCESSORY_CATEGORIES: AccessoryCategory[] = [
  { id: 'cat-tie', name: 'Tie', code_prefix: 'TIE' },
  { id: 'cat-belt', name: 'Belt', code_prefix: 'BLT' },
  { id: 'cat-socks', name: 'Socks', code_prefix: 'SCK' },
  { id: 'cat-badge', name: 'Badge / Crest', code_prefix: 'BDG' },
  { id: 'cat-cap', name: 'Cap / Hat', code_prefix: 'CAP' },
  { id: 'cat-lanyard', name: 'Lanyard / ID Card', code_prefix: 'LAN' },
  { id: 'cat-scarf', name: 'Scarf / Dupatta', code_prefix: 'SCF' },
  { id: 'cat-bottle', name: 'Water Bottle / Lunchbox', code_prefix: 'BOT' },
  { id: 'cat-other', name: 'Other Accessory', code_prefix: 'ACC' }
];

// Helpers mirrored from the Accessories Items page so names and filters match exactly
const extractTraderName = (item: Product): string => {
  const mat = item.materials || '';
  const traderMatch = mat.match(/\[Trader:\s*([^\]]+)\]/i);
  if (traderMatch) return traderMatch[1].trim();
  const rawRemark = item.remarks?.[0]?.text || '';
  const remarkTraderMatch = rawRemark.match(/Trader:\s*([^|\]]+)/i);
  return remarkTraderMatch ? remarkTraderMatch[1].trim() : '';
};

const extractTradeColors = (item: Product): string => {
  const mat = item.materials || '';
  const colorMatch = mat.match(/\[Color:\s*([^\]]+)\]/i);
  if (colorMatch) return colorMatch[1].trim();
  const rawRemark = item.remarks?.[0]?.text || '';
  const remarkColorMatch = rawRemark.match(/Color:\s*([^|\]]+)/i);
  return remarkColorMatch ? remarkColorMatch[1].trim() : '';
};

const extractItemColor = (item: Product): string => {
  const mat = item.materials || '';
  const colorMatch = mat.match(/\[Color:\s*([^\]]+)\]/i);
  if (colorMatch && colorMatch[1]) return colorMatch[1].trim();
  const rawRemark = item.remarks?.[0]?.text || '';
  const remarkColorMatch = rawRemark.match(/Color:\s*([^|\]\n]+)/i);
  if (remarkColorMatch && remarkColorMatch[1]) return remarkColorMatch[1].trim();
  return '';
};

const isTradeItem = (item: Product): boolean => {
  const cat = (item.category || '').toLowerCase();
  const pType = (item.product_type || '').toLowerCase();
  const mat = (item.materials || '').toLowerCase();
  return cat === 'trade_readymade' || cat === 'readymade_trade' || pType === 'trade_readymade' || pType === 'readymade_trade' ||
    mat.includes('[producttype: trade_readymade]') || mat.includes('[producttype: readymade_trade]');
};

export default function AccessoriesStockPage() {
  const [accessories, setAccessories] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [categories, setCategories] = useState<AccessoryCategory[]>(DEFAULT_ACCESSORY_CATEGORIES);
  const [genders, setGenders] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterColour, setFilterColour] = useState('ALL');
  const [filterSize, setFilterSize] = useState('ALL');

  // Adjustment Modal
  const [selectedAccessory, setSelectedAccessory] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingSize, setAdjustingSize] = useState<string>('Free Size');
  const [adjustmentAction, setAdjustmentAction] = useState<'REPLENISH' | 'CONSUME'>('REPLENISH');
  const [inputDelta, setInputDelta] = useState<string>('10');
  const [newThreshold, setNewThreshold] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const [res, catRes, masterRes] = await Promise.all([
        api.get('/inventory/stock'),
        api.get('/inventory/accessory-categories').catch(() => ({ data: [] })),
        api.get('/art-number-hub/master-data').catch(() => ({ data: { genders: [] } }))
      ]);
      const allProducts: any[] = res.data?.products || [];

      // Filter strictly for accessories
      const accessoryItems = allProducts.filter((p: any) => {
        const mat = (p.materials || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const pType = (p.product_type || '').toLowerCase();
        return cat === 'accessories' || pType === 'accessories' || mat.includes('[producttype: accessories]');
      });

      setAccessories(accessoryItems);
      setGenders(masterRes.data?.genders || []);

      if (catRes.data && Array.isArray(catRes.data) && catRes.data.length > 0) {
        setCategories(catRes.data);
      } else if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('forma_accessory_categories');
        if (cached) {
          try { setCategories(JSON.parse(cached)); } catch (e) {}
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load accessory inventory levels.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // Same category resolution as the Accessories Items page
  const extractCategoryName = (item: Product): string => {
    const matchMat = (item.materials || '').match(/\[Category:\s*([^\]]+)\]/i);
    if (matchMat && matchMat[1]) return matchMat[1].trim();

    const rawRemark = item.remarks?.[0]?.text || '';
    const matchRemark = rawRemark.match(/\[([^\]]+)\]/);
    if (matchRemark && matchRemark[1] && !matchRemark[1].toLowerCase().includes('producttype')) {
      return matchRemark[1].trim();
    }

    if (isTradeItem(item)) return 'Trade Readymade';

    const found = categories.find(c => item.name.toLowerCase().includes(c.name.toLowerCase()));
    if (found) return found.name;

    return 'Other Accessory';
  };

  // Same "Item Name" format as the Accessories Items table
  const getItemFullName = (item: Product) => {
    const cat = extractCategoryName(item);
    const brand = item.brand_name || extractTraderName(item);
    const col = item.color || extractTradeColors(item) || extractItemColor(item);
    const shade = item.shade_no ? `Shade ${item.shade_no}` : null;
    // Each row is one size and shows it as a tag, so a multi-size list is left out of the name
    const rawSz = item.size || item.base_size || '';
    const sz = rawSz && !rawSz.includes(',') ? rawSz : null;

    return [cat, brand, item.name, item.specification, col, shade, sz]
      .map(val => (val || '').trim())
      .filter(val => val && val !== '—')
      .join(' ') || item.name || '—';
  };

  // One row per accessory-size, so per-size stock levels are visible
  const rows = useMemo<StockRow[]>(() => {
    const out: StockRow[] = [];
    accessories.forEach(product => {
      const rawSizes = product.base_size
        ? product.base_size.split(',').map(s => s.trim()).filter(Boolean)
        : ['Free Size'];
      const sizes = rawSizes.length > 0 ? rawSizes : ['Free Size'];
      const fullName = getItemFullName(product);

      sizes.forEach(sz => {
        const stock = product.stocks?.find(s => s.size === sz);
        const physical = stock?.quantity || 0;
        const reserved = stock?.reserved_quantity || 0;
        const available = Math.max(0, physical - reserved);
        const threshold = stock?.low_stock_threshold ?? 5;
        const status: StockStatus = available <= 0 ? 'OUT_OF_STOCK' : available <= threshold ? 'LOW_STOCK' : 'IN_STOCK';
        out.push({ id: `${product.id}-${sz}`, product, size: sz, stock, fullName, available, status });
      });
    });
    return out;
  }, [accessories, categories]);

  // Filter options (same sources as the Accessories Items table)
  const uniqueGenders = useMemo(() => {
    const set = new Set<string>();
    (genders || []).forEach(g => { if (g.name) set.add(g.name); });
    accessories.forEach(i => { if (i.gender) set.add(i.gender); });
    return Array.from(set).sort();
  }, [genders, accessories]);

  const uniqueSizes = useMemo(() => {
    const set = new Set<string>();
    accessories.forEach(i => {
      if (i.base_size) {
        i.base_size.split(',').forEach(s => { const t = s.trim(); if (t) set.add(t); });
      } else {
        set.add('Free Size');
      }
    });
    return Array.from(set).sort();
  }, [accessories]);

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    accessories.forEach(i => {
      const b = i.brand_name || extractTraderName(i);
      if (b && b.trim()) set.add(b.trim());
    });
    return Array.from(set).sort();
  }, [accessories]);

  const uniqueColours = useMemo(() => {
    const set = new Set<string>();
    accessories.forEach(i => {
      const col = i.color || extractItemColor(i);
      if (col && col.trim()) set.add(col.trim());
    });
    return Array.from(set).sort();
  }, [accessories]);

  const categoryOptions = useMemo(() => {
    const list: { label: string; value: string; badge?: number }[] = [];
    const seen = new Set<string>();
    categories.forEach(c => {
      if (c.name && !seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase());
        const count = accessories.filter(it => extractCategoryName(it).toLowerCase() === c.name.toLowerCase()).length;
        list.push({ label: c.name, value: c.name, badge: count });
      }
    });
    return list;
  }, [categories, accessories]);

  // Item-level filters (same matching logic as the Accessories Items table); size matches the row's size
  const itemFilteredRows = useMemo(() => {
    return rows.filter(r => {
      const item = r.product;

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

      if (selectedCategory !== 'ALL' && extractCategoryName(item).toLowerCase() !== selectedCategory.toLowerCase()) return false;

      if (filterBrand !== 'ALL') {
        const itemBrand = (item.brand_name || extractTraderName(item) || '').toLowerCase();
        if (itemBrand !== filterBrand.toLowerCase()) return false;
      }

      if (filterSize !== 'ALL' && r.size.toLowerCase() !== filterSize.toLowerCase()) return false;

      if (filterColour !== 'ALL') {
        const itemColor = (item.color || extractItemColor(item) || '').toLowerCase();
        if (!itemColor.includes(filterColour.toLowerCase())) return false;
      }

      return true;
    });
  }, [rows, genders, genderFilter, selectedCategory, filterBrand, filterSize, filterColour, categories]);

  const statusCounts = useMemo(() => {
    const c = { IN_STOCK: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 };
    itemFilteredRows.forEach(r => { c[r.status]++; });
    return c;
  }, [itemFilteredRows]);

  const filteredRows = useMemo(
    () => itemFilteredRows.filter(r => filterStatus === 'ALL' || r.status === filterStatus),
    [itemFilteredRows, filterStatus]
  );

  const hasActiveFilters = selectedCategory !== 'ALL' || genderFilter !== 'ALL' || filterBrand !== 'ALL' ||
    filterColour !== 'ALL' || filterSize !== 'ALL' || filterStatus !== 'ALL';

  const handleOpenAdjust = (product: Product, sizeToAdjust: string) => {
    setSelectedAccessory(product);
    setAdjustingSize(sizeToAdjust);
    setAdjustmentAction('REPLENISH');
    setInputDelta('10');

    const matchedStock = product.stocks?.find(s => s.size === sizeToAdjust);
    setNewThreshold(matchedStock?.low_stock_threshold ?? 5);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccessory) return;

    const deltaNum = parseFloat(inputDelta);
    if (isNaN(deltaNum) || deltaNum <= 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }

    setIsSubmitting(true);
    const finalDelta = adjustmentAction === 'REPLENISH' ? deltaNum : -deltaNum;
    const loadingToast = toast.loading(`Updating ${selectedAccessory.name} (${adjustingSize})...`);

    try {
      const payload = {
        product_id: selectedAccessory.id,
        size: adjustingSize,
        quantity_delta: finalDelta,
        low_stock_threshold: newThreshold
      };

      await api.post('/inventory/stock/adjust', payload);

      toast.success('Accessory stock updated successfully!', { id: loadingToast });
      setIsAdjustModalOpen(false);
      fetchStockData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to adjust stock', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<StockRow>[] = [
    {
      header: 'ID',
      accessor: (r) => <span className="text-xs font-black text-[#9E1B1D] whitespace-nowrap">{r.product.art_number || '—'}</span>,
      sortable: true,
      sortValue: (r) => r.product.art_number || '',
    },
    {
      header: 'Item Name',
      accessor: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-zinc-900 text-xs truncate max-w-[360px]" title={r.fullName}>{r.fullName}</span>
          <span className="shrink-0 inline-block text-[10px] font-black text-[#9E1B1D] bg-[#FFF1F1] px-2 py-0.5 rounded-md whitespace-nowrap">{r.size}</span>
        </div>
      ),
      sortable: true,
      sortValue: (r) => `${r.fullName} ${r.size}`,
    },
    {
      header: 'Available Stock',
      className: 'text-right',
      accessor: (r) => <span className={`font-mono text-xs font-black ${STATUS_META[r.status].text}`}>{r.available}</span>,
      sortable: true,
      sortValue: (r) => r.available,
    },
    {
      header: 'Status',
      className: 'text-center',
      accessor: (r) => {
        const meta = STATUS_META[r.status];
        return <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${meta.pill}`}>{meta.label}</span>;
      },
      sortable: true,
      sortValue: (r) => r.status,
    },
    {
      header: 'Action',
      className: 'text-center',
      accessor: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleOpenAdjust(r.product, r.size); }}
          className={r.stock
            ? 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white text-[#C82A2B] border border-[#C82A2B]/30 hover:bg-[#FFF1F1] transition-all cursor-pointer whitespace-nowrap'
            : 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white transition-all cursor-pointer whitespace-nowrap'}
        >
          {r.stock ? 'Adjust' : 'Initialize'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Accessories Stock</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1">
          Finished Stock Tracking for Ties, Belts, Socks, Badges & Crests
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={isLoading}
        searchPlaceholder="Search"
        emptyMessage="No accessory stock records. Register ties, belts, socks, and badges in the Accessories Catalog to track their physical stock here."
        rowClassName={(r) => STATUS_META[r.status].row}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown
              label="Category"
              allLabel={`All Categories (${accessories.length})`}
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
            />

            {uniqueGenders.length > 0 && (
              <FilterDropdown
                label="Gender"
                allLabel="All Genders"
                value={genderFilter}
                onChange={setGenderFilter}
                options={uniqueGenders}
              />
            )}

            <FilterDropdown
              label="Brand"
              allLabel="All Brands"
              value={filterBrand}
              onChange={setFilterBrand}
              options={uniqueBrands}
            />

            <FilterDropdown
              label="Colour"
              allLabel="All Colours"
              value={filterColour}
              onChange={setFilterColour}
              options={uniqueColours}
            />

            <FilterDropdown
              label="Size"
              allLabel="All Sizes"
              value={filterSize}
              onChange={setFilterSize}
              options={uniqueSizes}
            />

            <FilterDropdown
              label="Stock Status"
              allLabel="All Stock"
              allBadge={itemFilteredRows.length}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as typeof filterStatus)}
              options={[
                { label: 'In Stock', value: 'IN_STOCK', badge: statusCounts.IN_STOCK },
                { label: 'Low Stock', value: 'LOW_STOCK', badge: statusCounts.LOW_STOCK },
                { label: 'Out of Stock', value: 'OUT_OF_STOCK', badge: statusCounts.OUT_OF_STOCK },
              ]}
              maxWidth="max-w-[220px]"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setGenderFilter('ALL');
                  setFilterBrand('ALL');
                  setFilterColour('ALL');
                  setFilterSize('ALL');
                  setFilterStatus('ALL');
                }}
                className="px-3 py-1.5 bg-[#FFF1F1] hover:bg-[#C82A2B]/10 text-[#C82A2B] text-xs font-bold rounded-xl border border-[#C82A2B]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            <a
              href="/admin/accessories"
              className="h-10 px-4 bg-white hover:bg-[#FFF1F1] border border-[#C82A2B]/30 rounded-xl font-black text-[10px] uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5 transition-all whitespace-nowrap"
            >
              Manage Catalog <ChevronRight size={14} />
            </a>
          </div>
        }
      />

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedAccessory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-zinc-200/80 p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-400">

            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-2xl font-black italic tracking-tight text-zinc-900">Adjust Stock</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9E1B1D] mt-0.5">
                  {selectedAccessory.name} ({adjustingSize})
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdjustSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentAction('REPLENISH')}
                    className={`h-11 rounded-xl font-black text-xs uppercase tracking-wider border transition-all ${
                      adjustmentAction === 'REPLENISH'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    + Replenish
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentAction('CONSUME')}
                    className={`h-11 rounded-xl font-black text-xs uppercase tracking-wider border transition-all ${
                      adjustmentAction === 'CONSUME'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    - Consume
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-1.5">
                  Quantity ({adjustmentAction === 'REPLENISH' ? 'Units to Add' : 'Units to Deduct'})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inputDelta}
                  onChange={(e) => setInputDelta(e.target.value)}
                  className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-1.5">
                  Low Stock Threshold Alert (Units)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-[#C82A2B]/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
