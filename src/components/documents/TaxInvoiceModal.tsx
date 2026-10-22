'use client';

import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDateDoc, numberToWordsINR } from '@/lib/formatters';

export interface TaxInvoiceItem {
  id?: string | number;
  item_description: string;
  sub_details?: string;
  hsn_sac?: string;
  fabric_details?: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  total_price: number;
}

export interface TaxInvoiceData {
  id?: number | string;
  invoice_no: string;
  order_no?: string;
  invoice_date?: string | Date;
  created_at?: string | Date;
  due_date?: string | Date;
  place_of_supply?: string;
  customer?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    gst_number?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    delivery_address?: string;
  };
  customer_name?: string;
  items?: TaxInvoiceItem[];
  invoice_items?: any[];
  subtotal?: number;
  discount?: number;
  tax_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  payment_status?: string;
  is_tax_inclusive?: boolean;
  notes?: string;
  raw?: any;
}

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TaxInvoiceData | null;
  defaultCustomer?: any;
}

import api from '@/lib/api';
import { printInvoiceElement } from '@/lib/printUtils';

const DEFAULT_COMPANY = {
  id: 1,
  company_name: 'Forma Apparels',
  address: '63/3608, CD Tower, Arayidathupalam, Kozhikode, Kerala - 673 004, India',
  phone: '(+91) 7902 499 990 | 0495 2 922 992',
  email: 'info@formaapparels.com',
  website: 'www.formaapparels.com',
  bank_name: 'HDFC BANK',
  account_no: '50200076116064',
  branch_name: 'MAJESTIC CENTER',
  ifsc_code: 'HDFC0001255',
  upi_id: '7902 499 991',
  qr_image: null,
};

export default function TaxInvoiceModal({ isOpen, onClose, data, defaultCustomer }: TaxInvoiceModalProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [company, setCompany] = React.useState<any>(DEFAULT_COMPANY);
  const [fetchedItems, setFetchedItems] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      api.get('/company-settings')
        .then(res => {
          if (res.data?.data) {
            setCompany({ ...DEFAULT_COMPANY, ...res.data.data });
          }
        })
        .catch(() => {});

      if (data?.id && (!data?.items || data.items.length === 0) && (!data?.invoice_items || data.invoice_items.length === 0)) {
        api.get(`/invoices/${data.id}`)
          .then(res => {
            const invData = res.data?.data || res.data;
            const items = invData?.invoice_items || invData?.items || (Array.isArray(invData) ? invData : []);
            if (Array.isArray(items) && items.length > 0) {
              setFetchedItems(items);
            }
          })
          .catch(() => {});
      }
    } else {
      setFetchedItems(null);
    }
  }, [isOpen, data?.id]);

  const handlePrint = React.useCallback(() => {
    if (!data) return;
    printInvoiceElement('tax-invoice-print-area', `Tax_Invoice_${data.invoice_no}`);
  }, [data]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrint]);

  if (!isOpen || !data) return null;

  // Resolve customer details
  const customer = data.customer || defaultCustomer || data.raw?.organizations || {};
  const customerName = data.customer_name || customer.name || data.raw?.customer_name || 'Valued Customer';
  const customerAddress = customer.address || '5th Floor, Medical Centre, NH Bypass';
  const locationParts = [customer.city, customer.state, customer.pincode, customer.country || 'India'].filter(Boolean);
  const locationString = locationParts.length > 0 ? locationParts.join(', ') : 'Kozhikode, Kerala – 673007, India';
  const deliveryAddress = customer.delivery_address || customerAddress;

  // Date & Supply
  const invDate = data.invoice_date || data.created_at || new Date();
  const placeOfSupply = data.place_of_supply || (customer.state ? `${customer.state} (32)` : 'Kerala (32)');
  const isInterstate = customer.state && !customer.state.toLowerCase().includes('kerala');

  // Line items
  let lineItems: TaxInvoiceItem[] = [];

  const rawItemList = data.items || data.invoice_items || fetchedItems || data.raw?.invoice_items;
  if (Array.isArray(rawItemList) && rawItemList.length > 0) {
    lineItems = rawItemList.map((it: any, idx: number) => {
      const desc = it.item_description || it.description || `Uniform Apparel Specification #${idx + 1}`;
      const sub = it.sub_details || it.design_number || 'Pattern 046 | Regular Fit';
      const hsn = it.hsn_sac || it.hsn_code || '620520';
      const fab = it.fabric_details || 'Cotton - Blue Stripes on White';
      const qty = parseInt(it.quantity || 1, 10);
      const price = parseFloat(it.unit_price || 0);
      const total = it.total_price ? parseFloat(it.total_price) : (qty * price);

      return {
        id: it.id || idx + 1,
        item_description: desc,
        sub_details: sub,
        hsn_sac: hsn,
        fabric_details: fab,
        quantity: qty,
        unit_price: price,
        tax_rate: it.tax_rate ?? 5,
        total_price: total
      };
    });
  } else {
    // If single lumped invoice
    const totalAmount = parseFloat(String(data.total_amount || 102375));
    const subtotal = data.subtotal ? parseFloat(String(data.subtotal)) : (totalAmount / 1.05);
    const qty = 50;
    lineItems = [
      {
        id: 1,
        item_description: "Men's Full Sleeve Shirt",
        sub_details: 'Pattern 046 | Regular Fit',
        hsn_sac: '620520',
        fabric_details: 'Cotton - Blue Stripes on White',
        quantity: qty,
        unit_price: Math.round((subtotal / qty) * 100) / 100,
        tax_rate: 5,
        total_price: subtotal
      }
    ];
  }

  // Calculate totals
  const subTotalCalculated = data.subtotal
    ? parseFloat(String(data.subtotal))
    : lineItems.reduce((acc, it) => acc + (it.total_price || 0), 0);

  const grandTotal = data.total_amount
    ? parseFloat(String(data.total_amount))
    : subTotalCalculated * 1.05;

  const totalTaxCalculated = data.tax_amount
    ? parseFloat(String(data.tax_amount))
    : Math.max(0, grandTotal - subTotalCalculated);

  const halfTax = totalTaxCalculated / 2;

  // Amount in words
  const amountWords = numberToWordsINR(grandTotal);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Print Specific CSS to isolate the invoice sheet for native Ctrl+P */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header, nav, aside {
            display: none !important;
          }
          .fixed.inset-0 {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .fixed.inset-0 > div {
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .overflow-y-auto {
            overflow: visible !important;
            padding: 0 !important;
            background: transparent !important;
          }
          #tax-invoice-print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            min-height: auto !important;
          }
        }
      `}</style>

      {/* Modal Dialog Card */}
      <div className="bg-zinc-100 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] my-auto border border-zinc-300">
        {/* Modal Top Bar (Screen Only) */}
        <div className="no-print bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-black tracking-wide uppercase">
              Tax Invoice (GST) · <span className="font-mono text-emerald-300">{data.invoice_no}</span>
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              variant="secondary"
              className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <Printer size={15} /> Print Tax Invoice
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer border-none bg-transparent"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="overflow-y-auto p-4 sm:p-6 flex justify-center bg-zinc-200/60 custom-scrollbar">
          {/* A4 Tax Invoice Document Sheet */}
          <div
            id="tax-invoice-print-area"
            ref={printContainerRef}
            className="w-full max-w-[794px] bg-white text-zinc-800 p-6 sm:p-8 shadow-xl rounded-xl border border-zinc-200 text-xs sm:text-sm font-sans flex flex-col justify-between print:p-0 print:border-none print:shadow-none print:min-h-0 print:max-w-full print:rounded-none"
            style={{ minHeight: '1050px' }}
          >
            <div>
              {/* 1. Header (Logo & Company Details) */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-zinc-200">
                <div className="flex items-center">
                  <img
                    src="/images/logimg.jpeg"
                    alt={company.company_name || 'Forma Apparels'}
                    className="h-14 sm:h-16 w-auto object-contain rounded-lg shadow-2xs"
                  />
                </div>
                <div className="text-right text-xs leading-relaxed text-zinc-600 sm:max-w-xs">
                  <h2 className="text-base font-black text-zinc-900 tracking-tight">{company.company_name || 'Forma Apparels'}</h2>
                  <p className="whitespace-pre-line text-[11px] sm:text-xs">{company.address || '63/3608, CD Tower, Arayidathupalam, Kozhikode, Kerala - 673 004, India'}</p>
                  <p className="font-medium text-zinc-700 mt-0.5 text-[11px] sm:text-xs">
                    {company.phone || '(+91) 7902 499 990 | 0495 2 922 992'}
                  </p>
                  {company.email && <p className="text-zinc-600 text-[11px] sm:text-xs">{company.email}</p>}
                  {company.website && <p className="text-zinc-600 text-[11px] sm:text-xs">{company.website}</p>}
                </div>
              </div>

              {/* 2. Title Card (TAX INVOICE (GST) Banner) */}
              <div className="mt-4 p-4 rounded-xl bg-[#fff5f5] border border-[#fee2e2] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight uppercase">
                    TAX INVOICE <span className="text-[#991b1b]">(GST)</span>
                  </h1>
                  <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
                    Supply of Goods – Tax Invoice as per GST Act
                  </p>
                </div>

                <div className="text-xs space-y-1 font-medium bg-white/90 p-2.5 rounded-lg border border-rose-100 sm:min-w-[210px]">
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-zinc-500">Invoice No</span>
                    <span className="font-mono font-bold text-zinc-900">: {data.invoice_no}</span>
                  </div>
                  {(data.order_no || data.raw?.order_no || data.raw?.order_ref) && (data.order_no !== '—' && data.raw?.order_no !== '—') && (
                    <div className="flex justify-between gap-3 text-[11px]">
                      <span className="text-zinc-500">Order No</span>
                      <span className="font-mono font-bold text-zinc-900">: {data.order_no || data.raw?.order_no || data.raw?.order_ref}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-zinc-500">Date</span>
                    <span className="font-bold text-zinc-900">: {formatDateDoc(invDate)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-zinc-500">Place of Supply</span>
                    <span className="font-bold text-zinc-900">: {placeOfSupply}</span>
                  </div>
                </div>
              </div>

              {/* 3. Bill To & Ship To Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* Bill To */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[#991b1b] uppercase text-[11px] tracking-wider border-b border-rose-100 pb-1">
                    Bill To (Customer)
                  </h4>
                  <p className="text-sm font-black text-zinc-900 pt-0.5">{customerName}</p>
                  <p className="text-zinc-600 leading-relaxed">{customerAddress}</p>
                  <p className="text-zinc-600">{locationString}</p>
                  {customer.gst_number && (
                    <div className="pt-1 flex gap-2">
                      <span className="text-zinc-500 font-medium w-16">GST No</span>
                      <span className="font-mono font-bold text-zinc-900">: {customer.gst_number}</span>
                    </div>
                  )}
                  {customer.contact_person && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 font-medium w-16">Contact</span>
                      <span className="font-semibold text-zinc-800">: {customer.contact_person}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 font-medium w-16">Phone</span>
                      <span className="font-semibold text-zinc-800">: {customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 font-medium w-16">Email</span>
                      <span className="text-zinc-700">: {customer.email}</span>
                    </div>
                  )}
                </div>

                {/* Ship To */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[#991b1b] uppercase text-[11px] tracking-wider border-b border-rose-100 pb-1">
                    Ship To (Delivery Address)
                  </h4>
                  <p className="text-sm font-black text-zinc-900 pt-0.5">{customerName}</p>
                  <p className="text-zinc-600 leading-relaxed">{deliveryAddress}</p>
                  <p className="text-zinc-600">{locationString}</p>
                  {customer.contact_person && (
                    <div className="pt-1 flex gap-2">
                      <span className="text-zinc-500 font-medium w-16">Contact</span>
                      <span className="font-semibold text-zinc-800">: {customer.contact_person}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 font-medium w-16">Phone</span>
                      <span className="font-semibold text-zinc-800">: {customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Products Table (Includes HSN / SAC column) */}
              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#991b1b] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3">Product Description</th>
                      <th className="py-2 px-3 w-20 text-center">HSN / SAC</th>
                      <th className="py-2 px-3">Fabric / Details</th>
                      <th className="py-2 px-3 w-16 text-center">Qty</th>
                      <th className="py-2 px-3 w-24 text-right">Unit Price (₹)</th>
                      <th className="py-2 px-3 w-28 text-right">Total Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white text-zinc-800">
                    {lineItems.map((item, index) => (
                      <tr key={index} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3 text-center font-bold text-zinc-500 align-top text-xs">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <p className="font-bold text-zinc-900 text-xs">{item.item_description}</p>
                          {item.sub_details && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">{item.sub_details}</p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-medium text-zinc-600 align-top text-xs">
                          {item.hsn_sac || '620520'}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 align-top text-xs">
                          {item.fabric_details || '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-zinc-800 align-top text-xs">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-zinc-800 align-top text-xs">
                          {item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900 align-top text-xs">
                          {item.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 5. Amount in Words, Terms, QR & Totals */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-5 text-xs">
                {/* Left Column: Amount in Words, Payment Terms, Bank Details, Notes */}
                <div className="sm:col-span-7 space-y-3">
                  {/* Amount in Words */}
                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/70">
                    <h4 className="font-bold text-zinc-900 text-[10.5px] uppercase tracking-wider mb-0.5">
                      Amount in Words
                    </h4>
                    <p className="text-[11px] font-semibold text-zinc-800 italic leading-snug">
                      {amountWords}
                    </p>
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <h4 className="font-bold text-zinc-900 text-[10.5px] uppercase tracking-wider mb-0.5">
                      Payment Terms
                    </h4>
                    <ul className="list-disc list-inside text-zinc-600 space-y-0.5 text-[10.5px] leading-relaxed">
                      <li>50% Advance with PO</li>
                      <li>50% Before Dispatch</li>
                      <li>Payment via Bank Transfer / RTGS / UPI</li>
                    </ul>
                  </div>

                  {/* Bank Details */}
                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-0.5">
                    <h4 className="font-bold text-zinc-900 text-[10.5px] uppercase tracking-wider mb-0.5">
                      Bank Details
                    </h4>
                    <div className="grid grid-cols-3 gap-0.5 text-[10.5px]">
                      <span className="text-zinc-500 font-medium">Bank Name</span>
                      <span className="col-span-2 font-bold text-zinc-800">: {company.bank_name || 'HDFC BANK'}</span>
                      <span className="text-zinc-500 font-medium">Branch</span>
                      <span className="col-span-2 font-bold text-zinc-800">: {company.branch_name || 'MAJESTIC CENTER'}</span>
                      <span className="text-zinc-500 font-medium">A/c Name</span>
                      <span className="col-span-2 font-bold text-zinc-800">: {company.company_name || 'Forma Apparels'}</span>
                      <span className="text-zinc-500 font-medium">A/c No.</span>
                      <span className="col-span-2 font-mono font-bold text-zinc-900">: {company.account_no || '50200076116064'}</span>
                      <span className="text-zinc-500 font-medium">IFSC</span>
                      <span className="col-span-2 font-mono font-bold text-zinc-900">: {company.ifsc_code || 'HDFC0001255'}</span>
                      {company.upi_id && (
                        <>
                          <span className="text-zinc-500 font-medium">UPI ID</span>
                          <span className="col-span-2 font-mono font-bold text-zinc-900">: {company.upi_id}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="font-bold text-zinc-900 text-[10.5px] uppercase tracking-wider mb-0.5">
                      Notes
                    </h4>
                    <ul className="list-disc list-inside text-zinc-500 space-y-0.5 text-[10px] leading-relaxed">
                      <li>This is a GST tax invoice and includes applicable GST as per the law.</li>
                      <li>Goods once supplied cannot be taken back.</li>
                      <li>Subject to Kerala Jurisdiction only.</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column: Totals Summary, QR Scan & Signatory */}
                <div className="sm:col-span-5 flex flex-col justify-between">
                  {/* Totals Table */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                    <div className="divide-y divide-zinc-200">
                      <div className="flex justify-between py-1.5 px-3 bg-zinc-50">
                        <span className="font-medium text-zinc-600">Sub Total</span>
                        <span className="font-mono font-bold text-zinc-900">
                          {subTotalCalculated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {isInterstate ? (
                        <div className="flex justify-between py-1.5 px-3">
                          <span className="font-medium text-zinc-600">IGST (5%)</span>
                          <span className="font-mono font-bold text-zinc-900">
                            {totalTaxCalculated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between py-1.5 px-3">
                            <span className="font-medium text-zinc-600">CGST (2.5%)</span>
                            <span className="font-mono font-bold text-zinc-900">
                              {halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 px-3 bg-zinc-50">
                            <span className="font-medium text-zinc-600">SGST (2.5%)</span>
                            <span className="font-mono font-bold text-zinc-900">
                              {halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between py-2 px-3 bg-[#991b1b] text-white">
                        <span className="font-black text-xs uppercase tracking-wider">Grand Total (INR)</span>
                        <span className="font-mono font-black text-sm">
                          ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Scan and Signatory area */}
                  <div className="mt-4 flex items-end justify-between gap-3">
                    {/* QR Code */}
                    <div className="flex items-center gap-2 p-1.5 bg-zinc-50 rounded-xl border border-zinc-200">
                      {company.qr_image ? (
                        <img
                          src={company.qr_image}
                          alt="Scan for Payment"
                          className="w-14 h-14 object-contain rounded-lg shrink-0 border border-zinc-200 bg-white"
                        />
                      ) : (
                        <svg className="w-14 h-14 text-zinc-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2 2h7v7H2V2zm2 2v3h3V4H4zm9-2h7v7h-7V2zm2 2v3h3V4h-3zM2 13h7v7H2v-7zm2 2v3h3v-3H4zm9 0h2v2h-2v-2zm4 0h3v5h-2v-3h-1v-2zm-2 2h2v3h-2v-3zm-2 2h2v3h-2v-3zm6-1h1v2h-1v-2zm-6-5h2v2h-2v-2zm3 0h4v2h-4v-2z" />
                        </svg>
                      )}
                      <div className="text-[9.5px] leading-tight">
                        <p className="font-black text-zinc-900 uppercase tracking-tight">Scan for</p>
                        <p className="font-black text-[#991b1b] uppercase tracking-tight">Payment</p>
                        <p className="text-[8.5px] text-zinc-500 font-mono mt-0.5">{company.upi_id || 'UPI Pay'}</p>
                      </div>
                    </div>

                    {/* Signatory Box */}
                    <div className="text-right space-y-0.5">
                      <p className="text-xs font-bold text-zinc-900">For {company.company_name || 'Forma Apparels'}</p>
                      <div className="flex justify-end py-0.5">
                        <svg className="w-32 h-8 text-zinc-800" viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 40 Q 30 10, 50 45 T 80 20 T 110 40 T 140 25 T 180 35 M 40 42 L 175 35" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        Authorized Signatory
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Footer Tagline */}
            <div className="mt-6 pt-3 border-t border-zinc-200 text-center">
              <p className="text-[9.5px] font-black tracking-widest text-zinc-400 uppercase">
                — QUALITY FABRICS &nbsp;|&nbsp; CUSTOM FITS &nbsp;|&nbsp; TRUSTED PARTNER —
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div className="no-print bg-white p-4 border-t border-zinc-200 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-medium flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Official {company.company_name || 'Forma Apparels'} GST Tax Invoice Template
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              className="h-10 px-5 rounded-xl bg-[#991b1b] hover:bg-[#7f1d1d] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Printer size={16} /> Print / Save PDF
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              className="h-10 px-5 rounded-xl border border-zinc-300 text-xs font-bold uppercase text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
