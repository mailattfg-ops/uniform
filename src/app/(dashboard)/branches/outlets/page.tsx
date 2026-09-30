'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  Building2, Plus, Key, Users, RefreshCw, CheckCircle2, ShieldCheck, 
  Mail, Phone, MapPin, Copy, Check, ExternalLink, History,
  X, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AddBranchModal } from '@/app/(dashboard)/employees/_components/AddBranchModal';
import { EmployeeWorkHistoryModal } from '@/app/(dashboard)/employees/_components/EmployeeWorkHistoryModal';
import { formatDate } from '@/lib/formatters';

interface Branch {
  id: number;
  code: string;
  name: string;
  tier: string;
  address: string;
  contact_number: string;
  email: string;
  is_active: boolean;
  employee_count?: number;
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

interface BranchEmployee {
  id: number;
  employee_id: string;
  full_name: string;
  designation: string;
  department: string;
  contact_mobile: string;
  email?: string;
  status: string;
  employment_type?: string;
  branch_id?: number;
  temp_branch_id?: number | null;
  temp_branch_until?: string | null;
  temp_branch_notes?: string | null;
}

export default function BranchOutletsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [branchEmployees, setBranchEmployees] = useState<BranchEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedEmpForHistory, setSelectedEmpForHistory] = useState<any | null>(null);

  // New Branch User State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('Branch Manager');
  const [submittingUser, setSubmittingUser] = useState(false);

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
      const [resBranches, resUsers, resEmployees] = await Promise.all([
        api.get('/branches'),
        api.get('/branches/users/all').catch(() => ({ data: [] })),
        api.get('/branches/employees/all').catch(() => api.get('/employees')).catch(() => ({ data: [] }))
      ]);
      setBranches(resBranches.data || []);
      setBranchUsers(resUsers.data || []);
      setBranchEmployees(resEmployees.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load branch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      setSubmittingUser(true);
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
    } finally {
      setSubmittingUser(false);
    }
  };

  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole(selectedBranch?.tier === 'Factory' ? 'Factory PO Handler' : 'Branch Manager');
  };

  const handleCopyCredentials = (u: BranchUser) => {
    const creds = `Branch: ${u.branches?.name || 'Branch'}\nEmail: ${u.email}\nPassword: ${u.password_plain}`;
    navigator.clipboard.writeText(creds);
    setCopiedId(u.id);
    toast.success('Login credentials copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTierIcon = (tier?: string) => {
    if (tier === 'Corporate') return '🏢';
    if (tier === 'Factory') return '🏭';
    return '🏪';
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'Corporate':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Factory':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Branch':
      default:
        return 'bg-[#2d8d9b]/10 text-[#2d8d9b] border-[#2d8d9b]/20';
    }
  };

  // Branch isolation filtering
  const visibleBranches = isAdmin 
    ? branches 
    : branches.filter(b => b.id === currentUser?.branchId);

  const corporateCount = visibleBranches.filter(b => b.tier === 'Corporate').length;
  const factoryCount = visibleBranches.filter(b => b.tier === 'Factory').length;
  const outletCount = visibleBranches.filter(b => b.tier === 'Branch').length;

  return (
    <div className="space-y-6">
      {/* Forma Header Banner */}
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-[#fce4d4] p-6 md:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center shadow-inner font-black">
            <Building2 size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-[#3a525d]">
                {isAdmin ? 'Multi-Branch Outlets & Access Control' : `${currentUser?.branchName || 'Branch Outlet'} Profile`}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
                {visibleBranches.length} Active {visibleBranches.length === 1 ? 'Unit' : 'Units'}
              </span>
            </div>
            <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.2em] mt-1">
              {isAdmin 
                ? 'Corporate Headquarters, Factory Units & Retail Showrooms Master Hub'
                : `Branch Outlet information and staff credentials for ${currentUser?.branchName || 'your branch'}.`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="w-11 h-11 rounded-2xl border border-[#3a525d]/20 text-[#3a525d] hover:bg-[#3a525d]/5 flex items-center justify-center transition shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-[#3a525d] ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="flex items-center gap-2 px-6 h-11 bg-[#2d8d9b] hover:bg-[#236e7a] rounded-2xl text-xs font-black uppercase tracking-wider text-white transition shadow-lg shadow-[#2d8d9b]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Branch
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards in Forma Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-[#fce4d4] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#3a525d]/10 text-[#3a525d] flex items-center justify-center shadow-inner">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">
              {isAdmin ? 'Active Branch Network' : 'Assigned Branch'}
            </p>
            <p className="text-2xl font-black text-[#3a525d] leading-none mt-1">
              {visibleBranches.length}
            </p>
            <p className="text-[9px] font-bold text-zinc-400 mt-1">
              {corporateCount} HQ • {factoryCount} Factory • {outletCount} Outlets
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-[#fce4d4] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Workforce & Logins</p>
            <p className="text-2xl font-black text-emerald-600 leading-none mt-1">
              {isAdmin ? branchEmployees.length : branchEmployees.filter(e => e.branch_id === currentUser?.branchId).length} Staff
            </p>
            <p className="text-[9px] font-bold text-zinc-400 mt-1">
              {isAdmin ? branchUsers.length : branchUsers.filter(u => u.branch_id === currentUser?.branchId).length} Portal Credentials Provisioned
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-[#fce4d4] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center shadow-inner">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Data & Stock Isolation</p>
            <p className="text-2xl font-black text-[#2d8d9b] leading-none mt-1">Enforced</p>
            <p className="text-[9px] font-bold text-zinc-400 mt-1">Strict multi-tenant security per branch</p>
          </div>
        </div>
      </div>

      {/* Outlets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-[#3a525d] uppercase tracking-wider flex items-center gap-2">
            <Store className="w-4 h-4 text-[#2d8d9b]" />
            {isAdmin ? 'Registered Units & Showrooms' : 'My Branch Details'}
          </h2>
          <span className="text-[10px] font-bold text-[#8b6b5a] uppercase tracking-widest">
            {visibleBranches.length} {visibleBranches.length === 1 ? 'Location' : 'Locations'} Listed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleBranches.map(branch => {
            const users = branchUsers.filter(u => u.branch_id === branch.id);
            const assignedEmployees = branchEmployees.filter(e => e.branch_id === branch.id || e.temp_branch_id === branch.id);
            return (
              <div 
                key={branch.id} 
                className="bg-white rounded-[2.5rem] border border-[#fce4d4] shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-[#2d8d9b]/5 transition-all duration-300 group"
              >
                <div className="p-6 space-y-4">
                  {/* Card Top / Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-mono font-black text-[#2d8d9b] bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 px-3 py-1 rounded-xl">
                        {branch.code}
                      </span>
                      <h3 className="text-lg font-black text-[#3a525d] mt-2 leading-tight">{branch.name}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${getTierBadge(branch.tier)}`}>
                      {getTierIcon(branch.tier)} {branch.tier}
                    </span>
                  </div>

                  {/* Branch Contact Information */}
                  <div className="text-xs space-y-2 pt-3 border-t border-[#fce4d4]/60">
                    <p className="flex items-center gap-2 text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#2d8d9b] shrink-0" />
                      <span className="truncate">{branch.address || 'Address not configured'}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-600 font-medium">
                      <Phone className="w-3.5 h-3.5 text-[#2d8d9b] shrink-0" />
                      <span>{branch.contact_number || 'No contact phone'}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-600 font-medium">
                      <Mail className="w-3.5 h-3.5 text-[#2d8d9b] shrink-0" />
                      <span className="truncate">{branch.email || 'No official email'}</span>
                    </p>
                  </div>

                  {/* Branch Assigned Personnel / Staff */}
                  <div className="bg-[#fce4d4]/10 p-4 rounded-2xl border border-[#fce4d4] space-y-2">
                    <div className="flex justify-between items-center text-xs font-black text-[#3a525d]">
                      <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-[#8b6b5a]">
                        <Users className="w-3.5 h-3.5 text-[#2d8d9b]" />
                        Assigned Personnel ({assignedEmployees.length})
                      </span>
                      {isAdmin && (
                        <Link 
                          href="/employees/directory" 
                          className="text-[10px] text-[#2d8d9b] hover:underline flex items-center gap-1 font-black uppercase tracking-wider"
                          title="Manage in HRMS"
                        >
                          HRMS <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>

                    {assignedEmployees.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {assignedEmployees.map(emp => {
                          const isDeputedHere = emp.temp_branch_id === branch.id;
                          const isAwayDeputed = emp.branch_id === branch.id && emp.temp_branch_id;
                          return (
                            <div key={emp.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-zinc-100 text-xs">
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEmpForHistory(emp)}
                                    className="font-bold text-[#3a525d] hover:text-[#2d8d9b] hover:underline text-left truncate cursor-pointer transition-colors"
                                    title="View Career & Movement History"
                                  >
                                    {emp.full_name}
                                  </button>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold">
                                    {emp.employee_id}
                                  </span>
                                  {isDeputedHere ? (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                      ✈️ Deputed Here
                                    </span>
                                  ) : isAwayDeputed ? (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      ✈️ Away on Duty
                                    </span>
                                  ) : (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                      emp.employment_type === 'Permanent' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                      emp.employment_type === 'Contract' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                      'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                      {emp.employment_type || 'Permanent'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-zinc-400 text-[10px] font-medium mt-0.5">
                                  {emp.designation || 'Staff'} • <span className="text-[#2d8d9b] font-bold">{emp.department}</span>
                                  {isDeputedHere && emp.temp_branch_until && (
                                    <span className="text-amber-800 ml-1 font-bold">
                                      (Until {formatDate(emp.temp_branch_until)})
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  type="button"
                                  onClick={() => setSelectedEmpForHistory(emp)}
                                  className="p-1.5 text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 rounded-lg transition"
                                  title="View Career & Movement History"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                                {emp.contact_mobile && (
                                  <a 
                                    href={`tel:${emp.contact_mobile}`}
                                    className="p-1.5 text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 rounded-lg transition"
                                    title={emp.contact_mobile}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-400 italic py-1">No personnel assigned to this branch yet.</p>
                    )}
                  </div>

                  {/* Branch Credentials Preview */}
                  <div className="bg-[#fce4d4]/10 p-4 rounded-2xl border border-[#fce4d4] space-y-2">
                    <div className="flex justify-between items-center text-xs font-black text-[#3a525d]">
                      <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-[#8b6b5a]">
                        <Key className="w-3.5 h-3.5 text-[#2d8d9b]" />
                        Portal Login Accounts ({users.length})
                      </span>
                    </div>

                    {users.length > 0 ? (
                      <div className="space-y-1.5">
                        {users.map(u => (
                          <div key={u.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-zinc-100 text-xs">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-[#3a525d]">{u.name}</p>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                  u.role?.includes('Factory') ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  u.role === 'Branch Manager' ? 'bg-[#2d8d9b]/10 text-[#2d8d9b] border-[#2d8d9b]/20' :
                                  'bg-zinc-100 text-zinc-700 border-zinc-200'
                                }`}>
                                  {u.role || 'Staff'}
                                </span>
                              </div>
                              <p className="text-zinc-500 font-mono text-[11px] mt-0.5">{u.email}</p>
                            </div>
                            <button
                              onClick={() => handleCopyCredentials(u)}
                              className="p-1.5 text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 rounded-lg transition"
                              title="Copy Credentials"
                            >
                              {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-400 italic py-1">No specific login credentials created yet.</p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 bg-zinc-50/70 border-t border-zinc-100 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Active Outlet
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedBranch(branch);
                        setUserRole(branch.tier === 'Factory' ? 'Factory PO Handler' : 'Branch Manager');
                        setShowUserModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#2d8d9b] hover:text-white hover:bg-[#2d8d9b] px-3.5 py-1.5 rounded-xl transition border border-[#2d8d9b]/30 shadow-xs cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      + Add Account
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {visibleBranches.length === 0 && !loading && (
            <div className="col-span-full bg-white p-12 rounded-[2.5rem] border border-[#fce4d4] text-center space-y-3">
              <Building2 size={36} className="text-[#2d8d9b] mx-auto opacity-50" />
              <h3 className="text-base font-black text-[#3a525d]">No Branches Configured</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No branch outlets found. Click "Add New Branch" above to register your first corporate headquarters, factory unit, or retail showroom.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Shared Add Branch Modal (Identical to Staff Management) */}
      <AddBranchModal 
        isOpen={showAddBranchModal}
        onClose={() => setShowAddBranchModal(false)}
        onSuccess={() => {
          setShowAddBranchModal(false);
          fetchData();
        }}
      />

      {/* Add User Credentials Modal in Forma Style */}
      {showUserModal && selectedBranch && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-[#fce4d4] max-w-md w-full p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center shadow-inner">
                  <Key size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#3a525d] tracking-tight">Provision Portal Access</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    For {selectedBranch.name} ({selectedBranch.tier})
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowUserModal(false)} 
                className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">
                  Staff / Manager Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">
                  Official Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@forma.com"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">
                  Password *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Set login password"
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">
                  Assigned Operational Role *
                </label>
                <select
                  value={userRole}
                  onChange={e => setUserRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
                >
                  {selectedBranch.tier === 'Factory' ? (
                    <>
                      <option value="Factory PO Handler">🏭 Factory PO Handler (Job Cards Gatekeeper)</option>
                      <option value="Factory Production Staff">⚙️ Factory Production Staff (Floor Stages)</option>
                    </>
                  ) : (
                    <>
                      <option value="Branch Manager">🏪 Branch Manager (Full Outlet & Sizing Authority)</option>
                      <option value="Branch Staff">👔 Branch Staff (Counter Sales, Quotes & Stock)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-6 py-2.5 rounded-xl bg-[#2d8d9b] hover:bg-[#236e7a] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#2d8d9b]/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Key size={14} />
                  {submittingUser ? 'Generating...' : 'Generate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Career & Movement History Modal */}
      <EmployeeWorkHistoryModal
        isOpen={Boolean(selectedEmpForHistory)}
        onClose={() => setSelectedEmpForHistory(null)}
        onUpdated={fetchData}
        employee={selectedEmpForHistory}
        branches={branches}
      />
    </div>
  );
}
