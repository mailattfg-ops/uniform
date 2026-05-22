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
  isAnalyzing: boolean;
  onNext: () => void;
  generateAutoCoverLetter: () => void;
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
  isAnalyzing,
  onNext,
  generateAutoCoverLetter,
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
          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Manual Quote No (Optional)</label>
          <Input
            placeholder="e.g. QT-99081 (Leave blank to auto generate)"
            value={quoteNo}
            onChange={(e) => setQuoteNo(e.target.value)}
          />
        </div>
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
