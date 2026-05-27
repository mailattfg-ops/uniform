'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Layers,
  Trash2,
  Eye,
  Check,
  Building2,
  Scale,
  Clock,
  Percent,
  Mail
} from 'lucide-react';

import { 
  Quotation, 
  Organization, 
  ProductType, 
  Fabric, 
  compileQuotationHTML, 
  getSelectedQuotePricing 
} from './_lib/compileQuotationHTML';

import { MessageModal } from './_components/MessageModal';
import { QuotationDetailsView } from './_components/QuotationDetailsView';

export default function OperationTeamPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [fabricsList, setFabricsList] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const [deleteCandidate, setDeleteCandidate] = useState<Quotation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [messageCandidate, setMessageCandidate] = useState<Quotation | null>(null);

  const [companySettings, setCompanySettings] = useState<any>({
    company_name: 'Forma Apparels',
    address: '63/3608, CD Tower, Arayidathupalam, Kozhikode, Kerala - 673 004, India',
    phone: '(+91) 7902 499 990 | 0495 2 922 992',
    email: 'info@formaapparels.com',
    website: 'www.formaapparels.com',
    bank_name: 'HDFC BANK',
    account_no: '50200076116064',
    branch_name: 'MAJESTIC CENTER',
    ifsc_code: 'HDFC0001255',
    upi_id: '7902 499 991'
  });

  const fetchCompanySettings = async () => {
    try {
      const res = await api.get('/company-settings');
      if (res.data?.success && res.data.data) {
        setCompanySettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load company settings', err);
    }
  };

  // Load baseline data
  useEffect(() => {
    fetchQuotations();
    fetchOrganizations();
    fetchProductTypes();
    fetchFabrics();
    fetchCompanySettings();
  }, []);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data);
    } catch (err) {
      toast.error('Failed to load quotations registry');
    } finally {
      setIsLoading(false);
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

  // Trigger details view
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

  // Deletion logic
  const handleDeleteQuotation = async () => {
    if (!deleteCandidate) return;
    try {
      await api.delete(`/quotations/${deleteCandidate.id}`);
      toast.success('Quotation deleted successfully!');
      fetchQuotations();
      if (selectedQuotation && selectedQuotation.id === deleteCandidate.id) {
        setSelectedQuotation(null);
        setActiveTab('list');
      }
    } catch (err) {
      toast.error('Failed to delete quotation');
    } finally {
      setDeleteCandidate(null);
    }
  };

  // Immediate Approve from main list table
  const handleApproveQuotation = async (quote: Quotation) => {
    const loadingToast = toast.loading('Approving quotation & compiling proposal...');
    try {
      const res = await api.get(`/quotations/${quote.id}`);
      const fullQuote = res.data;

      // Compile the HTML PDF preview at the time of approval
      const compiledHtml = compileQuotationHTML(fullQuote, fabricsList, companySettings);

      const payload = {
        ...fullQuote,
        status: 'Approved',
        pdf_html: compiledHtml
      };

      await api.put(`/quotations/${quote.id}`, payload);
      toast.success('Quotation approved & proposal PDF stored successfully!', { id: loadingToast });
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve quotation', { id: loadingToast });
    }
  };

  // Filtered quotations list
  const filteredQuotations = useMemo(() => {
    if (filterStatus === 'All') return quotations;
    return quotations.filter(q => q.status === filterStatus);
  }, [quotations, filterStatus]);

  // Statistics summaries
  const stats = useMemo(() => {
    const total = quotations.length;
    const pending = quotations.filter(q => q.status === 'Pending' || q.status === 'Draft').length;
    const approvedVal = quotations
      .filter(q => q.status === 'Approved')
      .reduce((acc, q) => acc + Number(q.final_quote_value), 0);
    const avgMargin = total > 0
      ? Math.round(quotations.reduce((acc, q) => acc + (q.profit_margin_percent || 0), 0) / total)
      : 0;

    return { total, pending, approvedVal, avgMargin };
  }, [quotations]);

  // Columns for List View
  const listColumns: Column<Quotation>[] = [
    {
      header: 'Quote No',
      accessor: (q) => (
        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10 tracking-widest font-mono whitespace-nowrap inline-block">
          {q.quotation_no}
        </span>
      )
    },
    {
      header: 'Quotation Title',
      accessor: (q) => (
        <div className="flex flex-col">
          <span className="font-black text-[#3a525d] text-sm leading-tight">{q.title}</span>
          <span className="text-[10px] text-zinc-400 font-semibold mt-1">
            Created: {new Date(q.created_at).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      header: 'Customer',
      accessor: (q) => (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-[#2d8d9b] opacity-60" />
          <span className="font-bold text-zinc-600">{q.organizations?.name || 'Customer'}</span>
        </div>
      )
    },
    {
      header: 'Profit Margin',
      accessor: (q) => <span className="font-mono font-bold text-green-600 whitespace-nowrap">+{q.profit_margin_percent}%</span>
    },
    {
      header: 'Delivery Date',
      accessor: (q) => (
        <span className="font-bold text-zinc-500 whitespace-nowrap">
          {q.expected_delivery_date
            ? new Date(q.expected_delivery_date).toLocaleDateString()
            : 'N/A'
          }
        </span>
      )
    },
    {
      header: 'Final quote value',
      accessor: (q) => (
        <span className="font-black text-[#2d8d9b] font-mono whitespace-nowrap">
          ₹{Number(q.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (q) => {
        const styles: Record<string, string> = {
          Approved: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
          Pending: 'bg-amber-50 text-amber-600 border-amber-200/50',
          Draft: 'bg-zinc-100 text-zinc-500 border-zinc-200',
          Rejected: 'bg-rose-50 text-rose-600 border-rose-200/50'
        };
        const st = q.status || 'Draft';
        return (
          <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[st] || styles.Draft}`}>
            {st}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (q) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(q)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 text-[#3a525d] font-black hover:bg-zinc-50 py-1 px-3 shadow-sm h-8"
          >
            <Eye size={12} />
            Analyze
          </Button>

          {q.status !== 'Approved' && (
            <Button
              variant="outline"
              size="h-auto"
              onClick={() => handleApproveQuotation(q)}
              className="text-emerald-600 hover:bg-emerald-50 rounded-xl h-8 w-8 p-0 flex items-center justify-center border border-emerald-200/60 shadow-sm"
              title="Approve immediately"
            >
              <Check size={16} />
            </Button>
          )}

          {q.status === 'Approved' && (
            <Button
              variant="outline"
              size="h-auto"
              onClick={() => setMessageCandidate(q)}
              className="text-[#2d8d9b] hover:bg-[#2d8d9b]/10 rounded-xl h-8 w-8 p-0 flex items-center justify-center border border-[#2d8d9b]/20 shadow-sm"
              title="Send proposal to customer"
            >
              <Mail size={16} />
            </Button>
          )}

          <Button
            variant="outline"
            size="h-auto"
            onClick={() => setDeleteCandidate(q)}
            className="text-rose-600 hover:bg-rose-50 rounded-xl h-8 w-8 p-0 flex items-center justify-center border border-rose-200/60 shadow-sm"
            title="Delete quotation"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">

      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10 tracking-widest">
            OPERATIONS DESK
          </span>
          <h2 className="text-4xl font-black tracking-tighter text-[#3a525d] mt-2">
            Operations Quotation Registry
          </h2>
          <p className="text-sm font-bold text-zinc-400 mt-1">
            Deep-audit, modify, analyze, and verify quotation entries prior to contract finalization.
          </p>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* 2. KPI METRIC SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-8 border border-zinc-100 bg-zinc-50/50 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Quotations</p>
                <p className="text-3xl font-black tracking-tighter text-[#3a525d]">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                <Layers size={20} />
              </div>
            </Card>

            <Card className="p-8 border border-zinc-100 bg-zinc-50/50 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pending Operations Review</p>
                <p className="text-3xl font-black tracking-tighter text-amber-500">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                <Clock size={20} />
              </div>
            </Card>

            <Card className="p-8 border border-[#2d8d9b]/10 bg-[#2d8d9b]/5 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-75">Approved Contract Value</p>
                <p className="text-2xl font-black tracking-tighter text-[#2d8d9b] font-mono">
                  ₹{stats.approvedVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                <Scale size={20} />
              </div>
            </Card>

            <Card className="p-8 border border-zinc-100 bg-zinc-50/50 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Average Profit Margin</p>
                <p className="text-3xl font-black tracking-tighter text-emerald-500">+{stats.avgMargin}%</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
                <Percent size={20} />
              </div>
            </Card>
          </div>

          {/* 3. FILTER TABS */}
          <div className="flex gap-2 flex-wrap border-b border-zinc-100 pb-2">
            {['All', 'Draft', 'Pending', 'Approved', 'Rejected'].map(st => {
              const isActive = filterStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isActive
                    ? 'bg-[#3a525d] text-white shadow-md'
                    : 'bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 text-zinc-500 font-bold'
                    }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* 4. MAIN REGISTRY DATA TABLE */}
          <DataTable
            columns={listColumns}
            data={filteredQuotations}
            title="Quotation Submissions"
            subtitle="Verified client contracts processed by operations team"
            searchPlaceholder="Search quotation number, title, customer..."
            isLoading={isLoading}
          />
        </>
      ) : (
        /* 5. DEEP ANALYSIS & DETAILED EDIT WORKSPACE VIEW */
        selectedQuotation && (
          <QuotationDetailsView 
            selectedQuotation={selectedQuotation}
            onClose={() => { setActiveTab('list'); setSelectedQuotation(null); }}
            organizations={organizations}
            productTypes={productTypes}
            fabricsList={fabricsList}
            companySettings={companySettings}
            fetchQuotations={fetchQuotations}
            setSelectedQuotation={setSelectedQuotation}
          />
        )
      )}

      {/* 6. CONFIRM DELETE MODAL */}
      {deleteCandidate && (
        <ConfirmModal
          isOpen={true}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={handleDeleteQuotation}
          title="Delete Quotation"
          message={`Are you absolutely sure you want to delete quotation "${deleteCandidate.title}" (${deleteCandidate.quotation_no})? This action is permanent and cannot be undone.`}
          confirmLabel="Yes, delete it"
          cancelLabel="Keep quotation"
          variant="danger"
        />
      )}

      {/* 7. PREMIUM SEND MESSAGE MODAL */}
      {messageCandidate && (
        <MessageModal 
          quote={messageCandidate}
          isOpen={true}
          onClose={() => setMessageCandidate(null)}
          organizations={organizations}
          companySettings={companySettings}
        />
      )}

    </div>
  );
}
