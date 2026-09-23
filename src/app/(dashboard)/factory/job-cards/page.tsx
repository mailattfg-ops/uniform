'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { FileText, Check, X, Pause, Printer, Plus, AlertCircle, RefreshCw, ChevronDown, Package2, Layers, Tag, QrCode, Search, User, Users, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

import { compileJobCardHTML, compileGarmentStickersHTML, compilePersonWiseTravelerSheetsHTML, type JobCardPrintData, type ChildJobCardData } from '@/lib/compileJobCardHTML';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface QuotationItem {
  id: number;
  product_type_name?: string;
  product_types?: { name: string };
  design_number?: string;
  art_number?: string;
  quantity: number;
  size_breakdown?: any;
  unit_price?: number;
}

interface EligibleOrder {
  id: number;
  order_no: string;
  status: string;
  quotations?: {
    quotation_no: string;
    title: string;
    organizations?: { name: string };
    quotation_items: QuotationItem[];
  };
}

interface JobCard extends JobCardPrintData {
  po_handler_reason?: string;
}

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);

  // PO action modal
  const [selectedCard, setSelectedCard] = useState<JobCard | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'Accept' | 'Reject' | 'Hold'>('Accept');
  const [reason, setReason] = useState('');

  // Raise modal
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<EligibleOrder | null>(null);
  const [isRaising, setIsRaising] = useState(false);

  const fetchJobCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/job-cards');
      setJobCards(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch job cards');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEligibleOrders = useCallback(async () => {
    try {
      const res = await api.get('/job-cards/eligible-orders');
      setEligibleOrders(res.data || []);
    } catch {
      // Non-critical — admin-only action
    }
  }, []);

  useEffect(() => {
    fetchJobCards();
    fetchEligibleOrders();
  }, [fetchJobCards, fetchEligibleOrders]);

  // Update selected order details when dropdown changes
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = eligibleOrders.find(o => String(o.id) === orderId) || null;
    setSelectedOrder(order);
  };

  // Raise one job card per quotation item
  const handleRaiseJobCards = async () => {
    if (!selectedOrder?.quotations?.quotation_items?.length) {
      toast.error('No items found for this order.');
      return;
    }
    setIsRaising(true);
    const items = selectedOrder.quotations.quotation_items;
    let raised = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await api.post('/job-cards/raise', {
          order_id: selectedOrder.id,
          item_id: item.id,
          item_name: item.product_types?.name || `Item #${item.id}`,
          design_number: item.size_breakdown?.design_number || item.design_number || '',
          art_number: item.size_breakdown?.art_number || item.art_number || '',
          quantity: item.quantity,
          size_breakdown: item.size_breakdown || {}
        });
        raised++;
      } catch {
        failed++;
      }
    }

    setIsRaising(false);
    setShowRaiseModal(false);
    setSelectedOrderId('');
    setSelectedOrder(null);

    if (raised > 0) toast.success(`${raised} Job Card${raised > 1 ? 's' : ''} raised successfully!`);
    if (failed > 0) toast.error(`${failed} item(s) failed — they may already have a job card.`);
    fetchJobCards();
    fetchEligibleOrders();
  };

  // PO Handler action
  const handlePOAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    try {
      await api.put(`/job-cards/${selectedCard.id}/po-handler-action`, { action: actionType, reason });
      toast.success(`Job Card marked as ${actionType}`);
      setShowActionModal(false);
      setReason('');
      fetchJobCards();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  // Print preview modal
  const [printCard, setPrintCard] = useState<JobCard | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Print view mode toggle (Work Traveler vs Lot Summary)
  const [printViewMode, setPrintViewMode] = useState<'traveler' | 'lot'>('traveler');

  // Print a single job card
  const handlePrint = async (jc: JobCard) => {
    const isAccepted = jc.status === 'Accepted' || jc.status === 'In Production' || jc.po_handler_action === 'Accept';
    if (!isAccepted) {
      if (jc.status?.includes('Reject') || jc.po_handler_action === 'Reject') {
        toast.error('Cannot print Job Card: Card has been rejected.');
        return;
      }
      if (jc.status?.includes('Held') || jc.po_handler_action === 'Hold') {
        toast.error('Cannot print Job Card: Release to cutting is blocked (HELD).');
        return;
      }
      toast.error('Cannot print Job Card: Card must be accepted by PO Handler first.');
      return;
    }

    try {
      const res = await api.get(`/job-cards/${jc.id}/child-cards`);
      const pieces = res.data || [];
      setPrintCard({ ...jc, child_pieces: pieces });
      setChildPieces(pieces);
      const isBespoke =
        pieces.some((p: any) => p.item_type === 'custom' || Boolean(p.member_name)) ||
        Boolean(jc.size_breakdown?.is_custom);
      setPrintViewMode('lot');
    } catch {
      setPrintCard(jc);
      setPrintViewMode('lot');
    }
    setShowPrintModal(true);
  };

  const executePrint = () => {
    const iframe = document.getElementById('jc-print-frame') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  // Pieces modal states
  const [piecesCard, setPiecesCard] = useState<JobCard | null>(null);
  const [showPiecesModal, setShowPiecesModal] = useState(false);
  const [childPieces, setChildPieces] = useState<ChildJobCardData[]>([]);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [pieceSearch, setPieceSearch] = useState('');

  // Sticker print modal
  const [showStickerModal, setShowStickerModal] = useState(false);

  const handleOpenPieces = async (jc: JobCard) => {
    setPiecesCard(jc);
    setShowPiecesModal(true);
    setLoadingPieces(true);
    setPieceSearch('');
    try {
      const res = await api.get(`/job-cards/${jc.id}/child-cards`);
      let pieces = res.data || [];
      if (pieces.length === 0) {
        const genRes = await api.post(`/job-cards/${jc.id}/generate-child-cards`);
        pieces = genRes.data.pieces || [];
      }
      setChildPieces(pieces);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load piece barcodes');
    } finally {
      setLoadingPieces(false);
    }
  };

  const handleRegeneratePieces = async () => {
    if (!piecesCard) return;
    setLoadingPieces(true);
    try {
      const genRes = await api.post(`/job-cards/${piecesCard.id}/generate-child-cards`);
      const pieces = genRes.data.pieces || [];
      setChildPieces(pieces);
      toast.success(`${pieces.length} piece barcodes regenerated successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate piece barcodes');
    } finally {
      setLoadingPieces(false);
    }
  };

  const handlePrintStickers = (jc: JobCard, pieces?: ChildJobCardData[]) => {
    const isAccepted = jc.status === 'Accepted' || jc.status === 'In Production' || jc.po_handler_action === 'Accept';
    if (!isAccepted) {
      toast.error('Cannot print stickers: Job Card must be accepted by PO Handler first.');
      return;
    }
    setPrintCard(jc);
    if (pieces && pieces.length > 0) {
      setChildPieces(pieces);
    }
    setShowStickerModal(true);
  };

  const executeStickerPrint = () => {
    const iframe = document.getElementById('stickers-print-frame') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  // Person-wise traveler sheets modal state & handlers
  const [showPersonTravelerModal, setShowPersonTravelerModal] = useState(false);

  const handlePrintPersonSheets = async (jc: JobCard, pieces?: ChildJobCardData[]) => {
    const isAccepted = jc.status === 'Accepted' || jc.status === 'In Production' || jc.po_handler_action === 'Accept';
    if (!isAccepted) {
      toast.error('Cannot print traveler sheets: Job Card must be accepted by PO Handler first.');
      return;
    }
    setPrintCard(jc);
    if (pieces && pieces.length > 0) {
      setChildPieces(pieces);
    } else {
      try {
        const res = await api.get(`/job-cards/${jc.id}/child-cards`);
        setChildPieces(res.data || []);
      } catch {
        // fallback to empty
      }
    }
    setShowPersonTravelerModal(true);
  };

  const executePersonTravelerPrint = () => {
    const iframe = document.getElementById('person-traveler-print-frame') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const items = selectedOrder?.quotations?.quotation_items || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3">
            <FileText className="w-7 h-7 text-amber-400" />
            Factory Job Cards
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1.5">
            Factory Job Cards — per-item production cards raised from confirmed Sales Orders.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchJobCards}
            className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { fetchEligibleOrders(); setShowRaiseModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            Raise Job Cards
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {jobCards.map(jc => (
          <div key={jc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition overflow-hidden">
            {/* On-screen card content */}
            <div className="p-5 space-y-4 jc-no-print" id={`jc-screen-${jc.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-[11px] font-bold text-slate-400">{jc.job_card_no}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-tight">{jc.item_name}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {(jc.art_number || jc.size_breakdown?.art_number || (jc.design_number && jc.design_number.includes(' - ') ? jc.design_number.split(' - ')[0] : null)) && (
                      <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200/60 px-2 py-0.5 rounded-md font-mono font-bold">
                        Art: {jc.art_number || jc.size_breakdown?.art_number || (jc.design_number && jc.design_number.includes(' - ') ? jc.design_number.split(' - ')[0] : '—')}
                      </span>
                    )}
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-md font-mono font-bold">
                      DNS: {jc.clean_design_number || (jc.design_number && jc.design_number.startsWith('DNS-') ? jc.design_number : (jc.size_breakdown?.design_number && jc.size_breakdown.design_number.startsWith('DNS-') ? jc.size_breakdown.design_number : 'DNS-STANDARD'))}
                    </span>
                  </div>
                </div>
                <StatusBadge status={jc.status} size="sm" />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600 border border-slate-100">
                <p><span className="font-semibold text-slate-700">Order:</span> {jc.orders?.order_no || `ORD-#${jc.order_id}`}</p>
                <p><span className="font-semibold text-slate-700">Qty:</span> {jc.quantity} pcs</p>
                <p><span className="font-semibold text-slate-700">PO Status:</span> {jc.po_handler_action}</p>
                {((jc.button || jc.size_breakdown?.button_name) || (jc.thread || jc.size_breakdown?.thread_name)) && (
                  <p className="text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                    <span className="font-semibold text-slate-700">Trims:</span> {jc.button?.name || jc.size_breakdown?.button_name || 'Buttons'} {jc.button?.count || jc.size_breakdown?.button_count ? `(${jc.button?.count || jc.size_breakdown?.button_count} pcs)` : ''} • {jc.thread?.name || jc.size_breakdown?.thread_name || 'Thread'}
                  </p>
                )}
                {jc.measurement_readiness && jc.measurement_readiness !== 'Ready' && (
                  <p className="text-amber-700 font-medium">⚠ {jc.measurement_readiness}</p>
                )}
                {(jc.hold_reason || jc.po_handler_reason) && (
                  <p className="text-rose-600"><span className="font-semibold">Reason:</span> {jc.hold_reason || jc.po_handler_reason}</p>
                )}
              </div>

              {/* Barcode preview strip & Print Authorization Guard */}
              <div className="p-2.5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-500">*{jc.job_card_no}*</span>
                {jc.status === 'Accepted' || jc.status === 'In Production' || jc.po_handler_action === 'Accept' ? (
                  <button
                    onClick={() => handlePrint(jc)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition hover:underline"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Job Card
                  </button>
                ) : (jc.status?.includes('Reject') || jc.po_handler_action === 'Reject') ? (
                  <span className="text-[10.5px] text-rose-600 font-semibold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    <X className="w-3.5 h-3.5 text-rose-500" /> Print Blocked (Rejected)
                  </span>
                ) : (jc.status?.includes('Held') || jc.po_handler_action === 'Hold') ? (
                  <span
                    title={jc.hold_reason || 'Release to cutting is blocked until measurements and fabric are ready.'}
                    className="text-[10.5px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 cursor-help"
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-600" /> Print Blocked (Held)
                  </span>
                ) : (
                  <span className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Pause className="w-3.5 h-3.5 text-slate-400" /> Awaiting PO Accept
                  </span>
                )}
              </div>

              {/* Piece Barcodes & Stickers Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenPieces(jc)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Pieces &amp; Barcodes ({jc.quantity})</span>
                </button>

                {(jc.status === 'Accepted' || jc.status === 'In Production' || jc.po_handler_action === 'Accept') && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePrintPersonSheets(jc)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                      title="Print individual work traveler sheets per person"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Person Sheets</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoadingPieces(true);
                        try {
                          let res = await api.get(`/job-cards/${jc.id}/child-cards`);
                          let pieces = res.data || [];
                          if (pieces.length === 0) {
                            const gen = await api.post(`/job-cards/${jc.id}/generate-child-cards`);
                            pieces = gen.data.pieces || [];
                          }
                          handlePrintStickers(jc, pieces);
                        } catch {
                          toast.error('Failed to prepare stickers');
                        } finally {
                          setLoadingPieces(false);
                        }
                      }}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Stickers</span>
                    </button>
                  </div>
                )}
              </div>

              {/* PO Handler action buttons */}
              {jc.po_handler_action === 'Pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedCard(jc); setActionType('Accept'); setShowActionModal(true); }}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => { setSelectedCard(jc); setActionType('Hold'); setShowActionModal(true); }}
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Pause className="w-3.5 h-3.5" /> Hold
                  </button>
                  <button
                    onClick={() => { setSelectedCard(jc); setActionType('Reject'); setShowActionModal(true); }}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {jobCards.length === 0 && !loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No Job Cards Raised Yet</h3>
          <p className="text-slate-400 text-sm">Select a confirmed Sales Order and raise job cards for all its items.</p>
        </div>
      )}

      {/* ── Raise Job Cards Modal ───────────────────────────────────── */}
      {showRaiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRaiseModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6">
            <button onClick={() => setShowRaiseModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Layers className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Raise Job Cards</h3>
                <p className="text-xs text-slate-500 mt-0.5">One Job Card is created per item in the selected Sales Order.</p>
              </div>
            </div>

            {/* Order Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Select Confirmed Sales Order</label>
              <div className="relative">
                <select
                  value={selectedOrderId}
                  onChange={e => handleOrderSelect(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 transition pr-8"
                >
                  <option value="">— Select a Sales Order —</option>
                  {eligibleOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.order_no} — {o.quotations?.organizations?.name || o.quotations?.title || 'Client'} ({o.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {eligibleOrders.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5 font-medium">No confirmed orders with items found. Orders must be in "In Production", "Accepted", or "Approved" status.</p>
              )}
            </div>

            {/* Items Preview */}
            {selectedOrder && items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {items.length} Job Card{items.length > 1 ? 's' : ''} will be raised:
                </p>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] flex-shrink-0">{idx + 1}</span>
                        <div>
                          <p className="font-bold text-slate-800">{item.product_types?.name || `Item #${item.id}`}</p>
                          <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono mt-0.5">
                            {(item.size_breakdown?.art_number || item.art_number) && (
                              <span className="text-sky-600 font-semibold">Art: {item.size_breakdown?.art_number || item.art_number}</span>
                            )}
                            {item.size_breakdown?.design_number && (
                              <span className="text-indigo-600 font-semibold">DNS: {item.size_breakdown.design_number}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-slate-600 flex-shrink-0">{item.quantity} pcs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedOrder && items.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                This order has no line items in its quotation. Check the quotation items.
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowRaiseModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition">
                Cancel
              </button>
              <button
                onClick={handleRaiseJobCards}
                disabled={!selectedOrder || items.length === 0 || isRaising}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
              >
                <Package2 className="w-3.5 h-3.5" />
                {isRaising ? 'Raising...' : `Raise ${items.length} Job Card${items.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PO Handler Action Modal ─────────────────────────────────── */}
      {showActionModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowActionModal(false)} />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-5">
            <h3 className="text-base font-black text-slate-900">PO Handler: {actionType}</h3>
            <p className="text-xs text-slate-500">
              Updating <span className="font-mono font-bold text-indigo-600">{selectedCard.job_card_no}</span> — {selectedCard.item_name}
            </p>
            <form onSubmit={handlePOAction} className="space-y-4">
              {(actionType === 'Reject' || actionType === 'Hold') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Reason *</label>
                  <textarea
                    required
                    placeholder={`Reason for ${actionType}...`}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 transition"
                    rows={3}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowActionModal(false); setReason(''); }} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition">
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition ${
                    actionType === 'Accept' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    actionType === 'Hold' ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' :
                    'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirm {actionType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRD M9.5 Compliant Job Card Print & PDF Modal ─────────────────────────────────── */}
      {showPrintModal && printCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPrintModal(false)} />
          <div className="relative bg-white rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden z-10">
            {/* Modal Header */}
            <div className="p-4 md:px-6 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-900 text-white gap-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-400" />
                  {printViewMode === 'lot' ? 'Factory Production Job Card (Master Lot)' : 'Individual Garment Work Traveler Sheets'}
                </h3>
                <p className="text-xs text-slate-400">
                  {printCard.job_card_no} — {printCard.item_name} ({printCard.quantity} pcs)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPrintViewMode('lot')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      printViewMode === 'lot' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Main Job Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintViewMode('traveler')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      printViewMode === 'traveler' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Person Traveler Sheets</span>
                  </button>
                </div>

                <button
                  onClick={executePrint}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded Print Frame */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex justify-center">
              <iframe
                id="jc-print-frame"
                srcDoc={
                  printViewMode === 'traveler'
                    ? compilePersonWiseTravelerSheetsHTML(printCard.child_pieces || childPieces, printCard)
                    : compileJobCardHTML(printCard)
                }
                className="w-full max-w-[840px] h-full bg-white rounded-xl shadow-md border border-slate-200"
                title="Job Card Print Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Piece-Level Child Job Cards & Barcodes Modal ────────────────────────────── */}
      {showPiecesModal && piecesCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPiecesModal(false)} />
          <div className="relative bg-white rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden z-10">
            {/* Header */}
            <div className="p-5 md:px-7 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-900 text-white gap-3">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  Piece-Level Child Job Cards &amp; Barcodes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {piecesCard.job_card_no} — {piecesCard.item_name} ({piecesCard.quantity} total pieces)
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handlePrintPersonSheets(piecesCard, childPieces)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                  title="Print 1 traveler sheet per person with dual barcodes and measurements"
                >
                  <Users className="w-4 h-4" />
                  <span>Print Person Sheets</span>
                </button>
                <button
                  onClick={() => handlePrintStickers(piecesCard, childPieces)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Print Garment Stickers</span>
                </button>
                <button
                  onClick={handleRegeneratePieces}
                  title="Force re-generation of barcodes from current order specs"
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPieces ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
                <button
                  onClick={() => setShowPiecesModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter and stats banner */}
            <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by barcode, size, or member..."
                    value={pieceSearch}
                    onChange={(e) => setPieceSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 transition"
                  />
                </div>
                {pieceSearch && (
                  <button onClick={() => setPieceSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                  Total: {childPieces.length} pcs
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                  Batched: {childPieces.filter((p) => p.sub_job_cards).length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-100">
                  Unbatched: {childPieces.filter((p) => !p.sub_job_cards).length}
                </span>
              </div>
            </div>

            {/* Pieces Table */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
              {loadingPieces ? (
                <div className="text-center py-20">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Loading piece barcodes...</p>
                </div>
              ) : childPieces.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Tag className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No Child Job Cards provisioned yet.</p>
                  <button
                    onClick={handleRegeneratePieces}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                  >
                    Generate Piece Barcodes
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3.5 pl-4"># Piece</th>
                        <th className="p-3.5">Piece Barcode</th>
                        <th className="p-3.5">Sizing / Recipient</th>
                        <th className="p-3.5">Fabric Specs (Main &amp; Attachments)</th>
                        <th className="p-3.5">Assigned Batch</th>
                        <th className="p-3.5">Floor Stage</th>
                        <th className="p-3.5 pr-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium">
                      {childPieces
                        .filter((p) => {
                          if (!pieceSearch) return true;
                          const q = pieceSearch.toLowerCase();
                          return (
                            p.barcode.toLowerCase().includes(q) ||
                            (p.size && p.size.toLowerCase().includes(q)) ||
                            (p.member_name && p.member_name.toLowerCase().includes(q)) ||
                            (p.admission_no && p.admission_no.toLowerCase().includes(q)) ||
                            (p.fabric_name && p.fabric_name.toLowerCase().includes(q)) ||
                            (p.fabric_code && p.fabric_code.toLowerCase().includes(q)) ||
                            (p.attachment1_name && p.attachment1_name.toLowerCase().includes(q)) ||
                            (p.attachment1_code && p.attachment1_code.toLowerCase().includes(q))
                          );
                        })
                        .map((piece, idx) => {
                          const isCustom = piece.item_type === 'custom';
                          return (
                            <tr key={piece.id || idx} className="hover:bg-slate-50/80 transition">
                              <td className="p-3.5 pl-4 font-mono font-bold text-slate-400">
                                #{String(piece.sequence_no || idx + 1).padStart(3, '0')}
                              </td>
                              <td className="p-3.5">
                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                  {piece.barcode}
                                </span>
                              </td>
                              <td className="p-3.5">
                                {isCustom ? (
                                  <div>
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <User className="w-3 h-3 text-amber-500" />
                                      <span>{piece.member_name || 'Bespoke Entity'}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-mono text-amber-700 font-semibold">
                                        {piece.admission_no || 'Custom'}
                                      </span>
                                      {(() => {
                                        const selSize = piece.custom_measurements?.selected_size;
                                        const assignedDims = piece.custom_measurements?.assigned_dimensions || {};
                                        const standardChartSpecs: Record<string, Record<string, string>> = {
                                          'chest (to fit)': { 'xs': '32-34 in', 's': '35-37 in', 'm': '38-40 in', 'l': '41-43 in', 'xl': '44-46 in', 'xxl': '47-49 in' },
                                          'body length': { 'short': '26-27 in', 'standard': '28-29 in', 'long': '30-31 in' },
                                          'waist (to fit)': { 'xs': '71–76 cm', 's': '76–81 cm', 'm': '81–86 cm', 'l': '86–91 cm', 'xl': '91–96 cm', 'xxl': '96–101 cm' },
                                          'leg length': { 'short': '74–76 cm', 'standard': '79–81 cm', 'long': '84–86 cm', 'extra long': '89–91 cm' }
                                        };
                                        if (selSize && typeof selSize === 'object') {
                                          const parts = Object.entries(selSize).map(([k, v]) => {
                                            const kLower = k.toLowerCase().trim();
                                            const vLower = String(v).toLowerCase().trim();
                                            const assigned = assignedDims[k] || standardChartSpecs[kLower]?.[vLower];
                                            return assigned ? `${v} (${assigned})` : String(v);
                                          });
                                          return (
                                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                                              US: {parts.join(' • ')}
                                            </span>
                                          );
                                        } else if (piece.size && piece.size !== 'Custom') {
                                          return (
                                            <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                              {piece.size}
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                ) : (
                                  (() => {
                                    const sStr = piece.size || 'M';
                                    const sLower = sStr.toLowerCase().trim();
                                    const standardChartSpecs: Record<string, Record<string, string>> = {
                                      'chest (to fit)': { 'xs': '32-34 in', 's': '35-37 in', 'm': '38-40 in', 'l': '41-43 in', 'xl': '44-46 in', 'xxl': '47-49 in' },
                                      'waist (to fit)': { 'xs': '71–76 cm', 's': '76–81 cm', 'm': '81–86 cm', 'l': '86–91 cm', 'xl': '91–96 cm', 'xxl': '96–101 cm' }
                                    };
                                    const itemNameLower = (piecesCard?.item_name || '').toLowerCase();
                                    const isTop = ['shirt', 't-shirt', 'tshirt', 'polo', 'top', 'blazer'].some(k => itemNameLower.includes(k));
                                    const isBottom = ['pant', 'pants', 'trouser', 'trousers', 'bottom', 'short'].some(k => itemNameLower.includes(k));
                                    const dim = isTop ? standardChartSpecs['chest (to fit)']?.[sLower] : isBottom ? standardChartSpecs['waist (to fit)']?.[sLower] : null;
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2.5 py-0.5 rounded-md font-black bg-slate-900 text-white text-[11px]">
                                          {sStr}{dim ? ` (${dim})` : ''}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">US Standard</span>
                                      </div>
                                    );
                                  })()
                                )}
                              </td>
                              <td className="p-3.5">
                                <div className="flex flex-col gap-1 min-w-[220px]">
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-extrabold text-[8.5px] uppercase tracking-wide shrink-0">
                                      Main
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 rounded text-[10px] shrink-0">
                                      {piece.fabric_code || '--'}
                                    </span>
                                    <span className="truncate text-slate-700 font-medium max-w-[120px]" title={piece.fabric_name || ''}>
                                      {piece.fabric_name || 'Standard Fabric'}
                                    </span>
                                    <span className="ml-auto font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded text-[10px] whitespace-nowrap">
                                      {parseFloat(String(piece.fabric_length || piece.fabric_meters || 1.25)).toFixed(2)}m
                                    </span>
                                  </div>
                                  {(piece.attachment1_name || piece.attachment1_code) &&
                                    parseFloat(
                                      String(
                                        piece.attachment1_length ||
                                          piece.attachment1_meters ||
                                          0,
                                      ),
                                    ) > 0 && (
                                      <div className="flex items-center gap-1.5 text-[11px]">
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-700 text-white font-extrabold text-[8.5px] uppercase tracking-wide shrink-0">
                                          Att 1
                                        </span>
                                        <span className="font-mono font-bold text-indigo-800 bg-indigo-50 px-1 rounded text-[10px] shrink-0">
                                          {piece.attachment1_code || '--'}
                                        </span>
                                        <span
                                          className="truncate text-slate-700 font-medium max-w-[120px]"
                                          title={piece.attachment1_name || ''}
                                        >
                                          {piece.attachment1_name}
                                        </span>
                                        <span className="ml-auto font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded text-[10px] whitespace-nowrap">
                                          {parseFloat(
                                            String(
                                              piece.attachment1_length ||
                                                piece.attachment1_meters ||
                                                0,
                                            ),
                                          ).toFixed(2)}
                                          m
                                        </span>
                                      </div>
                                    )}
                                  {(piece.attachment2_name || piece.attachment2_code) &&
                                    parseFloat(
                                      String(
                                        piece.attachment2_length ||
                                          piece.attachment2_meters ||
                                          0,
                                      ),
                                    ) > 0 && (
                                      <div className="flex items-center gap-1.5 text-[11px]">
                                        <span className="px-1.5 py-0.5 rounded bg-purple-700 text-white font-extrabold text-[8.5px] uppercase tracking-wide shrink-0">
                                          Att 2
                                        </span>
                                        <span className="font-mono font-bold text-purple-800 bg-purple-50 px-1 rounded text-[10px] shrink-0">
                                          {piece.attachment2_code || '--'}
                                        </span>
                                        <span
                                          className="truncate text-slate-700 font-medium max-w-[120px]"
                                          title={piece.attachment2_name || ''}
                                        >
                                          {piece.attachment2_name}
                                        </span>
                                        <span className="ml-auto font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 rounded text-[10px] whitespace-nowrap">
                                          {parseFloat(
                                            String(
                                              piece.attachment2_length ||
                                                piece.attachment2_meters ||
                                                0,
                                            ),
                                          ).toFixed(2)}
                                          m
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </td>
                              <td className="p-3.5">
                                {piece.sub_job_cards ? (
                                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-[10.5px]">
                                    {piece.sub_job_cards.sub_card_no}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Unbatched</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10.5px]">
                                  {piece.stage || 'Cutting'}
                                </span>
                              </td>
                              <td className="p-3.5 pr-4 text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {piece.status || 'In Production'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Garment Barcode Stickers Print Preview Modal ────────────────────────────── */}
      {showStickerModal && printCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStickerModal(false)} />
          <div className="relative bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden z-10">
            {/* Modal Header */}
            <div className="p-4 md:px-6 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  Garment Barcode Stickers &amp; Physical Piece Tags
                </h3>
                <p className="text-xs text-slate-400">
                  {printCard.job_card_no} — {childPieces.length} Piece Stickers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={executeStickerPrint}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Stickers
                </button>
                <button
                  onClick={() => setShowStickerModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded Print Frame */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex justify-center">
              <iframe
                id="stickers-print-frame"
                srcDoc={compileGarmentStickersHTML(childPieces, printCard)}
                className="w-full max-w-[840px] h-full bg-white rounded-xl shadow-md border border-slate-200"
                title="Stickers Print Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Person-Wise Traveler Sheets Print Preview Modal ────────────────────────────── */}
      {showPersonTravelerModal && printCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPersonTravelerModal(false)} />
          <div className="relative bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden z-10">
            {/* Modal Header */}
            <div className="p-4 md:px-6 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Person-Wise Garment Production Work Travelers
                </h3>
                <p className="text-xs text-slate-400">
                  {printCard.job_card_no} — Individual Work Sheets per Recipient
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={executePersonTravelerPrint}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Person Sheets
                </button>
                <button
                  onClick={() => setShowPersonTravelerModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded Print Frame */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex justify-center">
              <iframe
                id="person-traveler-print-frame"
                srcDoc={compilePersonWiseTravelerSheetsHTML(childPieces, printCard)}
                className="w-full max-w-[840px] h-full bg-white rounded-xl shadow-md border border-slate-200"
                title="Person Sheets Print Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

