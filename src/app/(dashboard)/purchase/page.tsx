'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Building2
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function PurchaseDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const fetchPurchaseData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [venRes, poRes] = await Promise.allSettled([
        api.get('/vendors'),
        api.get('/inventory/purchase-orders')
      ]);

      if (venRes.status === 'fulfilled') setVendors(venRes.value.data || []);
      if (poRes.status === 'fulfilled') setPurchaseOrders(poRes.value.data || []);
    } catch (err) {
      console.error('Failed to load purchase telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseData();
  }, [fetchPurchaseData]);

  // Metrics
  const totalVendors = vendors.length;
  const totalPOs = purchaseOrders.length;
  const openPOs = purchaseOrders.filter((po: any) => ['open', 'pending', 'issued', 'in transit'].includes((po.status || '').toLowerCase())).length;
  const receivedPOs = purchaseOrders.filter((po: any) => ['received', 'completed', 'fulfilled'].includes((po.status || '').toLowerCase())).length;
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (parseFloat(po.total_amount || po.amount) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Purchase & Vendor Hub"
        subtitle="Raw material procurement, mill suppliers, accessory vendors, and purchase orders."
        icon={ShoppingCart}
        badge="Procurement & Sourcing"
        onRefresh={fetchPurchaseData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Vendors Directory */}
      <DashboardCardGroup
        title="Vendors & Supplier Directory"
        description="Textile mills, thread makers, button artisans, and packaging suppliers."
        icon={Users}
        targetHref="/admin/vendors"
        targetLabel="Manage Vendors"
        columns="2"
        badge="Supply Partners"
      >
        <DashboardStatCard
          label="Registered Suppliers"
          value={isLoading ? '—' : totalVendors}
          subValue="Active mills & component suppliers"
          icon={Building2}
          variant="default"
        />
        <DashboardStatCard
          label="Sourcing Categories"
          value={isLoading ? '—' : 'Fabric, Trims, Accessories'}
          subValue="Textiles, buttons, threads & labels"
          icon={ShoppingCart}
          variant="teal"
        />
      </DashboardCardGroup>

      {/* Group 2: Purchase Orders (PO) */}
      <DashboardCardGroup
        title="Purchase Orders (PO)"
        description="Formal supplier purchase contracts issued for bulk fabric and materials."
        icon={FileText}
        targetHref="/admin/purchase-orders"
        targetLabel="View Purchase Orders"
        columns="4"
        badge="Procurement Contracts"
      >
        <DashboardStatCard
          label="Total Purchase Orders"
          value={isLoading ? '—' : totalPOs}
          subValue="All vendor PO commitments"
          icon={FileText}
          variant="default"
        />
        <DashboardStatCard
          label="Committed Value"
          value={isLoading ? '—' : `₹${totalPOValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subValue="Total purchase contract value"
          icon={DollarSign}
          variant="gold"
        />
        <DashboardStatCard
          label="Open / Pending POs"
          value={isLoading ? '—' : openPOs}
          subValue="Awaiting supplier dispatch"
          icon={Clock}
          variant="amber"
          badge="In Progress"
        />
        <DashboardStatCard
          label="Fulfilled & Received"
          value={isLoading ? '—' : receivedPOs}
          subValue="Materials delivered to warehouse"
          icon={CheckCircle2}
          variant="emerald"
        />
      </DashboardCardGroup>
    </div>
  );
}
