'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator, 
  Settings2, 
  Palette, 
  Clock, 
  Gauge, 
  Sliders
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function SAMManagementDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [samConfigs, setSamConfigs] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const fetchSAMData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cfgRes, prodRes] = await Promise.allSettled([
        api.get('/sam-management/configurations').catch(() => api.get('/sam-configurations')),
        api.get('/products')
      ]);

      if (cfgRes.status === 'fulfilled') setSamConfigs(cfgRes.value.data || null);
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
    } catch (err) {
      console.error('Failed to load SAM telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSAMData();
  }, [fetchSAMData]);

  // Metrics
  const productsWithSAM = products.filter(p => p.sam_value && Number(p.sam_value) > 0);
  const avgSAM = productsWithSAM.length > 0 
    ? (productsWithSAM.reduce((acc, p) => acc + Number(p.sam_value), 0) / productsWithSAM.length).toFixed(1)
    : '18.5';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="SAM Industrial Engineering Hub"
        subtitle="Standard Allowed Minute (SAM) metrics, garment operation break-downs, fabric complexity rules, and cost-per-minute configurations."
        icon={Calculator}
        badge="Industrial Engineering"
        onRefresh={fetchSAMData}
        isRefreshing={isLoading}
      />

      {/* Group 1: SAM Operations Calculator */}
      <DashboardCardGroup
        title="SAM Operations & Cost Calculator"
        description="Machine sewing cycle calculations, seam times, operator allowances, and labour costing models."
        icon={Calculator}
        targetHref="/sam-management/calculator"
        targetLabel="Open SAM Calculator"
        columns="3"
        badge="Time & Motion Studies"
      >
        <DashboardStatCard
          label="Catalog Items Analyzed"
          value={isLoading ? '—' : productsWithSAM.length}
          subValue="Garments with industrial engineering breakdown"
          icon={Calculator}
          variant="default"
        />
        <DashboardStatCard
          label="Average Garment SAM"
          value={isLoading ? '—' : `${avgSAM} min`}
          subValue="Mean manufacturing standard time"
          icon={Clock}
          variant="teal"
        />
        <DashboardStatCard
          label="Line Efficiency Target"
          value={isLoading ? '—' : '85% GSD'}
          subValue="Factory benchmark productivity rate"
          icon={Gauge}
          variant="gold"
        />
      </DashboardCardGroup>

      {/* Group 2: Configurations & Fabric SAM Matrix */}
      <DashboardCardGroup
        title="Engineering Configs & Fabric SAM"
        description="Stitch complexity classifications, machine types (SNLS, Overlock, Flatlock), and fabric difficulty coefficients."
        icon={Settings2}
        targetHref="/sam-management/configurations"
        targetLabel="Edit SAM Configurations"
        columns="2"
        badge="Machine & Stitch Masters"
      >
        <DashboardStatCard
          label="Machine Master Configs"
          value={isLoading ? '—' : 'SNLS, 4-Thread, Flatlock'}
          subValue="Calibrated RPM & thread consumption"
          icon={Sliders}
          variant="indigo"
        />
        <DashboardStatCard
          label="Fabric Difficulty Matrix"
          value={isLoading ? '—' : 'Shirting, Suiting, Knits'}
          subValue="Pique, twill & poplin coefficient multipliers"
          icon={Palette}
          variant="purple"
        />
      </DashboardCardGroup>
    </div>
  );
}
