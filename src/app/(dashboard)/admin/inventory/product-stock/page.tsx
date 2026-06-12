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
  SlidersHorizontal
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
  base_size?: string | null;
  product_types?: ProductType;
  stocks: StockRecord[];
}

const parseMaterialsField = (rawText: string | undefined | null) => {
  if (!rawText) return { type: '', materials: '' };
  const typeMatch = rawText.match(/\[ProductType:\s*([^\]]+)\]/i);
  const type = typeMatch ? typeMatch[1].trim().toLowerCase() : '';
  const materials = rawText.replace(/\[[^\]]+\]/g, '').trim();
  return { type, materials };
};

export default function ProductStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingSize, setAdjustingSize] = useState<string>('M');
  const [physicalDelta, setPhysicalDelta] = useState<number>(0);
  const [newThreshold, setNewThreshold] = useState<number>(5);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessoryAdjustments, setAccessoryAdjustments] = useState<Record<string, { quantity_delta: number; low_stock_threshold: number }>>({});

  // Stats states
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalReserved: 0
  });

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/stock');
      const productsData = res.data?.products || [];
      setProducts(productsData);
      calculateStats(productsData);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load product stock catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (productList: Product[]) => {
    let lowStock = 0;
    let outOfStock = 0;
    let reserved = 0;

    productList.forEach(prod => {
      const stock = prod.stocks?.find(s => s.size === 'M') || prod.stocks?.[0];
      if (!stock) {
        outOfStock++;
      } else {
        const available = stock.quantity - stock.reserved_quantity;
        if (available <= 0) {
          outOfStock++;
        } else if (available <= stock.low_stock_threshold) {
          lowStock++;
        }
        reserved += stock.reserved_quantity || 0;
      }
    });

    setStats({
      totalProducts: productList.length,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      totalReserved: reserved
    });
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleOpenProductAdjust = (product: Product, size: string, stockRecord?: StockRecord) => {
    setSelectedProduct(product);
    setAdjustingSize(size);
    setPhysicalDelta(0);
    setNewThreshold(stockRecord?.low_stock_threshold ?? 5);
    setIsInitializing(!stockRecord);

    const { type: parsedType } = parseMaterialsField(product.materials);
    const isAccessory = parsedType === 'accessories';
    if (isAccessory && product.base_size) {
      const sizes = product.base_size.split(',').map(s => s.trim()).filter(Boolean);
      const initialAdjustments: Record<string, { quantity_delta: number; low_stock_threshold: number }> = {};
      sizes.forEach(sz => {
        const s = product.stocks?.find(st => st.size === sz);
        initialAdjustments[sz] = {
          quantity_delta: 0,
          low_stock_threshold: s?.low_stock_threshold ?? 5
        };
      });
      setAccessoryAdjustments(initialAdjustments);
    }

    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    const targetName = selectedProduct.name;
    const { type: parsedType } = parseMaterialsField(selectedProduct.materials);
    const isAccessory = parsedType === 'accessories';

    if (isAccessory && selectedProduct.base_size) {
      const loadingToast = toast.loading(`Updating accessory stocks for ${targetName}...`);
      try {
        const sizes = selectedProduct.base_size.split(',').map(s => s.trim()).filter(Boolean);
        for (const sz of sizes) {
          const adj = accessoryAdjustments[sz];
          if (adj) {
            const payload = {
              product_id: selectedProduct.id,
              size: sz,
              quantity_delta: adj.quantity_delta,
              low_stock_threshold: adj.low_stock_threshold
            };
            await api.post('/inventory/stock/adjust', payload);
          }
        }
        toast.success('Accessory stocks updated successfully!', { id: loadingToast });
        setIsAdjustModalOpen(false);
        fetchStockData();
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to adjust accessory stock.';
        toast.error(errorMsg, { id: loadingToast });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const loadingToast = toast.loading(`Updating stock for ${targetName} (${adjustingSize})...`);
      try {
        const payload: any = {
          product_id: selectedProduct.id,
          size: adjustingSize,
          quantity_delta: physicalDelta,
          low_stock_threshold: newThreshold
        };

        await api.post('/inventory/stock/adjust', payload);

        toast.success('Product stock adjusted successfully!', { id: loadingToast });
        setIsAdjustModalOpen(false);
        fetchStockData();
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to adjust stock. Make sure you have administrator permissions.';
        toast.error(errorMsg, { id: loadingToast });
      } finally {
        setIsSubmitting(false);
      }
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

      const stock = prod.stocks?.find(s => s.size === 'M') || prod.stocks?.[0];

      if (filterStatus === 'OUT_OF_STOCK') {
        if (!stock) return true;
        return (stock.quantity - stock.reserved_quantity) <= 0;
      }

      if (filterStatus === 'LOW_STOCK') {
        if (!stock) return false;
        const avail = stock.quantity - stock.reserved_quantity;
        return avail > 0 && avail <= stock.low_stock_threshold;
      }

      if (filterStatus === 'IN_STOCK') {
        if (!stock) return false;
        return (stock.quantity - stock.reserved_quantity) > stock.low_stock_threshold;
      }

      return true;
    });
  }, [products, searchTerm, filterStatus]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Layers size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Product Stock</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Real-time finished garments inventory levels & alert thresholds
          </p>
        </div>

        <button 
          onClick={fetchStockData}
          disabled={isLoading}
          className="h-14 px-6 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
          Sync Product Stock
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Products */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-[#2d8d9b]/30 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-[#3a525d]/5 flex items-center justify-center text-[#3a525d] border border-[#3a525d]/10 shrink-0">
            <Box size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]/60">Garment Items</p>
            <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] mt-0.5">{stats.totalProducts}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-zinc-800 scale-125 group-hover:scale-150 transition-transform duration-500">
            <Box size={60} />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Low Stock Products</p>
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
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600/70">Out of Stock</p>
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
            <p className="text-[9px] font-black uppercase tracking-widest text-teal-600/70">Reserved Stock</p>
            <h3 className="text-2xl font-black italic tracking-tight text-teal-600 mt-0.5">{stats.totalReserved}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-teal-500 scale-125 group-hover:scale-150 transition-transform duration-500">
            <ShieldCheck size={60} />
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
            placeholder="Search by article number, name or category..."
            className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all text-[#3a525d] shadow-sm"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((status) => {
            const labels = {
              ALL: 'All Garments',
              IN_STOCK: 'In Stock',
              LOW_STOCK: 'Low Stock Alerts',
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

      {/* Main Grid display of finished uniform stocks */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-[#fce4d4] rounded-[3rem] gap-4">
          <Loader2 className="animate-spin text-[#2d8d9b]" size={40} />
          <p className="text-sm font-bold text-[#3a525d]">Parsing product stock database...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-500">
          {filteredProducts.map((product) => {
            const { type: parsedType } = parseMaterialsField(product.materials);
            const isAccessory = parsedType === 'accessories';
            const sizes = isAccessory && product.base_size 
              ? product.base_size.split(',').map(s => s.trim()).filter(Boolean) 
              : ['M']; // default standard size

            const totalStock = product.stocks
              ? product.stocks.filter((s: StockRecord) => sizes.includes(s.size)).reduce((acc: number, s: StockRecord) => acc + s.quantity, 0)
              : 0;
            const totalReserved = product.stocks
              ? product.stocks.filter((s: StockRecord) => sizes.includes(s.size)).reduce((acc: number, s: StockRecord) => acc + s.reserved_quantity, 0)
              : 0;

            const hasInitializedStock = product.stocks && product.stocks.length > 0;

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
                </div>

                {/* Sizing Stock Breakdowns */}
                <div className="mt-8 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] opacity-75">
                    Stock Levels {isAccessory && '(Sizing Roll)'}
                  </p>

                  {hasInitializedStock ? (
                    <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-150 text-[9px] font-black uppercase tracking-widest text-[#3a525d]">
                            {isAccessory && <th className="py-2.5 px-4">Size</th>}
                            <th className="py-2.5 px-4">Physical</th>
                            <th className="py-2.5 px-4 text-right">Reserved</th>
                            <th className="py-2.5 px-4 text-right">Available</th>
                            <th className="py-2.5 px-4 text-right">Alert Threshold</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-zinc-750 font-bold">
                          {sizes.map((size: string) => {
                            const s = product.stocks?.find(st => st.size === size);
                            const qty = s ? s.quantity : 0;
                            const res = s ? s.reserved_quantity : 0;
                            const thresh = s ? s.low_stock_threshold : 5;
                            const avail = qty - res;
                            const isLow = avail <= thresh;
                            const isOut = avail <= 0;

                            return (
                              <tr key={size} className={`hover:bg-zinc-50/50 transition-colors ${
                                isOut ? 'bg-red-50/20 text-red-700' : isLow ? 'bg-amber-50/20 text-amber-700' : ''
                              }`}>
                                {isAccessory && <td className="py-2.5 px-4 font-black text-[#2d8d9b]">{size}</td>}
                                <td className="py-2.5 px-4 font-mono">{qty}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-zinc-400">{res}</td>
                                <td className={`py-2.5 px-4 text-right font-black font-mono ${
                                  isOut ? 'text-red-650' : isLow ? 'text-amber-650' : 'text-emerald-600'
                                }`}>{avail}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-zinc-400">≤ {thresh}</td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => handleOpenProductAdjust(product, size, s)}
                                    className="px-2.5 py-1 text-[9px] font-black uppercase border border-zinc-205 hover:border-[#2d8d9b] hover:text-[#2d8d9b] rounded-lg bg-white transition-all shadow-sm"
                                  >
                                    {s ? 'Adjust' : 'Init'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl text-center">
                      <p className="text-xs text-zinc-400 font-bold italic">No stock records initialized.</p>
                      <button
                        onClick={() => handleOpenProductAdjust(product, sizes[0])}
                        className="mt-3 px-4 py-2 bg-white border border-[#fce4d4] hover:bg-zinc-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#3a525d] transition-all flex items-center gap-1.5 mx-auto shadow-sm"
                      >
                        <Plus size={12} className="text-[#2d8d9b]" />
                        Initialize Stock
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer summary */}
                <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-[10px] font-bold text-zinc-500">
                  <p>Materials: <span className="font-black text-[#3a525d]">{parseMaterialsField(product.materials).materials || 'Standard Fabric'}</span></p>
                  <p>Physical Stock: <span className="font-black text-[#2d8d9b] text-xs">{totalStock}</span> | Reserved: <span className="font-black text-zinc-700">{totalReserved}</span></p>
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
      )}

      {/* Adjust Stock & Threshold Modal */}
      {isAdjustModalOpen && selectedProduct && (() => {
        const { type: parsedType } = parseMaterialsField(selectedProduct.materials);
        const isAccessory = parsedType === 'accessories';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div 
              className={`w-full ${isAccessory ? 'max-w-3xl' : 'max-w-lg'} bg-white rounded-[3rem] p-8 border border-[#fce4d4] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header decor */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#3a525d] via-[#2d8d9b] to-[#fce4d4]" />
              
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mt-2">
                <div className="w-12 h-12 bg-[#2d8d9b]/10 rounded-2xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic text-[#3a525d] tracking-tight">
                    {isInitializing ? 'Initialize Stock Level' : 'Adjust Stock Levels'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-0.5">
                    {selectedProduct.name}
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdjustSubmit} className="mt-6 space-y-6">

                {isAccessory ? (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                    {selectedProduct.base_size?.split(',').map(s => s.trim()).filter(Boolean).map((sz) => {
                      const currentStock = selectedProduct.stocks?.find(st => st.size === sz);
                      const qty = currentStock?.quantity ?? 0;
                      const res = currentStock?.reserved_quantity ?? 0;
                      const avail = qty - res;
                      const adj = accessoryAdjustments[sz] || { quantity_delta: 0, low_stock_threshold: 5 };

                      const updateAdj = (field: 'quantity_delta' | 'low_stock_threshold', value: number) => {
                        setAccessoryAdjustments(prev => ({
                          ...prev,
                          [sz]: {
                            ...prev[sz] || { quantity_delta: 0, low_stock_threshold: 5 },
                            [field]: value
                          }
                        }));
                      };

                      return (
                        <div key={sz} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#2d8d9b]/35 transition-all">
                          {/* Size Tag & Stats */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-black text-[#2d8d9b] bg-[#2d8d9b]/10 px-2.5 py-1 rounded-lg">
                              {sz}
                            </span>
                            <div className="text-[10px] font-bold text-zinc-500 space-x-2">
                              <span>Current: <strong className="text-[#3a525d]">{qty}</strong></span>
                              <span>Reserved: <strong className="text-zinc-600">{res}</strong></span>
                              <span>Avail: <strong className={avail <= 0 ? 'text-red-500' : 'text-emerald-600'}>{avail}</strong></span>
                            </div>
                          </div>

                          {/* Delta and Threshold Edit */}
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Delta Quantity */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#3a525d]/70">Change Qty</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateAdj('quantity_delta', adj.quantity_delta - 1)}
                                  className="w-7 h-7 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-md flex items-center justify-center font-bold text-zinc-700 transition-all text-xs"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={adj.quantity_delta}
                                  onChange={(e) => updateAdj('quantity_delta', parseInt(e.target.value) || 0)}
                                  className="w-14 h-7 bg-white border border-[#fce4d4] rounded-md text-center font-black text-xs outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateAdj('quantity_delta', adj.quantity_delta + 1)}
                                  className="w-7 h-7 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-md flex items-center justify-center font-bold text-zinc-700 transition-all text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Low Stock Threshold */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#3a525d]/70">Threshold Limit</span>
                              <input
                                type="number"
                                min="0"
                                value={adj.low_stock_threshold}
                                onChange={(e) => updateAdj('low_stock_threshold', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 h-7 bg-white border border-[#fce4d4] rounded-md text-center font-black text-xs outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Stats */}
                    {(() => {
                      const currentStock = selectedProduct.stocks.find(s => s.size === adjustingSize);
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
                    })()}

                    {/* Physical Delta Adjustment */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        <label>Physical Inventory Change</label>
                        <span className={`text-[9px] font-extrabold ${physicalDelta > 0 ? 'text-emerald-500' : physicalDelta < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                          {physicalDelta > 0 ? `+${physicalDelta} items` : physicalDelta < 0 ? `${physicalDelta} items` : 'No physical adjustment'}
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
                      <p className="text-[9px] text-zinc-400 font-bold">Use positive values to replenish stock (e.g. receiving) or negative to account for damage/wastage.</p>
                    </div>

                    {/* Threshold level */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                          Low Stock Threshold Limit
                        </label>
                        <span className="text-[10px] font-black text-[#2d8d9b] bg-[#2d8d9b]/5 px-2 py-0.5 rounded">
                          Current limit: {newThreshold} items
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
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
                        When available stock falls below this limit, it flags an alert.
                      </p>
                    </div>
                  </>
                )}

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
        );
      })()}

    </div>
  );
}
