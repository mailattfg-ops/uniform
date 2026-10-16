'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Box,
  Layers, 
  Ruler, 
  Sparkles, 
  Calculator, 
  Bookmark, 
  Palette, 
  Scissors, 
  SlidersHorizontal,
  FolderTree
} from 'lucide-react';
import api from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

export default function ItemsDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [products, setProducts] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [trims, setTrims] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);

  const fetchItemsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, typeRes, fabRes, trimsRes, accRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/product-types'),
        api.get('/fabrics').catch(() => api.get('/inventory/fabrics')),
        api.get('/trims').catch(() => api.get('/inventory/trims')),
        api.get('/accessories')
      ]);

      if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
      if (typeRes.status === 'fulfilled') setProductTypes(typeRes.value.data || []);
      if (fabRes.status === 'fulfilled') setFabrics(fabRes.value.data || []);
      if (trimsRes.status === 'fulfilled') setTrims(trimsRes.value.data || []);
      if (accRes.status === 'fulfilled') setAccessories(accRes.value.data || []);
    } catch (err) {
      console.error('Failed to load Items telemetry', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItemsData();
  }, [fetchItemsData]);

  // Calculations
  const totalManufacturedProducts = products.length;
  const productsWithSAM = products.filter(p => p.sam_value && Number(p.sam_value) > 0).length;
  const productsWithSizeChart = products.filter(p => p.size_chart_id || (p.entry_methods && p.entry_methods.includes('us_size_chart'))).length;
  const productsWithManual = products.filter(p => p.entry_methods && p.entry_methods.includes('manual')).length;

  const totalProductTypes = productTypes.length;

  // ART & Design numbers from products
  const uniqueArtNumbers = new Set(products.map(p => p.art_number).filter(Boolean)).size;
  const uniqueDesignNumbers = new Set(products.map(p => p.design_number).filter(Boolean)).size;

  const totalFabrics = fabrics.length;
  const totalTrims = trims.length;
  const totalAccessories = accessories.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <DashboardHeader
        title="Items & Catalog Hub"
        subtitle="Catalog repository for manufactured garments, product classifications, ART numbers, materials, and accessories."
        icon={Tag}
        badge="Catalog & Specification Management"
        onRefresh={fetchItemsData}
        isRefreshing={isLoading}
      />

      {/* Group 1: Manufactured Products */}
      <DashboardCardGroup
        title="Manufactured Products"
        description="Master uniform garments engineered and tailored for client institutions."
        icon={Box}
        targetHref="/admin/products"
        targetLabel="Go to Products Catalog"
        columns="4"
        badge="In-House Production"
      >
        <DashboardStatCard
          label="Total Products"
          value={isLoading ? '—' : totalManufacturedProducts}
          subValue="Active uniform style definitions"
          icon={Box}
          variant="default"
        />
        <DashboardStatCard
          label="SAM Configured"
          value={isLoading ? '—' : productsWithSAM}
          subValue="Engineering production minutes set"
          icon={Calculator}
          variant="teal"
          badge="Industrial SAM"
        />
        <DashboardStatCard
          label="US Size Chart Ready"
          value={isLoading ? '—' : productsWithSizeChart}
          subValue="Standard scaled sizing linked"
          icon={Ruler}
          variant="purple"
        />
        <DashboardStatCard
          label="Custom Manual Sizing"
          value={isLoading ? '—' : productsWithManual}
          subValue="Tailored body measure logic"
          icon={Scissors}
          variant="amber"
        />
      </DashboardCardGroup>

      {/* Group 2: Product Taxonomy & Classification */}
      <DashboardCardGroup
        title="Product Types & Taxonomy"
        description="Top-level garment classifications determining sizing matrices and industrial defaults."
        icon={FolderTree}
        targetHref="/admin/product-types"
        targetLabel="Manage Product Types"
        columns="3"
        badge="Classification"
      >
        <DashboardStatCard
          label="Product Categories"
          value={isLoading ? '—' : totalProductTypes}
          subValue="Registered garment families"
          icon={FolderTree}
          variant="indigo"
        />
        <DashboardStatCard
          label="Active ART Rules"
          value={isLoading ? '—' : uniqueArtNumbers}
          subValue="Pattern codes associated"
          icon={Bookmark}
          variant="gold"
        />
        <DashboardStatCard
          label="Design Variants"
          value={isLoading ? '—' : uniqueDesignNumbers}
          subValue="DNS/DNG variant codes"
          icon={Sparkles}
          variant="teal"
        />
      </DashboardCardGroup>

      {/* Group 3: ART & Design Number Identifiers */}
      <DashboardCardGroup
        title="ART Number Hub & Design Catalog"
        description="Standardized article identity schemes (DressPrefix - GenderPattern - FitAllowance) and variation tracking."
        icon={Bookmark}
        targetHref="/admin/art-number-hub"
        targetLabel="Open ART Number Hub"
        columns="2"
        badge="Identification"
      >
        <DashboardStatCard
          label="ART Pattern Scheme"
          value={isLoading ? '—' : `${uniqueArtNumbers} Articles`}
          subValue="Dress prefix + Gender + Pattern + Fit"
          icon={Bookmark}
          variant="default"
        />
        <DashboardStatCard
          label="Design Numbers (DNS / DNG)"
          value={isLoading ? '—' : `${uniqueDesignNumbers} Codes`}
          subValue="Distinct fabric + button + thread variants"
          icon={Sparkles}
          variant="gold"
        />
      </DashboardCardGroup>

      {/* Group 4: Raw Materials, Fabrics, Trims & Accessories */}
      <DashboardCardGroup
        title="Fabrics, Trims & Accessories"
        description="Raw material inventory swatches, bill-of-materials components, and retail trade accessories."
        icon={Layers}
        targetHref="/admin/accessories"
        targetLabel="Open Accessories Hub"
        columns="3"
        badge="Bill of Materials"
      >
        <DashboardStatCard
          label="Fabric Swatches"
          value={isLoading ? '—' : totalFabrics}
          subValue="Registered textile catalog items"
          icon={Palette}
          variant="teal"
        />
        <DashboardStatCard
          label="Trims Catalog"
          value={isLoading ? '—' : totalTrims}
          subValue="Buttons, threads, labels & zippers"
          icon={SlidersHorizontal}
          variant="amber"
        />
        <DashboardStatCard
          label="Accessories & Trade"
          value={isLoading ? '—' : totalAccessories}
          subValue="Ties, belts, socks, badges & caps"
          icon={Tag}
          variant="purple"
        />
      </DashboardCardGroup>
    </div>
  );
}
