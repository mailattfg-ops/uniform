'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Briefcase, 
  Users, 
  ShieldCheck, 
  Ruler, 
  Building2, 
  CheckCircle2, 
  SlidersHorizontal
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function AdminSettingsDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [industries, setIndustries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [measures, setMeasures] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [indRes, empRes, rolRes, scRes, msRes, brRes] = await Promise.allSettled([
        api.get('/industries'),
        api.get('/employees'),
        api.get('/roles'),
        api.get('/size-charts'),
        api.get('/measures'),
        api.get('/branches')
      ]);

      if (indRes.status === 'fulfilled') setIndustries(indRes.value.data || []);
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data || []);
      if (rolRes.status === 'fulfilled') setRoles(rolRes.value.data || []);
      if (scRes.status === 'fulfilled') setSizeCharts(scRes.value.data || []);
      if (msRes.status === 'fulfilled') setMeasures(msRes.value.data || []);
      if (brRes.status === 'fulfilled') setBranches(brRes.value.data || []);
    } catch (err) {
      console.error('Failed to load admin telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Admin Settings & Controls Hub"
        subtitle="Staff identity directory, role-based access control, industry taxonomy, US size charts, and retail branch management."
        icon={Settings}
        badge="System Administration"
        onRefresh={fetchAdminData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Organization & Staff Configuration */}
      <DashboardCardGroup
        title="Staff & Access Governance"
        description="Employee directories, corporate sales representatives, and security permissions."
        icon={Users}
        targetHref="/admin/employees"
        targetLabel="Manage Staff Directory"
        columns="3"
        badge="Governance"
      >
        <DashboardStatCard
          label="Total Staff Members"
          value={isLoading ? '—' : employees.length}
          subValue="Active operational employees"
          icon={Users}
          variant="default"
        />
        <DashboardStatCard
          label="Defined Roles"
          value={isLoading ? '—' : roles.length}
          subValue="Access permission tiers"
          icon={ShieldCheck}
          variant="gold"
        />
        <DashboardStatCard
          label="Industry Sectors"
          value={isLoading ? '—' : industries.length}
          subValue="Client business verticals"
          icon={Briefcase}
          variant="teal"
        />
      </DashboardCardGroup>

      {/* Group 2: Sizing Systems & Measurement Setup */}
      <DashboardCardGroup
        title="Sizing Standards & Measurement Architecture"
        description="Standard US sizing tables, bespoke metric configurations, and tailoring sign-off gates."
        icon={Ruler}
        targetHref="/admin/size-charts"
        targetLabel="US Size Charts Setup"
        columns="3"
        badge="Measurement Standards"
      >
        <DashboardStatCard
          label="US Size Charts"
          value={isLoading ? '—' : sizeCharts.length}
          subValue="Scaled size charts configured"
          icon={Ruler}
          variant="purple"
        />
        <DashboardStatCard
          label="Measurement Parameters"
          value={isLoading ? '—' : measures.length}
          subValue="Body measure points configured"
          icon={SlidersHorizontal}
          variant="indigo"
        />
        <DashboardStatCard
          label="Measurement Approvals"
          value={isLoading ? '—' : 'Quality Gate'}
          subValue="Master tailor approval rules"
          icon={CheckCircle2}
          variant="emerald"
        />
      </DashboardCardGroup>

      {/* Group 3: Multi-Branch & Distribution Network */}
      <DashboardCardGroup
        title="Branches & Outlets Network"
        description="Physical branch locations, regional outlet stores, and cashier terminal setup."
        icon={Building2}
        targetHref="/branches/outlets"
        targetLabel="Manage Outlets & Branches"
        columns="2"
        badge="Retail Outlets"
      >
        <DashboardStatCard
          label="Registered Outlets"
          value={isLoading ? '—' : branches.length}
          subValue="Operational outlets & stock points"
          icon={Building2}
          variant="default"
        />
        <DashboardStatCard
          label="Branch Network Status"
          value={isLoading ? '—' : 'Active & Synced'}
          subValue="Real-time multi-branch inventory linked"
          icon={CheckCircle2}
          variant="teal"
        />
      </DashboardCardGroup>
    </div>
  );
}
