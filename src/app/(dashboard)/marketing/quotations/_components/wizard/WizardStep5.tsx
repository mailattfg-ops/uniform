'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import { Organization, ProductType, ManualItem } from '../../page';

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
  quoteTotals: { expenses: number; subtotal: number; gstValue: number; finalValue: number; profit: number; avgSellingPrice: number };
  gstPercent: string;
  editingQuotationId: number | null;
  onBack: () => void;
  onSave: () => void;
  orgDepartments?: any[];
  departmentItems?: Record<string, ManualItem[]>;
  quotationType?: string;
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
}: WizardStep5Props) {
  const customerName = organizations.find((o) => String(o.id) === String(selectedOrgId))?.name || 'Customer';

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
        <h3 className="text-2xl font-black italic text-[#3a525d]">Quotation Contract Proposal Review</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
          Verify compliance, delivery, and pricing values before submission
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* QUOTE SUMMARY SUMMARY */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100 pb-2">
              Contract Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-zinc-500">
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Proposal Title</p>
                <p className="text-sm font-black text-[#3a525d] mt-1">{quoteTitle}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Customer Organization</p>
                <p className="text-sm font-black text-[#3a525d] mt-1">{customerName}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Contract Number</p>
                <p className="text-sm font-black text-[#3a525d] mt-1">{quoteNo || 'Auto Generated'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-400">Product Model</p>
                <p className="text-sm font-black text-[#3a525d] mt-1">
                  {hasMeasurements
                    ? productTypes.find((p) => String(p.id) === String(selectedProductTypeId))?.name || 'Uniform Item'
                    : 'Multiple Manual Garment Lines'}
                </p>
              </div>
            </div>
          </Card>

          {hasMeasurements ? (
            <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100 pb-2">
                Sizing Breakdown summary
              </h4>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(orgAnalysis.size_distribution).map((size) => (
                  <div
                    key={size}
                    className="bg-zinc-50 border border-zinc-150 px-3.5 py-2 rounded-xl text-xs font-bold text-[#3a525d]"
                  >
                    <strong>{size}</strong>: {orgAnalysis.size_distribution[size]} Units
                  </div>
                ))}
              </div>
            </Card>
          ) : hasDepartments ? (
            <div className="space-y-6">
              {selectedDepts.map((dept) => {
                const items = departmentItems[String(dept.id)] || [];
                if (items.length === 0) return null;
                return (
                  <Card key={dept.id} className="p-8 border border-zinc-100 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        Department: {dept.name} {dept.division ? `(${dept.division})` : ''}
                      </h4>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {dept.persons} Persons × {dept.sets} Sets
                      </span>
                    </div>
                    <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                            <th className="p-3">Product Type</th>
                            <th className="p-3">{quotationType === 'READYMADE' ? 'Product Name' : 'Fabric Option'}</th>
                            {quotationType !== 'READYMADE' && <th className="p-3">SAM Cost</th>}
                            <th className="p-3">Design Number</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Unit Price</th>
                            <th className="p-3 text-right">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                          {items.map((item, idx) => {
                            const pTypeName = productTypes.find((pt) => String(pt.id) === String(item.product_type_id))?.name || 'Unknown';
                            const fabricName = fabricsList.find((f) => String(f.id) === String(item.fabric_id))?.brand_name || 'Custom';
                            return (
                              <tr key={item.id || idx} className="hover:bg-zinc-50/50 bg-white">
                                <td className="p-3 font-black text-[#3a525d]">{pTypeName}</td>
                                <td className="p-3 text-zinc-500">
                                  {quotationType === 'READYMADE' ? 'Ready-made Product' : fabricName}
                                </td>
                                {quotationType !== 'READYMADE' && (
                                  <td className="p-3 font-mono">
                                    {item.sam_value ? `₹${parseFloat(item.sam_value).toFixed(2)}` : '—'}
                                  </td>
                                )}
                                <td className="p-3">{item.design_number || 'N/A'}</td>
                                <td className="p-3 text-right font-black">{item.quantity}</td>
                                <td className="p-3 text-right font-mono">₹{parseFloat(item.price || '0').toFixed(2)}</td>
                                <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">
                                  ₹{((parseInt(item.quantity) || 0) * parseFloat(item.price || '0')).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100 pb-2">
                Product Items Details
              </h4>
              <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                      <th className="p-3">Product Type</th>
                      <th className="p-3">{quotationType === 'READYMADE' ? 'Product Name' : 'Fabric Option'}</th>
                      {quotationType !== 'READYMADE' && <th className="p-3">SAM Cost</th>}
                      <th className="p-3">Design Number</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                    {manualItems.map((item, idx) => {
                      const isSet = item.size_breakdown?.is_set;
                      
                      if (isSet) {
                        const setName = item.size_breakdown?.set_name || 'Custom Set';
                        const products = item.size_breakdown?.products || [];
                        return (
                          <tr key={item.id || idx} className="hover:bg-zinc-50/50 bg-white">
                            <td className="p-3">
                              <div className="space-y-1">
                                <div className="font-black text-[#2d8d9b] uppercase text-[11px]">🎁 SET: {setName}</div>
                                <ul className="list-disc list-inside pl-2 text-zinc-500 text-[10px] space-y-0.5 font-bold">
                                  {products.map((p: any, pIdx: number) => (
                                    <li key={pIdx}>
                                      {p.product_type_name} {p.product_name ? `(${p.product_name})` : ''}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                            <td className="p-3 text-zinc-400 font-bold">—</td>
                            {quotationType !== 'READYMADE' && <td className="p-3 font-mono text-zinc-400">—</td>}
                            <td className="p-3 text-zinc-500">{item.design_number || 'N/A'}</td>
                            <td className="p-3 text-right font-black">{item.quantity}</td>
                            <td className="p-3 text-right font-mono">₹{parseFloat(item.price || '0').toFixed(2)}</td>
                            <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">
                              ₹{((parseInt(item.quantity) || 0) * parseFloat(item.price || '0')).toFixed(2)}
                            </td>
                          </tr>
                        );
                      }

                      const pTypeName = productTypes.find((pt) => String(pt.id) === String(item.product_type_id))?.name || 'Unknown';
                      const fabricName = fabricsList.find((f) => String(f.id) === String(item.fabric_id))?.brand_name || 'Custom';
                      return (
                        <tr key={item.id || idx} className="hover:bg-zinc-50/50 bg-white">
                          <td className="p-3 font-black text-[#3a525d]">{pTypeName}</td>
                          <td className="p-3 text-zinc-500">
                            {quotationType === 'READYMADE' ? 'Ready-made Product' : fabricName}
                          </td>
                          {quotationType !== 'READYMADE' && (
                            <td className="p-3 font-mono">
                              {item.sam_value ? `₹${parseFloat(item.sam_value).toFixed(2)}` : '—'}
                            </td>
                          )}
                          <td className="p-3">{item.design_number || 'N/A'}</td>
                          <td className="p-3 text-right font-black">{item.quantity}</td>
                          <td className="p-3 text-right font-mono">₹{parseFloat(item.price || '0').toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">
                            ₹{((parseInt(item.quantity) || 0) * parseFloat(item.price || '0')).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {separateFabrics.length > 0 && (
            <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4 mt-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100 pb-2">
                Separate Fabric Materials Supplied
              </h4>
              <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm max-w-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100">
                      <th className="p-3 pl-4">Fabric Details</th>
                      <th className="p-3 text-right">Meters</th>
                      <th className="p-3 text-right">Rate/Meter</th>
                      <th className="p-3 text-right pr-4">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-[#3a525d]">
                    {separateFabrics.map((sf: any, idx: number) => {
                      const fabric = fabricsList.find((f: any) => String(f.id) === String(sf.fabric_id));
                      const fabricName = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
                      const shade = fabric?.shade ? ` (Shade: ${fabric.shade})` : '';
                      const width = fabric?.width ? ` - Width: ${fabric.width}"` : '';
                      const meters = Number(sf.meters) || 0;
                      const rate = Number(sf.rate) || 0;
                      const total = meters * rate;

                      return (
                        <tr key={idx} className="hover:bg-zinc-50/50 bg-white transition-colors">
                          <td className="p-3 pl-4 font-black text-[#3a525d]">{fabricName}{shade}{width}</td>
                          <td className="p-3 text-right">{meters} m</td>
                          <td className="p-3 text-right font-mono">₹{rate.toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-[#2d8d9b] pr-4 font-mono">₹{total.toFixed(2)}</td>
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
        <Card className="p-8 border border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2.5rem] space-y-6">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#2d8d9b] border-b border-[#2d8d9b]/10 pb-4">
            Financial Summary
          </h4>

          <div className="space-y-4 text-sm font-semibold text-zinc-600">
            <div className="flex justify-between">
              <span>Total Items count:</span>
              <span className="font-black text-[#3a525d]">
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
            <div className="flex justify-between border-t border-dashed border-zinc-200 pt-2">
              <span>Subtotal (Pre-Tax):</span>
              <span className="font-mono text-zinc-800 font-black">₹{quoteTotals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>GST Tax ({gstPercent}%):</span>
              <span className="font-mono font-black">+₹{quoteTotals.gstValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400 pt-1">
              <span>Suggested unit retail (Pre-Tax):</span>
              <span className="font-mono">₹{quoteTotals.avgSellingPrice.toFixed(2)}</span>
            </div>

            <div className="border-t border-zinc-200 pt-4 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Total Contract Value (With GST)
                </p>
                <p className="text-3xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
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
