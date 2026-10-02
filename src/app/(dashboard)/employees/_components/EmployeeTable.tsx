'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Briefcase, 
  Key, 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Users, 
  Factory, 
  CheckCircle, 
  Clock, 
  X, 
  ChevronLeft, 
  ChevronRight,
  PlaneTakeoff,
  ArrowRightLeft,
  History
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { AddBranchModal } from './AddBranchModal';
import { TemporaryDeputationModal } from './TemporaryDeputationModal';
import { EmployeeWorkHistoryModal } from './EmployeeWorkHistoryModal';
import { formatDate } from '@/lib/formatters';

export interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  designation: string;
  department: string;
  contact_mobile: string;
  email?: string;
  joining_date?: string;
  status: string;
  branch_id?: number | null;
  employment_type?: string;
  temp_branch_id?: number | null;
  temp_branch_until?: string | null;
  temp_branch_notes?: string | null;
  branches?: {
    id: number;
    name: string;
    code: string;
    tier: string;
    address?: string;
  } | null;
  temp_branches?: {
    id: number;
    name: string;
    code: string;
    tier: string;
    address?: string;
  } | null;
  user_id?: number | string | null;
  user?: {
    id: number | string;
    email?: string;
    role?: string;
  } | null;
  user_profiles?: any;
  created_at: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
  tier: string;
}

interface EmployeeTableProps {
  onRegister: () => void;
  onEdit: (employee: Employee) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ onRegister, onEdit }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sorting State
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'dept' | 'branch' | 'type' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modals state
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [resetConfirm, setResetConfirm] = useState<{ isOpen: boolean; employee: Employee | null }>({
    isOpen: false,
    employee: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });
  const [deputeModal, setDeputeModal] = useState<{ isOpen: boolean; employee: Employee | null }>({
    isOpen: false,
    employee: null
  });
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; employee: Employee | null }>({
    isOpen: false,
    employee: null
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resEmp, resBranches] = await Promise.all([
        api.get('/employees'),
        api.get('/branches').catch(() => ({ data: [] }))
      ]);
      setEmployees(resEmp.data || []);
      setBranches(resBranches.data || []);
    } catch (err) {
      toast.error('Failed to load employee list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Removing employee records...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/employees/${deleteConfirm.id}`);
      toast.success('Employee successfully removed from directory', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete employee profile', { id: loadingToast });
    }
  };

  const handleConfirmedReset = async () => {
    if (!resetConfirm.employee) return;
    const emp = resetConfirm.employee;
    const loadingToast = toast.loading('Generating secure staff credentials...');
    setResetConfirm({ isOpen: false, employee: null });
    
    try {
      const response = await api.post(`/employees/${emp.id}/reset-password`);
      setCredsModal({
        isOpen: true,
        data: {
          full_name: emp.full_name,
          username: response.data.username,
          password: response.data.newPassword
        }
      });
      toast.success('Staff password reset successfully', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to reset staff password', { id: loadingToast });
    }
  };

  // Distinct Departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Distinct Employment Types
  const employmentTypes = useMemo(() => {
    const set = new Set<string>(['Permanent', 'Temporary', 'Contract', 'Probation', 'Intern']);
    employees.forEach(e => {
      if (e.employment_type) set.add(e.employment_type);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered & Sorted Employees
  const processedEmployees = useMemo(() => {
    return employees.filter(e => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = e.full_name?.toLowerCase().includes(query);
        const matchesId = e.employee_id?.toLowerCase().includes(query);
        const matchesDesig = e.designation?.toLowerCase().includes(query);
        const matchesDept = e.department?.toLowerCase().includes(query);
        const matchesBranch = e.branches?.name?.toLowerCase().includes(query) || e.branches?.code?.toLowerCase().includes(query);
        const matchesPhone = e.contact_mobile?.includes(query);
        if (!matchesName && !matchesId && !matchesDesig && !matchesDept && !matchesBranch && !matchesPhone) {
          return false;
        }
      }

      // Branch filter
      if (filterBranch !== 'all') {
        const bId = e.branch_id || e.branches?.id;
        if (String(bId) !== String(filterBranch)) return false;
      }

      // Department filter
      if (filterDept !== 'all' && e.department !== filterDept) {
        return false;
      }

      // Employment Type filter
      if (filterType !== 'all') {
        const empType = e.employment_type || 'Permanent';
        if (empType !== filterType) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        const statusVal = e.status || 'Active';
        if (statusVal !== filterStatus) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.full_name || '').localeCompare(b.full_name || '');
      } else if (sortBy === 'id') {
        comparison = (a.employee_id || '').localeCompare(b.employee_id || '');
      } else if (sortBy === 'dept') {
        comparison = (a.department || '').localeCompare(b.department || '');
      } else if (sortBy === 'branch') {
        const branchA = a.branches?.name || '';
        const branchB = b.branches?.name || '';
        comparison = branchA.localeCompare(branchB);
      } else if (sortBy === 'type') {
        comparison = (a.employment_type || 'Permanent').localeCompare(b.employment_type || 'Permanent');
      } else if (sortBy === 'status') {
        comparison = (a.status || 'Active').localeCompare(b.status || 'Active');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [employees, searchTerm, filterBranch, filterDept, filterType, filterStatus, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(processedEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedEmployees.slice(start, start + pageSize);
  }, [processedEmployees, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBranch, filterDept, filterType, filterStatus, pageSize]);

  // Metric summaries
  const kpiTotal = employees.length;
  const kpiPermanent = employees.filter(e => !e.employment_type || e.employment_type === 'Permanent').length;
  const kpiContractTemp = employees.filter(e => e.employment_type === 'Contract' || e.employment_type === 'Temporary').length;
  const kpiFactoryStaff = employees.filter(e => e.branches?.tier === 'Factory').length;
  const kpiActive = employees.filter(e => !e.status || e.status === 'Active').length;

  const hasActiveFilters = searchTerm !== '' || filterBranch !== 'all' || filterDept !== 'all' || filterType !== 'all' || filterStatus !== 'all';

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterBranch('all');
    setFilterDept('all');
    setFilterType('all');
    setFilterStatus('all');
  };

  const getTierIcon = (tier?: string) => {
    if (tier === 'Corporate') return '🏢';
    if (tier === 'Factory') return '🏭';
    return '🏪';
  };

  const getTypeBadgeStyle = (type?: string) => {
    switch (type) {
      case 'Permanent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Temporary':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Contract':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Probation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Intern':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top HRMS KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-[#fce4d4] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#3a525d]/10 text-[#3a525d] flex items-center justify-center shadow-inner">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Total Workforce</p>
            <p className="text-2xl font-black text-[#3a525d] leading-none mt-1">{kpiTotal}</p>
            <p className="text-[9px] font-bold text-zinc-400 mt-1">{employees.filter(e => e.user_id).length} Portal Logins • {employees.filter(e => !e.user_id).length} Floor Only</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-[#fce4d4] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Permanent Staff</p>
            <p className="text-2xl font-black text-emerald-600 leading-none mt-1">{kpiPermanent}</p>
            <p className="text-[9px] font-bold text-zinc-400 mt-1">{Math.round((kpiPermanent / (kpiTotal || 1)) * 100)}% of total team</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-[#fce4d4] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Contract & Temp</p>
            <p className="text-2xl font-black text-purple-600 leading-none mt-1">{kpiContractTemp}</p>
            <p className="text-[9px] font-bold text-zinc-400 mt-1">Flexible Operations</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-[#fce4d4] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
            <Factory size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Factory Floor Unit</p>
            <p className="text-2xl font-black text-amber-600 leading-none mt-1">{kpiFactoryStaff}</p>
            <p className="text-[9px] font-bold text-zinc-400 mt-1">Production Hub Personnel</p>
          </div>
        </div>
      </div>

      {/* Main HRMS Data Card */}
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-[#fce4d4] overflow-hidden shadow-sm">
        {/* Header & Primary Actions */}
        <div className="p-6 md:p-8 border-b border-[#fce4d4] bg-[#fce4d4]/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-[#3a525d]">Unified HRMS Staff Directory</h3>
            <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.2em] mt-1">
              Multi-Branch Workforce & Personnel Master Control
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setShowAddBranch(true)}
              variant="outline"
              className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.15em] px-5 border-[#3a525d]/30 text-[#3a525d] hover:bg-[#3a525d]/10 hover:text-[#3a525d] transition-all"
            >
              <Building2 size={15} className="text-[#2d8d9b]" />
              + Add New Branch
            </Button>
            <Button 
              onClick={onRegister}
              className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white border-none shadow-lg shadow-[#3a525d]/20 transition-all hover:scale-105 active:scale-95"
            >
              <UserPlus size={15} strokeWidth={3} />
              + Add New Staff
            </Button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-6 border-b border-[#fce4d4] bg-[#fce4d4]/5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative group lg:col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/60 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, phone, role..." 
                className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 pl-11 pr-10 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 text-[#3a525d] shadow-sm transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 px-3 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 shadow-sm transition-all"
              >
                <option value="all">🏢 All Branches & Units</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {getTierIcon(b.tier)} {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 px-3 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 shadow-sm transition-all"
              >
                <option value="all">📂 All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Employment Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full bg-white border border-[#fce4d4] rounded-2xl py-3 px-3 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 shadow-sm transition-all"
              >
                <option value="all">📄 All Contract Types</option>
                {employmentTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub Toolbar: Status, Sort, Rows per page & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8b6b5a]">Status:</span>
              {['all', 'Active', 'Notice', 'Deactivated'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                    filterStatus === status 
                      ? 'bg-[#3a525d] text-white shadow-sm' 
                      : 'bg-white border border-[#fce4d4] text-[#8b6b5a] hover:bg-slate-50'
                  }`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition"
                >
                  <X size={12} /> Clear Filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a525d]">
                <ArrowUpDown size={14} className="text-[#2d8d9b]" />
                <span className="text-[10px] uppercase font-black text-[#8b6b5a]">Sort:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={e => {
                    const [f, o] = e.target.value.split('-');
                    setSortBy(f as any);
                    setSortOrder(o as any);
                  }}
                  className="bg-white border border-[#fce4d4] rounded-xl py-1.5 px-2 text-[11px] font-bold text-[#3a525d] outline-none"
                >
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                  <option value="id-asc">Employee ID (Asc)</option>
                  <option value="id-desc">Employee ID (Desc)</option>
                  <option value="branch-asc">Branch (A → Z)</option>
                  <option value="dept-asc">Department (A → Z)</option>
                  <option value="type-asc">Employment Type</option>
                  <option value="status-asc">Status</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a525d]">
                <span className="text-[10px] uppercase font-black text-[#8b6b5a]">Show:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="bg-white border border-[#fce4d4] rounded-xl py-1.5 px-2 text-[11px] font-bold text-[#3a525d] outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto pb-2 relative">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-[#fce4d4]/20 border-b border-[#fce4d4]">
                <th className="px-4 py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase text-[#8b6b5a] whitespace-nowrap">
                  Employee Details
                </th>
                <th className="px-4 py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase text-[#8b6b5a] whitespace-nowrap">
                  Assigned Branch
                </th>
                <th className="px-4 py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase text-[#8b6b5a] whitespace-nowrap">
                  Designation & Dept
                </th>
                <th className="px-4 py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase text-[#8b6b5a] whitespace-nowrap">
                  Contract Type
                </th>
                <th className="px-4 py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase text-[#8b6b5a] whitespace-nowrap">
                  Contact Info
                </th>
                <th className="px-4 py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase text-[#8b6b5a] whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase text-[#8b6b5a] whitespace-nowrap text-right sticky right-0 bg-[#fef7f2] z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-5 bg-zinc-100 rounded-xl w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedEmployees.length > 0 ? (
                paginatedEmployees.map(e => {
                  const homeBranch = e.branches || (e.branch_id ? branches.find(b => b.id === e.branch_id || String(b.id) === String(e.branch_id)) : null);
                  const tempBranch = e.temp_branches || (e.temp_branch_id ? branches.find(b => b.id === e.temp_branch_id || String(b.id) === String(e.temp_branch_id)) : null);
                  const isOnDeputation = Boolean(e.temp_branch_id);

                  return (
                    <tr key={e.id} className="hover:bg-[#fce4d4]/5 transition-colors group">
                      {/* Employee Details */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setHistoryModal({ isOpen: true, employee: e })}
                            className="w-10 h-10 rounded-2xl bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 flex items-center justify-center font-black text-[#2d8d9b] text-xs shadow-xs uppercase hover:scale-105 hover:bg-[#2d8d9b] hover:text-white transition-all cursor-pointer"
                            title="Click to view career & movement history"
                          >
                            {e.full_name?.charAt(0) || 'E'}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => setHistoryModal({ isOpen: true, employee: e })}
                              className="font-bold text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline leading-none text-left cursor-pointer transition-colors"
                              title="Click to view career & movement history"
                            >
                              {e.full_name}
                            </button>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">{e.employee_id}</p>
                              {e.user_id ? (
                                <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded">
                                  🔑 Portal User
                                </span>
                              ) : (
                                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                  Workforce Only
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Branch */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isOnDeputation ? (
                          <div className="flex flex-col gap-1.5 min-w-[210px] max-w-[260px]">
                            {/* Deputed Branch (Active Duty) */}
                            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 text-amber-900 shadow-xs">
                              <div className="flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider text-amber-800">
                                <span className="flex items-center gap-1">
                                  <PlaneTakeoff size={11} className="text-amber-600 shrink-0" />
                                  ✈️ Deputed At
                                </span>
                                {tempBranch?.code && (
                                  <span className="font-mono text-[9px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950 font-bold">
                                    {tempBranch.code}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#3a525d]">
                                <span>{getTierIcon(tempBranch?.tier)}</span>
                                <span className="truncate">{tempBranch?.name || `Branch #${e.temp_branch_id}`}</span>
                              </div>
                              {e.temp_branch_until && (
                                <div className="mt-1 text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                                  <Clock size={10} className="text-amber-600 shrink-0" />
                                  <span>Until {formatDate(e.temp_branch_until)}</span>
                                </div>
                              )}
                            </div>

                            {/* Permanent Home Base */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">🏠 Home:</span>
                              {homeBranch ? (
                                <span className="truncate text-slate-700 font-semibold flex items-center gap-1" title={`${homeBranch.name} (${homeBranch.code})`}>
                                  <span>{getTierIcon(homeBranch.tier)}</span>
                                  <span className="truncate">{homeBranch.name}</span>
                                  <span className="text-[9px] font-mono text-slate-400 font-bold">({homeBranch.code})</span>
                                </span>
                              ) : (
                                <span className="italic text-slate-400 text-[10px]">Unassigned HQ Floater</span>
                              )}
                            </div>
                          </div>
                        ) : homeBranch ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a525d]">
                              <span>{getTierIcon(homeBranch.tier)}</span>
                              <span className="truncate max-w-[190px]">{homeBranch.name}</span>
                              <span className="text-[9px] font-mono text-zinc-400 font-bold">({homeBranch.code})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-[#2d8d9b] bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 px-2 py-0.5 rounded-md">
                                {homeBranch.tier === 'Corporate' ? '🏢 HQ Corporate' : homeBranch.tier === 'Factory' ? '🏭 Factory Unit' : '🏪 Retail Outlet'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-zinc-400 italic">Unassigned (HQ Floater)</span>
                            <span className="text-[9px] text-zinc-300 font-mono">No base branch set</span>
                          </div>
                        )}
                      </td>

                      {/* Designation & Dept */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a525d]">
                            <Briefcase size={12} className="text-[#2d8d9b]" />
                            {e.designation || 'Staff'}
                          </div>
                          <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-wider opacity-75">
                            {e.department || 'General'}
                          </p>
                        </div>
                      </td>

                      {/* Contract Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${getTypeBadgeStyle(e.employment_type)}`}>
                          {e.employment_type || 'Permanent'}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                          <div className="flex items-center gap-1.5">
                            <Phone size={11} className="text-[#2d8d9b]" />
                            <span>{e.contact_mobile || 'No Phone'}</span>
                          </div>
                          {e.email && (
                            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                              <Mail size={11} />
                              <span className="truncate max-w-[150px]">{e.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full ${
                          e.status === 'Active' || !e.status ? 'bg-green-500/10 text-green-700' :
                          e.status === 'Notice' ? 'bg-amber-500/10 text-amber-700' :
                          'bg-red-500/10 text-red-600'
                        }`}>
                          {e.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-[#fef9f6] z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors">
                        <div className="flex items-center justify-end gap-2">
                          {/* Work History Button */}
                          <Button
                            onClick={() => setHistoryModal({ isOpen: true, employee: e })}
                            variant="none"
                            className="p-2 h-8 w-8 flex items-center justify-center rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white transition-all shadow-xs border border-teal-200"
                            title="View Staff Career & Movement Ledger"
                          >
                            <History size={14} className="shrink-0" />
                          </Button>
                          {/* Temporary Deputation Button */}
                          <Button
                            onClick={() => setDeputeModal({ isOpen: true, employee: e })}
                            variant="none"
                            className={`p-2 h-8 w-8 flex items-center justify-center rounded-lg transition-all shadow-xs border ${
                              e.temp_branch_id 
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-600 hover:text-white border-amber-300' 
                                : 'bg-slate-50 text-slate-600 hover:bg-amber-500 hover:text-white border-slate-200'
                            }`}
                            title={e.temp_branch_id ? "Manage Temporary Deputation (Currently Deputed)" : "Assign Temporary Branch Deputation"}
                          >
                            <PlaneTakeoff size={14} className="shrink-0" />
                          </Button>
                          <Button
                            onClick={() => setResetConfirm({ isOpen: true, employee: e })}
                            variant="none"
                            className={`p-2 h-8 w-8 flex items-center justify-center rounded-lg transition-all shadow-xs border ${
                              e.user_id 
                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border-amber-200' 
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white border-indigo-200'
                            }`}
                            title={e.user_id ? "Reset ERP Password" : "Grant Portal Login Access"}
                          >
                            <Key size={14} className="shrink-0" />
                          </Button>
                          <Button
                            onClick={() => onEdit(e)}
                            variant="none"
                            className="p-2 h-8 w-8 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-xs border border-[#2d8d9b]/20"
                            title="Edit Profile"
                          >
                            <Edit2 size={14} className="shrink-0" />
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirm({ isOpen: true, id: e.id })}
                            variant="none"
                            className="p-2 h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xs border border-red-200"
                            title="Remove Staff"
                          >
                            <Trash2 size={14} className="shrink-0" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Search size={36} className="text-[#2d8d9b]" />
                      <p className="text-base font-black italic text-[#3a525d]">No staff records matching filters</p>
                      <button 
                        onClick={clearAllFilters}
                        className="text-xs font-bold text-[#2d8d9b] underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modern Pagination Footer */}
        <div className="p-6 border-t border-[#fce4d4] flex flex-col md:flex-row justify-between items-center gap-4 bg-[#fce4d4]/5">
          <span className="text-[10px] md:text-[11px] text-[#8b6b5a] font-black uppercase tracking-[0.2em] text-center md:text-left">
            Showing <span className="text-[#2d8d9b] text-sm font-black">{Math.min(processedEmployees.length, (currentPage - 1) * pageSize + 1)}</span> to <span className="text-[#2d8d9b] text-sm font-black">{Math.min(processedEmployees.length, currentPage * pageSize)}</span> of <span className="text-[#2d8d9b] text-sm font-black">{processedEmployees.length}</span> staff members
          </span>

          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 h-auto text-[10px] font-black tracking-widest rounded-xl border border-zinc-200 bg-white uppercase disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              Prev
            </Button>
            
            <div className="text-xs font-bold text-[#3a525d] px-2">
              Page {currentPage} of {totalPages}
            </div>

            <Button 
              variant="secondary" 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-4 py-2 h-auto text-[10px] font-black tracking-widest rounded-xl border border-zinc-200 bg-white uppercase disabled:opacity-30 flex items-center gap-1"
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Add Branch Modal */}
      <AddBranchModal 
        isOpen={showAddBranch}
        onClose={() => setShowAddBranch(false)}
        onSuccess={() => {
          setShowAddBranch(false);
          fetchData();
        }}
      />

      {/* Confirmation Modals */}
      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Remove Employee Profile?"
        message="This will delete the employee record and disconnect their ERP access. This action is permanent."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Deactivate & Delete"
        variant="danger"
      />

      <ConfirmModal 
        isOpen={resetConfirm.isOpen}
        title={resetConfirm.employee?.user_id ? "Reset Staff Password?" : "Grant Portal Login Access?"}
        message={
          resetConfirm.employee?.user_id 
            ? `Generate a new secure login password for ${resetConfirm.employee?.full_name}? The old password will be revoked immediately.`
            : `Provision a new ERP Portal account and login credentials for ${resetConfirm.employee?.full_name}?`
        }
        onConfirm={handleConfirmedReset}
        onCancel={() => setResetConfirm({ isOpen: false, employee: null })}
        confirmLabel={resetConfirm.employee?.user_id ? "Reset Credentials" : "Grant Portal Access"}
        variant="warning"
      />

      <CredentialsModal 
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

      <TemporaryDeputationModal
        isOpen={deputeModal.isOpen}
        onClose={() => setDeputeModal({ isOpen: false, employee: null })}
        onSuccess={() => {
          fetchData();
        }}
        employee={deputeModal.employee}
        branches={branches}
      />

      <EmployeeWorkHistoryModal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal({ isOpen: false, employee: null })}
        onUpdated={() => {
          fetchData();
        }}
        employee={historyModal.employee}
        branches={branches}
      />
    </div>
  );
};
