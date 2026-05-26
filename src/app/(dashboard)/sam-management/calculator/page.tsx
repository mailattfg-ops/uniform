'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Calculator,
  Save,
  Package,
  TrendingUp,
  Coins,
  Percent,
  Sparkles,
  Info
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  sam_value?: number | null;
  retail_sam_value?: number | null;
}

interface Component {
  name: string;
  type: 'percentage';
  value: number;
}

interface Slab {
  min_qty: number;
  max_qty: number | null;
  adjustment_percent: number;
  enabled: boolean;
}

interface SAMConfig {
  id: number;
  name: string;
  product_id: number | null;
  wholesale_slabs: Slab[];
  retail_slabs: Slab[];
  components: Component[];
}

export default function SAMCalculator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [baseValue, setBaseValue] = useState<number>(150); // Default Base Stitching Value
  const [salesType, setSalesType] = useState<'wholesale' | 'retail'>('wholesale');
  const [quantity, setQuantity] = useState<number>(10);
  const [config, setConfig] = useState<SAMConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch products and active configurations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, configRes] = await Promise.all([
          api.get('/products'),
          api.get('/sam-management/configurations')
        ]);

        setProducts(prodRes.data || []);

        if (configRes.data && !configRes.data.error) {
          // Use the global config (product_id is null)
          const globalConfig = (configRes.data || []).find((c: any) => c.product_id === null) || configRes.data?.[0];
          setConfig(globalConfig || null);
        }
      } catch (err: any) {
        toast.error('Failed to load data. Please ensure database tables exist.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Perform client-side calculations in real-time
  const calculation = useMemo(() => {
    if (!config) return { 
      baseSAM: 0, 
      appliedSlabPercent: 0, 
      wholesaleSAM: 0,
      wholesaleSlabPercent: 0,
      retailSlabPercent: 0,
      adjustedSAM: 0, 
      finalCost: 0, 
      componentsDetails: [] as { name: string; percentage: number; contribution: number }[],
      slabs: [] as Slab[]
    };

    const components = config.components || [];
    const baseVal = parseFloat(String(baseValue)) || 0;

    // Calculate each component contribution as a percentage of baseVal
    const componentsDetails = components.map(c => {
      const pct = parseFloat(String(c.value || 0));
      const contribution = (pct / 100) * baseVal;
      return {
        name: c.name || '',
        percentage: pct,
        contribution: contribution
      };
    });

    const totalBaseSAM = baseVal + componentsDetails.reduce((sum, c) => sum + (c.contribution || 0), 0);

    // Find wholesale adjustment
    const slabsW = config.wholesale_slabs || [];
    const qty = parseInt(String(quantity), 10) || 0;

    const matchingSlabW = slabsW.find(s => {
      if (!s || !s.enabled) return false;
      const min = parseInt(String(s.min_qty), 10) || 0;
      const max = s.max_qty === null || s.max_qty === undefined ? null : parseInt(String(s.max_qty), 10);
      return max === null ? qty >= min : qty >= min && qty <= max;
    });
    const appliedSlabPercentW = matchingSlabW ? parseFloat(String(matchingSlabW.adjustment_percent || 0)) : 0;
    const wholesaleSAM = totalBaseSAM * (1 + appliedSlabPercentW / 100);

    let finalCost = wholesaleSAM;
    let appliedSlabPercent = appliedSlabPercentW;
    let adjustedSAM = wholesaleSAM;
    let appliedSlabPercentR = 0;

    // Find retail adjustment (cumulative on top of wholesale value)
    if (salesType === 'retail') {
      const slabsR = config.retail_slabs || [];
      const matchingSlabR = slabsR.find(s => {
        if (!s || !s.enabled) return false;
        const min = parseInt(String(s.min_qty), 10) || 0;
        const max = s.max_qty === null || s.max_qty === undefined ? null : parseInt(String(s.max_qty), 10);
        return max === null ? qty >= min : qty >= min && qty <= max;
      });
      appliedSlabPercentR = matchingSlabR ? parseFloat(String(matchingSlabR.adjustment_percent || 0)) : 0;
      const retailSAM = wholesaleSAM * (1 + appliedSlabPercentR / 100);

      finalCost = retailSAM;
      adjustedSAM = retailSAM;
      appliedSlabPercent = appliedSlabPercentR;
    }

    return {
      baseSAM: totalBaseSAM,
      appliedSlabPercent,
      wholesaleSAM,
      wholesaleSlabPercent: appliedSlabPercentW,
      retailSlabPercent: appliedSlabPercentR,
      adjustedSAM,
      finalCost,
      componentsDetails,
      slabs: (salesType === 'wholesale' ? slabsW : config.retail_slabs) || []
    };
  }, [config, baseValue, salesType, quantity]);

  const handleSaveCalculation = async () => {
    if (!config) {
      toast.error('No configuration found to perform calculations.');
      return;
    }
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity.');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/sam-management/calculate', {
        product_id: selectedProductId ? parseInt(selectedProductId, 10) : null,
        sales_type: salesType,
        quantity: quantity,
        base_value: baseValue
      });
      toast.success('Costing logged to history successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record calculation.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === parseInt(selectedProductId, 10));
  }, [products, selectedProductId]);

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-spin text-[#2d8d9b] border-4 border-t-transparent rounded-full w-12 h-12" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-100 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500">
          <Info size={40} />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-black text-[#3a525d]">SAM Configuration Missing</h3>
          <p className="text-sm text-muted-foreground font-medium">Please execute database migrations and set up your SAM cost components configuration first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">SAM Cost Calculator</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
          Standard Allowed Minutes costing engine
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scope & Breakdown */}
        <div className="lg:col-span-2 space-y-8">
          {/* Costing Settings Card */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-zinc-100/80 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                <Package size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#3a525d]">Scope and Parameters</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Set stitching base and quantities</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Product Selector */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-black text-[#3a525d] uppercase tracking-wider block">Target Product (Optional)</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-[#3a525d] focus:border-[#2d8d9b] focus:bg-white outline-none transition-all"
                >
                  <option value="">-- Baseline Costing --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.art_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Base Value Input */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#3a525d] uppercase tracking-wider block">Base Value</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={baseValue}
                  onChange={(e) => setBaseValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-[#3a525d] focus:border-[#2d8d9b] focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#3a525d] uppercase tracking-wider block">Order Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-[#3a525d] focus:border-[#2d8d9b] focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            {/* Channel category */}
            <div className="space-y-3">
              <label className="text-xs font-black text-[#3a525d] uppercase tracking-wider block">Sales Channel Category</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSalesType('wholesale')}
                  className={`h-14 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${salesType === 'wholesale'
                      ? 'border-[#2d8d9b] bg-[#2d8d9b]/5 text-[#2d8d9b] shadow-md font-black'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 font-bold'
                    }`}
                >
                  <TrendingUp size={18} />
                  <span>Wholesale</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSalesType('retail')}
                  className={`h-14 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${salesType === 'retail'
                      ? 'border-[#2d8d9b] bg-[#2d8d9b]/5 text-[#2d8d9b] shadow-md font-black'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 font-bold'
                    }`}
                >
                  <Coins size={18} />
                  <span>Retail</span>
                </button>
              </div>
            </div>
          </div>

          {/* Component breakdown */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-zinc-100/80 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#3a525d]">Cost Component contributions</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Percentage breakdown relative to Base Value (₹{baseValue.toFixed(2)})
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden bg-zinc-50/50">
              <div className="grid grid-cols-3 p-4 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <span>Cost Head</span>
                <span className="text-right">Configured %</span>
                <span className="text-right">SAM Cost Contribution (₹)</span>
              </div>

              {/* Base Stitching Value Row */}
              <div className="grid grid-cols-3 p-4 text-xs font-semibold text-[#3a525d] items-center bg-white border-b">
                <span className="font-bold">Base Value (Stitching)</span>
                <span className="text-right font-mono font-bold text-zinc-400">Baseline</span>
                <span className="text-right font-mono font-black text-[#2d8d9b]">
                  ₹{baseValue.toFixed(2)}
                </span>
              </div>

              {(calculation?.componentsDetails || []).map((comp, idx) => (
                <div key={idx} className="grid grid-cols-3 p-4 text-xs font-semibold text-[#3a525d] items-center bg-white hover:bg-zinc-50/50 transition-all">
                  <span className="font-bold">{comp.name}</span>
                  <span className="text-right font-mono font-bold text-zinc-400">
                    {comp.percentage}%
                  </span>
                  <span className="text-right font-mono font-black text-[#2d8d9b]">
                    ₹{(comp.contribution || 0).toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="grid grid-cols-3 p-4 bg-zinc-50 font-black text-sm text-[#3a525d] border-t-2 border-zinc-100">
                <span className="col-span-2">Base SAM Subtotal</span>
                <span className="text-right font-mono text-orange-500">
                  ₹{(calculation?.baseSAM ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Pricing */}
        <div className="space-y-8">
          {/* Slabs list */}
          <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-zinc-100/80 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Percent size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#3a525d]">Adjustment Slabs</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Active slabs for {salesType}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {(calculation?.slabs || []).map((slab, idx) => {
                if (!slab) return null;
                const min = slab.min_qty || 0;
                const max = slab.max_qty;
                const rangeLabel = max === null ? `${min}+` : `${min} - ${max}`;

                // Determine if this slab is active
                const isSlabActive = slab.enabled && (
                  max === null ? quantity >= min : quantity >= min && quantity <= max
                );

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] font-bold transition-all ${isSlabActive
                        ? 'border-[#2d8d9b] bg-[#2d8d9b]/10 text-[#2d8d9b] scale-[1.02] shadow-sm font-black'
                        : slab.enabled
                          ? 'border-zinc-100 text-zinc-600'
                          : 'border-zinc-50 text-zinc-300 line-through bg-zinc-50/20'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono">Qty: {rangeLabel}</span>
                      {!slab.enabled && <span className="text-[8px] bg-zinc-100 text-zinc-400 px-1 rounded uppercase">Disabled</span>}
                    </div>
                    <span className={`font-mono ${isSlabActive ? 'text-[#2d8d9b] text-xs' : 'text-zinc-500'}`}>
                      {(slab.adjustment_percent || 0) >= 0 ? `+${slab.adjustment_percent}%` : `${slab.adjustment_percent}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Checkout */}
          <div className="bg-[#3a525d] text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[360px]">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-[8rem] pointer-events-none" />
            <div className="absolute left-4 bottom-4 text-white/5 pointer-events-none">
              <Sparkles size={120} />
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white/70">
                <span className="text-[10px] font-black uppercase tracking-widest">SAM costing review</span>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60 font-semibold">Total Base SAM Cost:</span>
                  <span className="font-mono font-bold">₹{(calculation?.baseSAM ?? 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                  <span className="text-white/60 font-semibold">Wholesale Slab Modifier:</span>
                  <span className="font-mono font-bold text-[#fce4d4]">
                    {(calculation?.wholesaleSlabPercent ?? 0) >= 0 ? `+${calculation?.wholesaleSlabPercent ?? 0}%` : `${calculation?.wholesaleSlabPercent ?? 0}%`}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-white/60 font-semibold">Wholesale SAM Price (B2B):</span>
                  <span className="font-mono font-bold text-[#fce4d4]">₹{(calculation?.wholesaleSAM ?? 0).toFixed(2)}</span>
                </div>

                {salesType === 'retail' && (
                  <>
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-white/60 font-semibold">Retail Slab Modifier:</span>
                      <span className="font-mono font-bold text-orange-300">
                        +{(calculation?.retailSlabPercent ?? 0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-white/60 font-semibold">Retail SAM Price (B2C):</span>
                      <span className="font-mono font-bold text-orange-300">₹{(calculation?.finalCost ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center text-xs border-t border-white/10 pt-3">
                  <span className="text-white/60 font-semibold">Product scope:</span>
                  <span className="font-bold max-w-[120px] truncate">
                    {selectedProduct ? `${selectedProduct.name}` : 'Unlinked Baseline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4 relative z-10">
              <div className="text-center bg-white/10 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Final SAM Price</p>
                <p className="text-3xl font-black font-mono text-[#fce4d4] mt-1">
                  ₹{(calculation?.finalCost ?? 0).toFixed(2)}
                </p>
              </div>

              {!selectedProductId ? (
                <p className="text-[9px] text-white/50 text-center italic leading-normal">
                  * Select a product from the registry above to save this costing calculation directly to the catalog history.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveCalculation}
                  disabled={isSaving}
                  className="w-full h-12 bg-white text-[#3a525d] hover:bg-[#fce4d4] disabled:bg-white/50 transition-all font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : 'Apply & Save to History'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
