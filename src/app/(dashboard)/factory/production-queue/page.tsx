'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Layers, Scissors, CheckSquare, RefreshCw, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface JobCard {
  id: number;
  job_card_no: string;
  item_name: string;
  quantity: number;
  status: string;
}

export default function ProductionQueuePage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-job card batch breakdown state
  const [showSubCardModal, setShowSubCardModal] = useState(false);
  const [selectedJobCardId, setSelectedJobCardId] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState('10');
  const [assignedTo, setAssignedTo] = useState('Floor A');

  // Fabric issue state
  const [showFabricModal, setShowFabricModal] = useState(false);
  const [fabricName, setFabricName] = useState('Navy Blue Cotton Blend');
  const [requiredMeters, setRequiredMeters] = useState('50');
  const [returnedMeters, setReturnedMeters] = useState('0');

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/job-cards?status=Accepted');
      setJobCards(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCards();
  }, []);

  const handleCreateSubCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCardId) return;

    try {
      await api.post('/job-cards/sub-card', {
        job_card_id: selectedJobCardId,
        batch_size: Number(batchSize),
        assigned_to: assignedTo
      });
      toast.success('Sub-job card batch created!');
      setShowSubCardModal(false);
      fetchJobCards();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create sub-card');
    }
  };

  const handleIssueFabric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCardId) return;

    try {
      const reqMeters = parseFloat(requiredMeters);
      const safetyMargin = reqMeters * 0.10;
      const totalIssued = reqMeters + safetyMargin;

      await api.post('/job-cards/fabric-consumption', {
        job_card_id: selectedJobCardId,
        fabric_name: fabricName,
        required_meters: reqMeters,
        returned_meters: parseFloat(returnedMeters || '0')
      });

      toast.success(`Issued ${totalIssued.toFixed(2)}m fabric (${reqMeters}m + 10% safety margin of ${safetyMargin.toFixed(2)}m)`);
      setShowFabricModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fabric issue failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scissors className="w-7 h-7 text-indigo-400" />
            Production Coordinator Queue & Stage Tracking
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            P1.3 Scope — Sub-job card batching, stage progress tracking (Cutting, Stitching, QC), 10% safety margin fabric allocation, and cut-piece returns.
          </p>
        </div>
        <button onClick={fetchJobCards} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Production Stages Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['Cutting', 'Stitching', 'Finishing', 'QC & Inspection', 'Packing'].map((stage, idx) => (
          <div key={stage} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">Stage {idx + 1}</span>
            <span className="text-sm font-bold text-slate-900 mt-1">{stage}</span>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full ${idx === 0 ? 'w-full bg-indigo-600' : 'w-1/3 bg-slate-300'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-800">
          Accepted Production Queue
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Job Card</th>
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Batch Qty</th>
                <th className="px-6 py-3">Fabric Allocation (+10%)</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {jobCards.map(jc => (
                <tr key={jc.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">{jc.job_card_no}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{jc.item_name}</td>
                  <td className="px-6 py-4">{jc.quantity} pcs</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      10% Margin Enforced
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => { setSelectedJobCardId(jc.id); setShowSubCardModal(true); }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Sub-Card Batch
                    </button>
                    <button
                      onClick={() => { setSelectedJobCardId(jc.id); setShowFabricModal(true); }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" /> Issue Fabric
                    </button>
                  </td>
                </tr>
              ))}
              {jobCards.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No active job cards currently waiting in the production coordinator queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-Card Modal */}
      {showSubCardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Create Sub-Job Card Batch</h3>
            <form onSubmit={handleCreateSubCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Batch Size (pcs)</label>
                <input
                  type="number"
                  required
                  value={batchSize}
                  onChange={e => setBatchSize(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Floor / Team</label>
                <input
                  type="text"
                  required
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubCardModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Create Batch Breakdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fabric Issue Modal */}
      {showFabricModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Fabric Consumption & Safety Margin</h3>
            <form onSubmit={handleIssueFabric} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fabric Name / Reference</label>
                <input
                  type="text"
                  required
                  value={fabricName}
                  onChange={e => setFabricName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Net Required Meters</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={requiredMeters}
                  onChange={e => setRequiredMeters(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900 font-medium">
                <p>Net Required: {requiredMeters || '0'} meters</p>
                <p>Safety Margin (10%): {(parseFloat(requiredMeters || '0') * 0.10).toFixed(2)} meters</p>
                <p className="font-bold text-emerald-900 border-t border-emerald-200 pt-1">
                  Total Issued: {(parseFloat(requiredMeters || '0') * 1.10).toFixed(2)} meters
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cut-Piece Return (Meters if any)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={returnedMeters}
                  onChange={e => setReturnedMeters(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFabricModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Confirm Fabric Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
