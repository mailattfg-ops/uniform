'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Layers,
  Scissors,
  CheckSquare,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  Shirt,
  Trash2,
  AlertTriangle,
  Package,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatQuantity } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface JobCard {
  id: number;
  job_card_no: string;
  item_name: string;
  quantity: number;
  status: string;
  size_breakdown?: any;
  is_fabric_issued?: boolean;
  fabric_issued_meters?: number;
  fabric_issue_details?: {
    fabric_name: string;
    issued_meters: number;
    created_at: string;
    cut_piece_batch_no?: string;
  };
  fabric_consumption_logs?: any[];
}

interface SubJobCard {
  id: number;
  sub_card_no: string;
  job_card_id: number;
  batch_size: number;
  size_distribution?: Record<string, any>;
  stage: 'Cutting' | 'Stitching' | 'Finishing' | 'QC' | 'Packing' | 'Ready';
  assigned_to?: string;
  target_date?: string;
  created_at?: string;
  job_cards?: {
    id: number;
    job_card_no: string;
    item_name: string;
    quantity: number;
    status: string;
  };
}

const STAGES = ['Cutting', 'Stitching', 'Finishing', 'QC', 'Packing', 'Ready'] as const;
type StageType = typeof STAGES[number];

export default function ProductionQueuePage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [subJobCards, setSubJobCards] = useState<SubJobCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [jobCardStatusFilter, setJobCardStatusFilter] = useState<'all' | 'Accepted' | 'In Production' | 'Ready'>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  // Sub-job card batch breakdown state
  const [showSubCardModal, setShowSubCardModal] = useState(false);
  const [selectedJobCardId, setSelectedJobCardId] = useState<number | null>(null);
  const [selectedJobCardNo, setSelectedJobCardNo] = useState<string>('');
  const [selectedJobCardTotalQty, setSelectedJobCardTotalQty] = useState(0);
  const [selectedJobCardRemainingQty, setSelectedJobCardRemainingQty] = useState(0);
  const [batchSize, setBatchSize] = useState('10');
  const [assignedTo, setAssignedTo] = useState('Line 1');
  const [availableChildCards, setAvailableChildCards] = useState<any[]>([]);
  const [selectedPieceIds, setSelectedPieceIds] = useState<number[]>([]);

  // Fabric issue state
  const [showFabricModal, setShowFabricModal] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [stockFabrics, setStockFabrics] = useState<any[]>([]);
  const [loadingRequiredFabrics, setLoadingRequiredFabrics] = useState(false);
  const [requiredFabricsList, setRequiredFabricsList] = useState<any[]>([]);
  const [editingRollIndex, setEditingRollIndex] = useState<number | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const statusParam = jobCardStatusFilter === 'all' ? 'Accepted,In Production,Ready' : jobCardStatusFilter;
      const res = await api.get(`/job-cards?status=${statusParam}`);
      setJobCards(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubJobCards = async () => {
    try {
      const res = await api.get('/job-cards/sub-cards');
      setSubJobCards(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch sub-job cards', err);
    }
  };

  const fetchStockFabrics = async () => {
    try {
      const res = await api.get('/inventory/stock');
      const fabrics = res.data?.fabrics || [];
      setStockFabrics(fabrics);
    } catch (err) {
      console.error('Failed to fetch stock fabrics', err);
    }
  };

  useEffect(() => {
    fetchJobCards();
  }, [jobCardStatusFilter]);

  useEffect(() => {
    fetchSubJobCards();
    fetchStockFabrics();
  }, []);

  const refreshAll = () => {
    fetchJobCards();
    fetchSubJobCards();
    fetchStockFabrics();
  };

  const openSubCardModal = async (jc: JobCard) => {
    const allocated = subJobCards
      .filter(sc => sc.job_card_id === jc.id)
      .reduce((sum, sc) => sum + sc.batch_size, 0);
    const remaining = Math.max(0, jc.quantity - allocated);

    if (remaining <= 0) {
      toast.error(`Job Card ${jc.job_card_no} is already 100% batched (${allocated}/${jc.quantity} pcs).`);
      return;
    }

    setSelectedJobCardId(jc.id);
    setSelectedJobCardNo(jc.job_card_no);
    setSelectedJobCardTotalQty(jc.quantity);
    setSelectedJobCardRemainingQty(remaining);
    setBatchSize(String(Math.min(remaining, 50)));
    setSelectedPieceIds([]);
    setShowSubCardModal(true);

    try {
      let res = await api.get(`/job-cards/${jc.id}/child-cards`);
      let pieces = res.data || [];
      if (pieces.length === 0) {
        const genRes = await api.post(`/job-cards/${jc.id}/generate-child-cards`);
        pieces = genRes.data.pieces || [];
      }
      const unassigned = pieces.filter((p: any) => !p.sub_job_card_id);
      setAvailableChildCards(unassigned);
    } catch {
      setAvailableChildCards([]);
    }
  };

  const openFabricModalForCard = async (jc: JobCard) => {
    const isAlreadyIssued = jc.is_fabric_issued || (jc.fabric_consumption_logs && jc.fabric_consumption_logs.length > 0);
    if (isAlreadyIssued) {
      toast.error(`Fabric has already been issued for Job Card ${jc.job_card_no}. Duplicate issuing is locked.`);
      return;
    }

    setSelectedJobCard(jc);
    setSelectedJobCardId(jc.id);
    setApprovalConfirmed(false);
    setEditingRollIndex(null);
    setShowFabricModal(true);
    setLoadingRequiredFabrics(true);

    try {
      const res = await api.get(`/job-cards/${jc.id}/required-fabrics`);
      const rawList = res.data?.fabrics || res.data?.required_fabrics || [];
      if (rawList.length > 0) {
        const normalized = rawList.map((f: any, idx: number) => {
          const avail = parseFloat(String(f.available_stock || 0));
          const totalReq = parseFloat(String(f.total_issue_meters || 0));
          return {
            ...f,
            product_name: f.product_name || jc.item_name || 'Garment Item',
            role: f.role || 'Main Fabric',
            fabric_key: f.fabric_key || `${f.product_name || 'garment'}_${idx}`,
            selected_stock_fabric_id: f.fabric_id || f.selected_stock_fabric_id || null,
            selected_stock_fabric_name: f.fabric_name || f.selected_stock_fabric_name || 'Standard Garment Fabric',
            selected_stock_fabric_code: f.fabric_code || f.selected_stock_fabric_code || '',
            available_stock: avail,
            is_in_stock: f.is_in_stock !== undefined ? f.is_in_stock : (avail >= totalReq),
            stock_after_issue: f.stock_after_issue !== undefined ? f.stock_after_issue : Math.max(0, avail - totalReq),
            returned_meters: f.returned_meters ?? '0'
          };
        });
        setRequiredFabricsList(normalized);
      } else {
        const consumptionPerPc = Number(jc.size_breakdown?.main_fabric_meters) || 1.25;
        const reqM = Number((jc.quantity * consumptionPerPc).toFixed(2));
        const safetyM = Number((reqM * 0.10).toFixed(2));
        const totalM = Number((reqM + safetyM).toFixed(2));
        const firstStock = stockFabrics[0];
        const avail = firstStock ? Number(firstStock.quantity || 0) : 0;
        setRequiredFabricsList([{
          product_name: jc.item_name || 'Garment Item',
          fabric_key: 'main_fabric_0',
          role: 'Main Fabric',
          specified_name: jc.size_breakdown?.fabric_name || 'Standard Garment Fabric',
          consumption_per_pc: consumptionPerPc,
          quantity: jc.quantity,
          required_meters: reqM,
          safety_margin_meters: safetyM,
          total_issue_meters: totalM,
          selected_stock_fabric_id: firstStock ? String(firstStock.id) : null,
          selected_stock_fabric_name: firstStock ? firstStock.name : 'Standard Production Fabric',
          selected_stock_fabric_code: firstStock?.code || '',
          available_stock: avail,
          is_in_stock: avail >= totalM,
          stock_after_issue: Number((avail - totalM).toFixed(2)),
          returned_meters: '0'
        }]);
      }
    } catch (err: any) {
      console.error('Failed to load required fabrics for job card', err);
      toast.error(err.response?.data?.error || 'Could not fetch required fabrics');
    } finally {
      setLoadingRequiredFabrics(false);
    }
  };

  const handleItemRollChange = (index: number, fabricId: string) => {
    const chosen = stockFabrics.find(f => String(f.id) === String(fabricId));
    setRequiredFabricsList(prev => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const avail = chosen ? Number(chosen.quantity || 0) : 0;
      item.selected_stock_fabric_id = chosen ? String(chosen.id) : '';
      item.selected_stock_fabric_name = chosen ? chosen.name : '';
      item.selected_stock_fabric_code = chosen?.code || '';
      item.available_stock = avail;
      item.is_in_stock = avail >= item.total_issue_meters;
      item.stock_after_issue = Number((avail - item.total_issue_meters).toFixed(2));
      copy[index] = item;
      return copy;
    });
  };

  const handleItemReturnChange = (index: number, val: string) => {
    setRequiredFabricsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], returned_meters: val };
      return copy;
    });
  };

  const handleCreateSubCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCardId) return;

    const reqSize = selectedPieceIds.length > 0 
      ? selectedPieceIds.length 
      : parseInt(batchSize, 10);

    if (isNaN(reqSize) || reqSize <= 0) {
      toast.error('Batch size must be a positive number.');
      return;
    }

    if (reqSize > selectedJobCardRemainingQty) {
      toast.error(`Cannot create batch of ${reqSize} pcs. Only ${selectedJobCardRemainingQty} pcs remaining unallocated.`);
      return;
    }

    try {
      await api.post('/job-cards/sub-card', {
        job_card_id: selectedJobCardId,
        batch_size: reqSize,
        assigned_to: assignedTo,
        selected_child_ids: selectedPieceIds.length > 0 ? selectedPieceIds : undefined
      });
      toast.success('Sub-job card batch created successfully with allocated piece barcodes!');
      setShowSubCardModal(false);
      setSelectedPieceIds([]);
      setAvailableChildCards([]);
      refreshAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create sub-card');
    }
  };

  const handleAdvanceStage = async (subCardId: number, currentStage: StageType) => {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex >= STAGES.length - 1) return;

    const nextStage = STAGES[currentIndex + 1];
    try {
      await api.put(`/job-cards/sub-card/${subCardId}/stage`, { stage: nextStage });
      toast.success(`Batch advanced to ${nextStage}!`);
      fetchSubJobCards();
      fetchJobCards();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update stage');
    }
  };

  const handleDeleteSubCard = async (subCardId: number, subCardNo: string) => {
    if (!confirm(`Are you sure you want to void / delete batch ${subCardNo}? This will return its pieces back to unallocated quantity.`)) {
      return;
    }

    try {
      await api.delete(`/job-cards/sub-card/${subCardId}`);
      toast.success(`Batch ${subCardNo} removed.`);
      refreshAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete batch');
    }
  };

  const handleIssueFabric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCardId || requiredFabricsList.length === 0) return;

    if (!approvalConfirmed) {
      toast.error('Please check the confirmation box to approve allocation and inventory stock deduction.');
      return;
    }

    const anyDepleted = requiredFabricsList.some(f => !f.is_in_stock);
    if (anyDepleted) {
      toast.error('Cannot proceed: One or more required fabrics exceed available warehouse inventory stock.');
      return;
    }

    try {
      setIsSubmittingIssue(true);
      const itemsPayload = requiredFabricsList.map(item => ({
        fabric_id: item.selected_stock_fabric_id || undefined,
        fabric_name: item.selected_stock_fabric_name || item.fabric_name || item.specified_name,
        product_name: item.product_name || selectedJobCard?.item_name || 'Garment Item',
        role: item.role,
        consumption_per_pc: item.consumption_per_pc,
        required_meters: Number(item.required_meters),
        safety_margin_meters: Number(item.safety_margin_meters),
        total_issue_meters: Number(item.total_issue_meters),
        returned_meters: parseFloat(String(item.returned_meters || '0')) || 0
      }));

      await api.post('/job-cards/fabric-consumption', {
        job_card_id: selectedJobCardId,
        approval_confirmed: true,
        items: itemsPayload
      });

      const totalDeducted = itemsPayload.reduce((acc, curr) => acc + curr.total_issue_meters, 0);
      toast.success(`Approved & Issued! ${itemsPayload.length} fabric(s) totaling ${totalDeducted.toFixed(2)}m deducted from inventory.`);
      setShowFabricModal(false);
      refreshAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fabric issue failed');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Stage statistics
  const stageCounts = STAGES.reduce((acc, stage) => {
    acc[stage] = subJobCards.filter(sc => sc.stage === stage).length;
    return acc;
  }, {} as Record<StageType, number>);

  const filteredSubCards = selectedStageFilter === 'all'
    ? subJobCards
    : subJobCards.filter(sc => sc.stage === selectedStageFilter);

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'Cutting': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Stitching': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Finishing': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'QC': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Packing': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Ready': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const anyOutOfStock = requiredFabricsList.some(f => !f.is_in_stock);
  const totalAllocatedMeters = requiredFabricsList.reduce((sum, f) => sum + (Number(f.total_issue_meters) || 0), 0);
  const totalBaseRequiredMeters = requiredFabricsList.reduce((sum, f) => sum + (Number(f.required_meters) || 0), 0);
  const totalSafetyMarginMeters = requiredFabricsList.reduce((sum, f) => sum + (Number(f.safety_margin_meters) || 0), 0);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scissors className="w-7 h-7 text-indigo-400" />
            Production Coordinator Queue & Stage Tracking
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sub-job card batching, stage progress tracking (Cutting, Stitching, QC), 10% safety margin fabric allocation, and cut-piece returns.
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center gap-2 text-sm font-semibold cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Production Stages Pipeline Overview */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Active Factory Stages Pipeline
          </h2>
          <span className="text-xs text-slate-400 font-medium">Click any stage to filter active batches</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {STAGES.map((stage, idx) => {
            const isSelected = selectedStageFilter === stage;
            const count = stageCounts[stage] || 0;
            return (
              <button
                key={stage}
                onClick={() => setSelectedStageFilter(isSelected ? 'all' : stage)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Stage {idx + 1}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {count} {count === 1 ? 'batch' : 'batches'}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900 mt-2">{stage}</span>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${count > 0 ? 'w-full bg-indigo-600' : 'w-0'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: Active Floor Batches / Sub-Job Cards Tracking */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Active Sub-Job Card Batches (Floor Progress)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking of bundles moving through Cutting, Stitching, Finishing, QC, Packing, and Ready.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Stage:
            </span>
            <select
              value={selectedStageFilter}
              onChange={e => setSelectedStageFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Stages ({subJobCards.length})</option>
              {STAGES.map(st => (
                <option key={st} value={st}>{st} ({stageCounts[st] || 0})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Batch Number</th>
                <th className="px-6 py-3">Parent Job Card</th>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Batch Size</th>
                <th className="px-6 py-3">Current Stage</th>
                <th className="px-6 py-3">Floor / Line</th>
                <th className="px-6 py-3 text-right">Stage Progression & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSubCards.map(sc => {
                const isReady = sc.stage === 'Ready';
                const isCutting = sc.stage === 'Cutting';
                const nextStageIndex = STAGES.indexOf(sc.stage) + 1;
                const nextStage = nextStageIndex < STAGES.length ? STAGES[nextStageIndex] : null;

                return (
                  <tr key={sc.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      {sc.sub_card_no}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 font-semibold">
                      {sc.job_cards?.job_card_no || '—'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {sc.job_cards?.item_name || 'Garment Item'}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <div className="font-bold text-slate-900">{formatQuantity(sc.batch_size, 'pcs')}</div>
                      {sc.size_distribution && Object.keys(sc.size_distribution).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(sc.size_distribution).map(([sz, count]) => (
                            <span key={sz} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {sz}: {String(count)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStageBadgeColor(sc.stage)}`}>
                        {sc.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      {sc.assigned_to || 'Floor A'}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      {isReady ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready for DC Dispatch
                        </span>
                      ) : nextStage ? (
                        <button
                          onClick={() => handleAdvanceStage(sc.id, sc.stage)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          Advance to {nextStage}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : null}

                      {/* Void / Delete batch allowed while still in Cutting stage */}
                      {isCutting && (
                        <button
                          onClick={() => handleDeleteSubCard(sc.id, sc.sub_card_no)}
                          title="Void / Delete batch (returns pieces back to unallocated quantity)"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredSubCards.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Clock className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="font-semibold text-slate-600">No active batches in this stage.</p>
                      <p className="text-xs text-slate-400">
                        Create a sub-job card batch from the Job Cards table below to initiate floor production.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Job Cards Queue (Accepted & In Production) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Shirt className="w-5 h-5 text-indigo-600" />
              Factory Job Cards Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Approved job cards available for sub-batch creation and 10% safety margin fabric allocation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Filter:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
              <button
                onClick={() => setJobCardStatusFilter('all')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${jobCardStatusFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All Active ({jobCards.length})
              </button>
              <button
                onClick={() => setJobCardStatusFilter('Accepted')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${jobCardStatusFilter === 'Accepted' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Accepted (Waiting)
              </button>
              <button
                onClick={() => setJobCardStatusFilter('In Production')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${jobCardStatusFilter === 'In Production' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                In Production (Batched)
              </button>
              <button
                onClick={() => setJobCardStatusFilter('Ready')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${jobCardStatusFilter === 'Ready' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Ready (Completed)
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Job Card</th>
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Allocation &amp; Total Qty</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Fabric Allocation (+10%)</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {jobCards.map(jc => {
                const allocatedQty = subJobCards
                  .filter(sc => sc.job_card_id === jc.id)
                  .reduce((sum, sc) => sum + sc.batch_size, 0);
                const remainingQty = Math.max(0, jc.quantity - allocatedQty);
                const isFullyBatched = allocatedQty >= jc.quantity;
                const isFabricIssued = Boolean(jc.is_fabric_issued || (jc.fabric_consumption_logs && jc.fabric_consumption_logs.length > 0));
                const issuedMeters = jc.fabric_issued_meters || jc.fabric_consumption_logs?.[0]?.issued_meters || 0;

                return (
                  <tr key={jc.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">{jc.job_card_no}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{jc.item_name}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{formatQuantity(jc.quantity, 'pcs')}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-1.5 font-mono">
                        <span className={isFullyBatched ? 'text-emerald-600 font-bold' : 'text-indigo-600 font-medium'}>
                          {allocatedQty}/{jc.quantity} batched
                        </span>
                        {remainingQty > 0 ? (
                          <span className="text-amber-600 font-bold">({remainingQty} pcs left)</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">(100% Allocated)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={jc.status} />
                    </td>
                    <td className="px-6 py-4">
                      {isFabricIssued ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Issued: {parseFloat(String(issuedMeters)).toFixed(2)}m
                          </span>
                          <div className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]" title={jc.fabric_issue_details?.fabric_name || jc.fabric_consumption_logs?.[0]?.fabric_name || 'Production Roll'}>
                            {jc.fabric_issue_details?.fabric_name || jc.fabric_consumption_logs?.[0]?.fabric_name || 'Production Roll'}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Pending Floor Issue
                          </span>
                          <div className="text-[11px] text-slate-400 font-medium">10% Safety Buffer Enforced</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                      {isFullyBatched ? (
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-default">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Fully Batched
                        </span>
                      ) : (
                        <button
                          onClick={() => openSubCardModal(jc)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Sub-Card Batch
                        </button>
                      )}

                      {isFabricIssued ? (
                        <span
                          title={`Fabric has already been issued (${parseFloat(String(issuedMeters)).toFixed(2)}m). Re-issuing is locked to prevent duplicate stock deduction.`}
                          className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-default"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Fabric Issued
                        </span>
                      ) : (
                        <button
                          onClick={() => openFabricModalForCard(jc)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" /> Issue Fabric
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {jobCards.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No active job cards matching the selected status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-Card Modal with Strict Batch Limit */}
      {showSubCardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Create Sub-Job Card Batch</h3>
              <p className="text-xs text-slate-500 mt-1">
                Parent Job Card: <span className="font-mono font-bold text-indigo-600">{selectedJobCardNo}</span>
              </p>
            </div>

            {/* Allocation Summary Card */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1.5 text-indigo-950 font-medium">
              <div className="flex justify-between">
                <span>Total Target Quantity:</span>
                <span className="font-bold">{selectedJobCardTotalQty} pcs</span>
              </div>
              <div className="flex justify-between">
                <span>Already Allocated:</span>
                <span className="font-bold text-slate-700">{selectedJobCardTotalQty - selectedJobCardRemainingQty} pcs</span>
              </div>
              <div className="flex justify-between border-t border-indigo-200 pt-1 text-sm font-bold text-indigo-900">
                <span>Remaining Available to Batch:</span>
                <span className="text-emerald-700">{selectedJobCardRemainingQty} pcs</span>
              </div>
            </div>

            {/* Multi-size available pieces preview */}
            {availableChildCards.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Available Unbatched Pieces by Size / Entity:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(
                    availableChildCards.reduce((acc: Record<string, number>, p: any) => {
                      const label = p.size || p.member_name || 'Standard';
                      acc[label] = (acc[label] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([sz, count]) => (
                    <span key={sz} className="text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-bold shadow-xs">
                      {sz}: <span className="text-indigo-600">{count} pcs</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSubCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Batch Size (pieces to bundle)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedJobCardRemainingQty}
                  required
                  value={batchSize}
                  onChange={e => setBatchSize(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter up to <strong className="text-slate-700">{selectedJobCardRemainingQty} pcs</strong> across available sizes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Floor / Sewing Line</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Line 1 / Cutting Floor"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubCardModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedJobCardRemainingQty <= 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md transition cursor-pointer"
                >
                  Create Batch Breakdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fabric Issue & Approval Modal */}
      {showFabricModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/70">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  Issue Fabric & Approve Warehouse Inventory Allocation
                </h3>
                <p className="text-xs text-slate-500">
                  Job Card: <span className="font-mono font-bold text-indigo-600">{selectedJobCard?.job_card_no}</span>
                  {' • '}
                  Garment: <span className="font-semibold text-slate-800">{selectedJobCard?.item_name}</span>
                  {' • '}
                  Target Qty: <span className="font-bold text-slate-900">{selectedJobCard?.quantity} pcs</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFabricModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {loadingRequiredFabrics ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    Resolving garment BOM and locating warehouse inventory rolls...
                  </p>
                  <p className="text-xs text-slate-400">
                    Automatically checking stock availability for Main & Attachment fabrics
                  </p>
                </div>
              ) : (
                <form id="fabric-issue-form" onSubmit={handleIssueFabric} className="space-y-4">
                  {/* Informative Guidance Banner */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-medium flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-indigo-900">Automatic BOM Discovery:</span> All fabrics required for this job across all garments ({requiredFabricsList.length} fabric item{requiredFabricsList.length === 1 ? '' : 's'}) have been automatically resolved from the BOM and allocated from warehouse inventory stock. A mandatory <span className="font-bold text-indigo-900">+10% safety margin</span> buffer is applied.
                    </div>
                  </div>

                  {/* Required Fabrics Breakdown Cards */}
                  <div className="space-y-3">
                    {requiredFabricsList.map((item: any, idx: number) => {
                      const isEditingThisRoll = editingRollIndex === idx;
                      const roleBadgeClass = item.role?.includes('Main')
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        : item.role?.includes('Attachment 1')
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-purple-100 text-purple-800 border-purple-300';

                      return (
                        <div
                          key={item.fabric_key || idx}
                          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3"
                        >
                          {/* Top Header: Garment Product & Fabric Role */}
                          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.product_name && (
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  Garment: {item.product_name}
                                </span>
                              )}
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${roleBadgeClass}`}>
                                {item.role}
                              </span>
                            </div>

                            {/* Stock Status Badge */}
                            {item.is_in_stock ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                In Stock ({Number(item.available_stock || 0).toFixed(2)}m available)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                Low Stock ({Number(item.available_stock || 0).toFixed(2)}m available)
                              </span>
                            )}
                          </div>

                          {/* Pre-Allocated Warehouse Fabric Roll (Listed directly, not a dropdown) */}
                          <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Allocated Warehouse Fabric Roll:
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  {item.selected_stock_fabric_name || item.fabric_name || 'Production Roll'}
                                </span>
                                {(item.selected_stock_fabric_code || item.fabric_code) && (
                                  <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-white border text-slate-600">
                                    Code: {item.selected_stock_fabric_code || item.fabric_code}
                                  </span>
                                )}
                                {item.shade && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    • Shade: {item.shade}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  Auto-Selected
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingRollIndex(isEditingThisRoll ? null : idx)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline self-start sm:self-center cursor-pointer"
                            >
                              {isEditingThisRoll ? 'Done' : 'Switch roll'}
                            </button>
                          </div>

                          {/* Roll Selector (Only visible if user clicks 'Switch roll') */}
                          {isEditingThisRoll && (
                            <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-1 animate-in fade-in duration-200">
                              <label className="block text-[11px] font-bold text-indigo-950">
                                Select Alternate Warehouse Roll:
                              </label>
                              <select
                                value={item.selected_stock_fabric_id || ''}
                                onChange={e => handleItemRollChange(idx, e.target.value)}
                                className="w-full px-3 py-1.5 border border-indigo-300 rounded-lg text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              >
                                {stockFabrics.map(sf => (
                                  <option key={sf.id} value={sf.id}>
                                    {sf.name} {sf.code ? `(${sf.code})` : ''} — {sf.quantity || 0}m available {sf.shade ? `| Shade: ${sf.shade}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Metric Calculations Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unit Consumption</span>
                              <span className="font-bold text-slate-800">{Number(item.consumption_per_pc || 0).toFixed(2)} m/pc</span>
                            </div>
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Order Base Required</span>
                              <span className="font-bold text-slate-800">{Number(item.required_meters || 0).toFixed(2)} m</span>
                            </div>
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Safety Buffer (+10%)</span>
                              <span className="font-bold text-indigo-600">+{Number(item.safety_margin_meters || 0).toFixed(2)} m</span>
                            </div>
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <span className="text-emerald-700 block text-[10px] uppercase font-bold">Total Floor Allocation</span>
                              <span className="font-bold text-emerald-900">{Number(item.total_issue_meters || 0).toFixed(2)} m</span>
                            </div>
                          </div>

                          {/* Stock Balance Impact */}
                          <div className="flex flex-wrap items-center justify-between text-xs pt-1 px-1">
                            <div className="text-slate-600">
                              Warehouse Stock Impact: <span className="font-semibold text-slate-800">{Number(item.available_stock || 0).toFixed(2)}m</span>
                              {' → '}
                              <span className={`font-bold ${Number(item.stock_after_issue || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {Number(item.stock_after_issue || 0).toFixed(2)}m remaining after issue
                              </span>
                            </div>

                            {/* Off-cut Cut Piece Return Input */}
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] text-slate-500 font-medium">Cut-piece return:</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={item.returned_meters ?? '0'}
                                onChange={e => handleItemReturnChange(idx, e.target.value)}
                                className="w-20 px-2 py-0.5 border rounded-md text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-[11px] text-slate-400">m</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Totals Box */}
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Total Required Fabrics to Issue:</span>
                      <span className="font-bold text-white">{requiredFabricsList.length} fabric items</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Base Net Requirements:</span>
                      <span className="font-mono text-white">{totalBaseRequiredMeters.toFixed(2)} meters</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Total 10% Safety Buffer:</span>
                      <span className="font-mono text-indigo-300">+{totalSafetyMarginMeters.toFixed(2)} meters</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-sm font-bold">
                      <span className="text-emerald-400">Total Warehouse Stock to Deduct:</span>
                      <span className="font-mono text-emerald-400">{totalAllocatedMeters.toFixed(2)} meters</span>
                    </div>
                  </div>

                  {/* Insufficient Stock Warning */}
                  {anyOutOfStock && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Insufficient Warehouse Stock:</span> One or more required fabrics listed above exceed available roll balances. Please choose an alternate roll or replenish warehouse inventory prior to approval.
                      </div>
                    </div>
                  )}

                  {/* Explicit Approval Gate */}
                  <div className="p-4 bg-emerald-50/60 border-2 border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Approval Gate & Inventory Reduction Confirmation
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Submitting fabric issue will permanently log consumption records, deduct <strong className="font-bold">{totalAllocatedMeters.toFixed(2)}m</strong> from active inventory stock, and mark this Job Card ready for the cutting floor.
                    </p>
                    <label className="flex items-start gap-2.5 mt-2 bg-white p-3 rounded-lg border border-emerald-300 hover:border-emerald-400 transition cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={approvalConfirmed}
                        onChange={e => setApprovalConfirmed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900 leading-snug">
                        I approve the issuance of all {requiredFabricsList.length} fabric(s) listed above and authorize the immediate deduction of {totalAllocatedMeters.toFixed(2)} meters from warehouse inventory stock.
                      </span>
                    </label>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFabricModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl text-sm font-medium cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="fabric-issue-form"
                disabled={loadingRequiredFabrics || !approvalConfirmed || anyOutOfStock || isSubmittingIssue || requiredFabricsList.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingIssue ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deducting Stock...
                  </>
                ) : anyOutOfStock ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Insufficient Warehouse Stock
                  </>
                ) : !approvalConfirmed ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Awaiting Approval Confirmation
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Deduct from Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
