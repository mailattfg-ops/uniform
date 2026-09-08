'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Building2, Plus, Key, Users, RefreshCw, CheckCircle, ShieldCheck, Mail, Lock, Phone, MapPin, Copy, Check } from 'lucide-react';
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
  created_at: string;
}

interface BranchUser {
  id: number;
  branch_id: number;
  name: string;
  email: string;
  password_plain: string;
  role: string;
  is_active: boolean;
  branches?: { name: string; code: string };
}

export default function BranchOutletsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // New Branch Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState('Branch');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  // New Branch User State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('Branch Manager');

  // Copy state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {}
    }
  }, []);

  const isAdmin = !currentUser?.branchId || currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'SuperAdmin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resBranches, resUsers] = await Promise.all([
        api.get('/branches'),
        api.get('/branches/users/all').catch(() => ({ data: [] }))
      ]);
      setBranches(resBranches.data || []);
      setBranchUsers(resUsers.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load branch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        email,
        manager_name: managerName,
        manager_email: managerEmail,
        manager_password: managerPassword
      });
      toast.success('Branch & Login Credentials created!');
      setShowAddBranchModal(false);
      resetBranchForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create branch');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      await api.post('/branches/users', {
        branch_id: selectedBranch.id,
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole
      });
      toast.success(`User credentials created for ${selectedBranch.name}`);
      setShowUserModal(false);
      resetUserForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create branch user');
    }
  };

  const resetBranchForm = () => {
    setCode('');
    setName('');
    setTier('Branch');
    setAddress('');
    setContactNumber('');
    setEmail('');
    setManagerName('');
    setManagerEmail('');
    setManagerPassword('');
  };

  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('Branch Manager');
  };

  const handleCopyCredentials = (u: BranchUser) => {
    const creds = `Branch: ${u.branches?.name || 'Branch'}\nEmail: ${u.email}\nPassword: ${u.password_plain}`;
    navigator.clipboard.writeText(creds);
    setCopiedId(u.id);
    toast.success('Login credentials copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Branch isolation filtering
  const visibleBranches = isAdmin 
    ? branches 
    : branches.filter(b => b.id === currentUser?.branchId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold">
              {isAdmin ? 'Multi-Branch Outlets & Access Control' : `${currentUser?.branchName || 'Branch Outlet'} Profile`}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin 
              ? 'Manage physical retail outlets, regional branches, factory hubs, and generate isolated branch login credentials.'
              : `Branch Outlet information and staff credentials for ${currentUser?.branchName || 'your branch'}.`
            }
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

          {isAdmin && (
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              Add New Branch & Credentials
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{isAdmin ? 'Total Active Outlets' : 'My Outlet'}</p>
            <p className="text-2xl font-bold text-slate-900">{visibleBranches.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Logins & Staff</p>
            <p className="text-2xl font-bold text-slate-900">
              {isAdmin ? branchUsers.length : branchUsers.filter(u => u.branch_id === currentUser?.branchId).length} Accounts
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Isolation</p>
            <p className="text-2xl font-bold text-slate-900">Enforced Per Branch</p>
          </div>
        </div>
      </div>

      {/* Outlets Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          {isAdmin ? 'Registered Branch Outlets' : 'My Branch Details'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleBranches.map(branch => {
            const users = branchUsers.filter(u => u.branch_id === branch.id);
            return (
              <div key={branch.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition">
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                        {branch.code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{branch.name}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      branch.tier === 'Corporate' ? 'bg-purple-100 text-purple-700' :
                      branch.tier === 'Factory' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {branch.tier}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                    <p className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {branch.address || 'Address not configured'}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      {branch.contact_number || 'No contact phone'}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      {branch.email || 'No official email'}
                    </p>
                  </div>

                  {/* Branch Credentials Preview */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 mt-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-600" />
                        Assigned Credentials ({users.length})
                      </span>
                    </div>

                    {users.length > 0 ? (
                      <div className="space-y-1.5">
                        {users.map(u => (
                          <div key={u.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                            <div>
                              <p className="font-semibold text-slate-800">{u.name}</p>
                              <p className="text-slate-500 font-mono text-[11px]">{u.email}</p>
                            </div>
                            <button
                              onClick={() => handleCopyCredentials(u)}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                              title="Copy Credentials"
                            >
                              {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No specific login credentials created yet.</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Active Outlet
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedBranch(branch);
                        setShowUserModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Add Login Account
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {visibleBranches.length === 0 && !loading && (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              No branch outlet assigned to this user account.
            </div>
          )}
        </div>
      </div>

      {/* Add Branch Modal */}
      {showAddBranchModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Register New Branch Outlet
            </h3>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700">
                Each branch outlet will operate with isolated stock and can have dedicated login credentials.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-KOCHI-01"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tier / Type</label>
                  <select
                    value={tier}
                    onChange={e => setTier(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    <option value="Branch">Retail Branch Outlet</option>
                    <option value="Factory">Factory Production Hub</option>
                    <option value="Corporate">Corporate Regional HQ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Outlet Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calicut Central Retail Outlet"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address Location</label>
                <input
                  type="text"
                  placeholder="Full street address, city, state"
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
                    placeholder="+91 98765 43210"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Official Email</label>
                  <input
                    type="email"
                    placeholder="branch@formaapparels.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Initial Manager Credentials */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600" />
                  Initial Branch Manager Credentials (Optional)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Manager Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={managerName}
                    onChange={e => setManagerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Login Email</label>
                    <input
                      type="email"
                      placeholder="rajesh.calicut@forma.com"
                      value={managerEmail}
                      onChange={e => setManagerEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                    <input
                      type="text"
                      placeholder="e.g. Branch@2026"
                      value={managerPassword}
                      onChange={e => setManagerPassword(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Create Branch Outlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Credentials Modal */}
      {showUserModal && selectedBranch && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Add Login Credentials for {selectedBranch.name}
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Staff / Manager Name</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Login Email</label>
                <input
                  type="email"
                  required
                  placeholder="user@branch.com"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Login Password</label>
                <input
                  type="text"
                  required
                  placeholder="Set Password"
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Role</label>
                <select
                  value={userRole}
                  onChange={e => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="Branch Manager">Branch Manager (Full Outlet Control)</option>
                  <option value="Branch Staff">Branch Staff (Stock & Sales Only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Generate Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
