'use client';

import React from 'react';
import { X, User, Ruler, Clock } from 'lucide-react';

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
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        {/* Modal Header */}
        <div className="p-8 bg-[#3a525d] text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter leading-none">Record Details</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mt-2">
              Reference #{String(record.id).slice(0, 8)} • Captured {new Date(record.recorded_at).toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto">
          {/* Member Info Card - Minimalist */}
          <div className="flex items-center gap-6 p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100">
            <div className="w-16 h-16 rounded-3xl bg-[#2d8d9b] flex items-center justify-center text-white shadow-xl shadow-[#2d8d9b]/20">
              <User size={30} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#3a525d] uppercase tracking-tight leading-none mb-2">
                {record.registry_members?.full_name}
              </h3>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-[#2d8d9b]/10 text-[#2d8d9b] text-[9px] font-black uppercase rounded tracking-widest">
                    {record.registry_members?.admission_no}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 capitalize">
                    {record.registry_members?.organizations?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Data Grid */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2d8d9b] rounded-full" />
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Anatomical Metrics</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {record.dynamic_data && Object.entries(record.dynamic_data).map(([category, metrics]: [string, any]) => {
                const strategy = metrics.strategy || 'manual';
                const displayMetrics = strategy === 'us_size_chart' 
                  ? (metrics.selected_size || {})
                  : Object.fromEntries(Object.entries(metrics).filter(([k]) => k !== 'strategy'));

                return (
                  <div key={category} className="p-8 bg-zinc-50/50 rounded-[2rem] border border-zinc-100/50 space-y-5">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b]">{category}</p>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-white border border-zinc-100 rounded text-zinc-400">
                           {strategy === 'us_size_chart' ? 'Size Chart' : 'Manual Entry'}
                        </span>
                     </div>
                     <div className="space-y-3">
                       {Object.entries(displayMetrics).map(([metric, value]: [any, any]) => (
                         <div key={metric} className="flex justify-between items-center bg-white p-3 rounded-xl border border-zinc-100/50 shadow-sm">
                           <span className="text-[10px] font-bold text-zinc-400 uppercase">{metric}</span>
                           <span className="text-[11px] font-black text-[#3a525d]">
                             {typeof value === 'object' ? JSON.stringify(value) : (value || '--')}
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
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#f2994a] rounded-full" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Tailoring Notes</h4>
              </div>
              <div className="p-6 bg-orange-50/30 rounded-3xl border border-orange-100/50">
                <p className="text-xs font-bold text-[#8b6b5a] leading-relaxed italic">
                  "{record.notes}"
                </p>
              </div>
            </div>
          )}

          {/* Log Details */}
          <div className="grid grid-cols-2 gap-6 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
             <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Recorded By</p>
                <div className="flex items-center gap-2">
                   <Clock size={12} className="text-[#2d8d9b]" />
                   <p className="text-[11px] font-black text-[#3a525d]">{record.user_profiles?.full_name || 'System'}</p>
                </div>
             </div>
             <div className="space-y-1 text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Capture Date</p>
                <p className="text-[11px] font-black text-[#3a525d]">{new Date(record.recorded_at).toLocaleString()}</p>
             </div>
          </div>

          {/* Suggested Size Badge */}
          <div className="flex items-center justify-between p-8 bg-[#3a525d] rounded-[2.5rem] text-white shadow-2xl">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                   <Ruler size={24} />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">System Suggested Size</p>
                   <p className="text-2xl font-black italic tracking-tighter">Variant: {record.suggested_size}</p>
                </div>
             </div>
             <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                record.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30' : 
                record.status === 'Pending' ? 'bg-amber-500/20 text-amber-100 border-amber-500/30' :
                'bg-red-500/20 text-red-100 border-red-500/30'
             }`}>
                {record.status}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
