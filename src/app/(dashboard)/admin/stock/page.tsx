'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Box, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Search, 
  Sliders, 
  Plus, 
  Minus, 
  Loader2, 
  RotateCw, 
  Layers,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Scissors,
  Ruler
} from 'lucide-react';

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

interface ProductType {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  materials: string;
  product_types?: ProductType;
  stocks: StockRecord[];
}

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
}

interface AdjustTarget {
  type: 'product' | 'fabric';
  product?: Product;
  fabric?: Fabric;
}

export default function StockDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'garments' | 'fabrics'>('garments');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  
  // Modal states
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingSize, setAdjustingSize] = useState<string>('M');
  const [physicalDelta, setPhysicalDelta] = useState<number>(0);
  const [newThreshold, setNewThreshold] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats states
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalFabrics: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalReserved: 0
  });

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/stock');
      const productsData = res.data?.products || [];
      const fabricsData = res.data?.fabrics || [];
      
      setProducts(productsData);
      setFabrics(fabricsData);
      calculateStats(productsData, fabricsData);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load inventory stock catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (productList: Product[], fabricList: Fabric[]) => {
    let lowStock = 0;
    let outOfStock = 0;
    let reserved = 0;

    productList.forEach(prod => {
      if (!prod.stocks || prod.stocks.length === 0) {
        outOfStock++;
      } else {
        prod.stocks.forEach(stock => {
          const available = stock.quantity - stock.reserved_quantity;
          if (available <= 0) {
            outOfStock++;
          } else if (available <= stock.low_stock_threshold) {
            lowStock++;
          }
          reserved += stock.reserved_quantity || 0;
        });
      }
    });

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
      totalProducts: productList.length,
      totalFabrics: fabricList.length,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      totalReserved: reserved
    });
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleOpenProductAdjust = (product: Product, sizeRecord?: StockRecord) => {
    setAdjustTarget({ type: 'product', product });
    const size = sizeRecord?.size || 'M';
    setAdjustingSize(size);
    setPhysicalDelta(0);
    setNewThreshold(sizeRecord?.low_stock_threshold ?? 5);
    setIsAdjustModalOpen(true);
  };

  const handleOpenFabricAdjust = (fabric: Fabric) => {
    setAdjustTarget({ type: 'fabric', fabric });
    setPhysicalDelta(0);
    setNewThreshold(Number(fabric.low_stock_threshold) ?? 10);
    setIsAdjustModalOpen(true);
  };

  const handleSizeChange = (size: string) => {
    setAdjustingSize(size);
    if (adjustTarget?.product) {
      const matched = adjustTarget.product.stocks.find(s => s.size === size);
      setNewThreshold(matched ? matched.low_stock_threshold : 5);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    setIsSubmitting(true);
    const targetName = adjustTarget.type === 'product'
      ? `${adjustTarget.product?.name} (Size ${adjustingSize})`
      : `${adjustTarget.fabric?.name}`;

    const loadingToast = toast.loading(`Updating stock for ${targetName}...`);
    
    try {
      const payload: any = {
        quantity_delta: physicalDelta,
        low_stock_threshold: newThreshold
      };

      if (adjustTarget.type === 'product') {
        payload.product_id = adjustTarget.product?.id;
        payload.size = adjustingSize;
      } else {
        payload.fabric_id = adjustTarget.fabric?.id;
      }

      await api.post('/inventory/stock/adjust', payload);

      toast.success('Stock adjusted successfully!', { id: loadingToast });
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
  const filteredProducts = React.useMemo(() => {
    return products.filter(prod => {
      const matchesSearch = 
        prod.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        prod.art_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prod.product_types?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'ALL') return true;

      const hasStocks = prod.stocks && prod.stocks.length > 0;

      if (filterStatus === 'OUT_OF_STOCK') {
        if (!hasStocks) return true;
        return prod.stocks.some(s => (s.quantity - s.reserved_quantity) <= 0);
      }

      if (filterStatus === 'LOW_STOCK') {
        if (!hasStocks) return false;
        return prod.stocks.some(s => {
          const avail = s.quantity - s.reserved_quantity;
          return avail > 0 && avail <= s.low_stock_threshold;
        });
      }

      if (filterStatus === 'IN_STOCK') {
        if (!hasStocks) return false;
        return prod.stocks.every(s => (s.quantity - s.reserved_quantity) > s.low_stock_threshold);
      }

      return true;
    });
  }, [products, searchTerm, filterStatus]);

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
              <Layers size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Stock & Thresholds</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Real-time physical inventory levels & automated purchase triggers
          </p>
        </div>

        <button 
          onClick={fetchStockData}
          disabled={isLoading}
          className="h-14 px-6 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
          Sync Inventory
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Products */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-[#2d8d9b]/30 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-[#3a525d]/5 flex items-center justify-center text-[#3a525d] border border-[#3a525d]/10 shrink-0">
            <Box size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]/60">Products</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] mt-0.5">{stats.totalProducts}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-zinc-800 scale-125 group-hover:scale-150 transition-transform duration-500">
            <Box size={60} />
          </div>
        </div>

        {/* Total Fabrics */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-[#2d8d9b]/30 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-[#2d8d9b]/5 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shrink-0">
            <Scissors size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b]/70">Fabric Lines</p>
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
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Low Stock</p>
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
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600/70">Depleted</p>
            <h3 className="text-2xl font-black italic tracking-tight text-red-600 mt-0.5">{stats.outOfStockCount}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-red-500 scale-125 group-hover:scale-150 transition-transform duration-500">
            <XCircle size={60} />
          </div>
        </div>

        {/* Total Reserved */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-teal-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-teal-600/70">Reserved</p>
            <h3 className="text-2xl font-black italic tracking-tight text-teal-600 mt-0.5">{stats.totalReserved}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-teal-500 scale-125 group-hover:scale-150 transition-transform duration-500">
            <ShieldCheck size={60} />
          </div>
        </div>

      </div>

      {/* Tabs Control Row */}
      <div className="flex gap-4 border-b border-[#fce4d4] pb-px">
        <button
          onClick={() => { setActiveTab('garments'); setFilterStatus('ALL'); }}
          className={`pb-4 px-6 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'garments' 
              ? 'border-[#2d8d9b] text-[#2d8d9b]' 
              : 'border-transparent text-[#3a525d]/60 hover:text-[#3a525d]'
          }`}
        >
          <Box size={16} />
          Finished Uniforms
        </button>
        <button
          onClick={() => { setActiveTab('fabrics'); setFilterStatus('ALL'); }}
          className={`pb-4 px-6 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'fabrics' 
              ? 'border-[#2d8d9b] text-[#2d8d9b]' 
              : 'border-transparent text-[#3a525d]/60 hover:text-[#3a525d]'
          }`}
        >
          <Scissors size={16} />
          Raw Fabrics
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#fce4d4] rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm animate-in fade-in duration-300">
        
        {/* Search */}
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'garments' ? "Search by article, name or category..." : "Search by fabric code, name, shade, brand..."}
            className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all text-[#3a525d] shadow-sm"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((status) => {
            const labels = {
              ALL: 'All Lines',
              IN_STOCK: 'In Stock',
              LOW_STOCK: 'Low Stock',
              OUT_OF_STOCK: 'Out of Stock'
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

      {/* Main Grid display of inventory */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-[#fce4d4] rounded-[3rem] gap-4">
          <Loader2 className="animate-spin text-[#2d8d9b]" size={40} />
          <p className="text-sm font-bold text-[#3a525d]">Parsing inventory ledger...</p>
        </div>
      ) : activeTab === 'garments' ? (
        filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {filteredProducts.map((product) => {
              const totalStock = product.stocks.reduce((acc, curr) => acc + curr.quantity, 0);
              const totalReserved = product.stocks.reduce((acc, curr) => acc + curr.reserved_quantity, 0);

              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-[2.5rem] border border-[#fce4d4] p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300"
                >
                  {/* Product Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-[#2d8d9b]/5 border border-[#2d8d9b]/10 rounded-2xl flex items-center justify-center text-[#2d8d9b] shadow-inner shrink-0">
                        <Box size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-lg tracking-tight text-[#3a525d] line-clamp-1">{product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {product.art_number}
                          </span>
                          {product.product_types?.name && (
                            <span className="text-[10px] font-black bg-[#2d8d9b]/5 text-[#2d8d9b] px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {product.product_types.name}
                            </span>
                          )}
                          {product.gender && (
                            <span className="text-[10px] font-black bg-[#3a525d]/5 text-[#3a525d] px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {product.gender}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenProductAdjust(product)}
                      className="px-4 py-2 border border-[#fce4d4] hover:bg-[#2d8d9b]/5 hover:text-[#2d8d9b] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#3a525d] flex items-center gap-1.5 transition-all"
                    >
                      <Sliders size={12} />
                      Quick Adjust
                    </button>
                  </div>

                  {/* Sizing Stock Breakdowns */}
                  <div className="mt-8 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] opacity-75">
                      Stock Levels by Size
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
                        const stock = product.stocks.find(s => s.size === sz);
                        const qty = stock?.quantity || 0;
                        const resQty = stock?.reserved_quantity || 0;
                        const avail = qty - resQty;
                        const threshold = stock?.low_stock_threshold ?? 5;

                        let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
                        if (avail <= 0) status = 'OUT_OF_STOCK';
                        else if (avail <= threshold) status = 'LOW_STOCK';

                        const statusColors = {
                          IN_STOCK: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50',
                          LOW_STOCK: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50',
                          OUT_OF_STOCK: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100/50'
                        };

                        return (
                          <div 
                            key={sz}
                            onClick={() => handleOpenProductAdjust(product, stock)}
                            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 flex flex-col justify-between h-24 ${
                              stock ? statusColors[status] : 'bg-zinc-50/50 border-zinc-100 text-zinc-400 opacity-60 hover:opacity-100 hover:bg-zinc-100/30'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-black text-xs">{sz}</span>
                              {stock ? (
                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/60">
                                  Avail: {avail}
                                </span>
                              ) : (
                                <span className="text-[8px] font-black uppercase tracking-wider">Unset</span>
                              )}
                            </div>

                            {stock ? (
                              <div className="mt-2 space-y-0.5">
                                <div className="flex justify-between text-[9px] font-bold">
                                  <span className="opacity-75">Physical:</span>
                                  <span className="font-extrabold">{qty}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-bold">
                                  <span className="opacity-75">Reserved:</span>
                                  <span className="font-extrabold">{resQty}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-bold border-t border-black/5 pt-0.5">
                                  <span className="opacity-75">Alert level:</span>
                                  <span className="font-extrabold">≤{threshold}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[9px] font-bold italic opacity-60">Click to initialize</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer summary */}
                  <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-[10px] font-bold text-zinc-500">
                    <p>Materials: <span className="font-black text-[#3a525d]">{product.materials || 'Standard Fabric'}</span></p>
                    <p>Aggregated Physical: <span className="font-black text-[#2d8d9b] text-xs">{totalStock}</span> | Reserved: <span className="font-black text-zinc-700">{totalReserved}</span></p>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#fce4d4] rounded-[3rem] p-24 text-center">
            <div className="flex flex-col items-center gap-4 opacity-30">
              <Box size={48} className="text-[#2d8d9b]" />
              <p className="text-xl font-black italic text-[#3a525d]">No matching stock records found</p>
              <p className="text-xs font-bold max-w-sm text-zinc-500">Try adjusting your filters or search keywords to locate specific articles.</p>
            </div>
          </div>
        )
      ) : (
        // Fabrics Tab Display
        filteredFabrics.length > 0 ? (
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

                    {/* Stock level indicators */}
                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between items-end text-xs">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">Stock Available</p>
                          <p className="text-xl font-black text-[#3a525d] italic tracking-tight">{qty.toFixed(2)} <span className="text-xs font-bold not-italic text-zinc-500">meters</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">Low stock alert</p>
                          <p className="text-xs font-extrabold text-zinc-600">≤ {threshold.toFixed(2)} m</p>
                        </div>
                      </div>

                      {/* Stock level visual bar */}
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
                    <span>Double click or press to adjust</span>
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
        )
      )}

      {/* Adjust Stock & Threshold Modal */}
      {isAdjustModalOpen && adjustTarget && (
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
                <h3 className="text-xl font-black italic text-[#3a525d] tracking-tight">Adjust Stock Levels</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-0.5">
                  {adjustTarget.type === 'product' ? adjustTarget.product?.name : adjustTarget.fabric?.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-6 space-y-6">
              
              {/* Product Only: Sizing dropdown */}
              {adjustTarget.type === 'product' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Select Size to Adjust</label>
                  <div className="grid grid-cols-6 gap-2">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => handleSizeChange(sz)}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${
                          adjustingSize === sz 
                            ? 'bg-[#2d8d9b] text-white shadow-md shadow-[#2d8d9b]/20' 
                            : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current size/fabric stats */}
              {adjustTarget.type === 'product' ? (() => {
                const currentStock = adjustTarget.product?.stocks.find(s => s.size === adjustingSize);
                return (
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Current Qty</p>
                      <p className="text-base font-black text-[#3a525d] mt-1">{currentStock?.quantity ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Reserved</p>
                      <p className="text-base font-black text-[#3a525d] mt-1">{currentStock?.reserved_quantity ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Available</p>
                      <p className="text-base font-black text-[#2d8d9b] mt-1">
                        {(currentStock?.quantity ?? 0) - (currentStock?.reserved_quantity ?? 0)}
                      </p>
                    </div>
                  </div>
                );
              })() : (() => {
                const currentQty = Number(adjustTarget.fabric?.quantity) || 0;
                const lowThreshold = Number(adjustTarget.fabric?.low_stock_threshold) || 0;
                return (
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Current Fabric Stock</p>
                      <p className="text-base font-black text-[#3a525d] mt-1">{currentQty.toFixed(2)} meters</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Threshold limit</p>
                      <p className="text-base font-black text-[#2d8d9b] mt-1">{lowThreshold.toFixed(2)} meters</p>
                    </div>
                  </div>
                );
              })()}

              {/* Physical Delta Adjustment */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                  <label>Physical Inventory Change</label>
                  <span className={`text-[9px] font-extrabold ${physicalDelta > 0 ? 'text-emerald-500' : physicalDelta < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                    {physicalDelta > 0 ? `+${physicalDelta} ${adjustTarget.type === 'product' ? 'items' : 'meters'}` : physicalDelta < 0 ? `${physicalDelta} ${adjustTarget.type === 'product' ? 'items' : 'meters'}` : 'No physical adjustment'}
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
                    step={adjustTarget.type === 'fabric' ? "0.01" : "1"}
                    value={physicalDelta}
                    onChange={(e) => setPhysicalDelta(parseFloat(e.target.value) || 0)}
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
                <p className="text-[9px] text-zinc-400 font-bold">Use positive values to replenish stock (e.g. receiving) or negative to account for damage/wastage.</p>
              </div>

              {/* Threshold level */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                    Low Stock Threshold Limit
                  </label>
                  <span className="text-[10px] font-black text-[#2d8d9b] bg-[#2d8d9b]/5 px-2 py-0.5 rounded">
                    Current limit: {newThreshold} {adjustTarget.type === 'product' ? 'items' : 'meters'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={adjustTarget.type === 'product' ? 100 : 500}
                    step={adjustTarget.type === 'fabric' ? 5 : 1}
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(parseFloat(e.target.value) || 0)}
                    className="flex-1 accent-[#2d8d9b]"
                  />
                  <input
                    type="number"
                    min="0"
                    step={adjustTarget.type === 'fabric' ? "0.01" : "1"}
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 h-12 bg-white border border-[#fce4d4] rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                  />
                </div>
                <p className="text-[9px] text-zinc-400 font-bold">
                  {adjustTarget.type === 'product'
                    ? 'When available stock falls below this limit, it flags an alert.'
                    : 'When available fabric roll physical quantity falls below this limit, the system automatically triggers a Purchase Order.'}
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
