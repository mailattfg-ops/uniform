'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  Trash2,
  Eye,
  ArrowLeft,
  Check,
  Building2,
  Ruler,
  Scale,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Percent,
  Calendar,
  Layers,
  Users,
  Edit3,
  XCircle,
  Plus,
  Mail,
  Send,
  Paperclip,
  MessageCircle,
  Phone
} from 'lucide-react';

interface Organization {
  id: number;
  name: string;
}

interface ProductType {
  id: number;
  name: string;
}

interface Fabric {
  id: string;
  brand_name: string;
}

interface QuotationItem {
  id?: number;
  product_type_id: number;
  product_type_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fabric_cost_per_item: number;
  accessories_cost_per_item: number;
  labor_cost_per_item: number;
  size_breakdown?: {
    fabric_id?: string | null;
    sam_value?: number | null;
    design_number?: string | null;
    is_manual?: boolean;
  };
  product_types?: {
    id: number;
    name: string;
  };
}

interface Quotation {
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
  items?: QuotationItem[];
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

export default function OperationTeamPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [fabricsList, setFabricsList] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

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

  const [deleteCandidate, setDeleteCandidate] = useState<Quotation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const [messageCandidate, setMessageCandidate] = useState<Quotation | null>(null);
  const [messageRecipient, setMessageRecipient] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageChannel, setMessageChannel] = useState<'email' | 'whatsapp'>('email');
  const [messagePhone, setMessagePhone] = useState('');

  // Load baseline data
  useEffect(() => {
    fetchQuotations();
    fetchOrganizations();
    fetchProductTypes();
    fetchFabrics();
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
      setEditMode(false);
    } catch (err) {
      toast.error('Failed to load quotation details');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract pricing totals
  const getSelectedQuotePricing = (quote: Quotation) => {
    const finalValue = Number(quote.final_quote_value) || 0;
    const gstRate = Number(quote.metrics_summary?.gst_percent ?? 18);
    const subtotal = Number(quote.metrics_summary?.pre_tax_subtotal ?? (finalValue / (1 + gstRate / 100)));
    const gstValue = finalValue - subtotal;
    return {
      finalValue,
      gstRate,
      subtotal,
      gstValue
    };
  };

  // PDF Downloader for operations
  const handleDownloadPDF = (quote: Quotation) => {
    const pricing = getSelectedQuotePricing(quote);
    const orgName = quote.organizations?.name || 'Customer';
    const dateStr = new Date(quote.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    const deliveryDateStr = quote.expected_delivery_date
      ? new Date(quote.expected_delivery_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
      : 'N/A';

    // Construct items HTML
    let itemsHtml = '';
    if (quote.items && quote.items.length > 0) {
      quote.items.forEach((item: any) => {
        const pTypeName = item.product_types?.name || item.product_type_name || 'Uniform Item';
        const fabricId = item.size_breakdown?.fabric_id;
        const fabricBrand = fabricsList.find((f: any) => String(f.id) === String(fabricId))?.brand_name || 'Custom Fabric';
        const designNum = item.size_breakdown?.design_number || '—';
        const sam = item.size_breakdown?.sam_value ? `$ ${Number(item.size_breakdown.sam_value).toFixed(2)}` : '—';
        const qty = item.quantity || 0;
        const price = Number(item.unit_price) || 0;
        const total = Number(item.total_price) || 0;

        itemsHtml += `
          <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3.5 px-4 font-bold text-gray-800 text-xs">${pTypeName}</td>
            <td class="py-3.5 px-4 text-gray-600 text-xs">${fabricBrand}</td>
            <td class="py-3.5 px-4 text-gray-600 text-xs">${designNum}</td>
            <td class="py-3.5 px-4 text-gray-600 text-xs text-center font-mono">${sam}</td>
            <td class="py-3.5 px-4 text-gray-800 text-xs text-right font-black">${qty}</td>
            <td class="py-3.5 px-4 text-gray-700 text-xs text-right font-mono">$ ${price.toFixed(2)}</td>
            <td class="py-3.5 px-4 text-[#2d8d9b] text-xs text-right font-black font-mono">$ ${total.toFixed(2)}</td>
          </tr>
        `;
      });
    }

    // Build overall print document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Failed to open PDF generation window. Please allow popups.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proposal_${quote.quotation_no}</title>
        <!-- Load premium fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
        <!-- Load Tailwind for layout rendering -->
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Inter', 'sans-serif'],
                  outfit: ['Outfit', 'sans-serif'],
                }
              }
            }
          }
        </script>
        <style>
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none;
            }
          }
          body {
            font-family: 'Inter', sans-serif;
          }
          h1, h2, h3 {
            font-family: 'Outfit', sans-serif;
          }
        </style>
      </head>
      <body class="bg-white p-8 md:p-12 text-gray-800">
        
        <!-- PRINT TOOLBAR (NO-PRINT) -->
        <div class="no-print mb-8 p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
            <p class="text-xs font-bold text-gray-600">Quotation Proposal PDF ready for printing/saving.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.print()" class="px-5 py-2 bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow transition-all">
              Print / Save as PDF
            </button>
            <button onclick="window.close()" class="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition-all">
              Close Preview
            </button>
          </div>
        </div>

        <!-- COMPOSER FRAME -->
        <div class="max-w-4xl mx-auto border border-gray-150 p-8 md:p-10 rounded-[2.5rem] shadow-sm relative bg-white">
          
          <!-- LETTERHEAD BRANDING -->
          <div class="flex justify-between items-start border-b-2 border-gray-100 pb-8 flex-wrap gap-4">
            <div>
              <div class="flex items-center gap-2.5">
                <!-- SVG Gradient Logo -->
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3a525d] to-[#2d8d9b] flex items-center justify-center text-white shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.61 3.51a6 6 0 0 1 5.98 10.86Z" />
                  </svg>
                </div>
                <span class="text-xl font-black italic tracking-tighter text-[#3a525d] font-outfit">INLAND UNIFORMS</span>
              </div>
              <p class="text-[9px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] mt-1.5 pl-0.5">Corporate Apparel & Sizing Specialists</p>
              <p class="text-[10px] text-gray-400 mt-2 font-medium">102 Industrial Avenue, Sector 4, New Delhi<br/>info@inlanduniforms.com | +91 9988776655</p>
            </div>

            <div class="text-right">
              <span class="px-3 py-1 bg-[#2d8d9b]/10 text-[#2d8d9b] font-black text-[9px] uppercase tracking-widest rounded-lg border border-[#2d8d9b]/15 inline-block">
                ${quote.status} Proposal
              </span>
              <h1 class="text-xl font-black text-gray-800 mt-2 font-outfit">${quote.quotation_no}</h1>
              <p class="text-xs text-gray-500 font-bold mt-1">Date: ${dateStr}</p>
            </div>
          </div>

          <!-- CLIENT & TARGET INFO -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-gray-100 text-xs">
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prepared For</p>
              <p class="text-sm font-black text-gray-800 mt-1">${orgName}</p>
              <p class="text-gray-500 mt-0.5 font-medium">Associated Uniform Contract Client</p>
            </div>
            <div class="md:text-right">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Expected Delivery Target</p>
              <p class="text-sm font-black text-[#2d8d9b] mt-1">${deliveryDateStr}</p>
              <p class="text-gray-500 mt-0.5 font-medium">Est. Days: ${quote.production_days_estimate} Production Days</p>
            </div>
          </div>

          <!-- CUSTOM COVER LETTER SECTION -->
          ${quote.metrics_summary?.cover_letter ? `
            <div class="py-8 border-b border-gray-100">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Letter of Proposal</p>
              <div class="text-xs text-gray-600 leading-relaxed font-semibold whitespace-pre-wrap italic bg-gray-50/50 p-6 rounded-2xl border border-gray-150">
                ${quote.metrics_summary.cover_letter}
              </div>
            </div>
          ` : ''}

          <!-- SPECIFICATIONS TABLE -->
          <div class="py-8">
            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Quotation Product Specifications</p>
            <div class="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest text-gray-500">
                    <th class="py-3 px-4">Garment Line</th>
                    <th class="py-3 px-4">Fabric Style</th>
                    <th class="py-3 px-4">Design Num</th>
                    <th class="py-3 px-4 text-center font-mono">SAM (₹)</th>
                    <th class="py-3 px-4 text-right">Quantity</th>
                    <th class="py-3 px-4 text-right">Unit Price</th>
                    <th class="py-3 px-4 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 font-semibold">
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <!-- PRICING & GST COMPILATION -->
          <div class="flex justify-end py-6 border-t border-gray-100">
            <div class="w-80 space-y-3.5 text-xs font-bold text-gray-500">
              <div class="flex justify-between">
                <span>Subtotal (Pre-Tax):</span>
                <span class="font-mono text-gray-800 font-black">$ ${pricing.subtotal.toFixed(2)}</span>
              </div>
              <div class="flex justify-between border-b border-gray-100 pb-2">
                <span>GST Tax (${pricing.gstRate}%):</span>
                <span class="font-mono text-red-500 font-black">$ ${pricing.gstValue.toFixed(2)}</span>
              </div>
              <div class="flex justify-between items-end pt-2 text-[#2d8d9b]">
                <div>
                  <p class="text-[9px] font-black uppercase text-gray-400 tracking-wider">Total Contract Value</p>
                  <p class="text-2xl font-black italic font-outfit mt-0.5">$ ${pricing.finalValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- SIGNATURES BLOCK -->
          <div class="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-100 text-xs">
            <div class="space-y-12">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Authorized By</p>
              <div class="border-t border-gray-200 pt-3">
                <p class="font-black text-gray-800">Inland Uniforms Representative</p>
                <p class="text-gray-400 text-[10px] font-medium mt-0.5">Title: Operations Desk Manager</p>
              </div>
            </div>
            <div class="space-y-12 text-right">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Accepted By</p>
              <div class="border-t border-gray-200 pt-3">
                <p class="font-black text-gray-800">Client Signatory Authority</p>
                <p class="text-gray-400 text-[10px] font-medium mt-0.5">Organization: ${orgName}</p>
              </div>
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Switch to Edit Mode and copy selected quotation data to editable states
  const startEditing = () => {
    if (!selectedQuotation) return;
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
    setEditedGstPercent(selectedQuotation.metrics_summary?.gst_percent ? String(selectedQuotation.metrics_summary.gst_percent) : '18');
    setEditMode(true);
  };

  // Helper to generate dynamic cover letter templates
  const generateAutoCoverLetter = () => {
    const orgName = organizations.find(o => String(o.id) === String(editedOrgId))?.name || 'Customer';
    const contractTitle = editedTitle.trim() || 'Uniform Contract Proposal';
    const template = `Dear Team at ${orgName},

Thank you for giving Inland Uniforms the opportunity to submit our proposal for the "${contractTitle}".

We are pleased to present our comprehensive uniform solutions tailored specifically for your organization. Based on our sizing audit and detailed requirements analysis, we have compiled an optimized production schedule and cost estimate to ensure maximum comfort, perfect fit compliance, and durability.

Please find the detailed sizing breakdown and cost compilation in the attached table. We look forward to partnering with your organization to deliver top-tier corporate garments that embody your brand's identity.

Should you have any questions or require custom modifications to this proposal, please do not hesitate to reach out to our team.

Sincerely,

Operations & Accounts Team
Inland Uniforms Co.`;
    setEditedCoverLetter(template);
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

  // Immediate Approve
  const handleApproveQuotation = async (quote: Quotation) => {
    const loadingToast = toast.loading('Approving quotation...');
    try {
      // Fetch full details if not loaded
      const res = await api.get(`/quotations/${quote.id}`);
      const fullQuote = res.data;

      const payload = {
        ...fullQuote,
        status: 'Approved'
      };

      await api.put(`/quotations/${quote.id}`, payload);
      toast.success('Quotation approved successfully!', { id: loadingToast });
      fetchQuotations();

      // Update selected quotation view if active
      if (selectedQuotation && selectedQuotation.id === quote.id) {
        setSelectedQuotation({
          ...selectedQuotation,
          status: 'Approved'
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve quotation', { id: loadingToast });
    }
  };

  // Immediate Reject
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

      if (selectedQuotation && selectedQuotation.id === quote.id) {
        setSelectedQuotation({
          ...selectedQuotation,
          status: 'Rejected'
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject quotation', { id: loadingToast });
    }
  };

  // Open Message Modal with dynamically populated client context
  const handleOpenMessageModal = (quote: Quotation) => {
    const orgCleanName = (quote.organizations?.name || 'customer')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const recipient = `info@${orgCleanName}.com`;
    const subject = `Quotation Proposal #${quote.quotation_no} - Inland Uniforms`;

    // Highly professional premium pre-filled mail body
    const body = `Dear Team,

We are pleased to inform you that the operations desk has officially reviewed and approved the contract proposal for "${quote.title}" (${quote.quotation_no}).

The total contract value is finalized at $${Number(quote.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })} (inclusive of GST). The secure, operations-verified vector PDF proposal containing detailed sizing breakdowns, technical specifications, and production timelines has been compiled and is securely enclosed as an attachment.

Please review the attached documents and let us know if you have any questions or are ready to proceed with contract execution.

Best regards,

Operations Desk Team
Inland Uniforms Co.`;

    setMessageCandidate(quote);
    setMessageRecipient(recipient);
    setMessageSubject(subject);
    setMessageBody(body);
    setMessageChannel('email');
    setMessagePhone('');
  };

  // Switch format to WhatsApp custom markdown syntax
  const switchToWhatsApp = () => {
    if (!messageCandidate) return;
    setMessageChannel('whatsapp');

    // Highly formatted WhatsApp text
    const waBody = `Hello *${messageCandidate.organizations?.name || 'Customer'}* Team,

We are pleased to inform you that the operations desk has reviewed and approved the contract proposal for *"${messageCandidate.title}"* (${messageCandidate.quotation_no}).

Total finalized contract value: *$${Number(messageCandidate.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}* (inclusive of GST).

The secure, operations-verified vector PDF proposal containing detailed sizing breakdowns, technical specifications, and production timelines has been compiled. We have dispatched a copy to your email, and you can also download or view the details directly under your Inland Uniforms portal.

Please let us know if you have any questions or are ready to proceed with contract execution!

Best regards,
*Operations Desk Team*
*Inland Uniforms Co.*`;

    setMessageBody(waBody);
  };

  // Switch format back to formal Email structure
  const switchToEmail = () => {
    if (!messageCandidate) return;
    setMessageChannel('email');

    const emailBody = `Dear Team,

We are pleased to inform you that the operations desk has officially reviewed and approved the contract proposal for "${messageCandidate.title}" (${messageCandidate.quotation_no}).

The total contract value is finalized at $${Number(messageCandidate.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })} (inclusive of GST). The secure, operations-verified vector PDF proposal containing detailed sizing breakdowns, technical specifications, and production timelines has been compiled and is securely enclosed as an attachment.

Please review the attached documents and let us know if you have any questions or are ready to proceed with contract execution.

Best regards,

Operations Desk Team
Inland Uniforms Co.`;

    setMessageBody(emailBody);
  };

  // Dispatch secure package with dynamic loaders
  const handleSendMessage = async () => {
    if (!messageRecipient.trim() || !messageSubject.trim() || !messageBody.trim()) {
      toast.error('Please fill in all email fields');
      return;
    }

    setIsSendingMessage(true);
    const loadingToast = toast.loading('Initiating secure delivery...');

    setTimeout(() => {
      toast.loading('Compiling and digitally signing vector proposal PDF...', { id: loadingToast });

      setTimeout(() => {
        toast.loading('Dispatching encrypted document package to client...', { id: loadingToast });

        setTimeout(() => {
          toast.success('Proposal PDF sent to customer successfully!', { id: loadingToast });
          setIsSendingMessage(false);
          setMessageCandidate(null);
        }, 800);
      }, 800);
    }, 800);
  };

  // Dispatch secure package to WhatsApp Web API
  const handleSendWhatsApp = () => {
    if (!messagePhone.trim()) {
      toast.error('Please enter a valid WhatsApp mobile number');
      return;
    }
    if (!messageBody.trim()) {
      toast.error('Message body cannot be empty');
      return;
    }

    // Clean phone number: remove all non-digits, keep '+' if present
    const cleanedPhone = messagePhone.replace(/[^0-9+]/g, '');

    // Encode text for WhatsApp API Link
    const encodedText = encodeURIComponent(messageBody);

    // Construct standard WhatsApp Link
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedText}`;

    // Open in a new tab
    const chatWindow = window.open(whatsappUrl, '_blank');
    if (!chatWindow) {
      toast.error('Failed to open WhatsApp window. Please allow popups.');
      return;
    }

    toast.success('WhatsApp API message dispatch initiated!');
    setMessageCandidate(null);
  };

  // Save changes from Edit Mode
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

      // Reload deep details
      const detailRes = await api.get(`/quotations/${selectedQuotation.id}`);
      setSelectedQuotation(detailRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update quotation details', { id: loadingToast });
    }
  };

  // Item helpers for edit mode
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

    // Auto recalculations
    const calculatedUnitPrice = item.fabric_cost_per_item + item.accessories_cost_per_item + item.labor_cost_per_item;
    // If unit price wasn't manually overridden or if they edit components, sync it
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

  // Recalculates estimated expenses, sug selling price, and final value
  const recalculateSummaries = (items: QuotationItem[], margin: number, gstRateStr: string = editedGstPercent) => {
    const totalAccExpenses = items.reduce((acc, it) => {
      const perCost = (it.fabric_cost_per_item || 0) + (it.accessories_cost_per_item || 0) + (it.labor_cost_per_item || 0);
      return acc + (perCost * (it.quantity || 0));
    }, 0);
    setEditedExpenses(Math.round(totalAccExpenses * 100) / 100);

    // Sum of items base selling prices (Pre-Tax Subtotal)
    const sumSellingPrices = items.reduce((acc, it) => acc + (it.total_price || 0), 0);
    const gstRate = parseFloat(gstRateStr) || 0;
    const gstVal = sumSellingPrices * (gstRate / 100);
    const finalVal = sumSellingPrices + gstVal;

    setEditedFinalValue(Math.round(finalVal * 100) / 100);

    // Calculate dynamic production hours
    const totalMinutes = items.reduce((acc, it) => {
      const sam = it.size_breakdown?.sam_value || 0;
      return acc + (sam * (it.quantity || 0));
    }, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    setEditedTime(`${totalHours} Hours`);

    // Assume 5 tailors & 8 hours daily shift as default for estimate
    const workingDays = Math.ceil(totalHours / (5 * 8)) || 1;
    setEditedDays(workingDays);
  };

  // Handler for GST percentage changes
  const handleGstChange = (val: string) => {
    setEditedGstPercent(val);
    recalculateSummaries(editedItems, editedMargin, val);
  };

  // Handler for margin change
  const handleMarginChange = (val: string) => {
    const margin = parseFloat(val) || 0;
    setEditedMargin(margin);

    // Recalculate based on margin markup if user wants to override
    const sugQuoteValue = editedExpenses * (1 + margin / 100);
    setEditedFinalValue(Math.round(sugQuoteValue * 100) / 100);
  };

  // Filtered quotations list
  const filteredQuotations = React.useMemo(() => {
    if (filterStatus === 'All') return quotations;
    return quotations.filter(q => q.status === filterStatus);
  }, [quotations, filterStatus]);

  // Statistics summaries
  const stats = React.useMemo(() => {
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
          ${Number(q.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              onClick={() => handleOpenMessageModal(q)}
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
          <h2 className="text-4xl font-black italic tracking-tighter text-[#3a525d] mt-2">
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
                <p className="text-3xl font-black italic tracking-tighter text-[#3a525d]">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                <Layers size={20} />
              </div>
            </Card>

            <Card className="p-8 border border-zinc-100 bg-zinc-50/50 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pending Operations Review</p>
                <p className="text-3xl font-black italic tracking-tighter text-amber-500">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                <Clock size={20} />
              </div>
            </Card>

            <Card className="p-8 border border-[#2d8d9b]/10 bg-[#2d8d9b]/5 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-75">Approved Contract Value</p>
                <p className="text-2xl font-black italic tracking-tighter text-[#2d8d9b] font-mono">
                  ${stats.approvedVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                <Scale size={20} />
              </div>
            </Card>

            <Card className="p-8 border border-zinc-100 bg-zinc-50/50 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Average Profit Margin</p>
                <p className="text-3xl font-black italic tracking-tighter text-emerald-500">+{stats.avgMargin}%</p>
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
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* BACK BUTTON AND ACTIONS MENU */}
            <div className="flex justify-between items-center flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => { setActiveTab('list'); setSelectedQuotation(null); }}
                className="flex items-center gap-2 shadow-sm rounded-xl py-2.5 border-zinc-200"
              >
                <ArrowLeft size={14} />
                Back to Registry
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
                    <h3 className="text-3xl font-black italic tracking-tighter text-[#3a525d]">{selectedQuotation.title}</h3>
                  )}
                  <p className="text-xs font-bold text-zinc-400">Registered: {new Date(selectedQuotation.created_at).toLocaleString()}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status Status</span>
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
                    <span className={`px-5 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-widest ${selectedQuotation.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* 2/3 COLUMN: SYSTEM INPUTS */}
                <div className="md:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                    {/* CUSTOMER ORG */}
                    <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Customer Client</span>
                        {editMode ? (
                          <Select
                            options={organizations.map(org => ({ label: org.name, value: String(org.id) }))}
                            value={editedOrgId}
                            onChange={(val) => setEditedOrgId(val)}
                            className="bg-white border-zinc-200 rounded-xl font-bold text-xs mt-1 w-full text-[#3a525d]"
                          />
                        ) : (
                          <p className="text-base font-black text-[#3a525d] mt-1">{selectedQuotation.organizations?.name || 'Customer'}</p>
                        )}
                      </div>
                    </Card>

                    {/* ESTIMATED TIME */}
                    <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Production Time Metrics</span>
                        {editMode ? (
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
                        ) : (
                          <>
                            <p className="text-base font-black text-[#3a525d] mt-1">{selectedQuotation.total_estimated_time || 'N/A'}</p>
                            <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">({selectedQuotation.production_days_estimate} Production Days)</p>
                          </>
                        )}
                      </div>
                    </Card>

                    {/* MARGIN PERCENTAGE */}
                    <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Profit Markup Margin</span>
                        {editMode ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              value={editedMargin}
                              onChange={(e) => handleMarginChange(e.target.value)}
                              className="bg-white font-mono font-bold text-xs rounded-xl"
                            />
                            <span className="text-xs font-bold text-zinc-400">%</span>
                          </div>
                        ) : (
                          <p className="text-base font-black text-green-600 mt-1">+{selectedQuotation.profit_margin_percent}%</p>
                        )}
                      </div>
                    </Card>

                    {/* EXPECTED DELIVERY DATE */}
                    <Card className="p-6 border border-zinc-100 bg-zinc-50/50 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Target Delivery Date</span>
                        {editMode ? (
                          <Input
                            type="date"
                            value={editedDeliveryDate}
                            onChange={(e) => setEditedDeliveryDate(e.target.value)}
                            className="bg-white font-mono font-bold text-xs rounded-xl mt-1"
                          />
                        ) : (
                          <p className="text-base font-black text-[#2d8d9b] mt-1">
                            {selectedQuotation.expected_delivery_date
                              ? new Date(selectedQuotation.expected_delivery_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                              : 'N/A'}
                          </p>
                        )}
                      </div>
                    </Card>

                  </div>

                  {/* EDITABLE/READONLY ITEMS BREAKDOWN LIST */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] font-black">
                        Quotation Garment Line Items
                      </h4>
                      {editMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addItemRow}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#2d8d9b] hover:bg-[#2d8d9b]/5 text-[#2d8d9b] font-black h-8 text-[9px]"
                        >
                          <Plus size={10} />
                          Add Garment
                        </Button>
                      )}
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
                            {editMode && <th className="p-3 text-center">Del</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                          {(editMode ? editedItems : selectedQuotation.items || []).map((item, idx) => {
                            const pTypeName = item.product_types?.name ||
                              productTypes.find(p => p.id === item.product_type_id)?.name ||
                              'Garment';
                            const fabricId = item.size_breakdown?.fabric_id;
                            const fabricBrand = fabricsList.find(f => f.id === fabricId)?.brand_name || 'Custom Fabric';

                            // Cost breakdown per item
                            const totalBaseCost = (item.fabric_cost_per_item || 0) +
                              (item.accessories_cost_per_item || 0) +
                              (item.labor_cost_per_item || 0);

                            if (editMode) {
                              return (
                                <tr key={idx} className="hover:bg-zinc-50/50">
                                  {/* PRODUCT TYPE SELECT */}
                                  <td className="p-2">
                                    <select
                                      value={item.product_type_id}
                                      onChange={(e) => handleItemChange(idx, 'product_type_id', e.target.value)}
                                      className="bg-white border border-zinc-200 rounded-lg text-xs font-bold w-32 py-1 px-2 text-[#3a525d] outline-none"
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
                                      <span className="font-bold border-t border-zinc-100 pt-0.5 text-zinc-500 font-mono">${totalBaseCost.toFixed(2)}</span>
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
                                    ${Number(item.total_price || 0).toFixed(2)}
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
                            }

                            // Read-only row
                            return (
                              <tr key={idx} className="hover:bg-zinc-50/20">
                                <td className="p-4 font-black text-[#3a525d]">{pTypeName}</td>
                                <td className="p-4 text-zinc-500">{fabricBrand}</td>
                                <td className="p-4 font-mono">{item.size_breakdown?.sam_value ? `$${Number(item.size_breakdown.sam_value).toFixed(2)}` : 'N/A'}</td>
                                <td className="p-4">{item.size_breakdown?.design_number || 'N/A'}</td>
                                <td className="p-4 text-center font-black">{item.quantity}</td>
                                <td className="p-4 text-right font-mono text-zinc-400">
                                  ${totalBaseCost.toFixed(2)}
                                  <div className="text-[9px] opacity-75">
                                    (F:{item.fabric_cost_per_item} + A:{item.accessories_cost_per_item} + L:{item.labor_cost_per_item})
                                  </div>
                                </td>
                                <td className="p-4 text-right font-bold font-mono">${Number(item.unit_price).toFixed(2)}</td>
                                <td className="p-4 text-right font-black text-[#2d8d9b] font-mono">${Number(item.total_price).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* FOOTER TOTALS */}
                        <tfoot>
                          <tr className="bg-zinc-50/50 font-black text-[#3a525d] border-t border-zinc-150">
                            <td colSpan={2} className="p-4 uppercase text-[9px] tracking-widest text-[#3a525d] font-black">Sum totals:</td>
                            <td className="p-4 font-mono font-black">
                              ${((editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => acc + ((it.size_breakdown?.sam_value || 0) * (it.quantity || 0)), 0)).toFixed(2)}
                            </td>
                            <td></td>
                            <td className="p-4 text-center text-sm">
                              {(editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)} Qty
                            </td>
                            <td className="p-4 text-right font-mono text-xs text-zinc-400">
                              ${((editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => {
                                const totalBaseCost = (it.fabric_cost_per_item || 0) + (it.accessories_cost_per_item || 0) + (it.labor_cost_per_item || 0);
                                return acc + (totalBaseCost * (it.quantity || 0));
                              }, 0)).toFixed(2)}
                            </td>
                            <td></td>
                            <td className="p-4 text-right text-base text-[#2d8d9b] font-mono font-black">
                              ${((editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => acc + (it.total_price || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {editMode && <td></td>}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* COVER LETTER SECTION */}
                  <div className="space-y-4 pt-6 border-t border-zinc-100 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        Proposal Cover Letter (100% Customizable)
                      </h4>
                      {editMode && (
                        <button
                          type="button"
                          onClick={generateAutoCoverLetter}
                          className="px-3.5 py-1.5 bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          ✨ Auto-Generate Cover Letter Template
                        </button>
                      )}
                    </div>
                    {editMode ? (
                      <textarea
                        rows={6}
                        placeholder="Enter custom cover letter introduction for the client proposal..."
                        className="w-full bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 transition-all leading-relaxed"
                        value={editedCoverLetter}
                        onChange={(e) => setEditedCoverLetter(e.target.value)}
                      />
                    ) : (
                      selectedQuotation.metrics_summary?.cover_letter ? (
                        <div className="text-xs text-zinc-650 leading-relaxed font-semibold whitespace-pre-wrap italic bg-gray-50/60 p-6 rounded-2xl border border-zinc-150 shadow-inner">
                          {selectedQuotation.metrics_summary.cover_letter}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400 leading-relaxed font-semibold italic bg-zinc-50/30 p-4 rounded-xl border border-dashed border-zinc-200 text-center">
                          No cover letter drafted for this proposal yet.
                        </div>
                      )
                    )}
                  </div>

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
                          <span>Total Items Quantity:</span>
                          <span className="text-[#3a525d] font-black">
                            {(editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)} Garments
                          </span>
                        </div>

                        <div className="flex justify-between py-2 text-zinc-500">
                          <span>Accumulated Base Expenses:</span>
                          <span className="font-mono text-[#3a525d]">
                            ${(editMode ? editedExpenses : selectedQuotation.estimated_expenses).toFixed(2)}
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
                            ${(editMode
                              ? editedItems.reduce((acc, it) => acc + (it.total_price || 0), 0)
                              : getSelectedQuotePricing(selectedQuotation).subtotal
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
                              {getSelectedQuotePricing(selectedQuotation).gstRate}%
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between py-2 text-zinc-500">
                          <span>GST Tax Value:</span>
                          <span className="font-mono text-red-500 font-bold">
                            ${(editMode
                              ? (editedItems.reduce((acc, it) => acc + (it.total_price || 0), 0) * (parseFloat(editedGstPercent) || 0) / 100)
                              : getSelectedQuotePricing(selectedQuotation).gstValue
                            ).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between py-2 text-zinc-500">
                          <span>Avg Price / Garment:</span>
                          <span className="font-mono text-[#2d8d9b] font-black">
                            ${(
                              (editMode ? editedFinalValue : selectedQuotation.final_quote_value) /
                              Math.max(1, (editMode ? editedItems : selectedQuotation.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0))
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 pt-6 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">
                        Formal Quotation Value
                      </p>
                      {editMode ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-[#2d8d9b] font-mono">$</span>
                          <Input
                            type="number"
                            value={editedFinalValue}
                            onChange={(e) => setEditedFinalValue(parseFloat(e.target.value) || 0)}
                            className="bg-white border-[#2d8d9b]/30 focus:border-[#2d8d9b] text-xl font-mono font-black text-[#2d8d9b] rounded-xl"
                          />
                        </div>
                      ) : (
                        <p className="text-4xl font-black italic tracking-tighter text-[#2d8d9b] font-mono">
                          ${Number(selectedQuotation.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </Card>

                </div>

              </div>

            </Card>

          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] border border-zinc-150 shadow-2xl p-8 flex flex-col space-y-6 overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Loading Overlay */}
            {isSendingMessage && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                <div className="relative w-16 h-16">
                  {/* Glowing spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-[#2d8d9b]/10 border-t-[#2d8d9b] animate-spin"></div>
                  {/* Secondary reverse spinner for premium complexity */}
                  <div className="absolute inset-2 rounded-full border-4 border-dashed border-[#3a525d]/10 border-t-[#3a525d] animate-spin [animation-duration:3s]"></div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#3a525d]">Secure Transmission Active</p>
                  <p className="text-[10px] font-bold text-zinc-400">Verifying keys & compiling proposal attachments...</p>
                </div>
              </div>
            )}

            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${messageChannel === 'email' ? 'bg-[#2d8d9b]/10 text-[#2d8d9b]' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                  {messageChannel === 'email' ? (
                    <Mail size={22} className="animate-pulse" />
                  ) : (
                    <MessageCircle size={22} className="animate-pulse" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tight text-[#3a525d]">
                    {messageChannel === 'email' ? 'Send Proposal to Customer' : 'Send Proposal via WhatsApp'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                    {messageChannel === 'email'
                      ? 'Prepare secure email package containing verified vector PDF.'
                      : 'Dispatch professional summary directly to customer chat.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessageCandidate(null)}
                className="w-8 h-8 rounded-full bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-650 transition-colors border border-zinc-150"
              >
                <span className="text-sm font-black">&times;</span>
              </button>
            </div>

            {/* Segment Tab Switcher */}
            <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-150">
              <button
                type="button"
                onClick={switchToEmail}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${messageChannel === 'email'
                  ? 'bg-white text-[#2d8d9b] shadow-sm border border-zinc-200 font-black'
                  : 'text-zinc-400 hover:text-zinc-650 font-bold'
                  }`}
              >
                <Mail size={14} />
                Email Channel
              </button>
              <button
                type="button"
                onClick={switchToWhatsApp}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${messageChannel === 'whatsapp'
                  ? 'bg-white text-emerald-600 shadow-sm border border-zinc-200 font-black'
                  : 'text-zinc-400 hover:text-zinc-650 font-bold'
                  }`}
              >
                <MessageCircle size={14} />
                WhatsApp Chat
              </button>
            </div>

            {/* Modal Body / Inputs */}
            <div className="space-y-4 text-xs font-semibold text-[#3a525d]">
              {messageChannel === 'email' ? (
                <>
                  <div className="space-y-1.5 animate-in fade-in duration-300">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Recipient Email address</label>
                    <Input
                      type="email"
                      value={messageRecipient}
                      onChange={(e) => setMessageRecipient(e.target.value)}
                      placeholder="customer@domain.com"
                      className="bg-zinc-50 border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 animate-in fade-in duration-300">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Email Subject Heading</label>
                    <Input
                      type="text"
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                      placeholder="Quotation Proposal Proposal"
                      className="bg-zinc-50 border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 font-bold text-xs"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Customer Mobile Number (With Country Code)</label>
                  <Input
                    type="tel"
                    value={messagePhone}
                    onChange={(e) => setMessagePhone(e.target.value)}
                    placeholder="e.g., +91 9988776655"
                    className="bg-zinc-50 border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-2xl p-4 font-bold text-xs"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Message Body Content</label>
                <textarea
                  rows={8}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write message details..."
                  className="w-full bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 font-bold text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 transition-all leading-relaxed animate-in fade-in duration-300"
                />
              </div>

              {/* Decorative Vector PDF Attachment Banner */}
              <div className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${messageChannel === 'email'
                    ? 'bg-red-50 text-red-500 border-red-100'
                    : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                    }`}>
                    <Paperclip size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-gray-800">proposal_{messageCandidate?.quotation_no}.pdf</p>
                    <p className="text-[9px] text-zinc-400 font-bold">
                      {messageChannel === 'email'
                        ? '1.2 MB &bull; Sizing Audit Vector Compiled'
                        : 'Retrieve & download details dynamically linked in chat.'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 font-black text-[9px] uppercase tracking-wider rounded-lg border ${messageChannel === 'email'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-[#2d8d9b]/10 text-[#2d8d9b] border-[#2d8d9b]/20'
                  }`}>
                  {messageChannel === 'email' ? 'Ready & Signed' : 'Portal Linked'}
                </span>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setMessageCandidate(null)}
                className="rounded-xl border border-zinc-200 text-[#3a525d] font-black hover:bg-zinc-50 px-5"
              >
                Cancel
              </Button>
              {messageChannel === 'email' ? (
                <Button
                  onClick={handleSendMessage}
                  className="bg-[#2d8d9b] text-white hover:bg-[#3a525d] rounded-xl font-black px-6 flex items-center gap-2 shadow transition-all"
                >
                  <Send size={14} />
                  Send Secure Package
                </Button>
              ) : (
                <Button
                  onClick={handleSendWhatsApp}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black px-6 flex items-center gap-2 shadow transition-all"
                >
                  <MessageCircle size={14} />
                  Open WhatsApp Chat
                </Button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
