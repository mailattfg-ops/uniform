'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Ruler, Clock, Mail, Phone, MapPin, Activity, History, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ isOpen, onClose, member }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'measurements'>('profile');

  useEffect(() => {
    if (isOpen && member) {
      fetchHistory();
    }
  }, [isOpen, member]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/measurements/history/${member.id}`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  const latestMeasurement = history.length > 0 ? history[0] : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-4xl bg-[#f8fafc] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col md:flex-row h-[85vh]">
        
        {/* Left Sidebar - Profile Summary */}
        <div className="w-full md:w-80 bg-white border-r border-slate-200 p-8 flex flex-col items-center">
            <button 
                onClick={onClose}
                className="absolute top-6 left-6 md:hidden w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center"
            >
                <X size={20} />
            </button>

            <div className="relative mt-8 mb-6">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[#2d8d9b] to-[#3a525d] p-1 shadow-2xl shadow-[#2d8d9b]/20">
                    <div className="w-full h-full rounded-[2.2rem] bg-white flex items-center justify-center overflow-hidden">
                        <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.admission_no}`} 
                            alt={member.full_name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg ${
                    member.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}>
                    <Activity size={16} className="text-white" />
                </div>
            </div>

            <div className="text-center space-y-1 mb-8">
                <h3 className="text-2xl font-black italic tracking-tighter text-slate-800 leading-tight">{member.full_name}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] opacity-80">{member.admission_no}</p>
            </div>

            <div className="w-full space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400">
                        <MapPin size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Organization</span>
                        <span className="text-xs font-bold text-slate-700">{member.organizations?.name || 'Main Registry'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400">
                        <Mail size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Contact Email</span>
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{member.user_profiles?.email || 'No Email'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400">
                        <Phone size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Phone Number</span>
                        <span className="text-xs font-bold text-slate-700">{member.contact_mobile || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div className="mt-auto w-full pt-6">
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                            activeTab === 'profile' ? 'bg-[#3a525d] text-white shadow-xl shadow-[#3a525d]/20' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <User size={18} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Full Profile</span>
                        </div>
                        <ChevronRight size={14} className={activeTab === 'profile' ? 'opacity-100' : 'opacity-0'} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('measurements')}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                            activeTab === 'measurements' ? 'bg-[#3a525d] text-white shadow-xl shadow-[#3a525d]/20' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Ruler size={18} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Measurements</span>
                        </div>
                        <ChevronRight size={14} className={activeTab === 'measurements' ? 'opacity-100' : 'opacity-0'} />
                    </button>
                </div>
            </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white md:bg-transparent">
            {/* Header for desktop */}
            <div className="hidden md:flex p-8 justify-between items-center bg-white border-b border-slate-200">
                <div>
                    <h2 className="text-xl font-black italic tracking-tighter text-slate-800">
                        {activeTab === 'profile' ? 'Registration Details' : 'Measurement Analytics'}
                    </h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Member Registry Insight Portal</p>
                </div>
                <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'profile' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 text-[#2d8d9b]">
                                    <Activity size={18} />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">Membership Status</h4>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400">CURRENT STATUS</span>
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                                            member.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                        }`}>
                                            {member.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400">MEASUREMENT STATUS</span>
                                        <span className="text-[10px] font-black text-slate-700 uppercase">{member.measurement_status || 'Missing'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-[10px] font-bold text-slate-400">GENDER</span>
                                        <span className="text-[10px] font-black text-slate-700 uppercase">{member.gender || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 text-[#2d8d9b]">
                                    <MapPin size={18} />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">Academic Mapping</h4>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400">INSTITUTION</span>
                                        <span className="text-[10px] font-black text-slate-700 uppercase">{member.organizations?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400">DEPT / SECTION</span>
                                        <span className="text-[10px] font-black text-slate-700 uppercase">{member.departments?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-[10px] font-bold text-slate-400">JOIN DATE</span>
                                        <span className="text-[10px] font-black text-slate-700 uppercase">{new Date(member.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {latestMeasurement && (
                            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                                            <Ruler size={20} />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-widest">Latest Sizing Insight</h4>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-white/10 rounded-lg">
                                        Recorded {new Date(latestMeasurement.recorded_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">System Suggested</p>
                                        <p className="text-2xl font-black italic">{latestMeasurement.suggested_size}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Review Status</p>
                                        <p className="text-sm font-black uppercase">{latestMeasurement.status}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Recorded By</p>
                                        <p className="text-sm font-black uppercase truncate">{latestMeasurement.user_profiles?.full_name || 'System'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-[#2d8d9b]" size={40} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fetching Audit History...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-6 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-slate-300">
                                    <History size={40} />
                                </div>
                                <div className="text-center">
                                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">No Measurements Found</h4>
                                    <p className="text-xs text-slate-400 mt-2">This member has no recorded anatomical data.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {history.map((h, idx) => (
                                    <div key={h.id} className="group bg-white p-6 rounded-[2.5rem] border border-slate-200 hover:border-[#2d8d9b] transition-all hover:shadow-xl hover:shadow-[#2d8d9b]/5">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#2d8d9b]/10 group-hover:text-[#2d8d9b] transition-all">
                                                    <Ruler size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 tracking-tight leading-none">Record #{history.length - idx}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                                                        Captured on {new Date(h.recorded_at).toLocaleDateString()} at {new Date(h.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black italic text-[#3a525d] leading-none">{h.suggested_size}</span>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">SUGGESTED SIZE</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {Object.entries(h.dynamic_data || {}).map(([category, metrics]: [string, any]) => {
                                                const displayValue = metrics.selected_size 
                                                    ? Object.values(metrics.selected_size).join(' / ')
                                                    : Object.entries(metrics).filter(([k]) => k !== 'strategy').map(([_, v]) => v).join(' / ');
                                                
                                                return (
                                                    <div key={category} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-all">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{category}</p>
                                                        <p className="text-[11px] font-black text-slate-700 truncate">{displayValue}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {h.notes && (
                                            <div className="mt-6 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                                <p className="text-[10px] font-bold text-orange-800 leading-relaxed italic">"{h.notes}"</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
