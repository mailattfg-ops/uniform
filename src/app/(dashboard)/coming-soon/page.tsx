'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowLeft, 
  Rocket, 
  Clock, 
  CheckCircle2, 
  Bell, 
  Layers, 
  Building2, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  Compass,
  LayoutDashboard
} from 'lucide-react';
import toast from 'react-hot-toast';

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const feature = searchParams.get('feature') || 'Upcoming Feature';
  const moduleName = searchParams.get('module') || 'Forma Apparels Platform';
  const customDesc = searchParams.get('desc');
  const phase = searchParams.get('phase') || 'Active Engineering Phase';

  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSubscribed(true);
    toast.success(`You're on the list! We'll alert you as soon as ${feature} launches.`);
  };

  // Curated capability previews tailored to the feature
  const upcomingHighlights = [
    {
      icon: Users,
      title: 'Dedicated Client Hub',
      desc: 'Centralized workspace for individual customer profiles, contacts, and custom requirements.'
    },
    {
      icon: Zap,
      title: 'Streamlined Interactions',
      desc: 'Instant self-service inquiry logging, quote requests, and order placement workflows.'
    },
    {
      icon: Clock,
      title: 'Real-Time Visibility',
      desc: 'End-to-end milestone tracking from lead qualification through production and dispatch.'
    },
    {
      icon: ShieldCheck,
      title: 'Role-Based Access',
      desc: 'Secure customer permission levels ensuring data privacy and governed multi-tier access.'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto py-2">
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#fce4d4]/60 pb-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#8b6b5a] hover:text-[#3a525d] transition-colors bg-transparent border-none p-0 cursor-pointer self-start"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <Link href="/dashboard" className="hover:text-[#3a525d] transition-colors">
            Dashboard
          </Link>
          <ChevronRight size={13} className="text-zinc-300" />
          <span className="text-zinc-500 font-semibold">{moduleName}</span>
          <ChevronRight size={13} className="text-zinc-300" />
          <span className="text-[#2d8d9b] font-black">{feature}</span>
        </div>
      </div>

      {/* Main Glassmorphic Hero Banner */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-white via-[#fffbf8] to-[#fcf6f0] border-2 border-[#fce4d4] shadow-2xl p-8 md:p-14 text-center">
        
        {/* Decorative Floating Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#2d8d9b]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#CC9448]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 border border-[#fce4d4] shadow-sm backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2d8d9b] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2d8d9b]" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#3a525d]">
              {phase}
            </span>
          </div>

          {/* Feature Title */}
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2d8d9b] to-[#3a525d] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#2d8d9b]/25 transform hover:scale-105 transition-transform">
              <Rocket size={30} />
            </div>

            <h1 className="text-3xl md:text-5xl font-black italic tracking-tight text-[#3a525d]">
              {feature}
            </h1>
            <p className="text-sm md:text-base font-medium text-zinc-500 leading-relaxed max-w-lg mx-auto">
              {customDesc || `We are actively crafting the ${feature} module to deliver seamless operational management, automated tracking, and unified reporting.`}
            </p>
          </div>

          {/* Engineering Progress Meter */}
          <div className="bg-white/80 border border-[#fce4d4] rounded-2xl p-4 max-w-md mx-auto shadow-sm">
            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider mb-2">
              <span className="text-zinc-500">Development Progress</span>
              <span className="text-[#2d8d9b]">In Pipeline</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#2d8d9b] to-[#8b6b5a] rounded-full transition-all duration-1000"
                style={{ width: '70%' }}
              />
            </div>
          </div>

          {/* Interactive Notify Me Form */}
          <div className="pt-2">
            {!isSubscribed ? (
              <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for release updates..."
                  className="flex-1 h-12 px-4 rounded-2xl bg-white border border-[#fce4d4] text-xs font-bold text-[#3a525d] placeholder:text-zinc-400 focus:outline-none focus:border-[#2d8d9b] shadow-sm"
                  required
                />
                <button
                  type="submit"
                  className="h-12 px-6 rounded-2xl bg-[#3a525d] hover:bg-[#2d8d9b] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#3a525d]/20 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Bell size={14} />
                  Notify Me
                </button>
              </form>
            ) : (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                <CheckCircle2 size={16} />
                <span>You're registered for early release notifications!</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Feature Preview Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#2d8d9b]" />
          <h3 className="text-base font-black uppercase tracking-wider text-[#3a525d]">
            What to expect from {feature}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingHighlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="bg-white rounded-3xl border border-[#fce4d4] p-5 shadow-sm hover:border-[#2d8d9b]/40 hover:shadow-md transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center group-hover:bg-[#2d8d9b] group-hover:text-white transition-colors">
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-[#3a525d]">{item.title}</h4>
                  <p className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Access to Active Sections */}
      <div className="bg-white/60 border border-[#fce4d4] rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
            <Compass size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#3a525d]">Explore Current Active Modules</h4>
            <p className="text-xs text-zinc-400">Access live production management, catalogs, and registry tools right now.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/organizations/leads"
            className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:border-[#2d8d9b] bg-white text-xs font-bold text-[#3a525d] transition-all hover:shadow-sm"
          >
            Leads Registry
          </Link>
          <Link
            href="/organizations/registry"
            className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:border-[#2d8d9b] bg-white text-xs font-bold text-[#3a525d] transition-all hover:shadow-sm"
          >
            Organization CRM
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#2d8d9b]/20"
          >
            Dashboard
          </Link>
        </div>
      </div>

    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="flex h-96 w-full items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#2d8d9b]/20 border-t-[#2d8d9b] rounded-full animate-spin" />
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  );
}
