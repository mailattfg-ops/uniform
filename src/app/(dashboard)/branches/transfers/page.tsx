'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ArrowLeftRight, Plus, CheckCircle2, Clock, Truck, RefreshCw, Building2, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface Branch {
  id: number;
  code: string;
  name: string;
}

interface StockTransfer {
  id: number;
  transfer_no: string;
  from_branch_id: number;
  to_branch_id: number;
  item_type: string;
  item_name: string;
  quantity: number;
  status: 'Pending' | 'Dispatched' | 'Received' | 'Cancelled';
  notes: string;
  created_at: string;
  from_branch?: { name: string; code: string };
  to_branch?: { name: string; code: string };
}

export default function BranchTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [fromBranchId, setFromBranchId] = useState<string>('');
  const [toBranchId, setToBranchId] = useState<string>('');
  const [itemType, setItemType] = useState('product');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setCurrentUser(u);
        if (u.branchId) {
          setFromBranchId(String(u.branchId));
        }
      } catch (e) {}
    }
  }, []);

  const isAdmin = !currentUser?.branchId || currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'SuperAdmin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTransfers, resBranches] = await Promise.all([
        api.get('/branches/transfers'),
        api.get('/branches')
      ]);
      setTransfers(resTransfers.data || []);
      setBranches(resBranches.data || []);

      if (resBranches.data && resBranches.data.length >= 2 && !currentUser?.branchId) {
        setFromBranchId(String(resBranches.data[0].id));
        setToBranchId(String(resBranches.data[1].id));
      } else if (resBranches.data && resBranches.data.length > 0) {
        const otherBranch = resBranches.data.find((b: any) => String(b.id) !== String(currentUser?.branchId));
        if (otherBranch) setToBranchId(String(otherBranch.id));
      }
    } catch (err: any) {
      toast.error('Failed to load transfer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const sourceId = !isAdmin && currentUser?.branchId ? String(currentUser.branchId) : fromBranchId;

    if (sourceId === toBranchId) {
      toast.error('Source branch and destination branch must be different.');
      return;
    }

    try {
      await api.post('/branches/transfers', {
        from_branch_id: Number(sourceId),
        to_branch_id: Number(toBranchId),
        item_type: itemType,
        item_name: itemName,
        quantity: parseFloat(quantity),
        notes
      });
      toast.success('Inter-branch transfer dispatched successfully!');
      setShowCreateModal(false);
      setItemName('');
      setQuantity('');
      setNotes('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to dispatch stock transfer');
    }
  };

  const handleUpdateStatus = async (id: number, status: 'Received' | 'Cancelled') => {
    try {
      await api.put(`/branches/transfers/${id}/status`, { status });
      toast.success(`Transfer marked as ${status}!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold">
              {isAdmin ? 'Inter-Branch Stock Transfers' : `${currentUser?.branchName || 'Branch'} Stock Transfer Hub`}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Dispatch, track, and acknowledge inventory movements between retail branches and factory hubs.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            New Stock Transfer Dispatch
          </button>
        </div>
      </div>

      {/* Transfers Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 text-base">
            {isAdmin ? 'Transfer History & Transit Ledger' : `${currentUser?.branchName || 'Branch'} Transfers`}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Transfer No</th>
                <th className="px-6 py-3">Source Branch (From)</th>
                <th className="px-6 py-3">Destination Branch (To)</th>
                <th className="px-6 py-3">Item Details</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transfers.map(trf => (
                <tr key={trf.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">{trf.transfer_no}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{trf.from_branch?.name || `Branch #${trf.from_branch_id}`}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{trf.to_branch?.name || `Branch #${trf.to_branch_id}`}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{trf.item_name}</p>
                    <span className="text-[11px] font-semibold text-slate-400 capitalize">{trf.item_type}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-base text-slate-900">{trf.quantity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      trf.status === 'Received' ? 'bg-emerald-100 text-emerald-700' :
                      trf.status === 'Dispatched' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {trf.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {trf.status === 'Dispatched' && (
                      <button
                        onClick={() => handleUpdateStatus(trf.id, 'Received')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                      >
                        Acknowledge & Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {transfers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No stock transfers recorded for your branch yet. Click "New Stock Transfer Dispatch" to dispatch items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-indigo-600" />
              Dispatch Inter-Branch Stock Transfer
            </h3>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Source Branch (From)</label>
                  {isAdmin ? (
                    <select
                      value={fromBranchId}
                      onChange={e => setFromBranchId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={currentUser?.branchName || 'My Branch'}
                      className="w-full px-3 py-2 border rounded-xl text-sm bg-slate-100 text-slate-700 font-semibold"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Branch (To)</label>
                  <select
                    value={toBranchId}
                    onChange={e => setToBranchId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    {branches.filter(b => isAdmin || String(b.id) !== String(currentUser?.branchId)).map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Item Category</label>
                  <select
                    value={itemType}
                    onChange={e => setItemType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white capitalize"
                  >
                    <option value="product">Ready Uniform Product</option>
                    <option value="fabric">Fabric Roll</option>
                    <option value="button">Buttons</option>
                    <option value="thread">Threads</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 25"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navy Blue Blazers (Size M)"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Transfer Notes / Vehicle Details</label>
                <input
                  type="text"
                  placeholder="e.g. Handover via Van #KL-11-AX-9901"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Dispatch Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
