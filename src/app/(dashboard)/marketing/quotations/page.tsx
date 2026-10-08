'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { Plus, ArrowLeft } from 'lucide-react';

import QuotationList from './_components/QuotationList';
import QuotationDetails from './_components/QuotationDetails';
import QuotationWizard from './_components/QuotationWizard';
import { RevisionModal } from './_components/RevisionModal';

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
      departments?: Array<{
        id: number;
        name: string;
        division?: string;
        persons: number;
        sets: number;
      }>;
      sales_type?: string;
      customer_type?: string;
      quotation_type?: string;
      extra_charges?: Array<{ label: string; quantity: string; rate: string }>;
      separate_fabrics?: SeparateFabricItem[];
      project_start_date?: string;
      submitted_to_bm?: boolean;
      submitted_to_bm_at?: string;
      submitted_to_bm_by?: number | string;
      submitted_to_bm_by_name?: string;
      bm_approved?: boolean;
      bm_approved_at?: string;
      bm_approved_by?: number | string;
      bm_approved_by_name?: string;
      bm_notes?: string;
      bm_rejection_reason?: string;
      needs_revision?: boolean;
      submitted_to_ops?: boolean;
      submitted_to_ops_at?: string;
      [key: string]: any;
    };
  created_at: string;
  pdf_html?: string;
  group_design_number?: { code: string };
}

export interface SeparateFabricItem {
  id: number;
  fabric_id: string;
  meters: string;
  rate: string;
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
  // Trims & Accessories
  trims?: Array<{
    id?: string | number;
    trim_id: string;
    category?: string;
    name?: string;
    count: string;
    uom?: string;
    unit_price?: number;
  }>;
  button_id: string;
  button_count: string;
  thread_id: string;
  thread_count: string;
  // SAM & meta
  sam_value: string;
  design_number: string;
  art_number?: string;
  quantity: string;
  price: string; // computed unit cost
  size_breakdown?: any;
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

import { useSearchParams } from 'next/navigation';

export default function QuotationsPage() {
  const searchParams = useSearchParams();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [fabricsList, setFabricsList] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'details'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Quotation | null>(null);
  const [submitCandidate, setSubmitCandidate] = useState<Quotation | null>(null);
  const [submitToBmCandidate, setSubmitToBmCandidate] = useState<Quotation | null>(null);
  const [bmApproveCandidate, setBmApproveCandidate] = useState<Quotation | null>(null);
  const [bmRejectCandidate, setBmRejectCandidate] = useState<Quotation | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingQuotationId, setEditingQuotationId] = useState<number | null>(null);
  const [buttonsList, setButtonsList] = useState<any[]>([]);
  const [threadsList, setThreadsList] = useState<any[]>([]);
  const [trimsList, setTrimsList] = useState<any[]>([]);
  const [trimCategories, setTrimCategories] = useState<any[]>([]);
  const [inwardRates, setInwardRates] = useState<any[]>([]);
  const [fabricMargins, setFabricMargins] = useState<any[]>([]);
  const [samConfigurations, setSamConfigurations] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (searchParams && quotations.length > 0) {
      const quoteIdParam = searchParams.get('id');
      const actionParam = searchParams.get('action');
      if (quoteIdParam) {
        const id = parseInt(quoteIdParam, 10);
        const match = quotations.find(q => q.id === id);
        if (match) {
          if (actionParam === 'edit') {
            handleStartEdit(match);
          } else if (actionParam === 'view') {
            handleViewDetails(match);
          }
        }
      }
    }
  }, [searchParams, quotations]);

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

  const fetchTrimsData = async () => {
    try {
      const [resTrims, resCats] = await Promise.all([
        api.get('/inventory/trims'),
        api.get('/inventory/trim-categories')
      ]);
      const trims = resTrims.data || [];
      const cats = resCats.data || [];
      setTrimsList(trims);
      setTrimCategories(cats);

      const btns = trims.filter((t: any) =>
        (t.trim_categories?.name || t.category?.name || '').toLowerCase() === 'button' ||
        (t.name || '').toLowerCase().includes('button') ||
        (t.code || '').toLowerCase().startsWith('btn')
      );
      const thrs = trims.filter((t: any) =>
        (t.trim_categories?.name || t.category?.name || '').toLowerCase() === 'thread' ||
        (t.name || '').toLowerCase().includes('thread') ||
        (t.code || '').toLowerCase().startsWith('thr')
      );
      setButtonsList(btns.length > 0 ? btns : trims);
      setThreadsList(thrs.length > 0 ? thrs : trims);
    } catch (err) {
      console.error('Failed to load trims data', err);
    }
  };

  const fetchButtons = async () => {
    try {
      const res = await api.get('/inventory/buttons');
      if (res.data && res.data.length > 0) {
        setButtonsList(res.data);
      }
    } catch (err) {
      console.error('Failed to load buttons list', err);
    }
  };

  const fetchThreads = async () => {
    try {
      const res = await api.get('/inventory/threads');
      if (res.data && res.data.length > 0) {
        setThreadsList(res.data);
      }
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
      setFabricMargins(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load fabric margins', err);
      setFabricMargins([]);
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
          fetchTrimsData(),
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
      if (selectedQuotation?.id === deleteCandidate.id) {
        setSelectedQuotation(null);
        setActiveTab('list');
      }
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

  const handleSubmitToBm = async () => {
    if (!submitToBmCandidate) return;
    const toastId = toast.loading(`Submitting ${submitToBmCandidate.quotation_no} to Branch Manager...`);
    try {
      await api.put(`/quotations/${submitToBmCandidate.id}/submit-to-bm`);
      toast.success(`Quotation ${submitToBmCandidate.quotation_no} submitted to Branch Manager for approval!`, { id: toastId });
      fetchQuotations();
      if (selectedQuotation && selectedQuotation.id === submitToBmCandidate.id) {
        setSelectedQuotation(prev => prev ? { 
          ...prev, 
          status: 'Pending Branch Approval', 
          metrics_summary: { ...(prev.metrics_summary || {}), submitted_to_bm: true, needs_revision: false } 
        } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit quotation to Branch Manager', { id: toastId });
    } finally {
      setSubmitToBmCandidate(null);
    }
  };

  const handleBmApprove = async () => {
    if (!bmApproveCandidate) return;
    const toastId = toast.loading(`Approving ${bmApproveCandidate.quotation_no} and submitting to Operations...`);
    try {
      await api.put(`/quotations/${bmApproveCandidate.id}/bm-approve`);
      toast.success(`Quotation ${bmApproveCandidate.quotation_no} approved by Branch Manager & submitted to Operations!`, { id: toastId });
      fetchQuotations();
      if (selectedQuotation && selectedQuotation.id === bmApproveCandidate.id) {
        setSelectedQuotation(prev => prev ? { 
          ...prev, 
          status: 'Pending', 
          metrics_summary: { ...(prev.metrics_summary || {}), bm_approved: true, submitted_to_ops: true } 
        } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve quotation', { id: toastId });
    } finally {
      setBmApproveCandidate(null);
    }
  };

  const handleBmReject = async (reason: string) => {
    if (!bmRejectCandidate) return;
    setIsRejecting(true);
    const toastId = toast.loading(`Returning ${bmRejectCandidate.quotation_no} to Draft for revision...`);
    try {
      await api.put(`/quotations/${bmRejectCandidate.id}/bm-reject`, { reason });
      toast.success(`Quotation ${bmRejectCandidate.quotation_no} returned to Draft with feedback.`, { id: toastId });
      fetchQuotations();
      if (selectedQuotation && selectedQuotation.id === bmRejectCandidate.id) {
        setSelectedQuotation(prev => prev ? { 
          ...prev, 
          status: 'Draft', 
          metrics_summary: { ...(prev.metrics_summary || {}), needs_revision: true, bm_rejection_reason: reason } 
        } : null);
      }
      setBmRejectCandidate(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to request revision', { id: toastId });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSubmitToOps = async () => {
    if (!submitCandidate) return;
    const toastId = toast.loading(`Submitting ${submitCandidate.quotation_no} to Operations Team...`);
    try {
      await api.put(`/quotations/${submitCandidate.id}/submit-to-ops`);
      toast.success(`Quotation ${submitCandidate.quotation_no} submitted to Operations Team!`, { id: toastId });
      fetchQuotations();
      if (selectedQuotation && selectedQuotation.id === submitCandidate.id) {
        setSelectedQuotation(prev => prev ? { 
          ...prev, 
          status: 'Pending', 
          metrics_summary: { ...(prev.metrics_summary || {}), submitted_to_ops: true, bm_approved: true } 
        } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit quotation to Operations Team', { id: toastId });
    } finally {
      setSubmitCandidate(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative">
          <h1 className="text-4xl font-black tracking-tighter text-[#3a525d] flex items-center gap-3">
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
            New Quotation
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
            <ArrowLeft size={16} /> Back to Quotations
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
          onSubmitToOps={setSubmitCandidate}
          onSubmitToBm={setSubmitToBmCandidate}
          onBmApprove={setBmApproveCandidate}
          onBmReject={setBmRejectCandidate}
          currentUser={currentUser}
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
          trimsList={trimsList}
          trimCategories={trimCategories}
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
          onSubmitToOps={setSubmitCandidate}
          onSubmitToBm={setSubmitToBmCandidate}
          onBmApprove={setBmApproveCandidate}
          onBmReject={setBmRejectCandidate}
          onDeleteCandidate={setDeleteCandidate}
          currentUser={currentUser}
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

      {/* CONFIRMATION FOR SUBMISSION TO BRANCH MANAGER */}
      <ConfirmModal
        isOpen={!!submitToBmCandidate}
        title="Submit to Branch Manager"
        message={`Are you sure you want to submit quotation "${submitToBmCandidate?.quotation_no} - ${submitToBmCandidate?.title}" to your Branch Manager for review and sign-off?`}
        onConfirm={handleSubmitToBm}
        onCancel={() => setSubmitToBmCandidate(null)}
        confirmLabel="Yes, Submit to Branch Manager"
        variant="primary"
      />

      {/* CONFIRMATION FOR BRANCH MANAGER APPROVAL */}
      <ConfirmModal
        isOpen={!!bmApproveCandidate}
        title="Approve & Transmit to Operations"
        message={`As Branch Manager, are you endorsing quotation "${bmApproveCandidate?.quotation_no} - ${bmApproveCandidate?.title}"? Approving will transmit this quotation directly to the central Operations Team for factory costing & production scheduling.`}
        onConfirm={handleBmApprove}
        onCancel={() => setBmApproveCandidate(null)}
        confirmLabel="Approve & Send to Ops"
        variant="primary"
      />

      {/* MODAL FOR BRANCH MANAGER REVISION REQUEST */}
      {bmRejectCandidate && (
        <RevisionModal
          isOpen={!!bmRejectCandidate}
          quotationNo={bmRejectCandidate.quotation_no}
          quotationTitle={bmRejectCandidate.title}
          onConfirm={handleBmReject}
          onCancel={() => setBmRejectCandidate(null)}
          isSubmitting={isRejecting}
        />
      )}

      {/* CONFIRMATION FOR DIRECT SUBMISSION TO OPERATIONS */}
      <ConfirmModal
        isOpen={!!submitCandidate}
        title="Submit to Operations Team"
        message={`Are you sure you want to submit quotation "${submitCandidate?.quotation_no} - ${submitCandidate?.title}" directly to the Operations Team for review and approval?`}
        onConfirm={handleSubmitToOps}
        onCancel={() => setSubmitCandidate(null)}
        confirmLabel="Yes, Submit to Ops"
        variant="primary"
      />
    </div>
  );
}
