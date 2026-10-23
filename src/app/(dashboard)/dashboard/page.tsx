'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Users,
  Ruler,
  ReceiptText,
  ArrowRight,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  Sparkles,
  Phone,
  TrendingUp,
  CreditCard,
  Package,
  Layers,
  Factory,
  RefreshCw,
  ExternalLink,
  Briefcase,
  CheckSquare,
  Square,
  Clock,
  ArrowUpRight,
  ShoppingBag,
  ShoppingCart,
  Scissors,
  FileText,
  AlertTriangle,
  FolderTree,
  DollarSign,
  Check,
  CheckCircle,
  Pin,
  PinOff
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { extractGarmentDisplayMetrics, formatDate } from '@/lib/formatters';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [allQuotations, setAllQuotations] = useState<any[]>([]);
  const [fabricsList, setFabricsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // User-specific Task Management states
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isTaskDrawerPinned, setIsTaskDrawerPinned] = useState(false);
  const [isTaskDrawerHovered, setIsTaskDrawerHovered] = useState(false);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDateQuotes, setSelectedDateQuotes] = useState<any[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  
  // Details Modal states
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = useCallback(() => {
    setLoading(true);
    // 1. Fetch primary dashboard telemetry - unblocks page render immediately
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // 2. Fetch delivery calendar data in background without blocking the UI
    api.get('/quotations')
      .then(res => setAllQuotations(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Load user from localStorage and load their saved task progress
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('user');
      if (u) {
        try {
          const parsed = JSON.parse(u);
          setUser(parsed);
          const savedTasks = localStorage.getItem(`forma_tasks_${parsed.id || parsed.username || 'user'}`);
          if (savedTasks) {
            setCompletedTaskIds(JSON.parse(savedTasks));
          }
        } catch (e) {
          console.error('Failed to parse user session or tasks', e);
        }
      }
    }
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleTask = (taskId: string) => {
    setCompletedTaskIds(prev => {
      const next = prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId];
      if (typeof window !== 'undefined') {
        const uKey = user?.id || user?.username || 'user';
        localStorage.setItem(`forma_tasks_${uKey}`, JSON.stringify(next));
      }
      return next;
    });
  };

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
      ? formatDate(latestMeasurement.recorded_at)
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
      { icon: Users, label: 'Members Directory', sub: 'View all registered members', href: `/customers/${orgId}?tab=entities`, color: 'bg-[#2d8d9b]' },
      { icon: ReceiptText, label: 'Account Statement', sub: 'View invoices & payments', href: `/customers/${orgId}?tab=ledger`, color: 'bg-[#CC9448]' },
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
                  href={`/customers/${orgId}`}
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

  // ── Role & Permission Isolation for Internal Users ─────────────────────────
  const userRole = user?.role || 'Staff Member';
  const userPermissions: string[] = user?.permissions || [];
  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'SuperAdmin' || userPermissions.includes('all');

  const hasPerm = (required: string[]) => {
    if (isAdmin) return true;
    return required.some(p => userPermissions.includes(p));
  };

  const isSalesUser = isAdmin || roleLower.includes('sale') || roleLower.includes('market') || hasPerm(['manage_quotations', 'view_quotations', 'branch_sales']);
  const isFactoryUser = isAdmin || roleLower.includes('factor') || roleLower.includes('production') || hasPerm(['factory_floor', 'factory_po_handler']);
  const isInventoryUser = isAdmin || roleLower.includes('invent') || roleLower.includes('warehouse') || roleLower.includes('stock') || hasPerm(['manage_inventory', 'view_inventory', 'branch_inventory', 'branch_transfers']);
  const isAccountsUser = isAdmin || roleLower.includes('account') || roleLower.includes('financ') || roleLower.includes('bill') || hasPerm(['manage_invoices', 'view_invoices', 'manage_payments']);
  const isMeasurementUser = isAdmin || roleLower.includes('measur') || roleLower.includes('tailor') || hasPerm(['manage_measurements', 'view_measurements']);

  // User-specific Authorized Workspaces
  const allWorkspaces = [
    {
      id: 'crm',
      title: 'CRM & Client Pipeline',
      description: 'Institutional accounts, deals, pipeline feeds and client organizations',
      icon: Users,
      href: '/customers',
      color: 'bg-amber-500/10 text-[#CC9448] border-amber-500/20 hover:border-[#CC9448]',
      badge: `${stats?.totalOrganizations || 0} Organizations`,
      allowed: isAdmin || hasPerm(['view_schools', 'manage_schools', 'view_organizations', 'manage_quotations', 'view_quotations', 'branch_sales', 'view_leads'])
    },
    {
      id: 'items',
      title: 'Uniform Articles & Specs',
      description: 'Standard uniform catalog, design numbers (DNS/DNG), and garment specs',
      icon: Layers,
      href: '/items',
      color: 'bg-teal-500/10 text-teal-600 border-teal-500/20 hover:border-teal-500',
      badge: `${stats?.totalProducts || 0} Articles`,
      allowed: isAdmin || hasPerm(['manage_products', 'view_products', 'manage_inventory', 'manage_design_numbers'])
    },
    {
      id: 'measurements',
      title: 'Biometric Measurements',
      description: 'Capture individual body measurements, sizing profiles, and fitting tokens',
      icon: Ruler,
      href: '/measurements/entry',
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:border-blue-500',
      badge: `${stats?.measurementCompletionRate || 0}% Complete`,
      allowed: isMeasurementUser
    },
    {
      id: 'sam',
      title: 'SAM Industrial Engineering',
      description: 'Standard Allowed Minutes configurations, operations config, and fabric SAM',
      icon: Scale,
      href: '/sam-management',
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:border-indigo-500',
      badge: 'Engineering',
      allowed: isAdmin || hasPerm(['manage_sam', 'manage_system'])
    },
    {
      id: 'inventory',
      title: 'Inventory & Materials Hub',
      description: '58" fabric stock rolls, trims, readymade garments, and branch transfers',
      icon: Package,
      href: '/inventory',
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:border-orange-500',
      badge: `${stats?.totalInventory || 0} Items`,
      allowed: isInventoryUser
    },
    {
      id: 'sales',
      title: 'Sales & Quotations Hub',
      description: 'Interactive quotation wizard, sales orders pipeline, and delivery challans',
      icon: ShoppingBag,
      href: '/sales',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:border-emerald-500',
      badge: `${stats?.activeOrdersCount || 0} Active Orders`,
      allowed: isSalesUser
    },
    {
      id: 'purchase',
      title: 'Procurement & Purchase',
      description: 'Vendor management, raw material purchase orders, and supplier bills',
      icon: ShoppingCart,
      href: '/purchase',
      color: 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:border-purple-500',
      badge: 'Procurement',
      allowed: isAdmin || hasPerm(['manage_system', 'manage_inventory', 'view_vendors', 'manage_purchase_orders'])
    },
    {
      id: 'factory',
      title: 'Factory Operations Floor',
      description: 'Production job cards, cutting, stitching and finishing lots, PO review gate',
      icon: Factory,
      href: '/factory/job-cards',
      color: 'bg-slate-700/10 text-[#3a525d] border-slate-700/20 hover:border-[#3a525d]',
      badge: `${stats?.jobCardsInProduction || 0} In Production`,
      allowed: isFactoryUser
    },
    {
      id: 'accounts',
      title: 'Accounts & Receivables',
      description: 'Customer invoices, payment collections, and institutional balance ledger',
      icon: ReceiptText,
      href: '/accounts',
      color: 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:border-rose-500',
      badge: `₹${(stats?.outstandingBalance || 0).toLocaleString('en-IN')}`,
      allowed: isAccountsUser
    },
    {
      id: 'reports',
      title: 'Reports & Audits',
      description: 'Production throughput telemetry, SAM analytics, and system audit logs',
      icon: TrendingUp,
      href: '/reports',
      color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:border-cyan-500',
      badge: 'Telemetry',
      allowed: isAdmin || hasPerm(['manage_system', 'view_audit_logs', 'view_sam_reports'])
    },
    {
      id: 'admin',
      title: 'Admin Master Settings',
      description: 'Staff accounts, branch configurations, roles, permissions, and security',
      icon: ShieldCheck,
      href: '/admin',
      color: 'bg-zinc-800/10 text-zinc-800 border-zinc-800/20 hover:border-zinc-800',
      badge: 'Admin Only',
      allowed: isAdmin
    }
  ];

  const allowedWorkspaces = allWorkspaces.filter(ws => ws.allowed);

  // User-specific Actionable Priority Tasks (Filtered to User's Role)
  const allTasks = [
    // Sales Tasks
    {
      id: 'task-pending-quotations',
      title: 'Review Pending Quotations',
      description: 'Draft proposals awaiting operational review or client sign-off before order generation.',
      category: 'Sales',
      priority: (stats?.pendingQuotationsCount || 0) > 0 ? 'Urgent' : 'Normal',
      badge: `${stats?.pendingQuotationsCount || 0} Pending`,
      metricValue: stats?.pendingQuotationsCount || 0,
      actionText: 'Review Quotes',
      actionHref: '/marketing/quotations',
      allowed: isSalesUser
    },
    {
      id: 'task-active-orders',
      title: 'Track Active Sales Orders',
      description: 'Monitor pipeline delivery milestones and order status for active institutional contracts.',
      category: 'Sales',
      priority: (stats?.activeOrdersCount || 0) > 0 ? 'High' : 'Normal',
      badge: `${stats?.activeOrdersCount || 0} Active Orders`,
      metricValue: stats?.activeOrdersCount || 0,
      actionText: 'Order Pipeline',
      actionHref: '/marketing/order-placement',
      allowed: isSalesUser
    },
    // Factory Tasks
    {
      id: 'task-held-jobcards',
      title: 'Clear Stalled Job Cards',
      description: 'Address materials hold, approval flags, or note revisions on paused production job cards.',
      category: 'Factory Floor',
      priority: (stats?.jobCardsHeld || 0) > 0 ? 'Urgent' : 'Normal',
      badge: `${stats?.jobCardsHeld || 0} Held Cards`,
      metricValue: stats?.jobCardsHeld || 0,
      actionText: 'Resolve Job Cards',
      actionHref: '/factory/job-cards',
      allowed: isFactoryUser
    },
    {
      id: 'task-floor-production',
      title: 'Supervise Floor Production Batches',
      description: 'Ensure ongoing cutting, stitching, and finishing stages stay aligned with batch SAM schedules.',
      category: 'Factory Floor',
      priority: 'Normal',
      badge: `${stats?.jobCardsInProduction || 0} In Progress`,
      metricValue: stats?.jobCardsInProduction || 0,
      actionText: 'Floor Queue',
      actionHref: '/factory/production-queue',
      allowed: isFactoryUser
    },
    // Inventory Tasks
    {
      id: 'task-fabric-audit',
      title: 'Audit 58" Fabric Stock & Trims',
      description: 'Confirm raw fabric rolls and trim inventory counts match upcoming cutting requirements.',
      category: 'Inventory',
      priority: 'Normal',
      badge: `${stats?.totalFabrics || 0} Fabric Rolls`,
      metricValue: stats?.totalFabrics || 0,
      actionText: 'Fabric Stock',
      actionHref: '/admin/inventory/fabric-stock',
      allowed: isInventoryUser
    },
    {
      id: 'task-readymade-stock',
      title: 'Audit Readymade Garment Stock',
      description: 'Inspect finished standard uniform inventory articles available for immediate branch delivery.',
      category: 'Inventory',
      priority: 'Normal',
      badge: `${stats?.totalProducts || 0} Uniform SKUs`,
      metricValue: stats?.totalProducts || 0,
      actionText: 'Article Stock',
      actionHref: '/admin/inventory/product-stock',
      allowed: isInventoryUser
    },
    // Accounts Tasks
    {
      id: 'task-outstanding-receivables',
      title: (stats?.overdueOrdersCount || 0) > 0 ? 'Collect Overdue Sales Receivables' : 'Follow-up on Customer Receivables',
      description: (stats?.overdueOrdersCount || 0) > 0
        ? `Immediate action required: ${stats.overdueOrdersCount} sales orders past scheduled delivery date with pending balance.`
        : 'Collect outstanding payments on confirmed sales orders awaiting customer settlement.',
      category: 'Accounts',
      priority: (stats?.overdueOrdersCount || 0) > 0 ? 'Urgent' : (stats?.outstandingBalance || 0) > 0 ? 'High' : 'Normal',
      badge: (stats?.overdueAmount || 0) > 0
        ? `₹${(stats.overdueAmount).toLocaleString('en-IN')} Overdue`
        : `₹${(stats?.outstandingBalance || 0).toLocaleString('en-IN')} Due`,
      metricValue: stats?.overdueAmount || stats?.outstandingBalance || 0,
      actionText: 'Invoices Due',
      actionHref: '/billing/invoices',
      allowed: isAccountsUser
    },
    {
      id: 'task-reconcile-payments',
      title: 'Reconcile Order Advances',
      description: 'Confirm initial token receipts and verify ledger entries for authorized contracts.',
      category: 'Accounts',
      priority: 'Normal',
      badge: `${stats?.paidQuotationsCount || 0} Settled`,
      metricValue: stats?.paidQuotationsCount || 0,
      actionText: 'Payments Ledger',
      actionHref: '/marketing/initial-payment',
      allowed: isAccountsUser
    },
    // Measurement Tasks
    {
      id: 'task-pending-fittings',
      title: 'Log Unfitted Member Biometrics',
      description: 'Capture standardized measurements for registered students and staff awaiting tailor fitting.',
      category: 'Tailoring & Fitting',
      priority: (stats?.pendingMeasurements || 0) > 0 ? 'High' : 'Normal',
      badge: `${stats?.pendingMeasurements || 0} Pending Fits`,
      metricValue: stats?.pendingMeasurements || 0,
      actionText: 'Record Measurements',
      actionHref: '/measurements/entry',
      allowed: isMeasurementUser
    },
    // Admin Tasks
    {
      id: 'task-system-audit',
      title: 'Review System Activity & Audit Trail',
      description: 'Inspect multi-branch transfers, staff role assignments, and operator log entries.',
      category: 'Executive Oversight',
      priority: 'Normal',
      badge: `${stats?.totalOrganizations || 0} Accounts`,
      metricValue: stats?.totalOrganizations || 0,
      actionText: 'Audit Trail',
      actionHref: '/admin/audit',
      allowed: isAdmin
    }
  ];

  const allowedTasks = allTasks.filter(t => t.allowed);
  const completedCount = allowedTasks.filter(t => completedTaskIds.includes(t.id)).length;
  const pendingCount = allowedTasks.length - completedCount;
  const progressPercent = allowedTasks.length > 0 ? Math.round((completedCount / allowedTasks.length) * 100) : 100;

  const filteredTasks = allowedTasks.filter(task => {
    const isCompleted = completedTaskIds.includes(task.id);
    if (taskFilter === 'pending') return !isCompleted;
    if (taskFilter === 'completed') return isCompleted;
    return true;
  });

  const totalMembers = stats?.totalMembers || 0;
  const totalOrgs = stats?.totalOrganizations || 0;
  const totalProducts = stats?.totalProducts || 0;
  const totalMeasurements = stats?.totalMeasurements || 0;
  const totalInventory = stats?.totalInventory || 0;
  const reach = stats?.measurementCompletionRate || stats?.reach || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
      
      {/* ── 1. PAGE HEADER (MATCHES OTHER HUBS) ─────────────────────────────── */}
      <DashboardHeader
        title="Home / Dashboard"
        subtitle="Overview of your sales orders, receivables, daily operations, and deliveries."
        icon={Building2}
        badge="Home"
        category={null}
        onRefresh={fetchDashboardData}
        isRefreshing={loading}
      />

      {/* ── HIGH VISIBILITY DUE / OVERDUE RECEIVABLES ALERT ─────────────────── */}
      {Boolean((stats?.overdueOrdersCount || 0) > 0) ? (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-[2rem] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-600 text-white">
                  Payment Overdue
                </span>
                <h3 className="text-base font-black text-rose-950">
                  {stats?.overdueOrdersCount} Sales Order{(stats?.overdueOrdersCount || 0) > 1 ? 's' : ''} Past Scheduled Delivery
                </h3>
              </div>
              <p className="text-xs font-semibold text-rose-800 mt-1">
                Outstanding overdue receivables: <span className="font-mono font-black text-rose-950">₹{(stats?.overdueAmount || 0).toLocaleString('en-IN')}</span> requiring urgent follow-up.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/billing/invoices"
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Follow-up Invoices</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : Boolean((stats?.outstandingBalance || 0) > 0) ? (
        <div className="bg-amber-50/80 border border-amber-300/80 rounded-[2rem] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-amber-950">
                Payment Collection Due: <span className="font-mono font-black">₹{(stats?.outstandingBalance || 0).toLocaleString('en-IN')}</span>
              </p>
              <p className="text-[10px] font-bold text-amber-800">
                Calculated across {stats?.dueOrdersCount || 0} active sales orders awaiting full settlement.
              </p>
            </div>
          </div>
          <Link
            href="/marketing/initial-payment"
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider transition-all"
          >
            Record Payment
          </Link>
        </div>
      ) : null}

      {/* ── 2. FINANCIAL PERFORMANCE & RECEIVABLES (CALCULATED FROM SALES ORDERS) ── */}
      <DashboardCardGroup
        title="Sales Orders Receivables & Financials"
        description="Calculated directly against placed commercial sales orders (not draft quotations)."
        icon={ReceiptText}
        targetHref="/billing/invoices"
        targetLabel="Customer Invoices"
        badge="Order Cashflow"
        columns="4"
      >
        <DashboardStatCard
          label="Total Sales Orders Value"
          value={`₹${(stats?.totalContractValue || 0).toLocaleString('en-IN')}`}
          subValue={`${stats?.paidOrdersCount || 0} orders fully settled`}
          icon={DollarSign}
          variant="emerald"
        />
        <DashboardStatCard
          label="Sales Order Receivables"
          value={`₹${(stats?.outstandingBalance || 0).toLocaleString('en-IN')}`}
          subValue={
            (stats?.overdueOrdersCount || 0) > 0
              ? `${stats.overdueOrdersCount} orders overdue past delivery`
              : `${stats?.dueOrdersCount || 0} orders with pending balance`
          }
          icon={CreditCard}
          variant={(stats?.overdueOrdersCount || 0) > 0 ? "rose" : (stats?.outstandingBalance || 0) > 0 ? "amber" : "default"}
          badge={(stats?.overdueOrdersCount || 0) > 0 ? "OVERDUE" : (stats?.outstandingBalance || 0) > 0 ? "PAYMENT DUE" : "SETTLED"}
        />
        <DashboardStatCard
          label="Collected Revenue"
          value={`₹${(stats?.collectedRevenue || 0).toLocaleString('en-IN')}`}
          subValue="Realized on placed sales orders"
          icon={ReceiptText}
          variant="teal"
        />
        {(stats?.overdueAmount || 0) > 0 ? (
          <DashboardStatCard
            label="Overdue Receivables"
            value={`₹${(stats.overdueAmount).toLocaleString('en-IN')}`}
            subValue={`${stats.overdueOrdersCount} orders past delivery deadline`}
            icon={AlertTriangle}
            variant="rose"
            badge="OVERDUE"
          />
        ) : (
          <DashboardStatCard
            label="Settlement Ratio"
            value={`${stats?.totalContractValue > 0 ? Math.round(((stats?.collectedRevenue || 0) / stats?.totalContractValue) * 100) : 0}%`}
            subValue={`${stats?.partialOrdersCount || 0} partial · ${stats?.unpaidOrdersCount || 0} unpaid orders`}
            icon={TrendingUp}
            variant="gold"
            badge="On Track"
          />
        )}
      </DashboardCardGroup>

      {/* ── 3. SALES ORDERS & COMMERCIAL PIPELINE ────────────────────────────── */}
      <DashboardCardGroup
        title="Sales Orders & Commercial Pipeline"
        description="Active client purchase orders, pending proposal reviews, and institutional accounts."
        icon={ShoppingBag}
        targetHref="/marketing/order-placement"
        targetLabel="Manage Orders"
        badge="Commercial Pipeline"
        columns="4"
      >
        <DashboardStatCard
          label="Active Orders Queue"
          value={stats?.activeOrdersCount || 0}
          subValue={`${stats?.totalOrders || 0} placed customer orders`}
          icon={ShoppingBag}
          variant="emerald"
          badge="Active"
        />
        <DashboardStatCard
          label="Pending Quotations"
          value={stats?.pendingQuotationsCount || 0}
          subValue="Drafts awaiting client or ops approval"
          icon={FileText}
          variant="amber"
          badge={(stats?.pendingQuotationsCount || 0) > 0 ? "Pending" : undefined}
        />
        <DashboardStatCard
          label="Client Organizations"
          value={stats?.totalOrganizations || 0}
          subValue="Active institutional client accounts"
          icon={Building2}
          variant="teal"
        />
        <DashboardStatCard
          label="Registered Members"
          value={stats?.totalMembers || 0}
          subValue={`${stats?.measurementCompletionRate || 0}% uniform fits completed`}
          icon={Users}
          variant="gold"
        />
      </DashboardCardGroup>

      {/* ── 4. PRODUCTION FLOOR & OPERATIONS STATUS ─────────────────────────── */}
      <DashboardCardGroup
        title="Production Floor & Inventory Status"
        description="Manufacturing job cards, cutting and stitching lots, and raw materials stock."
        icon={Factory}
        targetHref="/factory/job-cards"
        targetLabel="Factory Floor"
        badge="Production & Lots"
        columns="4"
      >
        <DashboardStatCard
          label="Job Cards In Production"
          value={stats?.jobCardsInProduction || 0}
          subValue="Active floor cutting & sewing"
          icon={Factory}
          variant="default"
        />
        <DashboardStatCard
          label="Held / Awaiting Action"
          value={stats?.jobCardsHeld || 0}
          subValue="Material or specification holds"
          icon={AlertTriangle}
          variant="rose"
          badge={(stats?.jobCardsHeld || 0) > 0 ? "Priority" : undefined}
        />
        <DashboardStatCard
          label="Ready for Dispatch"
          value={stats?.jobCardsReady || 0}
          subValue="Finished uniform lots ready to deliver"
          icon={CheckCircle2}
          variant="emerald"
        />
        <DashboardStatCard
          label={'58" Fabric Rolls & Trims'}
          value={stats?.totalInventory || 0}
          subValue={`${stats?.totalFabrics || 0} fabrics · ${stats?.totalTrims || 0} trims`}
          icon={Package}
          variant="amber"
        />
      </DashboardCardGroup>

      {/* ── 5. DELIVERY SCHEDULE REGISTRY & CALENDAR ─────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-xs rounded-[2rem] border border-[#fce4d4] p-6 shadow-xs hover:border-[#CC9448]/30 transition-all duration-300 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#fce4d4]/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#3a525d]/5 text-[#3a525d] flex items-center justify-center shrink-0 border border-[#3a525d]/10">
              <Calendar size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black italic tracking-tight text-[#3a525d]">
                  Delivery Schedule Registry
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
                  Timeline & Dispatch
                </span>
              </div>
              <p className="text-[11px] font-semibold text-zinc-400 mt-0.5 truncate">
                Calendar view of scheduled order delivery deadlines and customer fulfillment dates.
              </p>
            </div>
          </div>

          <span className="px-3.5 py-1.5 rounded-xl bg-white border border-[#fce4d4] text-[10px] font-black uppercase tracking-wider text-[#3a525d] shadow-xs">
            {allQuotations.length} Orders Tracked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-2">
          <div>
            {renderCalendar()}
          </div>
          <div>
            {selectedDateQuotes ? (
              <div className="bg-emerald-50/40 border border-[#bbf7d0] rounded-3xl p-6 space-y-4 shadow-xs">
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
                      className="bg-white border border-zinc-150 rounded-2xl p-4 flex justify-between items-center text-xs shadow-xs transition-all hover:border-[#2d8d9b] hover:shadow-md cursor-pointer active:scale-[0.99] select-none"
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
              <div className="bg-zinc-50/80 border border-[#fce4d4] border-dashed rounded-3xl p-10 text-center text-zinc-400 flex flex-col justify-center items-center min-h-[260px]">
                <Calendar className="text-zinc-300 mb-3" size={32} />
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3a525d]">Select a highlighted date</p>
                <p className="text-[11px] font-medium text-zinc-400 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                  Click on calendar dates marked with green dots to view scheduled delivery orders.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. SIDE DOCK FLOATING TASK DRAWER (APPEARS ON HOVER FROM SIDE) ── */}
      <div
        className={`fixed right-0 top-24 bottom-6 z-50 flex items-start transition-transform duration-300 ease-in-out ${
          isTaskDrawerPinned || isTaskDrawerHovered
            ? 'translate-x-0'
            : 'translate-x-[calc(100%-48px)]'
        }`}
        onMouseEnter={() => setIsTaskDrawerHovered(true)}
        onMouseLeave={() => setIsTaskDrawerHovered(false)}
      >
        {/* Edge Handle Tab */}
        <button
          type="button"
          onClick={() => setIsTaskDrawerPinned(prev => !prev)}
          className={`w-12 py-5 rounded-l-2xl shadow-xl flex flex-col items-center gap-3 transition-colors border-l border-y ${
            isTaskDrawerPinned || isTaskDrawerHovered
              ? 'bg-[#3a525d] text-white border-[#3a525d]'
              : 'bg-[#CC9448] text-white border-[#CC9448] hover:bg-[#b88036]'
          }`}
          title="My Priority Tasks (Hover or Click to toggle)"
        >
          <CheckSquare size={18} strokeWidth={2.5} />
          <span className="[writing-mode:vertical-rl] text-[10px] font-black uppercase tracking-widest rotate-180">
            My Tasks
          </span>
          {pendingCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-[#CC9448] font-black text-[10px] flex items-center justify-center shadow-xs">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Slide-out Drawer Panel */}
        <div className="w-[360px] sm:w-[420px] h-full bg-white/95 backdrop-blur-md border-l border-y border-[#fce4d4] rounded-l-3xl shadow-2xl flex flex-col overflow-hidden">
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#fce4d4] bg-[#fdfbf7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#CC9448]/15 text-[#CC9448] flex items-center justify-center">
                <CheckSquare size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black italic tracking-tight text-[#3a525d]">
                  My Priority Tasks
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  Role: {userRole}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTaskDrawerPinned(prev => !prev)}
                className={`p-1.5 rounded-lg border transition-all ${
                  isTaskDrawerPinned 
                    ? 'bg-[#3a525d] text-white border-[#3a525d]' 
                    : 'bg-white text-zinc-400 border-zinc-200 hover:text-zinc-700'
                }`}
                title={isTaskDrawerPinned ? "Unpin drawer" : "Pin drawer open"}
              >
                {isTaskDrawerPinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTaskDrawerPinned(false);
                  setIsTaskDrawerHovered(false);
                }}
                className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-700 transition-all"
                title="Close drawer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Progress & Filters */}
          <div className="p-4 bg-white border-b border-zinc-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Completion Rate
              </span>
              <span className="text-xs font-black font-mono text-[#CC9448]">
                {completedCount}/{allowedTasks.length} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-[#CC9448] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => setTaskFilter('all')}
                className={`flex-1 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                  taskFilter === 'all' 
                    ? 'bg-[#3a525d] text-white' 
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                All ({allowedTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('pending')}
                className={`flex-1 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                  taskFilter === 'pending' 
                    ? 'bg-[#3a525d] text-white' 
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                Action ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('completed')}
                className={`flex-1 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                  taskFilter === 'completed' 
                    ? 'bg-[#3a525d] text-white' 
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                Done ({completedCount})
              </button>
            </div>
          </div>

          {/* Task List Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-70" />
                <p className="text-xs font-bold text-[#3a525d]">All Caught Up!</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">No tasks match this filter.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isDone = completedTaskIds.includes(task.id);
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDone 
                        ? 'bg-zinc-50/70 border-zinc-200 opacity-65' 
                        : 'bg-white border-[#fce4d4] hover:border-[#CC9448] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className="mt-0.5 shrink-0 transition-transform active:scale-90"
                      >
                        {isDone ? (
                          <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-md border-2 border-zinc-300 hover:border-[#CC9448] bg-white transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                            {task.category}
                          </span>
                          <span className="text-[9px] font-bold font-mono text-[#CC9448]">
                            {task.badge}
                          </span>
                        </div>
                        <h4 className={`text-xs font-bold text-[#3a525d] leading-snug ${isDone ? 'line-through text-zinc-400' : ''}`}>
                          {task.title}
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                          {task.description}
                        </p>
                        <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-end">
                          <Link
                            href={task.actionHref}
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#2d8d9b] hover:text-[#3a525d] group"
                          >
                            <span>{task.actionText}</span>
                            <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
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
                      <p className="text-xs font-black text-[#3a525d] mt-1">
                        {(selectedQuoteDetail.metrics_summary?.quotation_type === 'READYMADE' || selectedQuoteDetail.metrics_summary?.quotation_type === 'STANDARD' || !selectedQuoteDetail.metrics_summary?.quotation_type) && 'Readymades'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'FABRIC' && 'fabrics'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'ACCESSORIES' && 'accessories'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'READYMADE_SET' && 'Readymades ( with departments)'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'FABRIC_SET' && 'fabrics ( with departments)'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'ACCESSORIES_SET' && 'accessories ( with departments)'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'MANUAL' && 'Custom quotation'}
                        {selectedQuoteDetail.metrics_summary?.quotation_type === 'SET_TYPE' && 'Set Type'}
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
                        {formatDate(selectedQuoteDetail.expected_delivery_date)}
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
                        <span>GST Tax ({selectedQuoteDetail.metrics_summary?.gst_percent != null ? selectedQuoteDetail.metrics_summary.gst_percent : 0}%):</span>
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
