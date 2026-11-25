'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
// Shared with the Readymades Items table (/admin/products) so names and type resolution match exactly
import { getProductDisplayName, parseMaterialsField as parseProductMaterials } from '@/app/(dashboard)/admin/products/page';

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

interface ProductType {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  category?: string;
  materials: string;
  base_size?: string | null;
  item_id?: number | string | null;
  specification_id?: number | string | null;
  product_type_id?: number | string | null;
  product_types?: ProductType;
  stocks: StockRecord[];
}

// Mirrors the Items table's parseArtNumber item-code resolution (only the item code is needed for filtering)
const parseArtItemCode = (artNumber: string, dresses: any[] = [], genders: any[] = []): string => {
  if (!artNumber) return '';
  const parts = artNumber.split('-');
  if (parts.length === 3) {
    const rawItem = parts[0];
    if ((dresses || []).find(d => d.code === rawItem)) return rawItem;
    const match = rawItem.match(/^([0-9a-zA-Z]+?)([A-Za-z])$/);
    return match ? match[1] : rawItem;
  }
  if (parts.length === 2) {
    if (dresses.some(d => d.code === parts[0])) {
      for (const g of genders) {
        if (parts[1].startsWith(g.code)) return parts[0];
      }
    }
    for (const dress of dresses) {
      if (parts[1].startsWith(dress.code)) return dress.code;
    }
  }
  return '';
};

const ITEM_FALLBACK_NAMES: Record<string, string> = { '1': 'Shirt', '2': 'Trouser', '3': 'Blazer', '4': 'T-Shirt', '5': 'Skirt' };

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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [filterGender, setFilterGender] = useState<string>('ALL');
  const [filterDress, setFilterDress] = useState<string>('ALL');
  const [filterGarmentType, setFilterGarmentType] = useState<string>('ALL');

  // Master data used by the Items table's name formatter and filters
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [dresses, setDresses] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingSize, setAdjustingSize] = useState<string>('M');
  const [physicalDelta, setPhysicalDelta] = useState<number>(0);
  const [newThreshold, setNewThreshold] = useState<number>(5);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessoryAdjustments, setAccessoryAdjustments] = useState<Record<string, { quantity_delta: number; low_stock_threshold: number }>>({});

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/stock');
      const allProducts: any[] = res.data?.products || [];
      // Strictly show Readymade (Trade) products; manufactured custom items and accessories are excluded
      const tradeProducts = allProducts.filter((p: any) => {
        const { type } = parseMaterialsField(p.materials);
        const pType = (p.product_type || type || '').toLowerCase();
        const isTrade = pType === 'trade_readymade' || pType === 'trade' || pType === 'readymade_trade';
        const isAccessory = (p.category || '').toLowerCase() === 'accessories' || pType === 'accessories';
        return isTrade && !isAccessory;
      });
      setProducts(tradeProducts);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load readymade trade stock catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
    // Loaded the same way as the Items table (failures fall back to empty lists)
    Promise.all([
      api.get('/product-types').catch(() => ({ data: [] })),
      api.get('/art-number-hub/master-data').catch(() => ({ data: { dresses: [], genders: [] } })),
    ]).then(([typeRes, masterHubRes]: any[]) => {
      setProductTypes(typeRes.data || []);
      setDresses(masterHubRes.data?.items || masterHubRes.data?.dresses || []);
      setGenders(masterHubRes.data?.genders || []);
    });
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

  // Readymade trade stock is tracked on the standard size (M), falling back to the first record
  const getStockInfo = (prod: Product) => {
    const s = prod.stocks?.find(st => st.size === 'M') || prod.stocks?.[0];
    const physical = s?.quantity ?? 0;
    const reserved = s?.reserved_quantity ?? 0;
    const threshold = s?.low_stock_threshold ?? 5;
    const available = physical - reserved;
    const status: StockStatus = !s || available <= 0 ? 'OUT_OF_STOCK' : available <= threshold ? 'LOW_STOCK' : 'IN_STOCK';
    return { record: s, size: s?.size || 'M', physical, reserved, threshold, available, status };
  };

  const statusCounts = React.useMemo(() => {
    const c = { IN_STOCK: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 };
    products.forEach(p => { c[getStockInfo(p).status]++; });
    return c;
  }, [products]);

  // Same garment type resolution as the Items table
  const getResolvedProductTypeName = (product: Product) => {
    if (product.product_types?.name) return product.product_types.name;
    if (product.product_type_id) {
      const pt = productTypes.find(t => String(t.id) === String(product.product_type_id));
      if (pt) return pt.name;
    }
    const parsed = parseProductMaterials(product.materials);
    if (parsed.type) return parsed.type;
    return product.category ? product.category.replace(/_/g, ' ') : '—';
  };

  // Items table filter options: Gender, Item, Garment Type
  const uniqueGenders = useMemo(() => {
    const set = new Set<string>();
    (genders || []).forEach(g => { if (g.name) set.add(g.name); });
    (products || []).forEach(p => { if (p.gender) set.add(p.gender); });
    return Array.from(set).sort();
  }, [genders, products]);

  const uniqueItemOptions = useMemo(() => {
    const formatItemTitle = (name: string) => {
      if (!name) return '';
      const trimmed = name.trim();
      if (trimmed.toUpperCase() === 'T-SHIRT') return 'T-Shirt';
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    };
    const map = new Map<string, { code: string; name: string }>();
    (dresses || []).forEach(d => {
      const code = String(d.code || '').trim();
      if (!code) return;
      map.set(code, { code, name: formatItemTitle(d.name || code) });
    });
    (products || []).forEach(p => {
      const itemCode = parseArtItemCode(p.art_number || '', dresses, genders);
      if (itemCode && !map.has(itemCode)) {
        map.set(itemCode, { code: itemCode, name: formatItemTitle(ITEM_FALLBACK_NAMES[itemCode] || itemCode) });
      }
    });
    return Array.from(map.values())
      .map(item => ({ label: item.name, value: item.code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [dresses, products, genders]);

  const uniqueGarmentTypes = useMemo(() => {
    const set = new Set<string>();
    (productTypes || []).forEach(pt => { if (pt.name) set.add(pt.name); });
    (products || []).forEach(p => {
      const typeName = getResolvedProductTypeName(p);
      if (typeName && typeName !== '—') set.add(typeName);
    });
    return Array.from(set).sort();
  }, [productTypes, products]);

  const filteredProducts = useMemo(() => products.filter(p => {
    if (filterStatus !== 'ALL' && getStockInfo(p).status !== filterStatus) return false;

    if (filterGender !== 'ALL') {
      const targetGender = filterGender.toLowerCase();
      const pGender = (p.gender || '').toLowerCase();
      const matchedGenderObj = (genders || []).find(g =>
        (g.name && g.name.toLowerCase() === targetGender) ||
        (g.code && g.code.toLowerCase() === targetGender)
      );
      const matchCode = matchedGenderObj?.code?.toLowerCase();
      const matchName = matchedGenderObj?.name?.toLowerCase();
      if (!(pGender === targetGender || (matchCode && pGender === matchCode) || (matchName && pGender === matchName))) return false;
    }

    if (filterDress !== 'ALL') {
      const target = filterDress.toLowerCase();
      const pItemCode = parseArtItemCode(p.art_number || '', dresses, genders).toLowerCase();
      const matchedItem = (dresses || []).find(d =>
        String(d.code).toLowerCase() === pItemCode ||
        String(d.id) === String(p.item_id)
      );
      const itemName = (matchedItem?.name || '').toLowerCase();
      if (!(pItemCode === target || itemName === target || String(p.item_id) === target)) return false;
    }

    if (filterGarmentType !== 'ALL') {
      const targetType = filterGarmentType.toLowerCase();
      const resolvedType = getResolvedProductTypeName(p).toLowerCase();
      const ptName = (p.product_types?.name || '').toLowerCase();
      const catName = (p.category || '').toLowerCase().replace(/_/g, ' ');
      if (!(resolvedType === targetType || ptName === targetType || catName === targetType)) return false;
    }

    return true;
  }), [products, genders, dresses, productTypes, filterStatus, filterGender, filterDress, filterGarmentType]);

  const columns: Column<Product>[] = [
    {
      header: 'ID',
      className: 'whitespace-nowrap',
      accessor: (p) => <span className="text-xs font-mono font-bold text-zinc-700 whitespace-nowrap">{p.art_number || '—'}</span>,
      sortable: true,
      sortValue: (p) => p.art_number || '',
    },
    {
      header: 'Item Name',
      accessor: (p) => (
        <div>
          <p className="font-black text-sm tracking-tight text-zinc-900">{getProductDisplayName(p, dresses, genders)}</p>
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            {p.product_types?.name || p.category?.replace('_', ' ') || ''}
          </span>
        </div>
      ),
      sortable: true,
      sortValue: (p) => getProductDisplayName(p, dresses, genders),
    },
    {
      header: 'Available Stock',
      className: 'text-right',
      accessor: (p) => {
        const i = getStockInfo(p);
        return <span className={`font-mono text-xs font-black ${STATUS_META[i.status].text}`}>{i.available}</span>;
      },
      sortable: true,
      sortValue: (p) => getStockInfo(p).available,
    },
    {
      header: 'Status',
      className: 'text-center',
      accessor: (p) => {
        const meta = STATUS_META[getStockInfo(p).status];
        return <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${meta.pill}`}>{meta.label}</span>;
      },
      sortable: true,
      sortValue: (p) => getStockInfo(p).status,
    },
    {
      header: 'Action',
      className: 'text-center',
      accessor: (p) => {
        const i = getStockInfo(p);
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleOpenProductAdjust(p, i.size, i.record); }}
            className={i.record
              ? 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white text-[#C82A2B] border border-[#C82A2B]/30 hover:bg-[#FFF1F1] transition-all cursor-pointer whitespace-nowrap'
              : 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white transition-all cursor-pointer whitespace-nowrap'}
          >
            {i.record ? 'Adjust' : 'Initialize'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Readymade Stock</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1">
          Finished Garments Procured For Trade / Resale
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={isLoading}
        searchPlaceholder="Search"
        emptyMessage='No readymade stock. Register articles as "Readymade (Trade)" in Products to manage them here.'
        rowClassName={(p) => STATUS_META[getStockInfo(p).status].row}
        headerAction={
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Gender"
              allLabel="All Genders"
              value={filterGender}
              onChange={setFilterGender}
              options={uniqueGenders}
            />
            <FilterDropdown
              label="Item"
              allLabel="All Items"
              value={filterDress}
              onChange={setFilterDress}
              options={uniqueItemOptions}
              maxWidth="max-w-[220px]"
            />
            <FilterDropdown
              label="Garment Type"
              allLabel="All Garment Types"
              value={filterGarmentType}
              onChange={setFilterGarmentType}
              options={uniqueGarmentTypes}
              maxWidth="max-w-[220px]"
            />
            <FilterDropdown
              label="Stock Status"
              allLabel="All Garments"
              allBadge={products.length}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as typeof filterStatus)}
              options={[
                { label: 'In Stock', value: 'IN_STOCK', badge: statusCounts.IN_STOCK },
                { label: 'Low Stock', value: 'LOW_STOCK', badge: statusCounts.LOW_STOCK },
                { label: 'Out of Stock', value: 'OUT_OF_STOCK', badge: statusCounts.OUT_OF_STOCK },
              ]}
              maxWidth="max-w-[220px]"
            />
          </div>
        }
      />

      {/* Adjust Stock & Threshold Modal */}
      {isAdjustModalOpen && selectedProduct && (() => {
        const { type: parsedType } = parseMaterialsField(selectedProduct.materials);
        const isAccessory = parsedType === 'accessories';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
              className={`w-full ${isAccessory ? 'max-w-3xl' : 'max-w-lg'} bg-white rounded-[3rem] p-8 border border-zinc-200/80 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header decor */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />

              <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mt-2">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white border border-zinc-800">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic text-[#18181b] tracking-tight">
                    {isInitializing ? 'Initialize Stock Level' : 'Adjust Stock Levels'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#9E1B1D] mt-0.5">
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
                        <div key={sz} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#C82A2B]/35 transition-all">
                          {/* Size Tag & Stats */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-black text-[#C82A2B] bg-[#C82A2B]/10 px-2.5 py-1 rounded-lg">
                              {sz}
                            </span>
                            <div className="text-[10px] font-bold text-zinc-500 space-x-2">
                              <span>Current: <strong className="text-[#18181b]">{qty}</strong></span>
                              <span>Reserved: <strong className="text-zinc-600">{res}</strong></span>
                              <span>Avail: <strong className={avail <= 0 ? 'text-red-500' : 'text-emerald-600'}>{avail}</strong></span>
                            </div>
                          </div>

                          {/* Delta and Threshold Edit */}
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Delta Quantity */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#18181b]/70">Change Qty</span>
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
                                  className="w-14 h-7 bg-white border border-zinc-200/80 rounded-md text-center font-black text-xs outline-none focus:ring-2 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
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
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#18181b]/70">Threshold Limit</span>
                              <input
                                type="number"
                                min="0"
                                value={adj.low_stock_threshold}
                                onChange={(e) => updateAdj('low_stock_threshold', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 h-7 bg-white border border-zinc-200/80 rounded-md text-center font-black text-xs outline-none focus:ring-2 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
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
                            <p className="text-base font-black text-[#18181b] mt-1">{currentStock?.quantity ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Reserved</p>
                            <p className="text-base font-black text-[#18181b] mt-1">{currentStock?.reserved_quantity ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Available</p>
                            <p className="text-base font-black text-[#C82A2B] mt-1">
                              {(currentStock?.quantity ?? 0) - (currentStock?.reserved_quantity ?? 0)}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Physical Delta Adjustment */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#18181b]">
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
                          className="flex-1 h-12 bg-white border border-zinc-200/80 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#18181b]">
                          Low Stock Threshold Limit
                        </label>
                        <span className="text-[10px] font-black text-[#C82A2B] bg-[#C82A2B]/5 px-2 py-0.5 rounded">
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
                          className="flex-1 accent-[#C82A2B]"
                        />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={newThreshold}
                          onChange={(e) => setNewThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-24 h-12 bg-white border border-zinc-200/80 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
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
                    className="flex-1 h-14 bg-zinc-50 hover:bg-zinc-100 text-[#18181b] rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-zinc-200/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-14 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#C82A2B]/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin text-white" size={16} />
                    ) : (
                      'Save'
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
