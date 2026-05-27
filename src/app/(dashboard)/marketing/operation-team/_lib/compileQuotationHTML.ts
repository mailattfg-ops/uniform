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
}

export interface QuotationItem {
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
  pdf_html?: string;
}

// Helper to extract pricing totals
export const getSelectedQuotePricing = (quote: Quotation) => {
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

// Helper to compile full HTML layout for PDF printing/saving
export const compileQuotationHTML = (quote: Quotation, fabricsList: Fabric[], companySettings: any) => {
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
      const sam = item.size_breakdown?.sam_value ? `₹ ${Number(item.size_breakdown.sam_value).toFixed(2)}` : '—';
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
          <td class="py-3.5 px-4 text-gray-700 text-xs text-right font-mono">₹ ${price.toFixed(2)}</td>
          <td class="py-3.5 px-4 text-[#2d8d9b] text-xs text-right font-black font-mono">₹ ${total.toFixed(2)}</td>
        </tr>
      `;
    });
  }

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
        <div class="py-8 page-break">
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
              <span class="font-mono text-gray-800 font-black">₹ ${pricing.subtotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 pb-2">
              <span>GST Tax (${pricing.gstRate}%):</span>
              <span class="font-mono text-red-500 font-black">₹ ${pricing.gstValue.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-end pt-2 text-[#2d8d9b]">
              <div>
                <p class="text-[9px] font-black uppercase text-gray-400 tracking-wider">Total Contract Value</p>
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
