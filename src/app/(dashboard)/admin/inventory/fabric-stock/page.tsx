'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Scissors, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Search, 
  Loader2, 
  RotateCw, 
  ChevronRight,
  SlidersHorizontal,
  X,
  Calendar
} from 'lucide-react';

interface Fabric {
  id: string;
  code: string;
  name: string;
  brand_name: string | null;
  quantity: number;
  shade: string | null;
  width: string | null;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  description: string | null;
}

export default function FabricStockPage() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  
  // Modal states
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [physicalDelta, setPhysicalDelta] = useState<number>(0);
  const [newThreshold, setNewThreshold] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batches of lumps states
  const [adjustmentMode, setAdjustmentMode] = useState<'SIMPLE' | 'BATCH_LUMPS'>('SIMPLE');
  const [lumpTransactionType, setLumpTransactionType] = useState<'REPLENISH' | 'CONSUME'>('REPLENISH');
  const [lumps, setLumps] = useState<Array<{ id: number; width: string; length: string }>>([
    { id: 1, width: '1.5', length: '10' }
  ]);
  const [modalTab, setModalTab] = useState<'BATCH_LEDGER' | 'ADD_BATCH' | 'THRESHOLD'>('BATCH_LEDGER');
  const [batchNo, setBatchNo] = useState<string>('');

  // Stats states
  const [stats, setStats] = useState({
    totalFabrics: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });

  const totalBatchLength = lumps.reduce((sum, l) => {
    const w = parseFloat(l.width) || 0;
    const len = parseFloat(l.length) || 0;
    return sum + (w * len);
  }, 0);

  useEffect(() => {
    if (adjustmentMode === 'BATCH_LUMPS') {
      const multiplier = lumpTransactionType === 'REPLENISH' ? 1 : -1;
      setPhysicalDelta(Number((totalBatchLength * multiplier).toFixed(2)));
    }
  }, [lumps, lumpTransactionType, adjustmentMode, totalBatchLength]);

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/stock');
      const fabricsData = res.data?.fabrics || [];
      setFabrics(fabricsData);
      calculateStats(fabricsData);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load fabric stock catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (fabricList: Fabric[]) => {
    let lowStock = 0;
    let outOfStock = 0;

    fabricList.forEach(fab => {
      const qty = Number(fab.quantity) || 0;
      const threshold = Number(fab.low_stock_threshold) || 0;
      if (qty <= 0) {
        outOfStock++;
      } else if (qty <= threshold) {
        lowStock++;
      }
    });

    setStats({
      totalFabrics: fabricList.length,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock
    });
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleOpenFabricAdjust = (fabric: Fabric) => {
    setSelectedFabric(fabric);
    setPhysicalDelta(0);
    setAdjustmentMode('BATCH_LUMPS');
    setLumpTransactionType('REPLENISH');
    setLumps([{ id: Date.now(), width: '1.5', length: '10' }]);
    setBatchNo('');
    setModalTab('BATCH_LEDGER');
    setNewThreshold(Number(fabric.low_stock_threshold) ?? 10);
    setIsAdjustModalOpen(true);
  };

  const parseFabricBatches = (descriptionText: string | null) => {
    try {
      if (!descriptionText) return [];
      const parsed = JSON.parse(descriptionText);
      if (parsed && parsed.type === 'batch_wise_inventory' && Array.isArray(parsed.batches)) {
        return parsed.batches;
      }
    } catch (e) {
      // Not JSON
    }
    return [];
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFabric) return;

    setIsSubmitting(true);
    const targetName = selectedFabric.name;
    const loadingToast = toast.loading(`Updating stock for ${targetName}...`);
    
    try {
      let finalDelta = physicalDelta;
      let updatedDesc = selectedFabric.description;

      if (modalTab === 'ADD_BATCH') {
        if (!batchNo.trim()) {
          toast.error('Batch No / Lot Code is required', { id: loadingToast });
          setIsSubmitting(false);
          return;
        }

        const multiplier = lumpTransactionType === 'REPLENISH' ? 1 : -1;
        const batchTotalQty = Number(totalBatchLength.toFixed(2));
        finalDelta = batchTotalQty * multiplier;

        let parsedDesc = { type: 'batch_wise_inventory', text_description: '', batches: [] as any[] };
        try {
          if (selectedFabric.description) {
            const parsed = JSON.parse(selectedFabric.description);
            if (parsed && parsed.type === 'batch_wise_inventory') {
              parsedDesc = parsed;
            } else {
              parsedDesc.text_description = selectedFabric.description;
            }
          }
        } catch (e) {
          parsedDesc.text_description = selectedFabric.description || '';
        }

        const newBatchRecord = {
          id: `BATCH-${Date.now()}`,
          batch_no: batchNo.trim(),
          transaction_type: lumpTransactionType,
          created_at: new Date().toISOString(),
          total_quantity: batchTotalQty,
          lumps: lumps.map((l, index) => ({
            id: index + 1,
            width: parseFloat(l.width) || 0,
            length: parseFloat(l.length) || 0,
            total_length: Number((parseFloat(l.width) * parseFloat(l.length)).toFixed(2))
          }))
        };

        parsedDesc.batches = [newBatchRecord, ...(parsedDesc.batches || [])];
        updatedDesc = JSON.stringify(parsedDesc);
      }

      // 1. Post to adjust API to update total quantity & trigger auto-POs
      await api.post('/inventory/stock/adjust', {
        fabric_id: selectedFabric.id,
        quantity_delta: finalDelta,
        low_stock_threshold: newThreshold
      });

      // 2. Put to update fabric to persist the batch metadata in the description column
      const currentQty = Number(selectedFabric.quantity) || 0;
      const newTotalQty = Math.max(0, currentQty + finalDelta);
      
      await api.put(`/inventory/fabrics/${selectedFabric.id}`, {
        code: selectedFabric.code,
        name: selectedFabric.name,
        brand_name: selectedFabric.brand_name,
        shade: selectedFabric.shade,
        width: selectedFabric.width,
        quantity: newTotalQty,
        low_stock_threshold: newThreshold,
        description: updatedDesc
      });

      toast.success('Fabric stock batch entry saved successfully!', { id: loadingToast });
      setIsAdjustModalOpen(false);
      fetchStockData();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error || 'Failed to adjust stock. Make sure you have administrator permissions.';
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Search logic
  const filteredFabrics = React.useMemo(() => {
    return fabrics.filter(fab => {
      const matchesSearch = 
        fab.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        fab.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fab.brand_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fab.shade || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'ALL') return true;

      const qty = Number(fab.quantity) || 0;
      const threshold = Number(fab.low_stock_threshold) || 0;

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
  }, [fabrics, searchTerm, filterStatus]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Scissors size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Fabric Stock Ledger</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Linear meter roll quantities, color shades & automated PO threshold levels
          </p>
        </div>

        <button 
          onClick={fetchStockData}
          disabled={isLoading}
          className="h-14 px-6 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
          Sync Fabric Stock
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Total Fabrics */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-[#2d8d9b]/30 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-[#2d8d9b]/5 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shrink-0">
            <Scissors size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b]/70">Fabric Profiles</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#2d8d9b] mt-0.5">{stats.totalFabrics}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-[#2d8d9b] scale-125 group-hover:scale-150 transition-transform duration-500">
            <Scissors size={60} />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Low Stock Rolls</p>
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
            placeholder="Search by fabric code, name, shade, brand..."
            className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all text-[#3a525d] shadow-sm"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((status) => {
            const labels = {
              ALL: 'All Fabrics',
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

      {/* Fabrics Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-[#fce4d4] rounded-[3rem] gap-4">
          <Loader2 className="animate-spin text-[#2d8d9b]" size={40} />
          <p className="text-sm font-bold text-[#3a525d]">Parsing fabrics ledger...</p>
        </div>
      ) : filteredFabrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredFabrics.map((fabric) => {
            const qty = Number(fabric.quantity) || 0;
            const threshold = Number(fabric.low_stock_threshold) || 0;
            
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
                key={fabric.id}
                onClick={() => handleOpenFabricAdjust(fabric)}
                className={`bg-white rounded-[2.5rem] border p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${statusColors[status]}`}
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200/50 flex items-center justify-center text-[#2d8d9b] shadow-sm shrink-0">
                        <Scissors size={18} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[#3a525d] tracking-tight line-clamp-1">{fabric.name}</h4>
                        <span className="text-[9px] font-black bg-white/70 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-200/40 uppercase tracking-wider">
                          {fabric.code}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColors[status]}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-5 bg-white/40 backdrop-blur-sm rounded-2xl p-3 border border-black/5 text-center">
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Brand</p>
                      <p className="text-[10px] font-black text-[#3a525d] truncate mt-0.5">{fabric.brand_name || 'Generic'}</p>
                    </div>
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Shade</p>
                      <p className="text-[10px] font-black text-[#3a525d] truncate mt-0.5">{fabric.shade || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Width</p>
                      <p className="text-[10px] font-black text-[#3a525d] truncate mt-0.5">{fabric.width || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Stock levels */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">Stock Available</p>
                        <p className="text-xl font-black text-[#3a525d] italic tracking-tight">{qty.toFixed(2)} <span className="text-xs font-bold not-italic text-zinc-500">meters</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">Low Stock Limit</p>
                        <p className="text-xs font-extrabold text-zinc-600">≤ {threshold.toFixed(2)} m</p>
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
                  <span>Press to adjust fabric stock</span>
                  <ChevronRight size={12} className="text-[#3a525d]/50" />
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#fce4d4] rounded-[3rem] p-24 text-center">
          <div className="flex flex-col items-center gap-4 opacity-30">
            <Scissors size={48} className="text-[#2d8d9b]" />
            <p className="text-xl font-black italic text-[#3a525d]">No matching fabric records found</p>
            <p className="text-xs font-bold max-w-sm text-zinc-500">Try adjusting your filters or search keywords to locate specific raw fabrics.</p>
          </div>
        </div>
      )}

      {/* Adjust Stock & Threshold Modal */}
      {isAdjustModalOpen && selectedFabric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="w-full max-w-2xl bg-white rounded-[3rem] p-8 border border-[#fce4d4] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#3a525d] via-[#2d8d9b] to-[#fce4d4]" />
            
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mt-2 shrink-0">
              <div className="w-12 h-12 bg-[#2d8d9b]/10 rounded-2xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
                <SlidersHorizontal size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black italic text-[#3a525d] tracking-tight">Adjust Fabric Stock</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-0.5">
                      {selectedFabric.name} ({selectedFabric.code})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block">Current Stock</span>
                    <span className="text-lg font-black text-[#3a525d] font-mono leading-none">{(Number(selectedFabric.quantity) || 0).toFixed(2)} m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Tab Bar Segment */}
            <div className="grid grid-cols-3 gap-2 bg-zinc-50 border border-zinc-150 p-1.5 rounded-2xl mt-5 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('BATCH_LEDGER')}
                className={`py-2 px-1 rounded-xl text-center text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  modalTab === 'BATCH_LEDGER' 
                    ? 'bg-[#3a525d] text-white shadow' 
                    : 'text-zinc-550 hover:bg-zinc-100'
                }`}
              >
                Batch Ledger
              </button>
              <button
                type="button"
                onClick={() => setModalTab('ADD_BATCH')}
                className={`py-2 px-1 rounded-xl text-center text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  modalTab === 'ADD_BATCH' 
                    ? 'bg-[#3a525d] text-white shadow' 
                    : 'text-zinc-550 hover:bg-zinc-100'
                }`}
              >
                Add Batch Entry
              </button>
              <button
                type="button"
                onClick={() => setModalTab('THRESHOLD')}
                className={`py-2 px-1 rounded-xl text-center text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  modalTab === 'THRESHOLD' 
                    ? 'bg-[#3a525d] text-white shadow' 
                    : 'text-zinc-550 hover:bg-zinc-100'
                }`}
              >
                Threshold Limit
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-5 flex-1 overflow-y-auto pr-1 flex flex-col justify-between space-y-6">
              
              <div className="flex-1 space-y-5">
                
                {/* 1. BATCH LEDGER TAB */}
                {modalTab === 'BATCH_LEDGER' && (() => {
                  const savedBatches = parseFabricBatches(selectedFabric.description);
                  return (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Recorded Batch History</h4>
                        <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">Historical ledger of raw fabric batches received and consumed.</p>
                      </div>

                      {savedBatches.length === 0 ? (
                        <div className="bg-zinc-50 border border-zinc-200 border-dashed rounded-[2rem] p-10 text-center text-zinc-400 flex flex-col justify-center items-center min-h-[220px]">
                          <Calendar className="text-zinc-300 mb-3" size={28} />
                          <p className="text-[10px] font-black uppercase tracking-wider">No Batches Recorded Yet</p>
                          <p className="text-[9px] font-semibold text-zinc-450 mt-1 max-w-[280px] mx-auto leading-relaxed">
                            To start tracking individual rolls, click the **"Add Batch Entry"** tab above to make a batch wise stock entry.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                          {savedBatches.map((batch: any, bIdx: number) => (
                            <div key={batch.id || bIdx} className="bg-white border border-zinc-150 rounded-2.5xl p-5 shadow-sm space-y-3 hover:border-[#2d8d9b]/25 transition-all">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase font-mono tracking-widest bg-zinc-100 text-zinc-500 border border-zinc-200">
                                    {batch.batch_no}
                                  </span>
                                  <p className="text-[9px] text-zinc-400 font-bold mt-1">
                                    {new Date(batch.created_at).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    batch.transaction_type === 'REPLENISH' 
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' 
                                      : 'bg-red-50 text-red-600 border border-red-150'
                                  }`}>
                                    {batch.transaction_type === 'REPLENISH' ? `+${batch.total_quantity} m` : `-${batch.total_quantity} m`}
                                  </span>
                                  <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest mt-1">
                                    {batch.lumps?.length || 0} lumps (rolls)
                                  </p>
                                </div>
                              </div>

                              {/* Lumps List within this batch */}
                              <div className="bg-zinc-50/50 border border-zinc-150 rounded-xl p-3 space-y-1 text-[10px] font-semibold text-zinc-655">
                                {batch.lumps && batch.lumps.map((lump: any, lIdx: number) => (
                                  <div key={lIdx} className="flex justify-between font-mono">
                                    <span>Lump #{lump.id || lIdx + 1}: {lump.width}m width x {lump.length}m length</span>
                                    <span className="font-black text-[#3a525d]">{lump.total_length} m</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. ADD BATCH ENTRY TAB */}
                {modalTab === 'ADD_BATCH' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">New Batch Entry</h4>
                      <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">Register a consignment batch and specify exact lump dimensions.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Batch Number */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Batch No / Lot Code</label>
                        <input
                          type="text"
                          value={batchNo}
                          onChange={(e) => setBatchNo(e.target.value)}
                          placeholder="e.g. B-9982"
                          className="w-full h-11 px-3 bg-white border border-[#fce4d4] rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                        />
                      </div>
                      
                      {/* Batch total summary */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Calculated Batch Quantity</label>
                        <div className="w-full h-11 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-between px-3 text-xs font-black">
                          <span className={lumpTransactionType === 'REPLENISH' ? 'text-emerald-500' : 'text-red-500'}>
                            {lumpTransactionType === 'REPLENISH' ? 'Replenish (+)' : 'Consume (-)'}
                          </span>
                          <span className="font-mono text-sm text-[#3a525d]">{totalBatchLength.toFixed(2)} m</span>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Direction Selection */}
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setLumpTransactionType('REPLENISH')}
                        className={`flex-1 py-2 text-xs font-black uppercase rounded-xl border tracking-wide transition-all ${
                          lumpTransactionType === 'REPLENISH'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-black'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                        }`}
                      >
                        Replenish (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLumpTransactionType('CONSUME')}
                        className={`flex-1 py-2 text-xs font-black uppercase rounded-xl border tracking-wide transition-all ${
                          lumpTransactionType === 'CONSUME'
                            ? 'bg-red-500/10 border-red-500/30 text-red-600 font-black'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                        }`}
                      >
                        Consume (-)
                      </button>
                    </div>

                    {/* Batch Lumps scroll grid */}
                    <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      {lumps.map((lump, index) => {
                        const w = parseFloat(lump.width) || 0;
                        const len = parseFloat(lump.length) || 0;
                        const totalLumpLength = w * len;

                        return (
                          <div key={lump.id} className="p-4 bg-zinc-50 border border-zinc-150 rounded-2xl flex flex-col gap-3 relative hover:border-[#2d8d9b]/25 transition-all">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#3a525d]">
                              <span>Lump #{index + 1}</span>
                              <span className="font-mono text-zinc-550 text-[10px] font-black">
                                Total: {totalLumpLength.toFixed(2)} m
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Width (m)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={lump.width}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLumps(prev => prev.map(item => item.id === lump.id ? { ...item, width: val } : item));
                                  }}
                                  className="w-full h-9 bg-white border border-zinc-200 rounded-lg text-center font-bold text-xs outline-none focus:border-[#2d8d9b]"
                                  placeholder="1.5"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400">Length (m)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={lump.length}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLumps(prev => prev.map(item => item.id === lump.id ? { ...item, length: val } : item));
                                  }}
                                  className="w-full h-9 bg-white border border-zinc-200 rounded-lg text-center font-bold text-xs outline-none focus:border-[#2d8d9b]"
                                  placeholder="10.0"
                                />
                              </div>
                            </div>

                            {lumps.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setLumps(prev => prev.filter(item => item.id !== lump.id))}
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setLumps(prev => [...prev, { id: Date.now() + Math.random(), width: '1.5', length: '10' }])}
                      className="w-full h-10 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl font-black uppercase text-[10px] tracking-widest text-[#3a525d] transition-all flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      + Add Another Lump
                    </button>
                  </div>
                )}

                {/* 3. THRESHOLD LIMIT TAB */}
                {modalTab === 'THRESHOLD' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Automated Reorder Threshold</h4>
                      <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">Determine the low stock threshold. Reaching this limit automatically drafts a PO.</p>
                    </div>

                    <div className="space-y-4 bg-zinc-50 border border-zinc-150 p-6 rounded-2.5xl">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                          Low Stock Threshold Limit
                        </label>
                        <span className="text-[10px] font-black text-[#2d8d9b] bg-[#2d8d9b]/5 px-2.5 py-1 rounded">
                          Current limit: {newThreshold} meters
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          step="5"
                          value={newThreshold}
                          onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                          className="flex-1 accent-[#2d8d9b]"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newThreshold}
                          onChange={(e) => setNewThreshold(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-28 h-12 bg-white border border-[#fce4d4] rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-5 border-t border-zinc-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 h-14 bg-zinc-50 hover:bg-zinc-100 text-[#3a525d] rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-zinc-200/50"
                >
                  Cancel
                </button>
                {modalTab !== 'BATCH_LEDGER' && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-14 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#3a525d]/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin text-white" size={16} />
                    ) : (
                      modalTab === 'ADD_BATCH' ? 'Save Batch Entry' : 'Update Threshold'
                    )}
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
