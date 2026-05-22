'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Clock, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';

interface WizardStep4Props {
  hasMeasurements: boolean;
  baseProductionHours: string;
  setBaseProductionHours: (val: string) => void;
  extraCustomizationHours: string;
  setExtraCustomizationHours: (val: string) => void;
  tailorsCount: string;
  setTailorsCount: (val: string) => void;
  dailyShiftHours: string;
  setDailyShiftHours: (val: string) => void;
  projectStartDate: string;
  setProjectStartDate: (val: string) => void;
  deliveryDate: string;
  setDeliveryDate: (val: string) => void;
  profitMargin: string;
  setProfitMargin: (val: string) => void;
  orgAnalysis: any;
  timeMetrics: { totalHours: number; workingDays: number };
  quoteTotals: { expenses: number; subtotal: number; gstValue: number; finalValue: number; profit: number; avgSellingPrice: number };
  gstPercent: string;
  onBack: () => void;
  onNext: () => void;
}

export default function WizardStep4({
  hasMeasurements,
  baseProductionHours,
  setBaseProductionHours,
  extraCustomizationHours,
  setExtraCustomizationHours,
  tailorsCount,
  setTailorsCount,
  dailyShiftHours,
  setDailyShiftHours,
  projectStartDate,
  setProjectStartDate,
  deliveryDate,
  setDeliveryDate,
  profitMargin,
  setProfitMargin,
  orgAnalysis,
  timeMetrics,
  quoteTotals,
  gstPercent,
  onBack,
  onNext,
}: WizardStep4Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-zinc-100 pb-6">
        <h3 className="text-2xl font-black italic text-[#3a525d]">Timeline & Profitability Compiler</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
          Manage lead capacity schedules and define profit markups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TIMELINE SETTINGS */}
        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Labor Capacity Parameters</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasMeasurements ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Base Production Hours / Garment</label>
                  <Input
                    type="number"
                    value={baseProductionHours}
                    onChange={(e) => setBaseProductionHours(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Customization Offset Hours (XL/XXL)</label>
                  <Input
                    type="number"
                    value={extraCustomizationHours}
                    onChange={(e) => setExtraCustomizationHours(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 bg-[#2d8d9b]/5 p-5 rounded-2xl border border-[#2d8d9b]/15 flex items-center gap-3 text-[#3a525d]">
                <Clock size={20} className="text-[#2d8d9b] shrink-0" />
                <div className="text-xs">
                  <p className="font-black">Garment Labor Hours Overridden (Branch B)</p>
                  <p className="font-semibold text-zinc-500 mt-0.5">
                    Labor requirements are calculated dynamically from the exact SAM (Standard Allowed Minutes) values entered in Step 2. Base garment hour settings are not required.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Available Tailoring Workforce (Staff count)</label>
              <Input
                type="number"
                value={tailorsCount}
                onChange={(e) => setTailorsCount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Daily Work Shift Hours</label>
              <Input
                type="number"
                value={dailyShiftHours}
                onChange={(e) => setDailyShiftHours(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Project Launch Start Date</label>
              <Input
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Expected Delivery Target Date</label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] flex justify-between">
              <span>Target Profit Markup Margin (%)</span>
              <span className="font-black text-[#2d8d9b] font-mono text-sm">{profitMargin}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="80"
              value={profitMargin}
              onChange={(e) => setProfitMargin(e.target.value)}
              className="w-full accent-[#2d8d9b] cursor-pointer"
            />
          </div>
        </div>

        {/* LIVE TIMELINE REPORT CARD */}
        <Card className="p-8 border border-zinc-100 bg-zinc-50/50 rounded-[2.5rem] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[#3a525d] border-b border-zinc-200 pb-4">
              <Clock size={20} />
              <h4 className="text-xs font-black uppercase tracking-widest">Time & Yield Estimates</h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#3a525d]">{timeMetrics.totalHours} Hours</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Total Estimated Time</p>
                  {hasMeasurements && (
                    <p className="text-[9px] font-mono text-zinc-400 mt-0.5">
                      = {orgAnalysis.total_entities} entities &times; {parseFloat(baseProductionHours) || 0} hrs/garment
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#3a525d]">{timeMetrics.workingDays} Working Days</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Production Days Estimate</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-green-600">
                    {deliveryDate ? new Date(deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Expected Delivery Date</p>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200/60 pt-4 space-y-2 text-xs font-bold text-zinc-500">
              <div className="flex justify-between">
                <span>Production Expenses:</span>
                <span className="font-mono text-[#3a525d]">${quoteTotals.expenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Markup Profit:</span>
                <span className="font-mono text-green-600">+${quoteTotals.profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal (Pre-Tax):</span>
                <span className="font-mono text-zinc-700">${quoteTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>GST Tax ({gstPercent}%):</span>
                <span className="font-mono">+${quoteTotals.gstValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#2d8d9b] font-black border-t border-dashed border-zinc-200 pt-1.5 mt-1">
                <span>Suggested Retail / Item:</span>
                <span className="font-mono">${quoteTotals.avgSellingPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-4 mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Contract Value (With GST)</p>
            <p className="text-4xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-1">
              ${quoteTotals.finalValue.toFixed(2)}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-between pt-6 border-t border-zinc-100 mt-10">
        <Button
          variant="secondary"
          onClick={onBack}
          className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
        >
          Review Summary <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
