'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Clock, Calendar, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

interface ExtraCharge {
  label: string;
  quantity: string;
  rate: string;
}

interface WizardStep4Props {
  hasMeasurements: boolean;
  baseProductionHours: string;
  setBaseProductionHours: (val: string) => void;
  extraCustomizationHours: string;
  setExtraCustomizationHours: (val: string) => void;
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
  setGstPercent: (val: string) => void;
  extraCharges: ExtraCharge[];
  setExtraCharges: (val: ExtraCharge[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function WizardStep4({
  hasMeasurements,
  baseProductionHours,
  setBaseProductionHours,
  extraCustomizationHours,
  setExtraCustomizationHours,
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
  setGstPercent,
  extraCharges,
  setExtraCharges,
  onBack,
  onNext,
}: WizardStep4Props) {
  const [allQuotations, setAllQuotations] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDateQuotes, setSelectedDateQuotes] = useState<any[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  useEffect(() => {
    const fetchAllQuotes = async () => {
      try {
        const res = await api.get('/quotations');
        setAllQuotations(res.data || []);
      } catch (err) {
        console.error('Failed to fetch quotations for calendar', err);
      }
    };
    fetchAllQuotes();
  }, []);

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const handlePrevMonth = () => {
      setCalendarMonth(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
      setCalendarMonth(new Date(year, month + 1, 1));
    };

    const daysCells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      daysCells.push(<div key={`empty-${i}`} className="h-9 w-9"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const matchingQuotes = allQuotations.filter(q => {
        if (!q.expected_delivery_date) return false;
        const qDate = new Date(q.expected_delivery_date);
        return qDate.getFullYear() === year && qDate.getMonth() === month && qDate.getDate() === day;
      });

      const hasDelivery = matchingQuotes.length > 0;

      daysCells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => {
            if (hasDelivery) {
              setSelectedDateQuotes(matchingQuotes);
              setSelectedDateStr(`${day} ${monthNames[month]} ${year}`);
            } else {
              setSelectedDateQuotes(null);
            }
          }}
          className={`h-9 w-9 text-xs font-black rounded-xl flex flex-col items-center justify-center relative transition-all duration-150 ${hasDelivery
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95'
            : 'text-zinc-650 hover:bg-zinc-150'
            }`}
        >
          <span>{day}</span>
          {hasDelivery && (
            <span className="absolute bottom-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          )}
        </button>
      );
    }

    return (
      <div className="bg-white border border-zinc-200 rounded-[2rem] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
            {monthNames[month]} {year}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          <div>Su</div>
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {daysCells}
        </div>
      </div>
    );
  };

  const durationDays = (() => {
    if (!projectStartDate || !deliveryDate) return null;
    const start = new Date(projectStartDate);
    const end = new Date(deliveryDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  })();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-zinc-100 pb-6">
        <h3 className="text-2xl font-black italic text-[#3a525d]">Timeline & Profitability Compiler</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
          Define delivery timelines and add custom extra charges
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TIMELINE SETTINGS */}
        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Project Milestones</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasMeasurements && (
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
            )}

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

          <div className="space-y-2 pt-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">GST Tax Slab (%)</label>
            <select
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value)}
              className="w-full px-2.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] focus:ring-1 focus:ring-[#2d8d9b]/20 bg-white transition-all cursor-pointer"
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>

          {/* EXTRA CHARGES SECTION */}
          <div className="space-y-4 pt-6 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Extra Charges</h4>
              <button
                type="button"
                onClick={() => setExtraCharges([...extraCharges, { label: '', quantity: '1', rate: '0' }])}
                className="px-3 py-1.5 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b]/20 text-[#2d8d9b] rounded-lg font-black uppercase tracking-widest text-[9px] transition-all"
              >
                + Add Extra Charge
              </button>
            </div>

            {extraCharges.length === 0 ? (
              <p className="text-[10px] text-zinc-400 font-bold italic">No extra charges added yet.</p>
            ) : (
              <div className="space-y-3">
                {extraCharges.map((ec, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-zinc-50/50 p-3 border border-zinc-150 rounded-2xl">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Charge Name (e.g. Packing, Delivery)"
                        value={ec.label}
                        onChange={(e) => {
                          const updated = [...extraCharges];
                          updated[idx].label = e.target.value;
                          setExtraCharges(updated);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={ec.quantity}
                        onChange={(e) => {
                          const updated = [...extraCharges];
                          updated[idx].quantity = e.target.value;
                          setExtraCharges(updated);
                        }}
                        className="w-full px-3 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] text-center focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder="Rate"
                        value={ec.rate}
                        onChange={(e) => {
                          const updated = [...extraCharges];
                          updated[idx].rate = e.target.value;
                          setExtraCharges(updated);
                        }}
                        className="w-full px-3 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] text-center focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setExtraCharges(extraCharges.filter((_, i) => i !== idx))}
                      className="px-3 py-2 text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 rounded-xl border border-red-200 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* LIVE TIMELINE REPORT CARD */}
        <Card className="h-fit p-8 border border-zinc-100 bg-zinc-50/50 rounded-[2.5rem] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[#3a525d] border-b border-zinc-200 pb-4">
              <Clock size={20} />
              <h4 className="text-xs font-black uppercase tracking-widest">Time & Yield Estimates</h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mt-0.5">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-blue-600">
                    {projectStartDate ? new Date(projectStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Launch Start Date</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 mt-0.5">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-green-600">
                    {deliveryDate ? new Date(deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Expected Delivery Date</p>
                </div>
              </div>

              {durationDays !== null && (
                <div className="flex items-start gap-4 pt-1">
                  <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] mt-0.5">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#2d8d9b]">
                      {durationDays} Days {durationDays > 0 ? `(${Math.floor(durationDays / 7)} Weeks, ${durationDays % 7} Days)` : ''}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Total Project Duration</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200/60 pt-4 space-y-2 text-xs font-bold text-zinc-500">
              <div className="flex justify-between">
                <span>Production Expenses:</span>
                <span className="font-mono text-[#3a525d]">₹{quoteTotals.expenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal (Pre-Tax):</span>
                <span className="font-mono text-zinc-700">₹{quoteTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>GST Tax ({gstPercent}%):</span>
                <span className="font-mono">+₹{quoteTotals.gstValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#2d8d9b] font-black border-t border-dashed border-zinc-200 pt-1.5 mt-1">
                <span>Suggested Retail / Item:</span>
                <span className="font-mono">₹{quoteTotals.avgSellingPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-4 mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Contract Value (With GST)</p>
            <p className="text-4xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-1">
              ₹{quoteTotals.finalValue.toFixed(2)}
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-4 pt-6 border-t border-zinc-100">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Delivery Schedule Registry</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            {renderCalendar()}
          </div>
          <div>
            {selectedDateQuotes ? (
              <div className="bg-emerald-50/40 border border-[#bbf7d0] rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                    Deliveries on {selectedDateStr}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedDateQuotes(null)}
                    className="text-[9px] font-black uppercase text-zinc-400 hover:text-zinc-650"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar">
                  {selectedDateQuotes.map((q, idx) => (
                    <div key={q.id || idx} className="bg-white border border-zinc-100 rounded-2xl p-4 flex justify-between items-center text-xs shadow-sm transition-all hover:border-emerald-200">
                      <div>
                        <p className="font-black text-[#3a525d] text-sm truncate max-w-[280px]">{q.title}</p>
                        <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                          Client: {q.organizations?.name || q.organization?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 text-sm font-mono">₹{parseFloat(q.final_quote_value || 0).toFixed(0)}</p>
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-150">
                          {q.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200 border-dashed rounded-[2rem] p-10 text-center text-zinc-400 flex flex-col justify-center items-center min-h-[220px]">
                <Calendar className="text-zinc-300 mb-3" size={28} />
                <p className="text-[10px] font-black uppercase tracking-wider">Select a highlighted date</p>
                <p className="text-[9px] font-semibold text-zinc-400 mt-1 max-w-[240px] mx-auto">
                  Click on dates marked with green dots to view scheduled delivery orders.
                </p>
              </div>
            )}
          </div>
        </div>
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
