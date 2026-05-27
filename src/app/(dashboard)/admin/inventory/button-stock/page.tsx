'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  CircleDot, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Search, 
  Loader2, 
  RotateCw, 
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

interface ButtonItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit_price: number | null;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export default function ButtonStockPage() {
  const [buttons, setButtons] = useState<ButtonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  
  // Modal states
  const [selectedButton, setSelectedButton] = useState<ButtonItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [physicalDelta, setPhysicalDelta] = useState<number>(0);
  const [newThreshold, setNewThreshold] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats states
  const [stats, setStats] = useState({
    totalButtons: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/stock');
      const buttonsData = res.data?.buttons || [];
      setButtons(buttonsData);
      calculateStats(buttonsData);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load button stock catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (buttonList: ButtonItem[]) => {
    let lowStock = 0;
    let outOfStock = 0;

    buttonList.forEach(btn => {
      const qty = Number(btn.quantity) || 0;
      const threshold = Number(btn.low_stock_threshold) || 0;
      if (qty <= 0) {
        outOfStock++;
      } else if (qty <= threshold) {
        lowStock++;
      }
    });

    setStats({
      totalButtons: buttonList.length,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock
    });
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleOpenButtonAdjust = (button: ButtonItem) => {
    setSelectedButton(button);
    setPhysicalDelta(0);
    setNewThreshold(Number(button.low_stock_threshold) ?? 10);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedButton) return;

    setIsSubmitting(true);
    const targetName = selectedButton.name;
    const loadingToast = toast.loading(`Updating stock for ${targetName}...`);
    
    try {
      const payload: any = {
        button_id: selectedButton.id,
        quantity_delta: physicalDelta,
        low_stock_threshold: newThreshold
      };

      await api.post('/inventory/stock/adjust', payload);

      toast.success('Button stock adjusted successfully!', { id: loadingToast });
      setIsAdjustModalOpen(false);
      fetchStockData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to adjust stock. Make sure you have administrator permissions.';
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Search logic
  const filteredButtons = React.useMemo(() => {
    return buttons.filter(btn => {
      const matchesSearch = 
        btn.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        btn.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (btn.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'ALL') return true;

      const qty = Number(btn.quantity) || 0;
      const threshold = Number(btn.low_stock_threshold) || 0;

      if (filterStatus === 'OUT_OF_STOCK') {
        return qty <= 0;
      }

      if (filterStatus === 'LOW_STOCK') {
        return qty > 0 && qty <= threshold;
      }

      if (filterStatus === 'IN_STOCK') {
        return qty > threshold;
      }

      return true;
    });
  }, [buttons, searchTerm, filterStatus]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <CircleDot size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Button Stock</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Garment buttons quantities, unit pricing & threshold alert configurations
          </p>
        </div>

        <button 
          onClick={fetchStockData}
          disabled={isLoading}
          className="h-14 px-6 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
          Sync Button Stock
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Total Buttons */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-[#2d8d9b]/30 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-[#2d8d9b]/5 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shrink-0">
            <CircleDot size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b]/70">Button Profiles</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#2d8d9b] mt-0.5">{stats.totalButtons}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-[#2d8d9b] scale-125 group-hover:scale-150 transition-transform duration-500">
            <CircleDot size={60} />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Low Stock Lines</p>
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
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600/70">Depleted Lines</p>
            <h3 className="text-2xl font-black italic tracking-tight text-red-600 mt-0.5">{stats.outOfStockCount}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-red-500 scale-125 group-hover:scale-150 transition-transform duration-500">
            <XCircle size={60} />
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#fce4d4] rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Search */}
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by button code, name, description..."
            className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all text-[#3a525d] shadow-sm"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((status) => {
            const labels = {
              ALL: 'All Buttons',
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
                onClick={() => setFilterStatus(status)}
                className={`px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  filterStatus === status ? activeStyles[status] : styles[status]
                }`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>

      </div>

      {/* Buttons Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-[#fce4d4] rounded-[3rem] gap-4">
          <Loader2 className="animate-spin text-[#2d8d9b]" size={40} />
          <p className="text-sm font-bold text-[#3a525d]">Parsing buttons database...</p>
        </div>
      ) : filteredButtons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredButtons.map((button) => {
            const qty = Number(button.quantity) || 0;
            const threshold = Number(button.low_stock_threshold) || 0;
            
            let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
            if (qty <= 0) status = 'OUT_OF_STOCK';
            else if (qty <= threshold) status = 'LOW_STOCK';

            const statusColors = {
              IN_STOCK: 'bg-emerald-50/50 text-emerald-600 border-emerald-100 hover:border-emerald-300',
              LOW_STOCK: 'bg-amber-50/50 text-amber-600 border-amber-100 hover:border-amber-300',
              OUT_OF_STOCK: 'bg-red-50/50 text-red-600 border-red-100 hover:border-red-300'
            };

            const badgeColors = {
              IN_STOCK: 'bg-emerald-500 text-white',
              LOW_STOCK: 'bg-amber-500 text-white',
              OUT_OF_STOCK: 'bg-red-500 text-white'
            };

            const percentage = Math.min(100, Math.max(5, (qty / Math.max(1, threshold * 2)) * 100));

            return (
              <div 
                key={button.id}
                onClick={() => handleOpenButtonAdjust(button)}
                className={`bg-white rounded-[2.5rem] border p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${statusColors[status]}`}
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200/50 flex items-center justify-center text-[#2d8d9b] shadow-sm shrink-0">
                        <CircleDot size={18} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[#3a525d] tracking-tight line-clamp-1">{button.name}</h4>
                        <span className="text-[9px] font-black bg-white/70 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-200/40 uppercase tracking-wider">
                          {button.code}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColors[status]}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-5 bg-white/40 backdrop-blur-sm rounded-2xl p-3 border border-black/5 text-center">
                    <div className="col-span-1">
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Description</p>
                      <p className="text-[10px] font-black text-[#3a525d] truncate mt-0.5">{button.description || 'Generic'}</p>
                    </div>
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Unit Price</p>
                      <p className="text-[10px] font-black text-[#3a525d] truncate mt-0.5">
                        {button.unit_price ? `₹${Number(button.unit_price).toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Stock levels */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">Units Available</p>
                        <p className="text-xl font-black text-[#3a525d] italic tracking-tight">{qty.toFixed(0)} <span className="text-xs font-bold not-italic text-zinc-500">pieces</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">Low Stock Limit</p>
                        <p className="text-xs font-extrabold text-zinc-600">≤ {threshold.toFixed(0)} pcs</p>
                      </div>
                    </div>

                    {/* Level bar */}
                    <div className="w-full h-2 bg-zinc-200/50 rounded-full overflow-hidden border border-black/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          status === 'OUT_OF_STOCK' ? 'bg-red-500' :
                          status === 'LOW_STOCK' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                </div>

                <div className="mt-4 pt-3 border-t border-black/5 flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  <span>Press to adjust button stock</span>
                  <ChevronRight size={12} className="text-[#3a525d]/50" />
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#fce4d4] rounded-[3rem] p-24 text-center">
          <div className="flex flex-col items-center gap-4 opacity-30">
            <CircleDot size={48} className="text-[#2d8d9b]" />
            <p className="text-xl font-black italic text-[#3a525d]">No matching button records found</p>
            <p className="text-xs font-bold max-w-sm text-zinc-500">Try adjusting your filters or search keywords to locate specific buttons.</p>
          </div>
        </div>
      )}

      {/* Adjust Stock & Threshold Modal */}
      {isAdjustModalOpen && selectedButton && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg bg-white rounded-[3rem] p-8 border border-[#fce4d4] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#3a525d] via-[#2d8d9b] to-[#fce4d4]" />
            
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mt-2">
              <div className="w-12 h-12 bg-[#2d8d9b]/10 rounded-2xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black italic text-[#3a525d] tracking-tight">Adjust Button Stock</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-0.5">
                  {selectedButton.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-6 space-y-6">
              
              {/* Stats */}
              {(() => {
                const currentQty = Number(selectedButton.quantity) || 0;
                const lowThreshold = Number(selectedButton.low_stock_threshold) || 0;
                return (
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Current Button Stock</p>
                      <p className="text-base font-black text-[#3a525d] mt-1">{currentQty.toFixed(0)} pieces</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Threshold limit</p>
                      <p className="text-base font-black text-[#2d8d9b] mt-1">{lowThreshold.toFixed(0)} pieces</p>
                    </div>
                  </div>
                );
              })()}

              {/* Physical Delta Adjustment */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                  <label>Physical Inventory Change</label>
                  <span className={`text-[9px] font-extrabold ${physicalDelta > 0 ? 'text-emerald-500' : physicalDelta < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                    {physicalDelta > 0 ? `+${physicalDelta} pieces` : physicalDelta < 0 ? `${physicalDelta} pieces` : 'No physical adjustment'}
                  </span>
                </div>
                
                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => setPhysicalDelta(prev => prev - 5)}
                    className="w-12 h-12 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-xl flex items-center justify-center font-bold text-zinc-700 transition-all active:scale-90"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhysicalDelta(prev => prev - 1)}
                    className="w-12 h-12 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-xl flex items-center justify-center font-bold text-zinc-700 transition-all active:scale-90"
                  >
                    -1
                  </button>
                  
                  <input
                    type="number"
                    step="1"
                    value={physicalDelta}
                    onChange={(e) => setPhysicalDelta(parseInt(e.target.value) || 0)}
                    className="flex-1 h-12 bg-white border border-[#fce4d4] rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                    placeholder="0"
                  />

                  <button
                    type="button"
                    onClick={() => setPhysicalDelta(prev => prev + 1)}
                    className="w-12 h-12 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-xl flex items-center justify-center font-bold text-zinc-700 transition-all active:scale-90"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhysicalDelta(prev => prev + 5)}
                    className="w-12 h-12 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-xl flex items-center justify-center font-bold text-zinc-700 transition-all active:scale-90"
                  >
                    +5
                  </button>
                </div>
                <p className="text-[9px] text-zinc-400 font-bold">Use positive values to replenish stock (e.g. procurement) or negative to account for production utilization.</p>
              </div>

              {/* Threshold level */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                    Low Stock Threshold Limit
                  </label>
                  <span className="text-[10px] font-black text-[#2d8d9b] bg-[#2d8d9b]/5 px-2 py-0.5 rounded">
                    Current limit: {newThreshold} pieces
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                    className="flex-1 accent-[#2d8d9b]"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 h-12 bg-white border border-[#fce4d4] rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                  />
                </div>
                <p className="text-[9px] text-zinc-400 font-bold">
                  When available button physical count falls below this limit, it flags an alert.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 h-14 bg-zinc-50 hover:bg-zinc-100 text-[#3a525d] rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-zinc-200/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#3a525d]/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin text-white" size={16} />
                  ) : (
                    'Save Adjustments'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
