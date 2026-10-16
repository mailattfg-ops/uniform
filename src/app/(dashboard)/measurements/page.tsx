'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Ruler, 
  History, 
  FileSpreadsheet, 
  Ticket, 
  CheckCircle2, 
  Clock, 
  Users, 
  Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function MeasurementsDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);

  const fetchMeasurementsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [measRes, tplRes, tokRes] = await Promise.allSettled([
        api.get('/measurements'),
        api.get('/templates'),
        api.get('/measurement-tokens')
      ]);

      if (measRes.status === 'fulfilled') setMeasurements(measRes.value.data || []);
      if (tplRes.status === 'fulfilled') setTemplates(tplRes.value.data || []);
      if (tokRes.status === 'fulfilled') setTokens(tokRes.value.data || []);
    } catch (err) {
      console.error('Failed to load measurements telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeasurementsData();
  }, [fetchMeasurementsData]);

  // Metrics
  const totalMeasurements = measurements.length;
  const approvedMeasurements = measurements.filter((m: any) => ['approved', 'completed', 'valid'].includes((m.status || '').toLowerCase())).length;
  const pendingApprovals = measurements.filter((m: any) => ['pending', 'draft', 'in review'].includes((m.status || '').toLowerCase())).length;

  const totalTemplates = templates.length;
  const totalTokens = tokens.length;
  const activeTokens = tokens.filter((t: any) => !t.is_used && (!t.status || t.status === 'active')).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Measurements & Tailoring Hub"
        subtitle="Individual student & executive bespoke tailoring records, fitting tokens, and industry uniform templates."
        icon={Ruler}
        badge="Bespoke Sizing & Patterns"
        onRefresh={fetchMeasurementsData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Record Measurements & Tailoring Entries */}
      <DashboardCardGroup
        title="Measurement Records & Fitting History"
        description="Body metric specifications, suggested sizing algorithms, and tailoring session histories."
        icon={Ruler}
        targetHref="/measurements/entry"
        targetLabel="Record New Measurement"
        columns="4"
        badge="Tailoring Logs"
      >
        <DashboardStatCard
          label="Total Measurements"
          value={isLoading ? '—' : totalMeasurements}
          subValue="All student & staff profiles taken"
          icon={Users}
          variant="default"
        />
        <DashboardStatCard
          label="Approved Measurements"
          value={isLoading ? '—' : approvedMeasurements}
          subValue="Validated & locked for production"
          icon={CheckCircle2}
          variant="emerald"
        />
        <DashboardStatCard
          label="Pending Review"
          value={isLoading ? '—' : pendingApprovals}
          subValue="Awaiting master tailor approval"
          icon={Clock}
          variant="amber"
        />
        <DashboardStatCard
          label="History Logs"
          value={isLoading ? '—' : totalMeasurements}
          subValue="Archived measurement revisions"
          icon={History}
          variant="teal"
        />
      </DashboardCardGroup>

      {/* Group 2: Industry Templates & Fitting Tokens */}
      <DashboardCardGroup
        title="Uniform Templates & Digital Fitting Tokens"
        description="Standardized school/corporate uniform specifications and contactless campus measurement tokens."
        icon={FileSpreadsheet}
        targetHref="/measurements/templates"
        targetLabel="Manage Uniform Templates"
        columns="3"
        badge="Specification Templates"
      >
        <DashboardStatCard
          label="Industry Templates"
          value={isLoading ? '—' : totalTemplates}
          subValue="Configured uniform dress guidelines"
          icon={FileSpreadsheet}
          variant="indigo"
        />
        <DashboardStatCard
          label="Total Fitting Tokens"
          value={isLoading ? '—' : totalTokens}
          subValue="Digital student QR fitting tokens"
          icon={Ticket}
          variant="gold"
        />
        <DashboardStatCard
          label="Active Tokens Ready"
          value={isLoading ? '—' : activeTokens}
          subValue="Tokens ready for on-site measurement"
          icon={Sparkles}
          variant="teal"
        />
      </DashboardCardGroup>
    </div>
  );
}
