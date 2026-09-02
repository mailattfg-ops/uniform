'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';
import { Organization } from '../../page';

interface WizardStep1Props {
  organizations: Organization[];
  selectedOrgId: string;
  onOrgSelection: (orgId: string) => void;
  quoteTitle: string;
  setQuoteTitle: (title: string) => void;
  quoteNo: string;
  setQuoteNo: (no: string) => void;
  coverLetter: string;
  setCoverLetter: (letter: string) => void;
  salesType: string;
  setSalesType: (type: string) => void;
  customerType: string;
  setCustomerType: (type: string) => void;
  quotationType?: string;
  setQuotationType?: (type: string) => void;
  isAnalyzing: boolean;
  onNext: () => void;
  generateAutoCoverLetter: () => void;
  previousOrders: any[];
  onSelectPreviousOrder: (order: any) => void;
  groupDesignCombinations: any[];
  selectedGroupDesignId: string;
  onSelectGroupDesign: (gdnId: string) => void;
  orgDepartments?: any[];
  setOrgDepartments?: (depts: any[]) => void;
}

export default function WizardStep1({
  organizations,
  selectedOrgId,
  onOrgSelection,
  quoteTitle,
  setQuoteTitle,
  quoteNo,
  setQuoteNo,
  coverLetter,
  setCoverLetter,
  salesType,
  setSalesType,
  customerType,
  setCustomerType,
  quotationType = 'STANDARD',
  setQuotationType,
  isAnalyzing,
  onNext,
  generateAutoCoverLetter,
  previousOrders,
  onSelectPreviousOrder,
  groupDesignCombinations,
  selectedGroupDesignId,
  onSelectGroupDesign,
  orgDepartments = [],
  setOrgDepartments,
}: WizardStep1Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-zinc-100 pb-6">
        <h3 className="text-2xl font-black italic text-[#3a525d]">Select Customer & Proposal Title</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
          Define customer association context
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Customer Organization</label>
          <Select
            options={organizations.map(o => ({ label: o.name, value: String(o.id) }))}
            value={selectedOrgId}
            onChange={onOrgSelection}
            placeholder="Select Customer Organization..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Quotation Contract Title</label>
          <Input
            placeholder="e.g. Formal Uniform Proposal"
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Sales Channel Type</label>
          <Select
            options={[
              { label: 'Wholesale (B2B)', value: 'WHOLESALE' },
              { label: 'Retail (B2C)', value: 'RETAIL' }
            ]}
            value={salesType}
            onChange={setSalesType}
            placeholder="Select Sales Type..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Customer Category</label>
          <Select
            options={[
              { label: 'Direct', value: 'DIRECT' },
              { label: 'Agent', value: 'AGENT' },
              { label: 'Best', value: 'BEST' }
            ]}
            value={customerType}
            onChange={setCustomerType}
            placeholder="Select Customer Category..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Quotation Type</label>
          <Select
            options={[
              { label: 'Fabric Set (with Departments)', value: 'FABRIC_SET' },
              { label: 'Readymade Set (with Departments)', value: 'READYMADE_SET' },
              { label: 'Fabric Normal', value: 'FABRIC' },
              { label: 'Readymade Normal', value: 'STANDARD' },
              { label: 'Manual (Individual-wise)', value: 'MANUAL' }
            ]}
            value={quotationType}
            onChange={setQuotationType}
            placeholder="Select Quotation Type..."
          />
        </div>

      </div>

      {selectedOrgId && (
        <>
          {orgDepartments && orgDepartments.length > 0 && (quotationType === 'FABRIC_SET' || quotationType === 'READYMADE_SET' || quotationType === 'MANUAL') && (
            <div className="space-y-4 border-t border-zinc-100 pt-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Select Departments for Quotation</h4>
                <p className="text-[9px] text-[#2d8d9b] font-bold mt-0.5">Check the departments to include — person counts and sets are configured in the next step</p>
              </div>
              <div className="overflow-hidden border border-zinc-200 rounded-3xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider w-16 text-center">Select</th>
                      <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider">Department Name</th>
                      <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider">Division / Section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150/70">
                    {orgDepartments.map((dept) => (
                      <tr key={dept.id} className={`hover:bg-zinc-50/50 transition-colors ${dept.selected ? 'bg-[#2d8d9b]/5' : ''}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={dept.selected}
                            onChange={(e) => {
                              if (setOrgDepartments) {
                                const updated = orgDepartments.map(d => d.id === dept.id ? { ...d, selected: e.target.checked } : d);
                                setOrgDepartments(updated);
                              }
                            }}
                            className="w-4 h-4 rounded text-[#2d8d9b] border-zinc-300 focus:ring-[#2d8d9b]/25"
                          />
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-black text-[#3a525d]">{dept.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-bold text-zinc-400">{dept.division || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>
      )}
      {/* PREVIOUS ORDERS - always visible, all orders */}
      <div className="space-y-4 border-t border-zinc-100 pt-6">
        <div className="relative">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Previous Orders / Quotations Registry</h4>
          <p className="text-[9px] text-[#2d8d9b] font-bold mt-0.5">Click any order card to copy its product details and edit them</p>
        </div>
        {previousOrders.length === 0 ? (
          <p className="text-[10px] text-zinc-400 font-bold italic bg-zinc-50 border border-zinc-200 p-4 rounded-xl">No previous orders in registry yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previousOrders.map((q, idx) => (
              <div
                key={q.id || idx}
                onClick={() => onSelectPreviousOrder(q)}
                className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-[#2d8d9b] rounded-2xl p-4 cursor-pointer transition-all flex flex-col gap-2 group relative"
              >
                <div>
                  <p className="text-xs font-black text-[#3a525d] group-hover:text-[#2d8d9b] truncate">{q.title}</p>
                  <p className="text-[9px] font-bold text-zinc-400 mt-0.5">
                    {q.organizations?.name && (
                      <span className="text-[#2d8d9b] font-black">{q.organizations.name} · </span>
                    )}
                    {q.quotation_no || 'Auto'} · {new Date(q.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-black text-emerald-600">₹{parseFloat(q.final_quote_value || 0).toFixed(2)}</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-zinc-50 text-zinc-500 border border-zinc-200">
                    {q.status}
                  </span>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all text-[8px] font-black uppercase bg-[#2d8d9b] text-white px-2 py-0.5 rounded-[4px]">
                  Use Order Details
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-zinc-100 pt-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
            Proposal Cover Letter (100% Customizable)
          </label>
          <button
            type="button"
            disabled={!selectedOrgId}
            onClick={generateAutoCoverLetter}
            className="px-3.5 py-1.5 bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40"
          >
            ✨ Auto-Generate Cover Letter Template
          </button>
        </div>
        <textarea
          rows={6}
          placeholder="Enter custom cover letter introduction for the client proposal..."
          className="w-full bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 transition-all leading-relaxed"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
        />
      </div>

      <div className="flex justify-end pt-6">
        <Button
          disabled={!selectedOrgId || !quoteTitle.trim() || isAnalyzing}
          onClick={onNext}
          className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
        >
          {isAnalyzing ? 'Analyzing Sizing...' : 'Sizing Audit & Next'} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
