'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Building2, Package, Layers, Scissors, Disc, RefreshCw, Plus, AlertTriangle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Branch {
  id: number;
  code: string;
  name: string;
  tier: string;
}

interface BranchInventoryItem {
  id: number;
  branch_id: number;
  item_type: 'fabric' | 'button' | 'thread' | 'product';
  item_name: string;
  item_code: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
  updated_at: string;
}

export default function BranchInventoryPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<'all' | 'product' | 'fabric' | 'button' | 'thread'>('all');
  const [inventory, setInventory] = useState<BranchInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjBranchId, setAdjBranchId] = useState<number>(0);
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN');
  const [adjCategory, setAdjCategory] = useState<'product' | 'fabric' | 'button' | 'thread'>('product');
  const [adjItemName, setAdjItemName] = useState('');
  const [adjItemCode, setAdjItemCode] = useState('');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setCurrentUser(u);
        if (u.branchId) {
          setSelectedBranchId(String(u.branchId));
          setAdjBranchId(u.branchId);
        }
      } catch (e) {}
    }
  }, []);

  const isAdmin = !currentUser?.branchId || currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'SuperAdmin';

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data || []);
      if (res.data && res.data.length > 0 && (!currentUser?.branchId)) {
        setAdjBranchId(res.data[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load branches');
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const targetId = !isAdmin && currentUser?.branchId ? String(currentUser.branchId) : selectedBranchId;
      const url = targetId === 'all'
        ? '/branches/inventory/all'
        : `/branches/inventory/${targetId}`;

      const res = await api.get(url, {
        params: activeCategory !== 'all' ? { item_type: activeCategory } : {}
      });
      setInventory(res.data || []);
    } catch (err: any) {
      toast.error('Failed to load branch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedBranchId, activeCategory, currentUser]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetBranch = !isAdmin && currentUser?.branchId ? currentUser.branchId : adjBranchId;

      await api.post('/branches/inventory/adjust', {
        branch_id: targetBranch,
        type: adjType,
        item_type: adjCategory,
        item_name: adjItemName,
        item_code: adjItemCode,
        quantity: parseFloat(adjQuantity),
        notes: adjNotes
      });
      toast.success(`Stock ${adjType === 'IN' ? 'Inward Added' : 'Outward Deducted'}!`);
      setShowAdjustModal(false);
      setAdjItemName('');
      setAdjItemCode('');
      setAdjQuantity('');
      fetchInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Stock adjustment failed');
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (activeCategory !== 'all' && item.item_type !== activeCategory) return false;
    return true;
  });

  const totalUnits = filteredInventory.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold">
              {isAdmin ? 'Branch Stock & Isolated Inventory' : `${currentUser?.branchName || 'Branch'} Inventory Ledger`}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin 
              ? 'Track, inward, and outward stock independently for each retail branch, outlet, and factory hub.'
              : `Isolated stock ledger for ${currentUser?.branchName || 'your branch'}.`
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Switcher Selector */}
          {isAdmin ? (
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-4 h-4 text-indigo-400 ml-2" />
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-white text-sm font-semibold pr-4 focus:outline-hidden"
              >
                <option value="all" className="bg-slate-900 text-white">All Outlets Combined</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-sm font-semibold text-emerald-400">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Outlet: {currentUser?.branchName || 'My Branch'}
            </div>
          )}

          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Inward / Outward Stock Entry
          </button>
        </div>
      </div>

      {/* Category Tabs & Quick Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Items', icon: Package },
            { id: 'product', label: 'Ready Uniform Stock', icon: Package },
            { id: 'fabric', label: 'Fabric Rolls', icon: Scissors },
            { id: 'button', label: 'Button Stock', icon: Disc },
            { id: 'thread', label: 'Thread Spools', icon: Layers },
          ].map(cat => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          Filtered Stock Volume: <span className="font-bold text-slate-900 text-sm">{totalUnits.toLocaleString()}</span> units
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            {isAdmin ? 'Branch Stock Ledger' : `${currentUser?.branchName || 'Branch'} Stock Ledger`}
          </h2>
          <button onClick={fetchInventory} className="text-slate-500 hover:text-indigo-600 p-1">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Item Code</th>
                <th className="px-6 py-3">Quantity Available</th>
                <th className="px-6 py-3">Stock Status</th>
                <th className="px-6 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInventory.map(item => {
                const isLow = item.quantity <= (item.low_stock_threshold || 10);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        item.item_type === 'product' ? 'bg-indigo-100 text-indigo-700' :
                        item.item_type === 'fabric' ? 'bg-emerald-100 text-emerald-700' :
                        item.item_type === 'button' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {item.item_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{item.item_name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-bold">{item.item_code || '-'}</td>
                    <td className="px-6 py-4 font-mono font-bold text-base text-slate-900">
                      {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit || 'units'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {isLow ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full w-fit">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Low Stock Alert
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
                          Optimal Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                );
              })}

              {filteredInventory.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No stock records found for this branch selection. Use "Inward / Outward Stock Entry" to add initial stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-600" />
              Branch Stock Inward / Outward Entry
            </h3>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Branch</label>
                  {isAdmin ? (
                    <select
                      value={adjBranchId}
                      onChange={e => setAdjBranchId(Number(e.target.value))}
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Movement Type</label>
                  <select
                    value={adjType}
                    onChange={e => setAdjType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    <option value="IN">Inward (+ Add Stock)</option>
                    <option value="OUT">Outward (- Deduct Stock)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Item Category</label>
                  <select
                    value={adjCategory}
                    onChange={e => setAdjCategory(e.target.value as any)}
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
                    placeholder="e.g. 50"
                    value={adjQuantity}
                    onChange={e => setAdjQuantity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. White Oxford Cotton Shirt (Size L)"
                  value={adjItemName}
                  onChange={e => setAdjItemName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Code / SKU / Design No</label>
                <input
                  type="text"
                  placeholder="e.g. SKU-1002"
                  value={adjItemCode}
                  onChange={e => setAdjItemCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Record Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
