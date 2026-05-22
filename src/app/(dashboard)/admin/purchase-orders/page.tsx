'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Layers, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Search, 
  Eye, 
  Truck, 
  Calendar, 
  XCircle, 
  PlusCircle, 
  Trash2, 
  Loader2, 
  ChevronRight, 
  ClipboardList, 
  AlertTriangle,
  RotateCw,
  CornerDownRight,
  FileText,
  Scissors
} from 'lucide-react';

interface POItemFabric {
  id: string;
  name: string;
  code: string;
  brand_name: string | null;
  shade: string | null;
  width: string | null;
}

interface POItem {
  id: number;
  purchase_order_id: number;
  fabric_id: string;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
  fabrics?: POItemFabric;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
  supplier_name: string;
  notes: string;
  is_auto_triggered: boolean;
  created_at: string;
  updated_at: string;
  items?: POItem[];
}

interface Fabric {
  id: string;
  code: string;
  name: string;
  brand_name: string | null;
  shade: string | null;
  width: string | null;
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [fabricList, setFabricList] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Draft' | 'Ordered' | 'Received' | 'Cancelled'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'AUTO' | 'MANUAL'>('ALL');

  // Modals
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [newItems, setNewItems] = useState<{ fabric_id: string; quantity: number }[]>([
    { fabric_id: '', quantity: 50.00 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Summary Metrics
  const [stats, setStats] = useState({
    totalPOs: 0,
    pendingPOs: 0,
    autoPOs: 0,
    receivedPOs: 0
  });

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/purchase-orders');
      setPurchaseOrders(res.data || []);
      calculateStats(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load purchase orders registry.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFabrics = async () => {
    try {
      const res = await api.get('/inventory/stock');
      setFabricList(res.data?.fabrics || []);
    } catch (err) {
      console.error('Failed to fetch fabrics for selector:', err);
    }
  };

  const calculateStats = (poList: PurchaseOrder[]) => {
    let pending = 0;
    let auto = 0;
    let received = 0;

    poList.forEach(po => {
      if (po.status === 'Draft' || po.status === 'Ordered') pending++;
      if (po.is_auto_triggered) auto++;
      if (po.status === 'Received') received++;
    });

    setStats({
      totalPOs: poList.length,
      pendingPOs: pending,
      autoPOs: auto,
      receivedPOs: received
    });
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchFabrics();
  }, []);

  const handleOpenDetails = async (poId: number) => {
    setIsDetailsLoading(true);
    setIsDetailsOpen(true);
    try {
      const res = await api.get(`/inventory/purchase-orders/${poId}`);
      setSelectedPO(res.data);
    } catch (err) {
      toast.error('Failed to fetch purchase order items.');
      setIsDetailsOpen(false);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleUpdateStatus = async (poId: number, targetStatus: 'Ordered' | 'Received' | 'Cancelled') => {
    const loadingToast = toast.loading(`Transitioning PO state to ${targetStatus}...`);
    try {
      const res = await api.put(`/inventory/purchase-orders/${poId}/status`, { status: targetStatus });
      toast.success(`Purchase order successfully marked as ${targetStatus}!`, { id: loadingToast });
      setSelectedPO(res.data); // Update modal contents
      fetchPurchaseOrders(); // Sync list
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Authorization failed. Make sure you possess manager permissions.';
      toast.error(errorMsg, { id: loadingToast });
    }
  };

  // Manual PO Form Actions
  const handleAddItemRow = () => {
    setNewItems(prev => [...prev, { fabric_id: '', quantity: 50.00 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (newItems.length === 1) return;
    setNewItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: 'fabric_id' | 'quantity', value: any) => {
    setNewItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return {
        ...item,
        [field]: value
      };
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const invalidItem = newItems.some(i => !i.fabric_id || i.quantity <= 0);
    if (invalidItem) {
      toast.error('Please ensure all items have a valid fabric selected and quantity > 0');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Constructing manual purchase order...');
    
    try {
      await api.post('/inventory/purchase-orders', {
        supplier_name: supplierName,
        notes,
        items: newItems
      });

      toast.success('Purchase Order initialized as Draft!', { id: loadingToast });
      setIsCreateOpen(false);
      // Reset form
      setSupplierName('');
      setNotes('');
      setNewItems([{ fabric_id: '', quantity: 50.00 }]);
      fetchPurchaseOrders();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create purchase order. Verify administrator permissions.';
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search & Filtered results
  const filteredPOs = React.useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch = 
        po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus !== 'ALL' && po.status !== filterStatus) return false;

      if (filterType === 'AUTO' && !po.is_auto_triggered) return false;
      if (filterType === 'MANUAL' && po.is_auto_triggered) return false;

      return true;
    });
  }, [purchaseOrders, searchTerm, filterStatus, filterType]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/20">
              <Truck size={20} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Purchase Orders</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-2 opacity-80">
            Track external raw fabric acquisitions, auto-replenish Drafts, and credit stock
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={fetchPurchaseOrders}
            disabled={isLoading}
            className="h-14 px-6 bg-white hover:bg-zinc-50 border border-[#fce4d4] rounded-2xl font-bold text-xs text-[#3a525d] shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin text-[#2d8d9b]' : 'text-[#3a525d]'} />
            Sync Ledger
          </button>
          
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="h-14 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-[#3a525d]/10 flex items-center gap-2 transition-all hover:scale-[1.03] active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total POs */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-6 shadow-sm flex items-center gap-5 hover:border-[#2d8d9b]/30 transition-all duration-300 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-[#3a525d]/5 flex items-center justify-center text-[#3a525d] border border-[#3a525d]/10">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]/60">Total Orders</p>
            <h3 className="text-3xl font-black italic tracking-tight text-[#3a525d] mt-0.5">{stats.totalPOs}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-zinc-800 scale-150 group-hover:scale-[1.8] transition-transform duration-500">
            <ClipboardList size={72} />
          </div>
        </div>

        {/* Draft/Pending */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-6 shadow-sm flex items-center gap-5 hover:border-amber-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Pending / Active</p>
            <h3 className="text-3xl font-black italic tracking-tight text-amber-600 mt-0.5">{stats.pendingPOs}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-amber-500 scale-150 group-hover:scale-[1.8] transition-transform duration-500">
            <Clock size={72} />
          </div>
        </div>

        {/* Auto Triggered */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-6 shadow-sm flex items-center gap-5 hover:border-teal-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-[#2d8d9b] border border-teal-100">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-teal-600/70">Auto-Replenished</p>
            <h3 className="text-3xl font-black italic tracking-tight text-[#2d8d9b] mt-0.5">{stats.autoPOs}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-[#2d8d9b] scale-150 group-hover:scale-[1.8] transition-transform duration-500">
            <Sparkles size={72} />
          </div>
        </div>

        {/* Fully Received */}
        <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-6 shadow-sm flex items-center gap-5 hover:border-emerald-200 transition-all duration-300 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Completed (Received)</p>
            <h3 className="text-3xl font-black italic tracking-tight text-emerald-600 mt-0.5">{stats.receivedPOs}</h3>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-emerald-500 scale-150 group-hover:scale-[1.8] transition-transform duration-500">
            <CheckCircle2 size={72} />
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#fce4d4] rounded-[2rem] p-4 flex flex-col xl:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Search */}
        <div className="relative group w-full xl:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, supplier or comments..."
            className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/40 transition-all text-[#3a525d] shadow-sm"
          />
        </div>

        {/* Filters Wrapper */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          
          {/* Trigger filter */}
          <div className="flex gap-1.5 bg-zinc-50 border border-zinc-100 p-1.5 rounded-2xl">
            {(['ALL', 'AUTO', 'MANUAL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  filterType === t 
                    ? 'bg-[#2d8d9b] text-white shadow-sm' 
                    : 'text-[#3a525d]/70 hover:bg-zinc-100'
                }`}
              >
                {t === 'ALL' ? 'All Origins' : t === 'AUTO' ? 'Auto-Triggered' : 'Manual'}
              </button>
            ))}
          </div>

          {/* Status filters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {(['ALL', 'Draft', 'Ordered', 'Received', 'Cancelled'] as const).map((st) => {
              const colors = {
                ALL: 'border-zinc-200 text-[#3a525d] hover:bg-zinc-50',
                Draft: 'border-slate-100 text-slate-600 hover:bg-slate-50',
                Ordered: 'border-indigo-100 text-indigo-600 hover:bg-indigo-50',
                Received: 'border-emerald-100 text-emerald-600 hover:bg-emerald-50',
                Cancelled: 'border-red-100 text-red-600 hover:bg-red-50'
              };

              const activeColors = {
                ALL: '!bg-[#3a525d] !text-white !border-[#3a525d]',
                Draft: '!bg-slate-500 !text-white !border-slate-500',
                Ordered: '!bg-indigo-500 !text-white !border-indigo-500',
                Received: '!bg-emerald-500 !text-white !border-emerald-500',
                Cancelled: '!bg-red-500 !text-white !border-red-500'
              };

              return (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    filterStatus === st ? activeColors[st] : colors[st]
                  }`}
                >
                  {st === 'ALL' ? 'All Status' : st}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* Main PO Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-[#fce4d4] rounded-[3rem] gap-4">
          <Loader2 className="animate-spin text-[#2d8d9b]" size={40} />
          <p className="text-sm font-bold text-[#3a525d]">Reconstructing purchase orders ledger...</p>
        </div>
      ) : filteredPOs.length > 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-[#fce4d4] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#fce4d4]/10 border-b border-[#fce4d4]">
                  <th className="p-6 text-[10px] font-black tracking-[0.2em] uppercase text-[#8b6b5a]">Order Details</th>
                  <th className="p-6 text-[10px] font-black tracking-[0.2em] uppercase text-[#8b6b5a]">Supplier</th>
                  <th className="p-6 text-[10px] font-black tracking-[0.2em] uppercase text-[#8b6b5a]">Origin Type</th>
                  <th className="p-6 text-[10px] font-black tracking-[0.2em] uppercase text-[#8b6b5a]">Date Created</th>
                  <th className="p-6 text-[10px] font-black tracking-[0.2em] uppercase text-[#8b6b5a]">Status</th>
                  <th className="p-6 text-[10px] font-black tracking-[0.2em] uppercase text-[#8b6b5a] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredPOs.map((po) => {
                  const statusColors = {
                    Draft: 'bg-slate-50 text-slate-600 border-slate-200',
                    Ordered: 'bg-indigo-50 text-indigo-600 border-indigo-200/50',
                    Received: 'bg-emerald-50 text-emerald-600 border-emerald-200/40',
                    Cancelled: 'bg-red-50 text-red-600 border-red-200/30'
                  };

                  return (
                    <tr key={po.id} className="hover:bg-zinc-50/50 transition-colors group">
                      
                      {/* PO Number & notes */}
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 group-hover:bg-[#2d8d9b]/5 border border-zinc-100 flex items-center justify-center text-[#3a525d] transition-all">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="font-black text-sm text-[#3a525d] tracking-tight">{po.po_number}</p>
                            {po.notes ? (
                              <p className="text-[10px] text-zinc-400 font-bold truncate max-w-xs mt-0.5">{po.notes}</p>
                            ) : (
                              <p className="text-[10px] text-zinc-300 font-bold italic mt-0.5">No comments</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="p-6 font-extrabold text-sm text-[#3a525d]">
                        {po.supplier_name}
                      </td>

                      {/* Origin Type */}
                      <td className="p-6">
                        {po.is_auto_triggered ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                            <Sparkles size={10} />
                            Auto-Replenished
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-50 border border-zinc-200/50 px-2 py-0.5 rounded-md">
                            Manual Setup
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-6 text-xs text-zinc-500 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-zinc-400" />
                          {new Date(po.created_at).toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-6">
                        <span className={`inline-block px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusColors[po.status]}`}>
                          {po.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="p-6 text-right">
                        <button
                          onClick={() => handleOpenDetails(po.id)}
                          className="px-4 py-2 bg-zinc-50 hover:bg-[#2d8d9b]/5 border border-zinc-200/50 text-[#3a525d] hover:text-[#2d8d9b] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye size={12} />
                          Details
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#fce4d4] rounded-[3rem] p-24 text-center">
          <div className="flex flex-col items-center gap-4 opacity-30">
            <Truck size={48} className="text-[#2d8d9b]" />
            <p className="text-xl font-black italic text-[#3a525d]">No matching purchase orders logged</p>
            <p className="text-xs font-bold max-w-sm text-zinc-500">Modify your filters or key in a different PO number to locate records.</p>
          </div>
        </div>
      )}

      {/* PO Details & Fulfillment Modal */}
      {isDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="w-full max-w-3xl bg-white rounded-[3rem] p-8 border border-[#fce4d4] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-[#2d8d9b] to-[#fce4d4]" />
            
            {/* Close button */}
            <button 
              onClick={() => setIsDetailsOpen(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-all border border-zinc-200/40"
            >
              ×
            </button>

            {isDetailsLoading || !selectedPO ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-[#2d8d9b]" size={36} />
                <p className="text-xs font-bold text-zinc-400">Loading acquisition details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Header details */}
                <div className="border-b border-zinc-100 pb-5 mt-2 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">
                        Fabric PO Registry
                      </span>
                      {selectedPO.is_auto_triggered && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-teal-50 text-teal-600 px-2 py-0.5 rounded border border-teal-100 flex items-center gap-1">
                          <Sparkles size={10} /> Auto-Triggered
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight mt-1.5">
                      {selectedPO.po_number}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                      Supplier: <span className="font-extrabold text-zinc-600">{selectedPO.supplier_name}</span> | Opened: {new Date(selectedPO.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest mt-1 ${
                      selectedPO.status === 'Draft' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                      selectedPO.status === 'Ordered' ? 'bg-indigo-50 text-indigo-600 border-indigo-200/50' :
                      selectedPO.status === 'Received' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/40' :
                      'bg-red-50 text-red-600 border-red-200/30'
                    }`}>
                      {selectedPO.status}
                    </span>
                  </div>
                </div>

                {/* Notes box */}
                {selectedPO.notes && (
                  <div className="bg-[#fce4d4]/10 rounded-2xl p-4 border border-[#fce4d4]/30 text-xs font-bold text-[#8b6b5a]">
                    <span className="font-black block uppercase text-[9px] tracking-wider text-[#3a525d] mb-1">Fulfillment instructions / Notes:</span>
                    {selectedPO.notes}
                  </div>
                )}

                {/* Items Catalog List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">Ordered Fabric Roll details</h4>
                  
                  <div className="border border-zinc-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                          <th className="p-4 font-black uppercase tracking-wider text-zinc-400">Fabric</th>
                          <th className="p-4 font-black uppercase tracking-wider text-zinc-400">Code</th>
                          <th className="p-4 font-black uppercase tracking-wider text-zinc-400">Brand / Shade</th>
                          <th className="p-4 font-black uppercase tracking-wider text-zinc-400">Width</th>
                          <th className="p-4 font-black uppercase tracking-wider text-zinc-400 text-center">Ordered meters</th>
                          <th className="p-4 font-black uppercase tracking-wider text-zinc-400 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {selectedPO.items && selectedPO.items.length > 0 ? (
                          selectedPO.items.map((item) => (
                            <tr key={item.id} className="hover:bg-zinc-50/50">
                              <td className="p-4 font-extrabold text-[#3a525d]">
                                {item.fabrics?.name || `Fabric ID: ${item.fabric_id}`}
                              </td>
                              <td className="p-4 text-zinc-500 font-bold">
                                {item.fabrics?.code || 'N/A'}
                              </td>
                              <td className="p-4 font-bold text-zinc-600">
                                {item.fabrics?.brand_name || 'Generic'} {item.fabrics?.shade ? `(Shade: ${item.fabrics.shade})` : ''}
                              </td>
                              <td className="p-4 text-zinc-500 font-medium">
                                {item.fabrics?.width || 'N/A'}
                              </td>
                              <td className="p-4 font-black text-[#2d8d9b] text-center text-sm">
                                {Number(item.quantity).toFixed(2)} m
                              </td>
                              <td className="p-4 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  item.status === 'Received' 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-zinc-400 italic font-bold">
                              No fabric items compiled inside this Purchase Order.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Active transition prompts */}
                {selectedPO.status === 'Draft' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-xs font-bold text-amber-700">
                    <AlertTriangle size={18} className="shrink-0" />
                    <div>
                      <p className="font-black">Draft Order Status</p>
                      <p className="opacity-90 mt-0.5">This PO is currently a draft. Ready to coordinate fabric roll placement? Advancing status to "Ordered" alerts suppliers. No fabric quantities will be credited yet.</p>
                    </div>
                  </div>
                )}

                {selectedPO.status === 'Ordered' && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-xs font-bold text-indigo-700">
                    <AlertTriangle size={18} className="shrink-0" />
                    <div>
                      <p className="font-black">Shipment Pending Fulfillment</p>
                      <p className="opacity-90 mt-0.5">Supplier is currently fulfilling this order. Ready to credit inventory? Clicking "Receive Shipment" will automatically add the itemized raw fabric quantities (meters) to the fabrics catalog database.</p>
                    </div>
                  </div>
                )}

                {/* Modal Footer Controls */}
                <div className="flex gap-4 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="flex-1 h-14 bg-zinc-50 hover:bg-zinc-100 text-[#3a525d] rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-zinc-200/50"
                  >
                    Close Panel
                  </button>

                  {/* Cancel PO action */}
                  {(selectedPO.status === 'Draft' || selectedPO.status === 'Ordered') && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPO.id, 'Cancelled')}
                      className="px-6 h-14 border border-red-200 hover:bg-red-50 text-red-500 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                    >
                      Cancel Order
                    </button>
                  )}

                  {/* Transition Draft -> Ordered */}
                  {selectedPO.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPO.id, 'Ordered')}
                      className="flex-1 h-14 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#3a525d]/10 flex items-center justify-center gap-1.5"
                    >
                      <Truck size={14} />
                      Mark as Ordered
                    </button>
                  )}

                  {/* Transition Ordered -> Received */}
                  {selectedPO.status === 'Ordered' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPO.id, 'Received')}
                      className="flex-1 h-14 bg-[#2d8d9b] hover:bg-[#2d8d9b]/90 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#2d8d9b]/15 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      Receive Shipment
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual PO Generation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="w-full max-w-2xl bg-white rounded-[3rem] p-8 border border-[#fce4d4] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header decor */}
            <div className="absolute top-0 left-0 w-full h-2 bg-[#3a525d]" />
            
            {/* Close button */}
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-all border border-zinc-200/40"
            >
              ×
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mt-2">
              <div className="w-12 h-12 bg-[#3a525d]/10 rounded-2xl flex items-center justify-center text-[#3a525d] border border-[#3a525d]/20">
                <PlusCircle size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black italic text-[#3a525d] tracking-tight">Create Fabric Purchase Order</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-0.5">
                  Prepare external raw materials replenishment PO
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-6">
              
              {/* Supplier Info & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Supplier Name</label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Acme Fabric Mills, Main Textiles"
                    className="w-full h-12 bg-white border border-[#fce4d4] rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Fulfillment Notes / Instructions</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Standard delivery window, handle with care"
                    className="w-full h-12 bg-white border border-[#fce4d4] rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/20"
                  />
                </div>
              </div>

              {/* Dynamic PO items list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Fabric Items</label>
                  
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] hover:text-[#2d8d9b]/80 flex items-center gap-1 transition-colors"
                  >
                    <Plus size={12} /> Add Fabric Row
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar pr-1">
                  {newItems.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex gap-3 items-center bg-zinc-50 border border-zinc-100 p-4 rounded-2xl relative group"
                    >
                      {/* Fabric Selection Selector */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Fabric Selection</span>
                        <select
                          required
                          value={item.fabric_id}
                          onChange={(e) => handleItemChange(idx, 'fabric_id', e.target.value)}
                          className="w-full h-10 bg-white border border-[#fce4d4] rounded-xl px-3 text-xs font-bold outline-none"
                        >
                          <option value="">Select a Fabric...</option>
                          {fabricList.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.code}) {f.brand_name ? `- ${f.brand_name}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity input */}
                      <div className="w-40 space-y-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Quantity (meters)</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseFloat(e.target.value) || 0))}
                          className="w-full h-10 bg-white border border-[#fce4d4] rounded-xl px-3 text-xs font-black outline-none"
                        />
                      </div>

                      {/* Delete item row */}
                      {newItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 p-0 self-end mt-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-14 bg-zinc-50 hover:bg-zinc-100 text-[#3a525d] rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-zinc-200/50"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-[#3a525d]/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin text-white" size={16} />
                  ) : (
                    'Initialize Draft PO'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
