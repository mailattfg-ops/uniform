'use client';

import React from 'react';
import { 
  ChevronRight, 
  MapPin, 
  Star, 
  Activity, 
  Play,
  Search,
  Loader2
} from 'lucide-react';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('Dashboard fetch error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2d8d9b]" size={48} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-1000">
      
      {/* Top Row - Total Students */}
      <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-[#6fa1ac] to-[#2d8d9b] rounded-[3.5rem] p-12 min-h-[400px] relative overflow-hidden text-white flex flex-col justify-between shadow-2xl shadow-[#2d8d9b]/30">
        <div className="z-10">
          <p className="text-xl font-medium opacity-90 tracking-wide">Total Registered Students</p>
          <h1 className="text-9xl font-black mt-2 drop-shadow-lg">{stats?.totalStudents || 0}</h1>
        </div>
        
        <div className="space-y-6 z-10">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
               <Star size={20} fill="white" />
             </div>
             <div>
               <p className="text-[11px] opacity-70 font-black tracking-widest uppercase">Member Schools</p>
               <p className="font-bold text-xl">{stats?.totalSchools || 0}</p>
             </div>
           </div>
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
               <Activity size={20} />
             </div>
             <div>
               <p className="text-[11px] opacity-70 font-black tracking-widest uppercase">Measurements</p>
               <p className="font-bold text-xl">{stats?.totalMeasurements || 0}</p>
             </div>
           </div>
        </div>

        <div className="absolute right-0 bottom-0 w-[550px] h-full flex items-end justify-end pointer-events-none pr-6 pb-2 z-10">
           <img 
             src="/images/dashboard_illustration_1776147777937-1.png" 
             alt="Dashboard Illustration" 
             className="object-contain max-h-[95%] opacity-90 mix-blend-multiply"
           />
        </div>

        <button className="absolute bottom-12 right-12 bg-[#236e7b] hover:bg-[#236e7a] hover:scale-105 active:scale-95 transition-all px-10 py-5 rounded-2xl flex items-center gap-4 font-black text-sm shadow-xl z-20">
           SYSTEM OVERVIEW
           <ChevronRight size={20} />
        </button>
      </div>

      {/* Usage Analytics */}
      <div className="col-span-12 lg:col-span-4 bg-[#fce4d4] rounded-[3.5rem] p-12 flex flex-col justify-between relative shadow-xl shadow-[#fce4d4]/50">
         <div className="flex justify-between items-start">
            <div>
              <p className="text-xl font-bold text-[#8b6b5a]">Utilization rate</p>
              <h2 className="text-8xl font-black text-[#1a1a1a] mt-2">{stats?.popularity || 87}<span className="text-2xl align-top relative top-4">%</span></h2>
            </div>
            <div className="w-32 h-32 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="3" opacity="0.3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#f2994a" strokeWidth="3" strokeDasharray={`${stats?.popularity || 87}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-[#f2994a] font-black text-xs">+{stats?.newStudentsThisMonth || 0}</span>
              </div>
            </div>
         </div>

         <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 space-y-4 shadow-sm border border-white">
            <p className="text-sm text-[#444] leading-relaxed font-medium">
              Data reflects current student <span className="font-black text-[#1a1a1a]">onboarding progress</span> and measurement completion across institutions.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <span className="text-[11px] font-black opacity-50 flex items-center gap-2 tracking-wider">
                 <Search size={14} />
                 ANALYZE DATA
              </span>
              <button className="w-10 h-10 rounded-full bg-[#f2994a] hover:bg-[#e67e22] transition-colors flex items-center justify-center text-white shadow-lg">
                 <Play size={16} fill="white" />
              </button>
            </div>
         </div>
      </div>

      {/* Activity Performance */}
      <div className="col-span-12 lg:col-span-4 bg-zinc-50/50 rounded-[3rem] p-8 border border-zinc-100">
        <h3 className="text-xl font-black mb-8 tracking-tight text-[#3a525d]">Measurement Volume</h3>
        <div className="space-y-8">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[#2d8d9b] flex items-center justify-center text-white text-xl font-black shadow-lg shadow-[#2d8d9b]/20">M</div>
              <div>
                 <p className="text-3xl font-black tracking-tighter">{stats?.totalMeasurements || 0}</p>
                 <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest leading-none mt-1">Total Records Taken</p>
              </div>
           </div>
           <div className="flex justify-between items-end h-32 gap-3 px-2">
              {[3, 6, 4, 8, 5, 9].map((h, i) => (
                <div key={i} className="flex-1 bg-zinc-100 rounded-full relative overflow-hidden h-full">
                  <div className="absolute bottom-0 w-full bg-[#2d8d9b] rounded-full transition-all duration-1000 ease-out" style={{height: `${h*10}%`}} />
                </div>
              ))}
           </div>
           <div className="flex justify-between text-[11px] font-black text-zinc-300 tracking-widest px-1">
              <span>DEC</span><span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span>
           </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 bg-zinc-50/50 rounded-[3rem] p-8 border border-zinc-100">
        <h3 className="text-xl font-black mb-8 tracking-tight text-[#3a525d]">System Status</h3>
        <div className="space-y-6">
           {[
             { name: 'Database API', status: 'Healthy', score: '99.9', color: 'green' },
             { name: 'Asset Server', status: 'Online', score: '98.2', color: 'green' },
             { name: 'Vercel Edge', status: 'Optimized', score: '12ms', color: 'zinc' }
           ].map((p, i) => (
             <div key={i} className="flex items-center justify-between group transition-all">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-zinc-100 flex items-center justify-center">
                       <Activity className="text-[#2d8d9b]" size={24} />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-zinc-50 ${p.color === 'green' ? 'bg-green-500' : 'bg-zinc-300'}`} />
                  </div>
                  <div>
                    <p className="font-black text-base tracking-tight">{p.name}</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{p.status}</p>
                  </div>
                </div>
                <span className="text-lg font-black opacity-20 group-hover:opacity-60 transition-opacity">{p.score}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 bg-[#fce4d4]/20 rounded-[3rem] p-2 border border-[#fce4d4] overflow-hidden relative">
        <div className="p-6">
          <h3 className="text-xl font-black mb-2 tracking-tight text-[#8b6b5a]">Deployment Status</h3>
          <p className="text-[10px] text-[#8b6b5a]/60 font-bold uppercase tracking-[0.2em] mb-4">Instance Health</p>
        </div>
        <div className="bg-white/50 m-2 rounded-[2.5rem] h-[220px] flex items-center justify-center relative overflow-hidden">
          <div className="scale-110 hover:scale-125 transition-transform duration-500 cursor-pointer">
            <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-3xl shadow-2xl border border-white flex items-center gap-4 z-10">
              <div className="w-10 h-6 bg-[#2d8d9b] rounded-lg shadow-sm" />
              <div>
                <span className="text-sm font-black block text-[#1a1a1a]">Production Node</span>
                <span className="text-[10px] font-bold text-[#f2994a] uppercase">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
