'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight, CheckCircle2, Clock, AlertTriangle, Layers, Trash2, Package } from 'lucide-react';
import { ProductType, TemplateLineItem, ManualItem, SeparateFabricItem } from '../../page';

const parseMaterialsField = (rawText: string | undefined | null) => {
  if (!rawText) return { type: '', materials: '' };
  const match = rawText.match(/^\[ProductType:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { type: match[1].trim(), materials: match[2].trim() };
  }
  return { type: '', materials: rawText };
};

interface WizardStep2Props {
  hasMeasurements: boolean;
  orgAnalysis: any;
  templateLineItems: TemplateLineItem[];
  setTemplateLineItems: (items: TemplateLineItem[]) => void;
  manualItems: ManualItem[];
  setManualItems: (items: ManualItem[]) => void;
  separateFabrics: SeparateFabricItem[];
  setSeparateFabrics: (items: SeparateFabricItem[]) => void;
  orgDepartments?: any[];
  setOrgDepartments?: (depts: any[]) => void;
  departmentItems?: Record<string, ManualItem[]>;
  setDepartmentItems?: (items: Record<string, ManualItem[]>) => void;
  productTypes: ProductType[];
  allProducts: any[];
  fabricsList: any[];
  buttonsList: any[];
  threadsList: any[];
  inwardRates: any[];
  fabricMargins: any[];
  samConfigurations: any[];
  salesType: string;
  customerType: string;
  calculateProductSAMCost: (samValueStr: string, quantityStr: string) => number;
  calculateFabricCost: (fabricId: string, metersStr: string, fabricSamStr: string, productTypeId: string) => number;
  laborRatePerHour: string;
  isAnalyzing: boolean;
  onBack: () => void;
  onNext: () => void;
  isManualItemsValid: () => boolean;
  quotationType?: string;
  organizations?: any[];
  selectedOrgId?: string;
}

export default function WizardStep2({
  hasMeasurements,
  orgAnalysis,
  templateLineItems,
  setTemplateLineItems,
  manualItems,
  setManualItems,
  separateFabrics,
  setSeparateFabrics,
  orgDepartments = [],
  setOrgDepartments,
  departmentItems = {},
  setDepartmentItems,
  productTypes,
  allProducts,
  fabricsList,
  buttonsList,
  threadsList,
  inwardRates,
  fabricMargins,
  samConfigurations,
  salesType,
  customerType,
  calculateProductSAMCost,
  calculateFabricCost,
  laborRatePerHour,
  isAnalyzing,
  onBack,
  onNext,
  isManualItemsValid,
  quotationType = 'STANDARD',
  organizations = [],
  selectedOrgId = '',
}: WizardStep2Props) {

  // Deduplicate template line items by product_id
  const mergedMap = new Map<number, TemplateLineItem & { _indices: number[] }>();
  templateLineItems.forEach((item, idx) => {
    const key = item.product_id;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      if (item.design_number_override && !existing.design_number_override.split(', ').includes(item.design_number_override)) {
        existing.design_number_override = existing.design_number_override
          ? `${existing.design_number_override}, ${item.design_number_override}`
          : item.design_number_override;
      }
      existing._indices.push(idx);
    } else {
      mergedMap.set(key, { ...item, _indices: [idx] });
    }
  });
  const mergedItems = Array.from(mergedMap.values());

  const getQty = (item: TemplateLineItem) => orgAnalysis.entities.filter((ent: any) => {
    if (ent.measurement_status !== 'Completed') return false;
    const eg = (ent.gender || '').toLowerCase();
    const ig = (item.gender || '').toLowerCase();
    if (ig === 'unisex' || ig === 'all') return true;
    if (ig === 'male' || ig === 'm') return eg === 'male' || eg === 'm';
    if (ig === 'female' || ig === 'f') return eg === 'female' || eg === 'f';
    return false;
  }).length;

  const totalQty = mergedItems.reduce((s, item) => s + getQty(item), 0);
  const totalSAMMin = mergedItems.reduce((s, item) => s + (item.sam_value ? item.sam_value * getQty(item) : 0), 0);
  const totalPrice = mergedItems.reduce((s, item) => {
    const p = parseFloat(item.price_override || '0');
    return s + (p > 0 ? p * getQty(item) : 0);
  }, 0);

  // Helper: get inward rate for a fabric based on its category and width
  const getRateForFabric = (fabricId: string): string => {
    if (!fabricId) return '0.00';
    const fabric = fabricsList.find((f: any) => String(f.id) === fabricId);
    if (!fabric) return '0.00';

    const nameLower = (fabric.name || '').toLowerCase();
    let category = 'SHIRTING';
    if (nameLower.includes('suiting')) {
      category = 'SUITING';
    } else if (nameLower.includes('bottom') || nameLower.includes('pant') || nameLower.includes('trouser')) {
      category = 'BOTTOM';
    }

    const widthStr = String(fabric.width || '');
    const matched = inwardRates.find(
      (r: any) => r.item?.toUpperCase() === category && String(r.width) === widthStr
    );
    if (matched) return parseFloat(matched.rate).toFixed(2);

    const matchingWidth = inwardRates.filter((r: any) => String(r.width) === widthStr);
    if (matchingWidth.length > 0) {
      const avg = matchingWidth.reduce((s: number, r: any) => s + parseFloat(r.rate || 0), 0) / matchingWidth.length;
      return avg.toFixed(2);
    }
    return '0.00';
  };

  const getMarginForFabric = (fabricId: string): number => {
    if (!fabricId) return 0;
    const fabric = fabricsList.find((f: any) => String(f.id) === fabricId);
    if (!fabric) return 0;
    const marginRow = fabricMargins.find(
      (m: any) => m.sales_type?.toUpperCase() === salesType.toUpperCase() &&
        m.customer_type?.toUpperCase() === customerType.toUpperCase()
    );
    if (!marginRow) return 0;
    const brandType = (fabric.brand_type || '').toLowerCase();
    if (brandType.includes('branded') && !brandType.includes('semi')) {
      return parseFloat(marginRow.branded) || 0;
    } else if (brandType.includes('semi')) {
      return parseFloat(marginRow.semi_branded) || 0;
    } else {
      return parseFloat(marginRow.non_branded) || 0;
    }
  };

  // Compute costs for a single item
  const getItemCosts = (item: ManualItem) => {
    const mainFabricCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
    const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
    const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
    const buttonCost = 0; // included in product price
    const threadCost = 0; // included in product price
    const samCost = calculateProductSAMCost(item.sam_value, item.quantity);
    const unitTotal = mainFabricCost + att1Cost + att2Cost + buttonCost + threadCost + samCost;
    const btnPrice = buttonsList.find((b: any) => String(b.id) === String(item.button_id))?.unit_price || 0;
    const thrPrice = threadsList.find((t: any) => String(t.id) === String(item.thread_id))?.unit_price || 0;
    return { mainFabricCost, att1Cost, att2Cost, buttonCost, threadCost, samCost, unitTotal, btnPrice, thrPrice };
  };

  // Update an item and auto-recompute price
  const updateItem = (index: number, changes: Partial<ManualItem>) => {
    const updated = [...manualItems];
    const newItem = { ...updated[index], ...changes };
    const costs = getItemCosts(newItem);
    newItem.price = costs.unitTotal.toFixed(2);
    updated[index] = newItem;
    setManualItems(updated);
  };

  const addNewItem = () => {
    setManualItems([
      ...manualItems,
      {
        id: Date.now(), product_type_id: '', product_id: '',
        fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
        attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
        attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
        button_id: '', button_count: '', thread_id: '', thread_count: '',
        sam_value: '', design_number: '', quantity: '1', price: ''
      }
    ]);
  };

  const addSeparateFabric = () => {
    setSeparateFabrics([
      ...separateFabrics,
      {
        id: Date.now() + Math.random(),
        fabric_id: '',
        meters: '1',
        rate: '0.00'
      }
    ]);
  };

  const updateSeparateFabric = (idx: number, changes: Partial<SeparateFabricItem>) => {
    const updated = [...separateFabrics];
    const item = { ...updated[idx], ...changes };
    if (changes.fabric_id) {
      const fabric = fabricsList.find((f: any) => String(f.id) === String(changes.fabric_id));
      if (fabric) {
        const calculatedRate = calculateFabricCost(fabric.id, '1', '6.777', '');
        item.rate = calculatedRate > 0 ? calculatedRate.toFixed(2) : (parseFloat(fabric.cost_per_meter) || 0).toFixed(2);
      }
    }
    updated[idx] = item;
    setSeparateFabrics(updated);
  };

  const removeSeparateFabric = (idx: number) => {
    setSeparateFabrics(separateFabrics.filter((_, i) => i !== idx));
  };

  // Shared select style
  const selectCls = "w-full px-2.5 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] focus:ring-1 focus:ring-[#2d8d9b]/20 bg-white transition-all";
  const inputCls = "px-2.5 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] focus:ring-1 focus:ring-[#2d8d9b]/20 text-center transition-all w-full disabled:opacity-40 disabled:cursor-not-allowed";

  const renderManualItemCard = (item: ManualItem, index: number) => {
    const { mainFabricCost, att1Cost, att2Cost, buttonCost, threadCost, samCost, unitTotal: calculatedUnitTotal, btnPrice, thrPrice } = getItemCosts(item);
    const unitTotal = quotationType === 'READYMADE' ? (parseFloat(item.price) || 0) : calculatedUnitTotal;

    const filteredProducts = allProducts.filter(p => {
      const isCorrectCategory = String(p.product_type_id) === String(item.product_type_id);
      if (quotationType === 'READYMADE') {
        const parsed = parseMaterialsField(p.materials);
        return isCorrectCategory && parsed.type?.toLowerCase() === 'trade_readymade';
      }
      if (quotationType === 'STANDARD') {
        const parsed = parseMaterialsField(p.materials);
        return isCorrectCategory && parsed.type?.toLowerCase() === 'readymade';
      }
      return isCorrectCategory;
    });

    const totalItemCost = unitTotal * (parseInt(item.quantity) || 0);

    const mainFabric = fabricsList.find((f: any) => String(f.id) === item.fabric_id);
    const att1Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric1_id);
    const att2Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric2_id);

    return (
      <div key={item.id} className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">

        {/* ── Card Header ── */}
        {quotationType === 'FABRIC' ? (
          <div className="p-5 bg-gradient-to-r from-zinc-50/80 to-white border-b border-zinc-100">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Quantity */}
              <div className="w-24">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Quantity</p>
                <input
                  type="number" min="1" placeholder="50"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center gap-6 ml-auto">
                {/* Unit Cost Display */}
                <div className="text-right self-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Unit Cost</p>
                  <p className="text-2xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                    ₹{unitTotal.toFixed(2)}
                  </p>
                  {parseInt(item.quantity) > 1 && (
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                      × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => setManualItems(manualItems.filter((_, i) => i !== index))}
                  disabled={manualItems.length === 1}
                  className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-center disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-gradient-to-r from-zinc-50/80 to-white border-b border-zinc-100">
            <div className="flex items-start gap-4 flex-wrap">
              {/* Product Type */}
              <div className="min-w-[150px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product Type</p>
                <select
                  className={selectCls}
                  value={item.product_type_id}
                  onChange={(e) => updateItem(index, {
                    product_type_id: e.target.value,
                    product_id: '', sam_value: '', design_number: ''
                  })}
                >
                  <option value="">Select type...</option>
                  {productTypes.map(pt => (
                    <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product</p>
                <select
                  className={`${selectCls} ${!item.product_type_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={item.product_id || ''}
                  disabled={!item.product_type_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    const prod = allProducts.find(p => String(p.id) === val);
                    const updates: Partial<ManualItem> = { product_id: val };
                    if (prod) {
                      updates.sam_value = prod.sam_value !== null ? String(prod.sam_value) : '';
                      if (prod.main_fabric !== null && prod.main_fabric !== undefined)
                        updates.main_fabric_meters = String(prod.main_fabric);
                      if (prod.attachment_fabric1 !== null && prod.attachment_fabric1 !== undefined)
                        updates.attachment_fabric1_meters = String(prod.attachment_fabric1);
                      if (prod.attachment_fabric2 !== null && prod.attachment_fabric2 !== undefined)
                        updates.attachment_fabric2_meters = String(prod.attachment_fabric2);
                      if (prod.button_count !== null && prod.button_count !== undefined)
                        updates.button_count = String(prod.button_count);
                      if (prod.thread_count !== null && prod.thread_count !== undefined)
                        updates.thread_count = String(prod.thread_count);

                      updates.main_fabric_sam = '6.777'; // Default Fabric SAM value
                      updates.attachment_fabric1_sam = prod.attachment_fabric1 ? '6.777' : '';
                      updates.attachment_fabric2_sam = prod.attachment_fabric2 ? '6.777' : '';

                      updates.design_number = [prod.art_number, prod.name, prod.materials].filter(Boolean).join(' - ');
                    } else {
                      updates.sam_value = '';
                      updates.main_fabric_sam = '';
                      updates.attachment_fabric1_sam = '';
                      updates.attachment_fabric2_sam = '';
                      updates.design_number = '';
                    }
                    updateItem(index, updates);
                  }}
                >
                  <option value="">{item.product_type_id ? 'Select product...' : 'Select type first'}</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}{p.art_number ? ` (${p.art_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Size (for MANUAL type) */}
              {quotationType === 'MANUAL' && (
                <div className="w-32">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Size
                  </p>
                  <select
                    className={selectCls}
                    value={item.size_breakdown?.selected_size || ''}
                    onChange={(e) => updateItem(index, {
                      size_breakdown: { ...(item.size_breakdown || {}), selected_size: e.target.value }
                    })}
                  >
                    <option value="">Select size...</option>
                    {(() => {
                      const prod = allProducts.find((p: any) => String(p.id) === String(item.product_id));
                      const sizes = prod?.other_sizes
                        ? prod.other_sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];
                      return sizes.map((sz: string) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ));
                    })()}
                  </select>
                </div>
              )}

              {/* Product SAM */}
              {quotationType !== 'READYMADE' && (
                <div className="w-24">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product SAM</p>
                  <input
                    type="number" step="any" min="0" placeholder="0"
                    value={item.sam_value}
                    onChange={(e) => updateItem(index, { sam_value: e.target.value })}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Final SAM Price */}
              {quotationType !== 'READYMADE' && (
                <div className="w-28 text-right self-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Final SAM Price</p>
                  <p className="text-sm font-black text-[#8b6b5a] font-mono mt-2">
                    ₹{samCost.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Unit Price (for READYMADE) */}
              {quotationType === 'READYMADE' && (
                <div className="w-28">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Unit Price</p>
                  <input
                    type="number" step="any" min="0" placeholder="0.00"
                    value={item.price}
                    onChange={(e) => updateItem(index, { price: e.target.value })}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="w-24">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Quantity</p>
                <input
                  type="number" min="1" placeholder="50"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Unit Cost Display */}
              <div className="ml-auto text-right self-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  {quotationType === 'READYMADE' ? 'Unit Price' : 'Unit Cost'}
                </p>
                <p className="text-2xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                  ₹{unitTotal.toFixed(2)}
                </p>
                {parseInt(item.quantity) > 1 && (
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                    × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                  </p>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => setManualItems(manualItems.filter((_, i) => i !== index))}
                disabled={manualItems.length === 1}
                className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-start mt-5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Notes / Design */}
            <div className="mt-3">
              <input
                type="text"
                value={item.design_number}
                onChange={(e) => updateItem(index, { design_number: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold border border-zinc-100 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] bg-white placeholder:text-zinc-300 transition-all"
                placeholder="Design notes, color, fit details..."
              />
            </div>
          </div>
        )}

        {/* ── Costing Breakdown Table ── */}
        <div className="p-5" style={{ display: quotationType === 'READYMADE' ? 'none' : 'block' }}>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Material Cost Breakdown</p>
          <div className="rounded-2xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                  <th className="p-3 text-left w-32">Component</th>
                  <th className="p-3 text-left">Item Selection</th>
                  <th className="p-3 text-left w-24">Meters / Qty</th>
                  <th className="p-3 text-left w-24">Fabric Width</th>
                  <th className="p-3 text-left w-36">Fabric SAM</th>
                  <th className="p-3 text-right w-24">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">

                {/* ── Main Fabric (MANDATORY) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2d8d9b] flex-shrink-0"></span>
                      <span className="font-black text-[#3a525d]">Main Fabric</span>
                      <span className="text-red-400 font-black text-[10px]">*</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className={selectCls}
                      value={item.fabric_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = { fabric_id: val, main_fabric_rate: '0.00' };
                        if (val && !item.main_fabric_sam) {
                          updates.main_fabric_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Select fabric...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                        </option>
                      ))}
                    </select>
                    {item.fabric_id && (
                      <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                        Trans: ₹{getRateForFabric(item.fabric_id)}/m | Margin: {getMarginForFabric(item.fabric_id)}%
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0.0"
                        value={item.main_fabric_meters}
                        onChange={(e) => updateItem(index, { main_fabric_meters: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">m</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-600">
                      {mainFabric?.width ? `${mainFabric.width}"` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.fabric_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                        <input
                          type="number" step="any" min="0" placeholder="0.00"
                          value={item.main_fabric_sam}
                          onChange={(e) => updateItem(index, { main_fabric_sam: e.target.value })}
                          className={`${inputCls} w-24 px-2 py-1 text-left`}
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${mainFabricCost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                      ₹{mainFabricCost.toFixed(2)}
                    </span>
                  </td>
                </tr>

                {/* ── Attachment Fabric 1 (OPTIONAL) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0"></span>
                      <span className="font-semibold text-zinc-500">Att. Fabric 1</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className={selectCls}
                      value={item.attachment_fabric1_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = { attachment_fabric1_id: val, attachment_fabric1_rate: '0.00' };
                        if (val && !item.attachment_fabric1_sam) {
                          updates.attachment_fabric1_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Optional...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                        </option>
                      ))}
                    </select>
                    {item.attachment_fabric1_id && (
                      <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                        Trans: ₹{getRateForFabric(item.attachment_fabric1_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric1_id)}%
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0.0"
                        value={item.attachment_fabric1_meters}
                        disabled={!item.attachment_fabric1_id}
                        onChange={(e) => updateItem(index, { attachment_fabric1_meters: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">m</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-600">
                      {att1Fabric?.width ? `${att1Fabric.width}"` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.attachment_fabric1_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                        <input
                          type="number" step="any" min="0" placeholder="0.00"
                          value={item.attachment_fabric1_sam}
                          onChange={(e) => updateItem(index, { attachment_fabric1_sam: e.target.value })}
                          className={`${inputCls} w-24 px-2 py-1 text-left`}
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${att1Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                      ₹{att1Cost.toFixed(2)}
                    </span>
                  </td>
                </tr>

                {/* ── Attachment Fabric 2 (OPTIONAL) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-200 flex-shrink-0"></span>
                      <span className="font-semibold text-zinc-450">Att. Fabric 2</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className={selectCls}
                      value={item.attachment_fabric2_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = { attachment_fabric2_id: val, attachment_fabric2_rate: '0.00' };
                        if (val && !item.attachment_fabric2_sam) {
                          updates.attachment_fabric2_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Optional...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                        </option>
                      ))}
                    </select>
                    {item.attachment_fabric2_id && (
                      <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                        Trans: ₹{getRateForFabric(item.attachment_fabric2_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric2_id)}%
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0.0"
                        value={item.attachment_fabric2_meters}
                        disabled={!item.attachment_fabric2_id}
                        onChange={(e) => updateItem(index, { attachment_fabric2_meters: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">m</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-600">
                      {att2Fabric?.width ? `${att2Fabric.width}"` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.attachment_fabric2_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                        <input
                          type="number" step="any" min="0" placeholder="0.00"
                          value={item.attachment_fabric2_sam}
                          onChange={(e) => updateItem(index, { attachment_fabric2_sam: e.target.value })}
                          className={`${inputCls} w-24 px-2 py-1 text-left`}
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${att2Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                      ₹{att2Cost.toFixed(2)}
                    </span>
                  </td>
                </tr>

                {/* ── Buttons (OPTIONAL) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                      <span className="font-semibold text-zinc-500">Buttons</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className={selectCls}
                      value={item.button_id}
                      onChange={(e) => updateItem(index, { button_id: e.target.value })}
                    >
                      <option value="">Optional...</option>
                      {buttonsList.map((b: any) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.name}{b.unit_price ? ` — ₹${Number(b.unit_price).toFixed(2)}/pc` : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="1" min="0" placeholder="0"
                        value={item.button_count}
                        disabled={!item.button_id}
                        onChange={(e) => updateItem(index, { button_count: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">pcs</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-zinc-300 font-semibold text-[10px]">—</span>
                  </td>
                  <td className="p-3">
                    <span className="text-[#2d8d9b] font-black uppercase text-[10px] tracking-wider italic">
                      Included
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-mono font-black text-zinc-300">
                      ₹0.00
                    </span>
                  </td>
                </tr>

                {/* ── Thread (OPTIONAL) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0"></span>
                      <span className="font-semibold text-zinc-500">Thread</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className={selectCls}
                      value={item.thread_id}
                      onChange={(e) => updateItem(index, { thread_id: e.target.value })}
                    >
                      <option value="">Optional...</option>
                      {threadsList.map((t: any) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name}{t.type ? ` (${t.type})` : ''}{t.unit_price ? ` — ₹${Number(t.unit_price).toFixed(2)}` : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="1" min="0" placeholder="0"
                        value={item.thread_count}
                        disabled={!item.thread_id}
                        onChange={(e) => updateItem(index, { thread_count: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">units</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-zinc-300 font-semibold text-[10px]">—</span>
                  </td>
                  <td className="p-3">
                    <span className="text-[#2d8d9b] font-black uppercase text-[10px] tracking-wider italic">
                      Included
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-mono font-black text-zinc-300">
                      ₹0.00
                    </span>
                  </td>
                </tr>

                {/* ── SAM Cost ── */}
                {/* <tr className="bg-[#2d8d9b]/3 hover:bg-[#2d8d9b]/5">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8b6b5a] flex-shrink-0"></span>
                      <span className="font-black text-[#3a525d]">SAM Cost</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-bold text-zinc-400 italic">Stitching labor cost</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0"
                        value={item.sam_value}
                        onChange={(e) => updateItem(index, { sam_value: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">min</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-zinc-300 font-semibold text-[10px]">—</span>
                  </td>
                  <td className="p-3">
                    <span className="text-zinc-500 font-mono font-bold text-xs">
                      ₹{laborRatePerHour}/hr
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${samCost > 0 ? 'text-[#8b6b5a]' : 'text-zinc-300'}`}>
                      ₹{samCost.toFixed(2)}
                    </span>
                  </td>
                </tr> */}

              </tbody>
              {/* ── Total Footer ── */}
              <tfoot>
                <tr className="border-t-2 border-[#2d8d9b]/20 bg-[#2d8d9b]/5">
                  <td colSpan={5} className="p-4 font-black text-[10px] uppercase tracking-widest text-[#3a525d]">
                    Total Unit Cost
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-black text-lg text-[#2d8d9b] font-mono">
                      ₹{unitTotal.toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSetsBuilder = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="border-b border-zinc-100 pb-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-2xl font-black italic text-[#3a525d]">Custom Sets Builder</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
              Configure custom sets and package-level pricing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10">
              {manualItems.length} Sets
            </span>
          </div>
        </div>

        {/* Sets Cards List */}
        <div className="space-y-6">
          {manualItems.map((set, setIdx) => {
            const setName = set.size_breakdown?.set_name || '';
            const setProducts = set.size_breakdown?.products || [];

            return (
              <div key={set.id} className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                {/* Set Header */}
                <div className="p-6 bg-gradient-to-r from-zinc-50/80 to-white border-b border-zinc-150 flex items-center gap-4 flex-wrap">
                  {/* Set Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                    <Package size={20} />
                  </div>

                  {/* Set Name Input */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Set Name</label>
                    <input
                      type="text"
                      value={setName}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          size_breakdown: {
                            ...(updated[setIdx].size_breakdown || {}),
                            is_set: true,
                            set_name: e.target.value
                          }
                        };
                        setManualItems(updated);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
                      placeholder="e.g. Office Uniform Set, Security Kit"
                    />
                  </div>

                  {/* Set Price Input */}
                  <div className="w-32">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Set Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={set.price}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          price: e.target.value
                        };
                        setManualItems(updated);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#2d8d9b] text-center focus:outline-none focus:border-[#2d8d9b] bg-white transition-all font-mono"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Quantity Input */}
                  <div className="w-24">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={set.quantity}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          quantity: e.target.value
                        };
                        setManualItems(updated);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] text-center focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
                      placeholder="1"
                    />
                  </div>

                  {/* Delete Set Button */}
                  <button
                    onClick={() => {
                      setManualItems(manualItems.filter((_, i) => i !== setIdx));
                    }}
                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-150 self-end"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Nested Products */}
                <div className="p-6 bg-zinc-50/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Included Garments</span>
                    <button
                      onClick={() => {
                        const updated = [...manualItems];
                        const currentProds = updated[setIdx].size_breakdown?.products || [];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          size_breakdown: {
                            ...(updated[setIdx].size_breakdown || {}),
                            is_set: true,
                            products: [
                              ...currentProds,
                              { product_type_id: '', product_type_name: '', product_id: '', product_name: '' }
                            ]
                          }
                        };
                        setManualItems(updated);
                      }}
                      className="px-3 py-1.5 bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={12} /> Add Garment to Set
                    </button>
                  </div>

                  {setProducts.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400 text-xs italic">
                      No garments added to this set yet. Click "Add Garment to Set" above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {setProducts.map((prod: any, prodIdx: number) => {
                        return (
                          <div key={prodIdx} className="flex items-center gap-4 bg-white p-3 border border-zinc-150 rounded-xl">
                            {/* Product Category / Type Select */}
                            <div className="flex-1 min-w-[150px]">
                              <select
                                value={prod.product_type_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const pTypeName = productTypes.find(pt => String(pt.id) === String(val))?.name || '';
                                  const updated = [...manualItems];
                                  const prods = [...(updated[setIdx].size_breakdown?.products || [])];
                                  prods[prodIdx] = {
                                    ...prods[prodIdx],
                                    product_type_id: val,
                                    product_type_name: pTypeName,
                                    product_id: '',
                                    product_name: ''
                                  };
                                  updated[setIdx] = {
                                    ...updated[setIdx],
                                    size_breakdown: {
                                      ...updated[setIdx].size_breakdown,
                                      products: prods
                                    }
                                  };
                                  setManualItems(updated);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-[#3a525d] bg-white focus:outline-none"
                              >
                                <option value="">Select Category...</option>
                                {productTypes.map(pt => (
                                  <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Product Select */}
                            <div className="flex-1 min-w-[200px]">
                              <select
                                value={prod.product_id}
                                disabled={!prod.product_type_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const pName = allProducts.find(p => String(p.id) === String(val))?.name || '';
                                  const updated = [...manualItems];
                                  const prods = [...(updated[setIdx].size_breakdown?.products || [])];
                                  prods[prodIdx] = {
                                    ...prods[prodIdx],
                                    product_id: val,
                                    product_name: pName
                                  };
                                  updated[setIdx] = {
                                    ...updated[setIdx],
                                    size_breakdown: {
                                      ...updated[setIdx].size_breakdown,
                                      products: prods
                                    }
                                  };
                                  setManualItems(updated);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-[#3a525d] bg-white focus:outline-none"
                              >
                                <option value="">Select Garment...</option>
                                {allProducts
                                  .filter(p => String(p.product_type_id) === String(prod.product_type_id))
                                  .map(p => (
                                    <option key={p.id} value={String(p.id)}>
                                      {p.name}{p.art_number ? ` (${p.art_number})` : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            {/* Delete Product from Set */}
                            <button
                              onClick={() => {
                                const updated = [...manualItems];
                                const prods = (updated[setIdx].size_breakdown?.products || []).filter((_: any, i: number) => i !== prodIdx);
                                updated[setIdx] = {
                                  ...updated[setIdx],
                                  size_breakdown: {
                                    ...updated[setIdx].size_breakdown,
                                    products: prods
                                  }
                                };
                                setManualItems(updated);
                              }}
                              className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Set Button */}
        <Button
          onClick={() => {
            const newSet: ManualItem = {
              id: Date.now(),
              product_type_id: '',
              product_id: '',
              fabric_id: '',
              main_fabric_meters: '',
              main_fabric_rate: '',
              main_fabric_sam: '',
              attachment_fabric1_id: '',
              attachment_fabric1_meters: '',
              attachment_fabric1_rate: '',
              attachment_fabric1_sam: '',
              attachment_fabric2_id: '',
              attachment_fabric2_meters: '',
              attachment_fabric2_rate: '',
              attachment_fabric2_sam: '',
              button_id: '',
              button_count: '',
              thread_id: '',
              thread_count: '',
              sam_value: '',
              design_number: '',
              quantity: '1',
              price: '0',
              size_breakdown: {
                is_set: true,
                set_name: '',
                products: []
              }
            };
            setManualItems([...manualItems, newSet]);
          }}
          className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-200"
        >
          <Plus size={14} strokeWidth={3} /> Create New Set
        </Button>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-zinc-100 mt-10">
          <Button
            disabled={isAnalyzing}
            variant="secondary"
            onClick={onBack}
            className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
          >
            Back
          </Button>
          <Button
            disabled={!isManualItemsValid()}
            onClick={onNext}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
          >
            Expenses Setup <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  };

  if (quotationType === 'SET_TYPE') {
    return renderSetsBuilder();
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="border-b border-zinc-100 pb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-black italic text-[#3a525d]">Sizing & Measurement Audits</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
            Live verification of measurements profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10">
            {hasMeasurements
              ? `${orgAnalysis.total_entities} Entities`
              : `${manualItems.reduce((acc, it) => acc + (parseInt(it.quantity) || 0), 0)} Custom Units`}
          </span>
        </div>
      </div>

      {hasMeasurements ? (
        <>
          {/* VISUAL COMPLIANCE TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50/50 p-6 rounded-2xl border border-green-100 flex justify-between items-center">
              <div>
                <p className="text-2xl font-black text-green-600">{orgAnalysis.measured_count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Completed Profiles</p>
              </div>
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div className="bg-amber-50/30 p-6 rounded-2xl border border-amber-100 flex justify-between items-center">
              <div>
                <p className="text-2xl font-black text-amber-600">{orgAnalysis.pending_count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Pending Review</p>
              </div>
              <Clock size={32} className="text-amber-500" />
            </div>
            <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100 flex justify-between items-center">
              <div>
                <p className="text-2xl font-black text-red-500">{orgAnalysis.missing_count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Missing Profiles</p>
              </div>
              <AlertTriangle size={32} className="text-red-500" />
            </div>
          </div>

          {orgAnalysis.missing_count > 0 && (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex gap-4 text-amber-800">
              <AlertTriangle className="shrink-0 text-amber-600" size={24} />
              <div className="space-y-1">
                <p className="text-sm font-black italic">⚠️ High Compliance Warning: Missing Measurements Found</p>
                <p className="text-xs leading-relaxed font-semibold">
                  There are <strong>{orgAnalysis.missing_count} member(s)</strong> without active measurement profiles.
                  Standard Size M will be allocated for these members.
                </p>
              </div>
            </div>
          )}

          {/* TEMPLATE SIZING AUDIT TABLE */}
          {templateLineItems.length === 0 ? (
            <div className="p-6 bg-amber-50/50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs">
              <AlertTriangle className="shrink-0 text-amber-600" size={18} />
              <div>
                <p className="font-black">No Template Configured</p>
                <p className="font-medium mt-0.5">This organization has no template with linked products. Configure a uniform template first via Admin &gt; Templates.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#2d8d9b]" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product & Design Sizing Audit</h4>
                <span className="ml-auto text-[9px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-70">Design numbers & prices are editable</span>
              </div>
              <div className="border border-zinc-150 rounded-2xl overflow-x-auto custom-scrollbar bg-white shadow-sm min-h-[350px] pb-12">
                <table className="w-full min-w-[1000px] text-left border-collapse text-xs align-middle">
                  <thead>
                    <tr className="bg-[#2d8d9b]/5 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                      <th className="p-3 align-middle">ART Number</th>
                      <th className="p-3 align-middle">Product Name</th>
                      <th className="p-3 align-middle">Gender</th>
                      <th className="p-3 align-middle">Design Number</th>
                      <th className="p-3 align-middle">Material</th>
                      <th className="p-3 align-middle font-mono">SAM (₹)</th>
                      <th className="p-3 align-middle text-right">Quantity</th>
                      <th className="p-3 align-middle w-28">Price/Unit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                    {mergedItems.map((item, mi) => {
                      const qty = getQty(item);
                      const firstIdx = item._indices[0];
                      return (
                        <tr key={mi} className="hover:bg-zinc-50/50 bg-white">
                          <td className="p-3 font-black text-[#2d8d9b] align-middle">{item.art_number || '—'}</td>
                          <td className="p-3 text-zinc-800 align-middle">{item.product_name}</td>
                          <td className="p-3 capitalize text-zinc-500 align-middle">{item.gender}</td>
                          <td className="p-2 align-middle">
                            <input
                              type="text"
                              placeholder={item.design_code || 'e.g. DN-001'}
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#3a525d] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
                              value={templateLineItems[firstIdx]?.design_number_override || ''}
                              onChange={(e) => {
                                const updated = [...templateLineItems];
                                item._indices.forEach((i: number) => {
                                  updated[i] = { ...updated[i], design_number_override: e.target.value };
                                });
                                setTemplateLineItems(updated);
                              }}
                            />
                          </td>
                          <td className="p-3 text-zinc-400 align-middle">{item.materials || '—'}</td>
                          <td className="p-2 align-middle">
                            <input
                              type="number" step="0.0001" min="0" placeholder="₹"
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
                              value={templateLineItems[firstIdx]?.sam_value ?? ''}
                              onChange={(e) => {
                                const updated = [...templateLineItems];
                                item._indices.forEach((i: number) => {
                                  updated[i] = { ...updated[i], sam_value: e.target.value === '' ? null : parseFloat(e.target.value) };
                                });
                                setTemplateLineItems(updated);
                              }}
                            />
                          </td>
                          <td className="p-3 text-right font-black text-[#3a525d] align-middle">
                            {qty > 0 ? <span>{qty} <span className="text-zinc-400 font-normal">Units</span></span> : <span className="text-zinc-300">0</span>}
                          </td>
                          <td className="p-2 align-middle">
                            <input
                              type="number" step="0.01" min="0" placeholder="Optional"
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#2d8d9b] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
                              value={templateLineItems[firstIdx]?.price_override || ''}
                              onChange={(e) => {
                                const updated = [...templateLineItems];
                                item._indices.forEach((i: number) => {
                                  updated[i] = { ...updated[i], price_override: e.target.value };
                                });
                                setTemplateLineItems(updated);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#3a525d]/5 border-t-2 border-[#2d8d9b]/20 text-[#3a525d] font-black text-xs">
                      <td colSpan={5} className="p-3 text-[10px] uppercase tracking-widest text-zinc-400 align-middle">Totals</td>
                      <td className="p-3 font-mono font-black text-[#3a525d] align-middle">
                        {totalSAMMin > 0 ? `₹${totalSAMMin.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right font-black text-[#3a525d] align-middle">
                        {totalQty} <span className="text-zinc-400 font-normal text-[10px]">Units</span>
                      </td>
                      <td className="p-3 font-mono font-black text-[#2d8d9b] align-middle">
                        {totalPrice > 0 ? `₹${totalPrice.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ADDITIONAL CUSTOM GARMENTS (for template mode) */}
          <div className="space-y-4 mt-8 pt-8 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
              <Plus size={14} className="text-[#2d8d9b]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Additional Custom Garments</h4>
              <span className="ml-auto text-[9px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-70">Optional manual additions</span>
            </div>
            <div className="space-y-4">
              {manualItems.map((item, idx) => renderManualItemCard(item, idx))}
            </div>
            <Button
              onClick={addNewItem}
              className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-200"
            >
              <Plus size={14} strokeWidth={3} /> Add Product Item Line
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* BRANCH B — No Measurements */}
          <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-3xl flex gap-3 text-amber-800 text-xs">
            <AlertTriangle className="shrink-0 text-amber-600" size={20} />
            <div>
              <p className="font-black">No Sizing/Measurement Metrics Found (Branch B)</p>
              <p className="font-medium mt-0.5">Define garment lines manually. Each product requires Main Fabric (mandatory). Attachment fabrics, buttons, thread, and SAM cost are optional.</p>
            </div>
          </div>

          {/* ═══ DEPARTMENT-WISE PRODUCT ITEMS ═══ */}
          {(() => {
            const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
            const hasDepartments = selectedDepts.length > 0;

            if (hasDepartments) {
              // Department-aware mode: show per-department item cards
              return (
                <div className="space-y-6">
                  {/* Department mode banner */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-[#2d8d9b]/15 flex items-center justify-center flex-shrink-0">
                      <Layers size={16} className="text-[#2d8d9b]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Department-Wise Quotation Mode</p>
                      <p className="text-[9px] font-bold text-[#2d8d9b] mt-0.5">
                        {selectedDepts.length} department{selectedDepts.length !== 1 ? 's' : ''} selected · Add product lines for each department below
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 tracking-widest">
                      {selectedDepts.reduce((sum: number, d: any) => sum + (parseInt(d.persons) || 0) * (parseInt(d.sets) || 0), 0)} Total Units
                    </span>
                  </div>

                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    selectedDepts.forEach((d: any) => {
                      const name = d.name || 'General';
                      if (!grouped[name]) {
                        grouped[name] = [];
                      }
                      grouped[name].push(d);
                    });

                    return Object.entries(grouped).map(([deptName, deptsInGroup]) => (
                      <div key={deptName} className="rounded-[2rem] overflow-hidden border-2 border-zinc-200 hover:border-[#2d8d9b]/30 transition-all shadow-sm bg-white p-6 space-y-6">
                        <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                          <div className="w-10 h-10 rounded-xl bg-[#3a525d]/10 flex items-center justify-center flex-shrink-0">
                            <Layers size={18} className="text-[#3a525d]" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#3a525d]">{deptName}</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                              {deptsInGroup.length} Division{deptsInGroup.length !== 1 ? 's' : ''} under this Department
                            </p>
                          </div>
                        </div>

                        <div className="space-y-8 divide-y divide-zinc-200 pt-2">
                          {deptsInGroup.map((dept: any) => {
                            const deptId = String(dept.id);
                            const deptItems = (departmentItems || {})[deptId] || [];
                            const personsCount = parseInt(dept.persons) || 0;
                            const setsCount = parseInt(dept.sets) || 0;
                            const totalUnits = personsCount * setsCount;

                            const addDeptItem = () => {
                              const newItem: ManualItem = {
                                id: Date.now() + Math.random(),
                                product_type_id: '', product_id: '',
                                fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
                                attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
                                attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
                                button_id: '', button_count: '', thread_id: '', thread_count: '',
                                sam_value: '', design_number: '', quantity: String(totalUnits || 1), price: ''
                              };
                              if (setDepartmentItems) {
                                setDepartmentItems({
                                  ...(departmentItems || {}),
                                  [deptId]: [...deptItems, newItem]
                                });
                              }
                            };

                            const updateDeptItem = (index: number, changes: Partial<ManualItem>) => {
                              const updated = [...deptItems];
                              const newItem = { ...updated[index], ...changes };
                              // For STANDARD (Readymade) auto-calc price from fabric/SAM
                              if (quotationType !== 'READYMADE') {
                                const costs = getItemCosts(newItem);
                                newItem.price = costs.unitTotal.toFixed(2);
                              }
                              updated[index] = newItem;
                              if (setDepartmentItems) {
                                setDepartmentItems({ ...(departmentItems || {}), [deptId]: updated });
                              }
                            };

                            const removeDeptItem = (index: number) => {
                              if (setDepartmentItems) {
                                setDepartmentItems({
                                  ...(departmentItems || {}),
                                  [deptId]: deptItems.filter((_: any, i: number) => i !== index)
                                });
                              }
                            };

                            return (
                              <div key={dept.id} className="pt-6 first:pt-0 space-y-4">
                                {/* Division Header with Sizing & Persons config */}
                                <div className="flex items-center justify-between gap-4 flex-wrap bg-zinc-50 p-4 rounded-2xl border border-zinc-150">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-[#3a525d] uppercase tracking-wider bg-zinc-200/50 px-3 py-1 rounded-lg">
                                      {dept.division ? `Division: ${dept.division}` : 'Main Division'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">No. of Persons</label>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={dept.persons}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (setOrgDepartments) {
                                            const updatedDepts = orgDepartments.map(d => {
                                              if (d.id === dept.id) {
                                                const newTotal = (parseInt(val) || 0) * (parseInt(d.sets) || 0);
                                                if (setDepartmentItems && departmentItems[deptId]) {
                                                  const updatedItems = departmentItems[deptId].map(item => ({
                                                    ...item,
                                                    quantity: String(newTotal || 1)
                                                  }));
                                                  setDepartmentItems({
                                                    ...departmentItems,
                                                    [deptId]: updatedItems
                                                  });
                                                }
                                                return { ...d, persons: val };
                                              }
                                              return d;
                                            });
                                            setOrgDepartments(updatedDepts);
                                          }
                                        }}
                                        className="w-20 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#2d8d9b]"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Sets per Person</label>
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="2"
                                        value={dept.sets}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (setOrgDepartments) {
                                            const updatedDepts = orgDepartments.map(d => {
                                              if (d.id === dept.id) {
                                                const newTotal = (parseInt(d.persons) || 0) * (parseInt(val) || 0);
                                                if (setDepartmentItems && departmentItems[deptId]) {
                                                  const updatedItems = departmentItems[deptId].map(item => ({
                                                    ...item,
                                                    quantity: String(newTotal || 1)
                                                  }));
                                                  setDepartmentItems({
                                                    ...departmentItems,
                                                    [deptId]: updatedItems
                                                  });
                                                }
                                                return { ...d, sets: val };
                                              }
                                              return d;
                                            });
                                            setOrgDepartments(updatedDepts);
                                          }
                                        }}
                                        className="w-16 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#2d8d9b]"
                                      />
                                    </div>
                                    <div className="text-right min-w-[90px] border-l border-zinc-200 pl-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Units</p>
                                      <p className="text-xs font-mono font-black text-[#2d8d9b]">{totalUnits} Units</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Department Product Items */}
                                <div className="space-y-4">
                                  {deptItems.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed border-zinc-200 rounded-2xl">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No product lines added yet</p>
                                      <p className="text-[9px] font-semibold text-zinc-300 mt-1">Click "Add Product Line" below to add items for this department</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {deptItems.map((item: ManualItem, idx: number) => {
                                        // Inline render adapted for department items
                                        const { mainFabricCost, att1Cost, att2Cost, samCost, unitTotal: calculatedUnitTotal } = getItemCosts(item);
                                        const unitTotal = quotationType === 'READYMADE' ? (parseFloat(item.price) || 0) : calculatedUnitTotal;
                                        const totalItemCost = unitTotal * (parseInt(item.quantity) || 0);

                                        const deptFilteredProducts = allProducts.filter((p: any) => {
                                          const isCorrectCategory = String(p.product_type_id) === String(item.product_type_id);
                                          if (quotationType === 'READYMADE') {
                                            const parsed = parseMaterialsField(p.materials);
                                            return isCorrectCategory && parsed.type?.toLowerCase() === 'trade_readymade';
                                          }
                                          if (quotationType === 'STANDARD') {
                                            const parsed = parseMaterialsField(p.materials);
                                            return isCorrectCategory && parsed.type?.toLowerCase() === 'readymade';
                                          }
                                          return isCorrectCategory;
                                        });

                                        return (
                                          <div key={item.id || idx} className="bg-zinc-50/50 border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-sm transition-all">
                                            {quotationType === 'FABRIC_SET' ? (
                                              <div className="p-4 bg-white border-b border-zinc-100">
                                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                                  {/* Quantity */}
                                                  <div className="w-24">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Quantity</p>
                                                    <input
                                                      type="number" min="1" placeholder="1"
                                                      value={item.quantity}
                                                      onChange={(e) => updateDeptItem(idx, { quantity: e.target.value })}
                                                      className={inputCls}
                                                    />
                                                  </div>

                                                  <div className="flex items-center gap-6 ml-auto">
                                                    {/* Unit Cost Display */}
                                                    <div className="text-right self-center">
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Unit Cost</p>
                                                      <p className="text-xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                                                        ₹{unitTotal.toFixed(2)}
                                                      </p>
                                                      {parseInt(item.quantity) > 1 && (
                                                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                                                          × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                                                        </p>
                                                      )}
                                                    </div>

                                                    {/* Delete */}
                                                    <button
                                                      onClick={() => removeDeptItem(idx)}
                                                      className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-center"
                                                    >
                                                      <Trash2 size={14} />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="p-4 bg-white border-b border-zinc-100">
                                                <div className="flex items-start gap-4 flex-wrap">
                                                  {/* Product Type */}
                                                  <div className="min-w-[140px]">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product Type</p>
                                                    <select
                                                      className={selectCls}
                                                      value={item.product_type_id}
                                                      onChange={(e) => updateDeptItem(idx, { product_type_id: e.target.value, product_id: '', sam_value: '', design_number: '' })}
                                                    >
                                                      <option value="">Select type...</option>
                                                      {productTypes.map((pt: any) => (
                                                        <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                                                      ))}
                                                    </select>
                                                  </div>

                                                  {/* Product */}
                                                  <div className="flex-1 min-w-[180px]">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product</p>
                                                    <select
                                                      className={`${selectCls} ${!item.product_type_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                      value={item.product_id || ''}
                                                      disabled={!item.product_type_id}
                                                      onChange={(e) => {
                                                        const val = e.target.value;
                                                        const prod = allProducts.find((p: any) => String(p.id) === val);
                                                        const updates: Partial<ManualItem> = { product_id: val };
                                                        if (prod) {
                                                          updates.sam_value = prod.sam_value !== null ? String(prod.sam_value) : '';

                                                          const isSetType = quotationType === 'READYMADE_SET' || quotationType === 'FABRIC_SET';
                                                          if (isSetType) {
                                                            const selectedOrg = organizations?.find((org: any) => String(org.id) === String(selectedOrgId));
                                                            const isSchool = selectedOrg?.industries?.name === 'School';
                                                            const lookupName = isSchool ? (dept.name || '') : 'Corporate';
                                                            const consumption = prod.class_fabric_consumption?.[lookupName];

                                                            if (consumption) {
                                                              updates.main_fabric_meters = consumption.main_fabric != null && consumption.main_fabric !== '' ? String(consumption.main_fabric) : (prod.main_fabric != null ? String(prod.main_fabric) : '');
                                                              updates.attachment_fabric1_meters = consumption.attachment_fabric1 != null && consumption.attachment_fabric1 !== '' ? String(consumption.attachment_fabric1) : (prod.attachment_fabric1 != null ? String(prod.attachment_fabric1) : '');
                                                              updates.attachment_fabric2_meters = consumption.attachment_fabric2 != null && consumption.attachment_fabric2 !== '' ? String(consumption.attachment_fabric2) : (prod.attachment_fabric2 != null ? String(prod.attachment_fabric2) : '');
                                                              updates.button_count = consumption.button_count != null && consumption.button_count !== '' ? String(consumption.button_count) : (prod.button_count != null ? String(prod.button_count) : '');
                                                              updates.thread_count = consumption.thread_count != null && consumption.thread_count !== '' ? String(consumption.thread_count) : (prod.thread_count != null ? String(prod.thread_count) : '');
                                                            } else {
                                                              if (prod.main_fabric != null) updates.main_fabric_meters = String(prod.main_fabric);
                                                              if (prod.attachment_fabric1 != null) updates.attachment_fabric1_meters = String(prod.attachment_fabric1);
                                                              if (prod.attachment_fabric2 != null) updates.attachment_fabric2_meters = String(prod.attachment_fabric2);
                                                              if (prod.button_count != null) updates.button_count = String(prod.button_count);
                                                              if (prod.thread_count != null) updates.thread_count = String(prod.thread_count);
                                                            }
                                                          } else {
                                                            if (prod.main_fabric != null) updates.main_fabric_meters = String(prod.main_fabric);
                                                            if (prod.attachment_fabric1 != null) updates.attachment_fabric1_meters = String(prod.attachment_fabric1);
                                                            if (prod.attachment_fabric2 != null) updates.attachment_fabric2_meters = String(prod.attachment_fabric2);
                                                            if (prod.button_count != null) updates.button_count = String(prod.button_count);
                                                            if (prod.thread_count != null) updates.thread_count = String(prod.thread_count);
                                                          }

                                                          updates.main_fabric_sam = '6.777';
                                                          updates.attachment_fabric1_sam = (updates.attachment_fabric1_meters && updates.attachment_fabric1_meters !== '0' && updates.attachment_fabric1_meters !== '') ? '6.777' : '';
                                                          updates.attachment_fabric2_sam = (updates.attachment_fabric2_meters && updates.attachment_fabric2_meters !== '0' && updates.attachment_fabric2_meters !== '') ? '6.777' : '';
                                                          updates.design_number = [prod.art_number, prod.name, prod.materials].filter(Boolean).join(' - ');
                                                        }
                                                        updateDeptItem(idx, updates);
                                                      }}
                                                    >
                                                      <option value="">{item.product_type_id ? 'Select product...' : 'Select type first'}</option>
                                                      {deptFilteredProducts.map((p: any) => (
                                                        <option key={p.id} value={String(p.id)}>
                                                          {p.name}{p.art_number ? ` (${p.art_number})` : ''}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </div>

                                                  {/* Selected Size (for MANUAL type) */}
                                                  {quotationType === 'MANUAL' && (
                                                    <div className="w-32">
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                                                        Size <span className="text-red-500">*</span>
                                                      </p>
                                                      <select
                                                        className={selectCls}
                                                        value={item.size_breakdown?.selected_size || ''}
                                                        onChange={(e) => updateDeptItem(idx, {
                                                          size_breakdown: { ...(item.size_breakdown || {}), selected_size: e.target.value }
                                                        })}
                                                      >
                                                        <option value="">Select size...</option>
                                                        {(() => {
                                                          const prod = allProducts.find((p: any) => String(p.id) === String(item.product_id));
                                                          const sizes = prod?.other_sizes
                                                            ? prod.other_sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
                                                            : [];
                                                          return sizes.map((sz: string) => (
                                                            <option key={sz} value={sz}>{sz}</option>
                                                          ));
                                                        })()}
                                                      </select>
                                                    </div>
                                                  )}

                                                  {/* SAM / Unit Price */}
                                                  {quotationType === 'READYMADE' ? (
                                                    <div className="w-24">
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Unit Price</p>
                                                      <input
                                                        type="number" step="any" min="0" placeholder="0.00"
                                                        value={item.price}
                                                        onChange={(e) => updateDeptItem(idx, { price: e.target.value })}
                                                        className={inputCls}
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div className="w-24">
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product SAM</p>
                                                      <input
                                                        type="number" step="any" min="0" placeholder="0"
                                                        value={item.sam_value}
                                                        onChange={(e) => updateDeptItem(idx, { sam_value: e.target.value })}
                                                        className={inputCls}
                                                      />
                                                    </div>
                                                  )}

                                                  {/* Quantity */}
                                                  <div className="w-20">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Quantity</p>
                                                    <input
                                                      type="number" min="1" placeholder="1"
                                                      value={item.quantity}
                                                      onChange={(e) => updateDeptItem(idx, { quantity: e.target.value })}
                                                      className={inputCls}
                                                    />
                                                  </div>

                                                  {/* Unit Cost Display */}
                                                  <div className="ml-auto text-right self-center">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                                      {quotationType === 'READYMADE' ? 'Unit Price' : 'Unit Cost'}
                                                    </p>
                                                    <p className="text-xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                                                      ₹{unitTotal.toFixed(2)}
                                                    </p>
                                                    {parseInt(item.quantity) > 1 && (
                                                      <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                                                        × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                                                      </p>
                                                    )}
                                                  </div>

                                                  {/* Delete */}
                                                  <button
                                                    onClick={() => removeDeptItem(idx)}
                                                    className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-start mt-5"
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                                {/* Design Notes */}
                                                <div className="mt-3">
                                                  <input
                                                    type="text"
                                                    value={item.design_number || ''}
                                                    onChange={(e) => updateDeptItem(idx, { design_number: e.target.value })}
                                                    className="w-full px-3 py-2 text-xs font-semibold border border-zinc-100 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] bg-white placeholder:text-zinc-300 transition-all"
                                                    placeholder="Design notes, color, fit details..."
                                                  />
                                                </div>
                                              </div>
                                            )}

                                            {/* Material Cost Breakdown (STANDARD only) */}
                                            {quotationType !== 'READYMADE' && (
                                              <div className="p-5" style={{ display: 'block' }}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Material Cost Breakdown</p>
                                                <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                                                  <table className="w-full text-xs border-collapse">
                                                    <thead>
                                                      <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                                                        <th className="p-3 text-left w-32">Component</th>
                                                        <th className="p-3 text-left">Item Selection</th>
                                                        <th className="p-3 text-left w-24">Meters / Qty</th>
                                                        <th className="p-3 text-left w-24">Fabric Width</th>
                                                        <th className="p-3 text-left w-36">Fabric SAM</th>
                                                        <th className="p-3 text-right w-24">Cost (₹)</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-50">

                                                      {/* ── Main Fabric (MANDATORY) ── */}
                                                      {(() => {
                                                        const mainFab = fabricsList.find((f: any) => String(f.id) === item.fabric_id);
                                                        return (
                                                          <tr className="hover:bg-zinc-50/50">
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-[#2d8d9b] flex-shrink-0"></span>
                                                                <span className="font-black text-[#3a525d]">Main Fabric</span>
                                                                <span className="text-red-400 font-black text-[10px]">*</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <select
                                                                className={selectCls}
                                                                value={item.fabric_id}
                                                                onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  const updates: Partial<ManualItem> = { fabric_id: val, main_fabric_rate: '0.00' };
                                                                  if (val && !item.main_fabric_sam) updates.main_fabric_sam = '6.777';
                                                                  updateDeptItem(idx, updates);
                                                                }}
                                                              >
                                                                <option value="">Select fabric...</option>
                                                                {fabricsList.map((f: any) => (
                                                                  <option key={f.id} value={String(f.id)}>
                                                                    {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                              {item.fabric_id && (
                                                                <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                                                                  Trans: ₹{getRateForFabric(item.fabric_id)}/m | Margin: {getMarginForFabric(item.fabric_id)}%
                                                                </div>
                                                              )}
                                                            </td>
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-1.5">
                                                                <input
                                                                  type="number" step="0.1" min="0" placeholder="0.0"
                                                                  value={item.main_fabric_meters}
                                                                  onChange={(e) => updateDeptItem(idx, { main_fabric_meters: e.target.value })}
                                                                  className={`${inputCls} w-20`}
                                                                />
                                                                <span className="text-zinc-400 font-bold text-[10px]">m</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <span className="font-semibold text-zinc-600">
                                                                {mainFab?.width ? `${mainFab.width}"` : '—'}
                                                              </span>
                                                            </td>
                                                            <td className="p-3">
                                                              {item.fabric_id ? (
                                                                <div className="flex items-center gap-1">
                                                                  <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                                                                  <input
                                                                    type="number" step="any" min="0" placeholder="0.00"
                                                                    value={item.main_fabric_sam}
                                                                    onChange={(e) => updateDeptItem(idx, { main_fabric_sam: e.target.value })}
                                                                    className={`${inputCls} w-24 px-2 py-1 text-left`}
                                                                  />
                                                                </div>
                                                              ) : (
                                                                <span className="text-zinc-300 italic text-[10px]">—</span>
                                                              )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                              <span className={`font-mono font-black ${mainFabricCost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                                                                ₹{mainFabricCost.toFixed(2)}
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })()}

                                                      {/* ── Attachment Fabric 1 (OPTIONAL) ── */}
                                                      {(() => {
                                                        const att1Fab = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric1_id);
                                                        const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
                                                        return (
                                                          <tr className="hover:bg-zinc-50/50">
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0"></span>
                                                                <span className="font-semibold text-zinc-500">Att. Fabric 1</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <select
                                                                className={selectCls}
                                                                value={item.attachment_fabric1_id}
                                                                onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  const updates: Partial<ManualItem> = { attachment_fabric1_id: val, attachment_fabric1_rate: '0.00' };
                                                                  if (val && !item.attachment_fabric1_sam) updates.attachment_fabric1_sam = '6.777';
                                                                  updateDeptItem(idx, updates);
                                                                }}
                                                              >
                                                                <option value="">Optional...</option>
                                                                {fabricsList.map((f: any) => (
                                                                  <option key={f.id} value={String(f.id)}>
                                                                    {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                              {item.attachment_fabric1_id && (
                                                                <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                                                                  Trans: ₹{getRateForFabric(item.attachment_fabric1_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric1_id)}%
                                                                </div>
                                                              )}
                                                            </td>
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-1.5">
                                                                <input
                                                                  type="number" step="0.1" min="0" placeholder="0.0"
                                                                  value={item.attachment_fabric1_meters}
                                                                  disabled={!item.attachment_fabric1_id}
                                                                  onChange={(e) => updateDeptItem(idx, { attachment_fabric1_meters: e.target.value })}
                                                                  className={`${inputCls} w-20`}
                                                                />
                                                                <span className="text-zinc-400 font-bold text-[10px]">m</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <span className="font-semibold text-zinc-600">
                                                                {att1Fab?.width ? `${att1Fab.width}"` : '—'}
                                                              </span>
                                                            </td>
                                                            <td className="p-3">
                                                              {item.attachment_fabric1_id ? (
                                                                <div className="flex items-center gap-1">
                                                                  <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                                                                  <input
                                                                    type="number" step="any" min="0" placeholder="0.00"
                                                                    value={item.attachment_fabric1_sam}
                                                                    onChange={(e) => updateDeptItem(idx, { attachment_fabric1_sam: e.target.value })}
                                                                    className={`${inputCls} w-24 px-2 py-1 text-left`}
                                                                  />
                                                                </div>
                                                              ) : (
                                                                <span className="text-zinc-300 italic text-[10px]">—</span>
                                                              )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                              <span className={`font-mono font-black ${att1Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                                                                ₹{att1Cost.toFixed(2)}
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })()}

                                                      {/* ── Attachment Fabric 2 (OPTIONAL) ── */}
                                                      {(() => {
                                                        const att2Fab = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric2_id);
                                                        const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
                                                        return (
                                                          <tr className="hover:bg-zinc-50/50">
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-zinc-200 flex-shrink-0"></span>
                                                                <span className="font-semibold text-zinc-450">Att. Fabric 2</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <select
                                                                className={selectCls}
                                                                value={item.attachment_fabric2_id}
                                                                onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  const updates: Partial<ManualItem> = { attachment_fabric2_id: val, attachment_fabric2_rate: '0.00' };
                                                                  if (val && !item.attachment_fabric2_sam) updates.attachment_fabric2_sam = '6.777';
                                                                  updateDeptItem(idx, updates);
                                                                }}
                                                              >
                                                                <option value="">Optional...</option>
                                                                {fabricsList.map((f: any) => (
                                                                  <option key={f.id} value={String(f.id)}>
                                                                    {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                              {item.attachment_fabric2_id && (
                                                                <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                                                                  Trans: ₹{getRateForFabric(item.attachment_fabric2_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric2_id)}%
                                                                </div>
                                                              )}
                                                            </td>
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-1.5">
                                                                <input
                                                                  type="number" step="0.1" min="0" placeholder="0.0"
                                                                  value={item.attachment_fabric2_meters}
                                                                  disabled={!item.attachment_fabric2_id}
                                                                  onChange={(e) => updateDeptItem(idx, { attachment_fabric2_meters: e.target.value })}
                                                                  className={`${inputCls} w-20`}
                                                                />
                                                                <span className="text-zinc-400 font-bold text-[10px]">m</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <span className="font-semibold text-zinc-600">
                                                                {att2Fab?.width ? `${att2Fab.width}"` : '—'}
                                                              </span>
                                                            </td>
                                                            <td className="p-3">
                                                              {item.attachment_fabric2_id ? (
                                                                <div className="flex items-center gap-1">
                                                                  <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                                                                  <input
                                                                    type="number" step="any" min="0" placeholder="0.00"
                                                                    value={item.attachment_fabric2_sam}
                                                                    onChange={(e) => updateDeptItem(idx, { attachment_fabric2_sam: e.target.value })}
                                                                    className={`${inputCls} w-24 px-2 py-1 text-left`}
                                                                  />
                                                                </div>
                                                              ) : (
                                                                <span className="text-zinc-300 italic text-[10px]">—</span>
                                                              )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                              <span className={`font-mono font-black ${att2Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                                                                ₹{att2Cost.toFixed(2)}
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })()}

                                                      {/* ── Buttons (OPTIONAL) ── */}
                                                      <tr className="hover:bg-zinc-50/50">
                                                        <td className="p-3">
                                                          <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                                                            <span className="font-semibold text-zinc-500">Buttons</span>
                                                          </div>
                                                        </td>
                                                        <td className="p-3">
                                                          <select
                                                            className={selectCls}
                                                            value={item.button_id}
                                                            onChange={(e) => updateDeptItem(idx, { button_id: e.target.value })}
                                                          >
                                                            <option value="">Optional...</option>
                                                            {buttonsList.map((b: any) => (
                                                              <option key={b.id} value={String(b.id)}>
                                                                {b.name}{b.unit_price ? ` — ₹${Number(b.unit_price).toFixed(2)}/pc` : ''}
                                                              </option>
                                                            ))}
                                                          </select>
                                                        </td>
                                                        <td className="p-3">
                                                          <div className="flex items-center gap-1.5">
                                                            <input
                                                              type="number" step="1" min="0" placeholder="0"
                                                              value={item.button_count}
                                                              disabled={!item.button_id}
                                                              onChange={(e) => updateDeptItem(idx, { button_count: e.target.value })}
                                                              className={`${inputCls} w-20`}
                                                            />
                                                            <span className="text-zinc-400 font-bold text-[10px]">pcs</span>
                                                          </div>
                                                        </td>
                                                        <td className="p-3">
                                                          <span className="text-zinc-300 font-semibold text-[10px]">—</span>
                                                        </td>
                                                        <td className="p-3">
                                                          <span className="text-[#2d8d9b] font-black uppercase text-[10px] tracking-wider italic">Included</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                          <span className="font-mono font-black text-zinc-300">₹0.00</span>
                                                        </td>
                                                      </tr>

                                                      {/* ── Thread (OPTIONAL) ── */}
                                                      <tr className="hover:bg-zinc-50/50">
                                                        <td className="p-3">
                                                          <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0"></span>
                                                            <span className="font-semibold text-zinc-500">Thread</span>
                                                          </div>
                                                        </td>
                                                        <td className="p-3">
                                                          <select
                                                            className={selectCls}
                                                            value={item.thread_id}
                                                            onChange={(e) => updateDeptItem(idx, { thread_id: e.target.value })}
                                                          >
                                                            <option value="">Optional...</option>
                                                            {threadsList.map((t: any) => (
                                                              <option key={t.id} value={String(t.id)}>
                                                                {t.name}{t.type ? ` (${t.type})` : ''}{t.unit_price ? ` — ₹${Number(t.unit_price).toFixed(2)}` : ''}
                                                              </option>
                                                            ))}
                                                          </select>
                                                        </td>
                                                        <td className="p-3">
                                                          <div className="flex items-center gap-1.5">
                                                            <input
                                                              type="number" step="1" min="0" placeholder="0"
                                                              value={item.thread_count}
                                                              disabled={!item.thread_id}
                                                              onChange={(e) => updateDeptItem(idx, { thread_count: e.target.value })}
                                                              className={`${inputCls} w-20`}
                                                            />
                                                            <span className="text-zinc-400 font-bold text-[10px]">units</span>
                                                          </div>
                                                        </td>
                                                        <td className="p-3">
                                                          <span className="text-zinc-300 font-semibold text-[10px]">—</span>
                                                        </td>
                                                        <td className="p-3">
                                                          <span className="text-[#2d8d9b] font-black uppercase text-[10px] tracking-wider italic">Included</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                          <span className="font-mono font-black text-zinc-300">₹0.00</span>
                                                        </td>
                                                      </tr>

                                                    </tbody>
                                                    {/* ── Total Footer ── */}
                                                    <tfoot>
                                                      <tr className="border-t-2 border-[#2d8d9b]/20 bg-[#2d8d9b]/5">
                                                        <td colSpan={5} className="p-4 font-black text-[10px] uppercase tracking-widest text-[#3a525d]">
                                                          Total Unit Cost
                                                        </td>
                                                        <td className="p-4 text-right">
                                                          <span className="font-black text-lg text-[#2d8d9b] font-mono">
                                                            ₹{unitTotal.toFixed(2)}
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    </tfoot>
                                                  </table>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  onClick={addDeptItem}
                                  className="h-10 px-5 bg-[#3a525d]/8 hover:bg-[#3a525d] hover:!text-white !text-[#3a525d] rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-[#3a525d]/20 transition-all mt-4"
                                >
                                  <Plus size={13} strokeWidth={3} /> Add Product Line for {dept.division ? `${deptName} (${dept.division})` : deptName}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              );
            }

            // No departments selected — flat manualItems mode
            return (
              <>
                <div className="space-y-4">
                  {manualItems.map((item, idx) => renderManualItemCard(item, idx))}
                </div>

                <Button
                  onClick={addNewItem}
                  className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-200"
                >
                  <Plus size={14} strokeWidth={3} /> Add Product Item Line
                </Button>
              </>
            );
          })()}
        </>
      )}


      {/* ═══ RAW FABRICS — SOLD SEPARATELY ═══ */}
      {/* This section is for customers who want to PURCHASE FABRICS alongside their garment/product order */}
      {/* Visible for STANDARD (Readymade) and READYMADE (Trade Readymade) quotation types */}
      <div className="mt-10 rounded-[2rem] overflow-hidden border-2 border-[#2d8d9b]/20 shadow-lg shadow-[#2d8d9b]/5">
        {/* Section Banner Header */}
        <div className="bg-gradient-to-r from-[#2d8d9b]/10 via-[#2d8d9b]/5 to-transparent px-6 py-4 border-b border-[#2d8d9b]/15 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/15 flex items-center justify-center flex-shrink-0">
            <Package size={20} className="text-[#2d8d9b]" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-[#3a525d] tracking-tight">Raw Fabrics — Sold Separately</h4>
            <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-80 mt-0.5">
              Optional · Customer purchases fabric rolls in addition to products
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 tracking-widest">
            {separateFabrics.length} Line{separateFabrics.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-5 bg-white space-y-4">
          {separateFabrics.length > 0 ? (
            <div className="border border-zinc-150 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs align-middle">
                <thead>
                  <tr className="bg-[#2d8d9b]/5 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                    <th className="p-3">Fabric Item Selection</th>
                    <th className="p-3 text-center w-32">Meters</th>
                    <th className="p-3 text-center w-36">Rate/Meter (₹)</th>
                    <th className="p-3 text-right w-36">Total Cost (₹)</th>
                    <th className="p-3 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-650">
                  {separateFabrics.map((sf, idx) => {
                    const meters = parseFloat(sf.meters) || 0;
                    const rate = parseFloat(sf.rate) || 0;
                    const totalCost = meters * rate;

                    return (
                      <tr key={sf.id || idx} className="hover:bg-zinc-50/50 bg-white">
                        <td className="p-2">
                          <select
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] bg-white"
                            value={sf.fabric_id}
                            onChange={(e) => updateSeparateFabric(idx, { fabric_id: e.target.value })}
                          >
                            <option value="">Select fabric...</option>
                            {fabricsList.map((f: any) => (
                              <option key={f.id} value={String(f.id)}>
                                {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="px-2.5 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] text-center transition-all w-full"
                            value={sf.meters}
                            onChange={(e) => updateSeparateFabric(idx, { meters: e.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="px-2.5 py-2 text-xs font-mono font-bold border border-zinc-200 rounded-xl text-[#2d8d9b] text-center transition-all w-full"
                            value={sf.rate}
                            onChange={(e) => updateSeparateFabric(idx, { rate: e.target.value })}
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-black text-[#2d8d9b] pr-4">
                          ₹{totalCost.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeSeparateFabric(idx)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 mx-auto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#2d8d9b]/15 bg-[#2d8d9b]/3">
                    <td colSpan={3} className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Raw Fabric Cost</td>
                    <td className="p-3 text-right font-black text-lg text-[#2d8d9b] font-mono">
                      ₹{separateFabrics.reduce((sum, sf) => sum + (parseFloat(sf.meters) || 0) * (parseFloat(sf.rate) || 0), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-[#2d8d9b]/20 rounded-2xl bg-[#2d8d9b]/3">
              <Package size={28} className="text-[#2d8d9b]/40 mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No fabric lines added yet</p>
              <p className="text-[10px] font-semibold text-zinc-350 mt-1">Click the button below to add fabric selling lines</p>
            </div>
          )}

          <Button
            onClick={addSeparateFabric}
            className="h-12 px-6 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b] hover:!text-white !text-[#2d8d9b] rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-[#2d8d9b]/25 transition-all"
          >
            <Plus size={14} strokeWidth={3} /> Add Fabric Selling Line
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-zinc-100 mt-10">
        <Button
          disabled={isAnalyzing}
          variant="secondary"
          onClick={onBack}
          className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
          Back
        </Button>
        <Button
          disabled={!hasMeasurements && !isManualItemsValid()}
          onClick={onNext}
          className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
        >
          Expenses Setup <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
