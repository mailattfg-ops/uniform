'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Box, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Palette, 
  SlidersHorizontal, 
  Tag, 
  ArrowLeftRight, 
  Building2,
  Layers
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function InventoryDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [productStock, setProductStock] = useState<any[]>([]);
  const [fabricStock, setFabricStock] = useState<any[]>([]);
  const [trimsStock, setTrimsStock] = useState<any[]>([]);
  const [accessoriesStock, setAccessoriesStock] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const fetchInventoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stockRes, fabRes, trimsRes, accRes, trfRes, brRes] = await Promise.allSettled([
        api.get('/inventory/stock'),
        api.get('/inventory/fabrics'),
        api.get('/inventory/trims'),
        api.get('/inventory/accessory-categories'),
        api.get('/branches').catch(() => ({ data: [] })),
        api.get('/branches')
      ]);

      if (stockRes.status === 'fulfilled') setProductStock(stockRes.value.data?.products || stockRes.value.data || []);
      if (fabRes.status === 'fulfilled') setFabricStock(fabRes.value.data || []);
      if (trimsRes.status === 'fulfilled') setTrimsStock(trimsRes.value.data || []);
      if (accRes.status === 'fulfilled') setAccessoriesStock(accRes.value.data || []);
      if (trfRes.status === 'fulfilled') setTransfers(trfRes.value.data || []);
      if (brRes.status === 'fulfilled') setBranches(brRes.value.data || []);
    } catch (err) {
      console.error('Failed to load inventory telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Readymade stock calculations matching product-stock page
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalReservedCount = 0;

  productStock.forEach((prod: any) => {
    const stock = prod.stocks?.find((s: any) => s.size === 'M') || prod.stocks?.[0];
    if (!stock) {
      outOfStockCount++;
    } else {
      const available = stock.quantity - (stock.reserved_quantity || 0);
      if (available <= 0) {
        outOfStockCount++;
      } else if (available <= (stock.low_stock_threshold || 5)) {
        lowStockCount++;
      }
      totalReservedCount += stock.reserved_quantity || 0;
    }
  });

  const totalProductItems = productStock.length;
  const totalFabricsCount = fabricStock.length;
  const totalTrimsCount = trimsStock.length;
  const totalAccessoriesCount = accessoriesStock.length;
  const totalTransfersCount = transfers.length;
  const pendingTransfers = transfers.filter((t: any) => ['pending', 'in transit'].includes((t.status || '').toLowerCase())).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Inventory & Stock Hub"
        subtitle="Readymade trade garments, raw textile rolls, trims, inter-branch movement, and outlet stocks."
        icon={Package}
        badge="Supply Chain & Warehousing"
        onRefresh={fetchInventoryData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Readymade (Trade) Stock */}
      <DashboardCardGroup
        title="Readymade (Trade) Stock"
        description="Finished goods inventory for retail distribution and instant client order fulfillment."
        icon={Box}
        targetHref="/admin/inventory/product-stock"
        targetLabel="Open Readymade Stock"
        columns="4"
        badge="Finished Goods"
      >
        <DashboardStatCard
          label="Garment Items"
          value={isLoading ? '—' : totalProductItems}
          subValue="Active trade product articles"
          icon={Box}
          variant="default"
        />
        <DashboardStatCard
          label="Low Stock Products"
          value={isLoading ? '—' : lowStockCount}
          subValue="Quantity below threshold"
          icon={AlertTriangle}
          variant="amber"
          badge="Reorder"
        />
        <DashboardStatCard
          label="Out of Stock"
          value={isLoading ? '—' : outOfStockCount}
          subValue="Zero stock availability"
          icon={XCircle}
          variant="rose"
        />
        <DashboardStatCard
          label="Reserved Stock"
          value={isLoading ? '—' : totalReservedCount}
          subValue="Committed for pending orders"
          icon={ShieldCheck}
          variant="teal"
        />
      </DashboardCardGroup>

      {/* Group 2: Raw Materials & Trims Inventory */}
      <DashboardCardGroup
        title="Raw Fabrics & Trims Inventory"
        description="Warehouse textile rolls, thread spools, buttons, zippers, and trade accessories."
        icon={Layers}
        targetHref="/admin/inventory/fabric-stock"
        targetLabel="Manage Raw Stock"
        columns="3"
        badge="Raw Materials"
      >
        <DashboardStatCard
          label="Fabric Stock"
          value={isLoading ? '—' : totalFabricsCount}
          subValue="Textile types & roll batches"
          icon={Palette}
          variant="teal"
        />
        <DashboardStatCard
          label="Trims Stock"
          value={isLoading ? '—' : totalTrimsCount}
          subValue="Buttons, threads & hardware"
          icon={SlidersHorizontal}
          variant="amber"
        />
        <DashboardStatCard
          label="Accessories Stock"
          value={isLoading ? '—' : totalAccessoriesCount}
          subValue="Trade accessories units"
          icon={Tag}
          variant="purple"
        />
      </DashboardCardGroup>

      {/* Group 3: Inter-Branch Stock Transfers & Outlet Inventory */}
      <DashboardCardGroup
        title="Stock Transfers & Branch Inventory"
        description="Transfers between central factory warehouse and regional school outlets/branches."
        icon={ArrowLeftRight}
        targetHref="/branches/transfers"
        targetLabel="Stock Transfers Register"
        columns="3"
        badge="Logistics & Outlets"
      >
        <DashboardStatCard
          label="Total Transfer Orders"
          value={isLoading ? '—' : totalTransfersCount}
          subValue="Inter-branch shipments created"
          icon={ArrowLeftRight}
          variant="default"
        />
        <DashboardStatCard
          label="In Transit / Pending"
          value={isLoading ? '—' : pendingTransfers}
          subValue="Currently in transit"
          icon={AlertTriangle}
          variant="amber"
        />
        <DashboardStatCard
          label="Connected Outlets"
          value={isLoading ? '—' : branches.length}
          subValue="Active distribution branches"
          icon={Building2}
          variant="gold"
        />
      </DashboardCardGroup>
    </div>
  );
}
