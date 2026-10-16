'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Target, 
  Building2, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  Flame, 
  CheckCircle2, 
  FileText, 
  TrendingUp,
  XCircle,
  Snowflake
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function CRMDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Data states
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);

  const fetchCRMData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadsRes, orgsRes, quotesRes] = await Promise.allSettled([
        api.get('/leads'),
        api.get('/organizations'),
        api.get('/quotations')
      ]);

      if (leadsRes.status === 'fulfilled') {
        setLeads(leadsRes.value.data || []);
      }
      if (orgsRes.status === 'fulfilled') {
        setCustomers(orgsRes.value.data || []);
      }
      if (quotesRes.status === 'fulfilled') {
        setQuotations(quotesRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load CRM telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCRMData();
  }, [fetchCRMData]);

  // 1. Leads Analytics (Calculated accurately across 11 stages without double counting)
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === 'Hot Leads' || l.status === 'Qualified' || l.status === 'Proposal Sent').length;
  const coldLeads = leads.filter(l => !!l.is_cold).length;
  const successLeads = leads.filter(l => l.status === 'SO Converted Deals' || l.status === 'Deals' || l.status === 'Converted').length;
  const inProgressLeads = leads.filter(l => 
    (l.status === 'Follow-ups' && !l.is_cold) || 
    l.status === 'Meetings' || 
    l.status === 'Sales Leads' || 
    l.status === 'New Leads' || 
    l.status === 'Open Leads' || 
    l.status === 'Feeds' || 
    l.status === 'New' || 
    l.status === 'Contacted'
  ).length;

  // 2. Customers & Receivables Financials (Calculated identically to Customers page)
  const totalCustomers = customers.length;
  
  // Compute receivables & dues
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);

  let totalReceivables = 0;
  let upcomingDues = 0;
  let duesToday = 0;
  let overdueDues = 0;

  customers.forEach(c => {
    const rec = Number(c.receivables || 0);
    if (rec > 0) {
      totalReceivables += rec;
      // If customer has credit period / due date
      const createdAt = c.created_at ? new Date(c.created_at) : new Date();
      const creditDays = Number(c.credit_period_days || 30);
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + creditDays);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        overdueDues += rec;
      } else if (dueDate.getTime() === today.getTime()) {
        duesToday += rec;
      } else if (dueDate <= next7Days) {
        upcomingDues += rec;
      }
    }
  });

  // 3. Quotations Analytics
  const totalQuotations = quotations.length;
  const totalQuoteValue = quotations.reduce((acc, q) => acc + (parseFloat(q.final_quote_value) || 0), 0);
  const approvedQuotations = quotations.filter(q => ['approved', 'accepted', 'won', 'active'].includes((q.status || '').toLowerCase()) || q.payment_status === 'Paid').length;
  const pendingQuotations = quotations.filter(q => ['pending', 'in review', 'submitted to ops', 'draft'].includes((q.status || '').toLowerCase()) || !q.status).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="CRM Dashboard"
        subtitle="Live pipeline tracking, customer receivables, account credit dues, and commercial quotations."
        icon={Users}
        badge="Client Relationship Management"
        onRefresh={fetchCRMData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Leads */}
      <DashboardCardGroup
        title="Leads"
        description="Prospect conversion funnel, high-priority prospects, and staff outreach assignments."
        icon={Target}
        targetHref="/customers/leads"
        targetLabel="Go to Leads"
        columns="5"
        badge="Outreach & Prospecting"
      >
        <DashboardStatCard
          label="Total Leads"
          value={isLoading ? '—' : totalLeads}
          icon={Users}
          variant="default"
        />
        <DashboardStatCard
          label="Hot Leads"
          value={isLoading ? '—' : hotLeads}
          icon={Flame}
          variant="amber"
        />
        <DashboardStatCard
          label="Cold Leads"
          value={isLoading ? '—' : coldLeads}
          icon={Snowflake}
          variant="rose"
        />
        <DashboardStatCard
          label="In Follow-Up"
          value={isLoading ? '—' : inProgressLeads}
          icon={Clock}
          variant="teal"
        />
        <DashboardStatCard
          label="Converted Deals"
          value={isLoading ? '—' : successLeads}
          icon={CheckCircle2}
          variant="emerald"
        />
      </DashboardCardGroup>

      {/* Group 2: Customers */}
      <DashboardCardGroup
        title="Customers"
        description="Directory of registered institutional client organizations and live ledger debt balances."
        icon={Building2}
        targetHref="/customers"
        targetLabel="Go to Customers"
        columns="5"
        badge="Accounts & Ledger"
      >
        <DashboardStatCard
          label="Total Customers"
          value={isLoading ? '—' : totalCustomers}
          icon={Building2}
          variant="default"
        />
        <DashboardStatCard
          label="Total Receivables"
          value={isLoading ? '—' : `₹${totalReceivables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={CreditCard}
          variant="teal"
        />
        <DashboardStatCard
          label="Upcoming Dues"
          value={isLoading ? '—' : `₹${upcomingDues.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={Clock}
          variant="blue"
        />
        <DashboardStatCard
          label="Dues Today"
          value={isLoading ? '—' : `₹${duesToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={AlertCircle}
          variant="amber"
        />
        <DashboardStatCard
          label="Overdue Receivables"
          value={isLoading ? '—' : `₹${overdueDues.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={AlertCircle}
          variant="rose"
        />
      </DashboardCardGroup>

      {/* Group 3: Quotations */}
      <DashboardCardGroup
        title="Quotations"
        description="Sales Quotations for new orders."
        icon={FileText}
        targetHref="/marketing/quotations"
        targetLabel="Go to Quotations"
        columns="4"
        badge="Sales Proposals"
      >
        <DashboardStatCard
          label="Total Quotations"
          value={isLoading ? '—' : totalQuotations}
          icon={FileText}
          variant="default"
        />
        <DashboardStatCard
          label="Pipeline Value"
          value={isLoading ? '—' : `₹${totalQuoteValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          variant="gold"
        />
        <DashboardStatCard
          label="Approved / Won"
          value={isLoading ? '—' : approvedQuotations}
          icon={CheckCircle2}
          variant="emerald"
        />
        <DashboardStatCard
          label="Pending Review"
          value={isLoading ? '—' : pendingQuotations}
          icon={Clock}
          variant="purple"
        />
      </DashboardCardGroup>
    </div>
  );
}
