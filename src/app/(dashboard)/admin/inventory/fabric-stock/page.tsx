'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';
import { Loader2, SlidersHorizontal, X, Calendar } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { formatFabricDisplayName } from '@/lib/fabricFormatter';

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
const STATUS_META: Record<StockStatus, { label: string; pill: string; text: string; row: string; bar: string }> = {
  IN_STOCK: { label: 'In Stock', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-600', row: '', bar: 'bg-emerald-500' },
  LOW_STOCK: { label: 'Low Stock', pill: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-600', row: 'bg-amber-50/30', bar: 'bg-amber-500' },
  OUT_OF_STOCK: { label: 'Out of Stock', pill: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-600', row: 'bg-rose-50/30', bar: 'bg-rose-500' },
};

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
  garment_category?: string | null;
  brand_type?: string | null;
  quality?: string | null;
}

export default function FabricStockPage() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');

  // Fabric catalog filters (same as the Fabrics Items table)
  const [garmentCategoryFilter, setGarmentCategoryFilter] = useState<string>('ALL');
  const [brandTypeFilter, setBrandTypeFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [qualityFilter, setQualityFilter] = useState<string>('ALL');
  const [shadeFilter, setShadeFilter] = useState<string>('ALL');
  const [widthFilter, setWidthFilter] = useState<string>('ALL');
  
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
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load fabric stock catalog.');
    } finally {
      setIsLoading(false);
    }
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

  const getStockInfo = (fab: Fabric) => {
    const qty = Number(fab.quantity) || 0;
    const threshold = Number(fab.low_stock_threshold) || 0;
    const status: StockStatus = qty <= 0 ? 'OUT_OF_STOCK' : qty <= threshold ? 'LOW_STOCK' : 'IN_STOCK';
    const percentage = Math.min(100, Math.max(5, (qty / Math.max(1, threshold * 2)) * 100));
    return { qty, status, percentage };
  };

  const uniqueGarmentCategories = React.useMemo(() => {
    const set = new Set<string>();
    ['BOTTOM', 'SHIRTING', 'SUITING'].forEach(c => set.add(c));
    fabrics.forEach(f => { if (f.garment_category) set.add(f.garment_category); });
    return Array.from(set).sort();
  }, [fabrics]);

  const uniqueBrandTypes = React.useMemo(() => {
    const set = new Set<string>();
    ['Branded', 'Semi-Branded', 'Non-Branded'].forEach(b => set.add(b));
    fabrics.forEach(f => { if (f.brand_type) set.add(f.brand_type); });
    return Array.from(set).sort();
  }, [fabrics]);

  const uniqueBrands = React.useMemo(() => (Array.from(new Set(fabrics.map(f => f.brand_name).filter(Boolean))) as string[]).sort(), [fabrics]);
  const uniqueQualities = React.useMemo(() => (Array.from(new Set(fabrics.map(f => f.quality).filter(Boolean))) as string[]).sort(), [fabrics]);
  const uniqueShades = React.useMemo(() => (Array.from(new Set(fabrics.map(f => f.shade).filter(Boolean))) as string[]).sort(), [fabrics]);
  const uniqueWidths = React.useMemo(() => (Array.from(new Set(fabrics.map(f => f.width).filter(Boolean))) as string[]).sort(), [fabrics]);

  const catalogFilteredFabrics = React.useMemo(() => fabrics.filter(f => {
    if (garmentCategoryFilter !== 'ALL' && (f.garment_category || '').toLowerCase() !== garmentCategoryFilter.toLowerCase()) return false;
    if (brandTypeFilter !== 'ALL' && (f.brand_type || '').toLowerCase() !== brandTypeFilter.toLowerCase()) return false;
    if (brandFilter !== 'ALL' && (f.brand_name || '').toLowerCase() !== brandFilter.toLowerCase()) return false;
    if (qualityFilter !== 'ALL' && (f.quality || '').toLowerCase() !== qualityFilter.toLowerCase()) return false;
    if (shadeFilter !== 'ALL' && (f.shade || '').toLowerCase() !== shadeFilter.toLowerCase()) return false;
    if (widthFilter !== 'ALL' && String(f.width || '') !== String(widthFilter)) return false;
    return true;
  }), [fabrics, garmentCategoryFilter, brandTypeFilter, brandFilter, qualityFilter, shadeFilter, widthFilter]);

  const isCatalogFiltered = garmentCategoryFilter !== 'ALL' || brandTypeFilter !== 'ALL' || brandFilter !== 'ALL' || qualityFilter !== 'ALL' || shadeFilter !== 'ALL' || widthFilter !== 'ALL';

  const statusCounts = React.useMemo(() => {
    const c = { IN_STOCK: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 };
    catalogFilteredFabrics.forEach(f => { c[getStockInfo(f).status]++; });
    return c;
  }, [catalogFilteredFabrics]);

  const filteredFabrics = React.useMemo(
    () => catalogFilteredFabrics.filter(f => filterStatus === 'ALL' || getStockInfo(f).status === filterStatus),
    [catalogFilteredFabrics, filterStatus]
  );

  const columns: Column<Fabric>[] = [
    {
      header: 'ID',
      accessor: (f) => <span className="font-mono text-xs font-bold text-zinc-500 whitespace-nowrap">{f.code || '—'}</span>,
      sortable: true,
      sortValue: (f) => f.code || '',
    },
    {
      header: 'Item Name',
      accessor: (f) => {
        const displayName = formatFabricDisplayName(f);
        return (
          <div className="min-w-0 max-w-[360px]" title={displayName}>
            <p className="font-bold text-sm text-zinc-900 truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              {f.brand_name && (
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider truncate">
                  {f.brand_name} {f.quality ? `• ${f.quality}` : ''}
                </span>
              )}
              {f.shade && (
                <span className="text-[10px] font-bold text-[#9E1B1D] bg-[#FFF1F1] px-1.5 py-0.5 rounded whitespace-nowrap">
                  Shade: {f.shade}
                </span>
              )}
            </div>
          </div>
        );
      },
      sortable: true,
      sortValue: (f) => f.name,
    },
    {
      header: 'Available Stock',
      className: 'text-right',
      accessor: (f) => {
        const i = getStockInfo(f);
        return (
          <div className="flex flex-col items-end gap-1">
            <span className={`font-mono text-xs font-black whitespace-nowrap ${STATUS_META[i.status].text}`}>{i.qty.toFixed(2)} m</span>
            <div className="w-16 h-1.5 bg-zinc-200/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${STATUS_META[i.status].bar}`} style={{ width: `${i.percentage}%` }} />
            </div>
          </div>
        );
      },
      sortable: true,
      sortValue: (f) => getStockInfo(f).qty,
    },
    {
      header: 'Status',
      className: 'text-center',
      accessor: (f) => {
        const meta = STATUS_META[getStockInfo(f).status];
        return <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${meta.pill}`}>{meta.label}</span>;
      },
      sortable: true,
      sortValue: (f) => getStockInfo(f).status,
    },
    {
      header: 'Action',
      className: 'text-center',
      accessor: (f) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleOpenFabricAdjust(f); }}
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
        <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Fabric Stock Ledger</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1">
          Linear meter roll quantities, color shades & automated PO threshold levels
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filteredFabrics}
        isLoading={isLoading}
        searchPlaceholder="Search"
        emptyMessage="No matching fabric records found"
        rowClassName={(f) => STATUS_META[getStockInfo(f).status].row}
        onRowClick={(f) => handleOpenFabricAdjust(f)}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown
              label="Fabric Type"
              allLabel="All Fabric Types"
              value={garmentCategoryFilter}
              onChange={setGarmentCategoryFilter}
              options={uniqueGarmentCategories}
              maxWidth="max-w-[210px]"
            />
            <FilterDropdown
              label="Brand Type"
              allLabel="All Brand Types"
              value={brandTypeFilter}
              onChange={setBrandTypeFilter}
              options={uniqueBrandTypes}
              maxWidth="max-w-[190px]"
            />
            <FilterDropdown
              label="Brand"
              allLabel="All Brands"
              value={brandFilter}
              onChange={setBrandFilter}
              options={uniqueBrands}
              maxWidth="max-w-[190px]"
            />
            <FilterDropdown
              label="Quality Name"
              allLabel="All Quality Names"
              value={qualityFilter}
              onChange={setQualityFilter}
              options={uniqueQualities}
              maxWidth="max-w-[190px]"
            />
            <FilterDropdown
              label="Shade"
              allLabel="All Shades"
              value={shadeFilter}
              onChange={setShadeFilter}
              options={uniqueShades}
              maxWidth="max-w-[180px]"
            />
            <FilterDropdown
              label="Width"
              allLabel="All Widths"
              value={widthFilter}
              onChange={setWidthFilter}
              options={uniqueWidths.map(w => ({ label: `${w}"`, value: w }))}
              maxWidth="max-w-[160px]"
            />
            <FilterDropdown
              label="Stock Status"
              allLabel="All Fabrics"
              allBadge={catalogFilteredFabrics.length}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as typeof filterStatus)}
              options={[
                { label: 'In Stock', value: 'IN_STOCK', badge: statusCounts.IN_STOCK },
                { label: 'Low Stock', value: 'LOW_STOCK', badge: statusCounts.LOW_STOCK },
                { label: 'Out of Stock', value: 'OUT_OF_STOCK', badge: statusCounts.OUT_OF_STOCK },
              ]}
              maxWidth="max-w-[220px]"
            />
            {isCatalogFiltered && (
              <button
                type="button"
                onClick={() => {
                  setGarmentCategoryFilter('ALL');
                  setBrandTypeFilter('ALL');
                  setBrandFilter('ALL');
                  setQualityFilter('ALL');
                  setShadeFilter('ALL');
                  setWidthFilter('ALL');
                }}
                className="h-10 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Clear all active filters"
              >
                Reset
              </button>
            )}
          </div>
        }
      />

      {/* Adjust Stock & Threshold Modal */}
      {isAdjustModalOpen && selectedFabric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="w-full max-w-2xl bg-white rounded-[3rem] p-8 border border-zinc-200/80 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />
            
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mt-2 shrink-0">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white border border-zinc-800">
                <SlidersHorizontal size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black italic text-zinc-900 tracking-tight">Adjust Fabric Stock</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#9E1B1D] mt-0.5">
                      {selectedFabric.name} ({selectedFabric.code})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block">Current Stock</span>
                    <span className="text-lg font-black text-zinc-900 font-mono leading-none">{(Number(selectedFabric.quantity) || 0).toFixed(2)} m</span>
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
                    ? 'bg-[#C82A2B] text-white shadow' 
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
                    ? 'bg-[#C82A2B] text-white shadow' 
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
                    ? 'bg-[#C82A2B] text-white shadow' 
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
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Recorded Batch History</h4>
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
                            <div key={batch.id || bIdx} className="bg-white border border-zinc-150 rounded-2.5xl p-5 shadow-sm space-y-3 hover:border-[#C82A2B]/35 transition-all">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase font-mono tracking-widest bg-zinc-100 text-zinc-500 border border-zinc-200">
                                    {batch.batch_no}
                                  </span>
                                  <p className="text-[9px] text-zinc-400 font-bold mt-1">
                                    {formatDate(batch.created_at, true)}
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
                                    <span className="font-black text-zinc-900">{lump.total_length} m</span>
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
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">New Batch Entry</h4>
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
                          className="w-full h-11 px-3 bg-white border border-zinc-200/80 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                        />
                      </div>
                      
                      {/* Batch total summary */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Calculated Batch Quantity</label>
                        <div className="w-full h-11 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-between px-3 text-xs font-black">
                          <span className={lumpTransactionType === 'REPLENISH' ? 'text-emerald-500' : 'text-red-500'}>
                            {lumpTransactionType === 'REPLENISH' ? 'Replenish (+)' : 'Consume (-)'}
                          </span>
                          <span className="font-mono text-sm text-zinc-900">{totalBatchLength.toFixed(2)} m</span>
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
                          <div key={lump.id} className="p-4 bg-zinc-50 border border-zinc-150 rounded-2xl flex flex-col gap-3 relative hover:border-[#C82A2B]/35 transition-all">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-900">
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
                                  className="w-full h-9 bg-white border border-zinc-200 rounded-lg text-center font-bold text-xs outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
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
                                  className="w-full h-9 bg-white border border-zinc-200 rounded-lg text-center font-bold text-xs outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
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
                      className="w-full h-10 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl font-black uppercase text-[10px] tracking-widest text-zinc-900 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      + Add Another Lump
                    </button>
                  </div>
                )}

                {/* 3. THRESHOLD LIMIT TAB */}
                {modalTab === 'THRESHOLD' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Automated Reorder Threshold</h4>
                      <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">Determine the low stock threshold. Reaching this limit automatically drafts a PO.</p>
                    </div>

                    <div className="space-y-4 bg-zinc-50 border border-zinc-150 p-6 rounded-2.5xl">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
                          Low Stock Threshold Limit
                        </label>
                        <span className="text-[10px] font-black text-[#C82A2B] bg-[#C82A2B]/5 px-2.5 py-1 rounded">
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
                          className="flex-1 accent-[#C82A2B]"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newThreshold}
                          onChange={(e) => setNewThreshold(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-28 h-12 bg-white border border-zinc-200/80 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
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
                  className="flex-1 h-14 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-zinc-200/50"
                >
                  Cancel
                </button>
                {modalTab !== 'BATCH_LEDGER' && (
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
                )}
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
