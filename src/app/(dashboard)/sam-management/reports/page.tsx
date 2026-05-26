'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  FileSpreadsheet, 
  History, 
  Layers, 
  TrendingUp, 
  Coins, 
  Percent, 
  Clock, 
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';

interface HistoryEntry {
  id: number;
  product_id: number | null;
  sam_configuration_id: number | null;
  sales_type: string;
  quantity: number;
  base_sam: string;
  applied_slab_percent: string;
  adjusted_sam: string;
  final_sam_cost: string;
  created_at: string;
  product?: { name: string; art_number: string } | null;
  performer?: { full_name: string } | null;
}

interface ProductSAMReport {
  id: number;
  name: string;
  art_number: string;
  gender: string;
  config_name: string;
  base_sam: number;
  wholesale_cost: number | null;
  retail_cost: number | null;
}

interface SlabAnalysisRow {
  range: string;
  adjustment: string;
  final_val: number;
  enabled: boolean;
}

interface SlabAnalysis {
  config_name: string;
  base_sam: number;
  wholesale: SlabAnalysisRow[];
  retail: SlabAnalysisRow[];
}

interface ComparisonRow {
  range: string;
  wholesale_adj: string;
  wholesale_cost: number;
  retail_adj: string;
  retail_cost: number;
  difference: number;
  markup_percent: number;
}

interface ComparisonReport {
  config_name: string;
  base_sam: number;
  comparison: ComparisonRow[];
}

interface ConfigurationSelector {
  id: number;
  name: string;
}

export default function SAMReports() {
  const [activeTab, setActiveTab] = useState<'history' | 'product-wise' | 'slab-analysis' | 'comparison'>('history');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Data States
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [productReport, setProductReport] = useState<ProductSAMReport[]>([]);
  const [slabAnalysis, setSlabAnalysis] = useState<SlabAnalysis | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [configs, setConfigs] = useState<ConfigurationSelector[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/sam-management/configurations');
      if (res.data && !res.data.error) {
        setConfigs(res.data.map((c: any) => ({ id: c.id, name: c.name })));
        if (res.data.length > 0) {
          setSelectedConfigId(String(res.data[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load configurations listing');
    }
  };

  const loadTabData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'history') {
        const res = await api.get('/sam-management/calculations/history');
        if (res.data && !res.data.error) {
          setHistory(res.data || []);
        }
      } else if (activeTab === 'product-wise') {
        const res = await api.get('/sam-management/reports/product-wise');
        if (res.data && !res.data.error) {
          setProductReport(res.data || []);
        }
      } else if (activeTab === 'slab-analysis') {
        const params = selectedConfigId ? { configuration_id: selectedConfigId } : {};
        const res = await api.get('/sam-management/reports/slab-analysis', { params });
        if (res.data && !res.data.error) {
          setSlabAnalysis(res.data);
        }
      } else if (activeTab === 'comparison') {
        const params = selectedConfigId ? { configuration_id: selectedConfigId } : {};
        const res = await api.get('/sam-management/reports/comparison', { params });
        if (res.data && !res.data.error) {
          setComparison(res.data);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load report data. Please ensure table migrations have run.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch configurations once on mount
  useEffect(() => {
    fetchConfigs();
  }, []);

  // Reload tab data when activeTab or selectedConfigId changes
  useEffect(() => {
    loadTabData();
  }, [activeTab, selectedConfigId]);

  // History columns
  const historyColumns: Column<HistoryEntry>[] = [
    {
      header: 'Calculation Details',
      accessor: (h) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 flex items-center justify-center text-[#2d8d9b]">
            <History size={16} />
          </div>
          <div>
            <p className="font-black text-sm text-[#3a525d]">
              {h.product ? h.product.name : 'Baseline Estimation'}
            </p>
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
              {h.product ? `Art No: ${h.product.art_number}` : 'No target product'}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Sales Category',
      accessor: (h) => (
        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded border w-fit block ${
          h.sales_type === 'wholesale' 
            ? 'bg-blue-50 text-blue-600 border-blue-100' 
            : 'bg-purple-50 text-purple-600 border-purple-100'
        }`}>
          {h.sales_type}
        </span>
      )
    },
    {
      header: 'Quantity',
      accessor: (h) => (
        <span className="font-mono font-bold text-xs text-[#3a525d]">{h.quantity} units</span>
      )
    },
    {
      header: 'Base SAM',
      accessor: (h) => (
        <span className="font-mono text-xs font-semibold text-zinc-500">₹{Number(h.base_sam).toFixed(2)}</span>
      )
    },
    {
      header: 'Applied Slab',
      accessor: (h) => {
        const percent = parseFloat(h.applied_slab_percent);
        return (
          <span className={`font-mono text-xs font-black ${percent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {percent >= 0 ? `+${percent}%` : `${percent}%`}
          </span>
        );
      }
    },
    {
      header: 'Final Cost',
      accessor: (h) => (
        <span className="font-mono font-black text-xs text-orange-500">₹{Number(h.final_sam_cost).toFixed(2)}</span>
      )
    },
    {
      header: 'Performed By',
      accessor: (h) => (
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          {h.performer?.full_name || 'System / Admin'}
        </span>
      )
    },
    {
      header: 'Date & Time',
      accessor: (h) => (
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Clock size={12} />
          <span className="text-[10px] font-bold tracking-widest">
            {new Date(h.created_at).toLocaleString()}
          </span>
        </div>
      )
    }
  ];

  // Product Report columns
  const productColumns: Column<ProductSAMReport>[] = [
    {
      header: 'Product Details',
      accessor: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center text-[#3a525d] border border-zinc-100">
            <Layers size={16} />
          </div>
          <div>
            <p className="font-black text-sm text-[#3a525d]">{p.name}</p>
            <p className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest mt-0.5">SN: {p.art_number}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Gender',
      accessor: (p) => (
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">{p.gender}</span>
      )
    },
    {
      header: 'Costing Template',
      accessor: (p) => (
        <span className="px-2.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded-lg text-xs font-bold text-[#3a525d]">
          {p.config_name}
        </span>
      )
    },
    {
      header: 'Base SAM Subtotal',
      accessor: (p) => (
        <span className="font-mono text-xs font-bold text-[#3a525d]">₹{p.base_sam.toFixed(2)}</span>
      )
    },
    {
      header: 'Calculated Wholesale Price',
      accessor: (p) => (
        p.wholesale_cost !== null ? (
          <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-md font-mono text-xs font-black">
            ₹{p.wholesale_cost.toFixed(2)}
          </span>
        ) : (
          <span className="text-zinc-300 italic text-xs">Not calculated</span>
        )
      )
    },
    {
      header: 'Calculated Retail Price',
      accessor: (p) => (
        p.retail_cost !== null ? (
          <span className="px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-600 rounded-md font-mono text-xs font-black">
            ₹{p.retail_cost.toFixed(2)}
          </span>
        ) : (
          <span className="text-zinc-300 italic text-xs">Not calculated</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">SAM Intelligence</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Reports & performance analysis cockpit
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-zinc-100 gap-1 bg-white p-1 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('history')}
          className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <History size={14} />
          Costing History
        </button>
        <button
          onClick={() => setActiveTab('product-wise')}
          className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'product-wise'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <FileSpreadsheet size={14} />
          Product-Wise SAM
        </button>
        <button
          onClick={() => setActiveTab('slab-analysis')}
          className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'slab-analysis'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <Percent size={14} />
          Quantity Slab Analysis
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'comparison'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <TrendingUp size={14} />
          Wholesale vs Retail
        </button>
      </div>

      {/* Config selector filter for Analysis tabs */}
      {(activeTab === 'slab-analysis' || activeTab === 'comparison') && configs.length > 0 && (
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm w-full md:w-fit">
          <Filter size={16} className="text-zinc-400" />
          <span className="text-xs font-black text-[#3a525d] uppercase tracking-wider">Analysis configuration:</span>
          <select
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            className="h-10 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] outline-none"
          >
            {configs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Contents */}
      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center bg-white rounded-3xl border border-zinc-100 shadow-sm">
          <div className="animate-spin text-[#2d8d9b] border-4 border-t-transparent rounded-full w-10 h-10" />
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          {activeTab === 'history' && (
            <DataTable
              title="SAM Calculation Logs"
              subtitle="Audit trail of previous costing runs"
              columns={historyColumns}
              data={history}
              searchPlaceholder="Filter logs by product name..."
            />
          )}

          {activeTab === 'product-wise' && (
            <DataTable
              title="Product SAM Register"
              subtitle="Overview of catalog product SAM templates and values"
              columns={productColumns}
              data={productReport}
              searchPlaceholder="Search catalog products..."
            />
          )}

          {activeTab === 'slab-analysis' && slabAnalysis && (
            <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-zinc-100 space-y-8">
              <div>
                <h3 className="text-lg font-black text-[#3a525d]">Slab Pricing Impact analysis</h3>
                <p className="text-xs font-semibold text-zinc-400 mt-0.5">
                  Simulating cost changes for configuration <span className="font-bold text-[#2d8d9b]">"{slabAnalysis.config_name}"</span> (Base SAM: ₹{slabAnalysis.base_sam.toFixed(2)})
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Wholesale Analysis */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <TrendingUp size={16} />
                    Wholesale Slab Adjustments
                  </h4>
                  <div className="space-y-3">
                    {slabAnalysis.wholesale.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-xs font-bold text-[#3a525d]">
                        <span className="w-24 font-mono">Qty: {row.range}</span>
                        <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-full h-8 overflow-hidden relative flex items-center px-4">
                          {/* Visual cost fill */}
                          <div 
                            className="bg-blue-100/50 border-r border-blue-200 absolute left-0 top-0 bottom-0 transition-all"
                            style={{ width: `${Math.min(100, (row.final_val / (slabAnalysis.base_sam * 2)) * 100)}%` }}
                          />
                          <span className="relative z-10 text-[10px] font-black uppercase text-zinc-400">Modifier: {row.adjustment}</span>
                        </div>
                        <span className="w-20 text-right font-mono font-black text-blue-600">₹{row.final_val.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retail Analysis */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-purple-600 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <Coins size={16} />
                    Retail Slab Adjustments
                  </h4>
                  <div className="space-y-3">
                    {slabAnalysis.retail.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-xs font-bold text-[#3a525d]">
                        <span className="w-24 font-mono">Qty: {row.range}</span>
                        <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-full h-8 overflow-hidden relative flex items-center px-4">
                          {/* Visual cost fill */}
                          <div 
                            className="bg-purple-100/50 border-r border-purple-200 absolute left-0 top-0 bottom-0 transition-all"
                            style={{ width: `${Math.min(100, (row.final_val / (slabAnalysis.base_sam * 2)) * 100)}%` }}
                          />
                          <span className="relative z-10 text-[10px] font-black uppercase text-zinc-400">Modifier: {row.adjustment}</span>
                        </div>
                        <span className="w-20 text-right font-mono font-black text-purple-600">₹{row.final_val.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comparison' && comparison && (
            <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-zinc-100 space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#3a525d]">Wholesale vs Retail Comparison</h3>
                <p className="text-xs font-semibold text-zinc-400 mt-0.5">
                  Markup comparative analysis for configuration <span className="font-bold text-[#2d8d9b]">"{comparison.config_name}"</span> (Base SAM: ₹{comparison.base_sam.toFixed(2)})
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-100">
                <table className="w-full text-left text-xs font-semibold text-[#3a525d]">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      <th className="p-4">Quantity Tier</th>
                      <th className="p-4 text-right">Wholesale Cost</th>
                      <th className="p-4 text-right">Retail Cost</th>
                      <th className="p-4 text-right">Cost Difference</th>
                      <th className="p-4 text-right">Retail Markup (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {comparison.comparison.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 transition-all">
                        <td className="p-4 font-mono font-bold">{row.range}</td>
                        <td className="p-4 text-right">
                          <span className="text-zinc-500 font-mono">({row.wholesale_adj})</span>{' '}
                          <span className="font-mono font-bold text-blue-600">₹{row.wholesale_cost.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-zinc-500 font-mono">({row.retail_adj})</span>{' '}
                          <span className="font-mono font-bold text-purple-600">₹{row.retail_cost.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-rose-500">
                          +₹{row.difference.toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-md font-mono font-black">
                            +{row.markup_percent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
