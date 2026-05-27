'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight, CheckCircle2, Clock, AlertTriangle, Layers, Trash2, Package } from 'lucide-react';
import { ProductType, TemplateLineItem, ManualItem } from '../../page';

interface WizardStep2Props {
  hasMeasurements: boolean;
  orgAnalysis: any;
  templateLineItems: TemplateLineItem[];
  setTemplateLineItems: (items: TemplateLineItem[]) => void;
  manualItems: ManualItem[];
  setManualItems: (items: ManualItem[]) => void;
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
}

export default function WizardStep2({
  hasMeasurements,
  orgAnalysis,
  templateLineItems,
  setTemplateLineItems,
  manualItems,
  setManualItems,
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

  // Shared select style
  const selectCls = "w-full px-2.5 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] focus:ring-1 focus:ring-[#2d8d9b]/20 bg-white transition-all";
  const inputCls = "px-2.5 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] focus:ring-1 focus:ring-[#2d8d9b]/20 text-center transition-all w-full disabled:opacity-40 disabled:cursor-not-allowed";

  const renderManualItemCard = (item: ManualItem, index: number) => {
    const { mainFabricCost, att1Cost, att2Cost, buttonCost, threadCost, samCost, unitTotal, btnPrice, thrPrice } = getItemCosts(item);
    const filteredProducts = allProducts.filter(p => String(p.product_type_id) === String(item.product_type_id));
    const totalItemCost = unitTotal * (parseInt(item.quantity) || 0);

    const mainFabric = fabricsList.find((f: any) => String(f.id) === item.fabric_id);
    const att1Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric1_id);
    const att2Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric2_id);

    return (
      <div key={item.id} className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">

        {/* ── Card Header ── */}
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

            {/* Product SAM */}
            <div className="w-24">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product SAM</p>
              <input
                type="number" step="any" min="0" placeholder="0"
                value={item.sam_value}
                onChange={(e) => updateItem(index, { sam_value: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Final SAM Price */}
            <div className="w-28 text-right self-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Final SAM Price</p>
              <p className="text-sm font-black text-[#8b6b5a] font-mono mt-2">
                ₹{samCost.toFixed(2)}
              </p>
            </div>

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

        {/* ── Costing Breakdown Table ── */}
        <div className="p-5">
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
      )}

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
