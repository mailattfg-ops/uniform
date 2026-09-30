'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Edit2, 
  Tag, 
  Layers, 
  Box, 
  Shirt, 
  Scissors, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  CheckCircle2, 
  Package, 
  Sparkles,
  Search,
  ExternalLink,
  Plus
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/formatters';
import toast from 'react-hot-toast';

// Types
export interface DNSItem {
  id: number;
  itemType: 'DNS';
  code: string;
  name: string;
  description: string;
  created_at: string;
  spec: {
    product_id: number;
    product_name: string;
    art_number: string;
    main_fabric_id: string | number | null;
    main_fabric_meters: string | number;
    sam_value: string | number | null;
    button_id: string | null;
    button_count: number;
    thread_id: string | null;
    thread_count: number;
    type: 'Main Product' | 'Variant';
    attachments?: string | null;
    customization?: string | null;
  } | null;
}

export interface DNGProduct {
  design_number_id: number;
  design_number: string;
  remarks?: string;
  product_id: number | null;
  name: string;
  art_number: string;
  main_fabric: string | null;
  main_fabric_id?: string | number | null;
  sam_value: string | number | null;
  button_id: string | null;
  button_count: number | null;
  thread_id: string | null;
  thread_count: number | null;
}

export interface DNGItem {
  id: number;
  itemType: 'DNG';
  code: string;
  name: string;
  description: string;
  created_at?: string;
  products: DNGProduct[];
}

export type DesignItem = DNSItem | DNGItem;

function DesignNumbersContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams?.get('type')?.toUpperCase();

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DNS' | 'DNG'>(
    initialType === 'DNS' || initialType === 'DNG' ? initialType : 'ALL'
  );
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [dnsList, setDnsList] = useState<DNSItem[]>([]);
  const [dngList, setDngList] = useState<DNGItem[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [buttonsList, setButtonsList] = useState<any[]>([]);
  const [threadsList, setThreadsList] = useState<any[]>([]);
  const [trimsList, setTrimsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expanded DNG row state
  const [expandedDngIds, setExpandedDngIds] = useState<Record<number, boolean>>({});

  // Edit Modals
  const [editingDNS, setEditingDNS] = useState<DNSItem | null>(null);
  const [editingDNG, setEditingDNG] = useState<DNGItem | null>(null);

  // Fetch all DNS, DNG, and auxiliary catalogs
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dnRes, gdRes, fabricsRes, buttonsRes, threadsRes, trimsRes] = await Promise.all([
        api.get('/quotations/design-numbers').catch(() => ({ data: [] })),
        api.get('/quotations/group-designs').catch(() => ({ data: [] })),
        api.get('/inventory/fabrics').catch(() => ({ data: [] })),
        api.get('/inventory/buttons').catch(() => ({ data: [] })),
        api.get('/inventory/threads').catch(() => ({ data: [] })),
        api.get('/inventory/trims').catch(() => ({ data: [] }))
      ]);

      const formattedDNS: DNSItem[] = (dnRes.data || []).map((d: any) => ({
        ...d,
        itemType: 'DNS' as const
      }));

      const formattedDNG: DNGItem[] = (gdRes.data || []).map((g: any) => ({
        ...g,
        itemType: 'DNG' as const
      }));

      setDnsList(formattedDNS);
      setDngList(formattedDNG);
      setFabrics(fabricsRes.data || []);
      setButtonsList(buttonsRes.data || []);
      setThreadsList(threadsRes.data || []);
      setTrimsList(trimsRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load design number catalogs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update query param if user came in with one or changed it
  useEffect(() => {
    if (initialType === 'DNS' || initialType === 'DNG') {
      setTypeFilter(initialType);
    }
  }, [initialType]);

  // Combined & Filtered List
  const combinedList = useMemo(() => {
    let list: DesignItem[] = [];
    if (typeFilter === 'ALL') {
      list = [...dnsList, ...dngList];
    } else if (typeFilter === 'DNS') {
      list = [...dnsList];
    } else {
      list = [...dngList];
    }

    // Sort by code naturally
    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [dnsList, dngList, typeFilter]);

  // Text search filter
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return combinedList;
    const term = searchTerm.toLowerCase().trim();

    return combinedList.filter((item) => {
      const matchCode = item.code?.toLowerCase().includes(term);
      const matchName = item.name?.toLowerCase().includes(term);
      const matchDesc = item.description?.toLowerCase().includes(term);

      if (matchCode || matchName || matchDesc) return true;

      if (item.itemType === 'DNS' && item.spec) {
        const prodMatch = 
          item.spec.product_name?.toLowerCase().includes(term) ||
          item.spec.art_number?.toLowerCase().includes(term);
        if (prodMatch) return true;
      }

      if (item.itemType === 'DNG' && item.products) {
        const childMatch = item.products.some(p => 
          p.name?.toLowerCase().includes(term) ||
          p.design_number?.toLowerCase().includes(term) ||
          p.art_number?.toLowerCase().includes(term)
        );
        if (childMatch) return true;
      }

      return false;
    });
  }, [combinedList, searchTerm]);

  // Toggle DNG row expand
  const toggleDngExpand = (id: number) => {
    setExpandedDngIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Save DNS edit
  const handleUpdateDNS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDNS) return;

    const loadingToast = toast.loading(`Updating ${editingDNS.code}...`);
    try {
      await api.put(`/quotations/design-numbers/${editingDNS.id}`, {
        name: editingDNS.name,
        description: editingDNS.description
      });
      toast.success(`${editingDNS.code} updated successfully!`, { id: loadingToast });
      setEditingDNS(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update DNS item', { id: loadingToast });
    }
  };

  // Save DNG edit
  const handleUpdateDNG = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDNG) return;

    const loadingToast = toast.loading(`Updating ${editingDNG.code}...`);
    try {
      await api.put(`/quotations/group-designs/${editingDNG.id}`, {
        name: editingDNG.name,
        description: editingDNG.description,
        products: editingDNG.products
      });
      toast.success(`${editingDNG.code} updated successfully!`, { id: loadingToast });
      setEditingDNG(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update DNG set', { id: loadingToast });
    }
  };

  // Columns definition
  const columns: Column<DesignItem>[] = [
    {
      header: 'Design ID & Classification',
      accessor: (item) => {
        const isDNS = item.itemType === 'DNS';
        return (
          <div className="space-y-1.5 min-w-[150px]">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-lg tracking-wider border shadow-xs ${
                  isDNS
                    ? 'bg-[#2d8d9b]/10 text-[#2d8d9b] border-[#2d8d9b]/20'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isDNS ? 'DNS (Individual)' : 'DNG (Group Set)'}
              </span>
            </div>
            
            <p className="font-mono text-sm font-black tracking-tight text-[#3a525d]">
              {item.code}
            </p>

            <p className="text-[10px] text-zinc-400 font-semibold">
              {item.created_at ? formatDate(item.created_at) : 'System Registered'}
            </p>
          </div>
        );
      }
    },
    {
      header: 'Design Title & Scope',
      accessor: (item) => {
        return (
          <div className="max-w-xs space-y-1">
            <p className="font-black text-sm text-[#3a525d] leading-snug">
              {item.name || (item.itemType === 'DNS' ? 'Individual Design Spec' : 'Group Uniform Bundle')}
            </p>
            {item.description ? (
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-medium">
                {item.description}
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400 italic">No technical notes recorded.</p>
            )}

            {item.itemType === 'DNG' && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md">
                  <Box size={12} />
                  Contains {item.products?.length || 0} product designs
                </span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Material Combination & Attached Product(s)',
      accessor: (item) => {
        // Individual Product Design (DNS)
        if (item.itemType === 'DNS') {
          if (!item.spec) {
            return (
              <span className="text-[11px] text-zinc-400 italic font-semibold">
                Unassigned / Standalone combination
              </span>
            );
          }

          const p = item.spec;
          const fabric = fabrics.find(f => String(f.id) === String(p.main_fabric_id));
          const button = buttonsList.find(b => String(b.id) === String(p.button_id));
          const thread = threadsList.find(t => String(t.id) === String(p.thread_id));

          return (
            <div className="bg-[#fce4d4]/15 border border-[#fce4d4] p-3.5 rounded-2xl flex flex-col gap-2 min-w-[340px] max-w-lg shadow-xs">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                    p.type === 'Main Product' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-[#2d8d9b]/10 text-[#2d8d9b] border-[#2d8d9b]/20'
                  }`}>
                    {p.type}
                  </span>
                  <p className="text-xs font-black text-[#3a525d]">{p.product_name}</p>
                </div>
                <span className="px-2 py-0.5 bg-white border border-[#fce4d4] text-[#3a525d] text-[9px] font-mono font-bold uppercase rounded">
                  ART: {p.art_number}
                </span>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] border-t border-[#fce4d4]/60 pt-2 text-zinc-600">
                <div>
                  <span className="font-bold text-zinc-400 text-[10px] block">MAIN FABRIC</span>
                  <span className="font-semibold text-[#3a525d] truncate block">
                    {fabric?.brand_name || fabric?.fabric_code || 'Standard'} ({p.main_fabric_meters}m)
                  </span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 text-[10px] block">SAM VALUE</span>
                  <span className="font-semibold font-mono text-[#2d8d9b]">
                    {p.sam_value ? `${p.sam_value} min` : '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 text-[10px] block">BUTTON FASTENERS</span>
                  <span className="font-semibold text-[#3a525d] truncate block">
                    {button?.name || 'Standard'} {p.button_count ? `(${p.button_count} pcs)` : ''}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 text-[10px] block">SEWING THREAD</span>
                  <span className="font-semibold text-[#3a525d] truncate block">
                    {thread?.name || 'Standard'} {p.thread_count ? `(${p.thread_count} spools)` : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        // Group Design Number (DNG) - Combination of multiple DNS products
        const dng = item as DNGItem;
        const products = dng.products || [];
        const isExpanded = !!expandedDngIds[dng.id];

        if (products.length === 0) {
          return (
            <span className="text-[11px] text-zinc-400 italic">
              Empty group set (no product DNS mapped)
            </span>
          );
        }

        return (
          <div className="bg-amber-50/40 border border-amber-200/60 p-3.5 rounded-2xl flex flex-col gap-2.5 min-w-[360px] max-w-lg shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Layers size={13} />
                Bundled Products in Group ({products.length})
              </span>
              <button
                type="button"
                onClick={() => toggleDngExpand(dng.id)}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-white/70 px-2 py-1 rounded-md border border-amber-200/50"
              >
                {isExpanded ? (
                  <>Hide Details <ChevronUp size={12} /></>
                ) : (
                  <>View All Specs <ChevronDown size={12} /></>
                )}
              </button>
            </div>

            {/* Compact Badges View */}
            <div className="flex flex-wrap gap-1.5">
              {products.map((p, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-amber-200/80 rounded-lg px-2.5 py-1 text-xs flex items-center gap-2 shadow-xs"
                >
                  <span className="font-mono text-[10px] font-bold text-[#2d8d9b] bg-[#2d8d9b]/10 px-1.5 py-0.5 rounded">
                    {p.design_number || 'DNS-xxxx'}
                  </span>
                  <span className="font-bold text-[#3a525d] text-[11px]">{p.name}</span>
                  <span className="text-[9px] text-zinc-400 font-mono">({p.art_number})</span>
                </div>
              ))}
            </div>

            {/* Expanded Multi-Product Detail Grid */}
            {isExpanded && (
              <div className="mt-2 space-y-2 border-t border-amber-200/60 pt-2.5 animate-in fade-in duration-200">
                {products.map((p, idx) => {
                  const btn = buttonsList.find(b => String(b.id) === String(p.button_id));
                  const thd = threadsList.find(t => String(t.id) === String(p.thread_id));
                  return (
                    <div 
                      key={idx} 
                      className="bg-white/90 p-2.5 rounded-xl border border-amber-100 text-[11px] space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-[#3a525d]">{p.name}</span>
                        <span className="font-mono text-[10px] font-black text-[#2d8d9b] bg-[#2d8d9b]/10 px-1.5 py-0.5 rounded">
                          {p.design_number}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 grid grid-cols-2 gap-1 pt-1">
                        <div>
                          <span className="font-bold text-zinc-400">Fabric: </span>
                          <span>{p.main_fabric || 'Default'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-zinc-400">SAM: </span>
                          <span className="font-mono">{p.sam_value || '—'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-zinc-400">Buttons: </span>
                          <span>{btn?.name || 'Default'} ({p.button_count || 0})</span>
                        </div>
                        <div>
                          <span className="font-bold text-zinc-400">Thread: </span>
                          <span>{thd?.name || 'Default'} ({p.thread_count || 0})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (item.itemType === 'DNS') {
                setEditingDNS(item as DNSItem);
              } else {
                setEditingDNG(item as DNGItem);
              }
            }}
            className="w-9 h-9 rounded-xl bg-white text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-zinc-200 shadow-xs cursor-pointer"
            title="Edit Specification Details"
          >
            <Edit2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Page Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3a525d] text-white flex items-center justify-center shadow-md shadow-[#3a525d]/20">
              <Tag size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tight text-[#3a525d]">
                Design Number Catalog
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#2d8d9b]">
                DNS (Single Product Combinations) & DNG (Group Product Sets)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total */}
        <div className="bg-white rounded-3xl border border-[#fce4d4] p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Catalog Designs</p>
            <h3 className="text-2xl font-black italic text-[#3a525d] mt-0.5">
              {dnsList.length + dngList.length}
            </h3>
          </div>
        </div>

        {/* DNS */}
        <div 
          onClick={() => setTypeFilter('DNS')}
          className={`bg-white rounded-3xl border p-5 shadow-xs flex items-center gap-4 cursor-pointer transition-all ${
            typeFilter === 'DNS' ? 'border-[#2d8d9b] ring-2 ring-[#2d8d9b]/20 bg-[#2d8d9b]/5' : 'border-[#fce4d4] hover:border-[#2d8d9b]/40'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/15 flex items-center justify-center text-[#2d8d9b] shrink-0">
            <Shirt size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b]">DNS (Individual Products)</p>
            <h3 className="text-2xl font-black italic text-[#3a525d] mt-0.5">
              {dnsList.length}
            </h3>
          </div>
        </div>

        {/* DNG */}
        <div 
          onClick={() => setTypeFilter('DNG')}
          className={`bg-white rounded-3xl border p-5 shadow-xs flex items-center gap-4 cursor-pointer transition-all ${
            typeFilter === 'DNG' ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/50' : 'border-[#fce4d4] hover:border-amber-300'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Box size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">DNG (Group Design Sets)</p>
            <h3 className="text-2xl font-black italic text-[#3a525d] mt-0.5">
              {dngList.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Search and Dropdown Filter Bar */}
      <div className="bg-white border border-[#fce4d4] rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        
        {/* Search */}
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/60 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code (DNS/DNG), name, product, fabric..."
            className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all text-[#3a525d]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
          
          {/* USER'S REQUEST: Dropdown Filter for DNS / DNG */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 whitespace-nowrap hidden sm:inline">
              Filter:
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-11 px-4 bg-white border border-[#fce4d4] rounded-2xl text-xs font-black uppercase tracking-wider text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all cursor-pointer shadow-xs w-full sm:w-auto"
            >
              <option value="ALL">All Designs (DNS & DNG)</option>
              <option value="DNS">DNS - Individual Product Designs ({dnsList.length})</option>
              <option value="DNG">DNG - Group Design Sets ({dngList.length})</option>
            </select>
          </div>

          {/* Quick Pill Toggles */}
          <div className="flex items-center gap-1.5 bg-[#fce4d4]/20 p-1 rounded-2xl border border-[#fce4d4]/40">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`h-9 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'ALL'
                  ? 'bg-[#3a525d] text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              All ({dnsList.length + dngList.length})
            </button>
            <button
              onClick={() => setTypeFilter('DNS')}
              className={`h-9 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'DNS'
                  ? 'bg-[#2d8d9b] text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              DNS ({dnsList.length})
            </button>
            <button
              onClick={() => setTypeFilter('DNG')}
              className={`h-9 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'DNG'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              DNG ({dngList.length})
            </button>
          </div>

        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredList}
        isLoading={isLoading}
        searchPlaceholder="" // Search is controlled above
      />

      {/* DNS Edit Modal */}
      {editingDNS && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="p-8 border border-zinc-100 rounded-[2.5rem] shadow-2xl bg-white max-w-lg w-full space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 text-[9px] font-black uppercase rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
                  Edit Individual Design
                </span>
                <h3 className="text-2xl font-black text-[#3a525d] mt-2">
                  {editingDNS.code}
                </h3>
                <p className="text-xs text-zinc-400">
                  {editingDNS.spec?.product_name || 'Individual combination design'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateDNS} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                  Design Combination Title
                </label>
                <input
                  type="text"
                  required
                  value={editingDNS.name || ''}
                  onChange={(e) => setEditingDNS({ ...editingDNS, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                  placeholder="e.g. DNS-0001 Standard Collar Cut"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                  Specification / Remarks Notes
                </label>
                <textarea
                  value={editingDNS.description || ''}
                  onChange={(e) => setEditingDNS({ ...editingDNS, description: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#2d8d9b]"
                  rows={4}
                  placeholder="Describe details regarding fabric finish, contrast stitch thread, button spacing..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingDNS(null)}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#3a525d] hover:bg-[#2d8d9b] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Save Specification
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DNG Edit Modal */}
      {editingDNG && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="p-8 border border-zinc-100 rounded-[2.5rem] shadow-2xl bg-white max-w-xl w-full space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 text-[9px] font-black uppercase rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                  Edit Group Design Set
                </span>
                <h3 className="text-2xl font-black text-[#3a525d] mt-2">
                  {editingDNG.code}
                </h3>
                <p className="text-xs text-zinc-400">
                  Multi-product group bundle configuration
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateDNG} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                  Group Bundle Title
                </label>
                <input
                  type="text"
                  required
                  value={editingDNG.name || ''}
                  onChange={(e) => setEditingDNG({ ...editingDNG, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-amber-500"
                  placeholder="e.g. DNG-0001 Summer School Uniform Kit"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                  Set Description & Scope
                </label>
                <textarea
                  value={editingDNG.description || ''}
                  onChange={(e) => setEditingDNG({ ...editingDNG, description: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-amber-500"
                  rows={3}
                  placeholder="Set package details, grade range, department bundle instructions..."
                />
              </div>

              {/* Products in this DNG */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                  Bundled Products ({editingDNG.products?.length || 0})
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {editingDNG.products?.map((p, idx) => (
                    <div key={idx} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-[#3a525d]">{p.name}</p>
                        <p className="text-[10px] text-zinc-400">ART: {p.art_number}</p>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-[#2d8d9b] bg-[#2d8d9b]/10 px-2 py-0.5 rounded">
                        {p.design_number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingDNG(null)}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#3a525d] hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Save Group Set
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}

export default function DesignNumberCatalog() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-zinc-400 font-bold">
        Loading design numbers catalog...
      </div>
    }>
      <DesignNumbersContent />
    </Suspense>
  );
}
