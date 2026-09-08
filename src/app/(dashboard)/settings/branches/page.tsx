'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Building2, Plus, RefreshCw, Package, Truck, Layers, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Branch {
  id: number;
  code: string;
  name: string;
  tier: string;
  address: string;
  contact_number: string;
  email: string;
  is_active: boolean;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState('Branch');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');

  // Purchase batch states
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [lumpNo, setLumpNo] = useState('');
  const [itemType, setItemType] = useState('fabric');
  const [quantity, setQuantity] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/branches');
      setBranches(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/branches', {
        code,
        name,
        tier,
        address,
        contact_number: contactNumber,
        email
      });
      toast.success('Branch created successfully');
      setShowAddModal(false);
      setCode('');
      setName('');
      fetchBranches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create branch');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/branches/purchase-batch', {
        vendor_bill_no: vendorBillNo,
        lump_no: lumpNo,
        item_type: itemType,
        branch_id: selectedBranchId,
        quantity: parseFloat(quantity)
      });
      toast.success(`Purchase Batch (${vendorBillNo}-${lumpNo}) created!`);
      setShowBatchModal(false);
      setVendorBillNo('');
      setLumpNo('');
      setQuantity('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create purchase batch');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-400" />
            Branch & Inventory Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            P1.1 Scope — Tier setup (Corporate, Branch, Factory), branch stock tracking & batch purchase entries.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition shadow-md"
          >
            <Truck className="w-4 h-4" />
            New Purchase Batch (Bill + Lump)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Locations</p>
            <p className="text-2xl font-bold text-slate-900">{branches.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiers Operating</p>
            <p className="text-2xl font-bold text-slate-900">Corporate, Factory, Branch</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch Standard</p>
            <p className="text-2xl font-bold text-slate-900">Bill No + Lump No</p>
          </div>
        </div>
      </div>

      {/* Branches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-base">Branch Profiles & Tiers</h2>
          <button onClick={fetchBranches} className="text-slate-500 hover:text-indigo-600 p-1">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Tier</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {branches.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">{b.code}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{b.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      b.tier === 'Corporate' ? 'bg-purple-100 text-purple-700' :
                      b.tier === 'Factory' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {b.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">{b.address || '-'}</td>
                  <td className="px-6 py-4">{b.contact_number || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No branches configured yet. Click "Add Branch" to set up your corporate/factory/branch tiers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Add New Branch / Location</h3>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-02"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tier</label>
                  <select
                    value={tier}
                    onChange={e => setTier(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    <option value="Branch">Branch</option>
                    <option value="Factory">Factory</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Downtown Retail Branch"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Full physical address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
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
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Batch Numbering: Vendor Bill + Lump Number</h3>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor Bill Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. V-8891"
                    value={vendorBillNo}
                    onChange={e => setVendorBillNo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lump Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. L-102"
                    value={lumpNo}
                    onChange={e => setLumpNo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Item Category</label>
                  <select
                    value={itemType}
                    onChange={e => setItemType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    <option value="fabric">Fabric</option>
                    <option value="button">Button</option>
                    <option value="thread">Thread</option>
                    <option value="readymade">Readymade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity (Meters/Units)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assign to Branch</label>
                <select
                  onChange={e => setSelectedBranchId(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono">
                Generated Batch Number: <span className="font-bold text-indigo-600">{vendorBillNo && lumpNo ? `${vendorBillNo.toUpperCase()}-${lumpNo.toUpperCase()}` : 'V-BILL-LUMP'}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Create Batch Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
