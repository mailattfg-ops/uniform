'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Scale, ArrowRight } from 'lucide-react';
import { ProductType, ManualItem, SeparateFabricItem } from '../../page';

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
  separateFabrics: SeparateFabricItem[];
  fabricsList: any[];
  calculatedExpenses: { fabric: number; accessories: number; labor: number; total: number };
  calculateFabricCost: (fabricId: string, metersStr: string, samValueStr: string, productTypeId: string) => number;
  calculateProductSAMCost: (samValueStr: string, quantityStr: string) => number;
  onBack: () => void;
  onNext: () => void;
  orgDepartments?: any[];
  departmentItems?: Record<string, ManualItem[]>;
  quotationType?: string;
  allProducts?: any[];
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
  separateFabrics,
  fabricsList,
  calculatedExpenses,
  calculateFabricCost,
  calculateProductSAMCost,
  onBack,
  onNext,
  orgDepartments = [],
  departmentItems = {},
  quotationType = 'STANDARD',
  allProducts = [],
}: WizardStep3Props) {
  const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
  const hasDepartments = selectedDepts.length > 0;
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
        
        {/* Tables Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Garments Table */}
          {!hasMeasurements && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                {quotationType === 'SET_TYPE' ? 'Custom Sets Expenses Summary' : quotationType === 'READYMADE' ? 'Readymade Items Expenses Summary' : 'Manual Items Expenses Summary (Branch B)'}
              </h4>
              <div className="border border-zinc-150 rounded-3xl overflow-hidden bg-white shadow-sm text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                      <th className="p-3">Product Type / Set</th>
                      <th className="p-3">{quotationType === 'SET_TYPE' ? 'Included Garments' : quotationType === 'READYMADE' ? 'Product' : 'Fabric Option'}</th>
                      {quotationType !== 'SET_TYPE' && quotationType !== 'READYMADE' && (
                        <>
                          <th className="p-3 text-right">Fabric Cost (Unit)</th>
                          <th className="p-3 text-right">Labor Cost (Unit)</th>
                        </>
                      )}
                      <th className="p-3 text-right">Unit Expense</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Total Expense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-650">
                    {quotationType === 'SET_TYPE' ? (
                      manualItems.map((item, index) => {
                        const setName = item.size_breakdown?.set_name || 'Custom Set';
                        const productsList = item.size_breakdown?.products || [];
                        const qty = parseInt(item.quantity) || 0;
                        const unitExpense = parseFloat(item.price) || 0;
                        return (
                          <tr key={item.id || index} className="hover:bg-zinc-50/50 bg-white">
                            <td className="p-3 font-black text-[#2d8d9b] align-middle">
                              🎁 SET: {setName}
                            </td>
                            <td className="p-3 text-zinc-500 align-middle">
                              <ul className="list-disc list-inside space-y-0.5 font-bold text-[10px] text-zinc-550">
                                {productsList.map((p: any, pIdx: number) => (
                                  <li key={pIdx}>
                                    {p.product_type_name} {p.product_name ? `— ${p.product_name}` : ''}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="p-3 text-right font-black text-zinc-800 align-middle">{qty} Sets</td>
                            <td className="p-3 text-right font-mono align-middle">₹{unitExpense.toFixed(2)}</td>
                            <td className="p-3 text-right font-black text-[#2d8d9b] font-mono align-middle">
                              ₹{(unitExpense * qty).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    ) : quotationType === 'READYMADE' ? (
                      hasDepartments ? (
                        selectedDepts.flatMap((dept) => {
                          const items = departmentItems[String(dept.id)] || [];
                          return items.map((item, index) => {
                            const pTypeName = productTypes.find((pt) => String(pt.id) === String(item.product_type_id))?.name || 'Garment';
                            const product = allProducts.find((p) => String(p.id) === String(item.product_id));
                            const productName = product ? `${product.name}${product.art_number ? ` (${product.art_number})` : ''}` : 'Select Product...';
                            const qty = parseInt(item.quantity) || 0;
                            const unitExpense = parseFloat(item.price) || 0;
                            return (
                              <tr key={`${dept.id}-${item.id || index}`} className="hover:bg-zinc-50/50 bg-white">
                                <td className="p-3 font-black text-[#3a525d] align-middle">
                                  {pTypeName} <span className="text-[10px] text-zinc-400 font-bold">({dept.name})</span>
                                </td>
                                <td className="p-3 text-zinc-500 align-middle">
                                  {productName}
                                  {item.design_number && (
                                    <span className="block text-[10px] text-zinc-400 font-bold mt-0.5">
                                      {item.design_number}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono align-middle">₹{unitExpense.toFixed(2)}</td>
                                <td className="p-3 text-right font-black text-zinc-800 align-middle">{qty}</td>
                                <td className="p-3 text-right font-black text-[#2d8d9b] font-mono align-middle">
                                  ₹{(unitExpense * qty).toFixed(2)}
                                </td>
                              </tr>
                            );
                          });
                        })
                      ) : (
                        manualItems.map((item, index) => {
                          const pTypeName = productTypes.find((pt) => String(pt.id) === String(item.product_type_id))?.name || 'Garment';
                          const product = allProducts.find((p) => String(p.id) === String(item.product_id));
                          const productName = product ? `${product.name}${product.art_number ? ` (${product.art_number})` : ''}` : 'Select Product...';
                          const qty = parseInt(item.quantity) || 0;
                          const unitExpense = parseFloat(item.price) || 0;
                          return (
                            <tr key={item.id || index} className="hover:bg-zinc-50/50 bg-white">
                              <td className="p-3 font-black text-[#3a525d] align-middle">
                                {pTypeName}
                              </td>
                              <td className="p-3 text-zinc-500 align-middle">
                                {productName}
                                {item.design_number && (
                                  <span className="block text-[10px] text-zinc-400 font-bold mt-0.5">
                                    {item.design_number}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono align-middle">₹{unitExpense.toFixed(2)}</td>
                              <td className="p-3 text-right font-black text-zinc-800 align-middle">{qty}</td>
                              <td className="p-3 text-right font-black text-[#2d8d9b] font-mono align-middle">
                                ₹{(unitExpense * qty).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : hasDepartments ? (
                      selectedDepts.flatMap((dept) => {
                        const items = departmentItems[String(dept.id)] || [];
                        return items.map((item, index) => {
                          const pTypeName = productTypes.find((pt) => String(pt.id) === String(item.product_type_id))?.name || 'Garment';
                          const fabricBrand = fabricsList.find((f) => String(f.id) === String(item.fabric_id))?.name || 'Fabric';
                          const qty = parseInt(item.quantity) || 0;
                          
                          // Dynamic breakdowns
                          const mainCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
                          const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
                          const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
                          const itemFabricCost = mainCost + att1Cost + att2Cost;
                          const itemLaborCost = calculateProductSAMCost(item.sam_value, item.quantity);
                          const unitExpense = itemFabricCost + itemLaborCost;
                          
                          return (
                            <tr key={`${dept.id}-${item.id || index}`} className="hover:bg-zinc-50/50 bg-white">
                              <td className="p-3 font-black text-[#3a525d]">
                                {pTypeName} <span className="text-[10px] text-zinc-400 font-bold">({dept.name})</span>
                              </td>
                              <td className="p-3 text-zinc-400">{fabricBrand}</td>
                              <td className="p-3 text-right font-mono">
                                ₹{itemFabricCost.toFixed(2)}
                                <span className="block text-[9px] text-zinc-400 font-bold">({item.main_fabric_meters || '0'}m)</span>
                              </td>
                              <td className="p-3 text-right font-mono">
                                ₹{itemLaborCost.toFixed(2)}
                                <span className="block text-[9px] text-zinc-400 font-bold">({item.sam_value || '0'} min)</span>
                              </td>
                              <td className="p-3 text-right font-mono">₹{unitExpense.toFixed(2)}</td>
                              <td className="p-3 text-right font-black text-zinc-800">{qty}</td>
                              <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">
                                ₹{(unitExpense * qty).toFixed(2)}
                              </td>
                            </tr>
                          );
                        });
                      })
                    ) : (
                      manualItems.map((item, index) => {
                        const pTypeName = productTypes.find((pt) => String(pt.id) === String(item.product_type_id))?.name || 'Garment';
                        const fabricBrand = fabricsList.find((f) => String(f.id) === String(item.fabric_id))?.name || 'Fabric';
                        const qty = parseInt(item.quantity) || 0;

                        // Dynamic breakdowns
                        const mainCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
                        const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
                        const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
                        const itemFabricCost = mainCost + att1Cost + att2Cost;
                        const itemLaborCost = calculateProductSAMCost(item.sam_value, item.quantity);
                        const unitExpense = itemFabricCost + itemLaborCost;

                        return (
                          <tr key={item.id || index} className="hover:bg-zinc-50/50 bg-white">
                            <td className="p-3 font-black text-[#3a525d]">{pTypeName}</td>
                            <td className="p-3 text-zinc-450">{fabricBrand}</td>
                            <td className="p-3 text-right font-mono">
                              ₹{itemFabricCost.toFixed(2)}
                              <span className="block text-[9px] text-zinc-400 font-bold">({item.main_fabric_meters || '0'}m)</span>
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₹{itemLaborCost.toFixed(2)}
                              <span className="block text-[9px] text-zinc-400 font-bold">({item.sam_value || '0'} min)</span>
                            </td>
                            <td className="p-3 text-right font-mono">₹{unitExpense.toFixed(2)}</td>
                            <td className="p-3 text-right font-black text-zinc-800">{qty}</td>
                            <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">
                              ₹{(unitExpense * qty).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Separate Fabrics Table */}
          {separateFabrics && separateFabrics.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                Separate Fabric Materials Supplied
              </h4>
              <div className="border border-zinc-150 rounded-3xl overflow-hidden bg-white shadow-sm text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                      <th className="p-3">Fabric Details</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total Expense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-650">
                    {separateFabrics.map((sf, idx) => {
                      const fabric = fabricsList.find((f: any) => String(f.id) === String(sf.fabric_id));
                      const fabricName = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
                      const shade = fabric?.shade ? ` (Shade: ${fabric.shade})` : '';
                      const width = fabric?.width ? ` - Width: ${fabric.width}"` : '';
                      const meters = parseFloat(sf.meters) || 0;
                      const rate = parseFloat(sf.rate) || 0;
                      const total = meters * rate;
                      
                      return (
                        <tr key={sf.id || idx} className="hover:bg-zinc-50/50 bg-white">
                          <td className="p-3 font-black text-[#3a525d]">{fabricName}{shade}{width}</td>
                          <td className="p-3 text-right text-zinc-800">{meters} m</td>
                          <td className="p-3 text-right font-mono">₹{rate.toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">₹{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* INTERACTIVE DYNAMIC CARD */}
        <Card className="p-8 border-2 border-dashed border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2rem] flex flex-col justify-between lg:col-start-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#2d8d9b]">
              <Scale size={20} />
              <h4 className="text-xs font-black uppercase tracking-widest">Compiler Outputs</h4>
            </div>

            {quotationType === 'SET_TYPE' || quotationType === 'READYMADE' ? (
              <div className="space-y-3 divide-y divide-zinc-100 font-semibold text-sm">
                <div className="flex justify-between py-2 text-zinc-500">
                  <span>{quotationType === 'SET_TYPE' ? 'Custom Sets Price:' : 'Readymade Items Price:'}</span>
                  <span className="font-mono text-[#2d8d9b] font-black">₹{calculatedExpenses.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-zinc-500">
                  <span>Sizing Audit Type:</span>
                  <span className="text-[#3a525d] font-black uppercase text-[10px] tracking-wider bg-[#3a525d]/10 px-2 py-0.5 rounded-md border border-[#3a525d]/15">
                    {quotationType === 'SET_TYPE' ? 'Set Level pricing' : 'Readymade Product Selling'}
                  </span>
                </div>
              </div>
            ) : (() => {
              const separateFabricsCost = separateFabrics.reduce((sum, sf) => sum + (parseFloat(sf.meters) || 0) * (parseFloat(sf.rate) || 0), 0);
              const garmentFabricExpense = Math.max(0, calculatedExpenses.fabric - separateFabricsCost);

              return (
                <div className="space-y-3 divide-y divide-zinc-100 font-semibold text-sm">
                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>Fabric for Garments:</span>
                    <span className="font-mono text-zinc-800 font-black">₹{garmentFabricExpense.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>Garment Accessories (Buttons/Threads):</span>
                    <span className="font-mono text-zinc-800 font-black">₹{calculatedExpenses.accessories.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>Garment Tailoring Labor (Production):</span>
                    <span className="font-mono text-zinc-800 font-black">₹{calculatedExpenses.labor.toFixed(2)}</span>
                  </div>
                  {separateFabrics.length > 0 && (
                    <div className="flex justify-between py-2 text-zinc-500">
                      <span>Raw Fabrics (Sold Separately):</span>
                      <span className="font-mono text-[#2d8d9b] font-black">₹{separateFabricsCost.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="border-t border-zinc-200/50 pt-4 mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">
              Total Production Expenses
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
