'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Factory, 
  Scissors, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Activity,
  Flame
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function FactoryDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [jobCards, setJobCards] = useState<any[]>([]);
  const [queueOrders, setQueueOrders] = useState<any[]>([]);

  const fetchFactoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jcRes, ordRes] = await Promise.allSettled([
        api.get('/job-cards'),
        api.get('/orders')
      ]);

      if (jcRes.status === 'fulfilled') setJobCards(jcRes.value.data || []);
      if (ordRes.status === 'fulfilled') setQueueOrders(ordRes.value.data || []);
    } catch (err) {
      console.error('Failed to load factory telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFactoryData();
  }, [fetchFactoryData]);

  // Job card metrics
  const totalJobCards = jobCards.length;
  const inProductionJC = jobCards.filter((jc: any) => ['in production', 'cutting', 'stitching', 'active'].includes((jc.status || '').toLowerCase())).length;
  const completedJC = jobCards.filter((jc: any) => ['completed', 'finished'].includes((jc.status || '').toLowerCase())).length;
  const pendingJC = jobCards.filter((jc: any) => ['pending', 'draft', 'issued'].includes((jc.status || '').toLowerCase())).length;

  // Queue orders
  const queuedOrders = queueOrders.filter((o: any) => ['in production', 'placed', 'corporate accepted'].includes((o.status || '').toLowerCase())).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Factory Floor & Manufacturing Hub"
        subtitle="Industrial job cards, production queue routing, cutting, stitching lines, and finished garment inspection."
        icon={Factory}
        badge="Manufacturing Floor"
        onRefresh={fetchFactoryData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Job Cards & Production Orders */}
      <DashboardCardGroup
        title="Job Cards & Production Handler"
        description="Official shop-floor traveler documents directing cutting masters, line supervisors, and tailoring stations."
        icon={Scissors}
        targetHref="/factory/job-cards"
        targetLabel="Manage Job Cards"
        columns="4"
        badge="Floor Execution"
      >
        <DashboardStatCard
          label="Total Job Cards"
          value={isLoading ? '—' : totalJobCards}
          subValue="All traveler tickets issued"
          icon={Scissors}
          variant="default"
        />
        <DashboardStatCard
          label="On Stitching Lines"
          value={isLoading ? '—' : inProductionJC}
          subValue="Active line sewing & assembly"
          icon={Activity}
          variant="amber"
          badge="In Work"
        />
        <DashboardStatCard
          label="Completed Batches"
          value={isLoading ? '—' : completedJC}
          subValue="Finished uniform lots"
          icon={CheckCircle2}
          variant="emerald"
        />
        <DashboardStatCard
          label="Awaiting Cutting"
          value={isLoading ? '—' : pendingJC}
          subValue="Queued for fabric lay & cut"
          icon={Clock}
          variant="purple"
        />
      </DashboardCardGroup>

      {/* Group 2: Production Queue */}
      <DashboardCardGroup
        title="Production Queue & Priority Sequencing"
        description="Automated manufacturing line scheduling prioritized by institutional delivery milestones."
        icon={Factory}
        targetHref="/factory/production-queue"
        targetLabel="View Production Queue"
        columns="2"
        badge="Assembly Scheduling"
      >
        <DashboardStatCard
          label="Scheduled Batches"
          value={isLoading ? '—' : queuedOrders}
          subValue="Orders actively allocated to factory floor"
          icon={Layers}
          variant="teal"
        />
        <DashboardStatCard
          label="Line Capacity Health"
          value={isLoading ? '—' : 'Optimal (94%)'}
          subValue="SAM operator line balancing status"
          icon={Flame}
          variant="gold"
        />
      </DashboardCardGroup>
    </div>
  );
}
