'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { Plus, Edit2, Trash2, Box, Tag, Camera, ChevronDown, Layers, FolderTree, Bookmark, Sparkles, X, AlertTriangle, CheckCircle2, Info, ExternalLink, Scissors, FileText, MoreHorizontal } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface RemarkEntry {
  title: string;
  changes: string;
  added: string;
  removed: string;
  images: string[];
}

export interface AttachmentFabricEntry {
  id: string;
  role?: string;
  fabric_id?: string;
  meters: string;
}

export interface TrimEntry {
  id: string;
  category?: string;
  trim_id?: string;
  count: string;
  uom: string;
  name?: string;
}

interface Product {
  id: number;
  name: string;
  art_number: string;
  design_number?: string | null;
  gender: string;
  category: string;
  description?: string | null;
  measurements: string[];
  materials: string;
  images?: string[];
  sam_value?: number | null;
  retail_sam_value?: number | null;
  entry_methods?: string[];
  size_chart_id?: string;
  product_type_id?: number | string;
  product_types?: { id: number; name: string };
  main_fabric?: number | null;
  attachment_fabric1?: number | null;
  attachment_fabric2?: number | null;
  main_fabric_id?: string | number | null;
  button_id?: string | null;
  thread_id?: string | null;
  button_count?: number | null;
  thread_count?: number | null;
  attachment_fabrics?: AttachmentFabricEntry[] | null;
  trims?: TrimEntry[] | null;
  created_at: string;
  base_size?: string | null;
  fit?: string | null;
  allowance?: string | number | null;
  other_sizes?: string | null;
  other_fits?: string | null;
  measurement_type?: string | null;
  class_fabric_consumption?: Record<string, Record<string, string>> | null;
  remarks?: RemarkEntry[] | null;
}

const parseArtNumber = (artNumber: string, dresses: any[], genders: any[], patterns: any[]) => {
  if (!artNumber) return { dressCode: '', genderCode: '', patternCode: '', fitCode: '', allowance: '' };

  const parts = artNumber.split('-');

  

  // Option 1 format: [DressPrefix]-[GenderPattern]-[FitAllowance] (e.g. 4J-1012-R2, 4J-1012-R1.5, or 4J-1012-R)
  if (parts.length === 3) {
    const [dressCode, middle, lastPart] = parts;
    const fitMatch = lastPart.match(/^([A-Za-z]+)(.*)$/);
    if (fitMatch && isNaN(Number(lastPart))) {
      const fitCode = fitMatch[1].toUpperCase();
      const allowance = fitMatch[2] ? fitMatch[2].trim() : '';
      const genderCode = middle.slice(0, 1);
      const patternCode = middle.slice(1);
      return { dressCode, genderCode, patternCode, fitCode, allowance };
    }
    // Legacy 3-part: [DressPrefix]-[GenderCode]-[PatternCode] (e.g. 4J-1-012)
    return { dressCode, genderCode: middle, patternCode: lastPart, fitCode: '', allowance: '' };
  }

  // Fallback for 2-part legacy format
  if (parts.length === 2) {
    const isFirstDress = dresses.some(d => d.code === parts[0]);
    if (isFirstDress) {
      const dressCode = parts[0];
      const rest = parts[1]; // e.g. "1012"
      for (const g of genders) {
        if (rest.startsWith(g.code)) {
          const remainder = rest.slice(g.code.length);
          return { dressCode, genderCode: g.code, patternCode: remainder, fitCode: '', allowance: '' };
        }
      }
    }

    const genderCode = parts[0];
    const rest = parts[1]; // e.g. "4J012"
    for (const dress of dresses) {
      if (rest.startsWith(dress.code)) {
        const remainder = rest.slice(dress.code.length);
        return { dressCode: dress.code, genderCode, patternCode: remainder, fitCode: '', allowance: '' };
      }
    }
  }

  return { dressCode: '', genderCode: '', patternCode: '', fitCode: '', allowance: '' };
};

export const parseMaterialsField = (rawText: string | undefined | null) => {
  if (!rawText) return { type: '', materials: '' };
  const match = rawText.match(/^\[ProductType:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { type: match[1], materials: match[2] };
  }
  return { type: '', materials: rawText };
};



const MultiEntryInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  buttonText?: string;
}> = ({ value, onChange, placeholder = "Type a value and press Enter", buttonText = "Add" }) => {
  const [inputVal, setInputVal] = useState('');
  const items = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      toast.error('Value already added.');
      return;
    }
    const updated = [...items, trimmed];
    onChange(updated.join(', '));
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-12 bg-white border border-[#fce4d4] rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 text-[#3a525d]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="h-12 px-6 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center shadow-md shadow-[#C82A2B]/20 active:scale-95 cursor-pointer"
        >
          {buttonText}
        </button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-4 bg-zinc-50/50 rounded-2xl border border-zinc-150/50">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 text-[#2d8d9b] text-xs font-black uppercase rounded-lg hover:bg-red-50 hover:text-red-650 hover:border-red-200 transition-all cursor-pointer group"
              onClick={() => handleRemove(idx)}
              title="Click to remove"
            >
              {item}
              <span className="text-[10px] text-[#2d8d9b] group-hover:text-red-500 font-normal">×</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-400 font-bold italic ml-1">No entries added yet.</p>
      )}
    </div>
  );
};

const CLASSES_LIST = [
  'Class1', 'Class2', 'Class3', 'Class4', 'Class5', 'Class6',
  'Class7', 'Class8', 'Class9', 'Class10', 'Class11', 'Class12',
  'C1', 'C2', 'Corporate'
];



const ATTACHMENT_ROLE_PRESETS = [
  'Contrast Collar & Cuffs',
  'Pocketing Fabric',
  'Inner Lining',
  'Yoke / Contrast Patch',
  'Piping / Contrast Trim',
  'Waistband Lining',
  'Placket Trim',
  'Sleeve Hem Trim',
  'Other Secondary Fabric'
];

const AttachmentFabricsEditor: React.FC<{
  value: AttachmentFabricEntry[] | null | undefined;
  onChange: (val: AttachmentFabricEntry[]) => void;
  fabrics?: any[];
}> = ({ value, onChange }) => {
  const currentList = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const newItem: AttachmentFabricEntry = {
      id: Date.now().toString(),
      role: ATTACHMENT_ROLE_PRESETS[currentList.length % ATTACHMENT_ROLE_PRESETS.length],
      meters: '0.25'
    };
    onChange([...currentList, newItem]);
  };

  const handleUpdate = (index: number, updates: Partial<AttachmentFabricEntry>) => {
    const updated = currentList.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, ...updates };
    });
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(currentList.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4 bg-zinc-50/70 p-5 rounded-3xl border border-zinc-200">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center font-black">
            <Layers size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
              Attachment Fabrics (Optional)
            </h4>
            <p className="text-[10px] text-zinc-400 font-bold">
              Role & consumption for contrast collar/cuffs, pocketing, or lining fabrics (Add fabric length based on standard 58" width)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-3.5 py-1.5 bg-[#A81D1E] hover:bg-[#8F1618] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm shadow-[#A81D1E]/20 active:scale-95 cursor-pointer"
        >
          <Plus size={14} /> Add Attachment Fabric
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-zinc-200 rounded-2xl bg-white/50">
          <p className="text-xs text-zinc-400 font-bold italic">
            No attachment fabrics added. Click &quot;+ Add Attachment Fabric&quot; if this product uses contrast or secondary fabrics.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((item, index) => (
            <div key={item.id || index} className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm flex-wrap sm:flex-nowrap">
              <span className="text-[10px] font-black text-zinc-400 uppercase w-12 shrink-0">
                Att #{index + 1}
              </span>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#3a525d] block mb-1">
                  Fabric Role / Placement
                </label>
                <div className="flex gap-2">
                  <select
                    value={ATTACHMENT_ROLE_PRESETS.includes(item.role || '') ? item.role : 'Custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'Custom') {
                        handleUpdate(index, { role: e.target.value });
                      }
                    }}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                  >
                    {ATTACHMENT_ROLE_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))}
                    <option value="Custom">Custom Role...</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Role description (e.g. Contrast Collar)"
                    value={item.role || ''}
                    onChange={(e) => handleUpdate(index, { role: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                  />
                </div>
              </div>
              <div className="w-32 shrink-0">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#3a525d] block mb-1">
                  Meters (58" width)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 0.25 (58&quot;)"
                  value={item.meters}
                  onChange={(e) => handleUpdate(index, { meters: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                />
              </div>
              <div className="pt-5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  title="Remove attachment fabric"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TRIM_CATEGORY_PRESETS = [
  { category: 'Buttons', uom: 'Pcs', defaultCount: '6' },
  { category: 'Sewing Thread', uom: 'Cones', defaultCount: '1' },
  { category: 'Zipper', uom: 'Pcs', defaultCount: '1' },
  { category: 'Elastic', uom: 'Meters', defaultCount: '0.75' },
  { category: 'Brand Label / Tag', uom: 'Pcs', defaultCount: '1' },
  { category: 'Care / Size Label', uom: 'Pcs', defaultCount: '1' },
  { category: 'Interlining / Fusing', uom: 'Meters', defaultCount: '0.15' },
  { category: 'Velcro / Fastener', uom: 'Meters', defaultCount: '0.10' },
  { category: 'Drawcord / Cord', uom: 'Meters', defaultCount: '1.0' },
  { category: 'Eyelet / Rivet', uom: 'Pcs', defaultCount: '2' },
  { category: 'Badge / School Crest', uom: 'Pcs', defaultCount: '1' },
  { category: 'Other Trim', uom: 'Pcs', defaultCount: '1' }
];

const TrimsEditor: React.FC<{
  value: TrimEntry[] | null | undefined;
  onChange: (val: TrimEntry[]) => void;
  trimsList?: any[];
}> = ({ value, onChange }) => {
  const currentList = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const firstCat = TRIM_CATEGORY_PRESETS[currentList.length % TRIM_CATEGORY_PRESETS.length];
    const newItem: TrimEntry = {
      id: Date.now().toString(),
      category: firstCat.category,
      count: firstCat.defaultCount,
      uom: firstCat.uom,
      name: ''
    };
    onChange([...currentList, newItem]);
  };

  const handleUpdate = (index: number, updates: Partial<TrimEntry>) => {
    const updated = currentList.map((item, idx) => {
      if (idx !== index) return item;
      const merged = { ...item, ...updates };
      if (updates.category !== undefined) {
        const found = TRIM_CATEGORY_PRESETS.find(p => p.category === updates.category);
        if (found) {
          merged.uom = found.uom;
          if (!merged.count || merged.count === '0' || merged.count === '1') {
            merged.count = found.defaultCount;
          }
        }
      }
      return merged;
    });
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(currentList.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4 bg-zinc-50/70 p-5 rounded-3xl border border-zinc-200">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
            <Tag size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
              Trims & Accessories Specification (Optional)
            </h4>
            <p className="text-[10px] text-zinc-400 font-bold">
              Select trim category and quantity per garment. (Inventory SKU selection happens in Quotation / Production)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-3.5 py-1.5 bg-[#A81D1E] hover:bg-[#8F1618] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm shadow-[#A81D1E]/20 active:scale-95 cursor-pointer"
        >
          <Plus size={14} /> Add Trim
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-zinc-200 rounded-2xl bg-white/50">
          <p className="text-xs text-zinc-400 font-bold italic">
            No trims configured. Click &quot;+ Add Trim&quot; to specify required buttons, threads, zippers, elastics, or labels.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((item, index) => (
            <div key={item.id || index} className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm flex-wrap sm:flex-nowrap">
              <span className="text-[10px] font-black text-zinc-400 uppercase w-12 shrink-0">
                Trim #{index + 1}
              </span>
              <div className="flex-1 min-w-[160px]">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#3a525d] block mb-1">
                  Category
                </label>
                <select
                  value={item.category || item.name || 'Buttons'}
                  onChange={(e) => handleUpdate(index, { category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                >
                  {TRIM_CATEGORY_PRESETS.map((preset) => (
                    <option key={preset.category} value={preset.category}>
                      {preset.category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24 shrink-0">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#3a525d] block mb-1">
                  Qty / Count
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 6"
                  value={item.count}
                  onChange={(e) => handleUpdate(index, { count: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                />
              </div>
              <div className="w-24 shrink-0">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#3a525d] block mb-1">
                  UOM
                </label>
                <select
                  value={item.uom || 'Pcs'}
                  onChange={(e) => handleUpdate(index, { uom: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                >
                  <option value="Pcs">Pcs</option>
                  <option value="Cones">Cones</option>
                  <option value="Meters">Meters</option>
                  <option value="Gross">Gross</option>
                  <option value="Sets">Sets</option>
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#3a525d] block mb-1">
                  Specification (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 18L 4-hole / 40/2 Poly"
                  value={item.name || ''}
                  onChange={(e) => handleUpdate(index, { name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                />
              </div>
              <div className="pt-5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  title="Remove trim"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ClassConsumptionMatrixEditor: React.FC<{
  value: Record<string, Record<string, string>> | null | undefined;
  onChange: (val: Record<string, Record<string, string>>) => void;
  classesList: string[];
  attachmentFabrics?: AttachmentFabricEntry[];
  selectedTrims?: TrimEntry[];
}> = ({ value, onChange, classesList, attachmentFabrics = [], selectedTrims = [] }) => {
  const currentObj = value || {};
  const filledCount = Object.keys(currentObj).filter(k => {
    const row = currentObj[k] || {};
    return Object.values(row).some(v => v !== '' && v !== null && v !== undefined);
  }).length;

  const [isOpen, setIsOpen] = useState(filledCount > 0);

  useEffect(() => {
    if (filledCount > 0) setIsOpen(true);
  }, [filledCount]);

  const handleCellChange = (cls: string, field: string, val: string) => {
    const updatedCls = { ...(currentObj[cls] || {}), [field]: val };
    const updatedObj = { ...currentObj, [cls]: updatedCls };
    onChange(updatedObj);
  };

  const handlePopulateAll = () => {
    const mainFabInput = (document.querySelector('input[name="main_fabric"]') as HTMLInputElement)?.value || '1.25';
    const att1Val = attachmentFabrics[0]?.meters || (document.querySelector('input[name="attachment_fabric1"]') as HTMLInputElement)?.value || '';
    const att2Val = attachmentFabrics[1]?.meters || (document.querySelector('input[name="attachment_fabric2"]') as HTMLInputElement)?.value || '';
    const btnVal = selectedTrims.find(t => (t.uom || '').toLowerCase() === 'pcs' || String(t.trim_id).includes('btn'))?.count || (document.querySelector('input[name="button_count"]') as HTMLInputElement)?.value || '6';
    const thrVal = selectedTrims.find(t => (t.uom || '').toLowerCase() === 'cones' || String(t.trim_id).includes('thr'))?.count || (document.querySelector('input[name="thread_count"]') as HTMLInputElement)?.value || '1';

    const newObj: Record<string, Record<string, string>> = {};
    classesList.forEach(cls => {
      newObj[cls] = {
        main_fabric: mainFabInput,
        attachment_fabric1: att1Val,
        attachment_fabric2: att2Val,
        button_count: btnVal,
        thread_count: thrVal
      };
    });
    onChange(newObj);
    setIsOpen(true);
    toast.success('Populated all classes with base product values!');
  };

  const handleClearAll = () => {
    onChange({});
    toast.success('Class consumption matrix cleared.');
  };

  return (
    <div className="border border-zinc-200 rounded-3xl bg-white shadow-sm overflow-hidden transition-all">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer flex items-center justify-between transition-colors border-b border-zinc-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center font-black text-xs">
            BOM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                Class / Corporate Consumption Details (Optional)
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${filledCount > 0 ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'bg-zinc-200/60 text-zinc-500'}`}>
                {filledCount > 0 ? `${filledCount} Classes Configured` : 'Optional / Using Base'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
              Only required if fabric or trim consumption varies by student grade (e.g. Class 1 vs Class 12). Add fabric length assuming 58" width. If empty, quotations use base values.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#2d8d9b] font-black underline">
            {isOpen ? 'Collapse' : 'Configure Matrix'}
          </span>
          <ChevronDown size={18} className={`text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-zinc-100">
            <p className="text-[11px] font-bold text-zinc-500">
              Customize consumption per student grade or corporate department (all fabric lengths should be entered based on 58" width):
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePopulateAll}
                className="px-3 py-1.5 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b] text-[#2d8d9b] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                ⚡ Copy Base Values To All Rows
              </button>
              {filledCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[360px] custom-scrollbar rounded-2xl border border-zinc-100">
            <table className="min-w-full text-xs font-bold text-zinc-700">
              <thead className="sticky top-0 bg-zinc-100/90 backdrop-blur z-10">
                <tr className="border-b border-zinc-200 text-left">
                  <th className="p-3 uppercase tracking-wider text-[10px] text-[#3a525d]">Grade / Division</th>
                  <th className="p-3 uppercase tracking-wider text-[10px] text-[#3a525d]">Main Fabric - 58" width (m)</th>
                  <th className="p-3 uppercase tracking-wider text-[10px] text-[#3a525d]">Attachment 1 - 58" width (m)</th>
                  <th className="p-3 uppercase tracking-wider text-[10px] text-[#3a525d]">Attachment 2 - 58" width (m)</th>
                  <th className="p-3 uppercase tracking-wider text-[10px] text-[#3a525d]">Buttons (pcs)</th>
                  <th className="p-3 uppercase tracking-wider text-[10px] text-[#3a525d]">Thread (cones)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {classesList.map((cls) => {
                  const rowData = currentObj[cls] || {};
                  return (
                    <tr key={cls} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="p-3 text-[#3a525d] font-black text-xs">{cls}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          value={rowData.main_fabric || ''}
                          onChange={(e) => handleCellChange(cls, 'main_fabric', e.target.value)}
                          placeholder="e.g. 1.25"
                          className="w-24 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b] bg-zinc-50/50 focus:bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          value={rowData.attachment_fabric1 || ''}
                          onChange={(e) => handleCellChange(cls, 'attachment_fabric1', e.target.value)}
                          placeholder="e.g. 0.5"
                          className="w-24 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b] bg-zinc-50/50 focus:bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          value={rowData.attachment_fabric2 || ''}
                          onChange={(e) => handleCellChange(cls, 'attachment_fabric2', e.target.value)}
                          placeholder="e.g. 0.2"
                          className="w-24 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b] bg-zinc-50/50 focus:bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={rowData.button_count || ''}
                          onChange={(e) => handleCellChange(cls, 'button_count', e.target.value)}
                          placeholder="e.g. 6"
                          className="w-24 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b] bg-zinc-50/50 focus:bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={rowData.thread_count || ''}
                          onChange={(e) => handleCellChange(cls, 'thread_count', e.target.value)}
                          placeholder="e.g. 1"
                          className="w-24 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#2d8d9b] bg-zinc-50/50 focus:bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [measureConfig, setMeasureConfig] = useState<any[]>([]);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [dresses, setDresses] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });

  // Product Details Modal & Action Dropdown states
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [isDetailsActionsOpen, setIsDetailsActionsOpen] = useState(false);
  const detailsActionsRef = useRef<HTMLDivElement>(null);

  // Top header More Options dropdown state
  const [isMoreHubsOpen, setIsMoreHubsOpen] = useState(false);
  const moreHubsRef = useRef<HTMLDivElement>(null);

  // Double verification states
  const [editVerificationProduct, setEditVerificationProduct] = useState<Product | null>(null);
  const [deleteVerification, setDeleteVerification] = useState<{ step: 1 | 2; product: Product | null }>({
    step: 1,
    product: null
  });

  // Variant design number states


  // Local state for dynamic form reactivity
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['manual']);
  const [selectedDress, setSelectedDress] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');
  const [selectedFabricId, setSelectedFabricId] = useState('');
  const [selectedButtonId, setSelectedButtonId] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [baseSize, setBaseSize] = useState('');
  const [fit, setFit] = useState('');
  const [allowance, setAllowance] = useState('');
  const [nextPatternCode, setNextPatternCode] = useState('');
  const [productType, setProductType] = useState('');

  // Design Catalog tab states
  const [activeTab, setActiveTab] = useState<'products' | 'designs'>('products');
  const [groupDesigns, setGroupDesigns] = useState<any[]>([]);
  const [editingCombination, setEditingCombination] = useState<any | null>(null);
  const [buttonsList, setButtonsList] = useState<any[]>([]);
  const [threadsList, setThreadsList] = useState<any[]>([]);
  const [trimsList, setTrimsList] = useState<any[]>([]);
  const [attachmentFabrics, setAttachmentFabrics] = useState<AttachmentFabricEntry[]>([]);
  const [selectedTrims, setSelectedTrims] = useState<TrimEntry[]>([]);
  const [fitsList, setFitsList] = useState<any[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, configRes, chartRes, typeRes, masterHubRes, nextPatternRes, fabricRes, gdRes, buttonsRes, threadsRes, trimsRes] = await Promise.all([
        api.get('/products'),
        api.get('/measurements/config'),
        api.get('/size-charts'),
        api.get('/product-types').catch(() => ({ data: [] })),
        api.get('/art-number-hub/master-data').catch(() => ({ data: { dresses: [], genders: [], patterns: [], fits: [] } })),
        api.get('/art-number-hub/patterns/next').catch(() => ({ data: { nextCode: '001' } })),
        api.get('/inventory/fabrics').catch(() => ({ data: [] })),
        api.get('/quotations/group-designs').catch(() => ({ data: [] })),
        api.get('/inventory/buttons').catch(() => ({ data: [] })),
        api.get('/inventory/threads').catch(() => ({ data: [] })),
        api.get('/inventory/trims').catch(() => ({ data: [] }))
      ]);
      const allProds: Product[] = prodRes.data || [];
      // Accessories and Readymade (Trade) are managed exclusively in the Accessories Hub
      const isAccessoryOrTrade = (p: Product) => {
        const cat = (p.category || '').toLowerCase();
        const pType = (p.product_type_id || (p as any).product_type || (p as any).productType || '').toString().toLowerCase();
        const mat = (p.materials || '').toLowerCase();
        return (
          cat === 'accessories' ||
          cat === 'trade_readymade' ||
          cat === 'readymade_trade' ||
          pType === 'accessories' ||
          pType === 'trade_readymade' ||
          pType === 'readymade_trade' ||
          mat.includes('[producttype: accessories]') ||
          mat.includes('[producttype: trade_readymade]') ||
          mat.includes('[producttype: readymade_trade]')
        );
      };
      setProducts(allProds.filter(p => !isAccessoryOrTrade(p)));
      setMeasureConfig(configRes.data || []);
      setSizeCharts(chartRes.data || []);
      setProductTypes(typeRes.data || []);
      setDresses(masterHubRes.data?.dresses || []);
      setGenders(masterHubRes.data?.genders || []);
      setPatterns(masterHubRes.data?.patterns || []);
      setFitsList(masterHubRes.data?.fits || []);
      setNextPatternCode(nextPatternRes.data?.nextCode || '001');
      setFabrics(fabricRes.data || []);
      setGroupDesigns(gdRes.data || []);
      setButtonsList(buttonsRes.data || []);
      setThreadsList(threadsRes.data || []);

      let combinedTrims: any[] = (trimsRes.data && Array.isArray(trimsRes.data)) ? [...trimsRes.data] : [];
      if (buttonsRes.data && Array.isArray(buttonsRes.data)) {
        buttonsRes.data.forEach((b: any) => {
          if (!combinedTrims.some((t: any) => String(t.id) === String(b.id))) {
            combinedTrims.push({
              id: b.id,
              code: b.code || `BTN-${b.id}`,
              name: b.name || b.item_name || 'Button',
              category: { name: 'Button' },
              default_uom: 'Pcs',
              uom: 'Pcs'
            });
          }
        });
      }
      if (threadsRes.data && Array.isArray(threadsRes.data)) {
        threadsRes.data.forEach((th: any) => {
          if (!combinedTrims.some((t: any) => String(t.id) === String(th.id))) {
            combinedTrims.push({
              id: th.id,
              code: th.code || `THR-${th.id}`,
              name: th.name || th.item_name || 'Thread',
              category: { name: 'Thread' },
              default_uom: 'Cones',
              uom: 'Cones'
            });
          }
        });
      }
      setTrimsList(combinedTrims);
    } catch (err) {
      toast.error('Failed to load catalog data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (detailsActionsRef.current && !detailsActionsRef.current.contains(e.target as Node)) {
        setIsDetailsActionsOpen(false);
      }
      if (moreHubsRef.current && !moreHubsRef.current.contains(e.target as Node)) {
        setIsMoreHubsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-open product details modal if requested via URL query param (?product=ID or ?id=ID)
  useEffect(() => {
    if (typeof window !== 'undefined' && products.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const prodId = urlParams.get('product') || urlParams.get('id');
      if (prodId) {
        const found = products.find(p => String(p.id) === String(prodId));
        if (found) {
          setSelectedProductForDetails(found);
        }
      }
    }
  }, [products]);

  // Additional states for new fields
  const [otherSizes, setOtherSizes] = useState('');
  const [otherFits, setOtherFits] = useState('');
  const [measurementType, setMeasurementType] = useState('both');
  const [classFabricConsumption, setClassFabricConsumption] = useState<Record<string, Record<string, string>>>({});
  const [remarks, setRemarks] = useState<RemarkEntry[]>([]);

  useEffect(() => {
    const activeDresses = dresses;
    const activeGenders = genders;
    const activePatterns = patterns;

    if (editingProduct) {
      setSelectedMethods(editingProduct.entry_methods || ['manual']);
      const parsed = parseArtNumber(editingProduct.art_number, activeDresses, activeGenders, activePatterns);
      setSelectedDress(parsed.dressCode);
      setSelectedGender(parsed.genderCode);
      setSelectedPattern(parsed.patternCode);
      setSelectedProductTypeId(editingProduct.product_type_id?.toString() || (editingProduct as any).product_types?.id?.toString() || '');
      setSelectedFabricId(editingProduct.main_fabric_id?.toString() || '');
      setSelectedButtonId(editingProduct.button_id?.toString() || '');
      setSelectedThreadId(editingProduct.thread_id?.toString() || '');
      setBaseSize(editingProduct.base_size || '');
      if (editingProduct.fit) {
        setFit(editingProduct.fit);
      } else if (parsed.fitCode) {
        const matched = fitsList.find(f => f.code === parsed.fitCode);
        setFit(matched ? matched.name : (parsed.fitCode === 'S' ? 'Slim Fit' : parsed.fitCode === 'L' ? 'Loose Fit' : 'Regular Fit'));
      } else {
        setFit('');
      }
      setAllowance(editingProduct.allowance ? String(editingProduct.allowance) : (parsed.allowance || ''));
      setOtherSizes(editingProduct.other_sizes || '');
      setOtherFits(editingProduct.other_fits || '');
      setMeasurementType(editingProduct.measurement_type || 'both');
      setClassFabricConsumption(editingProduct.class_fabric_consumption || {});
      setRemarks(editingProduct.remarks || []);

      // Initialize dynamic attachment fabrics
      const existingAtts = editingProduct.attachment_fabrics || (editingProduct.class_fabric_consumption as any)?._base_attachment_fabrics;
      if (Array.isArray(existingAtts) && existingAtts.length > 0) {
        setAttachmentFabrics(existingAtts);
      } else {
        const initialAtts: AttachmentFabricEntry[] = [];
        if (editingProduct.attachment_fabric1) {
          initialAtts.push({
            id: 'att_1',
            fabric_id: (editingProduct as any).attachment_fabric1_id?.toString() || '',
            meters: String(editingProduct.attachment_fabric1)
          });
        }
        if (editingProduct.attachment_fabric2) {
          initialAtts.push({
            id: 'att_2',
            fabric_id: (editingProduct as any).attachment_fabric2_id?.toString() || '',
            meters: String(editingProduct.attachment_fabric2)
          });
        }
        setAttachmentFabrics(initialAtts);
      }

      // Initialize dynamic trims
      const existingTrims = editingProduct.trims || (editingProduct.class_fabric_consumption as any)?._base_trims;
      if (Array.isArray(existingTrims) && existingTrims.length > 0) {
        setSelectedTrims(existingTrims);
      } else {
        const initialTrims: TrimEntry[] = [];
        if (editingProduct.button_count || editingProduct.button_id) {
          initialTrims.push({
            id: 'trim_btn',
            trim_id: editingProduct.button_id?.toString() || 'btn_default',
            count: String(editingProduct.button_count || '6'),
            uom: 'Pcs'
          });
        }
        if (editingProduct.thread_count || editingProduct.thread_id) {
          initialTrims.push({
            id: 'trim_thr',
            trim_id: editingProduct.thread_id?.toString() || 'thr_default',
            count: String(editingProduct.thread_count || '1'),
            uom: 'Cones'
          });
        }
        setSelectedTrims(initialTrims);
      }

      const parsedMat = parseMaterialsField(editingProduct.materials);
      setProductType(parsedMat.type || '');
    } else {
      setSelectedMethods(['manual']);
      setSelectedDress('');
      setSelectedGender('');
      setSelectedPattern('');
      setSelectedProductTypeId('');
      setSelectedFabricId('');
      setSelectedButtonId('');
      setSelectedThreadId('');
      setBaseSize('');
      setFit('');
      setAllowance('');
      setOtherSizes('');
      setOtherFits('');
      setMeasurementType('both');
      setClassFabricConsumption({});
      setRemarks([]);
      setProductType('');
      setAttachmentFabrics([]);
      setSelectedTrims([]);
      // Refresh next pattern code on form open
      api.get('/art-number-hub/patterns/next').then(res => setNextPatternCode(res.data?.nextCode || '001')).catch(() => { });
    }
  }, [editingProduct, isAdding, dresses, genders, patterns]);

  const availableProductTypes = productTypes;
  const availableDresses = dresses;
  const availableGenders = genders;
  const availablePatterns = patterns;

  const productFields: FormField[] = [
    {
      name: 'product_type',
      label: 'Manufacturing Classification',
      type: 'select',
      options: [
        { label: 'Select Manufacturing Type', value: '' },
        { label: 'Manufactured In-House (Readymade Stock)', value: 'readymade' },
        { label: 'Manufactured In-House (Custom / Made to Order)', value: 'custom_manufactured' },
      ],
      value: productType,
      onChange: (val) => setProductType(val),
      required: true
    },
    {
      name: 'product_type_id',
      label: 'Garment Category / Product Type',
      type: 'select',
      options: [
        { label: 'Select Garment Category', value: '' },
        ...availableProductTypes.map(pt => ({ label: pt.name, value: pt.id.toString() }))
      ],
      value: selectedProductTypeId,
      onChange: (val) => setSelectedProductTypeId(val),
      required: true
    },
    {
      name: 'dress_prefix',
      label: 'Dress Prefix',
      type: 'select',
      options: [
        { label: 'Select Dress Prefix', value: '' },
        ...availableDresses.map(d => ({
          label: `${d.code} (${d.name})`,
          value: d.code
        }))
      ],
      required: true,
      value: selectedDress,
      onChange: (val) => setSelectedDress(val)
    },
    {
      name: 'gender_code',
      label: 'Gender',
      type: 'select',
      options: [
        { label: 'Select Gender', value: '' },
        ...availableGenders.map(g => ({
          label: `[${g.code}] ${g.name}`,
          value: g.code
        }))
      ],
      required: true,
      value: selectedGender,
      onChange: (val) => setSelectedGender(val)
    },
    {
      name: 'pattern_code',
      label: 'Pattern Code',
      type: 'select',
      options: [
        { label: `Auto-Generate Next (${nextPatternCode || '001'})`, value: nextPatternCode || '001' },
        ...availablePatterns.map(p => ({
          label: `[${p.code}] ${p.name}`,
          value: p.code
        }))
      ],
      value: selectedPattern || nextPatternCode || '001',
      onChange: (val) => setSelectedPattern(val),
      required: true
    },
    {
      name: 'art_number',
      label: 'Generated Art Number',
      type: 'text',
      value: (() => {
        if (!selectedDress || !selectedGender) return '';
        const patRaw = (selectedPattern || nextPatternCode || '001').trim();
        const pat = /^\d+$/.test(patRaw) && patRaw.length < 3 ? patRaw.padStart(3, '0') : patRaw;
        const fitCode = fit
          ? (fitsList.find(f => f.name.toLowerCase() === fit.toLowerCase() || f.code === fit.toUpperCase())?.code || (fit.toLowerCase().includes('slim') ? 'S' : fit.toLowerCase().includes('loose') ? 'L' : 'R'))
          : 'R';
        const cleanAllowance = allowance && allowance.trim() ? allowance.trim() : '';
        return `${selectedDress}-${selectedGender}${pat}-${fitCode}${cleanAllowance}`;
      })(),
      readOnly: true,
      placeholder: 'Will generate automatically from Prefix, Gender, Pattern, Fit & Allowance (e.g. 4J-1012-R2)...',
      required: true
    },
    {
      name: 'name',
      label: 'Item Name',
      type: 'text',
      placeholder: 'e.g. Cotton Shirt',
      required: true,
      defaultValue: editingProduct?.name
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter product description, styling details, care instructions...',
      defaultValue: editingProduct?.description || '',
      className: 'md:col-span-2'
    },
    {
      name: 'materials',
      label: 'Specifications',
      type: 'textarea',
      placeholder: 'e.g. 100% Combed Cotton, 180 GSM, Single Jersey Knit',
      defaultValue: parseMaterialsField(editingProduct?.materials).materials,
      className: 'md:col-span-2'
    },
    {
      name: 'base_size',
      label: 'Base Size',
      type: 'text',
      placeholder: 'e.g. M',
      required: false,
      value: baseSize,
      onChange: (val) => setBaseSize(val)
    },

    {
      name: 'fit',
      label: 'Base Fit',
      type: 'select',
      options: [
        { label: 'Select Fit Type', value: '' },
        ...(fitsList.length > 0
          ? fitsList.map(f => ({ label: `[${f.code}] ${f.name}`, value: f.name }))
          : [
            { label: '[R] Regular Fit', value: 'Regular Fit' },
            { label: '[S] Slim Fit', value: 'Slim Fit' },
            { label: '[L] Loose Fit', value: 'Loose Fit' }
          ])
      ],
      required: false,
      value: fit,
      onChange: (val) => setFit(val),
      hidden: productType === 'accessories'
    },
    {
      name: 'allowance',
      label: 'Allowance (inches)',
      type: 'text',
      placeholder: 'e.g. 2 or 1.5',
      required: false,
      value: allowance,
      onChange: (val) => setAllowance(val),
      hidden: productType === 'accessories'
    },
    {
      name: 'other_sizes',
      label: 'Other Sizes',
      type: 'custom',
      className: 'md:col-span-2',
      render: (val, onChange) => (
        <MultiEntryInput
          value={otherSizes}
          onChange={(newVal) => setOtherSizes(newVal)}
          placeholder="Type a size (e.g. S, L, XL) and press Enter"
          buttonText="Add Size"
        />
      ),
      defaultValue: otherSizes,
      required: false
    },
    {
      name: 'other_fits',
      label: 'Other Fits',
      type: 'custom',
      className: 'md:col-span-2',
      render: (val, onChange) => (
        <MultiEntryInput
          value={otherFits}
          onChange={(newVal) => setOtherFits(newVal)}
          placeholder="Type a fit (e.g. Loose Fit, Comfort Fit) and press Enter"
          buttonText="Add Fit"
        />
      ),
      defaultValue: otherFits,
      required: false
    },
    {
      name: 'sam_value',
      label: 'SAM Value',
      type: 'number',
      placeholder: 'e.g. 1.25',
      step: 'any',
      defaultValue: editingProduct?.sam_value !== null && editingProduct?.sam_value !== undefined ? String(editingProduct.sam_value) : ''
    },
    {
      name: 'measurement_type',
      label: 'Measurement Types (Size, custom, or both)',
      type: 'select',
      options: [
        { label: 'Standard Size Chart only', value: 'size' },
        { label: 'Custom Measurements only', value: 'custom' },
        { label: 'Both Size & Custom', value: 'both' }
      ],
      value: measurementType,
      onChange: (val) => setMeasurementType(val),
      required: true
    },
    {
      name: 'images',
      label: 'Product Images',
      type: 'image-upload',
      defaultValue: editingProduct?.images || [],
      className: 'md:col-span-2'
    },
    {
      name: 'main_fabric',
      label: 'Main Fabric Consumption (meters) — Default 58" Width',
      type: 'number',
      placeholder: 'e.g. 1.25 (enter fabric length for 58" width)',
      defaultValue: editingProduct?.main_fabric !== null && editingProduct?.main_fabric !== undefined ? String(editingProduct.main_fabric) : '',
      required: true,
      step: 'any',
      className: 'md:col-span-2',
      helperText: '⚠️ Note: Please add fabric length as the width is 58". If a fabric with a different width is selected in quotations, required length will be automatically converted.'
    },
    {
      name: 'attachment_fabrics',
      label: 'Attachment Fabrics',
      type: 'custom',
      className: 'md:col-span-2',
      defaultValue: attachmentFabrics,
      required: false,
      render: (val, onChange) => (
        <AttachmentFabricsEditor
          value={attachmentFabrics}
          onChange={(newAtts) => {
            setAttachmentFabrics(newAtts);
            onChange(newAtts);
          }}
          fabrics={fabrics}
        />
      )
    },
    {
      name: 'trims',
      label: 'Trims & Accessories',
      type: 'custom',
      className: 'md:col-span-2',
      defaultValue: selectedTrims,
      required: false,
      render: (val, onChange) => (
        <TrimsEditor
          value={selectedTrims}
          onChange={(newTrims) => {
            setSelectedTrims(newTrims);
            onChange(newTrims);
          }}
          trimsList={trimsList}
        />
      )
    },
    {
      name: 'class_fabric_consumption',
      label: 'Fabric Consumption details for Classes & Corporate (Optional)',
      type: 'custom',
      className: 'md:col-span-2',
      defaultValue: classFabricConsumption,
      required: false,
      onChange: (val) => setClassFabricConsumption(val),
      render: (val, onChange) => (
        <ClassConsumptionMatrixEditor
          value={val}
          onChange={onChange}
          classesList={CLASSES_LIST}
          attachmentFabrics={attachmentFabrics}
          selectedTrims={selectedTrims}
        />
      )
    },
    {
      name: 'entry_methods',
      label: 'Measurement Entry Logic',
      type: 'checkbox-group',
      options: [
        { label: 'Manual Measurements', value: 'manual' },
        { label: 'US Size Chart Scaling', value: 'us_size_chart' }
      ],
      defaultValue: selectedMethods,
      className: 'md:col-span-2',
      onChange: (val: string[]) => setSelectedMethods(val)
    },
    {
      name: 'size_chart_id',
      label: 'Linked US Size Chart',
      type: 'select',
      options: [
        { label: 'Select Preferred Chart', value: '' },
        ...sizeCharts.map(c => ({ label: `${c.name} (${c.category.replace('_', ' ')})`, value: c.id }))
      ],
      defaultValue: editingProduct?.size_chart_id || '',
      className: 'md:col-span-1',
      disabled: !selectedMethods.includes('us_size_chart')
    },
    {
      name: 'measurements',
      label: 'Required Manual Metrics',
      type: 'checkbox-group',
      options: (
        selectedProductTypeId 
          ? measureConfig.filter(m => !m.product_type_id || String(m.product_type_id) === String(selectedProductTypeId))
          : measureConfig
      ).map(m => {
        const typeObj = m.product_types || productTypes.find(pt => pt.id === m.product_type_id);
        return {
          label: `${m.label}${typeObj ? ` • [${typeObj.name}]` : ''}`,
          value: m.label
        };
      }),
      defaultValue: editingProduct?.measurements || [],
      className: 'md:col-span-2',
      disabled: !selectedMethods.includes('manual')
    },
    {
      name: 'remarks',
      label: 'Remarks & Variant History (Multi-entry record list)',
      type: 'custom',
      className: 'md:col-span-2',
      defaultValue: remarks,
      required: false,
      onChange: (val) => setRemarks(val),
      render: (val, onChange) => {
        let currentRemarksList: RemarkEntry[] = [];
        if (Array.isArray(val)) {
          currentRemarksList = val;
        } else if (val && typeof val === 'object') {
          currentRemarksList = [{
            title: `Remark #1 (${(val as any).type || 'Notes'})`,
            changes: (val as any).type === 'changes' ? ((val as any).text || '') : '',
            added: (val as any).type === 'add' ? ((val as any).text || '') : '',
            removed: (val as any).type === 'remove' ? ((val as any).text || '') : '',
            images: (val as any).images || []
          }];
        }

        const handleAddRemark = () => {
          const newRemark: RemarkEntry = {
            title: `Remark #${currentRemarksList.length + 1}`,
            changes: '',
            added: '',
            removed: '',
            images: []
          };
          onChange([...currentRemarksList, newRemark]);
        };

        const handleUpdateRemark = (index: number, updatedFields: Partial<RemarkEntry>) => {
          const updatedList = currentRemarksList.map((item, idx) => {
            if (idx === index) {
              return { ...item, ...updatedFields };
            }
            return item;
          });
          onChange(updatedList);
        };

        const handleRemoveRemark = (index: number) => {
          const updatedList = currentRemarksList.filter((_, idx) => idx !== index);
          onChange(updatedList);
        };

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#fce4d4]/10 p-4 rounded-2xl border border-[#fce4d4]/30">
              <div>
                <span className="text-xs font-black text-[#3a525d] uppercase tracking-wider block font-sans">Product Remarks History</span>
                <span className="text-[10px] text-zinc-400 font-bold block mt-0.5 font-sans">Manage separate log entries for variant changes, additions, and removals</span>
              </div>
              <button
                type="button"
                onClick={handleAddRemark}
                className="py-2.5 px-5 bg-[#A81D1E] text-white hover:bg-[#8F1618] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm shadow-[#A81D1E]/20 active:scale-95 cursor-pointer"
              >
                <Plus size={14} /> Add Remark Entry
              </button>
            </div>

            {currentRemarksList.length === 0 ? (
              <div className="text-center py-8 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                <p className="text-xs text-zinc-400 font-bold italic font-sans">No remarks recorded yet. Click 'Add Remark Entry' to create one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentRemarksList.map((item, index) => (
                  <div key={index} className="p-6 bg-white border border-zinc-150 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                      <div className="flex-1 max-w-md">
                        <input
                          type="text"
                          value={item.title || ''}
                          onChange={(e) => handleUpdateRemark(index, { title: e.target.value })}
                          placeholder="e.g. Design Variant v2"
                          className="w-full bg-transparent border-b border-dashed border-zinc-200 focus:border-[#2d8d9b] focus:outline-none text-xs font-black uppercase tracking-wider text-[#3a525d] py-1 font-sans"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRemark(index)}
                        className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                        title="Remove this remark"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#8b6b5a] uppercase tracking-wider block font-sans">Changes Made</label>
                        <textarea
                          value={item.changes || ''}
                          onChange={(e) => handleUpdateRemark(index, { changes: e.target.value })}
                          placeholder="Dimensions, style updates..."
                          rows={3}
                          className="w-full px-3 py-2 bg-zinc-50 border-2 border-zinc-100 hover:border-[#2d8d9b]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/10 focus:border-[#2d8d9b] transition-all text-xs font-bold text-[#3a525d] placeholder:text-zinc-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#8b6b5a] uppercase tracking-wider block font-sans">Items Added</label>
                        <textarea
                          value={item.added || ''}
                          onChange={(e) => handleUpdateRemark(index, { added: e.target.value })}
                          placeholder="New pockets, packaging specs..."
                          rows={3}
                          className="w-full px-3 py-2 bg-zinc-50 border-2 border-zinc-100 hover:border-[#2d8d9b]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/10 focus:border-[#2d8d9b] transition-all text-xs font-bold text-[#3a525d] placeholder:text-zinc-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#8b6b5a] uppercase tracking-wider block font-sans">Items Removed</label>
                        <textarea
                          value={item.removed || ''}
                          onChange={(e) => handleUpdateRemark(index, { removed: e.target.value })}
                          placeholder="Old materials, accessory references..."
                          rows={3}
                          className="w-full px-3 py-2 bg-zinc-50 border-2 border-zinc-100 hover:border-[#2d8d9b]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/10 focus:border-[#2d8d9b] transition-all text-xs font-bold text-[#3a525d] placeholder:text-zinc-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-zinc-100 pt-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-[#8b6b5a] uppercase tracking-wider block font-sans">
                          Photos / Attachments (Max 4 images)
                        </label>
                        <span className="text-[9px] font-bold text-zinc-400">
                          {(item.images || []).length} of 4 uploaded
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={(item.images || []).length >= 4}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length === 0) return;

                              const existingImages = item.images || [];
                              if (existingImages.length + files.length > 4) {
                                toast.error('You can upload a maximum of 4 images for this remark entry.');
                                return;
                              }

                              const updatedImages = [...existingImages];
                              let filesProcessed = 0;

                              files.forEach((file) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const base64 = reader.result as string;
                                  if (updatedImages.length < 4) {
                                    updatedImages.push(base64);
                                  }
                                  filesProcessed++;
                                  if (filesProcessed === files.length) {
                                    handleUpdateRemark(index, { images: updatedImages });
                                  }
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                            className="hidden"
                            id={`remarks-file-input-${index}`}
                          />
                          <label
                            htmlFor={`remarks-file-input-${index}`}
                            className={`h-9 px-4 bg-white border-2 border-zinc-200 text-[#3a525d] hover:bg-zinc-50 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm ${(item.images || []).length >= 4 ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                          >
                            <Camera size={12} />
                            <span>Upload Remark Images</span>
                          </label>
                        </div>

                        {(item.images || []).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {(item.images || []).map((img: string, imgIdx: number) => (
                              <div
                                key={imgIdx}
                                className="relative w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 bg-white group shadow-sm"
                              >
                                <img src={img} alt="preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (item.images || []).filter((_: any, i: number) => i !== imgIdx);
                                    handleUpdateRemark(index, { images: updated });
                                  }}
                                  className="absolute inset-0 bg-red-500/85 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all font-black text-[8px] uppercase cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
  ];

  const handleAddOrUpdate = async (data: any) => {
    const loadingToast = toast.loading(editingProduct ? 'Updating product...' : 'Creating product...');

    // Normalize arrays
    const normalize = (val: any) => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    };

    data.measurements = normalize(data.measurements);
    data.entry_methods = normalize(data.entry_methods);
    data.description = data.description ? data.description.trim() : null;

    if (!data.size_chart_id) data.size_chart_id = null;
    if (!data.main_fabric_id || data.main_fabric_id === '') data.main_fabric_id = null;
    if (!data.button_id || data.button_id === '') data.button_id = null;
    if (!data.thread_id || data.thread_id === '') data.thread_id = null;

    // Process fabric meters as float numbers to support decimals
    data.main_fabric = data.main_fabric !== '' && data.main_fabric !== null && data.main_fabric !== undefined ? parseFloat(data.main_fabric) : 0;
    
    // Dynamic attachment fabrics and trims
    data.attachment_fabrics = attachmentFabrics;
    data.trims = selectedTrims;

    // Map first two attachment fabrics to legacy fields for backward compatibility
    data.attachment_fabric1 = attachmentFabrics[0]?.meters ? parseFloat(attachmentFabrics[0].meters) : null;
    data.attachment_fabric2 = attachmentFabrics[1]?.meters ? parseFloat(attachmentFabrics[1].meters) : null;
    data.attachment_fabric1_id = attachmentFabrics[0]?.fabric_id || null;
    data.attachment_fabric2_id = attachmentFabrics[1]?.fabric_id || null;

    // Map first button and thread trims to legacy fields
    const btnTrim = selectedTrims.find(t => (t.uom || '').toLowerCase() === 'pcs' || (t.name || '').toLowerCase().includes('button') || String(t.trim_id).includes('btn'));
    const thrTrim = selectedTrims.find(t => (t.uom || '').toLowerCase() === 'cones' || (t.name || '').toLowerCase().includes('thread') || String(t.trim_id).includes('thr'));

    data.button_count = btnTrim ? parseInt(btnTrim.count, 10) : 0;
    data.button_id = selectedButtonId || null;
    data.thread_count = thrTrim ? parseInt(thrTrim.count, 10) : 0;
    data.thread_id = selectedThreadId || null;

    if (!data.product_type_id || data.product_type_id === '') data.product_type_id = null;
    else data.product_type_id = parseInt(data.product_type_id);

    // SAM value: send as number or null
    if (!data.sam_value || data.sam_value === '') data.sam_value = null;
    else data.sam_value = parseFloat(data.sam_value);

    data.retail_sam_value = null;
    data.images = data.images || [];

    // Map new fields
    data.other_sizes = otherSizes.trim() || null;
    data.other_fits = otherFits.trim() || null;
    data.measurement_type = measurementType || 'both';
    data.class_fabric_consumption = data.class_fabric_consumption || {};
    data.remarks = remarks && remarks.length > 0 ? remarks : null;

    // Pass selected controlled dropdown IDs
    data.product_type_id = selectedProductTypeId || data.product_type_id || null;
    data.main_fabric_id = selectedFabricId || data.main_fabric_id || null;
    data.button_id = selectedButtonId || data.button_id || null;
    data.thread_id = selectedThreadId || data.thread_id || null;

    // Generate dynamic art_number: Option 1 [Prefix]-[Gender][Pattern]-[Fit]-[Allowance] (e.g. 4J-1012-R-2)
    const effectivePattern = selectedPattern || nextPatternCode || '001';
    let fitCode = 'R';
    if (fit) {
      const matched = fitsList.find(f => f.name.toLowerCase() === fit.toLowerCase() || f.code === fit.toUpperCase());
      if (matched) {
        fitCode = matched.code;
      } else {
        fitCode = fit.toLowerCase().includes('slim') ? 'S' : fit.toLowerCase().includes('loose') ? 'L' : 'R';
      }
    }
    data.pattern_code = effectivePattern;
    const cleanAllowance = allowance ? allowance.trim() : '';
    data.allowance = cleanAllowance || null;
    data.art_number = (selectedDress && selectedGender && effectivePattern)
      ? `${selectedDress}-${selectedGender}${effectivePattern}-${fitCode}${cleanAllowance || ''}`
      : '';
    const activeGenders = genders;
    const genderObj = activeGenders.find(g => g.code === selectedGender);
    data.gender = genderObj ? genderObj.name : 'Unisex';

    // Auto-infer category if not present
    if (!data.category) {
      const activeTypes = productTypes;
      const ptName = activeTypes.find(p => p.id?.toString() === selectedProductTypeId)?.name?.toLowerCase() || '';
      if (ptName.includes('pant') || ptName.includes('trouser') || ptName.includes('skirt') || ptName.includes('bottom')) {
        data.category = 'bottom_wear';
      } else if (ptName.includes('tie') || ptName.includes('belt') || ptName.includes('accessory') || productType === 'accessories') {
        data.category = 'accessories';
      } else {
        data.category = 'top_wear';
      }
    }

    // Set base size and fit
    data.base_size = baseSize.trim() || null;
    data.fit = productType === 'accessories' ? null : (fit || null);
    data.design_number = null;

    // Serialize product_type into materials
    const pType = data.product_type || '';
    const pMats = data.materials || '';
    data.materials = pType ? `[ProductType: ${pType}] ${pMats}` : pMats;

    try {
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, data);
        if (res.data?.variant_created) {
          toast.success('Product updated! A new Design Number was auto-created for the changed button/thread combination.', { id: loadingToast, duration: 5000 });
        } else {
          toast.success('Product updated!', { id: loadingToast });
        }
      } else {
        await api.post('/products', data);
        toast.success('Product created!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingProduct(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    executeConfirmedDelete(deleteConfirm.id);
  };

  const executeConfirmedDelete = async (productId?: number | null) => {
    if (!productId) return;
    const loadingToast = toast.loading('Deleting product...');
    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product permanently removed', { id: loadingToast });
      setSelectedProductForDetails(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete product', { id: loadingToast });
    } finally {
      setDeleteVerification({ step: 1, product: null });
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const getFabricDetails = (fabricId?: string | number | null) => {
    if (!fabricId) return null;
    return fabrics.find(f => String(f.id) === String(fabricId));
  };

  const getResolvedProductTypeName = (product: Product) => {
    if (product.product_types?.name) return product.product_types.name;
    if (product.product_type_id) {
      const pt = productTypes.find(t => String(t.id) === String(product.product_type_id));
      if (pt) return pt.name;
    }
    const parsed = parseMaterialsField(product.materials);
    if (parsed.type) return parsed.type;
    return product.category ? product.category.replace(/_/g, ' ') : '—';
  };

  // Readymades table filters sourced strictly from database
  const [filterGender, setFilterGender] = useState<string>('ALL');
  const [filterItemName, setFilterItemName] = useState<string>('ALL');
  const [filterSpec, setFilterSpec] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const uniqueGenders = useMemo(() => {
    const set = new Set<string>();
    // Master genders from database art_genders table
    (genders || []).forEach(g => {
      if (g.name) set.add(g.name);
    });
    // Distinct genders from database products table
    (products || []).forEach(p => {
      if (p.gender) set.add(p.gender);
    });
    return Array.from(set).sort();
  }, [genders, products]);

  const uniqueItemNames = useMemo(() => {
    const set = new Set<string>();
    // Distinct item names from database products table
    (products || []).forEach(p => {
      if (p.name) set.add(p.name);
    });
    // Distinct dress items from database art_dresses table
    (dresses || []).forEach(d => {
      if (d.name) set.add(d.name);
    });
    return Array.from(set).sort();
  }, [dresses, products]);

  const uniqueSpecs = useMemo(() => {
    const specs = new Set<string>();
    // Distinct product types from database product_types table
    (productTypes || []).forEach(pt => {
      if (pt.name) specs.add(pt.name);
    });
    // Distinct categories and specifications from database products table
    (products || []).forEach(p => {
      if (p.product_types?.name) specs.add(p.product_types.name);
      if (p.category) specs.add(p.category.replace('_', ' '));
    });
    return Array.from(specs).sort();
  }, [productTypes, products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterGender !== 'ALL') {
        const targetGender = filterGender.toLowerCase();
        const pGender = (p.gender || '').toLowerCase();
        const matchedGenderObj = (genders || []).find(g => 
          (g.name && g.name.toLowerCase() === targetGender) || 
          (g.code && g.code.toLowerCase() === targetGender)
        );
        const matchCode = matchedGenderObj?.code?.toLowerCase();
        const matchName = matchedGenderObj?.name?.toLowerCase();

        const matches = pGender === targetGender || 
          (matchCode && pGender === matchCode) || 
          (matchName && pGender === matchName);

        if (!matches) return false;
      }
      if (filterItemName !== 'ALL') {
        const targetName = filterItemName.toLowerCase();
        const pName = (p.name || '').toLowerCase();
        if (!pName.includes(targetName) && targetName !== pName) {
          return false;
        }
      }
      if (filterSpec !== 'ALL') {
        const specText = `${p.product_types?.name || ''} ${p.category || ''} ${p.materials || ''} ${p.description || ''}`.toLowerCase();
        if (!specText.includes(filterSpec.toLowerCase())) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          (p.name || '').toLowerCase().includes(term) ||
          (p.art_number || '').toLowerCase().includes(term) ||
          (p.description || '').toLowerCase().includes(term) ||
          (p.materials || '').toLowerCase().includes(term) ||
          (p.base_size || '').toLowerCase().includes(term) ||
          (p.gender || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [products, genders, filterGender, filterItemName, filterSpec, searchTerm]);

  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintReadymades = (sortedData?: Product[], sortInfo?: SortInfo<Product>) => {
    const dataToPrint = sortedData && sortedData.length > 0 ? sortedData : filteredProducts;
    const rowsHtml = dataToPrint.map((p, idx) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 700;">${p.name || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: 600;">${p.gender || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace; font-weight: 800; color: #2d8d9b;">${p.art_number || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${p.description || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${parseMaterialsField(p.materials).materials || p.materials || '—'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 700; text-align: center;">${p.base_size || '—'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Readymades Catalog</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
    h1 { margin: 0 0 6px 0; color: #3a525d; font-size: 22px; font-style: italic; }
    p { margin: 0 0 16px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; }
    td { border: 1px solid #e2e8f0; padding: 8px 10px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>Readymades Catalog</h1>
  <p>Generated on ${new Date().toLocaleDateString('en-GB')} | Total Items: ${dataToPrint.length}${sortInfo?.headerLabel && sortInfo.headerLabel !== 'Default' ? ` | Sorted by: ${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending' : 'Descending'})` : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Item Name</th>
        <th style="text-align: center;">Gender</th>
        <th>Art No.</th>
        <th>Description</th>
        <th>Specifications</th>
        <th style="text-align: center;">Base Size</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No readymades found</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 250);
    }
  };

  const columns: Column<Product>[] = [
    {
      header: 'Item Name',
      accessor: (p) => (
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#3a525d] border border-zinc-100 shadow-inner overflow-hidden flex-shrink-0">
            {p.images && p.images.length > 0 ? (
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <Box size={20} className="text-[#2d8d9b]" />
            )}
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{p.name}</p>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              {p.product_types?.name || p.category?.replace('_', ' ') || ''}
            </span>
          </div>
        </div>
      ),
      sortValue: (p) => p.name
    },
    {
      header: 'Gender',
      accessor: (p) => (
        <span className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d]">
          {p.gender || '—'}
        </span>
      ),
      sortValue: (p) => p.gender || ''
    },
    {
      header: 'Art No.',
      accessor: (p) => (
        <span className="px-2.5 py-1 bg-[#2d8d9b]/10 border border-[#2d8d9b]/25 rounded-xl text-xs font-mono font-black text-[#2d8d9b] tracking-wider inline-block">
          {p.art_number || '—'}
        </span>
      ),
      sortValue: (p) => p.art_number
    },
    {
      header: 'Description',
      accessor: (p) => (
        <div className="max-w-xs">
          <p className="text-xs font-medium text-zinc-600 line-clamp-2" title={p.description || ''}>
            {p.description || '—'}
          </p>
        </div>
      ),
      sortValue: (p) => p.description || ''
    },
    {
      header: 'Specifications',
      accessor: (p) => {
        const spec = parseMaterialsField(p.materials).materials || p.materials || '—';
        return (
          <div className="max-w-xs">
            <p className="text-xs font-medium text-zinc-600 line-clamp-2" title={spec}>
              {spec}
            </p>
          </div>
        );
      },
      sortValue: (p) => parseMaterialsField(p.materials).materials || p.materials || ''
    },
    {
      header: 'Base Size',
      accessor: (p) => (
        p.base_size ? (
          <span className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-black text-[#3a525d]">
            {p.base_size}
          </span>
        ) : (
          <span className="text-xs text-zinc-350 italic">—</span>
        )
      ),
      sortValue: (p) => p.base_size || ''
    }
  ];

  if (isAdding) {
    return (
      <div className="py-10 animate-in zoom-in duration-500">
        <DynamicForm
          title={editingProduct ? "Edit Product Details" : "New Product Specification"}
          subtitle={editingProduct ? `Refining ${editingProduct.name}` : "Define a new article for the catalog"}
          fields={productFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
            setIsAdding(false);
            setEditingProduct(null);
          }}
          submitLabel={editingProduct ? "Save Updates" : "Register Product"}
          columns={2}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Readymades</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1 opacity-80">Readymades Specification Hub</p>
        </div>
        
        {/* Catalog Navigation & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => {
              setEditingProduct(null);
              setIsAdding(true);
              fetchData();
            }}
            className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={3} />
            New Readymade
          </Button>

          <PageActionsMenu
            onPrint={() => {
              if (printTriggerRef.current) {
                printTriggerRef.current();
              } else {
                handlePrintReadymades(filteredProducts);
              }
            }}
            printLabel="Print Readymades"
            onUserReport={() => userReportTriggerRef.current?.()}
            userReportLabel="My Updated Report"
            extraActions={[
              {
                label: 'Product Categories',
                description: 'Garment & Product Types',
                href: '/admin/product-types',
                icon: <FolderTree size={16} className="text-[#9E1B1D]" />
              },
              {
                label: 'ART Number Hub',
                description: 'Prefixes, Patterns & Fits',
                href: '/admin/art-number-hub',
                icon: <Bookmark size={16} className="text-[#9E1B1D]" />
              },
              {
                label: 'Design Numbers',
                description: 'DNS & DNG Configs',
                href: '/admin/design-numbers',
                icon: <Sparkles size={16} className="text-[#9E1B1D]" />
              }
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onSearch={setSearchTerm}
        onPrint={handlePrintReadymades}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        onRowClick={(product) => setSelectedProductForDetails(product)}
        headerAction={
          <div className="flex flex-wrap items-center gap-2">
            {/* Gender Filter */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Genders</option>
              {uniqueGenders.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Item Name Filter */}
            <select
              value={filterItemName}
              onChange={(e) => setFilterItemName(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs max-w-[200px]"
            >
              <option value="ALL">All Items</option>
              {uniqueItemNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Specification Filter */}
            <select
              value={filterSpec}
              onChange={(e) => setFilterSpec(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs max-w-[200px]"
            >
              <option value="ALL">All Specifications</option>
              {uniqueSpecs.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Product Details Modal */}
      {selectedProductForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-150 flex items-start justify-between gap-4 bg-gradient-to-r from-zinc-50/80 to-white">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-[#2d8d9b]/10 border border-[#2d8d9b]/25 rounded-xl text-xs font-mono font-black text-[#2d8d9b] tracking-wider">
                    {selectedProductForDetails.art_number || 'NO ART NUMBER'}
                  </span>
                  <span className="px-2.5 py-1 bg-[#fce4d4]/60 border border-[#fce4d4] text-[#3a525d] rounded-xl text-[10px] font-black uppercase tracking-wider">
                    {selectedProductForDetails.gender || 'Universal'}
                  </span>
                  <span className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-[#3a525d] rounded-xl text-[10px] font-black uppercase tracking-wider">
                    {getResolvedProductTypeName(selectedProductForDetails)}
                  </span>
                  {selectedProductForDetails.base_size && (
                    <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-wider">
                      Base Size: {selectedProductForDetails.base_size}
                    </span>
                  )}
                  {selectedProductForDetails.fit && (
                    <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-wider">
                      Fit: {selectedProductForDetails.fit}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black italic tracking-tight text-[#3a525d]">
                  {selectedProductForDetails.name}
                </h2>
              </div>

              {/* Action Dropdown & Close Button */}
              <div className="flex items-center gap-2">
                <div className="relative" ref={detailsActionsRef}>
                  <button
                    type="button"
                    onClick={() => setIsDetailsActionsOpen(prev => !prev)}
                    className="h-10 px-4 bg-[#FEF2F2] hover:bg-red-100/80 text-[#9E1B1D] border border-red-200/90 rounded-xl font-black uppercase tracking-wider text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Actions</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isDetailsActionsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDetailsActionsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailsActionsOpen(false);
                          setEditVerificationProduct(selectedProductForDetails);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#3a525d] hover:bg-[#2d8d9b]/10 hover:text-[#2d8d9b] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Edit2 size={15} />
                        <span>Edit Article</span>
                      </button>

                      <div className="h-px bg-zinc-150 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailsActionsOpen(false);
                          setDeleteVerification({ step: 1, product: selectedProductForDetails });
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                        <span>Delete Article</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductForDetails(null);
                    setIsDetailsActionsOpen(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="Close Details"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* General Information Grid */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] mb-3">
                  Specification Overview
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">ART Number</p>
                    <p className="text-xs font-mono font-black text-[#2d8d9b] mt-0.5">{selectedProductForDetails.art_number || '—'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Design Number</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5">{selectedProductForDetails.design_number || 'Standard'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Gender</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5">{selectedProductForDetails.gender || '—'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Garment Category</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5">{getResolvedProductTypeName(selectedProductForDetails)}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Base Size</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5">{selectedProductForDetails.base_size || '—'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Fit</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5">{selectedProductForDetails.fit || '—'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Allowance</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5">
                      {selectedProductForDetails.allowance !== null && selectedProductForDetails.allowance !== undefined && selectedProductForDetails.allowance !== ''
                        ? `${selectedProductForDetails.allowance}"`
                        : '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Measurement Type</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5 uppercase">{selectedProductForDetails.measurement_type || 'Both'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Standard SAM</p>
                    <p className="text-xs font-black text-[#2d8d9b] mt-0.5">
                      {selectedProductForDetails.sam_value ? `${selectedProductForDetails.sam_value} mins` : '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Retail SAM</p>
                    <p className="text-xs font-black text-[#2d8d9b] mt-0.5">
                      {selectedProductForDetails.retail_sam_value ? `${selectedProductForDetails.retail_sam_value} mins` : '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Other Sizes</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5 truncate" title={selectedProductForDetails.other_sizes || 'None'}>
                      {selectedProductForDetails.other_sizes || '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Other Fits</p>
                    <p className="text-xs font-black text-[#3a525d] mt-0.5 truncate" title={selectedProductForDetails.other_fits || 'None'}>
                      {selectedProductForDetails.other_fits || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description & Specifications Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50/70 rounded-2xl border border-zinc-200">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-[#2d8d9b]" />
                    Product Description
                  </h4>
                  <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                    {selectedProductForDetails.description || <span className="italic text-zinc-400">No description entered.</span>}
                  </p>
                </div>

                <div className="p-4 bg-zinc-50/70 rounded-2xl border border-zinc-200">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5 flex items-center gap-1.5">
                    <Scissors size={14} className="text-[#2d8d9b]" />
                    Specifications / Materials
                  </h4>
                  <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                    {parseMaterialsField(selectedProductForDetails.materials).materials || selectedProductForDetails.materials || (
                      <span className="italic text-zinc-400">No specifications provided.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Fabrics & BOM Consumption Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b]">
                  Fabrics & Consumption
                </h4>
                
                {/* Main Fabric */}
                {(() => {
                  const mFab = getFabricDetails(selectedProductForDetails.main_fabric || selectedProductForDetails.main_fabric_id);
                  return (
                    <div className="p-4 bg-white rounded-2xl border border-zinc-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <span className="px-2 py-0.5 bg-[#2d8d9b]/10 text-[#2d8d9b] rounded-md text-[9px] font-black uppercase tracking-wider">
                          Primary Shell Fabric
                        </span>
                        <h5 className="text-xs font-black text-[#3a525d] mt-1">
                          {mFab?.item_name || mFab?.name || 'Primary Fabric Assigned'}
                        </h5>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {[
                            mFab?.fabric_type && `Type: ${mFab.fabric_type}`,
                            mFab?.brand && `Brand: ${mFab.brand}`,
                            mFab?.quality_name && `Quality: ${mFab.quality_name}`,
                            mFab?.shade && `Shade: ${mFab.shade}`,
                            mFab?.width && `Width: ${mFab.width}"`
                          ].filter(Boolean).join(' • ') || 'No extra fabric specs'}
                        </p>
                      </div>
                      {mFab?.colour && (
                        <span className="px-2.5 py-1 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600 border border-zinc-200">
                          Colour: {mFab.colour}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Attachment Fabrics List */}
                {selectedProductForDetails.attachment_fabrics && selectedProductForDetails.attachment_fabrics.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Attachment & Contrast Fabrics
                    </p>
                    <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                      {selectedProductForDetails.attachment_fabrics.map((att, idx) => {
                        const attFab = getFabricDetails(att.fabric_id);
                        return (
                          <div key={att.id || idx} className="p-3 flex items-center justify-between gap-4 text-xs">
                            <div>
                              <p className="font-bold text-[#3a525d]">{att.role || `Attachment #${idx + 1}`}</p>
                              <p className="text-[10px] text-zinc-400">{attFab?.item_name || attFab?.name || 'Assigned Fabric'}</p>
                            </div>
                            <span className="px-3 py-1 bg-zinc-100 rounded-xl text-xs font-black text-[#2d8d9b] border border-zinc-200">
                              {att.meters} meters
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Class Fabric Consumption Table */}
                {selectedProductForDetails.class_fabric_consumption && Object.keys(selectedProductForDetails.class_fabric_consumption).length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Class-wise Fabric Consumption Breakdown
                    </p>
                    <div className="border border-zinc-200 rounded-2xl overflow-x-auto bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-400">
                          <tr>
                            <th className="p-2.5">Class</th>
                            <th className="p-2.5">Main Fabric</th>
                            <th className="p-2.5">Attachment 1</th>
                            <th className="p-2.5">Attachment 2</th>
                            <th className="p-2.5">Button Count</th>
                            <th className="p-2.5">Thread Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-medium">
                          {Object.entries(selectedProductForDetails.class_fabric_consumption).map(([cls, values]: [string, any]) => (
                            <tr key={cls} className="hover:bg-zinc-50/60">
                              <td className="p-2.5 font-bold text-[#3a525d]">{cls}</td>
                              <td className="p-2.5">{values.main_fabric ? `${values.main_fabric}m` : '—'}</td>
                              <td className="p-2.5">{values.attachment_fabric1 ? `${values.attachment_fabric1}m` : '—'}</td>
                              <td className="p-2.5">{values.attachment_fabric2 ? `${values.attachment_fabric2}m` : '—'}</td>
                              <td className="p-2.5">{values.button_count || '—'}</td>
                              <td className="p-2.5">{values.thread_count || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Trims & Accessories Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b]">
                  Trims & Accessories Specification
                </h4>
                {selectedProductForDetails.trims && selectedProductForDetails.trims.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedProductForDetails.trims.map((trim, idx) => (
                      <div key={trim.id || idx} className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{trim.category || 'Trim'}</p>
                          <p className="text-xs font-bold text-[#3a525d] mt-0.5">{trim.name || `${trim.category} spec`}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-white border border-zinc-200 rounded-xl text-xs font-black text-[#3a525d] shadow-2xs">
                          {trim.count} {trim.uom}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                    <p className="text-xs text-zinc-400 italic">No specific trims or accessories configured.</p>
                  </div>
                )}
              </div>

              {/* Reference Images */}
              {selectedProductForDetails.images && selectedProductForDetails.images.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b]">
                    Visual References & Photos
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedProductForDetails.images.map((imgUrl, idx) => (
                      <a
                        key={idx}
                        href={imgUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group aspect-square rounded-2xl overflow-hidden border border-zinc-200 relative bg-zinc-50 block"
                      >
                        <img
                          src={imgUrl}
                          alt={`Product reference ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ExternalLink size={14} /> View
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Modification History / Remarks */}
              {selectedProductForDetails.remarks && selectedProductForDetails.remarks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b]">
                    Revision History & Remarks
                  </h4>
                  <div className="space-y-2">
                    {selectedProductForDetails.remarks.map((r, idx) => (
                      <div key={idx} className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs">
                        <p className="font-bold text-[#3a525d]">{r.title || `Revision #${idx + 1}`}</p>
                        {r.changes && <p className="text-zinc-600 mt-1"><span className="font-bold">Changes:</span> {r.changes}</p>}
                        {r.added && <p className="text-zinc-600"><span className="font-bold">Added:</span> {r.added}</p>}
                        {r.removed && <p className="text-zinc-600"><span className="font-bold">Removed:</span> {r.removed}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-zinc-150 bg-zinc-50/60 flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400">
                Registered on: {selectedProductForDetails.created_at ? new Date(selectedProductForDetails.created_at).toLocaleDateString('en-GB') : '—'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedProductForDetails(null);
                  setIsDetailsActionsOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-[#3a525d] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double verify: Edit Confirmation */}
      <ConfirmModal
        isOpen={!!editVerificationProduct}
        title="Edit Product Specification?"
        message={`Are you sure you want to edit "${editVerificationProduct?.name}" (${editVerificationProduct?.art_number})? Any changes will update the catalog specification and standard BOM parameters.`}
        confirmLabel="Yes, Proceed to Edit"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          if (editVerificationProduct) {
            setEditingProduct(editVerificationProduct);
            setIsAdding(true);
            setEditVerificationProduct(null);
            setSelectedProductForDetails(null);
          }
        }}
        onCancel={() => setEditVerificationProduct(null)}
      />

      {/* Double verify: Delete Confirmation Step 1 */}
      <ConfirmModal
        isOpen={deleteVerification.step === 1 && !!deleteVerification.product}
        title="Verify Deletion (1 of 2)"
        message={`Are you sure you want to delete "${deleteVerification.product?.name}" (${deleteVerification.product?.art_number})? Please confirm to proceed to final verification.`}
        confirmLabel="Continue to Final Confirmation"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setDeleteVerification(prev => ({ ...prev, step: 2 }));
        }}
        onCancel={() => {
          setDeleteVerification({ step: 1, product: null });
        }}
      />

      {/* Double verify: Delete Confirmation Step 2 */}
      <ConfirmModal
        isOpen={deleteVerification.step === 2 && !!deleteVerification.product}
        title="Final Confirmation (2 of 2)"
        message={`FINAL WARNING: This action cannot be undone. Product "${deleteVerification.product?.name}" (${deleteVerification.product?.art_number}) and all linked specifications will be permanently deleted from the database.`}
        confirmLabel="Permanently Delete Product"
        cancelLabel="Cancel & Keep Product"
        variant="danger"
        onConfirm={() => {
          if (deleteVerification.product) {
            executeConfirmedDelete(deleteVerification.product.id);
          }
        }}
        onCancel={() => {
          setDeleteVerification({ step: 1, product: null });
        }}
      />


    </div>
  );
}
