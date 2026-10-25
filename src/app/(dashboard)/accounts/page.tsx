'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Scale, 
  Wallet, 
  Banknote
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function AccountsDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);

  const fetchAccountsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invRes, payRes, compRes] = await Promise.allSettled([
        api.get('/invoices'),
        api.get('/payments'),
        api.get('/company-settings')
      ]);

      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data || []);
      if (payRes.status === 'fulfilled') setPayments(payRes.value.data || []);
      if (compRes.status === 'fulfilled') setCompanyData(compRes.value.data || null);
    } catch (err) {
      console.error('Failed to load accounts telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountsData();
  }, [fetchAccountsData]);

  // Invoice calculations
  const totalInvoicesCount = invoices.length;
  const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const paidInvoicesCount = invoices.filter(inv => (inv.payment_status || '').toLowerCase() === 'paid').length;
  const pendingInvoicesCount = invoices.filter(inv => ['pending', 'partially paid', 'unpaid'].includes((inv.payment_status || '').toLowerCase())).length;
  const totalTaxAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.tax_amount) || 0), 0);

  // Payment calculations
  const totalPaymentsCount = payments.length;
  const totalCollectedAmount = payments.reduce((sum, pay) => sum + (parseFloat(pay.amount) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Accounts & Finance Hub"
        subtitle="Customer sales invoicing, counter sales receipts, credit payments ledger, and corporate banking profile."
        icon={Receipt}
        badge="Financial Operations"
        onRefresh={fetchAccountsData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Customer Invoices */}
      <DashboardCardGroup
        title="Customer Invoices & Counter Sales"
        description="Official billing documents generated with standard GST and retail barcode registers."
        icon={Receipt}
        targetHref="/billing/invoices"
        targetLabel="Go to Customer Invoices"
        columns="4"
        badge="Sales Billing"
      >
        <DashboardStatCard
          label="Total Invoices"
          value={isLoading ? '—' : totalInvoicesCount}
          subValue="Registered tax sales invoices"
          icon={Receipt}
          variant="default"
        />
        <DashboardStatCard
          label="Total Invoiced Value"
          value={isLoading ? '—' : `₹${totalInvoicedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subValue="Gross invoiced counter sales"
          icon={Wallet}
          variant="teal"
        />
        <DashboardStatCard
          label="Settled Invoices"
          value={isLoading ? '—' : paidInvoicesCount}
          subValue="Invoices paid in full"
          icon={CheckCircle2}
          variant="emerald"
        />
        <DashboardStatCard
          label="Pending Collections"
          value={isLoading ? '—' : pendingInvoicesCount}
          subValue="Unpaid or partial balance"
          icon={Clock}
          variant="rose"
        />
      </DashboardCardGroup>

      {/* Group 2: Customer Payments & Collections */}
      <DashboardCardGroup
        title="Customer Receipts & Payments"
        description="Advance deposits, milestone payments, and counter collections."
        icon={Banknote}
        targetHref="/marketing/initial-payment"
        targetLabel="Go to Payments Register"
        columns="3"
        badge="Collections"
      >
        <DashboardStatCard
          label="Total Receipts"
          value={isLoading ? '—' : totalPaymentsCount}
          subValue="Processed receipt transactions"
          icon={Banknote}
          variant="default"
        />
        <DashboardStatCard
          label="Total Collected"
          value={isLoading ? '—' : `₹${totalCollectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subValue="Verified funds received in bank"
          icon={CreditCard}
          variant="emerald"
        />
        <DashboardStatCard
          label="Tax Collected (GST)"
          value={isLoading ? '—' : `₹${totalTaxAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subValue="Total tax levied across bills"
          icon={Scale}
          variant="indigo"
        />
      </DashboardCardGroup>

      {/* Group 3: Company Profile & Banking */}
      <DashboardCardGroup
        title="Company Bank & Profile"
        description="Official corporate credentials, GSTIN, registered head office, and authorized banking accounts."
        icon={Building2}
        targetHref="/admin/company"
        targetLabel="Manage Company Profile"
        columns="2"
        badge="Banking & Compliance"
      >
        <DashboardStatCard
          label="Company Registration"
          value={isLoading ? '—' : (companyData?.name || 'Forma Apparels Pvt Ltd')}
          subValue={`GSTIN: ${companyData?.gstin || '29AAAAA0000A1Z5'}`}
          icon={Building2}
          variant="gold"
        />
        <DashboardStatCard
          label="Corporate Bank Accounts"
          value={isLoading ? '—' : (companyData?.bank_accounts?.length || 'Configured')}
          subValue="Primary branch payout & collections"
          icon={CreditCard}
          variant="teal"
        />
      </DashboardCardGroup>
    </div>
  );
}
