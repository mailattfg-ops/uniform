'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Trash2, Plus, ArrowRight, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';
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
  isAnalyzing,
  onBack,
  onNext,
  isManualItemsValid,
}: WizardStep2Props) {

  // Deduplicate template line items by product_id — merge rows with same product
  const mergedMap = new Map<number, TemplateLineItem & { _indices: number[] }>();
  templateLineItems.forEach((item, idx) => {
    const key = item.product_id;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      // Combine design numbers if different
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

  // Compute qty per merged item
  const getQty = (item: TemplateLineItem) => orgAnalysis.entities.filter((ent: any) => {
    if (ent.measurement_status !== 'Completed') return false;
    const eg = (ent.gender || '').toLowerCase();
    const ig = (item.gender || '').toLowerCase();
    if (ig === 'unisex' || ig === 'all') return true;
    if (ig === 'male' || ig === 'm') return eg === 'male' || eg === 'm';
    if (ig === 'female' || ig === 'f') return eg === 'female' || eg === 'f';
    return false;
  }).length;

  // Totals
  const totalQty = mergedItems.reduce((s, item) => s + getQty(item), 0);
  const totalSAMMin = mergedItems.reduce((s, item) => s + (item.sam_value ? item.sam_value * getQty(item) : 0), 0);
  const totalPrice = mergedItems.reduce((s, item) => {
    const p = parseFloat(item.price_override || '0');
    return s + (p > 0 ? p * getQty(item) : 0);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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

          {/* DYNAMIC WARNING BLOCK */}
          {orgAnalysis.missing_count > 0 && (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex gap-4 text-amber-800">
              <AlertTriangle className="shrink-0 text-amber-600" size={24} />
              <div className="space-y-1">
                <p className="text-sm font-black italic">⚠️ High Compliance Warning: Missing Measurements Found</p>
                <p className="text-xs leading-relaxed font-semibold">
                  There are <strong>{orgAnalysis.missing_count} member(s)</strong> in this organization without active or completed measurement profiles.
                  To build standard pricing estimates, the wizard will allocate default sizes (Standard Size M) for these members.
                  We recommend that the customer submits their metrics to ensure a perfect fit prior to final manufacturing start.
                </p>
              </div>
            </div>
          )}

          {/* MERGED UNIFIED SIZING AUDIT TABLE */}
          {templateLineItems.length === 0 ? (
            <div className="p-6 bg-amber-50/50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs">
              <AlertTriangle className="shrink-0 text-amber-600" size={18} />
              <div>
                <p className="font-black">No Template Configured</p>
                <p className="font-medium mt-0.5">This organization has no template with linked products. Please configure a uniform template first via Admin &gt; Templates.</p>
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
                      <th className="p-3 align-middle font-mono">SAM ($)</th>
                      <th className="p-3 align-middle text-right">Quantity</th>
                      <th className="p-3 align-middle w-28">Price/Unit ($)</th>
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
                              type="number"
                              step="0.0001"
                              min="0"
                              placeholder="$"
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
                            {qty > 0 ? (
                              <span>
                                {qty} <span className="text-zinc-400 font-normal">Units</span>
                              </span>
                            ) : (
                              <span className="text-zinc-300">0</span>
                            )}
                          </td>
                          <td className="p-2 align-middle">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Optional"
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
                  {/* TOTALS FOOTER */}
                  <tfoot>
                    <tr className="bg-[#3a525d]/5 border-t-2 border-[#2d8d9b]/20 text-[#3a525d] font-black text-xs">
                      <td colSpan={5} className="p-3 text-[10px] uppercase tracking-widest text-zinc-400 align-middle">Totals</td>
                      <td className="p-3 font-mono font-black text-[#3a525d] align-middle">
                        {totalSAMMin > 0 ? `$${totalSAMMin.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right font-black text-[#3a525d] align-middle">
                        {totalQty} <span className="text-zinc-400 font-normal text-[10px]">Units</span>
                      </td>
                      <td className="p-3 font-mono font-black text-[#2d8d9b] align-middle">
                        {totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ADDITIONAL MANUAL PRODUCTS FOR BRANCH A */}
          <div className="space-y-4 mt-8 pt-8 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={14} className="text-[#2d8d9b]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Additional Custom Garments</h4>
              <span className="ml-auto text-[9px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-70">Optional manual additions</span>
            </div>

            <div className="border border-zinc-150 rounded-3xl bg-white shadow-sm overflow-x-auto custom-scrollbar min-h-[450px] pb-32">
              <table className="w-full min-w-[1200px] text-left border-collapse text-xs align-middle">
                <thead>
                  <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                    <th className="p-4 rounded-tl-[22px] align-middle">Product Type</th>
                    <th className="p-4 align-middle">Product</th>
                    <th className="p-4 align-middle">Fabric Type</th>
                    <th className="p-4 w-28 align-middle">SAM Price ($)</th>
                    <th className="p-4 align-middle">Design / Material Details</th>
                    <th className="p-4 w-24 align-middle">Quantity</th>
                    <th className="p-4 w-28 align-middle">Price / Unit ($)</th>
                    <th className="p-4 text-center w-16 rounded-tr-[22px] align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                  {manualItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50">
                      <td className={`p-3 align-middle ${index === manualItems.length - 1 ? 'rounded-bl-[22px]' : ''}`}>
                        <Select
                          options={productTypes.map(pt => ({ label: pt.name, value: String(pt.id) }))}
                          value={item.product_type_id}
                          placeholder="Select type..."
                          onChange={(val) => {
                            const updated = [...manualItems];
                            updated[index].product_type_id = val;
                            updated[index].product_id = '';
                            updated[index].sam_value = '';
                            updated[index].design_number = '';
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Select
                          options={allProducts
                            .filter(p => String(p.product_type_id) === String(item.product_type_id))
                            .map(prod => ({ label: `${prod.name}${prod.art_number ? ` (${prod.art_number})` : ''}`, value: String(prod.id) }))}
                          value={item.product_id || ''}
                          disabled={!item.product_type_id}
                          placeholder={item.product_type_id ? 'Select product...' : 'Select type first'}
                          onChange={(val) => {
                            const updated = [...manualItems];
                            updated[index].product_id = val;
                            if (val) {
                              const selectedProd = allProducts.find(p => String(p.id) === String(val));
                              if (selectedProd) {
                                updated[index].sam_value = selectedProd.sam_value !== null ? String(selectedProd.sam_value) : '';
                                const designDetails = [selectedProd.art_number, selectedProd.name, selectedProd.materials]
                                  .filter(Boolean)
                                  .join(' - ');
                                updated[index].design_number = designDetails;
                              }
                            } else {
                              updated[index].sam_value = '';
                              updated[index].design_number = '';
                            }
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Select
                          options={fabricsList.map(f => ({ label: `${f.brand_name} - ${f.shade} (${f.width}")`, value: String(f.id) }))}
                          value={item.fabric_id}
                          placeholder="Select fabric..."
                          onChange={(val) => {
                            const updated = [...manualItems];
                            updated[index].fabric_id = val;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="2.5"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.sam_value}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].sam_value = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="text"
                          placeholder="e.g. Navy, slim fit"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-[#3a525d] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.design_number}
                          allowSpecialCharacters
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].design_number = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="number"
                          min="1"
                          placeholder="50"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].quantity = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="35.00"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2d8d9b] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.price}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].price = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className={`p-3 text-center align-middle ${index === manualItems.length - 1 ? 'rounded-bl-[22px]' : ''}`}>
                        <Button
                          onClick={() => {
                            setManualItems(manualItems.filter((_, i) => i !== index));
                          }}
                          variant="secondary"
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 !p-0"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={() => {
                setManualItems([
                  ...manualItems,
                  { id: Date.now(), product_type_id: '', product_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
                ]);
              }}
              className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-250"
            >
              <Plus size={14} strokeWidth={3} />
              Add Product Item Line
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* BRANCH B (NO MEASUREMENTS): PREMIUM INTERACTIVE MULTI-ENTRY TABLE */}
          <div className="space-y-4">
            <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-3xl flex gap-3 text-amber-800 text-xs">
              <AlertTriangle className="shrink-0 text-amber-600" size={20} />
              <div>
                <p className="font-black">No Sizing/Measurement Metrics Found (Branch B)</p>
                <p className="font-medium mt-0.5">Please define the custom garment lines manually using the interactive multi-line entry grid below. Ensure all fields are correctly populated.</p>
              </div>
            </div>

            <div className="border border-zinc-150 rounded-3xl bg-white shadow-sm overflow-x-auto custom-scrollbar min-h-[450px] pb-32">
              <table className="w-full min-w-[1200px] text-left border-collapse text-xs align-middle">
                <thead>
                  <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                    <th className="p-4 rounded-tl-[22px] align-middle">Product Type</th>
                    <th className="p-4 align-middle">Product</th>
                    <th className="p-4 align-middle">Fabric Type</th>
                    <th className="p-4 w-28 align-middle">SAM Price ($)</th>
                    <th className="p-4 align-middle">Design / Material Details</th>
                    <th className="p-4 w-24 align-middle">Quantity</th>
                    <th className="p-4 w-28 align-middle">Price / Unit ($)</th>
                    <th className="p-4 text-center w-16 rounded-tr-[22px] align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                  {manualItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50">
                      <td className={`p-3 align-middle ${index === manualItems.length - 1 ? 'rounded-bl-[22px]' : ''}`}>
                        <Select
                          options={productTypes.map(pt => ({ label: pt.name, value: String(pt.id) }))}
                          value={item.product_type_id}
                          placeholder="Select type..."
                          onChange={(val) => {
                            const updated = [...manualItems];
                            updated[index].product_type_id = val;
                            updated[index].product_id = '';
                            updated[index].sam_value = '';
                            updated[index].design_number = '';
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Select
                          options={allProducts
                            .filter(p => String(p.product_type_id) === String(item.product_type_id))
                            .map(prod => ({ label: `${prod.name}${prod.art_number ? ` (${prod.art_number})` : ''}`, value: String(prod.id) }))}
                          value={item.product_id || ''}
                          disabled={!item.product_type_id}
                          placeholder={item.product_type_id ? 'Select product...' : 'Select type first'}
                          onChange={(val) => {
                            const updated = [...manualItems];
                            updated[index].product_id = val;
                            if (val) {
                              const selectedProd = allProducts.find(p => String(p.id) === String(val));
                              if (selectedProd) {
                                updated[index].sam_value = selectedProd.sam_value !== null ? String(selectedProd.sam_value) : '';
                                const designDetails = [selectedProd.art_number, selectedProd.name, selectedProd.materials]
                                  .filter(Boolean)
                                  .join(' - ');
                                updated[index].design_number = designDetails;
                              }
                            } else {
                              updated[index].sam_value = '';
                              updated[index].design_number = '';
                            }
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Select
                          options={fabricsList.map(f => ({ label: `${f.brand_name} - ${f.shade} (${f.width}")`, value: String(f.id) }))}
                          value={item.fabric_id}
                          placeholder="Select fabric..."
                          onChange={(val) => {
                            const updated = [...manualItems];
                            updated[index].fabric_id = val;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="2.5"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.sam_value}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].sam_value = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="text"
                          placeholder="e.g. Navy, slim fit"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-[#3a525d] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.design_number}
                          allowSpecialCharacters
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].design_number = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="number"
                          min="1"
                          placeholder="50"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].quantity = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="35.00"
                          className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2d8d9b] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                          value={item.price}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[index].price = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                      </td>
                      <td className="p-3 text-center align-middle">
                        <Button
                          disabled={manualItems.length === 1}
                          onClick={() => {
                            setManualItems(manualItems.filter((_, i) => i !== index));
                          }}
                          variant="secondary"
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 disabled:opacity-30 disabled:hover:bg-red-50 disabled:hover:text-red-500 !p-0"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={() => {
                setManualItems([
                  ...manualItems,
                  { id: Date.now(), product_type_id: '', product_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
                ]);
              }}
              className="h-12 px-6 mt-10 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-250"
            >
              <Plus size={14} strokeWidth={3} />
              Add Product Item Line
            </Button>
          </div>
        </>
      )}

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
