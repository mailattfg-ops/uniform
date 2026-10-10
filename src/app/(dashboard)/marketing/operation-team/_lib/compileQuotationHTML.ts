import { formatDate } from '@/lib/formatters';

export interface Organization {
  id: number;
  name: string;
}

export interface ProductType {
  id: number;
  name: string;
}

export interface Fabric {
  id: string;
  brand_name: string;
  name?: string;
  shade?: string;
  width?: string;
}

export interface QuotationItem {
  id?: number;
  product_type_id: number;
  product_name?: string;
  manual_item_name?: string;
  product_type_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fabric_cost_per_item: number;
  accessories_cost_per_item: number;
  labor_cost_per_item: number;
  size_breakdown?: {
    product_name?: string | null;
    fabric_id?: string | null;
    sam_value?: number | null;
    design_number?: string | null;
    product_design_number?: string | null;
    selected_size?: string | null;
    class_name?: string | null;
    main_fabric_meters?: number | string | null;
    is_manual?: boolean;
    is_separate_fabric?: boolean;
    department_id?: string | null;
    department_name?: string | null;
    attachment_fabric1_id?: string | null;
    attachment_fabric2_id?: string | null;
    [key: string]: any;
  };
  product_types?: {
    id: number;
    name: string;
  };
  [key: string]: any;
}

export interface Quotation {
  id: number;
  quotation_no: string;
  title: string;
  organization_id: number;
  organizations?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gst_number?: string;
    pan_number?: string;
    legal_name?: string;
    delivery_address?: string;
    delivery_city?: string;
    delivery_state?: string;
    delivery_pincode?: string;
    delivery_country?: string;
    is_b2b?: boolean;
    phone?: string;
    email?: string;
  };
  group_design_number?: { code: string };
  group_design_number_id?: number | null;
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
    departments?: any[];
    separate_fabrics?: any[];
    quotation_type?: string;
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
}

// Helper to extract pricing totals
export const getSelectedQuotePricing = (quote: Quotation) => {
  const finalValue = Number(quote.final_quote_value) || 0;
  const gstRate = quote.metrics_summary?.gst_percent != null
    ? Number(quote.metrics_summary.gst_percent)
    : 0;
  const subtotal = quote.metrics_summary?.pre_tax_subtotal != null
    ? Number(quote.metrics_summary.pre_tax_subtotal)
    : (gstRate > 0 ? (finalValue / (1 + gstRate / 100)) : finalValue);
  const gstValue = finalValue - subtotal;
  return {
    finalValue,
    gstRate,
    subtotal,
    gstValue
  };
};

// Helper to compile full HTML layout for PDF printing/saving
export const compileQuotationHTML = (quote: Quotation, fabricsList: Fabric[], companySettings: any) => {
  const pricing = getSelectedQuotePricing(quote);
  const orgName = quote.organizations?.name || 'Customer';
  const dateStr = formatDate(quote.created_at);
  const deliveryDateStr = formatDate(quote.expected_delivery_date);

  // Helpers for department and division cleanup
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

  // Construct items HTML
  let itemsHtml = '';
  if (quote.items && quote.items.length > 0) {
    const standardItems = quote.items.filter((item: any) => !item.size_breakdown?.is_separate_fabric);
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

      Object.entries(groups).forEach(([cleanDeptName, groupItems]) => {
        itemsHtml += `
          <tr class="bg-gray-50/80 border-t border-b border-gray-150 text-[10px] font-black uppercase text-[#3a525d] tracking-wider">
            <td colspan="4" class="py-2.5 px-4 font-black">DEPARTMENT: ${cleanDeptName}</td>
          </tr>
        `;

        groupItems.forEach((item: any) => {
          const pTypeName = item.product_name || item.size_breakdown?.product_name || item.manual_item_name || item.product_types?.name || item.product_type_name || 'Uniform Item';
          const deptId = item.size_breakdown?.department_id;
          const qty = Number(item.quantity) || 0;
          
          let firstCellHtml = '';
          
          const deptMeta = quote.metrics_summary?.departments?.find((d: any) => String(d.id) === String(deptId));
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
          const productLine = designNotes ? `* ${pTypeName} - ${designNotes}` : `* ${pTypeName}`;
          
          const fabricId = item.size_breakdown?.fabric_id;
          const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));
          const fabricBrand = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
          const mainFabricLine = fabricId ? `FAB(M) - ${fabricBrand}` : '';
          
          const att1Id = item.size_breakdown?.attachment_fabric1_id;
          const att1Fabric = fabricsList.find((f: any) => String(f.id) === String(att1Id));
          const att1Brand = att1Fabric ? (att1Fabric.brand_name || att1Fabric.name) : '';
          const att1Line = att1Id ? `FAB(A) - ${att1Brand}` : '';
          
          const att2Id = item.size_breakdown?.attachment_fabric2_id;
          const att2Fabric = fabricsList.find((f: any) => String(f.id) === String(att2Id));
          const att2Brand = att2Fabric ? (att2Fabric.brand_name || att2Fabric.name) : '';
          const att2Line = att2Id ? `FAB(A) - ${att2Brand}` : '';
          
          firstCellHtml = `
            <div class="space-y-0.5 py-1 text-left">
              <div class="font-bold text-gray-500 uppercase text-[9px] tracking-wider">${deptHeader}</div>
              <div class="font-bold text-gray-800 text-xs">${productLine}</div>
              ${mainFabricLine ? `<div class="text-gray-400 text-[10px] pl-2 font-medium">${mainFabricLine}</div>` : ''}
              ${att1Line ? `<div class="text-gray-400 text-[10px] pl-2 font-medium">${att1Line}</div>` : ''}
              ${att2Line ? `<div class="text-gray-400 text-[10px] pl-2 font-medium">${att2Line}</div>` : ''}
            </div>
          `;

          const price = Number(item.unit_price) || 0;
          const total = Number(item.total_price) || 0;

          itemsHtml += `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td class="py-3.5 px-4">${firstCellHtml}</td>
              <td class="py-3.5 px-4 text-gray-800 text-xs text-right font-black">${qty}</td>
              <td class="py-3.5 px-4 text-gray-700 text-xs text-right font-mono">₹ ${price.toFixed(2)}</td>
              <td class="py-3.5 px-4 text-[#2d8d9b] text-xs text-right font-black font-mono">₹ ${total.toFixed(2)}</td>
            </tr>
          `;
        });
      });
    } else {
      standardItems.forEach((item: any) => {
        const pTypeName = item.product_name || item.size_breakdown?.product_name || item.manual_item_name || item.product_types?.name || item.product_type_name || 'Uniform Item';
        
        const className = item.size_breakdown?.class_name;
        const classPrefix = className ? `[${className}] ` : '';
        
        const firstCellHtml = `<span class="font-bold text-gray-800 text-xs">${classPrefix}${pTypeName}</span>`;

        const price = Number(item.unit_price) || 0;
        const total = Number(item.total_price) || 0;
        const qty = Number(item.quantity) || 0;

        itemsHtml += `
          <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3.5 px-4">${firstCellHtml}</td>
            <td class="py-3.5 px-4 text-gray-800 text-xs text-right font-black">${qty}</td>
            <td class="py-3.5 px-4 text-gray-700 text-xs text-right font-mono">₹ ${price.toFixed(2)}</td>
            <td class="py-3.5 px-4 text-[#2d8d9b] text-xs text-right font-black font-mono">₹ ${total.toFixed(2)}</td>
          </tr>
        `;
      });
    }
  }

  const customerGstin = quote.metrics_summary?.customer_gstin || quote.organizations?.gst_number || '';
  const customerPan = quote.metrics_summary?.customer_pan || quote.organizations?.pan_number || '';
  const customerLegalName = quote.metrics_summary?.customer_legal_name || quote.organizations?.legal_name || '';
  const isB2B = Boolean(customerGstin || quote.metrics_summary?.is_b2b || quote.organizations?.is_b2b || quote.metrics_summary?.sales_type === 'B2B');

  const deliveryAddress = quote.metrics_summary?.delivery_address || quote.organizations?.delivery_address || quote.organizations?.address || '';
  const deliveryCity = quote.metrics_summary?.delivery_city || quote.organizations?.delivery_city || quote.organizations?.city || '';
  const deliveryState = quote.metrics_summary?.delivery_state || quote.organizations?.delivery_state || quote.organizations?.state || '';
  const deliveryPincode = quote.metrics_summary?.delivery_pincode || quote.organizations?.delivery_pincode || quote.organizations?.pincode || '';
  const fullDeliveryAddress = [deliveryAddress, deliveryCity, deliveryState, deliveryPincode].filter(Boolean).join(', ');

  const halfGstRate = (pricing.gstRate / 2);
  const halfGstVal = (pricing.gstValue / 2);

  return `
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
        @page {
          margin: 0;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: white;
            padding: 2cm !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            border-radius: 0 !important;
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
      <div class="max-w-4xl mx-auto border border-gray-150 p-8 md:p-10 rounded-[2.5rem] shadow-sm relative bg-white print-container">
        
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
               <span class="text-xl font-black italic tracking-tighter text-[#3a525d] font-outfit">${companySettings.company_name.toUpperCase()}</span>
            </div>
            <p class="text-[9px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] mt-1.5 pl-0.5">Corporate Apparel & Sizing Specialists</p>
            <p class="text-[10px] text-gray-400 mt-2 font-medium">${companySettings.address}<br/>${companySettings.phone} | ${companySettings.email}</p>
          </div>

          <div class="text-right">
            <span class="px-3 py-1 bg-[#2d8d9b]/10 text-[#2d8d9b] font-black text-[9px] uppercase tracking-widest rounded-lg border border-[#2d8d9b]/15 inline-block">
              ${quote.status} ${isB2B ? 'B2B Tax Proposal' : 'Proposal'}
            </span>
            <h1 class="text-xl font-black text-gray-800 mt-2 font-outfit">${quote.quotation_no}</h1>
            <p class="text-xs text-gray-500 font-bold mt-1">Date: ${dateStr}</p>
          </div>
        </div>

        <!-- CLIENT & TARGET INFO -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-gray-100 text-xs">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prepared For</p>
              ${isB2B ? `
                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  B2B Commercial Tax Invoice
                </span>
              ` : ''}
            </div>
            <p class="text-sm font-black text-gray-800">${orgName}</p>
            ${customerLegalName && customerLegalName !== orgName ? `
              <p class="text-[11px] font-bold text-gray-700 mt-0.5">Legal: ${customerLegalName}</p>
            ` : ''}
            ${customerGstin ? `
              <div class="mt-1.5 flex flex-wrap items-center gap-2">
                <span class="font-mono text-[10px] font-black text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  GSTIN: ${customerGstin}
                </span>
                ${customerPan ? `
                  <span class="font-mono text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                    PAN: ${customerPan}
                  </span>
                ` : ''}
              </div>
            ` : ''}
            ${quote.organizations?.address ? `
              <p class="text-gray-500 mt-1.5 font-medium leading-relaxed">
                Billing Address: ${quote.organizations.address}${quote.organizations.city ? `, ${quote.organizations.city}` : ''}${quote.organizations.pincode ? ` - ${quote.organizations.pincode}` : ''}
              </p>
            ` : ''}
          </div>

          <div class="md:text-right space-y-3">
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Expected Delivery Target</p>
              <p class="text-sm font-black text-[#2d8d9b] mt-0.5">${deliveryDateStr}</p>
              <p class="text-gray-500 text-[10px] font-medium">Est. Days: ${quote.production_days_estimate} Production Days</p>
            </div>
            ${fullDeliveryAddress ? `
              <div class="pt-2 border-t border-gray-50">
                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Delivery / Dispatch Destination</p>
                <p class="text-gray-700 font-bold text-xs mt-0.5 leading-snug">${fullDeliveryAddress}</p>
              </div>
            ` : ''}
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
        <div class="py-8 page-break">
          <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Quotation Product Specifications</p>
          <div class="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest text-gray-500">
                  <th class="py-3 px-4">Garment Line</th>
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
          <div class="w-80 space-y-2.5 text-xs font-bold text-gray-500">
            <div class="flex justify-between">
              <span>Taxable Value (Pre-Tax):</span>
              <span class="font-mono text-gray-800 font-black">₹ ${pricing.subtotal.toFixed(2)}</span>
            </div>
            ${isB2B && pricing.gstRate > 0 ? `
              <div class="flex justify-between text-[11px] text-gray-600">
                <span>CGST (${halfGstRate}%):</span>
                <span class="font-mono font-bold">₹ ${halfGstVal.toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-[11px] text-gray-600">
                <span>SGST (${halfGstRate}%):</span>
                <span class="font-mono font-bold">₹ ${halfGstVal.toFixed(2)}</span>
              </div>
              <div class="flex justify-between border-b border-gray-100 pb-2">
                <span>Total GST Tax (${pricing.gstRate}%):</span>
                <span class="font-mono text-red-500 font-black">₹ ${pricing.gstValue.toFixed(2)}</span>
              </div>
            ` : `
              <div class="flex justify-between border-b border-gray-100 pb-2">
                <span>GST Tax (${pricing.gstRate}%):</span>
                <span class="font-mono text-red-500 font-black">₹ ${pricing.gstValue.toFixed(2)}</span>
              </div>
            `}
            <div class="flex justify-between items-end pt-2 text-[#2d8d9b]">
              <div>
                <p class="text-[9px] font-black uppercase text-gray-400 tracking-wider">
                  ${isB2B ? 'Total Commercial Contract Value' : 'Total Contract Value'}
                </p>
                <p class="text-2xl font-black font-outfit mt-0.5">₹ ${pricing.finalValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- BANK PAYMENT DETAILS -->
        <div class="mt-8 p-6 bg-gray-50/50 border border-gray-150 rounded-2xl text-[10px] text-gray-600 font-semibold grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-[8px] font-black text-gray-450 uppercase tracking-widest mb-2">Bank Transfer Details</p>
            <p><span class="text-gray-400">Bank Name:</span> ${companySettings.bank_name}</p>
            <p class="mt-1"><span class="text-gray-400">Account No:</span> <span class="font-mono text-gray-800 font-black">${companySettings.account_no}</span></p>
            <p class="mt-1"><span class="text-gray-400">Branch Name:</span> ${companySettings.branch_name}</p>
          </div>
          <div>
            <p class="text-[8px] font-black text-gray-450 uppercase tracking-widest mb-2">Alternative/UPI Payment</p>
            <p><span class="text-gray-400">IFSC Code:</span> <span class="font-mono text-gray-800 font-black">${companySettings.ifsc_code}</span></p>
            <p class="mt-1"><span class="text-gray-400">UPI Pay No:</span> <span class="font-mono text-[#2d8d9b] font-black">${companySettings.upi_id}</span></p>
          </div>
        </div>

        <!-- PAYMENT QR CODE -->
        ${companySettings.qr_image ? `
        <div class="mt-4 p-4 bg-white border border-gray-150 rounded-2xl flex flex-col items-center justify-center text-center">
          <p class="text-[8px] font-black text-gray-450 uppercase tracking-widest mb-2">Scan QR Code to Pay</p>
          <img src="${companySettings.qr_image}" alt="Payment QR Code" style="width: 120px; height: 120px; object-fit: contain;" />
        </div>
        ` : ''}

        <!-- SIGNATURES BLOCK -->
        <div class="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-100 text-xs">
          <div class="space-y-12">
            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Authorized By</p>
            <div class="border-t border-gray-200 pt-3">
              <p class="font-black text-gray-800">Forma Apparels Representative</p>
              <p class="text-gray-400 text-[10px] font-medium mt-0.5">Title: Operations Desk Manager</p>
            </div>
          </div>
          <div class="space-y-12 text-right">
            <p class="text-[9px] font-black text-gray-450 uppercase tracking-widest">Accepted By</p>
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
};
