'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Tag, Plus, Search, RefreshCw, CheckCircle, School, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface MeasurementToken {
  id: number;
  token_number: string;
  student_name: string;
  class_name: string;
  section_name: string;
  item_name: string;
  alteration_details: string;
  unique_composite_id: string;
  status: string;
  created_at: string;
}

export default function MeasurementTokensPage() {
  const [tokens, setTokens] = useState<MeasurementToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [tokenNumber, setTokenNumber] = useState('');
  const [orgCode, setOrgCode] = useState('STMARYS');
  const [orderNo, setOrderNo] = useState('ORD101');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('Grade 5');
  const [itemName, setItemName] = useState('Shirt - White');
  const [alterationDetails, setAlterationDetails] = useState('');

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await api.get('/measurement-tokens', {
        params: { search }
      });
      setTokens(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [search]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/measurement-tokens', {
        token_number: tokenNumber,
        org_code: orgCode,
        order_no: orderNo,
        student_name: studentName,
        class_name: className,
        item_name: itemName,
        alteration_details: alterationDetails
      });
      toast.success(`Token registered! Composite ID: ${res.data.unique_composite_id}`);
      setShowAddModal(false);
      setTokenNumber('');
      setStudentName('');
      fetchTokens();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign token');
    }
  };

  const computedCompositeId = `${orgCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${orderNo.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${(tokenNumber || 'TOK').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${(itemName || 'ITEM').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-7 h-7 text-indigo-400" />
            Measurement Tokens & Composite IDs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            P1.2 Scope — Token assignment, student alteration details, and Unique ID Composition (Organisation + Sales Order + Token + Item).
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          Assign New Token
        </button>
      </div>

      {/* Filter / Search */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, token number, or unique composite ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm"
          />
        </div>
        <button onClick={fetchTokens} className="p-2 text-slate-500 hover:text-indigo-600">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-800 flex justify-between items-center">
          <span>Assigned Measurement Tokens</span>
          <span className="text-xs font-mono text-indigo-600">Format: ORG-SO-TOK-ITEM</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Token No</th>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Unique Composite ID</th>
                <th className="px-6 py-3">Alterations</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tokens.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{t.token_number}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{t.student_name}</td>
                  <td className="px-6 py-4">{t.class_name || '-'}</td>
                  <td className="px-6 py-4">{t.item_name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-lg border border-indigo-100">
                      {t.unique_composite_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{t.alteration_details || 'Standard Fit'}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No measurement tokens captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Assign Measurement Token</h3>
            <form onSubmit={handleCreateToken} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Token Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TOK-105"
                    value={tokenNumber}
                    onChange={e => setTokenNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Student / Individual Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Org Code</label>
                  <input
                    type="text"
                    value={orgCode}
                    onChange={e => setOrgCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Order Number</label>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={e => setOrderNo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Class / Grade</label>
                  <input
                    type="text"
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alteration Details</label>
                <textarea
                  placeholder="e.g. Sleeve length +1 inch, waist trim..."
                  value={alterationDetails}
                  onChange={e => setAlterationDetails(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  rows={2}
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="text-slate-500 font-semibold">Composite ID Preview (M11.2):</span>
                <p className="font-mono font-bold text-indigo-600 text-sm">{computedCompositeId}</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Assign Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
