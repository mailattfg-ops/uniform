'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { 
  UserPlus, 
  ArrowLeft, 
  ShieldCheck, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  Key,
  Sparkles,
  ShieldAlert,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Settings2,
  Lock
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { 
  AVAILABLE_PERMISSIONS, 
  PERMISSION_CATEGORIES, 
  ROLE_PRESETS, 
  getDefaultPermissionsForDepartment,
  RolePreset 
} from '@/lib/permissions';

interface EmployeeRegisterFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export const EmployeeRegisterForm: React.FC<EmployeeRegisterFormProps> = ({ onCancel, onSuccess, initialData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  // Form State
  const [branches, setBranches] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialData?.branch_id ? String(initialData.branch_id) : (initialData?.branches?.id ? String(initialData.branches.id) : '')
  );
  const [employmentType, setEmploymentType] = useState<string>(initialData?.employment_type || 'Permanent');
  const [department, setDepartment] = useState<string>(initialData?.department || 'Production & Tailoring');
  const [designation, setDesignation] = useState<string>(initialData?.designation || '');
  const [hasLoginAccess, setHasLoginAccess] = useState<boolean>(initialData?.user_id ? true : false);
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [phone, setPhone] = useState(initialData?.contact_mobile || '');

  // Role and Permission Assignment State
  const [assignedPermissions, setAssignedPermissions] = useState<string[]>([]);
  const [isFeatureAssignerOpen, setIsFeatureAssignerOpen] = useState<boolean>(true);
  const [permissionSearch, setPermissionSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hasManuallyEditedPerms, setHasManuallyEditedPerms] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [branchesRes, rolesRes] = await Promise.all([
          api.get('/branches'),
          api.get('/user/types')
        ]);
        setBranches(branchesRes.data || []);
        setRoles(rolesRes.data || []);
      } catch (err) {
        console.error('Failed to load branches or user roles', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (initialData) {
      setSelectedBranchId(
        initialData.branch_id ? String(initialData.branch_id) : (initialData.branches?.id ? String(initialData.branches.id) : '')
      );
      setEmploymentType(initialData.employment_type || 'Permanent');
      setDepartment(initialData.department || 'Production & Tailoring');
      setDesignation(initialData.designation || '');
      setHasLoginAccess(Boolean(initialData.user_id));
      setFullName(initialData.full_name || '');
      setPhone(initialData.contact_mobile || '');
    } else {
      setSelectedBranchId('');
      setEmploymentType('Permanent');
      setDepartment('Production & Tailoring');
      setDesignation('');
      setHasLoginAccess(false);
      setFullName('');
      setPhone('');
    }
  }, [initialData]);

  // Compute Combo Role Name
  const comboRoleName = useMemo(() => {
    const cleanDes = designation.trim();
    const cleanDep = department.trim();
    if (cleanDes && cleanDep) return `${cleanDes} - ${cleanDep}`;
    return cleanDes || cleanDep || '';
  }, [designation, department]);

  // Determine if combo or designation exists in roles
  const matchedRole = useMemo(() => {
    if (!comboRoleName && !designation.trim()) return null;
    const cleanCombo = comboRoleName.toLowerCase();
    const cleanDes = designation.trim().toLowerCase();

    // 1. Check exact combo match
    const exact = roles.find(r => r.name?.toLowerCase() === cleanCombo);
    if (exact) return exact;

    // 2. Check designation exact match
    if (cleanDes) {
      const byDes = roles.find(r => r.name?.toLowerCase() === cleanDes);
      if (byDes) return byDes;
    }

    return null;
  }, [roles, comboRoleName, designation]);

  const isNewRole = Boolean(designation.trim() && !matchedRole);

  // Auto-synchronize baseline permissions when designation or department changes (if not manually overridden)
  useEffect(() => {
    if (hasManuallyEditedPerms) return;

    if (matchedRole) {
      setAssignedPermissions(matchedRole.permissions || []);
    } else if (designation.trim()) {
      const suggested = getDefaultPermissionsForDepartment(department, designation);
      setAssignedPermissions(suggested);
    }
  }, [matchedRole, department, designation, hasManuallyEditedPerms]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[0-9]/g, '');
    setFullName(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 15) {
      setPhone(value);
    }
  };

  const togglePermission = (id: string) => {
    setHasManuallyEditedPerms(true);
    setAssignedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleCategory = (cat: string) => {
    setHasManuallyEditedPerms(true);
    const catPermIds = AVAILABLE_PERMISSIONS.filter(p => p.category === cat).map(p => p.id);
    const hasAll = catPermIds.every(id => assignedPermissions.includes(id));

    if (hasAll) {
      setAssignedPermissions(prev => prev.filter(id => !catPermIds.includes(id)));
    } else {
      setAssignedPermissions(prev => Array.from(new Set([...prev, ...catPermIds])));
    }
  };

  const selectAll = () => {
    setHasManuallyEditedPerms(true);
    setAssignedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
    toast.success('All system permissions granted');
  };

  const clearAll = () => {
    setHasManuallyEditedPerms(true);
    setAssignedPermissions([]);
    toast.success('All permissions cleared');
  };

  const applyPreset = (preset: RolePreset) => {
    setHasManuallyEditedPerms(true);
    setAssignedPermissions([...preset.permissions]);
    toast.success(`Applied '${preset.name}' feature preset`);
  };

  const applyDepartmentSuggestion = () => {
    setHasManuallyEditedPerms(true);
    const defaults = getDefaultPermissionsForDepartment(department, designation);
    setAssignedPermissions(defaults);
    toast.success(`Loaded smart feature recommendations for ${department}`);
  };

  // Filtered Permissions for Assigner UI
  const filteredPermissions = useMemo(() => {
    return AVAILABLE_PERMISSIONS.filter(p => {
      const matchesSearch =
        p.label.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(permissionSearch.toLowerCase());
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [permissionSearch, selectedCategory]);

  const categories = useMemo(() => {
    return ['All', ...PERMISSION_CATEGORIES];
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Validation
    if (phone.length < 10) {
      toast.error('Mobile number should be at least 10 digits');
      setIsLoading(false);
      return;
    }

    if (!designation.trim()) {
      toast.error('Staff designation is required');
      setIsLoading(false);
      return;
    }

    const payload = {
      ...data,
      full_name: fullName,
      contact_mobile: phone,
      designation: designation.trim(),
      department: department.trim(),
      branch_id: selectedBranchId ? Number(selectedBranchId) : null,
      employment_type: employmentType,
      has_login_access: hasLoginAccess,
      // Dynamic Role & Permission Payload
      role_name: comboRoleName || designation.trim(),
      role_id: matchedRole ? matchedRole.id : null,
      permissions: assignedPermissions,
      update_role_permissions: Boolean(matchedRole && hasManuallyEditedPerms)
    };

    try {
      if (initialData) {
        await api.put(`/employees/${initialData.id}`, payload);
        toast.success(`${fullName}'s profile updated successfully`);
        onSuccess();
      } else {
        const response = await api.post('/employees/register', payload);
        
        if (response.data.roleCreated) {
          toast.success(`Created new role '${comboRoleName}' with ${assignedPermissions.length} permissions!`);
        } else {
          toast.success(`Hired! ${fullName} is now part of the team.`);
        }
        
        // Show credentials popup if credentials were generated
        if (response.data.credentials) {
          setCredsModal({
            isOpen: true,
            data: {
              full_name: fullName,
              username: response.data.credentials.username,
              password: response.data.credentials.password
            }
          });
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to sync employee data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 flex items-center justify-between">
        <Button
          onClick={onCancel}
          variant="secondary"
          className="flex items-center gap-2 text-zinc-400 hover:text-[#3a525d] font-bold text-sm transition-colors group bg-transparent border-none shadow-none p-0"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-[#3a525d] group-hover:text-white transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Directory
        </Button>
        <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
           <ShieldCheck size={14} />
           Unified HRMS & Role Access Provisioning Active
        </div>
      </div>

      <Card className="p-8 md:p-12 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-32 -translate-y-32 blur-3xl opacity-50" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-20 h-20 bg-[#3a525d] rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-[#3a525d]/30 shrink-0">
              <UserPlus size={36} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic tracking-tight text-[#3a525d]">
                {initialData ? 'Update Staff Member' : 'Add New Employee'}
              </h2>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                Staff Onboarding & Role-Based Access Control
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Core Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              <Input 
                name="full_name" 
                label="Full Official Name" 
                placeholder="Enter Full Name ..." 
                required 
                value={fullName}
                onChange={handleNameChange}
                icon={<Briefcase size={18} />}
              />
              <Input 
                name="employee_id" 
                label="Employee ID (Auto-generated if blank)" 
                placeholder="Leave blank for auto (e.g. EMP-2026-001)" 
                maxLength={20}
                defaultValue={initialData?.employee_id}
                icon={<ShieldCheck size={18} />}
              />

              {/* Branch Assignment */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] block">
                  Assigned Branch / Location *
                </label>
                <select
                  required
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all shadow-sm"
                >
                  <option value="">Select Branch / Unit...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.tier === 'Corporate' ? '🏢 [HQ]' : b.tier === 'Factory' ? '🏭 [Factory]' : '🏪 [Outlet]'} {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Type */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] block">
                  Employment Type *
                </label>
                <select
                  required
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all shadow-sm"
                >
                  <option value="Permanent">Permanent (Full Time)</option>
                  <option value="Temporary">Temporary (Seasonal / Short Term)</option>
                  <option value="Contract">Contract (Third-Party / Fixed Period)</option>
                  <option value="Probation">Probation (New Hire Evaluation)</option>
                  <option value="Intern">Intern / Trainee</option>
                </select>
              </div>

              {/* Designation & Department with Live Detection */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] block">
                  Designation / Job Title *
                </label>
                <input
                  name="designation"
                  required
                  maxLength={60}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Master Tailor, Sales Executive, Cutting Supervisor"
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] block">
                  Department *
                </label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all shadow-sm"
                >
                  <option value="Production & Tailoring">Production & Tailoring</option>
                  <option value="Cutting & Pattern Making">Cutting & Pattern Making</option>
                  <option value="Quality Control & Finishing">Quality Control & Finishing</option>
                  <option value="Measurements & Fitting">Measurements & Fitting</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Inventory & Logistics">Inventory & Logistics</option>
                  <option value="Accounts & Finance">Accounts & Finance</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Management & Admin">Management & Administration</option>
                </select>
              </div>

              <Input 
                name="contact_mobile" 
                label="Primary Contact No" 
                placeholder="Numbers only (10-15 digits)" 
                type="tel" 
                required 
                value={phone}
                onChange={handlePhoneChange}
                icon={<Phone size={18} />}
              />
              <Input 
                name="email" 
                label="Official Email (Optional)" 
                placeholder="david@company.com" 
                type="email" 
                maxLength={100}
                defaultValue={initialData?.email}
                icon={<Mail size={18} />}
              />
              <Input 
                name="joining_date" 
                label="Date of Joining" 
                type="date" 
                required 
                max={new Date().toISOString().split('T')[0]}
                defaultValue={initialData?.joining_date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                icon={<Calendar size={18} />}
              />
              <Select 
                name="status" 
                label="Service Status" 
                defaultValue={initialData?.status || 'Active'}
                options={[
                  { label: 'Active Service', value: 'Active' },
                  { label: 'On Notice Period', value: 'Notice' },
                  { label: 'Terminated / Resigned', value: 'Deactivated' }
                ]}
              />
            </div>

            {/* ── Dynamic Role Detection & Feature Assignment Section ── */}
            {designation.trim() && (
              <div className="border border-zinc-200/80 rounded-[2.5rem] p-6 md:p-8 bg-zinc-50/50 space-y-6">
                {/* Banner Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isNewRole ? 'bg-amber-500 text-white' : 'bg-[#2d8d9b] text-white'
                    }`}>
                      {isNewRole ? <Sparkles size={24} /> : <ShieldCheck size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-tight text-[#3a525d]">
                          {comboRoleName}
                        </span>
                        {isNewRole ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-200">
                            <Sparkles size={11} />
                            New Role Detected (Auto-Creation)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                            <ShieldCheck size={11} />
                            Existing System Role Matched
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {isNewRole ? (
                          <>
                            This designation & department combo does not exist in <span className="font-bold text-zinc-700">user_types</span>. A new role will automatically be registered, and you can assign features for it below.
                          </>
                        ) : (
                          <>
                            Matched to existing role <span className="font-bold text-zinc-700">'{matchedRole?.name}'</span> with {matchedRole?.permissions?.length || 0} configured features. You can review or customize them below.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Assigner Visibility */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-white border border-zinc-200 rounded-xl text-[#2d8d9b]">
                      {assignedPermissions.length} Features Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFeatureAssignerOpen(!isFeatureAssignerOpen)}
                      className="p-2.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-600 transition-colors flex items-center gap-1 text-[11px] font-bold"
                    >
                      {isFeatureAssignerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>{isFeatureAssignerOpen ? 'Collapse Features' : 'Assign Features'}</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Feature & Role Assigner */}
                {isFeatureAssignerOpen && (
                  <div className="space-y-6 pt-4 border-t border-zinc-200">
                    {/* Presets and Quick Recommendations */}
                    <div className="bg-white p-5 rounded-2xl border border-zinc-200/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Settings2 size={15} className="text-[#2d8d9b]" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                            Feature Baseline Templates
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAll}
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-[#2d8d9b] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-zinc-600 transition-colors flex items-center gap-1"
                          >
                            <CheckSquare size={11} />
                            Select All ({AVAILABLE_PERMISSIONS.length})
                          </button>
                          <button
                            type="button"
                            onClick={clearAll}
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-zinc-600 transition-colors flex items-center gap-1"
                          >
                            <Square size={11} />
                            Clear All
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={applyDepartmentSuggestion}
                          className="px-3 py-1.5 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b] text-[#2d8d9b] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-[#2d8d9b]/30"
                        >
                          <Sparkles size={12} />
                          Suggest for {department}
                        </button>
                        {ROLE_PRESETS.map(preset => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-200 text-zinc-700 rounded-xl text-[10px] font-bold border border-zinc-200 transition-colors flex items-center gap-1.5"
                            title={preset.description}
                          >
                            <span className="text-[9px] font-black uppercase text-[#2d8d9b]">[{preset.badge}]</span>
                            <span>{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter and Search Controls */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={permissionSearch}
                          onChange={(e) => setPermissionSearch(e.target.value)}
                          placeholder="Search features (e.g., job cards, quotes, inventory, invoices)..."
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat} {cat !== 'All' ? 'Module' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Categorized Permission Checkboxes */}
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                      {Array.from(new Set(filteredPermissions.map(p => p.category))).map(category => {
                        const permsInCategory = filteredPermissions.filter(p => p.category === category);
                        const allCatIds = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
                        const hasAllInCategory = allCatIds.every(id => assignedPermissions.includes(id));
                        const selectedCount = allCatIds.filter(id => assignedPermissions.includes(id)).length;

                        return (
                          <div key={category} className="bg-white p-4 rounded-2xl border border-zinc-200/70 space-y-2.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#2d8d9b]" />
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-[#3a525d]">
                                  {category}
                                </h5>
                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                                  {selectedCount}/{allCatIds.length}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleCategory(category)}
                                className="text-[9px] font-black uppercase text-[#2d8d9b] hover:text-[#3a525d] transition-colors"
                              >
                                {hasAllInCategory ? 'Unselect Category' : 'Select Category'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {permsInCategory.map(permission => {
                                const isChecked = assignedPermissions.includes(permission.id);
                                return (
                                  <label
                                    key={permission.id}
                                    className={`flex items-start justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                      isChecked 
                                        ? 'bg-[#2d8d9b]/5 border-[#2d8d9b]/40 shadow-xs' 
                                        : 'bg-zinc-50/50 border-zinc-200/60 hover:border-zinc-300'
                                    }`}
                                  >
                                    <div className="flex flex-col gap-0.5 pr-2">
                                      <span className={`text-[10px] font-black ${
                                        isChecked ? 'text-[#2d8d9b]' : 'text-zinc-700'
                                      }`}>
                                        {permission.label}
                                      </span>
                                      <p className="text-[9px] text-zinc-400 line-clamp-1">
                                        {permission.description}
                                      </p>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(permission.id)}
                                      className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-[#2d8d9b] focus:ring-[#2d8d9b] accent-[#2d8d9b] shrink-0 cursor-pointer"
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {filteredPermissions.length === 0 && (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-zinc-200">
                          <p className="text-xs font-bold text-zinc-400">No features found for "{permissionSearch}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Portal Login Access Permission (Optional) */}
            {!initialData && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
                <input 
                  type="checkbox"
                  id="has_login_access"
                  checked={hasLoginAccess}
                  onChange={(e) => setHasLoginAccess(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-md text-[#2d8d9b] border-slate-300 focus:ring-[#2d8d9b] cursor-pointer accent-[#2d8d9b]"
                />
                <label htmlFor="has_login_access" className="cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <Key size={14} className="text-[#2d8d9b]" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                      Grant ERP Portal Login Access
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      (Optional)
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    Check this for managers, administrative staff, and sales executives who need system access. They will be linked to the <span className="font-bold text-[#3a525d]">{comboRoleName || 'Staff'}</span> role with the {assignedPermissions.length} features assigned above.
                  </p>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t border-zinc-100">
               <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="h-14 rounded-2xl px-10 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-[#3a525d]"
               >
                 Cancel Entry
               </Button>
               <Button 
                type="submit" 
                isLoading={isLoading}
                className="h-14 rounded-2xl px-12 font-black uppercase text-[10px] tracking-[0.2em] bg-[#2d8d9b] hover:bg-[#236e7a] text-white shadow-xl shadow-[#2d8d9b]/20"
               >
                 {initialData ? 'Save Modifications' : isNewRole ? 'Create Role & Onboard Staff' : 'Confirm Onboarding'}
               </Button>
            </div>
          </form>
        </div>
      </Card>
      
      <div className="mt-8 p-6 bg-[#3a525d]/5 rounded-[2rem] border border-[#3a525d]/10">
         <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#2d8d9b] shadow-sm shrink-0">
               <ShieldCheck size={20} />
            </div>
            <div>
               <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] mb-1">Role Management Integration</h4>
               <p className="text-[10px] font-bold text-zinc-400 leading-relaxed uppercase">
                 Any new user role generated during staff registration is immediately registered in the User Roles & Permissions catalog (/admin/roles). You can manage, expand, or adjust its features at any time.
               </p>
            </div>
         </div>
      </div>

      <CredentialsModal 
        isOpen={credsModal.isOpen}
        onClose={() => {
          setCredsModal({ isOpen: false, data: null });
          onSuccess();
        }}
        data={credsModal.data}
      />
    </div>
  );
};
