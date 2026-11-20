'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Organization, ProductType, ManualItem } from '../../page';
import { getItemKind, getLineDisplayView, KIND_BADGE, ITEM_KIND_LABELS, lineAmount, parseQty } from '../../_lib/itemLines';
import { formatFabricDisplayName } from '@/lib/fabricFormatter';

export function formatProductTypeAndName(pTypeName?: string | null, prodName?: string | null): string {
  const typeStr = (pTypeName || '').trim();
  const nameStr = (prodName || '').trim();

  if (typeStr && nameStr) {
    if (nameStr.toLowerCase().startsWith(typeStr.toLowerCase() + '-')) {
      return nameStr;
    }
    return `${typeStr}-${nameStr}`;
  }
  return nameStr || typeStr || 'Uniform Item';
}

interface WizardStep5Props {
  hasMeasurements: boolean;
  quoteTitle: string;
  quoteNo: string;
  selectedOrgId: string;
  organizations: Organization[];
  productTypes: ProductType[];
  selectedProductTypeId: string;
  orgAnalysis: any;
  manualItems: ManualItem[];
  separateFabrics?: any[];
  fabricsList: any[];
  profitMargin: string;
  calculatedExpenses: { fabric: number; accessories: number; labor: number; total: number };
  quoteTotals: { 
    expenses: number; 
    subtotal: number; 
    gstValue: number; 
    finalValue: number; 
    profit: number; 
    avgSellingPrice: number;
    isTaxInclusive?: boolean;
    cgst?: number;
    sgst?: number;
  };
  gstPercent: string;
  editingQuotationId: number | null;
  onBack: () => void;
  onSave: () => void;
  orgDepartments?: any[];
  departmentItems?: Record<string, ManualItem[]>;
  quotationType?: string;
  allProducts?: any[];
}

export default function WizardStep5({
  hasMeasurements,
  quoteTitle,
  quoteNo,
  selectedOrgId,
  organizations,
  productTypes,
  selectedProductTypeId,
  orgAnalysis,
  manualItems,
  separateFabrics = [],
  fabricsList,
  profitMargin,
  calculatedExpenses,
  quoteTotals,
  gstPercent,
  editingQuotationId,
  onBack,
  onSave,
  orgDepartments = [],
  departmentItems = {},
  quotationType = 'STANDARD',
  allProducts = [],
}: WizardStep5Props) {
  const customerName = organizations.find((o) => String(o.id) === String(selectedOrgId))?.name || 'Customer';
  const isFabric = quotationType === 'FABRIC' || quotationType === 'FABRIC_SET';
  const isAccessory = quotationType === 'ACCESSORIES' || quotationType === 'ACCESSORIES_SET' || quotationType === 'ACCESSORY';

  const [masterItems, setMasterItems] = useState<any[]>([]);

  useEffect(() => {
    api.get('/art-number-hub/master-data')
      .then((res) => {
        setMasterItems(res.data?.items || res.data?.dresses || []);
      })
      .catch(() => {});
  }, []);

  const renderItemLinesTable = (items: ManualItem[]) => {
    const totalQty = items.reduce((s, it) => s + parseQty(it), 0);
    const totalAmount = items.reduce((s, it) => s + lineAmount(it), 0);

    return (
      <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse min-w-[620px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
              <th className="p-3 w-16 text-center">SL No.</th>
              <th className="p-3">Item</th>
              <th className="p-3 w-28 text-right">Quantity</th>
              <th className="p-3 w-32 text-right">Rate (₹)</th>
              <th className="p-3 w-36 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs font-semibold text-zinc-400">
                  No items listed
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const line = getLineDisplayView(item, allProducts, fabricsList, masterItems);
                const qty = parseQty(item);
                const rate = parseFloat(item.price || '0');
                const amount = lineAmount(item);
                const kind = line.kind;

                return (
                  <tr key={item.id || idx} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="p-3 text-center text-xs font-black text-zinc-500">
                      #{idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider shrink-0 ${KIND_BADGE[kind]}`}>
                          {ITEM_KIND_LABELS[kind]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-zinc-900 truncate">
                            {line.title}
                          </p>
                          {line.subtitle && (
                            <p className="text-[10px] font-semibold text-zinc-400 truncate">
                              {line.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-mono font-black text-xs text-zinc-900">
                        {qty} {kind === 'FABRIC' ? 'm' : ''}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-xs text-zinc-800">
                      ₹{rate.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-xs text-[#C82A2B]">
                      ₹{amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-zinc-50/80 border-t border-zinc-200">
              <tr className="font-black text-xs text-zinc-900">
                <td className="p-3 text-center text-[10px] uppercase text-zinc-400">Total</td>
                <td className="p-3 text-xs text-zinc-600">
                  {items.length} {items.length === 1 ? 'Line' : 'Lines'}
                </td>
                <td className="p-3 text-right font-mono font-black">
                  {totalQty}
                </td>
                <td className="p-3 text-right text-[10px] uppercase text-zinc-400 font-bold">Subtotal</td>
                <td className="p-3 text-right font-mono font-black text-[#C82A2B]">
                  ₹{totalAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
  const hasDepartments = selectedDepts.length > 0;

  const getDeptItemsCount = () => {
    let total = 0;
    if (departmentItems) {
      Object.values(departmentItems).forEach(items => {
        items.forEach(it => {
          total += parseInt(it.quantity) || 0;
        });
      });
    }
    return total;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-zinc-100 pb-6">
        <h3 className="text-2xl font-black italic text-zinc-900">Quotation Contract Proposal Review</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C82A2B] mt-1 opacity-70">
          Verify compliance, delivery, and pricing values before submission
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* QUOTE SUMMARY SUMMARY */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-100 pb-2">
              Contract Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-zinc-500">
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Proposal Title</p>
                <p className="text-sm font-black text-zinc-900 mt-1">{quoteTitle}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Customer Organization</p>
                <p className="text-sm font-black text-zinc-900 mt-1">{customerName}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Contract Number</p>
                <p className="text-sm font-black text-zinc-900 mt-1">{quoteNo || 'Auto Generated'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Product Model</p>
                <p className="text-sm font-black text-zinc-900 mt-1">
                  {hasMeasurements
                    ? (() => {
                        const pt = productTypes.find((p) => String(p.id) === String(selectedProductTypeId));
                        const prod = allProducts?.find((p) => String(p.product_type_id) === String(selectedProductTypeId));
                        return formatProductTypeAndName(pt?.name, prod?.name);
                      })()
                    : 'Item Lines (Readymades / Fabrics / Accessories)'}
                </p>
              </div>
            </div>
          </Card>

          {hasMeasurements ? (
            <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-100 pb-2">
                Sizing Breakdown summary
              </h4>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(orgAnalysis.size_distribution).map((size) => (
                  <div
                    key={size}
                    className="bg-zinc-50 border border-zinc-150 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900"
                  >
                    <strong>{size}</strong>: {orgAnalysis.size_distribution[size]} Units
                  </div>
                ))}
              </div>
            </Card>
          ) : hasDepartments ? (
            <div className="space-y-6">
              {(() => {
                const grouped: Record<string, any[]> = {};
                selectedDepts.forEach((d: any) => {
                  const name = d.name || 'General';
                  if (!grouped[name]) {
                    grouped[name] = [];
                  }
                  grouped[name].push(d);
                });

                return Object.entries(grouped).map(([deptName, deptsInGroup]) => {
                  const hasAnyItems = deptsInGroup.some(d => (departmentItems[String(d.id)] || []).length > 0);
                  if (!hasAnyItems) return null;

                  return (
                    <Card key={deptName} className="p-8 border border-zinc-100 rounded-[2rem] space-y-6 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
                        <h4 className="text-sm font-black text-zinc-900">
                          Department: {deptName}
                        </h4>
                      </div>
                      <div className="space-y-6 divide-y divide-zinc-100">
                        {deptsInGroup.map((dept) => {
                          const items = departmentItems[String(dept.id)] || [];
                          if (items.length === 0) return null;
                          return (
                            <div key={dept.id} className="space-y-3 pt-6 first:pt-0">
                              <div className="flex justify-between items-center bg-zinc-50/60 p-3.5 rounded-2xl border border-zinc-150/60">
                                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest bg-zinc-200/50 px-2.5 py-1 rounded-lg">
                                  {dept.division ? `Division: ${dept.division}` : 'Main Division'}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">
                                  {dept.persons} Persons × {dept.sets} Sets ({(parseInt(dept.persons) || 0) * (parseInt(dept.sets) || 0)} Units)
                                </span>
                              </div>
                              {renderItemLinesTable(items)}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                });
              })()}
            </div>
          ) : (
            <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-100 pb-2">
                Quotation Item Lines
              </h4>
              {renderItemLinesTable(manualItems)}
            </Card>
          )}

          {separateFabrics.length > 0 && !isAccessory && (
            <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4 mt-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-100 pb-2">
                Separate Fabric Materials Supplied
              </h4>
              <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm max-w-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-100">
                      <th className="p-3 pl-4 text-center">Fabric Details</th>
                      <th className="p-3 text-center">Meters</th>
                      <th className="p-3 text-center">Rate/Meter</th>
                      <th className="p-3 text-center pr-4">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-900">
                    {separateFabrics.map((sf: any, idx: number) => {
                      const fabric = fabricsList.find((f: any) => String(f.id) === String(sf.fabric_id));
                      const fabricName = formatFabricDisplayName(fabric) || 'Custom Fabric';
                      const meters = Number(sf.meters) || 0;
                      const rate = Number(sf.rate) || 0;
                      const total = meters * rate;

                      return (
                        <tr key={idx} className="hover:bg-zinc-50/50 bg-white transition-colors">
                          <td className="p-3 pl-4 font-black text-zinc-900">{fabricName}</td>
                          <td className="p-3 text-right">{meters} m</td>
                          <td className="p-3 text-right font-mono">₹{rate.toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-[#C82A2B] pr-4 font-mono">₹{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* REVENUE MATRIX */}
        <Card className="h-fit p-8 border border-[#C82A2B]/20 bg-[#FFF1F1] rounded-[2.5rem] space-y-6">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#C82A2B] border-b border-[#C82A2B]/15 pb-4">
            Financial Summary
          </h4>

          <div className="space-y-4 text-sm font-semibold text-zinc-600">
            <div className="flex justify-between">
              <span>Total Items count:</span>
              <span className="font-black text-zinc-900">
                {hasMeasurements
                  ? orgAnalysis.total_entities
                  : hasDepartments
                    ? getDeptItemsCount()
                    : manualItems.reduce((acc, it) => acc + (parseInt(it.quantity) || 0), 0)} Units
              </span>
            </div>
            <div className="flex justify-between">
              <span>Production Expenses:</span>
              <span className="font-mono text-zinc-850 font-black">₹{calculatedExpenses.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Markup Margin %:</span>
              <span className="font-black text-green-600 font-mono">+{profitMargin}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tax Treatment:</span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                quoteTotals.isTaxInclusive ? 'bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/20' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {quoteTotals.isTaxInclusive ? 'Tax Inclusive (MRP)' : 'Tax Exclusive (+GST)'}
              </span>
            </div>
            <div className="flex justify-between border-t border-dashed border-zinc-200 pt-2">
              <span>Taxable Base Subtotal:</span>
              <span className="font-mono text-zinc-800 font-black">₹{quoteTotals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#C82A2B] text-xs">
              <span>CGST ({(parseFloat(gstPercent) || 0) / 2}%):</span>
              <span className="font-mono font-black">₹{((quoteTotals.cgst !== undefined ? quoteTotals.cgst : (quoteTotals.gstValue / 2)) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#C82A2B] text-xs">
              <span>SGST ({(parseFloat(gstPercent) || 0) / 2}%):</span>
              <span className="font-mono font-black">₹{((quoteTotals.sgst !== undefined ? quoteTotals.sgst : (quoteTotals.gstValue / 2)) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-500 border-t border-zinc-100 pt-1">
              <span>Total GST ({gstPercent}%):</span>
              <span className="font-mono font-black">{quoteTotals.isTaxInclusive ? '(Included) ' : '+'}₹{quoteTotals.gstValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400 pt-1">
              <span>Suggested unit retail:</span>
              <span className="font-mono">₹{quoteTotals.avgSellingPrice.toFixed(2)}</span>
            </div>

            <div className="border-t border-zinc-200 pt-4 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  {quoteTotals.isTaxInclusive ? 'Total Contract Value (GST Inclusive)' : 'Total Contract Value (With GST)'}
                </p>
                <p className="text-3xl font-black italic tracking-tighter text-[#C82A2B] font-mono mt-0.5">
                  ₹{quoteTotals.finalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {hasMeasurements && orgAnalysis.missing_count > 0 && (
        <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex gap-3 text-xs font-bold text-amber-700">
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <p>
            <strong>Compliance Notice:</strong> Saving this contract with {orgAnalysis.missing_count} missing
            measurements will proceed using standard average sizes (M) for manufacturing price forecasts.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-zinc-100">
        <Button
          variant="secondary"
          onClick={onBack}
          className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
          Back
        </Button>
        <Button
          onClick={onSave}
          className="h-16 px-12 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-green-600/20"
        >
          {editingQuotationId ? '✅ Complete & Update Quotation' : '✅ Complete & Register Quotation'}
        </Button>
      </div>
    </div>
  );
}
