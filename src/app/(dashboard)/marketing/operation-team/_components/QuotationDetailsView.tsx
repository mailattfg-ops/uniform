'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  ArrowLeft, Edit3, Check, CheckCircle2, XCircle, Trash2, Plus, Scale, Building2
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';
import { Quotation, QuotationItem, Fabric, getSelectedQuotePricing, compileQuotationHTML } from '../_lib/compileQuotationHTML';

// Helpers for department, division, and fabric cleanup
const getCleanDeptName = (name: string) => {
  if (!name) return 'General Items';
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
};

const getCleanDivision = (name: string, fallbackDiv?: string) => {
  if (fallbackDiv) return fallbackDiv;
  if (!name) return '';
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : '';
};

const getFabricTitle = (f: any) => {
  if (!f) return 'Custom Fabric';
  const n = f.name || '';
  const b = f.brand_name ? ` (${f.brand_name})` : '';
  const s = f.shade ? ` - ${f.shade}` : '';
  return `${n}${b}${s}`.trim() || f.brand_name || 'Custom Fabric';
};

interface Organization {
  id: number;
  name: string;
}

interface ProductType {
  id: number;
  name: string;
}

interface QuotationDetailsViewProps {
  selectedQuotation: Quotation;
  onClose: () => void;
  organizations: Organization[];
  productTypes: ProductType[];
  fabricsList: Fabric[];
  companySettings: any;
  fetchQuotations: () => Promise<void>;
  setSelectedQuotation: (quote: Quotation | null) => void;
}

export const QuotationDetailsView: React.FC<QuotationDetailsViewProps> = ({
  selectedQuotation,
  onClose,
  organizations,
  productTypes,
  fabricsList,
  companySettings,
  fetchQuotations,
  setSelectedQuotation
}) => {
  // Editing state
  const [editMode, setEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedQuoteNo, setEditedQuoteNo] = useState('');
  const [editedOrgId, setEditedOrgId] = useState('');
  const [editedStatus, setEditedStatus] = useState('');
  const [editedExpenses, setEditedExpenses] = useState(0);
  const [editedTime, setEditedTime] = useState('');
  const [editedDays, setEditedDays] = useState(0);
  const [editedDeliveryDate, setEditedDeliveryDate] = useState('');
  const [editedMargin, setEditedMargin] = useState(0);
  const [editedFinalValue, setEditedFinalValue] = useState(0);
  const [editedItems, setEditedItems] = useState<QuotationItem[]>([]);
  const [editedCoverLetter, setEditedCoverLetter] = useState('');
  const [editedGstPercent, setEditedGstPercent] = useState('18');

  // Load details to editable states on starting edit mode
  const startEditing = () => {
    setEditedTitle(selectedQuotation.title);
    setEditedQuoteNo(selectedQuotation.quotation_no);
    setEditedOrgId(String(selectedQuotation.organization_id));
    setEditedStatus(selectedQuotation.status);
    setEditedExpenses(selectedQuotation.estimated_expenses);
    setEditedTime(selectedQuotation.total_estimated_time || '');
    setEditedDays(selectedQuotation.production_days_estimate || 0);
    setEditedDeliveryDate(selectedQuotation.expected_delivery_date
      ? new Date(selectedQuotation.expected_delivery_date).toISOString().split('T')[0]
      : ''
    );
    setEditedMargin(selectedQuotation.profit_margin_percent || 0);
    setEditedFinalValue(selectedQuotation.final_quote_value || 0);
    setEditedItems(JSON.parse(JSON.stringify(selectedQuotation.items || [])));
    setEditedCoverLetter(selectedQuotation.metrics_summary?.cover_letter || '');
    setEditedGstPercent(selectedQuotation.metrics_summary?.gst_percent != null ? String(selectedQuotation.metrics_summary.gst_percent) : '0');
    setEditMode(true);
  };

  const handleDownloadPDF = (quote: Quotation) => {
    const htmlContent = compileQuotationHTML(quote, fabricsList, companySettings);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Failed to open PDF generation window. Please allow popups.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleApproveQuotation = async (quote: Quotation) => {
    const loadingToast = toast.loading('Approving quotation & compiling proposal...');
    try {
      // Fetch full details if not loaded
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

      // Update selected quotation view
      setSelectedQuotation({
        ...selectedQuotation,
        status: 'Approved',
        pdf_html: compiledHtml
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve quotation', { id: loadingToast });
    }
  };

  const handleRejectQuotation = async (quote: Quotation) => {
    const loadingToast = toast.loading('Rejecting quotation...');
    try {
      const res = await api.get(`/quotations/${quote.id}`);
      const fullQuote = res.data;

      const payload = {
        ...fullQuote,
        status: 'Rejected'
      };

      await api.put(`/quotations/${quote.id}`, payload);
      toast.success('Quotation marked as Rejected!', { id: loadingToast });
      fetchQuotations();

      setSelectedQuotation({
        ...selectedQuotation,
        status: 'Rejected'
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject quotation', { id: loadingToast });
    }
  };

  const generateAutoCoverLetter = () => {
    const orgName = organizations.find(o => String(o.id) === String(editedOrgId))?.name || 'Customer';
    const contractTitle = editedTitle.trim() || 'Uniform Contract Proposal';
    const template = `Dear Team at ${orgName},

Thank you for giving Forma Apparels the opportunity to submit our proposal for the "${contractTitle}".

We are pleased to present our comprehensive uniform solutions tailored specifically for your organization. Based on our sizing audit and detailed requirements analysis, we have compiled an optimized production schedule and cost estimate to ensure maximum comfort, perfect fit compliance, and durability.

Please find the detailed sizing breakdown and cost compilation in the attached table. We look forward to partnering with your organization to deliver top-tier corporate garments that embody your brand's identity.

Should you have any questions or require custom modifications to this proposal, please do not hesitate to reach out to our team.

Sincerely,

Operations & Accounts Team
Forma Apparels Co.`;
    setEditedCoverLetter(template);
  };

  const recalculateSummaries = (items: QuotationItem[], margin: number, gstRateStr: string = editedGstPercent) => {
    const totalAccExpenses = items.reduce((acc, it) => {
      const perCost = (it.fabric_cost_per_item || 0) + (it.accessories_cost_per_item || 0) + (it.labor_cost_per_item || 0);
      return acc + (perCost * (it.quantity || 0));
    }, 0);
    setEditedExpenses(Math.round(totalAccExpenses * 100) / 100);

    const sumSellingPrices = items.reduce((acc, it) => acc + (it.total_price || 0), 0);
    const gstRate = parseFloat(gstRateStr) || 0;
    const gstVal = sumSellingPrices * (gstRate / 100);
    const finalVal = sumSellingPrices + gstVal;

    setEditedFinalValue(Math.round(finalVal * 100) / 100);

    const totalMinutes = items.reduce((acc, it) => {
      const sam = it.size_breakdown?.sam_value || 0;
      return acc + (sam * (it.quantity || 0));
    }, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    setEditedTime(`${totalHours} Hours`);

    const workingDays = Math.ceil(totalHours / (5 * 8)) || 1;
    setEditedDays(workingDays);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...editedItems];
    const item = { ...updated[index] };

    if (field === 'product_type_id') {
      item.product_type_id = parseInt(value) || 0;
    } else if (field === 'fabric_id') {
      item.size_breakdown = {
        ...(item.size_breakdown || {}),
        fabric_id: value || null
      };
    } else if (field === 'sam_value') {
      item.size_breakdown = {
        ...(item.size_breakdown || {}),
        sam_value: value ? parseFloat(value) : null
      };
    } else if (field === 'design_number') {
      item.size_breakdown = {
        ...(item.size_breakdown || {}),
        design_number: value || null
      };
    } else if (field === 'quantity') {
      item.quantity = parseInt(value) || 0;
    } else if (field === 'fabric_cost_per_item') {
      item.fabric_cost_per_item = parseFloat(value) || 0;
    } else if (field === 'accessories_cost_per_item') {
      item.accessories_cost_per_item = parseFloat(value) || 0;
    } else if (field === 'labor_cost_per_item') {
      item.labor_cost_per_item = parseFloat(value) || 0;
    } else if (field === 'unit_price') {
      item.unit_price = parseFloat(value) || 0;
    }

    const calculatedUnitPrice = item.fabric_cost_per_item + item.accessories_cost_per_item + item.labor_cost_per_item;
    if (['fabric_cost_per_item', 'accessories_cost_per_item', 'labor_cost_per_item'].includes(field)) {
      item.unit_price = calculatedUnitPrice;
    }
    item.total_price = item.quantity * item.unit_price;

    updated[index] = item;
    setEditedItems(updated);
    recalculateSummaries(updated, editedMargin);
  };

  const addItemRow = () => {
    const defaultProduct = productTypes[0]?.id || 0;
    const newItem: QuotationItem = {
      product_type_id: defaultProduct,
      quantity: 1,
      unit_price: 25.00,
      total_price: 25.00,
      fabric_cost_per_item: 15.00,
      accessories_cost_per_item: 3.00,
      labor_cost_per_item: 7.00,
      size_breakdown: {
        fabric_id: fabricsList[0]?.id || null,
        sam_value: 2.0,
        design_number: 'DS-NEW',
        is_manual: true
      }
    };
    const updated = [...editedItems, newItem];
    setEditedItems(updated);
    recalculateSummaries(updated, editedMargin);
  };

  const removeItemRow = (index: number) => {
    const updated = editedItems.filter((_, idx) => idx !== index);
    setEditedItems(updated);
    recalculateSummaries(updated, editedMargin);
  };

  const handleGstChange = (val: string) => {
    setEditedGstPercent(val);
    recalculateSummaries(editedItems, editedMargin, val);
  };

  const handleMarginChange = (val: string) => {
    const margin = parseFloat(val) || 0;
    setEditedMargin(margin);

    const sugQuoteValue = editedExpenses * (1 + margin / 100);
    setEditedFinalValue(Math.round(sugQuoteValue * 100) / 100);
  };

  const handleSaveChanges = async (approveImmediate: boolean = false) => {
    if (!selectedQuotation) return;
    if (!editedTitle.trim()) {
      toast.error('Quotation Title is required');
      return;
    }
    if (editedItems.length === 0) {
      toast.error('At least one item line is required');
      return;
    }

    const nextStatus = approveImmediate ? 'Approved' : editedStatus;
    const finalTotalQty = editedItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
    const gstRate = parseFloat(editedGstPercent) || 0;
    const preTaxSubtotal = editedFinalValue / (1 + gstRate / 100);

    let compiledHtml = undefined;
    if (nextStatus === 'Approved') {
      const mockQuote: Quotation = {
        ...selectedQuotation,
        title: editedTitle.trim(),
        quotation_no: editedQuoteNo.trim(),
        organization_id: parseInt(editedOrgId),
        status: nextStatus,
        estimated_expenses: editedExpenses,
        total_estimated_time: editedTime,
        production_days_estimate: editedDays,
        expected_delivery_date: editedDeliveryDate || null,
        profit_margin_percent: editedMargin,
        final_quote_value: editedFinalValue,
        items: editedItems.map(item => ({
          ...item,
          product_types: item.product_types || productTypes.find(p => p.id === item.product_type_id)
        })),
        metrics_summary: {
          ...(selectedQuotation.metrics_summary || {}),
          total_entities: finalTotalQty,
          cover_letter: editedCoverLetter,
          gst_percent: gstRate,
          pre_tax_subtotal: Math.round(preTaxSubtotal * 100) / 100
        }
      };
      compiledHtml = compileQuotationHTML(mockQuote, fabricsList, companySettings);
    }

    const payload = {
      title: editedTitle.trim(),
      quotation_no: editedQuoteNo.trim(),
      organization_id: parseInt(editedOrgId),
      status: nextStatus,
      estimated_expenses: editedExpenses,
      total_estimated_time: editedTime,
      production_days_estimate: editedDays,
      expected_delivery_date: editedDeliveryDate || null,
      profit_margin_percent: editedMargin,
      final_quote_value: editedFinalValue,
      metrics_summary: {
        ...(selectedQuotation.metrics_summary || {}),
        total_entities: finalTotalQty,
        cover_letter: editedCoverLetter,
        gst_percent: gstRate,
        pre_tax_subtotal: Math.round(preTaxSubtotal * 100) / 100
      },
      pdf_html: compiledHtml,
      items: editedItems.map(item => ({
        product_type_id: item.product_type_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        fabric_cost_per_item: item.fabric_cost_per_item,
        accessories_cost_per_item: item.accessories_cost_per_item,
        labor_cost_per_item: item.labor_cost_per_item,
        size_breakdown: {
          fabric_id: item.size_breakdown?.fabric_id || null,
          sam_value: item.size_breakdown?.sam_value || null,
          design_number: item.size_breakdown?.design_number || null,
          is_manual: item.size_breakdown?.is_manual ?? true
        }
      }))
    };

    const loadingToast = toast.loading('Updating Quotation details...');
    try {
      await api.put(`/quotations/${selectedQuotation.id}`, payload);
      toast.success(approveImmediate ? 'Quotation saved & approved successfully!' : 'Quotation details saved successfully!', { id: loadingToast });
      setEditMode(false);
      fetchQuotations();

      const detailRes = await api.get(`/quotations/${selectedQuotation.id}`);
      setSelectedQuotation(detailRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update quotation details', { id: loadingToast });
    }
  };

  const pricing = getSelectedQuotePricing(selectedQuotation);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* BACK BUTTON AND ACTIONS MENU */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex items-center gap-2 shadow-sm rounded-xl py-2.5 border-zinc-200"
        >
          <ArrowLeft size={14} />
          Back to Operations Quotation Registry
        </Button>

        <div className="flex items-center gap-3 font-semibold">
          {!editMode ? (
            <>
              <Button
                onClick={() => handleDownloadPDF(selectedQuotation)}
                className="flex items-center gap-2 bg-[#3a525d] hover:bg-[#2d8d9b] text-white shadow-md rounded-xl py-2.5 text-xs font-black uppercase tracking-widest"
              >
                📥 Download Proposal PDF
              </Button>

              <Button
                variant="primary"
                onClick={startEditing}
                className="flex items-center gap-2 bg-[#2d8d9b] hover:bg-[#236e7a] text-white shadow-md rounded-xl py-2.5 text-xs font-black uppercase tracking-widest"
              >
                <Edit3 size={14} />
                Deep Edit Quotation
              </Button>

              {selectedQuotation.status !== 'Approved' && (
                <Button
                  variant="secondary"
                  onClick={() => handleApproveQuotation(selectedQuotation)}
                  className="flex items-center gap-1.5 border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-600 rounded-xl py-2 text-xs font-black uppercase tracking-widest bg-white"
                >
                  <Check size={14} />
                  Approve Quotation
                </Button>
              )}

              {selectedQuotation.status !== 'Rejected' && (
                <Button
                  variant="outline"
                  onClick={() => handleRejectQuotation(selectedQuotation)}
                  className="flex items-center gap-1.5 border-2 border-rose-500 hover:bg-rose-50 text-rose-600 rounded-xl py-2 text-xs font-black uppercase tracking-widest bg-white"
                >
                  <XCircle size={14} />
                  Reject Quotation
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={() => handleSaveChanges(false)}
                className="flex items-center gap-2 rounded-xl py-2.5"
              >
                <Check size={14} />
                Save Changes
              </Button>

              <Button
                variant="secondary"
                onClick={() => handleSaveChanges(true)}
                className="flex items-center gap-1.5 border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-600 rounded-xl py-2 bg-white"
              >
                <CheckCircle2 size={14} />
                Save & Approve
              </Button>

              <Button
                variant="outline"
                onClick={() => setEditMode(false)}
                className="rounded-xl py-2.5 border-zinc-200 hover:bg-zinc-50"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* DETAILED CARD CONTAINER */}
      <Card className="p-8 md:p-12 border border-zinc-150 rounded-[3rem] shadow-2xl bg-white space-y-10">

        {/* TOP HEADER BLOCK */}
        <div className="flex justify-between items-start border-b border-zinc-100 pb-8 flex-wrap gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10 tracking-widest font-mono">
                {editMode ? 'Editing mode' : 'Read-only audit'}
              </span>
              <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-zinc-50 text-zinc-500 border border-zinc-150 tracking-widest font-mono">
                {editMode ? editedQuoteNo : selectedQuotation.quotation_no}
              </span>
            </div>

            {editMode ? (
              <div className="space-y-2 max-w-xl">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Quotation Name / Title</label>
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Quotation Title"
                  className="text-xl font-bold bg-zinc-50 focus:bg-white text-[#3a525d] rounded-xl"
                />
              </div>
            ) : (
              <h3 className="text-3xl font-black tracking-tighter text-[#3a525d]">{selectedQuotation.title}</h3>
            )}
            <p className="text-xs font-bold text-zinc-400">Registered: {new Date(selectedQuotation.created_at).toLocaleString()}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</span>
            {editMode ? (
              <Select
                options={[
                  { label: 'Draft', value: 'Draft' },
                  { label: 'Pending', value: 'Pending' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'Rejected', value: 'Rejected' }
                ]}
                value={editedStatus}
                onChange={(val) => setEditedStatus(val)}
                className="rounded-xl font-bold text-xs uppercase text-[#3a525d] focus:ring-[#2d8d9b]/30 w-36"
              />
            ) : (
              <span className={`px-5 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-widest ${
                selectedQuotation.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                selectedQuotation.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                selectedQuotation.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                'bg-zinc-50 text-zinc-500 border-zinc-200'
              }`}>
                {selectedQuotation.status}
              </span>
            )}
          </div>
        </div>
        {/* CORE PARAMETERS GRID */}
        {editMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CUSTOMER ORG */}
            <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Customer Client</span>
                <Select
                  options={organizations.map(org => ({ label: org.name, value: String(org.id) }))}
                  value={editedOrgId}
                  onChange={(val) => setEditedOrgId(val)}
                  className="bg-white border-zinc-200 rounded-xl font-bold text-xs mt-1 w-full text-[#3a525d]"
                />
              </div>
            </Card>

            {/* ESTIMATED TIME */}
            <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Production Time Metrics</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="text"
                    value={editedTime}
                    onChange={(e) => setEditedTime(e.target.value)}
                    placeholder="E.g. 50 Hours"
                    className="bg-white text-xs font-bold rounded-xl text-center"
                  />
                  <Input
                    type="number"
                    value={editedDays}
                    onChange={(e) => setEditedDays(parseInt(e.target.value) || 0)}
                    placeholder="Days"
                    className="bg-white text-xs font-bold rounded-xl text-center"
                  />
                </div>
              </div>
            </Card>

            {/* MARGIN PERCENTAGE */}
            <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Profit Markup Margin</span>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={editedMargin}
                    onChange={(e) => handleMarginChange(e.target.value)}
                    className="bg-white font-mono font-bold text-xs rounded-xl"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
              </div>
            </Card>

            {/* EXPECTED DELIVERY DATE */}
            <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Target Delivery Date</span>
                <Input
                  type="date"
                  value={editedDeliveryDate}
                  onChange={(e) => setEditedDeliveryDate(e.target.value)}
                  className="bg-white font-mono font-bold text-xs rounded-xl mt-1"
                />
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Customer Client</p>
              <p className="text-base font-black text-[#3a525d] mt-1">
                {selectedQuotation.organizations?.name || 'Customer'}
              </p>
            </Card>

            <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Group Design Number</p>
              <p className="text-base font-black text-[#2d8d9b] mt-1">
                {selectedQuotation.group_design_number?.code || '—'}
              </p>
            </Card>

            <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Product</p>
              <p className="text-base font-black text-[#3a525d] mt-1">
                {selectedQuotation.items && selectedQuotation.items.some((item: any) => item.size_breakdown?.is_manual)
                  ? 'Multiple Manual Garment Lines'
                  : (selectedQuotation.items?.[0]?.product_types?.name || selectedQuotation.items?.[0]?.product_type_name || 'Uniform item')}
              </p>
            </Card>

            <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Production Time</p>
              <p className="text-base font-black text-[#3a525d] mt-1">{selectedQuotation.total_estimated_time || 'N/A'}</p>
              <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                ({selectedQuotation.production_days_estimate} Production Days)
              </p>
            </Card>

            <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b]">Expected Delivery Schedule</p>
              <p className="text-base font-black text-[#2d8d9b] mt-1">
                {formatDate(selectedQuotation.expected_delivery_date)}
              </p>
            </Card>

            <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Quotation Type</p>
              <p className="text-base font-black text-[#3a525d] mt-1">
                {(selectedQuotation.metrics_summary?.quotation_type === 'READYMADE' || selectedQuotation.metrics_summary?.quotation_type === 'HOLD') && 'Readymade'}
                {selectedQuotation.metrics_summary?.quotation_type === 'SET_TYPE' && 'Set Type'}
                {(!selectedQuotation.metrics_summary?.quotation_type || selectedQuotation.metrics_summary.quotation_type === 'STANDARD') && 'Standard'}
              </p>
            </Card>
          </div>
        )}

        {/* TWO COLUMN DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* 2/3 COLUMN: CONTENT */}
          <div className="md:col-span-2 space-y-6">

            {/* PROPOSAL COVER LETTER BANNER (READ-ONLY) */}
            {selectedQuotation.metrics_summary?.cover_letter && !editMode && (
              <div className="p-8 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-[2rem] space-y-4 mb-6">
                <div className="flex items-center gap-2 border-b border-[#2d8d9b]/10 pb-2">
                  <Building2 size={16} className="text-[#2d8d9b]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Proposal Cover Letter</span>
                </div>
                <p className="text-xs font-semibold text-zinc-600 whitespace-pre-wrap leading-relaxed italic">
                  {selectedQuotation.metrics_summary.cover_letter}
                </p>
              </div>
            )}

            {/* EDITABLE GARMENT LINES OR RICH READ-ONLY PRODUCT LINES BREAKDOWN */}
            {editMode ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                    Quotation Garment Line Items
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addItemRow}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#2d8d9b] hover:bg-[#2d8d9b]/5 text-[#2d8d9b] font-black h-8 text-[9px]"
                  >
                    <Plus size={10} />
                    Add Garment
                  </Button>
                </div>

                <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                        <th className="p-3">Product Type</th>
                        <th className="p-3">Fabric Catalog</th>
                        <th className="p-3">SAM Price (₹)</th>
                        <th className="p-3">Design Ref</th>
                        <th className="p-3 text-center w-20">Quantity</th>
                        <th className="p-3 text-right">Base Cost</th>
                        <th className="p-3 text-right">Selling Price</th>
                        <th className="p-3 text-right">Total Price</th>
                        <th className="p-3 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                      {editedItems.map((item, idx) => {
                        const totalBaseCost = (item.fabric_cost_per_item || 0) +
                          (item.accessories_cost_per_item || 0) +
                          (item.labor_cost_per_item || 0);

                        return (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            {/* PRODUCT TYPE / PRODUCT NAME */}
                            <td className="p-2">
                              <div className="font-bold text-[#3a525d] text-xs leading-tight">
                                {item.product_name || item.size_breakdown?.product_name || item.manual_item_name || 'Garment'}
                              </div>
                              <select
                                value={item.product_type_id}
                                onChange={(e) => handleItemChange(idx, 'product_type_id', e.target.value)}
                                className="bg-zinc-50 border border-zinc-200 rounded text-[10px] font-semibold text-zinc-500 mt-1 py-0.5 px-1 outline-none w-32"
                              >
                                {productTypes.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>

                            {/* FABRIC SELECT */}
                            <td className="p-2">
                              <select
                                value={item.size_breakdown?.fabric_id || ''}
                                onChange={(e) => handleItemChange(idx, 'fabric_id', e.target.value)}
                                className="bg-white border border-zinc-200 rounded-lg text-xs py-1 px-2 text-zinc-600 outline-none font-bold"
                              >
                                <option value="">No Fabric</option>
                                {fabricsList.map(f => (
                                  <option key={f.id} value={f.id}>{f.brand_name}</option>
                                ))}
                              </select>
                            </td>

                            {/* SAM VALUE */}
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.1"
                                value={item.size_breakdown?.sam_value || ''}
                                onChange={(e) => handleItemChange(idx, 'sam_value', e.target.value)}
                                className="bg-transparent border border-zinc-200 rounded-lg text-xs font-mono w-16 p-1 text-center font-bold"
                              />
                            </td>

                            {/* DESIGN NUMBER */}
                            <td className="p-2">
                              <Input
                                value={item.size_breakdown?.design_number || ''}
                                onChange={(e) => handleItemChange(idx, 'design_number', e.target.value)}
                                className="bg-transparent border border-zinc-200 rounded-lg text-xs w-20 p-1"
                              />
                            </td>

                            {/* QUANTITY */}
                            <td className="p-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className="bg-transparent border border-zinc-200 rounded-lg text-xs text-center w-16 font-black"
                              />
                            </td>

                            {/* BASE ACCUMULATED COST */}
                            <td className="p-2 text-right">
                              <div className="flex flex-col gap-1 text-[10px]">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[8px] opacity-60">Fab:</span>
                                  <input
                                    type="number"
                                    value={item.fabric_cost_per_item}
                                    onChange={(e) => handleItemChange(idx, 'fabric_cost_per_item', e.target.value)}
                                    className="w-12 text-right border border-zinc-200 rounded p-0.5"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[8px] opacity-60">Acc:</span>
                                  <input
                                    type="number"
                                    value={item.accessories_cost_per_item}
                                    onChange={(e) => handleItemChange(idx, 'accessories_cost_per_item', e.target.value)}
                                    className="w-12 text-right border border-zinc-200 rounded p-0.5"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[8px] opacity-60">Lab:</span>
                                  <input
                                    type="number"
                                    value={item.labor_cost_per_item}
                                    onChange={(e) => handleItemChange(idx, 'labor_cost_per_item', e.target.value)}
                                    className="w-12 text-right border border-zinc-200 rounded p-0.5"
                                  />
                                </div>
                                <span className="font-bold border-t border-zinc-100 pt-0.5 text-zinc-500 font-mono">₹{totalBaseCost.toFixed(2)}</span>
                              </div>
                            </td>

                            {/* SELLING PRICE */}
                            <td className="p-2">
                              <Input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                className="bg-transparent border border-[#2d8d9b]/30 focus:border-[#2d8d9b] rounded-lg text-xs font-black text-right w-20 text-[#2d8d9b] font-mono"
                              />
                            </td>

                            {/* TOTAL PRICE */}
                            <td className="p-2 text-right font-black text-[#2d8d9b] font-mono">
                              ₹{Number(item.total_price || 0).toFixed(2)}
                            </td>

                            {/* ACTION DELETE */}
                            <td className="p-2 text-center">
                              <button
                                onClick={() => removeItemRow(idx)}
                                className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* FOOTER TOTALS */}
                    <tfoot>
                      <tr className="bg-zinc-50/50 font-black text-[#3a525d] border-t border-zinc-150">
                        <td colSpan={2} className="p-4 uppercase text-[9px] tracking-widest text-[#3a525d]">Sum totals:</td>
                        <td className="p-4 font-mono font-black">
                          ₹{(editedItems.reduce((acc, it) => acc + ((it.size_breakdown?.sam_value || 0) * (it.quantity || 0)), 0)).toFixed(2)}
                        </td>
                        <td></td>
                        <td className="p-4 text-center text-sm">
                          {editedItems.reduce((acc, it) => acc + (it.quantity || 0), 0)} Qty
                        </td>
                        <td className="p-4 text-right font-mono text-xs text-zinc-400">
                          ₹{(editedItems.reduce((acc, it) => {
                            const totalBaseCost = (it.fabric_cost_per_item || 0) + (it.accessories_cost_per_item || 0) + (it.labor_cost_per_item || 0);
                            return acc + (totalBaseCost * (it.quantity || 0));
                          }, 0)).toFixed(2)}
                        </td>
                        <td></td>
                        <td className="p-4 text-right text-base text-[#2d8d9b] font-mono font-black">
                          ₹{(editedItems.reduce((acc, it) => acc + (it.total_price || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* RICH READ-ONLY PRODUCT LINES BREAKDOWN (MATCHING QUOTATION HISTORY) */
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product Lines Breakdown</h4>
                <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100">
                        <th className="p-3">Product Type</th>
                        <th className="p-3">Fabric Options</th>
                        <th className="p-3">SAM Cost</th>
                        <th className="p-3">Design Number</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                      {(() => {
                        const standardItems = (selectedQuotation.items || []).filter((item: any) => !item.size_breakdown?.is_separate_fabric);
                        const hasDeptItems = standardItems.some((item: any) => item.size_breakdown?.department_name);

                        if (hasDeptItems) {
                          const groups: Record<string, any[]> = {};
                          standardItems.forEach((item: any) => {
                            const deptName = item.size_breakdown?.department_name || 'General Items';
                            const cleanDept = getCleanDeptName(deptName);
                            if (!groups[cleanDept]) {
                              groups[cleanDept] = [];
                            }
                            groups[cleanDept].push(item);
                          });

                          return Object.entries(groups).flatMap(([cleanDeptName, groupItems]) => [
                            <tr key={`header-${cleanDeptName}`} className="bg-zinc-50/80 border-t border-b border-zinc-150 text-[10px] font-black uppercase text-[#3a525d] tracking-wider">
                              <td colSpan={7} className="p-3 font-black">DEPARTMENT: {cleanDeptName}</td>
                            </tr>,
                            ...groupItems.map((item: any, idx: number) => {
                              const pTypeName = item.product_name || item.size_breakdown?.product_name || item.manual_item_name || item.product_types?.name || item.product_type_name || productTypes.find(p => p.id === item.product_type_id)?.name || 'Uniform Item';
                              const deptId = item.size_breakdown?.department_id;
                              const qty = Number(item.quantity) || 0;
                              
                              const deptMeta = selectedQuotation.metrics_summary?.departments?.find((d: any) => String(d.id) === String(deptId));
                              let divisionName = '';
                              if (deptMeta && deptMeta.division) {
                                divisionName = deptMeta.division;
                              } else if (String(deptId).includes('_')) {
                                divisionName = String(deptId).split('_')[1];
                              }
                              if (!divisionName && item.size_breakdown?.department_name) {
                                divisionName = getCleanDivision(item.size_breakdown.department_name);
                              }

                              const persons = deptMeta ? deptMeta.persons : Math.ceil(qty / 2);
                              const sets = deptMeta ? deptMeta.sets : 2;
                              const divisionLabel = divisionName ? `Division: ${divisionName}` : 'Main Division';
                              const deptHeader = `${divisionLabel} (${persons} Persons × ${sets} Sets)`;

                              const designNotes = item.size_breakdown?.design_number || '';
                              const selectedSize = item.size_breakdown?.selected_size;
                              const sizeLabel = selectedSize ? ` (Size: ${selectedSize})` : '';
                              const productLine = designNotes ? `* ${pTypeName}${sizeLabel} - ${designNotes}` : `* ${pTypeName}${sizeLabel}`;
                              
                              const fabricId = item.size_breakdown?.fabric_id;
                              const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));
                              
                              const att1Id = item.size_breakdown?.attachment_fabric1_id;
                              const att1Fabric = fabricsList.find((f: any) => String(f.id) === String(att1Id));
                              
                              const att2Id = item.size_breakdown?.attachment_fabric2_id;
                              const att2Fabric = fabricsList.find((f: any) => String(f.id) === String(att2Id));

                              const firstCellJSX = (
                                <div className="space-y-0.5 py-1 text-left">
                                  <div className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider">{deptHeader}</div>
                                  <div className="font-bold text-[#3a525d] text-xs">{productLine}</div>
                                </div>
                              );

                              const fabricStyleJSX = (
                                <div className="space-y-1 py-1 text-left text-xs">
                                  {fabricId ? (
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider border border-amber-200/60">FAB(M)</span>
                                        <span className="font-bold text-zinc-700">{getFabricTitle(fabric)}</span>
                                      </div>
                                      {item.size_breakdown?.main_fabric_meters && (
                                        <span className="text-[10px] text-zinc-400 pl-1">{item.size_breakdown.main_fabric_meters}m</span>
                                      )}
                                    </div>
                                  ) : null}
                                  {att1Id ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[9px] font-black uppercase tracking-wider border border-zinc-200/60">FAB(A1)</span>
                                      <span className="text-zinc-600 font-medium text-[11px]">{getFabricTitle(att1Fabric)}</span>
                                    </div>
                                  ) : null}
                                  {att2Id ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[9px] font-black uppercase tracking-wider border border-zinc-200/60">FAB(A2)</span>
                                      <span className="text-zinc-600 font-medium text-[11px]">{getFabricTitle(att2Fabric)}</span>
                                    </div>
                                  ) : null}
                                  {!fabricId && !att1Id && !att2Id && (
                                    <span className="text-zinc-350">—</span>
                                  )}
                                </div>
                              );

                              const designNum = item.size_breakdown?.product_design_number || item.size_breakdown?.design_number || '—';
                              const sam = item.size_breakdown?.sam_value ? `₹ ${Number(item.size_breakdown.sam_value).toFixed(2)}` : 'N/A';
                              const price = Number(item.unit_price) || 0;
                              const total = Number(item.total_price) || 0;

                              return (
                                <tr key={`${cleanDeptName}-${item.id || idx}`} className="hover:bg-zinc-50/50 bg-white">
                                  <td className="p-3">{firstCellJSX}</td>
                                  <td className="p-3">{fabricStyleJSX}</td>
                                  <td className="p-3 font-mono">{sam}</td>
                                  <td className="p-3 text-zinc-550 text-xs">{designNum}</td>
                                  <td className="p-3 text-right font-black">{qty}</td>
                                  <td className="p-3 text-right font-mono">₹{price.toFixed(2)}</td>
                                  <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">₹{total.toFixed(2)}</td>
                                </tr>
                              );
                            })
                          ]);
                        } else {
                          return standardItems.map((item: any, idx: number) => {
                            const pTypeName = item.product_name || item.size_breakdown?.product_name || item.manual_item_name || item.product_types?.name || item.product_type_name || productTypes.find(p => p.id === item.product_type_id)?.name || 'Uniform Item';
                            const fabricId = item.size_breakdown?.fabric_id;
                            const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));

                            const className = item.size_breakdown?.class_name;
                            const classPrefix = className ? `[${className}] ` : '';
                            const selectedSize = item.size_breakdown?.selected_size;
                            const sizeLabel = selectedSize ? ` (Size: ${selectedSize})` : '';
                            
                            const firstCellJSX = <span className="font-black text-[#3a525d]">{classPrefix}{pTypeName}{sizeLabel}</span>;
                            const fabricStyleJSX = (
                              <div className="space-y-0.5 text-xs font-semibold text-zinc-700">
                                {fabricId ? <span>{getFabricTitle(fabric)}</span> : <span className="text-zinc-350">—</span>}
                              </div>
                            );

                            const designNum = item.size_breakdown?.product_design_number || item.size_breakdown?.design_number || '—';
                            const sam = item.size_breakdown?.sam_value ? `₹ ${Number(item.size_breakdown.sam_value).toFixed(2)}` : 'N/A';
                            const price = Number(item.unit_price) || 0;
                            const total = Number(item.total_price) || 0;

                            return (
                              <tr key={item.id || idx} className="hover:bg-zinc-50/50 bg-white">
                                <td className="p-3">{firstCellJSX}</td>
                                <td className="p-3">{fabricStyleJSX}</td>
                                <td className="p-3 font-mono">{sam}</td>
                                <td className="p-3">
                                  {item.size_breakdown?.product_design_number ? (
                                    <span className="font-bold text-[#2d8d9b] block">{item.size_breakdown.product_design_number}</span>
                                  ) : null}
                                  {item.size_breakdown?.design_number ? (
                                    <span className="text-zinc-500 text-[10px] font-semibold">{item.size_breakdown.design_number}</span>
                                  ) : '—'}
                                </td>
                                <td className="p-3 text-right font-black">{item.quantity}</td>
                                <td className="p-3 text-right font-mono">₹{price.toFixed(2)}</td>
                                <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">₹{total.toFixed(2)}</td>
                              </tr>
                            );
                          });
                        }
                      })()}
                    </tbody>
                    {/* FOOTER TOTALS */}
                    <tfoot>
                      <tr className="bg-zinc-50/50 font-black text-[#3a525d] border-t border-zinc-150">
                        <td colSpan={4} className="p-3 uppercase text-[9px] tracking-widest text-[#3a525d]">Total:</td>
                        <td className="p-3 text-right font-black text-sm">
                          {(selectedQuotation.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)} Qty
                        </td>
                        <td></td>
                        <td className="p-3 text-right text-base text-[#2d8d9b] font-mono font-black">
                          ₹{((selectedQuotation.items || []).reduce((acc, it) => acc + (Number(it.total_price) || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SEPARATE FABRICS TABLE */}
            {!editMode && selectedQuotation.metrics_summary?.separate_fabrics && selectedQuotation.metrics_summary.separate_fabrics.length > 0 && (
              <div className="space-y-3 pt-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Separate Fabric Materials Supplied</h4>
                <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm max-w-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100">
                        <th className="p-3 pl-4">Fabric Details</th>
                        <th className="p-3 text-right">Meters</th>
                        <th className="p-3 text-right">Rate/Meter</th>
                        <th className="p-3 text-right pr-4">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-650">
                      {selectedQuotation.metrics_summary.separate_fabrics.map((sf: any, idx: number) => {
                        const fabric = fabricsList.find((f: any) => String(f.id) === String(sf.fabric_id));
                        const fabricName = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
                        const shade = fabric?.shade ? ` (Shade: ${fabric.shade})` : '';
                        const width = fabric?.width ? ` - Width: ${fabric.width}"` : '';
                        const meters = Number(sf.meters) || 0;
                        const rate = Number(sf.rate) || 0;
                        const total = meters * rate;

                        return (
                          <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="p-3 pl-4 font-black text-[#3a525d]">{fabricName}{shade}{width}</td>
                            <td className="p-3 text-right">{meters} m</td>
                            <td className="p-3 text-right font-mono">₹{rate.toFixed(2)}</td>
                            <td className="p-3 text-right font-black text-[#2d8d9b] pr-4 font-mono">₹{total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DEPARTMENTS INCLUDED TABLE */}
            {!editMode && selectedQuotation.metrics_summary?.departments && selectedQuotation.metrics_summary.departments.length > 0 && (
              <div className="space-y-3 pt-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Departments Included</h4>
                <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm max-w-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100">
                        <th className="p-3 pl-4">Department Name</th>
                        <th className="p-3">Division</th>
                        <th className="p-3 text-right">No. of Persons</th>
                        <th className="p-3 text-right">Sets / Person</th>
                        <th className="p-3 text-right pr-4">Total Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-650">
                      {selectedQuotation.metrics_summary.departments.map((dept: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-3 pl-4 font-black text-[#3a525d]">{dept.name}</td>
                          <td className="p-3 text-zinc-400">{dept.division || '—'}</td>
                          <td className="p-3 text-right">{dept.persons}</td>
                          <td className="p-3 text-right">{dept.sets}</td>
                          <td className="p-3 text-right font-black text-[#2d8d9b] pr-4">{dept.persons * dept.sets}</td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-zinc-50/50 border-t border-zinc-250/60 text-[10px] font-black uppercase text-[#3a525d]">
                        <td className="p-3 pl-4" colSpan={2}>Total</td>
                        <td className="p-3 text-right">
                          {selectedQuotation.metrics_summary.departments.reduce((sum: number, d: any) => sum + (d.persons || 0), 0)}
                        </td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right text-[#2d8d9b] pr-4">
                          {selectedQuotation.metrics_summary.departments.reduce((sum: number, d: any) => sum + ((d.persons || 0) * (d.sets || 0)), 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EDIT MODE COVER LETTER SECTION */}
            {editMode && (
              <div className="space-y-4 pt-6 border-t border-zinc-100 animate-in fade-in duration-500">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                    Proposal Cover Letter (100% Customizable)
                  </h4>
                  <button
                    type="button"
                    onClick={generateAutoCoverLetter}
                    className="px-3.5 py-1.5 bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    ✨ Auto-Generate Cover Letter Template
                  </button>
                </div>
                <textarea
                  rows={6}
                  placeholder="Enter custom cover letter introduction for the client proposal..."
                  className="w-full bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 transition-all leading-relaxed"
                  value={editedCoverLetter}
                  onChange={(e) => setEditedCoverLetter(e.target.value)}
                />
              </div>
            )}

          </div>

          {/* 1/3 COLUMN: REVENUE & FINANCIAL SUMMARY */}
          <div className="space-y-6">

            {/* REVENUE STATISTICS AUDIT */}
            <Card className="p-8 border border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2.5rem] flex flex-col justify-between h-full space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#3a525d]">
                  <Scale size={18} />
                  <h4 className="text-xs font-black uppercase tracking-widest">Financial Operations Audit</h4>
                </div>

                <div className="space-y-3 divide-y divide-zinc-200/50 text-sm font-semibold">
                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>Total Members Quantity:</span>
                    <span className="text-[#3a525d] font-black">
                      {selectedQuotation.metrics_summary?.total_entities || (editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)} Items
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>Accumulated Base Expenses:</span>
                    <span className="font-mono text-[#3a525d]">
                      ₹{(editMode ? editedExpenses : selectedQuotation.estimated_expenses).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>Profit Markup Margin:</span>
                    <span className="font-mono text-green-600">
                      +{editMode ? editedMargin : selectedQuotation.profit_margin_percent}%
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-[#3a525d] font-bold">
                    <span>Subtotal (Pre-Tax):</span>
                    <span className="font-mono text-[#3a525d]">
                      ₹{(editMode
                        ? editedItems.reduce((acc, it) => acc + (it.total_price || 0), 0)
                        : pricing.subtotal
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-zinc-500 items-center">
                    <span>GST Tax Rate (%):</span>
                    {editMode ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editedGstPercent}
                          onChange={(e) => handleGstChange(e.target.value)}
                          className="bg-white border-[#2d8d9b]/20 text-[#3a525d] font-mono font-bold text-xs rounded-xl w-16 text-center h-8"
                        />
                        <span className="text-xs text-zinc-400 font-bold">%</span>
                      </div>
                    ) : (
                      <span className="font-mono text-red-500 font-bold">
                        {pricing.gstRate}%
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>GST Tax Value:</span>
                    <span className="font-mono text-red-500 font-bold">
                      ₹{(editMode
                        ? (editedItems.reduce((acc, it) => acc + (it.total_price || 0), 0) * (parseFloat(editedGstPercent) || 0) / 100)
                        : pricing.gstValue
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-zinc-500">
                    <span>Suggested Retail/Item (Pre-Tax):</span>
                    <span className="font-mono text-[#2d8d9b] font-black">
                      ₹{(
                        (editMode
                          ? editedItems.reduce((acc, it) => acc + (it.total_price || 0), 0)
                          : pricing.subtotal) /
                        Math.max(1, (selectedQuotation.metrics_summary?.total_entities || (editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)))
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-6 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">
                  Total Contract Value (With GST)
                </p>
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-[#2d8d9b] font-mono">₹</span>
                    <Input
                      type="number"
                      value={editedFinalValue}
                      onChange={(e) => setEditedFinalValue(parseFloat(e.target.value) || 0)}
                      className="bg-white border-[#2d8d9b]/30 focus:border-[#2d8d9b] text-xl font-mono font-black text-[#2d8d9b] rounded-xl"
                    />
                  </div>
                ) : (
                  <p className="text-4xl font-black tracking-tighter text-[#2d8d9b] font-mono">
                    ₹{Number(selectedQuotation.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </Card>

          </div>

        </div>

      </Card>

    </div>
  );
};
