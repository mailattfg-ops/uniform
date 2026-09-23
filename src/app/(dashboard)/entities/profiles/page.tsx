'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Ruler, 
  Mail, 
  Phone, 
  ChevronRight, 
  Building2, 
  Calendar, 
  User, 
  History, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Sparkles, 
  ArrowRight, 
  Loader2,
  Tag,
  ArrowLeft
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function StudentProfilesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
        } catch (e) {
          console.error('Failed to parse user', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const [membersRes, measRes] = await Promise.all([
          api.get('/members').catch(() => ({ data: [] })),
          api.get('/measurements').catch(() => ({ data: [] }))
        ]);

        if (active) {
          const list = membersRes.data || [];
          if (list.length > 0) {
            setMemberProfile(list[0]);
          }
          setMeasurements(measRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const roleLower = (currentUser?.role || '').toLowerCase();
  const isClientEntity = Boolean(
    currentUser?.memberId || ['entity', 'student', 'member'].includes(roleLower)
  );

  const fullName = memberProfile?.full_name || currentUser?.fullName || 'Student Member';
  const admissionNo = memberProfile?.admission_no || currentUser?.admissionNo || '';
  const orgName = memberProfile?.organizations?.name || currentUser?.organizationName || 'Institution';
  const deptName = memberProfile?.departments?.name || currentUser?.departmentName || 'Standard';
  const gender = memberProfile?.gender || currentUser?.gender || '';
  const joinDate = memberProfile?.created_at
    ? new Date(memberProfile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Active';

  const latestMeas = measurements.length > 0 ? measurements[0] : null;
  const suggestedSize = latestMeas?.suggested_size || 'Standard';
  const dynamicData = latestMeas?.dynamic_data && typeof latestMeas.dynamic_data === 'object'
    ? latestMeas.dynamic_data
    : {};
  const isApproved = latestMeas?.status?.toLowerCase() === 'approved';

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center bg-[#F5F4F2]">
        <Loader2 className="animate-spin text-[#CC9448]" size={42} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-700 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-[#CC9448] transition-colors mb-1"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-black text-[#030303] tracking-tight">
            {isClientEntity ? 'My Member Profile & ID' : 'Student Registry Profile'}
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Official uniform registration records, institutional credentials, and fitting biometrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
            className="px-5 py-2.5 rounded-2xl bg-[#030303] hover:bg-[#CC9448] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-black/10 active:scale-95"
          >
            <Printer size={15} />
            <span>Print Student Pass</span>
          </button>
        </div>
      </div>

      {/* Main Student Pass Card */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl overflow-hidden">
        {/* Pass Header Banner */}
        <div className="bg-[#030303] p-8 md:p-10 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #CC9448 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar Initial */}
              <div className="w-20 h-20 rounded-3xl bg-white/10 border-2 border-[#CC9448] flex items-center justify-center text-2xl font-black text-[#CC9448] shadow-inner shrink-0">
                {fullName.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#CC9448]/20 text-[#CC9448] border border-[#CC9448]/30">
                    Verified Member
                  </span>
                  {admissionNo && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/10 text-white/80">
                      ID #{admissionNo}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{fullName}</h2>
                <p className="text-xs text-white/60 font-medium">
                  {orgName} {deptName ? `• ${deptName}` : ''}
                </p>
              </div>
            </div>

            {/* Sizing Badge Pill */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[180px] text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#CC9448]">Assigned Uniform Size</p>
              <p className="text-2xl font-black text-white mt-0.5">{suggestedSize}</p>
              <p className="text-[10px] text-white/50 font-medium">
                {isApproved ? 'Fitting Verified' : 'In Verification'}
              </p>
            </div>
          </div>
        </div>

        {/* Pass Details Grid */}
        <div className="p-8 md:p-10 space-y-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#030303] mb-4">
              Institutional & Enrollment Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Building2 size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Institution</span>
                </div>
                <p className="text-sm font-black text-[#030303] truncate" title={orgName}>{orgName}</p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Users size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Class / Department</span>
                </div>
                <p className="text-sm font-black text-[#030303]">{deptName || 'Standard'}</p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Tag size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Gender / Cut</span>
                </div>
                <p className="text-sm font-black text-[#030303] capitalize">{gender || 'Standard Cut'}</p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Calendar size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Registration Date</span>
                </div>
                <p className="text-sm font-black text-[#030303]">{joinDate}</p>
              </div>
            </div>
          </div>

          {/* Biometrics & Measurement Specification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#030303]">
                Captured Biometric Specifications
              </h3>
              <Link
                href="/measurements/history"
                className="text-xs font-bold text-[#CC9448] hover:underline flex items-center gap-1"
              >
                <span>Full Archive</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {Object.keys(dynamicData).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(dynamicData).map(([key, val]) => (
                  <div key={key} className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{key}</p>
                    <p className="text-xl font-black text-[#030303] mt-1">
                      {String(val)} <span className="text-[10px] text-zinc-400 font-normal">in</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-center space-y-2">
                <Ruler size={24} className="text-[#CC9448] mx-auto opacity-70" />
                <p className="text-xs font-bold text-zinc-600">No measurements logged for this student yet.</p>
                <p className="text-[11px] text-zinc-400">Measurements taken during fitting sessions will appear here.</p>
              </div>
            )}
          </div>

          {/* Fitting Notes & Status Summary */}
          {latestMeas?.notes && (
            <div className="bg-[#FAF7F2] border border-[#CC9448]/20 rounded-2xl p-5 flex items-start gap-3.5">
              <Sparkles size={18} className="text-[#CC9448] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#CC9448]">Tailoring & Fitting Remarks</p>
                <p className="text-xs text-zinc-700 font-medium mt-1 leading-relaxed">{latestMeas.notes}</p>
              </div>
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-zinc-500 hover:text-[#030303] transition-colors"
            >
              ← Return to Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/measurements/history"
                className="px-5 py-2.5 rounded-xl bg-[#CC9448] hover:bg-[#b88036] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#CC9448]/20"
              >
                Measurement Records
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
