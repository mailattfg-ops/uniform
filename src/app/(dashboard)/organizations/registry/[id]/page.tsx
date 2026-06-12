'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import {
  Building2,
  MapPin,
  Users,
  Calendar,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Key,
  Check,
  ChevronDown,
  ChevronRight,
  Package,
  Download,
  FileUp,
  UserPlus,
  X,
  Grid,
  School,
  User,
  Clipboard,
  UserCheck,
  LogIn,
  ArrowRight,
  Ruler
} from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { Select } from '@/components/ui/Select';
import { MemberProfileModal } from '@/components/entities/MemberProfileModal';
import * as XLSX from 'xlsx';

interface Organization {
  id: number;
  customer_code: string | null;
  name: string;
  address: string;
  industry_id: number;
  industries?: { name: string };
  relationship_manager_id: number | null;
  relationship_manager?: { id: number; full_name: string; employee_id: string } | null;
  assigned_operator_id: number | null;
  assigned_operator?: { id: number; full_name: string; employee_id: string } | null;
  created_at: string;
}

const MultiEntryInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder = 'Add section...' }) => {
  const [inputValue, setInputValue] = useState('');

  const items = value
    ? value.split(',').map(item => item.trim()).filter(Boolean)
    : [];

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (items.includes(trimmed)) {
      toast.error('This item already exists in the list');
      return;
    }

    const updated = [...items, trimmed];
    onChange(updated.join(', '));
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const updated = items.filter((_, idx) => idx !== indexToRemove);
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 h-11 bg-white border border-[#fce4d4] rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 text-[#3a525d]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-5 h-11 rounded-xl bg-[#2d8d9b] hover:bg-[#3a525d] text-white font-black uppercase tracking-wider text-[10px] flex items-center justify-center transition-all active:scale-95 shadow-md shadow-[#2d8d9b]/20 cursor-pointer border-none outline-none"
        >
          Add
        </button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 bg-zinc-50/50 rounded-2xl border border-zinc-150/50 min-h-12 items-center">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] shadow-sm animate-in zoom-in-95 duration-200"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-50 hover:text-red-500 text-zinc-450 transition-colors cursor-pointer border-none outline-none font-bold text-[10px]"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-400 font-bold italic ml-1">
          No divisions/sections added yet.
        </p>
      )}
    </div>
  );
};

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgIdStr = params.id as string;
  const orgId = parseInt(orgIdStr, 10);

  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'entities'>('overview');

  // Organization Basic & Details State
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<any[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  // Modals & Order Details
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  // Department management states inside tab
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  // Entity directory states inside tab
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [entityView, setEntityView] = useState<'list' | 'register' | 'bulk'>('list');
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [deleteEntityConfirm, setDeleteEntityConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [resetEntityConfirm, setResetEntityConfirm] = useState<{ isOpen: boolean; entity: any | null }>({
    isOpen: false,
    entity: null
  });
  const [profileModal, setProfileModal] = useState<{ isOpen: boolean; member: any | null }>({
    isOpen: false,
    member: null
  });

  // Bulk Upload states
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Registration generated credentials
  const [generatedEntityCreds, setGeneratedEntityCreds] = useState<any | null>(null);
  const [hasCopiedCreds, setHasCopiedCreds] = useState(false);

  // Fetch basic organization info and stats/details
  const fetchOrgData = async () => {
    setIsLoadingOrg(true);
    try {
      const [orgsRes, detailsRes, staffRes, empRes] = await Promise.all([
        api.get('/organizations'),
        api.get(`/organizations/${orgId}/details`),
        api.get(`/organizations/${orgId}/staff`),
        api.get('/employees')
      ]);

      setOrg((orgsRes.data || []).find((o: any) => o.id === orgId) || null);
      setOrgDetails(detailsRes.data);
      setDepartments(detailsRes.data.departments || []);
      const assigned = staffRes.data.data || [];
      setAssignedStaff(assigned);
      setSelectedStaffIds(assigned.map((s: any) => s.employee_id));
      setEmployees((empRes.data || []).filter((e: any) => e.status === 'active'));
    } catch (err) {
      toast.error('Failed to load organization profile');
    } finally {
      setIsLoadingOrg(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchOrgData();
    }
  }, [orgId]);

  const toggleStaffSelection = (id: number) => {
    setSelectedStaffIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleViewOrder = async (orderId: number) => {
    const loadingToast = toast.loading('Loading order details...');
    try {
      const res = await api.get(`/orders/${orderId}`);
      setSelectedOrder(res.data);
      toast.dismiss(loadingToast);
    } catch (err) {
      toast.error('Failed to load order details', { id: loadingToast });
    }
  };

  // --- Department Management Logic ---
  const isSchool = org?.industries?.name?.toLowerCase().includes('school') || org?.industries?.name?.toLowerCase().includes('education');

  const deptFields: FormField[] = [
    isSchool ? {
      name: 'name',
      label: 'Department Name',
      type: 'select' as const,
      placeholder: 'Select Class...',
      required: true,
      defaultValue: editingDept?.name || '',
      options: [
        { label: 'Class1', value: 'Class1' },
        { label: 'Class2', value: 'Class2' },
        { label: 'Class3', value: 'Class3' },
        { label: 'Class4', value: 'Class4' },
        { label: 'Class5', value: 'Class5' },
        { label: 'Class6', value: 'Class6' },
        { label: 'Class7', value: 'Class7' },
        { label: 'Class8', value: 'Class8' },
        { label: 'Class9', value: 'Class9' },
        { label: 'Class10', value: 'Class10' },
        { label: 'Class11', value: 'Class11' },
        { label: 'Class12', value: 'Class12' },
        { label: 'C1', value: 'C1' },
        { label: 'C2', value: 'C2' },
        // { label: 'Corporate', value: 'Corporate' }
      ]
    } : {
      name: 'name',
      label: 'Department Name',
      type: 'text',
      placeholder: 'e.g. Sales, HR, Production',
      required: true,
      maxLength: 20,
      defaultValue: editingDept?.name
    },
    {
      name: 'division',
      label: 'Division / Section (Optional)',
      type: 'custom',
      defaultValue: editingDept?.division || editingDept?.section || '',
      render: (val: any, onChange: (v: any) => void) => (
        <MultiEntryInput
          value={val || ''}
          onChange={onChange}
          placeholder="e.g. A, B, North, South (press Enter or click Add)"
        />
      )
    }
  ];

  const handleAddOrUpdateDept = async (formData: any) => {
    const loadingToast = toast.loading(editingDept ? 'Updating department...' : 'Setting up department...');
    const payload = {
      ...formData,
      orgId: String(orgId)
    };
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        toast.success('Department updated successfully!', { id: loadingToast });
      } else {
        await api.post('/departments', payload);
        toast.success('Department created successfully!', { id: loadingToast });
      }
      setIsAddingDept(false);
      setEditingDept(null);
      // Refresh organization details which contains departments
      const detailsRes = await api.get(`/organizations/${orgId}/details`);
      setOrgDetails(detailsRes.data);
      setDepartments(detailsRes.data.departments || []);
    } catch (err) {
      toast.error('Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDeleteDept = async () => {
    if (!deleteDeptConfirm.id) return;

    const loadingToast = toast.loading('Removing department...');
    const id = deleteDeptConfirm.id;
    setDeleteDeptConfirm({ isOpen: false, id: null });

    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department removed!', { id: loadingToast });

      const detailsRes = await api.get(`/organizations/${orgId}/details`);
      setOrgDetails(detailsRes.data);
      setDepartments(detailsRes.data.departments || []);
    } catch (err) {
      toast.error('Failed to delete department', { id: loadingToast });
    }
  };

  // Fetch Entities (Members) list scoped to this organization
  const fetchEntities = async () => {
    setIsLoadingEntities(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('schoolId', String(orgId));
      if (selectedDeptFilter) queryParams.append('classId', selectedDeptFilter);
      if (entitySearchQuery) queryParams.append('search', entitySearchQuery);

      const response = await api.get(`/students?${queryParams.toString()}`);
      setEntities(response.data);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setIsLoadingEntities(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'entities' && entityView === 'list') {
      const timer = setTimeout(() => {
        fetchEntities();
      }, entitySearchQuery ? 500 : 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedDeptFilter, entitySearchQuery, entityView]);

  // Save Staff Assignment
  const handleSaveStaff = async () => {
    setIsAssigningStaff(true);
    const loadingToast = toast.loading('Updating staff assignments...');
    try {
      await api.post(`/organizations/${orgId}/staff`, { employee_ids: selectedStaffIds });
      toast.success('Staff assignments updated successfully!', { id: loadingToast });
      setIsStaffDropdownOpen(false);

      // Refresh staff list
      const staffRes = await api.get(`/organizations/${orgId}/staff`);
      setAssignedStaff(staffRes.data.data || []);
    } catch (err) {
      toast.error('Failed to update staff assignments', { id: loadingToast });
    } finally {
      setIsAssigningStaff(false);
    }
  };

  // --- Entity Directory Logic ---
  const entityFields: FormField[] = [
    {
      name: 'full_name', label: 'Full Name', type: 'text',
      placeholder: 'Enter Full Name...', required: true,
      onlyLetters: true,
      maxLength: 25,
      defaultValue: editingEntity?.full_name
    },
    {
      name: 'admission_no', label: 'Reference ID / ID', type: 'text',
      placeholder: 'e.g. EMP-101 or SD-2024-001', required: true,
      defaultValue: editingEntity?.admission_no
    },
    {
      name: 'gender', label: 'Gender', type: 'select',
      options: [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Other', value: 'Other' }
      ],
      required: true,
      defaultValue: editingEntity?.gender || 'Male'
    },
    {
      name: 'class_id',
      label: 'Department / Unit',
      type: 'select',
      options: departments.map((d: any) => ({ label: d.name, value: d.id })) || [],
      required: true,
      defaultValue: editingEntity?.department_id || editingEntity?.class_id
    },
    {
      name: 'contact_mobile', label: 'Contact Mobile', type: 'tel',
      placeholder: 'Numbers only (max 15)',
      onlyNumbers: true,
      maxLength: 15,
      defaultValue: editingEntity?.contact_mobile
    },
    {
      name: 'status', label: 'Account Status', type: 'select',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Deactivated', value: 'Deactivated' }
      ],
      defaultValue: editingEntity?.status || 'Active',
      required: true
    }
  ];

  const handleRegisterEntity = async (formData: any) => {
    const isEditing = !!editingEntity;
    const loadingToast = toast.loading(isEditing ? 'Updating record...' : 'Registering member and creating account...');
    const payload = {
      ...formData,
      school_id: String(orgId)
    };
    try {
      if (isEditing) {
        await api.put(`/students/${editingEntity.id}`, payload);
        toast.success('Profile updated!', { id: loadingToast });
        setEntityView('list');
        setEditingEntity(null);
        fetchEntities();
      } else {
        const response = await api.post('/students/register', payload);
        toast.success('Registration complete!', { id: loadingToast });
        setGeneratedEntityCreds({
          ...response.data.credentials,
          studentId: response.data.student.id
        });
      }
    } catch (err) {
      toast.error('Action failed. Check if ID exists.', { id: loadingToast });
    }
  };

  const handleCopyCreds = () => {
    const text = `Username: ${generatedEntityCreds.username}\nPassword: ${generatedEntityCreds.password}`;
    navigator.clipboard.writeText(text);
    setHasCopiedCreds(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setHasCopiedCreds(false), 2000);
  };

  const handleConfirmedDeleteEntity = async () => {
    if (!deleteEntityConfirm.id) return;
    const loadingToast = toast.loading('Deleting record...');
    setDeleteEntityConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/students/${deleteEntityConfirm.id}`);
      toast.success('Record and access account purged', { id: loadingToast });
      fetchEntities();
    } catch (err) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const handleConfirmedResetEntity = async () => {
    if (!resetEntityConfirm.entity) return;
    const entity = resetEntityConfirm.entity;
    const loadingToast = toast.loading('Generating secure access...');
    setResetEntityConfirm({ isOpen: false, entity: null });

    try {
      const response = await api.post(`/students/${entity.id}/reset-password`);
      setCredsModal({
        isOpen: true,
        data: {
          full_name: entity.full_name,
          username: response.data.username,
          password: response.data.newPassword
        }
      });
      toast.success('Access keys updated!', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to reset access', { id: loadingToast });
    }
  };

  // CSV Export for locked organization list
  const downloadCSV = () => {
    if (entities.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Full Name', 'Reference ID', 'Organization', 'Department / Section', 'Status', 'Measurement Status', 'Onboarded Date'];
    const rows = entities.map(e => [
      `"${e.full_name}"`,
      `"${e.admission_no}"`,
      `"${org?.name || 'Main Registry'}"`,
      `"${e.departments?.name || 'N/A'}"`,
      `"${e.status || 'Active'}"`,
      `"${e.measurement_status || 'Missing'}"`,
      `"${new Date(e.created_at).toLocaleDateString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `entity_directory_${org?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Directory Exported');
  };

  // Bulk Import logic inside Dynamic Details Page
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json(ws);

          if (rawData.length === 0) {
            toast.error('The selected file is empty');
            return;
          }

          setBulkData(rawData);
          setBulkFile(selectedFile);
          toast.success(`Loaded ${rawData.length} records from Excel`);
        } catch (err) {
          toast.error('Failed to parse Excel file.');
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleBulkUploadSubmit = async () => {
    if (bulkData.length === 0) return;

    setIsBulkUploading(true);
    const loadingToast = toast.loading(`Importing ${bulkData.length} records...`);

    try {
      const payload = bulkData.map(item => ({
        full_name: item['Full Name'] || item['Name'] || item['full_name'] || '',
        admission_no: String(item['Reference ID'] || item['Admission No'] || item['ID'] || item['admission_no'] || ''),
        organization_id: String(orgId),
        department_id: item['Department ID'] || item['Class ID'] || item['class_id'] || '',
        contact_mobile: String(item['Mobile'] || item['Phone'] || item['contact_mobile'] || ''),
        gender: item['Gender'] || item['gender'] || 'Male'
      }));

      const response = await api.post('/members/bulk-register', { members: payload });
      setBulkResults({ success: response.data.successCount, failed: response.data.errorCount });
      toast.success('Data import completed!', { id: loadingToast });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Bulk upload failed', { id: loadingToast });
    } finally {
      setIsBulkUploading(false);
    }
  };

  if (isLoadingOrg) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#2d8d9b]/25 border-t-[#2d8d9b] rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading organization details...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-zinc-100">
        <h3 className="text-xl font-bold text-zinc-700">Organization Not Found</h3>
        <Button onClick={() => router.push('/organizations/registry')} className="mt-4">
          Back to Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section with Premium Back button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-zinc-100">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/organizations/registry')}
            variant="secondary"
            className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-500 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm !p-0"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#3a525d]">
              {org.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded-lg text-[9px] font-black uppercase tracking-wider">
                {org.customer_code ? `Code: ${org.customer_code}` : `ID: #${org.id}`}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-widest">
                {org.industries?.name || 'School Sector'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher with Sleek Pill Design */}
        <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/50 self-start md:self-auto">
          {(['overview', 'departments', 'entities'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setEntityView('list');
                setIsAddingDept(false);
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab
                ? 'bg-[#3a525d] text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-800'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-lg transition-all duration-300">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Total Directory Members</p>
                <h3 className="text-3xl font-black text-[#3a525d] tracking-tighter">{orgDetails?.measurements?.total || 0}</h3>
              </div>
              <div className="w-12 h-12 bg-[#3a525d]/5 rounded-2xl flex items-center justify-center text-[#3a525d]">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-lg transition-all duration-300">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Measurements Captured</p>
                <h3 className="text-3xl font-black text-green-600 tracking-tighter">{orgDetails?.measurements?.completed || 0}</h3>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                <Check size={20} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-lg transition-all duration-300">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Pending Measurements</p>
                <h3 className="text-3xl font-black text-orange-500 tracking-tighter">{orgDetails?.measurements?.pending || 0}</h3>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                <Ruler size={20} />
              </div>
            </div>
          </div>

          {/* Org details metadata card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-zinc-100 space-y-6">
              <h3 className="text-lg font-black text-[#3a525d] tracking-tight">Organization Profile</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    <MapPin size={12} /> Address Location
                  </span>
                  <p className="text-sm font-bold text-[#3a525d]">{org.address || 'Not registered'}</p>
                </div>

                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    <Users size={12} /> Assigned Relationship Manager
                  </span>
                  <p className="text-sm font-bold text-[#3a525d]">
                    {org.relationship_manager?.full_name
                      ? `${org.relationship_manager.full_name} (${org.relationship_manager.employee_id})`
                      : 'Unassigned'}
                  </p>
                </div>

                {org.assigned_operator && (
                  <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                      <Users size={12} /> Assigned Marketing Operator
                    </span>
                    <p className="text-sm font-bold text-[#3a525d]">
                      {org.assigned_operator.full_name} ({org.assigned_operator.employee_id})
                    </p>
                  </div>
                )}

                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    <Calendar size={12} /> Onboarding Timestamp
                  </span>
                  <p className="text-sm font-bold text-[#3a525d]">
                    {new Date(org.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Staff Assignment Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-[#3a525d] tracking-tight flex items-center gap-2">
                  <School size={18} /> Measurement Staff
                </h3>
                <p className="text-xs font-semibold text-zinc-400 leading-relaxed">Assign field operators responsible for coordinating size entries for this partner.</p>

                <div className="relative">
                  <Button
                    variant="secondary"
                    onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                    className="w-full h-12 rounded-2xl border border-zinc-200 px-4 text-xs font-bold text-[#3a525d] bg-white flex items-center justify-between hover:border-[#2d8d9b] transition-colors shadow-none"
                  >
                    <span className="truncate">
                      {selectedStaffIds.length === 0
                        ? 'Select Staff Members...'
                        : `${selectedStaffIds.length} staff member(s) selected`}
                    </span>
                    <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isStaffDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {isStaffDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-150 p-2 z-50 max-h-48 overflow-y-auto custom-scrollbar">
                      {employees.map(emp => {
                        const isSelected = selectedStaffIds.includes(emp.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => toggleStaffSelection(emp.id)}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors"
                          >
                            <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${isSelected ? 'bg-[#2d8d9b] border-[#2d8d9b] text-white' : 'border-zinc-300'}`}>
                              {isSelected && <Check size={10} strokeWidth={4} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#3a525d]">{emp.full_name}</p>
                              <p className="text-[9px] font-black text-muted-foreground uppercase">{emp.employee_id} • {emp.department}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSaveStaff}
                disabled={isAssigningStaff}
                className="w-full h-12 bg-[#2d8d9b] hover:bg-[#3a525d] text-white rounded-2xl font-black uppercase tracking-wider text-[10px] shadow-md mt-6"
              >
                {isAssigningStaff ? 'Saving...' : 'Save Assignments'}
              </Button>
            </div>
          </div>

          {/* Orders registry list */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 space-y-4">
            <h3 className="text-lg font-black text-[#3a525d] tracking-tight">Purchase & Placed Orders</h3>
            <div className="space-y-3">
              {orgDetails?.orders?.length > 0 ? (
                orgDetails.orders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => handleViewOrder(order.id)}
                    className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-zinc-100/80 hover:border-[#2d8d9b] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 flex items-center justify-center text-[#2d8d9b]">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#3a525d]">{order.order_no}</p>
                        <p className="text-[10px] font-medium text-zinc-400">
                          Quote Ref: {order.quotations?.quotation_no} • {order.quotations?.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${order.status === 'Delivered' ? 'bg-green-50 text-green-700 border-green-150' :
                        order.status === 'Shipped' ? 'bg-blue-50 text-blue-750 border-blue-150' :
                          order.status === 'In Production' ? 'bg-purple-50 text-purple-750 border-purple-150' :
                            'bg-orange-50 text-orange-700 border-orange-150'
                        }`}>
                        {order.status}
                      </span>
                      <ChevronRight size={16} className="text-zinc-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs font-semibold text-zinc-400 p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">No active orders linked to this organization.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {isAddingDept ? (
            <div className="max-w-4xl mx-auto">
              <DynamicForm
                title={editingDept ? "Edit Department" : "Setup New Department"}
                subtitle={editingDept ? `Modify details for ${editingDept.name}` : "Define a new functional unit for this organization"}
                fields={deptFields}
                onSubmit={handleAddOrUpdateDept}
                onCancel={() => {
                  setIsAddingDept(false);
                  setEditingDept(null);
                }}
                submitLabel={editingDept ? "Update Department" : "Create Department"}
                columns={1}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  onClick={() => setIsAddingDept(true)}
                  className="h-12 px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-md gap-2"
                >
                  <Plus size={16} />
                  Setup Department
                </Button>
              </div>

              <DataTable
                title="Departments & Sections"
                subtitle={`Active segments inside ${org.name}`}
                columns={[
                  {
                    header: 'Department / Unit',
                    accessor: (d) => (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#2d8d9b]/5 rounded-lg flex items-center justify-center text-[#2d8d9b]">
                          <Grid size={16} />
                        </div>
                        <div>
                          <p className="font-black text-sm tracking-tight text-[#3a525d]">{d.name || 'N/A'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {(d.division || d.section) && (
                              <p className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-widest opacity-70">
                                Section: {d.division || d.section}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Created On',
                    accessor: (d) => (
                      <span className="text-xs font-semibold text-zinc-500">
                        {new Date(d.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )
                  },
                  {
                    header: 'Actions',
                    accessor: (d) => (
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => {
                            setEditingDept(d);
                            setIsAddingDept(true);
                          }}
                          variant="secondary"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm !p-0"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          onClick={() => setDeleteDeptConfirm({ isOpen: true, id: String(d.id) })}
                          variant="secondary"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm !p-0"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )
                  }
                ]}
                data={departments}
                isLoading={false}
                searchPlaceholder="Filter departments..."
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Entities (Directory) Tab */}
      {activeTab === 'entities' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {entityView === 'register' ? (
            <div className="max-w-4xl mx-auto">
              <Button
                onClick={() => {
                  setEntityView('list');
                  setEditingEntity(null);
                  setGeneratedEntityCreds(null);
                }}
                variant="secondary"
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8b6b5a] hover:text-[#3a525d] transition-colors mb-6 bg-transparent border-none shadow-none px-0"
              >
                <ArrowLeft size={14} />
                Back to Registry Directory
              </Button>

              {generatedEntityCreds ? (
                <div className="max-w-2xl mx-auto animate-in zoom-in duration-500">
                  <div className="bg-white rounded-[3rem] border-4 border-[#2d8d9b]/10 shadow-2xl overflow-hidden">
                    <div className="bg-[#2d8d9b] p-10 text-white text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserCheck size={40} />
                      </div>
                      <h2 className="text-3xl font-black tracking-tight italic">Registration Successful!</h2>
                      <p className="text-[#fce4d4] font-bold uppercase tracking-widest text-xs mt-2 opacity-80">Access Portal Account Generated</p>
                    </div>

                    <div className="p-10 space-y-8">
                      <div className="space-y-4">
                        <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Entity Access Portal</span>
                            <LogIn size={16} className="text-[#2d8d9b]" />
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Login Username</label>
                              <span className="text-lg font-black text-[#3a525d] tracking-tight">{generatedEntityCreds.username}</span>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Temporary Password</label>
                              <div className="flex items-center gap-3">
                                <Key size={14} className="text-[#f2994a]" />
                                <span className="text-xl font-black text-[#f2994a] tracking-[0.2em]">{generatedEntityCreds.password}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={handleCopyCreds}
                          className={`h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-3 transition-all ${hasCopiedCreds ? 'bg-green-500 text-white' : 'bg-[#3a525d] text-white hover:bg-[#2d8d9b]'
                            }`}
                        >
                          {hasCopiedCreds ? <Check size={16} /> : <Clipboard size={16} />}
                          Copy Credentials
                        </Button>

                        <Button
                          onClick={() => {
                            setEntityView('list');
                            setEditingEntity(null);
                            setGeneratedEntityCreds(null);
                            fetchEntities();
                          }}
                          variant="outline"
                          className="h-14 rounded-2xl border-2 border-[#3a525d]/10 font-black uppercase tracking-widest text-[10px] gap-3"
                        >
                          Finish & Exit
                          <ArrowRight size={16} />
                        </Button>

                        <Button
                          onClick={() => router.push(`/measurements/entry?studentId=${generatedEntityCreds.studentId}`)}
                          className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[11px] gap-3 col-span-2 shadow-xl shadow-orange-500/20 mt-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Ruler size={18} />
                          Capture Sizing Records Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <DynamicForm
                  title={editingEntity ? "Edit Member Profile" : "Member Directory Registration"}
                  subtitle={editingEntity ? `Modify record for ${editingEntity.full_name}` : `Add new entry inside ${org.name}`}
                  fields={entityFields}
                  onSubmit={handleRegisterEntity}
                  onCancel={() => {
                    setEntityView('list');
                    setEditingEntity(null);
                  }}
                  submitLabel={editingEntity ? "Update Profile" : "Register & Create Account"}
                  columns={2}
                />
              )}
            </div>
          ) : entityView === 'bulk' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <Button
                onClick={() => {
                  setEntityView('list');
                  setBulkFile(null);
                  setBulkResults(null);
                }}
                variant="secondary"
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8b6b5a] hover:text-[#3a525d] transition-colors mb-6 bg-transparent border-none shadow-none px-0"
              >
                <ArrowLeft size={14} />
                Back to List
              </Button>

              {bulkResults ? (
                <div className="max-w-xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-zinc-100 text-center space-y-6 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <UserCheck size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-[#3a525d] tracking-tight">Import Summary Completed</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-wider mb-1">Processed</p>
                      <p className="text-2xl font-black text-green-700">{bulkResults.success}</p>
                    </div>
                    <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">Failed</p>
                      <p className="text-2xl font-black text-red-700">{bulkResults.failed}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setEntityView('list');
                      setBulkFile(null);
                      setBulkResults(null);
                      fetchEntities();
                    }}
                    className="w-full h-12 bg-[#3a525d] text-white hover:bg-[#2d8d9b] rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    Return to Directory
                  </Button>
                </div>
              ) : (
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-zinc-100 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-[#3a525d] italic">Import Organization Roster</h2>
                      <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">Upload list from XLSX template</p>
                    </div>
                    <button
                      onClick={() => {
                        const templateData = [
                          {
                            'Full Name': 'John Doe',
                            'Reference ID': 'EMP-2026-001',
                            'Mobile': '9876543210',
                            'Gender': 'Male'
                          }
                        ];
                        const ws = XLSX.utils.json_to_sheet(templateData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Template');
                        XLSX.writeFile(wb, `Import_Template_${org.name.replace(/\s+/g, '_')}.xlsx`);
                      }}
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#2d8d9b] border-b border-dashed border-[#2d8d9b]"
                    >
                      <Download size={12} /> Template Sheet
                    </button>
                  </div>

                  {!bulkFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group cursor-pointer border-4 border-dashed border-[#2d8d9b]/10 bg-[#2d8d9b]/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all hover:bg-[#2d8d9b]/10"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={handleBulkFileChange}
                      />
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-[#2d8d9b] mb-4">
                        <FileUp size={28} />
                      </div>
                      <h4 className="text-base font-bold text-[#3a525d] mb-1">Click or drag Excel registry files here</h4>
                      <p className="text-zinc-400 text-xs">Supports Excel formats (.xlsx / .xls)</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-5 bg-[#3a525d] rounded-2xl text-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <FileUp size={20} />
                          <div>
                            <p className="font-bold text-xs">{bulkFile.name}</p>
                            <p className="text-[9px] uppercase font-bold opacity-60">{bulkData.length} records parsed</p>
                          </div>
                        </div>
                        <button onClick={() => { setBulkFile(null); setBulkData([]); }} className="p-1.5 hover:bg-white/10 rounded-lg">
                          <X size={16} />
                        </button>
                      </div>

                      <Button
                        onClick={handleBulkUploadSubmit}
                        isLoading={isBulkUploading}
                        className="w-full h-14 bg-[#f2994a] hover:bg-[#e68a3d] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md"
                      >
                        Confirm Import of {bulkData.length} Records
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Directory Filter bar scoped strictly to this organization */}
              <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                  <div className="w-full sm:w-[220px]">
                    <Select
                      placeholder="Filter by Department"
                      value={selectedDeptFilter}
                      options={[
                        { label: 'All Departments', value: '' },
                        ...departments.map((d: any) => ({ label: d.name, value: String(d.id) }))
                      ]}
                      onChange={(val: string) => setSelectedDeptFilter(val)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
                  <Button
                    onClick={downloadCSV}
                    variant="secondary"
                    className="h-11 px-5 bg-zinc-50 border border-zinc-150 text-[#3a525d] hover:bg-[#3a525d] hover:text-white rounded-xl font-black uppercase tracking-wider text-[9px] gap-2 shadow-sm"
                  >
                    <Download size={14} /> Export CSV
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingEntity(null);
                      setGeneratedEntityCreds(null);
                      setEntityView('register');
                    }}
                    className="gap-2 text-[10px] rounded-xl h-11 uppercase font-black tracking-wider px-5 bg-[#3a525d] hover:bg-[#2d8d9b] text-white"
                  >
                    <UserPlus size={14} /> Register Member
                  </Button>
                  <Button
                    onClick={() => {
                      setBulkFile(null);
                      setBulkResults(null);
                      setEntityView('bulk');
                    }}
                    variant="secondary"
                    className="gap-2 text-[10px] rounded-xl h-11 uppercase font-black tracking-wider px-5 border border-zinc-200 text-[#3a525d] bg-white hover:bg-zinc-50"
                  >
                    <FileUp size={14} /> Import Roster
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              <DataTable
                title="Active Directory Directory"
                subtitle={`Roster listing for ${org.name}`}
                columns={[
                  {
                    header: 'Entity / Member Name',
                    accessor: (e) => (
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-[#3a525d]/5 border border-[#3a525d]/10 flex items-center justify-center font-bold text-[#3a525d] text-[10px]">
                          {e.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#3a525d] leading-none">{e.full_name}</p>
                          <p className="text-[8px] text-[#2d8d9b] font-bold uppercase tracking-[0.1em] mt-1 opacity-85">Ref: #{e.admission_no}</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Department',
                    accessor: (e) => (
                      <span className="text-xs font-bold text-[#3a525d]">{e.departments?.name || 'Main Office'}</span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: (e: any) => (
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${e.status === 'Active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                        }`}>
                        {e.status || 'Active'}
                      </span>
                    ),
                  },
                  {
                    header: 'Measurement status',
                    accessor: (e: any) => {
                      const status = e.measurement_status || 'Missing';
                      const colors: Record<string, string> = {
                        'Approved': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                        'Pending': 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse',
                        'Missing': 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                      };
                      return (
                        <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-lg ${colors[status]}`}>
                          {status === 'Pending' ? 'Under Review' : status}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Actions',
                    accessor: (e) => (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setProfileModal({ isOpen: true, member: e })}
                          variant="secondary"
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-[#3a525d]/5 text-[#3a525d] hover:bg-[#3a525d] hover:text-white transition-all shadow-sm border-none"
                        >
                          <User size={14} />
                        </Button>
                        <Button
                          onClick={() => setResetEntityConfirm({ isOpen: true, entity: e })}
                          variant="secondary"
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm border-none"
                        >
                          <Key size={14} />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingEntity(e);
                            setGeneratedEntityCreds(null);
                            setEntityView('register');
                          }}
                          variant="secondary"
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm border-none"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          onClick={() => setDeleteEntityConfirm({ isOpen: true, id: e.id })}
                          variant="secondary"
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm border-none"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )
                  }
                ]}
                data={entities}
                isLoading={isLoadingEntities}
                onSearch={setEntitySearchQuery}
                searchPlaceholder="Search directory roster..."
              />
            </div>
          )}
        </div>
      )}

      {/* Shared Modals */}
      <ConfirmModal
        isOpen={deleteDeptConfirm.isOpen}
        title="Delete Department?"
        message="This will permanently remove this department group. This action cannot be undone."
        onConfirm={handleConfirmedDeleteDept}
        onCancel={() => setDeleteDeptConfirm({ isOpen: false, id: null })}
        confirmLabel="Yes, Delete Department"
        variant="danger"
      />

      <ConfirmModal
        isOpen={deleteEntityConfirm.isOpen}
        title="Delete Record?"
        message="This action will permanently remove the profile and revoke portal access. This cannot be undone."
        onConfirm={handleConfirmedDeleteEntity}
        onCancel={() => setDeleteEntityConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />

      <ConfirmModal
        isOpen={resetEntityConfirm.isOpen}
        title="Reset Access Keys?"
        message={`Generate new secure credentials for ${resetEntityConfirm.entity?.full_name}? Old keys will expire immediately.`}
        onConfirm={handleConfirmedResetEntity}
        onCancel={() => setResetEntityConfirm({ isOpen: false, entity: null })}
        confirmLabel="Generate Keys"
        variant="warning"
      />

      <CredentialsModal
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

      <MemberProfileModal
        isOpen={profileModal.isOpen}
        onClose={() => setProfileModal({ isOpen: false, member: null })}
        member={profileModal.member}
      />

      {/* Selected Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />

          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="bg-[#2d8d9b] p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Package size={24} />
                </div>
                <Button variant="secondary" onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-transparent border-none shadow-none text-white">
                  <X size={20} />
                </Button>
              </div>
              <h3 className="text-2xl font-black italic">{selectedOrder.order_no}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Status: {selectedOrder.status}
                </p>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Barcode: {selectedOrder.barcode}
                </p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Quotation Title</label>
                  <p className="text-sm font-semibold text-[#3a525d]">{selectedOrder.quotations?.title || 'Untitled Quotation'}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Total Value</label>
                  <p className="text-sm font-semibold text-[#3a525d]">₹{parseFloat(selectedOrder.quotations?.final_quote_value || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#3a525d]">{item.product_types?.name || 'Item'}</p>
                        <p className="text-xs font-medium text-zinc-450 mt-1">Quantity: {item.quantity} units</p>
                      </div>
                      {item.size_breakdown && Object.keys(item.size_breakdown).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
                          {Object.entries(item.size_breakdown).map(([size, qty]: any) => (
                            <span key={size} className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded-lg text-[10px] font-bold">
                              {size}: {qty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                    <p className="text-xs font-medium text-zinc-400">No items listed for this order.</p>
                  )}
                </div>
              </div>

              {/* Order Notes */}
              {selectedOrder.order_notes && (
                <div className="p-5 bg-yellow-50/50 border border-yellow-100 rounded-2xl">
                  <label className="text-[9px] font-black text-yellow-800/60 uppercase tracking-widest block mb-2">Order Notes</label>
                  <p className="text-xs font-semibold text-yellow-900 leading-relaxed whitespace-pre-wrap">{selectedOrder.order_notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-zinc-100">
                <Button variant="outline" onClick={() => setSelectedOrder(null)} className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-zinc-450">
                  Close Order Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
