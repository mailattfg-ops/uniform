'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Scale, ArrowRight } from 'lucide-react';
import { ProductType, ManualItem } from '../../page';

interface WizardStep3Props {
  hasMeasurements: boolean;
  productTypes: ProductType[];
  selectedProductTypeId: string;
  setSelectedProductTypeId: (id: string) => void;
  baseFabricCost: string;
  setBaseFabricCost: (cost: string) => void;
  accCost: string;
  setAccCost: (cost: string) => void;
  laborCost: string;
  setLaborCost: (cost: string) => void;
  gstPercent: string;
  setGstPercent: (percent: string) => void;
  laborRatePerHour: string;
  setLaborRatePerHour: (rate: string) => void;
  manualItems: ManualItem[];
  fabricsList: any[];
  calculatedExpenses: { fabric: number; accessories: number; labor: number; total: number };
  onBack: () => void;
  onNext: () => void;
}

export default function WizardStep3({
  hasMeasurements,
  productTypes,
  selectedProductTypeId,
  setSelectedProductTypeId,
  baseFabricCost,
  setBaseFabricCost,
  accCost,
  setAccCost,
  laborCost,
  setLaborCost,
  gstPercent,
  setGstPercent,
  laborRatePerHour,
  setLaborRatePerHour,
  manualItems,
  fabricsList,
  calculatedExpenses,
  onBack,
  onNext,
}: WizardStep3Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-zinc-100 pb-6">
        <h3 className="text-2xl font-black italic text-[#3a525d]">Expenses & Sizing Compiler</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
          Sizing multipliers scale fabric expenses automatically based on metrics
        </p>
      </div>

      {hasMeasurements && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product Type</label>
            <Select
              options={productTypes.map((pt) => ({ label: pt.name, value: String(pt.id) }))}
              value={selectedProductTypeId}
              onChange={setSelectedProductTypeId}
              placeholder="Select Product..."
            />
          </div>
        </div>
      )}

      {/* COST SCALING ENGINE REPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MULTIPLIER TABLE / MANUAL SUMMARY PANEL */}
        {!hasMeasurements && (
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
              Manual Items Expenses Summary (Branch B)
            </h4>
            <div className="border border-zinc-150 rounded-3xl overflow-hidden bg-white shadow-sm text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                    <th className="p-3">Product Type</th>
                    <th className="p-3">Fabric</th>
                    <th className="p-3 font-mono">SAM (min)</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Expense</th>
                    <th className="p-3 text-right">Total Expense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                  {manualItems.map((item, index) => {
                    const pTypeName = productTypes.find((pt) => String(pt.id) === String(item.product_type_id))?.name || 'Garment';
                    const fabricBrand = fabricsList.find((f) => String(f.id) === String(item.fabric_id))?.name || 'Fabric';
                    const qty = parseInt(item.quantity) || 0;
                    const unitExpense = parseFloat(item.price) || 0;
                    return (
                      <tr key={item.id || index} className="hover:bg-zinc-50/50 bg-white">
                        <td className="p-3 font-black text-[#3a525d]">{pTypeName}</td>
                        <td className="p-3 text-zinc-400">{fabricBrand}</td>
                        <td className="p-3 font-mono">
                          {item.sam_value ? `${parseFloat(item.sam_value).toFixed(1)} min` : '—'}
                        </td>
                        <td className="p-3 text-right font-black text-zinc-800">{qty}</td>
                        <td className="p-3 text-right font-mono">₹{unitExpense.toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">
                          ₹{(unitExpense * qty).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INTERACTIVE DYNAMIC CARD */}
        <Card className="p-8 border-2 border-dashed border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2rem] flex flex-col justify-between lg:col-start-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#2d8d9b]">
              <Scale size={20} />
              <h4 className="text-xs font-black uppercase tracking-widest">Compiler Outputs</h4>
            </div>

            <div className="space-y-3 divide-y divide-zinc-100 font-semibold text-sm">
              <div className="flex justify-between py-2 text-zinc-500">
                <span>Fabric Expense:</span>
                <span className="font-mono text-zinc-800 font-black">₹{calculatedExpenses.fabric.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-zinc-500">
                <span>Accessories Fee:</span>
                <span className="font-mono text-zinc-800 font-black">₹{calculatedExpenses.accessories.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-zinc-500">
                <span>Production Labor:</span>
                <span className="font-mono text-zinc-800 font-black">₹{calculatedExpenses.labor.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200/50 pt-4 mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">
              Calculated Expenses
            </p>
            <p className="text-4xl font-black italic tracking-tighter text-[#3a525d] font-mono mt-1">
              ₹{calculatedExpenses.total.toFixed(2)}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-between pt-6 border-t border-zinc-100">
        <Button
          variant="secondary"
          onClick={onBack}
          className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
          Back
        </Button>
        <Button
          disabled={hasMeasurements ? !selectedProductTypeId : false}
          onClick={onNext}
          className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
        >
          Timeline & Profit <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
