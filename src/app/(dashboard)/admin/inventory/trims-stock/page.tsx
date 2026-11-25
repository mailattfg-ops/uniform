'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import {
  X,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-react';
import { formatQuantity } from '@/lib/formatters';
import { parseImageGallery } from '@/components/ui/ZoomableImageLightbox';
import { DataTable, Column } from '@/components/ui/DataTable';
import { FilterDropdown } from '@/components/ui/FilterDropdown';

interface TrimCategory {
  id: string;
  name: string;
  code_prefix: string;
  default_uom: string;
}

interface TrimStockItem {
  id: string;
  origin?: 'trim' | 'button' | 'thread';
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
  description?: string | null;
  images?: string[];
  uom: string;
  quantity: number;
  low_stock_threshold: number;
  unit_price: number | null;
  category?: TrimCategory;
}

// Descriptive fields used by the Trims Items naming and filters
const pickDetails = (x: any) => ({
  brand_name: x.brand_name ?? null,
  specification: x.specification ?? null,
  color: x.color ?? null,
  shade_no: x.shade_no ?? null,
  size: x.size ?? null,
  size_uom: x.size_uom ?? null,
  description: x.description ?? null,
  images: x.images,
});

// Same as the Trims Items page: extract colour from type/description
const extractTrimColor = (t: TrimStockItem): string => {
  const desc = t.description || '';
  const colorMatch = desc.match(/(?:color|shade)\s*:\s*([^,;|\n]+)/i);
  if (colorMatch && colorMatch[1]) return colorMatch[1].trim();

  if (t.type && !t.type.toLowerCase().includes('button') && !t.type.toLowerCase().includes('thread') && !t.type.toLowerCase().includes('trim')) {
    return t.type.trim();
  }
  return '';
};

// Same as the Trims Items page "Item Name" column
const getTrimFullName = (item: TrimStockItem) => {
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

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
const STATUS_META: Record<StockStatus, { label: string; pill: string; text: string; row: string }> = {
  IN_STOCK: { label: 'In Stock', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-600', row: '' },
  LOW_STOCK: { label: 'Low Stock', pill: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-600', row: 'bg-amber-50/30' },
  OUT_OF_STOCK: { label: 'Out of Stock', pill: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-600', row: 'bg-rose-50/30' },
};

// Trims, buttons and threads come from separate tables, so their ids can collide;
// rows get a composite `id` while `item` keeps the original record for the adjust handler.
type TrimRow = Omit<TrimStockItem, 'id'> & { id: string; item: TrimStockItem };

const getStatus = (item: TrimStockItem): StockStatus => {
  const qty = Number(item.quantity) || 0;
  const threshold = Number(item.low_stock_threshold) || 10;
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
};

export default function TrimsStockPage() {
  const [trims, setTrims] = useState<TrimStockItem[]>([]);
  const [categories, setCategories] = useState<TrimCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [filterSize, setFilterSize] = useState<string>('ALL');
  const [filterColour, setFilterColour] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');

  // Adjustment Modal
  const [selectedTrim, setSelectedTrim] = useState<TrimStockItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustmentAction, setAdjustmentAction] = useState<'REPLENISH' | 'CONSUME'>('REPLENISH');
  const [inputDelta, setInputDelta] = useState<string>('10');
  const [newThreshold, setNewThreshold] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const [stockRes, catRes] = await Promise.all([
        api.get('/inventory/stock'),
        api.get('/inventory/trim-categories').catch(() => ({ data: [] }))
      ]);

      const availableCats: TrimCategory[] = catRes.data || [];
      const trimsList: TrimStockItem[] = [];

      // 1. Dynamic Trims
      if (Array.isArray(stockRes.data?.trims)) {
        stockRes.data.trims.forEach((t: any) => {
          trimsList.push({
            id: t.id,
            origin: 'trim',
            category_id: t.category_id || 'trim',
            code: t.code,
            name: t.name,
            type: t.type,
            uom: t.uom || 'Pcs',
            quantity: Number(t.quantity) || 0,
            low_stock_threshold: Number(t.low_stock_threshold) || 10,
            unit_price: t.unit_price,
            ...pickDetails(t),
            category: t.category || { id: 'trim', name: 'Trim', code_prefix: 'TRM', default_uom: 'Pcs' }
          });
        });
      }

      // 2. Buttons Stock (Integrated inside Trims Stock)
      if (Array.isArray(stockRes.data?.buttons)) {
        stockRes.data.buttons.forEach((b: any) => {
          if (!trimsList.some(item => item.code === b.code)) {
            trimsList.push({
              id: b.id,
              origin: 'button',
              category_id: 'button-cat',
              code: b.code,
              name: b.name,
              type: b.description || 'Button Fastener',
              uom: 'Pcs',
              quantity: Number(b.quantity) || 0,
              low_stock_threshold: Number(b.low_stock_threshold) || 10,
              unit_price: b.unit_price,
              ...pickDetails(b),
              category: { id: 'button-cat', name: 'Button', code_prefix: 'BTN', default_uom: 'Pcs' }
            });
          }
        });
      }

      // 3. Thread Stock (Integrated inside Trims Stock)
      if (Array.isArray(stockRes.data?.threads)) {
        stockRes.data.threads.forEach((th: any) => {
          if (!trimsList.some(item => item.code === th.code)) {
            trimsList.push({
              id: th.id,
              origin: 'thread',
              category_id: 'thread-cat',
              code: th.code,
              name: th.name,
              type: th.type || 'Sewing Thread',
              uom: 'Spools',
              quantity: Number(th.quantity) || 0,
              low_stock_threshold: Number(th.low_stock_threshold) || 10,
              unit_price: th.unit_price,
              ...pickDetails(th),
              category: { id: 'thread-cat', name: 'Thread', code_prefix: 'THD', default_uom: 'Spools' }
            });
          }
        });
      }

      // Ensure categories list covers all present categories
      const categoryMap = new Map<string, TrimCategory>();
      availableCats.forEach(c => categoryMap.set(c.id, c));
      trimsList.forEach(t => {
        if (t.category && !categoryMap.has(t.category_id)) {
          categoryMap.set(t.category_id, t.category);
        }
      });

      setCategories(Array.from(categoryMap.values()));
      setTrims(trimsList);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load trims stock inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const statusCounts = useMemo(() => {
    const c = { IN_STOCK: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 };
    trims.forEach(t => { c[getStatus(t)]++; });
    return c;
  }, [trims]);

  // Brand / Size / Colour options: same derivation as the Trims Items page
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

  // Filtered Rows (category / brand / size / colour matching copied from the Trims Items page)
  const filteredRows = useMemo<TrimRow[]>(() => {
    return trims
      .filter(t => {
        if (categoryFilter !== 'ALL' && t.category_id !== categoryFilter) return false;
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

        // Status filter
        if (statusFilter !== 'ALL' && getStatus(t) !== statusFilter) return false;

        return true;
      })
      .map(item => ({ ...item, id: `${item.origin}-${item.id}`, item }));
  }, [trims, categoryFilter, filterBrand, filterSize, filterColour, statusFilter]);

  const hasActiveFilters =
    categoryFilter !== 'ALL' || filterBrand !== 'ALL' || filterColour !== 'ALL' || filterSize !== 'ALL' || statusFilter !== 'ALL';

  // Open Adjust Modal
  const handleOpenAdjust = (item: TrimStockItem) => {
    setSelectedTrim(item);
    setAdjustmentAction('REPLENISH');
    setInputDelta('10');
    setNewThreshold(Number(item.low_stock_threshold) || 10);
    setIsAdjustModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrim) return;

    const deltaNum = parseFloat(inputDelta);
    if (isNaN(deltaNum) || deltaNum <= 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }

    setIsSubmitting(true);
    const finalDelta = adjustmentAction === 'REPLENISH' ? deltaNum : -deltaNum;
    const loadingToast = toast.loading(`Updating stock for ${selectedTrim.name}...`);

    try {
      const payload: any = {
        quantity_delta: finalDelta,
        low_stock_threshold: newThreshold
      };

      if (selectedTrim.origin === 'button') {
        payload.button_id = selectedTrim.id;
      } else if (selectedTrim.origin === 'thread') {
        payload.thread_id = selectedTrim.id;
      } else {
        payload.trim_id = selectedTrim.id;
      }

      await api.post('/inventory/stock/adjust', payload);

      toast.success('Trim stock updated successfully!', { id: loadingToast });
      setIsAdjustModalOpen(false);
      fetchStockData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to adjust stock', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<TrimRow>[] = [
    {
      header: 'ID',
      accessor: (r) => <span className="font-mono text-xs font-black text-[#9E1B1D] whitespace-nowrap">{r.code || '—'}</span>,
      sortable: true,
      sortValue: (r) => r.code,
    },
    {
      header: 'Item Name',
      accessor: (r) => {
        const fullName = getTrimFullName(r.item) || r.name || '—';
        const itemImgs = parseImageGallery(r.images);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center overflow-hidden shrink-0">
              {itemImgs.length > 0 ? (
                <img src={itemImgs[0]} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] text-zinc-300 font-bold uppercase">No Img</span>
              )}
            </div>
            <p className="font-bold text-xs text-zinc-900 truncate max-w-[360px]" title={fullName}>{fullName}</p>
          </div>
        );
      },
      sortable: true,
      sortValue: (r) => getTrimFullName(r.item) || r.name,
    },
    {
      header: 'Available Stock',
      className: 'text-right',
      accessor: (r) => {
        const status = getStatus(r.item);
        return (
          <span className={`font-mono text-xs font-black whitespace-nowrap ${STATUS_META[status].text}`}>
            {formatQuantity(Number(r.quantity) || 0)} <span className="text-[10px] font-bold text-zinc-400">{r.uom}</span>
          </span>
        );
      },
      sortable: true,
      sortValue: (r) => Number(r.quantity) || 0,
    },
    {
      header: 'Status',
      className: 'text-center',
      accessor: (r) => {
        const meta = STATUS_META[getStatus(r.item)];
        return <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${meta.pill}`}>{meta.label}</span>;
      },
      sortable: true,
      sortValue: (r) => getStatus(r.item),
    },
    {
      header: 'Action',
      className: 'text-center',
      accessor: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleOpenAdjust(r.item); }}
          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white text-[#C82A2B] border border-[#C82A2B]/30 hover:bg-[#FFF1F1] transition-all cursor-pointer whitespace-nowrap"
        >
          Adjust
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Trims Stock Ledger</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1">
          Thread spools, buttons, zippers, labels & finishing trim stock balances
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={isLoading}
        searchPlaceholder="Search"
        emptyMessage="No trim stock records found. Try adjusting the search term or filters."
        rowClassName={(r) => STATUS_META[getStatus(r.item)].row}
        onRowClick={(r) => handleOpenAdjust(r.item)}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <FilterDropdown
              label="Category"
              allLabel={`All Categories (${trims.length})`}
              value={categoryFilter}
              onChange={setCategoryFilter}
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

            {/* Stock Status Filter */}
            <FilterDropdown
              label="Stock Status"
              allLabel="All Statuses"
              allBadge={trims.length}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[
                { label: 'In Stock', value: 'IN_STOCK', badge: statusCounts.IN_STOCK },
                { label: 'Low Stock', value: 'LOW_STOCK', badge: statusCounts.LOW_STOCK },
                { label: 'Out of Stock', value: 'OUT_OF_STOCK', badge: statusCounts.OUT_OF_STOCK },
              ]}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('ALL');
                  setFilterBrand('ALL');
                  setFilterColour('ALL');
                  setFilterSize('ALL');
                  setStatusFilter('ALL');
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-[#FFF1F1] text-[#C82A2B] hover:text-[#A81D1E] text-xs font-bold rounded-xl border border-[#C82A2B]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        }
      />

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedTrim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border border-zinc-100 relative space-y-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#9E1B1D] block">
                Stock Adjustment
              </span>
              <h3 className="text-xl font-black text-zinc-900 mt-1">{selectedTrim.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono font-bold text-zinc-400">{selectedTrim.code}</span>
                <span className="text-[10px] font-black bg-[#FFF1F1] text-[#9E1B1D] px-2 py-0.5 rounded-full border border-[#C82A2B]/20">
                  {selectedTrim.category?.name || 'Trim'}
                </span>
                <span className="text-xs font-bold text-zinc-500">
                  Current: <strong className="text-zinc-900">{formatQuantity(selectedTrim.quantity)} {selectedTrim.uom}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-5">
              {/* Replenish vs Consume Switch */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-2">
                  Transaction Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setAdjustmentAction('REPLENISH')}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      adjustmentAction === 'REPLENISH'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <Plus size={14} strokeWidth={3} />
                    Replenish (Add)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentAction('CONSUME')}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      adjustmentAction === 'CONSUME'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <Minus size={14} strokeWidth={3} />
                    Consume (Deduct)
                  </button>
                </div>
              </div>

              {/* Quantity Input with Quick Delta Presets */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
                    Quantity Change ({selectedTrim.uom}) *
                  </label>
                  <span className="text-[10px] font-bold text-zinc-400">
                    Calculated Result: <strong className="text-zinc-900">
                      {formatQuantity(
                        Math.max(
                          0,
                          Number(selectedTrim.quantity) + (adjustmentAction === 'REPLENISH' ? (parseFloat(inputDelta) || 0) : -(parseFloat(inputDelta) || 0))
                        )
                      )} {selectedTrim.uom}
                    </strong>
                  </span>
                </div>

                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={inputDelta}
                  onChange={e => setInputDelta(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full text-sm font-black text-zinc-900 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                  required
                />

                {/* Quick Add Presets */}
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInputDelta(String(amt))}
                      className="px-2.5 py-1 bg-zinc-100 hover:bg-[#FFF1F1] hover:text-[#9E1B1D] text-zinc-600 rounded-lg text-[10px] font-black cursor-pointer transition-colors"
                    >
                      {amt} {selectedTrim.uom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Low Stock Alert Threshold */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900 block mb-1">
                  Low Stock Alert Threshold ({selectedTrim.uom})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newThreshold}
                  onChange={e => setNewThreshold(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold text-zinc-900 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 outline-none"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Trims with quantity at or below this level are flagged as low stock.</p>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-3 bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-[#C82A2B]/25 disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
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
