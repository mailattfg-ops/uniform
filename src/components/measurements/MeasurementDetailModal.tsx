'use client';

import React from 'react';
import { X, User, Ruler, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { extractGarmentDisplayMetrics, formatDate } from '@/lib/formatters';

interface MeasurementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
}

export const MeasurementDetailModal: React.FC<MeasurementDetailModalProps> = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-zinc-200/80 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />

        {/* Modal Header */}
        <div className="p-7 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter leading-none">Record Details</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2 font-mono">
              Reference #{String(record.id).slice(0, 8)} • Captured {formatDate(record.recorded_at, true)}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="secondary"
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white border border-white/15 shadow-none cursor-pointer"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Member Info Card */}
          <div className="flex items-center gap-5 p-5 bg-zinc-50 rounded-[2rem] border border-zinc-200/80">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-md shrink-0">
              <User size={26} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight leading-none mb-2">
                {record.registry_members?.full_name}
              </h3>
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/15 text-[9px] font-black uppercase rounded font-mono tracking-wider">
                  {record.registry_members?.admission_no}
                </span>
                <span className="text-[10px] font-bold text-zinc-500 capitalize">
                  {record.registry_members?.organizations?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Data Grid */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#C82A2B] rounded-full" />
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Anatomical Metrics</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {record.dynamic_data && Object.entries(record.dynamic_data).map(([category, metrics]: [string, any]) => {
                const display = extractGarmentDisplayMetrics(category, metrics);

                return (
                  <div key={category} className="p-6 bg-zinc-50/80 rounded-[2rem] border border-zinc-200/60 space-y-4">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#9E1B1D]">{category}</p>
                        <span className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-md border ${
                           display.strategy === 'us_size_chart' 
                             ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                             : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                           {display.strategy === 'us_size_chart' ? 'STANDARD US SIZE' : 'CUSTOM BESPOKE'}
                        </span>
                     </div>
                     <div className="space-y-2.5">
                       {display.metrics.map((m) => (
                         <div key={m.label} className="flex justify-between items-center bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
                           <span className="text-[10px] font-bold text-zinc-400 uppercase">{m.label}</span>
                           <span className="text-[11px] font-black text-zinc-900">
                             {m.value}
                           </span>
                         </div>
                       ))}
                     </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes Section */}
          {record.notes && (
            <div className="space-y-3">
               <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#9E1B1D] rounded-full" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Tailoring Notes</h4>
              </div>
              <div className="p-5 bg-[#FFF1F1]/70 rounded-2xl border border-[#C82A2B]/15">
                <p className="text-xs font-bold text-[#9E1B1D] leading-relaxed italic">
                  "{record.notes}"
                </p>
              </div>
            </div>
          )}

          {/* Log Details */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/80 text-xs">
             <div className="space-y-0.5">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Recorded By</p>
                <div className="flex items-center gap-1.5">
                   <Clock size={12} className="text-[#9E1B1D]" />
                   <p className="text-[11px] font-bold text-zinc-900">{record.user_profiles?.full_name || 'System'}</p>
                </div>
             </div>
             <div className="space-y-0.5 text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Capture Date</p>
                <p className="text-[11px] font-bold text-zinc-900">{new Date(record.recorded_at).toLocaleString()}</p>
             </div>
          </div>

          {/* Suggested Size Badge */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 rounded-[2rem] text-white shadow-xl">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/15 flex items-center justify-center text-white">
                   <Ruler size={22} />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">System Suggested Size</p>
                   <p className="text-xl font-black italic tracking-tight text-white">Variant: {record.suggested_size}</p>
                </div>
             </div>
             <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                record.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 
                record.status === 'Pending' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' :
                'bg-rose-500/20 text-rose-200 border-rose-500/30'
             }`}>
                {record.status}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
