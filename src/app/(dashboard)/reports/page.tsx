'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  History, 
  TrendingUp, 
  Activity, 
  Eye
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function ReportsDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const auditRes = await api.get('/audit').catch(() => api.get('/audit-logs'));
      setAuditLogs(auditRes.data || []);
    } catch (err) {
      console.error('Failed to load reports telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Metrics
  const totalAuditEvents = auditLogs.length;
  const recentEvents = auditLogs.slice(0, 24).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Reports & Audit Intelligence Hub"
        subtitle="Manufacturing productivity analytics, factory line efficiency, system security telemetry, and user audit trails."
        icon={BarChart3}
        badge="Analytics & Security"
        onRefresh={fetchReportsData}
        isRefreshing={isLoading}
      />

      {/* Group 1: SAM & Operations Reports */}
      <DashboardCardGroup
        title="Operations & Production Telemetry"
        description="Line efficiency, standard hours earned, operator cost performance, and dispatch volume."
        icon={BarChart3}
        targetHref="/sam-management/reports"
        targetLabel="Open Operations Reports"
        columns="3"
        badge="Industrial Analytics"
      >
        <DashboardStatCard
          label="Production Efficiency"
          value={isLoading ? '—' : '91.8%'}
          subValue="Earned hours vs clock hours"
          icon={TrendingUp}
          variant="emerald"
        />
        <DashboardStatCard
          label="SAM Utilization"
          value={isLoading ? '—' : '4,820 min'}
          subValue="Standard minutes produced this cycle"
          icon={Activity}
          variant="teal"
        />
        <DashboardStatCard
          label="On-Time Delivery Rate"
          value={isLoading ? '—' : '98.2%'}
          subValue="Institutional orders dispatched on schedule"
          icon={ShieldCheck}
          variant="gold"
        />
      </DashboardCardGroup>

      {/* Group 2: Audit Trail Logs */}
      <DashboardCardGroup
        title="System Security & Audit Trail Logs"
        description="Immutable logs of user authentications, price overrides, stock deletions, and permission changes."
        icon={History}
        targetHref="/admin/audit"
        targetLabel="View Audit Trail Logs"
        columns="2"
        badge="Compliance & Traceability"
      >
        <DashboardStatCard
          label="Total Logged Events"
          value={isLoading ? '—' : totalAuditEvents}
          subValue="All recorded administrative security events"
          icon={History}
          variant="default"
        />
        <DashboardStatCard
          label="Active Session Logs"
          value={isLoading ? '—' : `${recentEvents} Recent Actions`}
          subValue="Real-time staff interactions logged"
          icon={Eye}
          variant="indigo"
        />
      </DashboardCardGroup>
    </div>
  );
}
