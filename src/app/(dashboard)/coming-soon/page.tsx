'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { 
  Sparkles, 
  ArrowLeft, 
  Layers, 
  Clock, 
  ShieldCheck, 
  BellRing,
  Workflow,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const feature = searchParams.get('feature') || 'Upcoming Capability';
  const moduleName = searchParams.get('module') || 'Core System';

  // Feature specific roadmap highlights
  const roadmapPoints = [
    {
      title: 'Automated Lifecycle Workflows',
      desc: 'Seamless integration with existing quotations, orders, and branch operations.',
      badge: 'In Progress'
    },
    {
      title: 'Granular Role Permissions',
      desc: 'RBAC guardrails with audit trail verification and manager approval gates.',
      badge: 'Architecture Ready'
    },
    {
      title: 'Real-time Analytics & Ledger',
      desc: 'Live financial summaries and exportable GST-compliant accounting records.',
      badge: 'Q4 2026'
    }
  ];

  return (
    <div className="min-h-[82vh] flex flex-col items-center justify-center p-4 md:p-8">
      {/* Top Banner / Badge */}
      <div className="w-full max-w-3xl">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-xl overflow-hidden relative">
          {/* Subtle Top Decorative Gradient Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-[#1B365D] via-[#CC9448] to-[#1B365D]" />

          <div className="p-8 md:p-12 text-center">
            {/* Module pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B365D]/10 text-[#1B365D] font-bold text-xs uppercase tracking-wider mb-6 border border-[#1B365D]/20">
              <Layers className="w-3.5 h-3.5 text-[#CC9448]" />
              <span>{moduleName} Module</span>
            </div>

            {/* Main Icon Glow */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#1B365D] to-[#2a4d7d] flex items-center justify-center text-[#CC9448] shadow-lg shadow-[#1B365D]/20 mb-6">
              <Sparkles className="w-10 h-10 animate-pulse text-[#E5B869]" />
            </div>

            {/* Feature Name & Header */}
            <h1 className="text-3xl md:text-4xl font-black text-[#1e293b] tracking-tight mb-3">
              {feature}
            </h1>
            <p className="text-base md:text-lg text-[#64748b] max-w-xl mx-auto mb-8 font-medium">
              This module feature is actively being engineered to meet enterprise standards. It will be available in the upcoming release.
            </p>

            {/* Status Timeline / Key Highlights Card */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6 text-left mb-8 max-w-2xl mx-auto shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1B365D]">
                  <Workflow className="w-4 h-4 text-[#CC9448]" />
                  <span>Module Engineering Roadmap</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Scheduled Release
                </span>
              </div>

              <div className="space-y-4">
                {roadmapPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full p-0.5 bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#1e293b]">{pt.title}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-[#cbd5e1] text-[#475569]">
                          {pt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] mt-0.5">{pt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex items-center gap-2 border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9] px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>

              <Link href="/dashboard">
                <Button className="flex items-center gap-2 bg-[#1B365D] hover:bg-[#152a48] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                  <ShieldCheck className="w-4 h-4 text-[#CC9448]" />
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-8 py-3.5 text-center text-xs font-medium text-[#64748b] flex items-center justify-center gap-2">
            <BellRing className="w-3.5 h-3.5 text-[#CC9448]" />
            <span>Need priority access or early beta deployment for this feature? Contact your system administrator.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B365D]"></div>
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  );
}
