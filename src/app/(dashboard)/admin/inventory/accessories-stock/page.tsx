'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { 
  Tag, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Search, 
  Plus, 
  RotateCw, 
  SlidersHorizontal,
  X,
  Package,
  ChevronRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

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
  stocks: StockRecord[];
}

export default function AccessoriesStockPage() {
  const [accessories, setAccessories] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [categories, setCategories] = useState<{ id: string; name: string; code_prefix: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Adjustment Modal
  const [selectedAccessory, setSelectedAccessory] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingSize, setAdjustingSize] = useState<string>('Free Size');
  const [adjustmentAction, setAdjustmentAction] = useState<'REPLENISH' | 'CONSUME'>('REPLENISH');
  const [inputDelta, setInputDelta] = useState<string>('10');
  const [newThreshold, setNewThreshold] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalAccessories: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalReserved: 0
  });

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const [res, catRes] = await Promise.all([
        api.get('/inventory/stock'),
        api.get('/inventory/accessory-categories').catch(() => ({ data: [] }))
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
      calculateStats(accessoryItems);

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

  const calculateStats = (items: Product[]) => {
    let lowStock = 0;
    let outOfStock = 0;
    let reserved = 0;

    items.forEach(item => {
      const allStocks = item.stocks || [];
      if (allStocks.length === 0) {
        outOfStock++;
      } else {
        const totalAvail = allStocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0);
        const minThreshold = Math.min(...allStocks.map(s => s.low_stock_threshold || 5));
        if (totalAvail <= 0) {
          outOfStock++;
        } else if (totalAvail <= minThreshold) {
          lowStock++;
        }
        reserved += allStocks.reduce((sum, s) => sum + (s.reserved_quantity || 0), 0);
      }
    });

    setStats({
      totalAccessories: items.length,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      totalReserved: reserved
    });
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const filteredAccessories = useMemo(() => {
    return accessories.filter(item => {
      const allStocks = item.stocks || [];
      const totalAvail = allStocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0);
      const minThreshold = allStocks.length > 0 ? Math.min(...allStocks.map(s => s.low_stock_threshold || 5)) : 5;

      if (filterStatus === 'OUT_OF_STOCK' && totalAvail > 0) return false;
      if (filterStatus === 'LOW_STOCK' && (totalAvail <= 0 || totalAvail > minThreshold)) return false;
      if (filterStatus === 'IN_STOCK' && (allStocks.length === 0 || totalAvail <= minThreshold)) return false;

      if (selectedCategory !== 'ALL') {
        const itemText = `${item.name} ${item.materials || ''}`.toLowerCase();
        if (!itemText.includes(selectedCategory.toLowerCase())) return false;
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
  }, [accessories, filterStatus, selectedCategory, searchTerm]);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Tag size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Accessories Stock</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Finished Stock Tracking for Ties, Belts, Socks, Badges & Crests
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStockData}
            disabled={isLoading}
            className="h-14 px-5 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
            Sync Stock
          </button>
          <a 
            href="/admin/accessories"
            className="h-14 px-6 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            Manage Catalog <ChevronRight size={14} />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#3a525d]/5 flex items-center justify-center text-[#3a525d] border border-[#3a525d]/10 shrink-0">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]/60">Accessory Items</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] mt-0.5">{stats.totalAccessories}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Low Stock Items</p>
            <h3 className="text-2xl font-black italic tracking-tight text-amber-600 mt-0.5">{stats.lowStockCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100 shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600/70">Out of Stock</p>
            <h3 className="text-2xl font-black italic tracking-tight text-red-600 mt-0.5">{stats.outOfStockCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Allocated / Reserved</p>
            <h3 className="text-2xl font-black italic tracking-tight text-emerald-600 mt-0.5">{stats.totalReserved}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search accessories by name, code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] placeholder:text-zinc-400 focus:outline-none focus:border-[#2d8d9b] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:border-[#2d8d9b] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterStatus === status
                    ? 'bg-[#2d8d9b] text-white shadow-md'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-[#3a525d]/70'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Cards Grid */}
      {isLoading ? (
        <div className="p-20 text-center flex flex-col items-center gap-3">
          <RotateCw size={28} className="animate-spin text-[#2d8d9b]" />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading accessory stock...</p>
        </div>
      ) : filteredAccessories.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAccessories.map(product => {
            const rawSizes = product.base_size 
              ? product.base_size.split(',').map(s => s.trim()).filter(Boolean)
              : ['Free Size'];
            const sizes = rawSizes.length > 0 ? rawSizes : ['Free Size'];

            const hasImage = product.images && product.images.length > 0;
            const totalPhysical = (product.stocks || []).reduce((acc, s) => acc + (s.quantity || 0), 0);
            const totalReserved = (product.stocks || []).reduce((acc, s) => acc + (s.reserved_quantity || 0), 0);
            const totalAvailable = Math.max(0, totalPhysical - totalReserved);

            return (
              <div 
                key={product.id}
                className="bg-white border border-[#fce4d4] rounded-[2.5rem] p-6 shadow-sm hover:border-[#2d8d9b]/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                        {hasImage ? (
                          <img src={product.images![0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Tag size={20} className="text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#2d8d9b] bg-[#2d8d9b]/10 px-2 py-0.5 rounded-md">
                          {product.art_number}
                        </span>
                        <h3 className="text-base font-black text-[#3a525d] mt-1">{product.name}</h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        totalAvailable <= 0
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : totalAvailable <= 10
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}>
                        {totalAvailable <= 0 ? 'Out of Stock' : totalAvailable <= 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>
                  </div>

                  {/* Sizing Stock Table */}
                  <div className="mt-4 border border-zinc-100 rounded-2xl overflow-hidden bg-zinc-50/50">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200/80 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          <th className="py-2.5 px-3.5">Size</th>
                          <th className="py-2.5 px-3.5 text-right">Physical</th>
                          <th className="py-2.5 px-3.5 text-right">Reserved</th>
                          <th className="py-2.5 px-3.5 text-right">Available</th>
                          <th className="py-2.5 px-3.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {sizes.map(sz => {
                          const stock = product.stocks?.find(s => s.size === sz);
                          const physical = stock?.quantity || 0;
                          const resQty = stock?.reserved_quantity || 0;
                          const avail = Math.max(0, physical - resQty);
                          const threshold = stock?.low_stock_threshold ?? 5;
                          const isLow = avail > 0 && avail <= threshold;
                          const isOut = avail <= 0;

                          return (
                            <tr key={sz} className="hover:bg-white/60 transition-colors">
                              <td className="py-2.5 px-3.5 font-black text-[#3a525d]">
                                {sz}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-zinc-600">
                                {physical}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-zinc-400">
                                {resQty}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-black">
                                <span className={isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-emerald-600'}>
                                  {avail}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-center">
                                <button
                                  onClick={() => handleOpenAdjust(product, sz)}
                                  className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 text-[#2d8d9b] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-2xs"
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

                {/* Footer summary */}
                <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-bold text-zinc-500">
                  <span>Gender: <strong className="text-[#3a525d]">{product.gender || 'Unisex'}</strong></span>
                  <span>Total Avail: <strong className="text-[#2d8d9b] text-sm">{totalAvailable}</strong></span>
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
            <p className="text-xl font-black italic text-[#3a525d]">No Accessory Stock Records</p>
            <p className="text-xs font-bold max-w-md text-zinc-500 leading-relaxed">
              Register ties, belts, socks, and badges in the Accessories Catalog to track their physical stock here.
            </p>
            <a 
              href="/admin/accessories"
              className="mt-3 px-6 py-3 bg-[#2d8d9b] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#236f7a] transition-all"
            >
              Go to Accessories Catalog
            </a>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedAccessory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-[#fce4d4] p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d]">Adjust Stock</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-0.5">
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
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
                        ? 'bg-red-500 text-white border-red-500 shadow-md'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    - Consume
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                  Quantity ({adjustmentAction === 'REPLENISH' ? 'Units to Add' : 'Units to Deduct'})
                </label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={inputDelta}
                  onChange={(e) => setInputDelta(e.target.value)}
                  className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5">
                  Low Stock Threshold Alert (Units)
                </label>
                <input 
                  type="number"
                  min="0"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-11 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] focus:outline-none"
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
                  className="px-6 py-2.5 bg-[#2d8d9b] hover:bg-[#236f7a] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
