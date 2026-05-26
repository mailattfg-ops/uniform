'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, ArrowLeft } from 'lucide-react';

import QuotationList from './_components/QuotationList';
import QuotationDetails from './_components/QuotationDetails';
import QuotationWizard from './_components/QuotationWizard';

export interface Organization {
  id: number;
  name: string;
}

export interface ProductType {
  id: number;
  name: string;
}

export interface QuotationItem {
  product_type_id: number;
  product_type_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size_breakdown: Record<string, any>;
  fabric_cost_per_item: number;
  accessories_cost_per_item: number;
  labor_cost_per_item: number;
}

export interface Quotation {
  id: number;
  quotation_no: string;
  title: string;
  organization_id: number;
  organizations?: { name: string };
  estimated_expenses: number;
  total_estimated_time: string;
  production_days_estimate: number;
  expected_delivery_date: string | null;
  profit_margin_percent: number;
  final_quote_value: number;
  status: string;
  items?: any[];
  metrics_summary: {
    total_entities?: number;
    measured?: number;
    pending?: number;
    missing?: number;
    sizes?: Record<string, number>;
    cover_letter?: string;
    gst_percent?: number;
    pre_tax_subtotal?: number;
  };
  created_at: string;
}

export interface ManualItem {
  id: number;
  product_type_id: string;
  product_id?: string;
  // Main Fabric — mandatory
  fabric_id: string;
  main_fabric_meters: string;
  main_fabric_rate: string;
  main_fabric_sam: string; // Fabric SAM (minutes)
  // Attachment Fabric 1 — optional
  attachment_fabric1_id: string;
  attachment_fabric1_meters: string;
  attachment_fabric1_rate: string;
  attachment_fabric1_sam: string; // Fabric SAM (minutes)
  // Attachment Fabric 2 — optional
  attachment_fabric2_id: string;
  attachment_fabric2_meters: string;
  attachment_fabric2_rate: string;
  attachment_fabric2_sam: string; // Fabric SAM (minutes)
  // Accessories — optional
  button_id: string;
  button_count: string;
  thread_id: string;
  thread_count: string;
  // SAM & meta
  sam_value: string;
  design_number: string;
  quantity: string;
  price: string; // computed unit cost
}

export interface TemplateLineItem {
  product_id: number;
  art_number: string;
  product_name: string;
  gender: string;
  sam_value: number | null;
  materials: string | null;
  product_type: string | null;
  design_id: string | null;
  design_code: string | null;
  design_number_override: string;
  price_override: string;
  template_quantity: number | null;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [fabricsList, setFabricsList] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'details'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Quotation | null>(null);
  const [editingQuotationId, setEditingQuotationId] = useState<number | null>(null);
  const [buttonsList, setButtonsList] = useState<any[]>([]);
  const [threadsList, setThreadsList] = useState<any[]>([]);
  const [inwardRates, setInwardRates] = useState<any[]>([]);
  const [fabricMargins, setFabricMargins] = useState<any[]>([]);
  const [samConfigurations, setSamConfigurations] = useState<any[]>([]);

  // Load all baseline data
  const fetchQuotations = async () => {
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data || []);
    } catch (err) {
      toast.error('Failed to retrieve quotations registry');
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      setOrganizations(res.data || []);
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  };

  const fetchProductTypes = async () => {
    try {
      const res = await api.get('/product-types');
      setProductTypes(res.data || []);
    } catch (err) {
      console.error('Failed to load product types', err);
    }
  };

  const fetchFabrics = async () => {
    try {
      const res = await api.get('/inventory/fabrics');
      setFabricsList(res.data || []);
    } catch (err) {
      console.error('Failed to load fabrics list', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setAllProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products list', err);
    }
  };

  const fetchButtons = async () => {
    try {
      const res = await api.get('/inventory/buttons');
      setButtonsList(res.data || []);
    } catch (err) {
      console.error('Failed to load buttons list', err);
    }
  };

  const fetchThreads = async () => {
    try {
      const res = await api.get('/inventory/threads');
      setThreadsList(res.data || []);
    } catch (err) {
      console.error('Failed to load threads list', err);
    }
  };

  const fetchInwardRates = async () => {
    try {
      const res = await api.get('/sam-management/fabric/inward-transportation');
      setInwardRates(res.data || []);
    } catch (err) {
      console.error('Failed to load inward rates', err);
    }
  };

  const fetchFabricMargins = async () => {
    try {
      const res = await api.get('/sam-management/fabric/margins');
      setFabricMargins(res.data || []);
    } catch (err) {
      console.error('Failed to load fabric margins', err);
    }
  };

  const fetchSamConfigurations = async () => {
    try {
      const res = await api.get('/sam-management/configurations');
      setSamConfigurations(res.data || []);
    } catch (err) {
      console.error('Failed to load SAM configurations', err);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchQuotations(),
          fetchOrganizations(),
          fetchProductTypes(),
          fetchFabrics(),
          fetchProducts(),
          fetchButtons(),
          fetchThreads(),
          fetchInwardRates(),
          fetchFabricMargins(),
          fetchSamConfigurations()
        ]);
      } catch (err) {
        console.error('Error loading baseline data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleDeleteQuotation = async () => {
    if (!deleteCandidate) return;
    try {
      await api.delete(`/quotations/${deleteCandidate.id}`);
      toast.success('Quotation removed successfully!');
      fetchQuotations();
    } catch (err) {
      toast.error('Failed to remove quotation');
    } finally {
      setDeleteCandidate(null);
    }
  };

  const handleViewDetails = async (quote: Quotation) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/quotations/${quote.id}`);
      setSelectedQuotation(res.data);
      setActiveTab('details');
    } catch (err) {
      toast.error('Failed to load quotation details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (quote: Quotation) => {
    setEditingQuotationId(quote.id);
    setActiveTab('create');
  };

  const handleSaveSuccess = () => {
    setEditingQuotationId(null);
    setActiveTab('list');
    fetchQuotations();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d] flex items-center gap-3">
            Marketing Quotations
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            {activeTab === 'list' && 'Client Contract proposals & custom sizing estimates'}
            {activeTab === 'create' && (editingQuotationId ? 'Quotation Editor Wizard' : 'Quotation Compiler Wizard')}
            {activeTab === 'details' && 'Detailed Expense Breakdown & Delivery Timelines'}
          </p>
        </div>

        {activeTab === 'list' ? (
          <Button
            onClick={() => setActiveTab('create')}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={20} strokeWidth={3} />
            Compile Quotation
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setEditingQuotationId(null);
              setActiveTab('list');
              setSelectedQuotation(null);
            }}
            className="h-16 px-10 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Registry
          </Button>
        )}
      </div>

      {/* 1. LIST REGISTRY TAB */}
      {activeTab === 'list' && (
        <QuotationList
          quotations={quotations}
          organizations={organizations}
          isLoading={isLoading}
          onCompileQuotation={() => setActiveTab('create')}
          onViewDetails={handleViewDetails}
          onStartEdit={handleStartEdit}
          onDeleteCandidate={setDeleteCandidate}
        />
      )}

      {/* 2. QUOTATION WIZARD COMPILER TAB */}
      {activeTab === 'create' && (
        <QuotationWizard
          editingQuotationId={editingQuotationId}
          organizations={organizations}
          productTypes={productTypes}
          fabricsList={fabricsList}
          allProducts={allProducts}
          buttonsList={buttonsList}
          threadsList={threadsList}
          inwardRates={inwardRates}
          fabricMargins={fabricMargins}
          samConfigurations={samConfigurations}
          onClose={() => {
            setEditingQuotationId(null);
            setActiveTab('list');
          }}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      {/* 3. QUOTATION DETAILED VIEW TAB */}
      {activeTab === 'details' && selectedQuotation && (
        <QuotationDetails
          selectedQuotation={selectedQuotation}
          fabricsList={fabricsList}
          onBack={() => {
            setSelectedQuotation(null);
            setActiveTab('list');
          }}
          onStartEdit={handleStartEdit}
        />
      )}

      {/* CONFIRMATION FOR DELETION */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Remove Formal Quotation"
        message="Are you sure you want to permanently delete this quotation proposal? This operation is irreversible."
        onConfirm={handleDeleteQuotation}
        onCancel={() => setDeleteCandidate(null)}
        confirmLabel="Yes, Delete Proposal"
        variant="danger"
      />
    </div>
  );
}
