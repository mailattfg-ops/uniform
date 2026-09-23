'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  Star, 
  Activity, 
  ChevronRight,
  ChevronLeft,
  Calendar,
  Building2,
  Scale,
  X,
  TrendingUp,
  Users,
  Ruler,
  ReceiptText,
  ArrowRight,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  Tag,
  Sparkles,
  User,
  Phone
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { extractGarmentDisplayMetrics } from '@/lib/formatters';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [allQuotations, setAllQuotations] = useState<any[]>([]);
  const [fabricsList, setFabricsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDateQuotes, setSelectedDateQuotes] = useState<any[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  
  // Details Modal states
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load user from localStorage
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    }

    let active = true;

    // Fetch dashboard stats
    api.get('/dashboard/stats')
      .then(res => {
        if (active) setStats(res.data);
      })
      .catch(err => console.error('Dashboard stats fetch error:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    // Fetch all quotations for delivery calendar (admin only, don't block on error)
    api.get('/quotations')
      .then(res => {
        if (active) setAllQuotations(res.data || []);
      })
      .catch(() => {});

    // Fetch all fabrics
    api.get('/inventory/fabrics')
      .then(res => {
        if (active) setFabricsList(res.data || []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedQuoteDetail) {
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
          modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [selectedQuoteDetail]);

  const handleOpenDetailModal = async (quoteId: number) => {
    setIsLoadingDetail(true);
    try {
      const res = await api.get(`/quotations/${quoteId}`);
      setSelectedQuoteDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch quotation details', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

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
        // Parse date parts strictly in string format (YYYY-MM-DD) to prevent timezone conversion shifts
        const dateStr = String(q.expected_delivery_date).split('T')[0];
        const parts = dateStr.split('-');
        if (parts.length !== 3) return false;
        const qYear = parseInt(parts[0], 10);
        const qMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
        const qDay = parseInt(parts[2], 10);
        return qYear === year && qMonth === month && qDay === day;
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
            <span className="absolute bottom-1 w-1.5 h-1.5 bg-emerald-50 rounded-full"></span>
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

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center bg-[#F5F4F2]">
        <Loader2 className="animate-spin text-[#CC9448]" size={48} />
      </div>
    );
  }

  // ── Client Portal Detection ──────────────────────────────────────────────────
  const roleLower = (user?.role || '').toLowerCase();
  const isClientEntity = Boolean(
    user?.memberId || ['entity', 'student', 'member'].includes(roleLower)
  );
  const isClientOrg = !isClientEntity && Boolean(
    user?.organizationId || ['organisation', 'organization', 'school'].includes(roleLower)
  );

  // ── 1. ENTITY (MEMBER / STUDENT) DASHBOARD ────────────────────────────────────
  if (isClientEntity) {
    const memberName = user?.fullName || stats?.memberDetails?.full_name || 'Member';
    const admissionNo = user?.admissionNo || stats?.memberDetails?.admission_no || '';
    const orgName = user?.organizationName || stats?.memberDetails?.organizations?.name || 'Your Institution';
    const deptName = user?.departmentName || stats?.memberDetails?.departments?.name || '';
    
    const latestMeasurement = stats?.latestMeasurement;
    const hasMeasurements = Boolean(latestMeasurement && (stats?.totalMeasurements || 0) > 0);
    const suggestedSize = latestMeasurement?.suggested_size || (hasMeasurements ? 'Standard' : 'Pending');
    const measureDate = latestMeasurement?.recorded_at
      ? new Date(latestMeasurement.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const dynamicData = latestMeasurement?.dynamic_data && typeof latestMeasurement.dynamic_data === 'object'
      ? latestMeasurement.dynamic_data
      : {};
    const notes = latestMeasurement?.notes || '';
    const isApproved = latestMeasurement?.status?.toLowerCase() === 'approved';

    // Parse dynamic_data structure (flat or nested by garment e.g. pants, shirt)
    const parseGarmentMetrics = (data: any) => {
      if (!data || typeof data !== 'object') return [];
      
      const entries = Object.entries(data);
      const isNested = entries.some(([_, val]) => val && typeof val === 'object' && !Array.isArray(val));

      if (!isNested) {
        const items = entries.filter(([k]) => k !== 'strategy').map(([name, val]) => ({
          name: name.replace(/_/g, ' '),
          value: typeof val === 'object' ? JSON.stringify(val) : String(val ?? '--')
        }));
        return items.length > 0 ? [{ garment: 'General Measurements', items }] : [];
      }

      return entries.map(([garment, val]) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const display = extractGarmentDisplayMetrics(garment, val);
          const items = display.metrics.map((m) => ({
            name: m.label,
            value: m.value
          }));

          return {
            garment: garment.charAt(0).toUpperCase() + garment.slice(1),
            strategy: display.strategy,
            items
          };
        }
        return {
          garment: garment.charAt(0).toUpperCase() + garment.slice(1),
          strategy: 'manual',
          items: [{ name: garment.replace(/_/g, ' '), value: String(val ?? '--') }]
        };
      });
    };

    const measurementGarments = parseGarmentMetrics(dynamicData);

    return (
      <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-12">
        {/* Entity Hero Banner */}
        <div className="relative bg-[#030303] rounded-[2.5rem] p-8 md:p-12 overflow-hidden text-white shadow-2xl border border-white/5">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #CC9448 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-[#CC9448]/20 text-[#CC9448] border border-[#CC9448]/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CC9448] animate-pulse" />
                  Member Portal
                </span>
                {admissionNo && (
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-white/10 text-white/80 border border-white/10">
                    #{admissionNo}
                  </span>
                )}
                {deptName && (
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-white/10 text-white/80 border border-white/10">
                    {deptName}
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Welcome back,<br />
                <span className="text-[#CC9448]">{memberName}</span>
              </h1>
              <p className="text-white/60 text-sm font-medium leading-relaxed">
                Your official uniform fitting profile, biometric measurements, and tailored size recommendations for <strong className="text-white">{orgName}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/measurements/history"
                className="px-6 py-3.5 bg-[#CC9448] hover:bg-[#b88036] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-[#CC9448]/25 active:scale-95"
              >
                <span>My Measurements</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Core Entity Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Fitting Status */}
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-2xl ${isApproved ? 'bg-emerald-500/10 text-emerald-500' : hasMeasurements ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'} flex items-center justify-center`}>
                {isApproved ? <ShieldCheck size={24} /> : hasMeasurements ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${isApproved ? 'bg-emerald-50 text-emerald-600' : hasMeasurements ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                {isApproved ? 'Approved' : hasMeasurements ? 'Recorded' : 'Required'}
              </span>
            </div>
            <div>
              <p className="text-xl font-black text-[#030303]">
                {isApproved ? 'Approved & Ready' : hasMeasurements ? 'Recorded' : 'Fitting Pending'}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
                {measureDate ? `Fitted on ${measureDate}` : 'Visit campus/branch to measure'}
              </p>
            </div>
          </div>

          {/* Card 2: Recommended Size */}
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#CC9448]/10 text-[#CC9448] flex items-center justify-center">
                <Tag size={22} />
              </div>
              <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-[#CC9448]/10 text-[#CC9448]">
                Assigned Size
              </span>
            </div>
            <div>
              <p className="text-xl font-black text-[#030303] truncate">
                {suggestedSize}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
                Based on captured biometrics
              </p>
            </div>
          </div>

          {/* Card 3: Total Recorded Sessions */}
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center">
                <History size={22} />
              </div>
              <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-[#2d8d9b]/10 text-[#2d8d9b]">
                Archive
              </span>
            </div>
            <div>
              <p className="text-xl font-black text-[#030303]">
                {stats?.totalMeasurements ?? (hasMeasurements ? 1 : 0)} Record(s)
              </p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
                Full fitting log history
              </p>
            </div>
          </div>

          {/* Card 4: Institution Roster */}
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <Building2 size={22} />
              </div>
              <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-600 truncate max-w-[100px]">
                {deptName || 'Enrolled'}
              </span>
            </div>
            <div>
              <p className="text-xl font-black text-[#030303] truncate" title={orgName}>
                {orgName}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1 truncate">
                {deptName ? `Department: ${deptName}` : 'Active Member'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Biometric Measurements Breakdown */}
        <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Ruler size={18} className="text-[#CC9448]" />
                <h2 className="text-lg font-black text-[#030303] tracking-tight">Active Biometric Profile</h2>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {measureDate ? `Official measurements recorded on ${measureDate}` : 'No active measurement session captured yet'}
              </p>
            </div>

            {hasMeasurements && (
              <div className="flex items-center gap-2">
                <Link
                  href="/measurements/history"
                  className="px-4 py-2 bg-[#CC9448]/10 hover:bg-[#CC9448]/20 text-[#CC9448] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>Full History</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>

          {hasMeasurements && measurementGarments.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {measurementGarments.map((group, idx) => (
                  <div key={idx} className="bg-zinc-50/80 border border-zinc-100 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#CC9448]" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#030303]">{group.garment}</h3>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-400 bg-white px-2.5 py-0.5 rounded-md border border-zinc-100 uppercase tracking-wider">
                        {group.items.length} Metric(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {group.items.map((item: any, i: number) => (
                        <div key={i} className="bg-white border border-zinc-150/70 rounded-2xl p-3.5 text-center shadow-sm hover:border-[#CC9448]/30 transition-all">
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 capitalize">{item.name}</p>
                          <p className="text-xl font-black text-[#030303] mt-1">
                            {item.value} <span className="text-[10px] text-zinc-400 font-normal">in</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {notes && (
                <div className="bg-[#FAF7F2] border border-[#CC9448]/20 rounded-2xl p-4 flex items-start gap-3">
                  <Sparkles size={16} className="text-[#CC9448] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#CC9448]">Tailor & Fitting Notes</p>
                    <p className="text-xs text-zinc-700 font-medium mt-0.5">{notes}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 px-4 space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#CC9448]/10 text-[#CC9448] flex items-center justify-center mx-auto">
                <Ruler size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-[#030303]">No Measurements Captured Yet</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  Your official uniform measurements have not been recorded. When the Forma Apparels fitting masters visit your campus or when you visit our outlet, your bespoke sizing will be displayed here.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/measurements/history"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#030303] hover:bg-[#CC9448] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <Ruler size={14} />
                  <span>View Measurement Records</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Access Grid */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-[#030303] uppercase tracking-[0.2em]">Quick Actions & Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/measurements/history"
              className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex items-center gap-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#CC9448] flex items-center justify-center shrink-0 shadow-lg shadow-[#CC9448]/20">
                <Ruler size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#030303] leading-tight">My Measurement History</p>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Review complete fitting logs, garments & size details</p>
              </div>
              <ArrowRight size={16} className="text-zinc-300 group-hover:text-[#CC9448] group-hover:translate-x-1 transition-all shrink-0" />
            </Link>

            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[#2d8d9b] flex items-center justify-center shrink-0 shadow-lg shadow-[#2d8d9b]/20">
                <ShieldCheck size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#030303] leading-tight">Official Forma Apparels Fit</p>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">All garments tailored according to institutional specification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Help Banner */}
        <div className="bg-[#F7EBE1] border border-[#CC9448]/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#CC9448]/20 flex items-center justify-center shrink-0">
              <Star size={18} className="text-[#CC9448]" fill="#CC9448" />
            </div>
            <div>
              <p className="text-xs font-black text-[#030303]">Need sizing assistance or replacement?</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                Contact your campus uniform coordinator or Forma Apparels support desk.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#CC9448] bg-white px-4 py-2 rounded-xl border border-[#CC9448]/20">
            <Phone size={14} />
            <span>+91 7902 499 990</span>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. CLIENT ORGANIZATION (SCHOOL / B2B) DASHBOARD ──────────────────────────
  if (isClientOrg) {
    const orgId = user?.organizationId;
    const orgName = user?.organizationName || user?.fullName || 'Your Organization';
    const clientStats = {
      members: stats?.totalMembers ?? 0,
      measurements: stats?.totalMeasurements ?? 0,
      outstandingBalance: stats?.outstandingBalance ?? 0,
      pendingMeasurements: stats?.pendingMeasurements ?? Math.max(0, (stats?.totalMembers ?? 0) - (stats?.totalMeasurements ?? 0)),
    };

    const quickLinks = [
      { icon: Users, label: 'Members Directory', sub: 'View all registered members', href: `/organizations/registry/${orgId}?tab=entities`, color: 'bg-[#2d8d9b]' },
      { icon: ReceiptText, label: 'Account Statement', sub: 'View invoices & payments', href: `/organizations/registry/${orgId}?tab=ledger`, color: 'bg-[#CC9448]' },
      { icon: History, label: 'Measurement History', sub: 'View captured measurements', href: '/measurements/history', color: 'bg-[#3a525d]' },
    ];

    const statCards = [
      { label: 'Total Members', value: clientStats.members, icon: Users, color: 'text-[#2d8d9b]', bg: 'bg-[#2d8d9b]/10' },
      { label: 'Measurements Taken', value: clientStats.measurements, icon: Ruler, color: 'text-[#CC9448]', bg: 'bg-[#CC9448]/10' },
      { label: 'Outstanding Balance', value: `₹${Number(clientStats.outstandingBalance).toLocaleString()}`, icon: ReceiptText, color: 'text-red-500', bg: 'bg-red-50' },
      { label: 'Pending Measurements', value: clientStats.pendingMeasurements, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ];

    return (
      <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-10">
        {/* Welcome Banner */}
        <div className="relative bg-[#030303] rounded-[2.5rem] p-8 md:p-12 overflow-hidden text-white shadow-2xl">
          {/* background grid decoration */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #CC9448 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#CC9448] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#CC9448]">Client Portal</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Welcome back,<br />
                <span className="text-[#CC9448]">{orgName}</span>
              </h1>
              <p className="text-white/50 text-sm font-medium mt-2">
                Manage your team, track measurements and review your account statement.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {orgId && (
                <Link
                  href={`/organizations/registry/${orgId}`}
                  className="px-6 py-3 bg-[#CC9448] hover:bg-[#b88036] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#CC9448]/25"
                >
                  View My Account
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className={`grid gap-6 ${statCards.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm hover:shadow-lg transition-all space-y-4">
                <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={22} className={card.color} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-2xl font-black text-[#030303]">{card.value}</p>
                  <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-[#030303] uppercase tracking-[0.15em]">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, i) => {
              const Icon = link.icon;
              return (
                <Link
                  key={i}
                  href={link.href}
                  className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex items-center gap-5"
                >
                  <div className={`w-14 h-14 rounded-2xl ${link.color} flex items-center justify-center shrink-0 shadow-lg`}>
                    <Icon size={22} className="text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#030303] leading-tight">{link.label}</p>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-1 leading-snug">{link.sub}</p>
                  </div>
                  <ArrowRight size={16} className="text-zinc-300 group-hover:text-[#CC9448] group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Help Banner */}
        <div className="bg-[#F7EBE1] border border-[#CC9448]/20 rounded-[2rem] p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#CC9448]/20 flex items-center justify-center shrink-0">
            <Star size={18} className="text-[#CC9448]" fill="#CC9448" />
          </div>
          <div>
            <p className="text-xs font-black text-[#030303]">Need help or have questions?</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Contact <span className="font-bold text-[#CC9448]">Forma Apparels</span> at <span className="font-mono font-bold">+91 7902 499 990</span> or <span className="font-mono font-bold">info@formaapparels.com</span>
            </p>
          </div>
        </div>
      </div>
    );
  }
  // ── End Client Portal Dashboard ──────────────────────────────────────────────

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

      {/* MIDDLE ROW: Product Registry, Global Metrics, and Deployment Status (3 Columns) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* 1. Product Registry Card */}
        <div className="col-span-12 md:col-span-4 bg-white border border-zinc-100 rounded-[2.5rem] p-6 md:p-8 hover:shadow-lg transition-all flex flex-col gap-6">
          <h3 className="text-lg font-bold text-[#030303] tracking-tight">Product Registry</h3>
          
          <div className="space-y-4 my-auto">
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

      {/* BOTTOM ROW: Delivery Schedule Registry Section */}
      <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-lg transition-all space-y-6">
        <div>
          <h3 className="text-lg font-bold text-[#030303] tracking-tight">Delivery Schedule Registry</h3>
          <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider mt-1 block">Timeline & Delivery Calendar</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
                    className="text-[9px] font-black uppercase text-zinc-450 hover:text-zinc-650 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar">
                  {selectedDateQuotes.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      onClick={() => q.id && handleOpenDetailModal(q.id)}
                      className="bg-white border border-zinc-100 rounded-2xl p-4 flex justify-between items-center text-xs shadow-sm transition-all hover:border-[#2d8d9b] hover:shadow-md cursor-pointer active:scale-[0.99] select-none"
                    >
                      <div>
                        <p className="font-black text-[#3a525d] text-sm truncate max-w-[280px]">{q.title}</p>
                        <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                          Client: {q.organizations?.name || q.organization?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-black text-[#2d8d9b] text-sm font-mono">₹{parseFloat(q.final_quote_value || 0).toFixed(0)}</p>
                        <span className="px-2 py-0.5 mt-1 rounded text-[8.5px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-150">
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
                <p className="text-[9px] font-semibold text-zinc-455 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                  Click on dates marked with green dots to view scheduled delivery orders.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POPUP DETAIL MODAL */}
      {selectedQuoteDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedQuoteDetail(null)}
        >
          <div 
            ref={modalRef}
            tabIndex={-1}
            className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/15 tracking-widest font-mono">
                  {selectedQuoteDetail.quotation_no || `ID: ${selectedQuoteDetail.id}`}
                </span>
                <h3 className="text-xl font-black italic text-[#3a525d] mt-2 tracking-tight">
                  {selectedQuoteDetail.title}
                </h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                  <Building2 size={12} className="text-zinc-400" />
                  Client: {selectedQuoteDetail.organizations?.name || selectedQuoteDetail.organization?.name || 'Unknown'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuoteDetail(null)}
                className="w-10 h-10 rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-450 hover:text-zinc-700 transition-all border border-zinc-200 bg-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Meta details column */}
                <div className="md:col-span-2 space-y-6">
                  {/* General Specifications */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50/50 border border-zinc-150 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Quotation Type</p>
                      <p className="text-xs font-black text-[#3a525d] mt-1 uppercase">
                        {(selectedQuoteDetail.metrics_summary?.quotation_type === 'READYMADE' || selectedQuoteDetail.metrics_summary?.quotation_type === 'HOLD') && 'Readymade'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'SET_TYPE' && 'Set Type'}
                        {(!selectedQuoteDetail.metrics_summary?.quotation_type || selectedQuoteDetail.metrics_summary.quotation_type === 'STANDARD') && 'Standard'}
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-50/50 border border-zinc-150 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Production Time</p>
                      <p className="text-xs font-black text-[#3a525d] mt-1">
                        {selectedQuoteDetail.total_estimated_time || `${selectedQuoteDetail.production_days_estimate * 8} Hours`}
                      </p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                        ({selectedQuoteDetail.production_days_estimate} Production Days)
                      </p>
                    </div>

                    <div className="p-4 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b]">Target Delivery Date</p>
                      <p className="text-xs font-black text-[#2d8d9b] mt-1">
                        {selectedQuoteDetail.expected_delivery_date
                          ? new Date(selectedQuoteDetail.expected_delivery_date).toLocaleDateString(undefined, {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-50/50 border border-zinc-150 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Group Design Collection</p>
                      <p className="text-xs font-black text-[#2d8d9b] mt-1 font-mono">
                        {selectedQuoteDetail.group_design_number?.code || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Products / Sets Listing */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Garment Line Items Breakdown</h4>
                    <div className="border border-zinc-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                            <th className="p-3 pl-4">Garment Line</th>
                            <th className="p-3">Fabric Style</th>
                            <th className="p-3">Design Ref</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right pr-4">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-650">
                          {selectedQuoteDetail.items && selectedQuoteDetail.items.map((item: any, idx: number) => {
                            const pTypeName = item.product_types?.name || item.product_type_name || 'Uniform Item';
                            const deptName = item.size_breakdown?.department_name;
                            const qty = Number(item.quantity) || 0;
                            
                            let firstCell = null;
                            let fabricCell = null;

                            if (item.size_breakdown?.is_set) {
                              const setName = item.size_breakdown.set_name || 'Custom Set';
                              const productsList = item.size_breakdown.products || [];
                              firstCell = (
                                <div className="space-y-1 py-1">
                                  <div className="font-black text-[#2d8d9b] uppercase text-[11px]">🎁 SET: {setName}</div>
                                  <ul className="list-disc list-inside pl-2 text-zinc-500 text-[10px] space-y-0.5 font-bold">
                                    {productsList.map((p: any, pIdx: number) => (
                                      <li key={pIdx}>
                                        {p.product_type_name} {p.product_name ? `(${p.product_name})` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                              fabricCell = <span className="text-zinc-400 font-bold">—</span>;
                            } else if (deptName) {
                              firstCell = (
                                <div className="space-y-0.5 py-1">
                                  <div className="font-black text-[#3a525d] uppercase text-[11px]">{deptName}</div>
                                  <div className="text-zinc-600 text-xs font-semibold">{pTypeName}</div>
                                </div>
                              );
                              const fabricId = item.size_breakdown?.fabric_id;
                              const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));
                              fabricCell = <span className="text-zinc-600">{fabric?.brand_name || fabric?.name || 'Custom Fabric'}</span>;
                            } else {
                              firstCell = <span className="font-black text-[#3a525d]">{pTypeName}</span>;
                              const fabricId = item.size_breakdown?.fabric_id;
                              const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));
                              fabricCell = <span className="text-zinc-650">{fabric?.brand_name || fabric?.name || 'Custom Fabric'}</span>;
                            }

                            return (
                              <tr key={item.id || idx} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="p-3 pl-4">{firstCell}</td>
                                <td className="p-3">{fabricCell}</td>
                                <td className="p-3 font-mono text-zinc-500">
                                  {item.size_breakdown?.product_design_number || item.size_breakdown?.design_number || '—'}
                                </td>
                                <td className="p-3 text-right font-black">{qty}</td>
                                <td className="p-3 text-right font-black text-[#2d8d9b] font-mono pr-4">
                                  ₹{Number(item.total_price || 0).toFixed(0)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Financial overview column */}
                <div className="p-6 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-[2rem] flex flex-col justify-between h-full">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#3a525d] border-b border-zinc-200/50 pb-3">
                      <Scale size={16} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Financial Breakdown</h4>
                    </div>

                    <div className="space-y-3 font-semibold text-zinc-600">
                      <div className="flex justify-between">
                        <span>Total Items:</span>
                        <span className="font-black text-[#3a525d]">{selectedQuoteDetail.metrics_summary?.total_entities || 0} Units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Expenses:</span>
                        <span className="font-mono font-black text-[#3a525d]">₹{Number(selectedQuoteDetail.estimated_expenses || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Profit Markup:</span>
                        <span className="font-black">+{selectedQuoteDetail.profit_margin_percent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST Tax ({selectedQuoteDetail.metrics_summary?.gst_percent || 18}%):</span>
                        <span className="font-mono text-red-500 font-black">
                          ₹{Number(Number(selectedQuoteDetail.final_quote_value) - Number(selectedQuoteDetail.metrics_summary?.pre_tax_subtotal || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200/60 pt-4 mt-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">Total Contract Value</p>
                    <p className="text-3xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-1">
                      ₹{Number(selectedQuoteDetail.final_quote_value || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedQuoteDetail(null)}
                className="px-6 py-2.5 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for fetching details */}
      {isLoadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-[1px]">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-zinc-150">
            <div className="w-5 h-5 border-2 border-[#2d8d9b] border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold text-xs text-[#3a525d]">Loading order details...</span>
          </div>
        </div>
      )}
    </div>
  );
}
