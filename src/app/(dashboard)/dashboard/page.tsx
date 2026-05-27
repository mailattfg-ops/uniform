'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Star, 
  Activity, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('Dashboard fetch error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center bg-[#F5F4F2]">
        <Loader2 className="animate-spin text-[#CC9448]" size={48} />
      </div>
    );
  }

  const totalMembers = stats?.totalMembers || 55;
  const totalOrgs = stats?.totalOrganizations || 11;
  const totalProducts = stats?.totalProducts || 2;
  const totalMeasurements = stats?.totalMeasurements || 50;
  const totalInventory = stats?.totalInventory || 5;
  const reach = stats?.reach || 5;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-1000 pb-10">
      
      {/* Dashboard Heading */}
      <div>
        <h1 className="text-[32px] font-semibold text-[#030303] leading-none">Dashboard</h1>
      </div>

      {/* TOP ROW: Large Welcomer Stat Banner & Deployment Reach Sidepanel */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Side: Massive Gold welcome stat card (8 columns) */}
        <div className="col-span-12 lg:col-span-8 bg-[#CC9448] rounded-[2.5rem] p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          {/* Main content elements */}
          <div className="flex-1 space-y-8 z-10">
            <div>
              <p className="text-[12px] font-semibold text-white/80 uppercase tracking-widest leading-none">
                Total Registered Members
              </p>
              <h2 className="text-8xl font-bold tracking-tight text-white mt-3 drop-shadow-md">
                {totalMembers}
              </h2>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Star size={16} fill="white" className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] opacity-75 font-semibold tracking-wider uppercase leading-none">
                    Member Organizations
                  </p>
                  <p className="font-bold text-base mt-1 leading-none">{totalOrgs}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Activity size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] opacity-75 font-semibold tracking-wider uppercase leading-none">
                    Measurements Captured
                  </p>
                  <p className="font-bold text-base mt-1 leading-none">{totalMeasurements}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Cartoon Illustration Mockup */}
          <div className="relative shrink-0 z-10 w-full md:w-[320px] h-[240px] flex items-center justify-center overflow-hidden rounded-[2rem] bg-white/10 p-2">
            <img 
              src="/images/dashboard_illustration_1776147777937-1.png" 
              alt="Dashboard Illustration" 
              className="object-contain max-h-full max-w-full opacity-95 rounded-2xl"
            />
            {/* Dark gold button overlay at the bottom right */}
            <button type="button" className="absolute bottom-4 right-4 bg-[#b88036] hover:bg-[#a6712d] transition-all px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-wider shadow-lg text-white">
              System Overview
              <ChevronRight size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Right Side: Deployment Reach Card (4 columns) */}
        <div className="col-span-12 lg:col-span-4 bg-[#F7EBE1] rounded-[2.5rem] p-8 flex flex-col justify-between shadow-md relative border border-[#CC9448]/10">
          <div className="flex justify-between items-start w-full">
            <div>
              <p className="text-sm font-semibold text-zinc-500 tracking-wide">Deployment Reach</p>
              <h2 className="text-[64px] font-bold text-[#030303] leading-tight mt-1">{reach}<span className="text-xl align-top relative top-3 ml-0.5">%</span></h2>
            </div>
            
            {/* Circular Pie Chart with +9 indicator inside */}
            <div className="w-16 h-16 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#CC9448" strokeWidth="4" strokeDasharray="15 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#CC9448] font-bold text-[10px]">+9</span>
              </div>
            </div>
          </div>

          {/* Slate blue analytics details pill */}
          <div className="bg-[#3a525d] text-white rounded-[2rem] p-6 shadow-xl space-y-4 mt-6">
            <p className="text-[12px] opacity-90 leading-relaxed font-medium">
              Real-time analytics monitor <span className="text-[#CC9448] font-bold">Enterprise Expansion</span> and regional deployment efficiency across all nodes.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CC9448]" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#CC9448]">Live Intelligence</span>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: Product Registry, Global Metrics, and Deployment Status (3 Columns) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* 1. Product Registry Card */}
        <div className="col-span-12 md:col-span-4 bg-white border border-zinc-100 rounded-[2.5rem] p-6 md:p-8 hover:shadow-lg transition-all flex flex-col gap-6">
          <h3 className="text-lg font-bold text-[#030303] tracking-tight">Product Registry</h3>
          
          <div className="space-y-4 my-auto">
            {/* Total Uniform Articles */}
            <div className="flex items-center gap-4 bg-[#F5F4F2]/50 p-4 rounded-2xl border border-zinc-100/55">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white text-base font-bold shadow-md shadow-teal-500/20 shrink-0">
                P
              </div>
              <div>
                <p className="text-xl font-bold text-[#030303] leading-none">{totalProducts}</p>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-1.5 leading-none">
                  Total Uniform Articles
                </p>
              </div>
            </div>
            
            {/* Inventory Items */}
            <div className="flex items-center gap-4 bg-[#F5F4F2]/50 p-4 rounded-2xl border border-zinc-100/55">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-base font-bold shadow-md shadow-orange-500/20 shrink-0">
                I
              </div>
              <div>
                <p className="text-xl font-bold text-[#030303] leading-none">{totalInventory}</p>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-1.5 leading-none">
                  Inventory Items
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Global Metrics Card */}
        <div className="col-span-12 md:col-span-4 bg-white border border-zinc-100 rounded-[2.5rem] p-6 md:p-8 hover:shadow-lg transition-all flex flex-col gap-6">
          <h3 className="text-lg font-bold text-[#030303] tracking-tight">Global Metrics</h3>
          
          <div className="space-y-4">
            {[
              { label: 'Member Onboarding', status: 'ACTIVE', value: totalMembers },
              { label: 'Measurement Log', status: 'HEALTHY', value: totalMeasurements },
              { label: 'Organization Sync', status: 'OPTIMIZED', value: totalOrgs }
            ].map((metric, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-[#F5F4F2]/20 rounded-2xl hover:bg-[#F5F4F2]/50 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-white border border-zinc-150 flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                      </svg>
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#030303] leading-none mb-1">{metric.label}</h4>
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider leading-none">{metric.status}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-zinc-400 font-mono">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Deployment Status Card */}
        <div className="col-span-12 md:col-span-4 bg-[#fdfbf7] border border-zinc-100 rounded-[2.5rem] p-6 md:p-8 hover:shadow-lg transition-all flex flex-col gap-6 relative overflow-hidden">
          <div>
            <h3 className="text-lg font-bold text-[#030303] tracking-tight">Deployment Status</h3>
            <p className="text-[9px] text-[#8b6b5a]/60 font-bold uppercase tracking-[0.2em] mt-1">Instance Health</p>
          </div>
          
          <div className="flex-1 flex items-center justify-center py-4">
            {/* White floating status pill widget exact design */}
            <div className="bg-white px-5 py-3.5 rounded-2xl shadow-xl shadow-zinc-200/50 border border-zinc-50 flex items-center gap-3.5 scale-105 hover:scale-110 transition-transform duration-300">
              <div className="w-7 h-4 bg-teal-600 rounded" />
              <div>
                <span className="text-xs font-bold block text-[#030303] leading-tight">Production Node</span>
                <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide leading-none mt-1 block">
                  Operational
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
