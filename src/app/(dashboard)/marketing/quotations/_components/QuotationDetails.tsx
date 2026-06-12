'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Building2, Edit, Scale, Clock, Calendar, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Quotation } from '../page';

interface QuotationDetailsProps {
  selectedQuotation: Quotation;
  fabricsList: any[];
  onBack: () => void;
  onStartEdit: (q: Quotation) => void;
}

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

export default function QuotationDetails({
  selectedQuotation,
  fabricsList,
  onBack,
  onStartEdit,
}: QuotationDetailsProps) {

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

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const res = await api.get('/company-settings');
        if (res.data?.success && res.data.data) {
          setCompanySettings(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load company settings in QuotationDetails', err);
      }
    };
    fetchCompanySettings();
  }, []);

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
            const pTypeName = item.product_types?.name || item.product_type_name || 'Uniform Item';
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
          const pTypeName = item.product_types?.name || item.product_type_name || 'Uniform Item';
          const fabricId = item.size_breakdown?.fabric_id;
          const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));
          const fabricBrand = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
          const firstCellHtml = `<span class="font-bold text-gray-800 text-xs">${pTypeName}</span>`;

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

    let separateFabricsHtml = '';
    const separateFabricsList = quote.metrics_summary?.separate_fabrics;
    if (separateFabricsList && separateFabricsList.length > 0) {
      let sfRowsHtml = '';
      separateFabricsList.forEach((sf: any) => {
        const fabric = fabricsList.find((f: any) => String(f.id) === String(sf.fabric_id));
        const fabricName = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
        const shade = fabric?.shade ? ` (Shade: ${fabric.shade})` : '';
        const width = fabric?.width ? ` - Width: ${fabric.width}"` : '';
        const meters = Number(sf.meters) || 0;
        const rate = Number(sf.rate) || 0;
        const total = meters * rate;
        
        sfRowsHtml += `
          <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3.5 px-4">${fabricName}${shade}${width}</td>
            <td class="py-3.5 px-4 text-gray-800 text-xs text-right font-black">${meters} m</td>
            <td class="py-3.5 px-4 text-gray-700 text-xs text-right font-mono">₹ ${rate.toFixed(2)}</td>
            <td class="py-3.5 px-4 text-[#2d8d9b] text-xs text-right font-black font-mono">₹ ${total.toFixed(2)}</td>
          </tr>
        `;
      });
      
      separateFabricsHtml = `
        <div class="py-8 page-break">
          <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Separate Fabric Materials Supplied</p>
          <div class="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest text-gray-500">
                  <th class="py-3 px-4">Fabric Details</th>
                  <th class="py-3 px-4 text-right font-mono">Meters</th>
                  <th class="py-3 px-4 text-right w-36">Rate/Meter</th>
                  <th class="py-3 px-4 text-right w-36">Total Price</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 font-semibold">
                ${sfRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
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
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 text-xs">
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prepared For</p>
              <p class="text-sm font-black text-gray-800 mt-1">${orgName}</p>
              <p class="text-gray-500 mt-0.5 font-medium">Associated Uniform Contract Client</p>
            </div>
            <div class="md:text-center">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Group Design Number</p>
              <p class="text-sm font-black text-[#2d8d9b] mt-1">${quote.group_design_number?.code || '—'}</p>
              <p class="text-gray-500 mt-0.5 font-medium">Auto-generated Design Collection</p>
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

          <!-- DEPARTMENTS BREAKDOWN SECTION -->
          ${quote.metrics_summary?.departments && quote.metrics_summary.departments.length > 0 ? `
            <div class="py-8 border-b border-gray-100">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Target Departments Sizing Breakdown</p>
              <div class="border border-gray-150 rounded-2xl overflow-hidden shadow-sm max-w-2xl bg-white">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-gray-50 border-b border-gray-150 text-[9px] font-black uppercase tracking-widest text-gray-500">
                      <th class="py-3 px-4">Department Name</th>
                      <th class="py-3 px-4">Division</th>
                      <th class="py-3 px-4 text-right">No. of Persons</th>
                      <th class="py-3 px-4 text-right">Sets per Person</th>
                      <th class="py-3 px-4 text-right font-mono">Total Qty</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 font-semibold text-xs text-gray-650">
                    ${quote.metrics_summary.departments.map((dept: any) => `
                      <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="py-3 px-4 font-black text-gray-800">${dept.name}</td>
                        <td class="py-3 px-4 text-gray-400">${dept.division || '—'}</td>
                        <td class="py-3 px-4 text-right">${dept.persons}</td>
                        <td class="py-3 px-4 text-right">${dept.sets}</td>
                        <td class="py-3 px-4 text-right font-black text-[#2d8d9b]">${dept.persons * dept.sets}</td>
                      </tr>
                    `).join('')}
                    <!-- Total Row -->
                    <tr class="bg-gray-50/30 border-t border-gray-150 text-[10px] font-black uppercase text-gray-800">
                      <td class="py-3 px-4" colspan="2">Total</td>
                      <td class="py-3 px-4 text-right">
                        ${quote.metrics_summary.departments.reduce((sum: number, d: any) => sum + (d.persons || 0), 0)}
                      </td>
                      <td class="py-3 px-4"></td>
                      <td class="py-3 px-4 text-right text-[#2d8d9b]">
                        ${quote.metrics_summary.departments.reduce((sum: number, d: any) => sum + ((d.persons || 0) * (d.sets || 0)), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
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

          ${separateFabricsHtml}

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
                  <p class="text-2xl font-black italic font-outfit mt-0.5">₹ ${pricing.finalValue.toFixed(2)}</p>
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

  const pricing = getSelectedQuotePricing(selectedQuotation);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Card className="p-10 border border-zinc-100 rounded-[3rem] shadow-2xl space-y-8 bg-white">
        {/* OVERVIEW PANEL HEADER */}
        <div className="flex justify-between items-center border-b border-zinc-100 pb-6 flex-wrap gap-4">
          <div>
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10 tracking-widest">
              {selectedQuotation.quotation_no}
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter text-[#3a525d] mt-2">{selectedQuotation.title}</h3>
            <p className="text-xs font-bold text-zinc-400 mt-1">
              Registered: {new Date(selectedQuotation.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 h-full"
            >
              <ArrowLeft size={14} />
              Back
            </Button>
            <Button
              onClick={() => handleDownloadPDF(selectedQuotation)}
              className="flex items-center gap-1.5 bg-[#2d8d9b] hover:bg-[#3a525d] text-white rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-[#2d8d9b]/10 border-none"
            >
              📥 Download Proposal PDF
            </Button>
            {selectedQuotation.status !== 'Approved' && (
              <Button
                variant="outline"
                onClick={() => onStartEdit(selectedQuotation)}
                className="flex items-center gap-1.5 border border-amber-500 hover:bg-amber-50 text-amber-600 rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-widest bg-white h-full"
              >
                <Edit size={14} />
                Edit Quotation
              </Button>
            )}
            <span className="px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm font-black text-[#3a525d]">
              Status: <strong className="text-[#2d8d9b] uppercase">{selectedQuotation.status}</strong>
            </span>
          </div>
        </div>

        {/* TWO COLUMN DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* PRIMARY VARIABLES */}
          <div className="md:col-span-2 space-y-6">
            {/* CORE SPECS CARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    : (selectedQuotation.items?.[0]?.product_types?.name || 'Uniform item')}
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
                  {selectedQuotation.expected_delivery_date
                    ? new Date(selectedQuotation.expected_delivery_date).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A'}
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

            {/* COVER LETTER BANNER CALLOUT */}
            {selectedQuotation.metrics_summary?.cover_letter && (
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

            {/* PRODUCT ITEMS TABLE (FOR MANUAL MODE) OR SIZING MAP */}
            {selectedQuotation.items && selectedQuotation.items.some((item: any) => item.size_breakdown?.is_manual) ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product Lines Breakdown</h4>
                <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
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
                        const standardItems = selectedQuotation.items.filter((item: any) => !item.size_breakdown?.is_separate_fabric);
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
                              const pTypeName = item.product_types?.name || item.product_type_name || 'Uniform Item';
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

                              const firstCellJSX = (
                                <div className="space-y-0.5 py-1 text-left">
                                  <div className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider">{deptHeader}</div>
                                  <div className="font-semibold text-zinc-650 text-xs">{productLine}</div>
                                  {mainFabricLine && <div className="text-zinc-450 text-[10px] pl-2 font-medium">{mainFabricLine}</div>}
                                  {att1Line && <div className="text-zinc-455 text-[10px] pl-2 font-medium">{att1Line}</div>}
                                  {att2Line && <div className="text-zinc-455 text-[10px] pl-2 font-medium">{att2Line}</div>}
                                </div>
                              );
                              const fabricStyleJSX = <span className="text-zinc-350">—</span>;

                              const designNum = item.size_breakdown?.product_design_number || item.size_breakdown?.design_number || '—';
                              const sam = item.size_breakdown?.sam_value ? `₹ ${Number(item.size_breakdown.sam_value).toFixed(2)}` : 'N/A';
                              const price = Number(item.unit_price) || 0;
                              const total = Number(item.total_price) || 0;

                              return (
                                <tr key={`${cleanDeptName}-${item.id || idx}`} className="hover:bg-zinc-50/50 bg-white">
                                  <td className="p-3">{firstCellJSX}</td>
                                  <td className="p-3">{fabricStyleJSX}</td>
                                  <td className="p-3 font-mono">
                                    {sam}
                                  </td>
                                  <td className="p-3 text-zinc-550 text-xs">
                                    {designNum}
                                  </td>
                                  <td className="p-3 text-right font-black">{qty}</td>
                                  <td className="p-3 text-right font-mono">₹{price.toFixed(2)}</td>
                                  <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">₹{total.toFixed(2)}</td>
                                </tr>
                              );
                            })
                          ]);
                        } else {
                          return standardItems.map((item: any, idx: number) => {
                            const pTypeName = item.product_types?.name || item.product_type_name || 'Uniform Item';
                            const fabricId = item.size_breakdown?.fabric_id;
                            const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));
                            const fabricBrand = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
                            
                            const className = item.size_breakdown?.class_name;
                            const classPrefix = className ? `[${className}] ` : '';
                            
                            const firstCellJSX = <span className="font-black text-[#3a525d]">{classPrefix}{pTypeName}</span>;
                            const fabricStyleJSX = <span className="text-zinc-500">{fabricBrand}</span>;

                            const designNum = item.size_breakdown?.product_design_number || item.size_breakdown?.design_number || '—';
                            const sam = item.size_breakdown?.sam_value ? `₹ ${Number(item.size_breakdown.sam_value).toFixed(2)}` : 'N/A';
                            const price = Number(item.unit_price) || 0;
                            const total = Number(item.total_price) || 0;

                            return (
                              <tr key={item.id || idx}>
                                <td className="p-3">{firstCellJSX}</td>
                                <td className="p-3">{fabricStyleJSX}</td>
                                <td className="p-3 font-mono">
                                  {sam}
                                </td>
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
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Sizing Aggregation Details</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedQuotation.metrics_summary?.sizes &&
                    Object.keys(selectedQuotation.metrics_summary.sizes).map((sz) => (
                      <div key={sz} className="bg-zinc-50 border border-zinc-150 px-4 py-2.5 rounded-xl text-xs font-bold text-[#3a525d]">
                        <strong>{sz}</strong>: {selectedQuotation.metrics_summary.sizes?.[sz] || 0} Units
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* SEPARATE FABRICS TABLE */}
            {selectedQuotation.metrics_summary?.separate_fabrics && selectedQuotation.metrics_summary.separate_fabrics.length > 0 && (
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

            {/* DEPARTMENTS BREAKDOWN TABLE */}
            {selectedQuotation.metrics_summary?.departments && selectedQuotation.metrics_summary.departments.length > 0 && (
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
          </div>

          {/* REVENUE STATISTICS CARD */}
          <Card className="p-8 border border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2.5rem] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#3a525d]">
                <Scale size={18} />
                <h4 className="text-xs font-black uppercase tracking-widest">Financial Audit</h4>
              </div>

              <div className="space-y-3 divide-y divide-zinc-200/50 text-sm font-semibold">
                <div className="flex justify-between py-2 text-zinc-500">
                  <span>Total Entities Quantity:</span>
                  <span className="text-[#3a525d] font-black">{selectedQuotation.metrics_summary?.total_entities || 0} Items</span>
                </div>
                <div className="flex justify-between py-2 text-zinc-500">
                  <span>Accumulated Expenses:</span>
                  <span className="font-mono text-[#3a525d]">₹{Number(selectedQuotation.estimated_expenses).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-zinc-500">
                  <span>Profit Markup Margin:</span>
                  <span className="font-mono text-green-600">+{selectedQuotation.profit_margin_percent}%</span>
                </div>
                <div className="flex justify-between py-2 text-zinc-500">
                  <span>Subtotal (Pre-Tax):</span>
                  <span className="font-mono text-[#3a525d] font-black">₹{pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-zinc-500 text-red-500">
                  <span>GST Tax ({pricing.gstRate}%):</span>
                  <span className="font-mono font-black">₹{pricing.gstValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-zinc-500">
                  <span>Suggested Retail/Item (Pre-Tax):</span>
                  <span className="font-mono text-[#2d8d9b] font-black">
                    ₹{(Number(pricing.subtotal) / (selectedQuotation.metrics_summary?.total_entities || 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-4 mt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60 font-black">
                Total Contract Value (With GST)
              </p>
              <p className="text-4xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-1">
                ₹{Number(selectedQuotation.final_quote_value).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}
