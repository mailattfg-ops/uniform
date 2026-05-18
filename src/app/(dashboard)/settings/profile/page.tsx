'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  User, ShieldCheck, Mail, MapPin, Ruler, Calendar, Award, 
  History, ArrowRight, Settings2, Camera, Scale, TrendingUp, 
  TrendingDown, Activity, Box, Maximize2, Layers 
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [config, setConfig] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileData = async () => {
    try {
      const [profileRes, configRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/measurements/config')
      ]);
      setProfile(profileRes.data);
      setConfig(configRes.data);
      console.log("sj1",profileRes.data);
      
      // Load measurements if user is linked to a registry member
      const memberDetails = profileRes.data.memberDetails || (profileRes.data.role?.toLowerCase() === 'student' ? profileRes.data.details : null);
      if (memberDetails?.id) {
        const mRes = await api.get(`/measurements/history/${memberDetails.id}`);
        setMeasurements(mRes.data);
      }
    } catch (err) {
      toast.error('Failed to load portal data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
    window.addEventListener('storage', fetchProfileData);
    return () => window.removeEventListener('storage', fetchProfileData);
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        await api.put('/users/profile', { avatar_url: base64 });
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...currentUser, avatar_url: base64 }));
        setProfile({ ...profile, avatar_url: base64 });
        toast.success('Identity photo updated!');
        window.dispatchEvent(new Event('storage'));
      } catch (err) { toast.error('Update failed'); }
    };
    reader.readAsDataURL(file);
  };

  const calculateDelta = (key: string, currentVal: any, previousVal: any) => {
    if (!previousVal) return null;
    const curr = parseFloat(currentVal);
    const prev = parseFloat(previousVal);
    if (isNaN(curr) || isNaN(prev)) return null;
    const delta = curr - prev;
    if (delta > 0) return { val: `+${delta.toFixed(1)}`, color: 'text-orange-500', icon: TrendingUp };
    if (delta < 0) return { val: delta.toFixed(1), color: 'text-green-500', icon: TrendingDown };
    return null;
  };

  if (isLoading) return <div className="flex items-center justify-center p-20 min-h-[60vh]"><div className="w-12 h-12 border-4 border-[#2d8d9b]/10 border-t-[#2d8d9b] rounded-full animate-spin" /></div>;

  const details = profile?.details;
  const role = profile?.role;
  const latestFit = measurements[0] || null;
  const previousFit = measurements[1] || null;

  // Determine Role Label & Metadata
  const getRoleBadge = () => {
    switch(role) {
      case 'Admin': return 'SYSTEM_ADMINISTRATOR';
      case 'Staff': return `PORTAL_STAFF // ${details?.employee_id || 'ID_PENDING'}`;
      case 'School':
      case 'Organization':
      case 'Entity': return `ORGANIZATION_ADMIN // ${details?.id ? `ORG_${details.id}` : 'VERIFIED'}`;
      case 'Student': return `STUDENT_PORTAL // ${details?.admission_no || 'REF_PENDING'}`;
      default: return 'PORTAL_USER';
    }
  };

  const getDynamicDetails = () => {
    const userRole = role?.toLowerCase();
    if (userRole === 'student') {
      return [
        { label: 'INSTITUTION', val: details?.organizations?.name, icon: MapPin },
        { label: 'ACADEMIC GROUP', val: details?.departments?.name, icon: Award },
        { label: 'ENROLLMENT', val: details?.created_at ? new Date(details.created_at).toLocaleDateString() : 'Active', icon: Calendar },
        { label: 'VERIFIED_MAIL', val: profile?.email, icon: Mail }
      ];
    }
    if (userRole === 'staff' || userRole === 'admin') {
      return [
        { label: 'DEPARTMENT', val: details?.department, icon: Layers },
        { label: 'DESIGNATION', val: details?.designation, icon: Award },
        { label: 'PHONE', val: details?.contact_mobile, icon: MapPin },
        { label: 'OFFICIAL_MAIL', val: profile?.email, icon: Mail }
      ];
    }
    if (['school', 'organization', 'entity'].includes(userRole)) {
      return [
        { label: 'INSTITUTION_NAME', val: details?.name || profile?.fullName, icon: MapPin },
        { label: 'ADMIN_ACCESS', val: 'Primary Owner', icon: ShieldCheck },
        { label: 'CONTACT_MAIL', val: profile?.email, icon: Mail },
        { label: 'ACCOUNT_ID', val: `ORG-ID-${details?.id || 'GLOBAL'}`, icon: Award }
      ];
    }
    return [
       { label: 'USER_ROLE', val: role, icon: ShieldCheck },
       { label: 'EMAIL', val: profile?.email, icon: Mail }
    ];
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000 pb-24">
      {/* PROFILE CORE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-8 border-none bg-[#1e2a30] text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2d8d9b]/20 rounded-full translate-x-32 -translate-y-32 blur-3xl opacity-50" />
          <div className="relative z-10 flex flex-col items-center">
             <div className="relative mb-8 group">
                <div className="w-32 h-32 rounded-[3.5rem] bg-white/5 border border-white/10 p-1 backdrop-blur-xl group-hover:scale-105 transition-all">
                   <div className="w-full h-full rounded-[3.3rem] overflow-hidden bg-[#24343d] flex items-center justify-center">
                     {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={48} className="text-white/20" />}
                   </div>
                </div>
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-[#f2994a] rounded-2xl flex items-center justify-center cursor-pointer shadow-2xl border-4 border-zinc-900">
                   <Camera size={16} /><input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
             </div>
             <h1 className="text-3xl font-black italic tracking-tighter mb-2 text-center leading-tight">{profile?.fullName}</h1>
             <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-400">{getRoleBadge()}</div>
             
             <div className="mt-10 w-full grid grid-cols-2 gap-4 py-8 border-t border-white/5">
                <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">STATUS</span><span className="text-xs font-black text-green-500 uppercase tracking-tighter italic">CORE_ACTIVE</span></div>
                <div className="flex flex-col text-right"><span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">SECURITY</span><span className="text-xs font-black text-[#2d8d9b] uppercase tracking-tighter italic">V_ENCRYPTED</span></div>
             </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-10 bg-white border-none shadow-2xl flex flex-col justify-center transition-all">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              {getDynamicDetails().map((item, i) => (
                <div key={i} className="space-y-2 group">
                   <div className="flex items-center gap-2 text-[10px] font-black text-[#2d8d9b] opacity-40 group-hover:opacity-100 transition-all uppercase tracking-widest">
                      <item.icon size={12} /> {item.label}
                   </div>
                   <p className="text-2xl font-black italic tracking-tighter text-[#3a525d] truncate leading-tight">{item.val || '--'}</p>
                </div>
              ))}
           </div>
        </Card>
      </div>

      {/* SIZING COMMAND CENTER - FOR ANYONE WITH MEASUREMENTS */}
      {(measurements.length > 0 || role?.toLowerCase() === 'student') && (
        <div className="space-y-8">
           <div className="flex items-center justify-between border-b border-zinc-100 pb-10">
              <div>
                 <h2 className="text-5xl font-black italic tracking-tighter text-[#3a525d]">Sizing Matrix</h2>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#2d8d9b] mt-2 opacity-70">A.I POWERED FITTING INTELLIGENCE</p>
              </div>
              <div className="hidden md:flex gap-4">
                 <div className="w-16 h-16 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl ring-4 ring-zinc-50">
                    <Maximize2 size={24} />
                 </div>
              </div>
           </div>

            {latestFit ? (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Object.entries(latestFit.dynamic_data || {}).map(([category, metrics]: [string, any]) => {
                       const strategy = metrics.strategy || 'manual';
                       const technicalKeys = ['strategy', 'chart_id'];
                       
                       // For size chart, we might have selected_size and the size name key
                       let displayMetrics: [string, any][] = [];
                       let sizeName = null;

                       if (strategy === 'us_size_chart') {
                          sizeName = Object.keys(metrics).find(k => !technicalKeys.includes(k) && k !== 'selected_size');
                          if (metrics.selected_size) {
                             displayMetrics = Object.entries(metrics.selected_size);
                          }
                       } else {
                          displayMetrics = Object.entries(metrics).filter(([k]) => !technicalKeys.includes(k));
                       }

                       return (
                          <div key={category} className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden flex flex-col p-8 space-y-6 transition-all hover:shadow-xl group">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="w-1.5 h-6 bg-[#2d8d9b] rounded-full group-hover:h-8 transition-all" />
                                   <h4 className="text-sm font-black uppercase tracking-widest text-[#3a525d]">{category}</h4>
                                </div>
                                <div className="flex gap-2">
                                   {sizeName && (
                                      <span className="text-[9px] font-black uppercase px-3 py-1 bg-[#3a525d] text-white rounded-lg shadow-sm">
                                         {sizeName}
                                      </span>
                                   )}
                                   <span className="text-[9px] font-black uppercase px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-400">
                                      {strategy === 'us_size_chart' ? 'Size Chart' : 'Manual Entry'}
                                   </span>
                                </div>
                             </div>

                             <div className="space-y-3">
                                {displayMetrics.length > 0 ? displayMetrics.map(([label, val]: [any, any]) => {
                                   const unit = config.find(f => f.label?.toLowerCase() === label?.toLowerCase())?.unit || 'in';
                                   return (
                                      <div key={label} className="flex justify-between items-center bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50 hover:bg-white hover:border-[#2d8d9b]/20 hover:shadow-sm transition-all group/row">
                                         <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover/row:text-[#2d8d9b] transition-colors">{label}</span>
                                         <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-black text-[#3a525d]">{val}</span>
                                            <span className="text-[8px] font-bold text-zinc-300 uppercase italic">{unit}</span>
                                         </div>
                                      </div>
                                   );
                                }) : (
                                   <div className="py-8 text-center bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-100">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">No Metrics Logged</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       );
                    })}
                 </div>

                 {/* SPECIAL NOTES DATA NODE */}
                 <Card className="p-8 border-none bg-zinc-50 shadow-inner flex items-center gap-8 rounded-[2.5rem]">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center shrink-0">
                       <Box size={24} className="text-[#3a525d]" />
                    </div>
                    <div>
                       <span className="text-[11px] font-black uppercase tracking-widest text-[#2d8d9b] block mb-2 opacity-60">TAILOR_INSTRUCTIONS</span>
                       <p className="font-bold text-[#3a525d] italic text-sm">{latestFit.notes || 'Standard Enterprise Fitting. No custom adjustments current.'}</p>
                    </div>
                 </Card>
              </div>
            ) : (
             <Card className="py-24 text-center border-none bg-zinc-50 shadow-inner">
                <Scale size={64} className="mx-auto mb-6 text-zinc-200 animate-pulse" />
                <h3 className="text-2xl font-black italic tracking-tighter text-zinc-300 uppercase">Awaiting Matrix Initialization</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest mt-2 text-zinc-400">Registry awaiting first calibration</p>
             </Card>
           )}

           {measurements.length > 1 && (
             <div className="pt-10">
                <div className="flex items-center gap-4 mb-8">
                   <h4 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-400">Historical Archives</h4>
                   <div className="h-[1px] flex-1 bg-zinc-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {measurements.slice(1, 5).map((m, idx) => (
                     <Card key={idx} className="p-6 border-none bg-white shadow-xl hover:shadow-2xl transition-all group flex items-center justify-between">
                        <div>
                           <p className="text-[10px] font-black text-zinc-300 uppercase leading-none mb-1">{new Date(m.recorded_at).toLocaleDateString()}</p>
                           <p className="text-xl font-black text-[#3a525d] italic">SIZE_{m.suggested_size}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-[#2d8d9b] group-hover:text-white transition-all">
                           <ArrowRight size={18} />
                        </div>
                     </Card>
                   ))}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
