'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Layers, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Loader2, 
  RotateCw, 
  X,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  SlidersHorizontal,
  CircleDot,
  Scissors
} from 'lucide-react';
import { formatQuantity, formatCurrency } from '@/lib/formatters';

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
  uom: string;
  quantity: number;
  low_stock_threshold: number;
  unit_price: number | null;
  category?: TrimCategory;
}

export default function TrimsStockPage() {
  const [trims, setTrims] = useState<TrimStockItem[]>([]);
  const [categories, setCategories] = useState<TrimCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Adjustment Modal
  const [selectedTrim, setSelectedTrim] = useState<TrimStockItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustmentAction, setAdjustmentAction] = useState<'REPLENISH' | 'CONSUME'>('REPLENISH');
  const [inputDelta, setInputDelta] = useState<string>('10');
  const [newThreshold, setNewThreshold] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;
    trims.forEach(t => {
      const qty = Number(t.quantity) || 0;
      const threshold = Number(t.low_stock_threshold) || 0;
      if (qty <= 0) outOfStock++;
      else if (qty <= threshold) lowStock++;
    });

    return {
      totalItems: trims.length,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      inStockCount: trims.length - lowStock - outOfStock
    };
  }, [trims]);

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

  // Filtered Items
  const filteredTrims = useMemo(() => {
    return trims.filter(item => {
      // Category filter
      if (categoryFilter !== 'ALL') {
        const itemCatId = item.category_id;
        const itemCatName = (item.category?.name || '').toLowerCase();
        const filterCatName = (categories.find(c => c.id === categoryFilter)?.name || '').toLowerCase();

        const matchesId = itemCatId === categoryFilter;
        const matchesName = itemCatName && filterCatName && itemCatName === filterCatName;
        if (!matchesId && !matchesName) return false;
      }

      // Status filter
      const qty = Number(item.quantity) || 0;
      const threshold = Number(item.low_stock_threshold) || 0;

      if (statusFilter === 'OUT_OF_STOCK' && qty > 0) return false;
      if (statusFilter === 'LOW_STOCK' && (qty <= 0 || qty > threshold)) return false;
      if (statusFilter === 'IN_STOCK' && qty <= threshold) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term) ||
          (item.type || '').toLowerCase().includes(term) ||
          (item.category?.name || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [trims, categoryFilter, statusFilter, searchTerm, categories]);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Page Header matching FabricStockPage */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Layers size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Trims Stock Ledger</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Thread spools, buttons, zippers, labels & finishing trim stock balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-[#fce4d4] rounded-2xl p-1 flex items-center shadow-sm">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'CARDS' ? 'bg-[#3a525d] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-[#3a525d] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Table
            </button>
          </div>

          <button 
            onClick={fetchStockData}
            disabled={isLoading}
            className="h-11 px-5 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
            Sync Stock
          </button>
        </div>
      </div>

      {/* Metrics Row matching Fabric Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Total Trim Profiles */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-[#2d8d9b]/30 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-[#2d8d9b]/5 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b]/70">All Trim Profiles</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#2d8d9b] mt-0.5">{stats.totalItems}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-[#2d8d9b] scale-125 group-hover:scale-150 transition-transform duration-500">
            <Layers size={60} />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Low Stock Trims</p>
            <h3 className="text-2xl font-black italic tracking-tight text-amber-600 mt-0.5">{stats.lowStockCount}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-amber-500 scale-125 group-hover:scale-150 transition-transform duration-500">
            <AlertTriangle size={60} />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-red-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100 shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600/70">Depleted Trims</p>
            <h3 className="text-2xl font-black italic tracking-tight text-red-600 mt-0.5">{stats.outOfStockCount}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-red-500 scale-125 group-hover:scale-150 transition-transform duration-500">
            <XCircle size={60} />
          </div>
        </div>

      </div>

      {/* Arranged Trim Categories Tabs Bar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`h-11 px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              categoryFilter === 'ALL'
                ? 'bg-[#3a525d] text-white shadow-md shadow-[#3a525d]/20'
                : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-[#fce4d4]'
            }`}
          >
            <span>All Trims Stock</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
              {trims.length}
            </span>
          </button>

          {categories.map(cat => {
            const count = trims.filter(t => 
              t.category_id === cat.id || 
              (t.category?.name || '').toLowerCase() === cat.name.toLowerCase()
            ).length;
            const isSelected = categoryFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`h-11 px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#3a525d] text-white shadow-md shadow-[#3a525d]/20'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-[#fce4d4]'
                }`}
              >
                <span className="font-mono text-[10px] text-[#2d8d9b] font-bold">[{cat.code_prefix}]</span>
                <span>{cat.name} Stock</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter and Search Bar matching Fabric Stock */}
        <div className="bg-white border border-[#fce4d4] rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          
          {/* Search */}
          <div className="relative group w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, trim name, type, category..."
              className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all text-[#3a525d] shadow-sm"
            />
          </div>

          {/* Status Filters */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
            {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((status) => {
              const labels = {
                ALL: 'All Statuses',
                IN_STOCK: 'In Stock',
                LOW_STOCK: 'Low Stock Alerts',
                OUT_OF_STOCK: 'Depleted'
              };

              const styles = {
                ALL: 'border-zinc-200 text-[#3a525d] hover:bg-zinc-50',
                IN_STOCK: 'border-emerald-100 text-emerald-600 hover:bg-emerald-50/30',
                LOW_STOCK: 'border-amber-100 text-amber-600 hover:bg-amber-50/30',
                OUT_OF_STOCK: 'border-red-100 text-red-600 hover:bg-red-50/30'
              };

              const activeStyles = {
                ALL: '!bg-[#3a525d] !text-white !border-[#3a525d] shadow-lg shadow-[#3a525d]/20',
                IN_STOCK: '!bg-emerald-500 !text-white !border-emerald-500 shadow-lg shadow-emerald-500/20',
                LOW_STOCK: '!bg-amber-500 !text-white !border-amber-500 shadow-lg shadow-amber-500/20',
                OUT_OF_STOCK: '!bg-red-500 !text-white !border-red-500 shadow-lg shadow-red-500/20'
              };

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === status ? activeStyles[status] : styles[status]
                  }`}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-[#fce4d4] rounded-[3rem] gap-4">
          <Loader2 className="animate-spin text-[#2d8d9b]" size={40} />
          <p className="text-sm font-bold text-[#3a525d]">Parsing trims stock ledger...</p>
        </div>
      ) : filteredTrims.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-[#fce4d4] rounded-[3rem] text-center space-y-3">
          <Package size={48} className="text-zinc-300" />
          <h3 className="text-lg font-black text-[#3a525d]">No Trim Stock Records Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm">No items match your filter criteria. Try adjusting the search term or category tabs.</p>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* Visual Cards Grid matching Fabric Stock */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredTrims.map((item) => {
            const qty = Number(item.quantity) || 0;
            const threshold = Number(item.low_stock_threshold) || 10;
            
            let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
            if (qty <= 0) status = 'OUT_OF_STOCK';
            else if (qty <= threshold) status = 'LOW_STOCK';

            const statusColors = {
              IN_STOCK: 'bg-emerald-50/40 text-emerald-600 border-emerald-100 hover:border-emerald-300',
              LOW_STOCK: 'bg-amber-50/40 text-amber-600 border-amber-100 hover:border-amber-300',
              OUT_OF_STOCK: 'bg-red-50/40 text-red-600 border-red-100 hover:border-red-300'
            };

            const badgeColors = {
              IN_STOCK: 'bg-emerald-500 text-white',
              LOW_STOCK: 'bg-amber-500 text-white',
              OUT_OF_STOCK: 'bg-red-500 text-white'
            };

            const percentage = Math.min(100, Math.max(5, (qty / Math.max(1, threshold * 2)) * 100));

            return (
              <div 
                key={`${item.origin}-${item.id}`}
                onClick={() => handleOpenAdjust(item)}
                className={`bg-white rounded-[2.5rem] border p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${statusColors[status]}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200/50 flex items-center justify-center text-[#2d8d9b] shadow-sm shrink-0">
                        {item.category?.name?.toLowerCase().includes('button') ? (
                          <CircleDot size={18} />
                        ) : item.category?.name?.toLowerCase().includes('thread') ? (
                          <Scissors size={18} />
                        ) : (
                          <Layers size={18} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[#3a525d] tracking-tight line-clamp-1">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-black bg-white/70 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-200/40 uppercase tracking-wider font-mono">
                            {item.code}
                          </span>
                          <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200/50 uppercase">
                            {item.category?.name || 'Trim'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColors[status]}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-3 gap-2 mt-5 bg-white/50 backdrop-blur-sm rounded-2xl p-3 border border-black/5 text-center">
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Type / Variant</p>
                      <p className="text-xs font-black text-[#3a525d] truncate mt-0.5">{item.type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Unit of Measure</p>
                      <p className="text-xs font-black text-[#3a525d] truncate mt-0.5">{item.uom}</p>
                    </div>
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Alert Min</p>
                      <p className="text-xs font-black text-[#3a525d] truncate mt-0.5">{threshold} {item.uom}</p>
                    </div>
                  </div>
                </div>

                {/* Gauge & Balance Footer */}
                <div className="mt-5 pt-4 border-t border-black/5">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Available Balance</span>
                      <p className="text-2xl font-black text-[#3a525d] leading-none mt-1">
                        {formatQuantity(qty)} <span className="text-xs font-bold text-zinc-400">{item.uom}</span>
                      </p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#2d8d9b] bg-[#2d8d9b]/10 px-2.5 py-1 rounded-xl">
                      Adjust Stock →
                    </span>
                  </div>

                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        status === 'OUT_OF_STOCK' ? 'bg-red-500' :
                        status === 'LOW_STOCK' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High Density Table View */
        <div className="bg-white rounded-[2.5rem] border border-[#fce4d4] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#fce4d4]/60 bg-zinc-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Trim Code</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Article Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Variant / Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Current Stock</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Alert Threshold</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredTrims.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const threshold = Number(item.low_stock_threshold) || 10;
                  const status = qty <= 0 ? 'OUT_OF_STOCK' : (qty <= threshold ? 'LOW_STOCK' : 'IN_STOCK');
                  
                  return (
                    <tr key={`${item.origin}-${item.id}`} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-[#2d8d9b]">{item.code}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-xs text-[#3a525d]">{item.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-lg text-[10px] font-black text-amber-700">
                          {item.category?.name || 'Trim'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500 font-medium">{item.type || '—'}</td>
                      <td className="px-6 py-4 font-black text-sm text-[#3a525d]">
                        {formatQuantity(qty)} <span className="text-[10px] font-bold text-zinc-400">{item.uom}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-zinc-500">{threshold} {item.uom}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'LOW_STOCK' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="px-3 py-1.5 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b] text-[#2d8d9b] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedTrim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border border-zinc-100 relative space-y-6">
            <button 
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] block">
                Stock Adjustment
              </span>
              <h3 className="text-xl font-black text-[#3a525d] mt-1">{selectedTrim.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono font-bold text-zinc-400">{selectedTrim.code}</span>
                <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  {selectedTrim.category?.name || 'Trim'}
                </span>
                <span className="text-xs font-bold text-zinc-500">
                  Current: <strong className="text-[#3a525d]">{formatQuantity(selectedTrim.quantity)} {selectedTrim.uom}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-5">
              {/* Replenish vs Consume Switch */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-2">
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
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                    Quantity Change ({selectedTrim.uom}) *
                  </label>
                  <span className="text-[10px] font-bold text-zinc-400">
                    Calculated Result: <strong className="text-[#3a525d]">
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
                  className="w-full text-sm font-black text-[#3a525d] px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-[#2d8d9b] outline-none" 
                  required
                />

                {/* Quick Add Presets */}
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInputDelta(String(amt))}
                      className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-black cursor-pointer transition-colors"
                    >
                      {amt} {selectedTrim.uom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Low Stock Alert Threshold */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">
                  Low Stock Alert Threshold ({selectedTrim.uom})
                </label>
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  value={newThreshold} 
                  onChange={e => setNewThreshold(parseFloat(e.target.value) || 0)} 
                  className="w-full text-xs font-bold text-[#3a525d] px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#2d8d9b] outline-none" 
                />
                <p className="text-[10px] text-zinc-400 mt-1">Trims with quantity at or below this level trigger amber alert cards.</p>
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
                  className="px-7 py-3 bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-[#2d8d9b]/25 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Apply Stock Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
