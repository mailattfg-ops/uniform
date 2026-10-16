'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Truck, 
  FileCheck, 
  Send,
  PackageCheck
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function SalesDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryChallans, setDeliveryChallans] = useState<any[]>([]);

  const fetchSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordRes, dcRes] = await Promise.allSettled([
        api.get('/orders'),
        api.get('/delivery-challans')
      ]);

      if (ordRes.status === 'fulfilled') setOrders(ordRes.value.data || []);
      if (dcRes.status === 'fulfilled') setDeliveryChallans(dcRes.value.data || []);
    } catch (err) {
      console.error('Failed to load sales telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Order metrics
  const totalOrders = orders.length;
  let activeOrders = 0;
  let pendingOpsOrders = 0;
  let completedOrders = 0;
  let heldOrders = 0;

  orders.forEach((o: any) => {
    const st = (o.status || '').toLowerCase();
    if (['corporate accepted', 'in production', 'placed', 'approved', 'active'].includes(st)) {
      activeOrders++;
    } else if (['approval pending', 'corporate hold', 'pending', 'submitted to ops'].includes(st)) {
      pendingOpsOrders++;
    } else if (['held at branch', 'held', 'cancelled'].includes(st)) {
      heldOrders++;
    } else if (['delivered', 'completed'].includes(st)) {
      completedOrders++;
    }
  });

  // DC metrics
  const totalChallans = deliveryChallans.length;
  const deliveredChallans = deliveryChallans.filter((dc: any) => ['delivered', 'received'].includes((dc.status || '').toLowerCase())).length;
  const dispatchedChallans = deliveryChallans.filter((dc: any) => ['dispatched', 'in transit'].includes((dc.status || '').toLowerCase())).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Sales & Operations Hub"
        subtitle="Customer sales order placements, technical operations review gates, and delivery challans."
        icon={ShoppingBag}
        badge="Commercial Orders & Dispatch"
        onRefresh={fetchSalesData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Sales Orders Pipeline */}
      <DashboardCardGroup
        title="Sales Orders"
        description="Confirmed purchase commitments placed from approved client quotations."
        icon={ShoppingBag}
        targetHref="/marketing/order-placement"
        targetLabel="Manage Sales Orders"
        columns="4"
        badge="Order Processing"
      >
        <DashboardStatCard
          label="Total Orders"
          value={isLoading ? '—' : totalOrders}
          subValue="All placed commercial orders"
          icon={ShoppingBag}
          variant="default"
        />
        <DashboardStatCard
          label="In Production / Active"
          value={isLoading ? '—' : activeOrders}
          subValue="Approved & on factory floor"
          icon={CheckCircle2}
          variant="emerald"
        />
        <DashboardStatCard
          label="Awaiting Operations"
          value={isLoading ? '—' : pendingOpsOrders}
          subValue="Under technical & BM review"
          icon={Clock}
          variant="amber"
          badge="Action Required"
        />
        <DashboardStatCard
          label="Delivered & Fulfilled"
          value={isLoading ? '—' : completedOrders}
          subValue="Orders completed & delivered"
          icon={PackageCheck}
          variant="teal"
        />
      </DashboardCardGroup>

      {/* Group 2: Operations Review & Approval */}
      <DashboardCardGroup
        title="Operations Review Gate"
        description="Feasibility verification, raw material reservation checks, and production readiness."
        icon={FileCheck}
        targetHref="/marketing/operation-team"
        targetLabel="Operations Review Queue"
        columns="2"
        badge="Technical Sign-Off"
      >
        <DashboardStatCard
          label="Pending Technical Review"
          value={isLoading ? '—' : pendingOpsOrders}
          subValue="Quotations awaiting BM/Ops validation"
          icon={Clock}
          variant="amber"
        />
        <DashboardStatCard
          label="Production Releases"
          value={isLoading ? '—' : activeOrders}
          subValue="Cleared for factory floor job card issue"
          icon={CheckCircle2}
          variant="emerald"
        />
      </DashboardCardGroup>

      {/* Group 3: Delivery Challans (DC) */}
      <DashboardCardGroup
        title="Delivery Challans (DC)"
        description="Physical dispatch and transit documentation for uniforms delivered to client institutions."
        icon={Truck}
        targetHref="/billing/delivery-challans"
        targetLabel="View Delivery Challans"
        columns="3"
        badge="Logistics & Dispatch"
      >
        <DashboardStatCard
          label="Total Challans Issued"
          value={isLoading ? '—' : totalChallans}
          subValue="Official dispatch documents"
          icon={Truck}
          variant="default"
        />
        <DashboardStatCard
          label="In Transit / Dispatched"
          value={isLoading ? '—' : dispatchedChallans}
          subValue="Packages en route to institution"
          icon={Send}
          variant="indigo"
        />
        <DashboardStatCard
          label="Delivered & Acknowledged"
          value={isLoading ? '—' : deliveredChallans}
          subValue="Client delivery confirmed"
          icon={CheckCircle2}
          variant="emerald"
        />
      </DashboardCardGroup>
    </div>
  );
}
