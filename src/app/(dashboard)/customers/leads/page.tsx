'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { 
  Plus, Users, MapPin, Edit2, Trash2, Target, ShieldCheck, 
  Phone, Mail, Clock, Briefcase, FileText, X, Check, MessageSquarePlus, 
  CheckCircle2, PauseCircle, Building2, FileSpreadsheet, Sparkles, User, 
  Compass, UserCheck, ExternalLink, Flame, Snowflake, ArrowRight,
  Filter, Layers, Send, ChevronRight, CheckCircle, Navigation, AlertCircle, Lock,
  ShoppingBag, Search, ChevronDown
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { formatDate, capitalizeFirstLetter, capitalizeWords } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { useLayout } from '@/hooks/useLayout';

export const PIPELINE_STAGES = [
  { key: 'Feeds', label: 'Feeds', desc: 'Raw field prospect data' },
  { key: 'Open Leads', label: 'Open Leads', desc: 'HQ unassigned intake' },
  { key: 'New Leads', label: 'New Leads', desc: 'Branch intake / assigned' },
  { key: 'Sales Leads', label: 'Sales Leads', desc: 'Sales rep assigned' },
  { key: 'Follow-ups', label: 'Follow-ups', desc: 'Active communication queue' },
  { key: 'Meetings', label: 'Meetings', desc: 'Pitching & presentation' },
  { key: 'Hot Leads', label: 'Hot Leads', desc: 'Qualified & approved' },
  { key: 'Quotations', label: 'Quotations', desc: 'Commercial quotation sent' },
  { key: 'Deals', label: 'Deals', desc: 'Initial payment received' },
  { key: 'SO Converted Deals', label: 'SO Converted Deals', desc: 'Converted to Production Order' }
] as const;

export type PipelineStageKey = typeof PIPELINE_STAGES[number]['key'];

export const ACTIVE_LEAD_STAGES = [
  { key: 'Open Leads', label: 'Open Leads', desc: 'HQ unassigned intake' },
  { key: 'New Leads', label: 'New Leads', desc: 'Branch intake / assigned' },
  { key: 'Sales Leads', label: 'Sales Leads', desc: 'Sales rep assigned' },
  { key: 'Follow-ups', label: 'Follow-ups', desc: 'Active communication queue' },
  { key: 'Meetings', label: 'Meetings', desc: 'Pitching & presentation' },
  { key: 'Hot Leads', label: 'Hot Leads', desc: 'Qualified & approved' }
] as const;

export const ACTIVE_LEAD_STAGE_KEYS: string[] = ACTIVE_LEAD_STAGES.map(s => s.key);

export type UserIntakeRole = 'salesperson' | 'branch_staff' | 'hq_staff';

export const getUserIntakeRole = (currentUser: any): UserIntakeRole => {
  if (!currentUser) return 'hq_staff';

  const role = (currentUser.role || '').toLowerCase();
  const designation = (currentUser.designation || '').toLowerCase();
  const department = (currentUser.department || '').toLowerCase();
  const hasBranch = Boolean(currentUser.branchId);

  // 1. Sales Person: has sales designation, role, or department
  const isSales = designation.includes('sales') || role.includes('sales') || department.includes('sales');
  if (isSales) {
    return 'salesperson';
  }

  // 2. Branch Staff / Manager: belongs to a branch and not a global admin
  const isGlobalAdmin = role === 'admin' || role === 'super admin' || role === 'superadmin' || role === 'corporate';
  if (hasBranch && !isGlobalAdmin) {
    return 'branch_staff';
  }

  // 3. Headquarters Staff (HQ Admin / Corporate Desk)
  return 'hq_staff';
};

export interface Lead {
  id: number;
  lead_code: string;
  name: string;
  contact_title?: string | null;
  contact_person?: string | null;
  contact_designation?: string | null;
  phone: string | null;
  email?: string | null;
  source?: string | null;
  requirements?: string | null;
  industry_id: number | null;
  industries?: { id: number; name: string } | null;
  address: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  assigned_staff_id: number | null;
  employees?: { 
    id: number; 
    full_name: string; 
    employee_id: string; 
    branch_id?: number | null;
    department?: string;
    designation?: string;
  } | null;
  branch_id?: number | null;
  zone_id?: number | null;
  zones?: Zone | null;
  status: string;
  remarks: any;
  area?: string | null;
  google_maps_link?: string | null;
  is_cold?: boolean;
  origin?: string | null;
  organization_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Industry {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  full_name: string;
  employee_id: string;
  department?: string;
  designation?: string;
  branch_id?: number | null;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Zone {
  id: number;
  name: string;
  code?: string | null;
  branch_id: number;
  description?: string | null;
  is_active?: boolean;
  branches?: { id: number; name: string; code?: string | null } | null;
}

export interface LeadActivity {
  id: number | string;
  lead_id: number;
  stage: string;
  activity_type: string;
  response_type?: string | null;
  remarks?: string | null;
  staff_name?: string | null;
  staff_employee_id?: string | null;
  staff_designation?: string | null;
  staff_department?: string | null;
  created_at: string;
}

export default function LeadsRegistryPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [activeStageFilter, setActiveStageFilter] = useState<string>('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'active' | 'cold'>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [prioritizeNoFollowups, setPrioritizeNoFollowups] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Available zones filtered by selected branch
  const availableFilterZones = useMemo(() => {
    if (selectedBranch === 'ALL') return zones;
    if (selectedBranch === 'HQ') {
      const hqZones = zones.filter(z => !z.branch_id);
      return hqZones.length > 0 ? hqZones : zones;
    }
    return zones.filter(z => String(z.branch_id) === selectedBranch);
  }, [zones, selectedBranch]);

  // Modals
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [prefillFeedData, setPrefillFeedData] = useState<Partial<Lead> | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);

  // Context Actions
  const [editingFeed, setEditingFeed] = useState<Lead | null>(null);
  const [feedOutcomeLead, setFeedOutcomeLead] = useState<Lead | null>(null);
  const [assignBranchLead, setAssignBranchLead] = useState<Lead | null>(null);
  const [assignStaffLead, setAssignStaffLead] = useState<Lead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [meetingOutcomeLead, setMeetingOutcomeLead] = useState<Lead | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse current user from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (searchParams && leads.length > 0) {
      const idParam = searchParams.get('id');
      if (idParam) {
        const id = parseInt(idParam, 10);
        const match = leads.find(l => l.id === id);
        if (match) {
          setViewingLead(match);
        }
      }
    }
  }, [searchParams, leads]);

  const userRole = (currentUser?.role || '').toLowerCase();
  const userPermissions: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isSuperAdmin = userRole === 'admin' || userRole === 'super admin' || userRole === 'superadmin' || userRole === 'corporate' || userPermissions.includes('all');

  const canViewAllLeads = isSuperAdmin || userPermissions.includes('view_all_leads');
  const canManageLeads = isSuperAdmin || userPermissions.includes('manage_leads');
  const canManageFeeds = canManageLeads || userPermissions.includes('manage_lead_stage_feeds');
  const canAssignBranch = canManageLeads || userPermissions.includes('manage_lead_stage_assign_branch');
  const canAssignStaff = canManageLeads || userPermissions.includes('manage_lead_stage_assign_staff');
  const canSalesContact = canManageLeads || userPermissions.includes('manage_lead_stage_sales_contact');
  const canManageFollowups = canManageLeads || userPermissions.includes('manage_lead_stage_followups');
  const canManageMeetings = canManageLeads || userPermissions.includes('manage_lead_stage_meetings');
  const canManageHotLeads = canManageLeads || userPermissions.includes('manage_lead_stage_hot_leads');

  const isBranchManager = Boolean(
    currentUser?.branchId && (
      userRole.includes('branch manager') ||
      (currentUser?.designation || '').toLowerCase().includes('branch manager') ||
      ((currentUser?.designation || '').toLowerCase().includes('manager') && !(currentUser?.designation || '').toLowerCase().includes('sales')) ||
      canAssignStaff
    )
  );

  const isSalesperson = !isBranchManager && Boolean(
    (currentUser?.designation || '').toLowerCase().includes('sales') ||
    userRole.includes('sales') ||
    (currentUser?.department || '').toLowerCase().includes('sales') ||
    canSalesContact
  );

  const authorName = currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Executive Agent';
  const authorDesignation = currentUser?.designation || currentUser?.role || 'Relationship Manager';
  const authorDepartment = currentUser?.department || 'Commercial Sales';

  // Overdue Sales Leads (no follow up for 2 days or more) - includes Sales Leads & Follow-ups
  const isOverdueSalesLead = useCallback((l: Lead) => {
    const isSalesStage = l.status === 'Sales Leads' || l.status === 'Follow-ups' || (Boolean(l.assigned_staff_id) && l.status === 'New Leads');
    if (!isSalesStage) return false;
    const refDate = l.updated_at || l.created_at;
    if (!refDate) return false;
    const daysInactive = Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysInactive >= 2;
  }, []);

  const overdueSalesLeadsCount = useMemo(() => {
    return leads.filter(l => ACTIVE_LEAD_STAGE_KEYS.includes(l.status) && isOverdueSalesLead(l)).length;
  }, [leads, isOverdueSalesLead]);

  const getRowClassName = useCallback((l: Lead) => {
    if (prioritizeNoFollowups && isOverdueSalesLead(l)) {
      return '!bg-rose-50/75 hover:!bg-rose-100/75 transition-colors border-b border-rose-200/50';
    }
    return undefined;
  }, [prioritizeNoFollowups, isOverdueSalesLead]);

  // Immediate optimistic/realtime lead update helper
  const handleLeadUpdated = useCallback((updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
    setViewingLead(prev => (prev && prev.id === updatedLead.id ? { ...prev, ...updatedLead } : prev));
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadsRes, indRes, empRes, brRes, zonesRes] = await Promise.allSettled([
        api.get('/leads'),
        api.get('/industries'),
        api.get('/employees'),
        api.get('/branches'),
        api.get('/zones')
      ]);

      if (leadsRes.status === 'fulfilled') {
        const freshLeads = leadsRes.value.data || [];
        setLeads(freshLeads);
        setViewingLead(prev => {
          if (!prev) return null;
          const updated = freshLeads.find((l: Lead) => l.id === prev.id);
          return updated || prev;
        });
      } else {
        console.error('Failed to load leads:', leadsRes.reason);
        toast.error('Failed to load leads details');
      }

      if (indRes.status === 'fulfilled') {
        setIndustries(indRes.value.data || []);
      }

      if (empRes.status === 'fulfilled') {
        setEmployees(empRes.value.data || []);
      }

      if (brRes.status === 'fulfilled') {
        setBranches(brRes.value.data || []);
      }

      if (zonesRes.status === 'fulfilled') {
        setZones(zonesRes.value.data || []);
      }
    } catch (err) {
      toast.error('Failed to load leads details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time synchronization via Supabase channel
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('realtime_leads_page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new;
            setLeads(prev => (prev.some(l => l.id === newRow.id) ? prev : [newRow, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
            setViewingLead(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            setLeads(prev => prev.filter(l => l.id !== oldId));
            setViewingLead(prev => (prev && prev.id === oldId ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Create or Update Lead
  const handleAddOrUpdate = async (formData: any) => {
    if (!formData.phone || !formData.phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }

    const loadingToast = toast.loading(editingLead ? 'Updating lead profile...' : 'Registering new lead...');

    // Resolve role-based branch and staff assignment
    const intakeRole = getUserIntakeRole(currentUser);
    let resolvedBranchId: number | null = null;
    let resolvedAssignedStaffId: number | null = null;

    if (editingLead) {
      resolvedBranchId = formData.branch_id ? parseInt(formData.branch_id, 10) : (editingLead.branch_id || null);
      resolvedAssignedStaffId = formData.assigned_staff_id ? parseInt(formData.assigned_staff_id, 10) : (editingLead.assigned_staff_id || null);
    } else {
      if (intakeRole === 'salesperson') {
        resolvedBranchId = currentUser?.branchId ? parseInt(currentUser.branchId, 10) : (formData.branch_id ? parseInt(formData.branch_id, 10) : null);
        const matchedEmployee = employees.find(e => 
          (currentUser?.employeeRecordId && e.id === currentUser.employeeRecordId) ||
          (currentUser?.employeeId && e.employee_id === currentUser.employeeId) ||
          (currentUser?.id && (e as any).user_id === currentUser.id)
        );
        resolvedAssignedStaffId = matchedEmployee ? matchedEmployee.id : (currentUser?.employeeRecordId || null);
      } else if (intakeRole === 'branch_staff') {
        resolvedBranchId = currentUser?.branchId ? parseInt(currentUser.branchId, 10) : null;
        resolvedAssignedStaffId = formData.assigned_staff_id ? parseInt(formData.assigned_staff_id, 10) : null;
      } else {
        // hq_staff
        resolvedBranchId = formData.branch_id ? parseInt(formData.branch_id, 10) : null;
        resolvedAssignedStaffId = null;
      }
    }

    // Deterministic intake status
    let calculatedStatus = editingLead ? (formData.status || editingLead.status) : 'Open Leads';
    if (!editingLead) {
      if (resolvedBranchId && resolvedAssignedStaffId) {
        calculatedStatus = 'Sales Leads';
      } else if (resolvedBranchId) {
        calculatedStatus = 'New Leads';
      } else {
        calculatedStatus = 'Open Leads';
      }
    }

    const payload = {
      name: formData.name.trim(),
      contact_title: formData.contact_title || 'Mr.',
      contact_person: formData.contact_person?.trim() || null,
      contact_designation: formData.contact_designation?.trim() || null,
      phone: formData.phone.trim(),
      contact_number: formData.phone.trim(),
      email: formData.email?.trim() || null,
      source: formData.source?.trim() || null,
      requirements: formData.requirements?.trim() || null,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address?.trim() || null,
      area: formData.area?.trim() || null,
      google_maps_link: formData.google_maps_link?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      pincode: formData.pincode?.trim() || null,
      country: formData.country?.trim() || 'India',
      branch_id: resolvedBranchId,
      zone_id: formData.zone_id ? parseInt(formData.zone_id, 10) : null,
      assigned_staff_id: resolvedAssignedStaffId,
      status: calculatedStatus,
      remarks: formData.remarks || null
    };

    try {
      if (editingLead) {
        await api.put(`/leads/${editingLead.id}`, payload);
        toast.success('Lead updated successfully!', { id: loadingToast });
      } else {
        await api.post('/leads', payload);
        toast.success('New lead registered successfully!', { id: loadingToast });
      }
      setIsAddingLead(false);
      setEditingLead(null);
      setPrefillFeedData(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  // Handle Quick Field Feed Intake
  const handleCreateFeed = async (feedData: any) => {
    const loadingToast = toast.loading('Recording raw field feed...');
    try {
      const res = await api.post('/leads/feed', feedData);
      toast.success(res.data?.message || 'Field feed captured successfully!', { id: loadingToast });
      setIsAddingFeed(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to capture field feed', { id: loadingToast });
    }
  };

  // Handle Update Existing Field Feed Profile
  const handleUpdateFeed = async (feedData: any) => {
    if (!editingFeed) return;
    const loadingToast = toast.loading('Updating feed profile...');
    try {
      const res = await api.put(`/leads/${editingFeed.id}`, {
        ...feedData,
        status: 'Feeds'
      });
      toast.success('Feed profile updated successfully!', { id: loadingToast });
      setEditingFeed(null);
      if (viewingLead && viewingLead.id === editingFeed.id) {
        setViewingLead(res.data || { ...viewingLead, ...feedData });
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update feed profile', { id: loadingToast });
    }
  };

  // Convert Feed to Full Lead (Prefills Modal)
  const handleConvertFeedToLead = (feed: Lead) => {
    setPrefillFeedData({
      id: feed.id,
      name: feed.name,
      contact_title: feed.contact_title || 'Mr.',
      contact_person: feed.contact_person,
      contact_designation: feed.contact_designation,
      phone: feed.phone,
      address: feed.address,
      area: feed.area,
      city: feed.city,
      state: feed.state,
      pincode: feed.pincode,
      country: feed.country || 'India',
      google_maps_link: feed.google_maps_link,
      zone_id: feed.zone_id,
      industry_id: feed.industry_id,
      branch_id: feed.branch_id,
      status: feed.branch_id ? 'New Leads' : 'Open Leads',
      remarks: typeof feed.remarks === 'string' ? feed.remarks : ''
    });
    setEditingLead(feed);
    setIsAddingLead(true);
  };

  // Handle Confirmed Delete
  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Removing lead record...');
    const id = deleteConfirm.id;
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead removed successfully', { id: loadingToast });
      if (viewingLead && viewingLead.id === id) {
        setViewingLead(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete lead', { id: loadingToast });
    }
  };

  // Filtered Leads (Only active lead stages - excludes Feeds, Quotations, Deals, SO Converted Deals)
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Must be an active lead stage
      if (!ACTIVE_LEAD_STAGE_KEYS.includes(l.status)) {
        return false;
      }
      // 1. Branch filter
      if (selectedBranch !== 'ALL') {
        if (selectedBranch === 'HQ') {
          const isHq = !l.branch_id || l.origin === 'HQ';
          if (!isHq) return false;
        } else {
          const bId = String(l.branch_id || l.employees?.branch_id || '');
          if (bId !== selectedBranch) return false;
        }
      }
      // 2. Zone filter
      if (selectedZone !== 'ALL') {
        const zId = String(l.zone_id || '');
        if (zId !== selectedZone) return false;
      }
      // 3. Sector / Industry filter
      if (selectedIndustry !== 'ALL') {
        const indId = String(l.industry_id || '');
        if (indId !== selectedIndustry) return false;
      }
      // 4. Stage filter
      if (activeStageFilter === 'ALL') return true;
      if (activeStageFilter === 'cold_leads') {
        return l.status === 'Follow-ups' && !!l.is_cold;
      }
      if (activeStageFilter === 'Follow-ups') {
        if (l.status !== 'Follow-ups') return false;
        if (followUpFilter === 'active') return !l.is_cold;
        if (followUpFilter === 'cold') return !!l.is_cold;
        return true;
      }
      return l.status === activeStageFilter;
    });
  }, [leads, selectedBranch, selectedZone, selectedIndustry, activeStageFilter, followUpFilter]);

  // Stage counts for Filter Pills (restricted to ACTIVE_LEAD_STAGES)
  const stageCounts = useMemo(() => {
    const activeLeads = leads.filter(l => ACTIVE_LEAD_STAGE_KEYS.includes(l.status));
    const counts: Record<string, number> = {
      ALL: activeLeads.length,
      'cold_followups': activeLeads.filter(l => l.status === 'Follow-ups' && l.is_cold).length,
      'active_followups': activeLeads.filter(l => l.status === 'Follow-ups' && !l.is_cold).length,
    };
    ACTIVE_LEAD_STAGES.forEach(s => {
      counts[s.key] = activeLeads.filter(l => l.status === s.key).length;
    });
    return counts;
  }, [leads]);

  // Status Badge Rendering Helper
  const renderStatusBadge = (l: Lead) => {
    const badgeStyles: Record<string, string> = {
      'Feeds': 'bg-sky-50 text-sky-700 border-sky-200',
      'Open Leads': 'bg-blue-50 text-blue-700 border-blue-200',
      'New Leads': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Sales Leads': 'bg-violet-50 text-violet-700 border-violet-200',
      'Follow-ups': 'bg-amber-50 text-amber-700 border-amber-200',
      'Meetings': 'bg-purple-50 text-purple-700 border-purple-200',
      'Hot Leads': 'bg-orange-50 text-orange-700 border-orange-200',
      'Quotations': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'Deals': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'SO Converted Deals': 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black',
      'Converted': 'bg-green-50 text-green-700 border-green-200',
      'Lost': 'bg-rose-50 text-rose-700 border-rose-200'
    };

    const cls = badgeStyles[l.status] || 'bg-zinc-50 text-zinc-500 border-zinc-200';
    const refDate = l.updated_at || l.created_at;
    const daysInactive = refDate ? Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isOverdueSales = (l.status === 'Sales Leads' || l.status === 'Follow-ups' || (Boolean(l.assigned_staff_id) && l.status === 'New Leads')) && daysInactive >= 2;
    const isOtherInactive = l.status === 'New Leads' && daysInactive >= 3;

    return (
      <div className="flex flex-col items-start gap-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
          {l.status === 'Hot Leads' && <Flame size={11} className="text-orange-500" />}
          {l.status}
        </span>
        {prioritizeNoFollowups && isOverdueSales && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs" title={`Overdue: No follow-up for ${daysInactive} days`}>
            <Clock size={10} className="text-rose-600 shrink-0" />
            <span>No Follow-up ({daysInactive}d)</span>
          </span>
        )}
        {prioritizeNoFollowups && !isOverdueSales && isOtherInactive && !l.is_cold && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs" title={`No follow-up logged for ${daysInactive} days`}>
            <Clock size={10} className="text-amber-600 shrink-0" />
            <span>No Follow-up ({daysInactive}d)</span>
          </span>
        )}
        {l.is_cold && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <Snowflake size={10} className="text-rose-500 shrink-0" />
            <span>Cold Lead</span>
          </span>
        )}
      </div>
    );
  };

  // Table Columns
  const columns: Column<Lead>[] = useMemo(() => [
    {
      header: 'Customer Name',
      className: 'min-w-[160px] max-w-[280px]',
      sortValue: (l) => l.name,
      accessor: (l) => (
        <div className="group min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setViewingLead(l)}
              className="text-left font-black text-xs md:text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline transition-all cursor-pointer border-none bg-transparent p-0 outline-none truncate block"
              title={l.name}
            >
              {l.name}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/customers/leads?id=${l.id}`, '_blank');
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-all cursor-pointer shrink-0"
              title="Open lead in new tab"
            >
              <ExternalLink size={13.5} />
            </button>
          </div>
          {l.industries?.name && (
            <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-wider truncate mt-0.5">
              {l.industries.name}
            </p>
          )}
        </div>
      )
    },

    {
      header: 'Contact Person',
      className: 'min-w-[130px] max-w-[200px] whitespace-nowrap',
      sortValue: (l) => l.contact_person || '',
      accessor: (l) => (
        l.contact_person ? (
          <div className="flex flex-col min-w-0 max-w-[190px]">
            <span className="text-xs font-bold text-[#3a525d] truncate block" title={`${l.contact_title ? l.contact_title + ' ' : ''}${l.contact_person}`}>
              {l.contact_title ? `${l.contact_title} ` : ''}{l.contact_person}
            </span>
            {l.contact_designation && (
              <span className="text-[9px] text-zinc-400 font-medium truncate block" title={l.contact_designation}>
                {l.contact_designation}
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Contact Phone',
      className: 'w-[125px] whitespace-nowrap',
      sortValue: (l) => l.phone || '',
      accessor: (l) => (
        l.phone ? (
          <a
            href={`tel:${l.phone}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#3a525d] hover:text-[#2d8d9b] transition-colors"
            title={`Call ${l.phone}`}
          >
            <Phone size={12} className="text-[#2d8d9b] shrink-0" />
            <span>{l.phone}</span>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Sales Person',
      className: 'min-w-[150px] max-w-[200px] whitespace-nowrap',
      sortValue: (l) => l.employees?.full_name || '',
      accessor: (l) => (
        l.employees ? (
          <div className="flex items-center gap-2 min-w-0 max-w-[190px]">
            <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <ShieldCheck size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#3a525d] truncate block" title={l.employees.full_name}>
                {l.employees.full_name}
              </p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate block">
                {l.employees.employee_id}
              </p>
            </div>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
            Unassigned
          </span>
        )
      )
    },
    {
      header: 'Stage Status',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (l) => `${l.status}_${l.is_cold ? '1' : '0'}`,
      accessor: (l) => renderStatusBadge(l)
    },
    {
      header: 'Follow-up ( next step)',
      className: 'w-[170px] min-w-[170px] whitespace-nowrap',
      sortable: false,
      accessor: (l: Lead) => {
        let content: React.ReactNode = null;
        if (l.status === 'Feeds') {
          content = canManageFeeds ? (
            <button
              type="button"
              onClick={() => setFeedOutcomeLead(l)}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all cursor-pointer"
              title="Record feed follow-up outcome"
            >
              Follow-up
            </button>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-md inline-flex items-center gap-1 select-none" title="Requires permission: manage_lead_stage_feeds">
              <Lock size={10} className="text-zinc-400" /> Locked
            </span>
          );
        } else if (l.status === 'Open Leads') {
          content = canAssignBranch ? (
            <button
              type="button"
              onClick={() => setAssignBranchLead(l)}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all cursor-pointer"
            >
              Assign Branch
            </button>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-md inline-flex items-center gap-1 select-none" title="Requires permission: manage_lead_stage_assign_branch">
              <Lock size={10} className="text-zinc-400" /> Locked
            </span>
          );
        } else if (l.status === 'New Leads') {
          content = canAssignStaff ? (
            <button
              type="button"
              onClick={() => setAssignStaffLead(l)}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer"
            >
              Assign Staff
            </button>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-md inline-flex items-center gap-1 select-none" title="Requires permission: manage_lead_stage_assign_staff">
              <Lock size={10} className="text-zinc-400" /> Locked
            </span>
          );
        } else if (l.status === 'Sales Leads') {
          content = canSalesContact ? (
            <button
              type="button"
              onClick={() => setFollowUpLead(l)}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all cursor-pointer"
            >
              Follow-up Note
            </button>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-md inline-flex items-center gap-1 select-none" title="Requires permission: manage_lead_stage_sales_contact">
              <Lock size={10} className="text-zinc-400" /> Locked
            </span>
          );
        } else if (l.status === 'Follow-ups') {
          content = canManageFollowups ? (
            <button
              type="button"
              onClick={() => setFollowUpLead(l)}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all cursor-pointer"
            >
              Follow-up Note
            </button>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-md inline-flex items-center gap-1 select-none" title="Requires permission: manage_lead_stage_followups">
              <Lock size={10} className="text-zinc-400" /> Locked
            </span>
          );
        } else if (l.status === 'Meetings') {
          content = canManageMeetings ? (
            <button
              type="button"
              onClick={() => setMeetingOutcomeLead(l)}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all cursor-pointer"
            >
              Meeting Outcome
            </button>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-md inline-flex items-center gap-1 select-none" title="Requires permission: manage_lead_stage_meetings">
              <Lock size={10} className="text-zinc-400" /> Locked
            </span>
          );
        } else if (l.status === 'Hot Leads') {
          content = canManageHotLeads ? (
            <a
              href={`/marketing/quotations`}
              className="inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-lg transition-all cursor-pointer"
            >
              Send Quote
            </a>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-md inline-flex items-center gap-1 select-none" title="Requires permission: manage_lead_stage_hot_leads">
              <Lock size={10} className="text-zinc-400" /> Locked
            </span>
          );
        } else {
          content = (
            <button
              type="button"
              onClick={() => setViewingLead(l)}
              className="px-2 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-[#2d8d9b] cursor-pointer"
            >
              View Journey →
            </button>
          );
        }

        return (
          <div className="w-[170px] whitespace-nowrap">
            {content}
          </div>
        );
      }
    }
  ], [branches, canManageFeeds, canAssignBranch, canAssignStaff, canSalesContact, canManageFollowups, canManageMeetings, canManageHotLeads]);

  // Print Report Handler
  const handlePrintLeads = (sortedData: Lead[], sortInfo: SortInfo<Lead>) => {
    const printedAt = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = sortedData.map((l, idx) => {
      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">${l.name}</td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 600;">${l.contact_person ? `${l.contact_title ? l.contact_title + ' ' : ''}${l.contact_person}` : '—'}</div>
          ${l.contact_designation ? `<div style="color: #a0aec0; font-size: 8px;">${l.contact_designation}</div>` : ''}
        </td>
        <td style="font-size: 10px; font-family: monospace; color: #4a5568;">${l.phone || '—'}</td>
        <td style="font-size: 10px; color: #4a5568;">${l.employees?.full_name || 'Unassigned'}</td>
        <td style="text-align: center;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; background: #e0f2fe; color: #0369a1;">
              ${l.status}
            </span>
            ${l.is_cold ? `<span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; text-transform: uppercase; background: #ffe4e6; color: #be123c;">Cold Lead</span>` : ''}
          </div>
        </td>
      </tr>
    `;}).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Leads Commercial Pipeline Report - Forma Apparels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a202c; padding: 24px; font-size: 11px; }
    @page { size: landscape; margin: 8mm; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3a525d; padding-bottom: 14px; margin-bottom: 14px; }
    .brand-title { font-size: 22px; font-weight: 900; color: #3a525d; }
    .brand-subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #2d8d9b; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #3a525d; }
    td { border: 1px solid #e2e8f0; padding: 6px 10px; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-title">FORMA APPARELS</div>
      <div class="brand-subtitle">CRM 11-Stage Commercial Sales Pipeline</div>
      <div style="font-size: 14px; font-weight: 800; color: #2d8d9b; margin-top: 6px;">Leads Directory & Pipeline Status</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #4a5568;">
      <div><strong>Printed:</strong> ${printedAt}</div>
      <div><strong>Filter Stage:</strong> ${activeStageFilter}</div>
      <div><strong>Branch:</strong> ${activeBranchName}</div>
      <div><strong>Total Records:</strong> ${sortedData.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px;">#</th>
        <th>Customer Name</th>
        <th>Contact Person</th>
        <th>Contact Phone</th>
        <th>Sales Person</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px;">No leads matching filters</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 250);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Leads</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Active Commercial Intake, Follow-ups &amp; Qualified Pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageLeads && (
            <Button
              onClick={() => {
                setEditingLead(null);
                setPrefillFeedData(null);
                setIsAddingLead(true);
              }}
              className="h-14 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#3a525d]/20 gap-2"
            >
              <Plus size={18} strokeWidth={3} />
              New Lead
            </Button>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={filteredLeads}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onPrint={handlePrintLeads}
        pinRowTop={prioritizeNoFollowups ? isOverdueSalesLead : undefined}
        rowClassName={prioritizeNoFollowups ? getRowClassName : undefined}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Branch Dropdown Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedZone('ALL');
              }}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Branches ({leads.length})</option>
              {(() => {
                const hqCount = leads.filter(l => !l.branch_id || l.origin === 'HQ').length;
                return (
                  <option value="HQ">
                    Headquarters (HQ Central) ({hqCount})
                  </option>
                );
              })()}
              {branches.map((b) => {
                const count = leads.filter(l => String(l.branch_id || l.employees?.branch_id || '') === String(b.id)).length;
                return (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 2. Pipeline Stage Status Dropdown Filter */}
            <select
              value={activeStageFilter}
              onChange={(e) => {
                setActiveStageFilter(e.target.value);
                if (e.target.value !== 'Follow-ups') {
                  setFollowUpFilter('all');
                }
              }}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Stages ({stageCounts['ALL'] || 0})</option>
              {ACTIVE_LEAD_STAGES.map((s, idx) => (
                <option key={s.key} value={s.key}>
                  {idx + 1}. {s.label} ({stageCounts[s.key] || 0})
                </option>
              ))}
              <option value="cold_leads">
                ❄ Cold Leads ({stageCounts['cold_followups'] || 0})
              </option>
            </select>

            {/* Follow-ups Sub-filter Dropdown (Active vs Cold Leads Tag) */}
            {activeStageFilter === 'Follow-ups' && (
              <select
                value={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.value as any)}
                className="h-10 px-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 outline-none focus:ring-2 focus:ring-amber-500/30 transition-all cursor-pointer shadow-2xs"
              >
                <option value="all">All Follow-ups ({stageCounts['Follow-ups'] || 0})</option>
                <option value="active">Active Follow-ups ({stageCounts['active_followups'] || 0})</option>
                <option value="cold">❄ Cold Leads Tagged ({stageCounts['cold_followups'] || 0})</option>
              </select>
            )}

            {/* 3. Zone Dropdown Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Zones ({leads.length})</option>
              {availableFilterZones.map(z => {
                const count = leads.filter(l => String(l.zone_id) === String(z.id)).length;
                return (
                  <option key={z.id} value={String(z.id)}>
                    {z.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 4. Sector / Industry Dropdown Filter */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Sectors ({leads.length})</option>
              {industries.map(ind => {
                const count = leads.filter(l => String(l.industry_id) === String(ind.id)).length;
                return (
                  <option key={ind.id} value={String(ind.id)}>
                    {ind.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 5. No Follow-ups Filter */}
            <label 
              className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer select-none shadow-2xs ${
                prioritizeNoFollowups 
                  ? 'bg-rose-50/90 border-rose-300 text-rose-900 ring-2 ring-rose-400/20' 
                  : 'bg-white border-[#fce4d4] text-[#3a525d] hover:bg-zinc-50'
              }`}
              title="Tick to prioritize and highlight leads with no follow-up for 2+ days on top"
            >
              <input
                type="checkbox"
                checked={prioritizeNoFollowups}
                onChange={(e) => setPrioritizeNoFollowups(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 accent-rose-600 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${prioritizeNoFollowups ? 'bg-rose-500 animate-pulse' : 'bg-zinc-300'}`} />
                <span>No Follow-ups</span>
                {overdueSalesLeadsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    prioritizeNoFollowups ? 'bg-rose-200 text-rose-900' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {overdueSalesLeadsCount}
                  </span>
                )}
              </span>
            </label>
          </div>
        }
      />

      {/* Delete Lead Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Remove Lead Profile?"
        message="This will permanently delete the lead record and all historical activity logs. This action cannot be undone."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Yes, Delete"
        variant="danger"
      />

      {/* Credentials Modal (Generated when converted to customer organization) */}
      <CredentialsModal
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

      {/* 11-Stage Lead View & Journey Modal */}
      <LeadViewModal
        isOpen={!!viewingLead}
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        permissions={{
          canManageLeads,
          canManageFeeds,
          canAssignBranch,
          canAssignStaff,
          canSalesContact,
          canManageFollowups,
          canManageMeetings,
          canManageHotLeads,
        }}
        onEdit={() => {
          if (viewingLead) {
            if (viewingLead.status === 'Feeds') {
              setEditingFeed(viewingLead);
            } else {
              setEditingLead(viewingLead);
              setPrefillFeedData(null);
              setIsAddingLead(true);
            }
          }
        }}
        onDelete={() => {
          if (viewingLead) {
            setDeleteConfirm({ isOpen: true, id: viewingLead.id });
          }
        }}
        onFeedOutcome={() => {
          if (viewingLead) setFeedOutcomeLead(viewingLead);
        }}
        onAssignBranch={() => {
          if (viewingLead) setAssignBranchLead(viewingLead);
        }}
        onAssignStaff={() => {
          if (viewingLead) setAssignStaffLead(viewingLead);
        }}
        onFollowUp={() => {
          if (viewingLead) setFollowUpLead(viewingLead);
        }}
        onMeetingOutcome={() => {
          if (viewingLead) setMeetingOutcomeLead(viewingLead);
        }}
        onConvertFeed={() => {
          if (viewingLead) handleConvertFeedToLead(viewingLead);
        }}
        onReload={fetchData}
      />

      {/* Quick Field Feed Intake Modal */}
      <NewFeedModal
        isOpen={isAddingFeed}
        onClose={() => setIsAddingFeed(false)}
        onSubmit={handleCreateFeed}
        branches={branches}
        zones={zones}
        industries={industries}
        authorName={authorName}
        authorDesignation={authorDesignation}
        authorDepartment={authorDepartment}
        userBranchId={currentUser?.branchId}
        userBranchName={currentUser?.branchName}
      />

      {/* Edit Feed Profile Modal */}
      {editingFeed && (
        <NewFeedModal
          isOpen={Boolean(editingFeed)}
          onClose={() => setEditingFeed(null)}
          onSubmit={handleUpdateFeed}
          editingFeed={editingFeed}
          branches={branches}
          zones={zones}
          industries={industries}
          authorName={authorName}
          authorDesignation={authorDesignation}
          authorDepartment={authorDepartment}
          userBranchId={currentUser?.branchId}
          userBranchName={currentUser?.branchName}
        />
      )}

      {/* Full Lead Registry / Edit Modal */}
      <LeadFormModal
        isOpen={isAddingLead}
        onClose={() => {
          setIsAddingLead(false);
          setEditingLead(null);
          setPrefillFeedData(null);
        }}
        onSubmit={handleAddOrUpdate}
        editingLead={editingLead}
        prefillData={prefillFeedData}
        industries={industries}
        branches={branches}
        zones={zones}
        employees={employees}
        currentUser={currentUser}
        userBranchId={currentUser?.branchId}
        userBranchName={currentUser?.branchName}
      />

      {/* Feed Response Outcome Modal */}
      {feedOutcomeLead && (
        <FeedOutcomeModal
          lead={feedOutcomeLead}
          branches={branches}
          onClose={() => setFeedOutcomeLead(null)}
          onSuccess={(updated) => {
            setFeedOutcomeLead(null);
            if (updated) handleLeadUpdated(updated);
            fetchData();
          }}
          onConvertToLead={() => {
            const target = feedOutcomeLead;
            setFeedOutcomeLead(null);
            handleConvertFeedToLead(target);
          }}
        />
      )}

      {/* Assign Branch Modal */}
      {assignBranchLead && (
        <AssignBranchModal
          lead={assignBranchLead}
          branches={branches}
          onClose={() => setAssignBranchLead(null)}
          onSuccess={() => {
            setAssignBranchLead(null);
            fetchData();
          }}
        />
      )}

      {/* Assign Staff Modal */}
      {assignStaffLead && (
        <AssignStaffModal
          lead={assignStaffLead}
          employees={employees}
          onClose={() => setAssignStaffLead(null)}
          onSuccess={() => {
            setAssignStaffLead(null);
            fetchData();
          }}
        />
      )}

      {/* Follow-up Note & Outcome Modal */}
      {followUpLead && (
        <FollowUpOutcomeModal
          lead={followUpLead}
          onClose={() => setFollowUpLead(null)}
          onSuccess={(updated) => {
            setFollowUpLead(null);
            if (updated) handleLeadUpdated(updated);
            fetchData();
          }}
        />
      )}

      {/* Meeting Outcome Modal (Hot Lead vs Cold Lead) */}
      {meetingOutcomeLead && (
        <MeetingOutcomeModal
          lead={meetingOutcomeLead}
          onClose={() => setMeetingOutcomeLead(null)}
          onSuccess={(creds, updated) => {
            setMeetingOutcomeLead(null);
            if (creds) {
              setCredsModal({ isOpen: true, data: creds });
            }
            if (updated) handleLeadUpdated(updated);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------
// Component 1: New Field Feed Intake Modal
// -------------------------------------------------------------------------------------
interface NewFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  branches: Branch[];
  zones?: Zone[];
  industries?: Industry[];
  authorName: string;
  authorDesignation: string;
  authorDepartment: string;
  userBranchId?: number | null;
  userBranchName?: string | null;
  editingFeed?: Lead | null;
}

export const NewFeedModal: React.FC<NewFeedModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  branches,
  zones = [],
  industries = [],
  authorName,
  authorDesignation,
  authorDepartment,
  userBranchId,
  userBranchName,
  editingFeed
}) => {
  const [name, setName] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [contactTitle, setContactTitle] = useState('Mr.');
  const [contactPerson, setContactPerson] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');
  const [remarks, setRemarks] = useState('');
  const [hqBranchId, setHqBranchId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Searchable Zone State
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
        setIsZoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isBranchUser = Boolean(userBranchId);
  const effectiveOrigin = isBranchUser ? 'BRANCH' : (hqBranchId ? 'BRANCH' : 'HQ');
  const effectiveBranchId = isBranchUser ? userBranchId : (hqBranchId ? parseInt(hqBranchId, 10) : null);

  const selectableBranches = useMemo(() => {
    return (branches || []).filter(b => {
      const tier = ((b as any).tier || (b as any).type || '').toLowerCase();
      if (tier === 'corporate' || tier === 'factory' || tier === 'headquarters') return false;
      const name = (b.name || '').toLowerCase();
      const code = ((b as any).code || '').toLowerCase();
      if (
        name.includes('headquarter') ||
        name.includes('corporate') ||
        name.includes('factory') ||
        name.includes('hq central') ||
        name.trim() === 'hq'
      ) return false;
      if (code.startsWith('corp') || code.startsWith('fact')) return false;
      return true;
    });
  }, [branches]);

  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    (branches || []).forEach(b => map.set(String(b.id), b.name));
    return map;
  }, [branches]);

  const availableZones = useMemo(() => {
    if (!effectiveBranchId) {
      const selectableBranchIds = new Set(selectableBranches.map(b => String(b.id)));
      const filtered = (zones || []).filter(z => !z.branch_id || selectableBranchIds.has(String(z.branch_id)));
      return filtered.length > 0 ? filtered : (zones || []);
    }
    return (zones || []).filter(z => String(z.branch_id) === String(effectiveBranchId));
  }, [zones, effectiveBranchId, selectableBranches]);

  const selectedZone = useMemo(() => {
    if (!zoneId) return null;
    return (zones || []).find(z => String(z.id) === String(zoneId)) || null;
  }, [zoneId, zones]);

  const displayedZones = useMemo(() => {
    const q = zoneSearchQuery.trim().toLowerCase();
    if (!q) return availableZones;
    return availableZones.filter(z => {
      const nameMatch = (z.name || '').toLowerCase().includes(q);
      const codeMatch = (z.code || '').toLowerCase().includes(q);
      const descMatch = (z.description || '').toLowerCase().includes(q);
      const branchMatch = (branchMap.get(String(z.branch_id)) || '').toLowerCase().includes(q);
      return nameMatch || codeMatch || descMatch || branchMatch;
    });
  }, [availableZones, zoneSearchQuery, branchMap]);

  useEffect(() => {
    if (isOpen) {
      setZoneSearchQuery('');
      setIsZoneDropdownOpen(false);
      if (editingFeed) {
        setName(editingFeed.name || '');
        setIndustryId(editingFeed.industry_id ? String(editingFeed.industry_id) : '');
        setContactTitle(editingFeed.contact_title || 'Mr.');
        setContactPerson(editingFeed.contact_person || '');
        setContactDesignation(editingFeed.contact_designation || '');
        setPhone(editingFeed.phone || '');
        setAddress(editingFeed.address || '');
        setArea(editingFeed.area || '');
        setGoogleMapsLink(editingFeed.google_maps_link || '');
        setCity(editingFeed.city || '');
        setState(editingFeed.state || '');
        setPincode(editingFeed.pincode || '');
        setCountry(editingFeed.country || 'India');
        setRemarks(typeof editingFeed.remarks === 'string' ? editingFeed.remarks : '');
        const initialBranchId = editingFeed.branch_id
          ? String(editingFeed.branch_id)
          : (editingFeed.zone_id ? String(zones?.find(z => String(z.id) === String(editingFeed.zone_id))?.branch_id || '') : '');
        setHqBranchId(initialBranchId);
        setZoneId(editingFeed.zone_id ? String(editingFeed.zone_id) : '');
      } else {
        setName('');
        setIndustryId('');
        setContactTitle('Mr.');
        setContactPerson('');
        setContactDesignation('');
        setPhone('');
        setAddress('');
        setArea('');
        setGoogleMapsLink('');
        setCity('');
        setState('');
        setPincode('');
        setCountry('India');
        setRemarks('');
        setHqBranchId('');
        setZoneId('');
      }
    }
  }, [isOpen, editingFeed]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Customer Name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Contact phone number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...(editingFeed ? { id: editingFeed.id } : {}),
        name: name.trim(),
        industry_id: industryId ? parseInt(industryId, 10) : null,
        contact_title: contactTitle,
        contact_person: contactPerson.trim() || null,
        contact_designation: contactDesignation.trim() || null,
        phone: phone.trim(),
        contact_number: phone.trim(),
        address: address.trim() || null,
        area: area.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        country: country.trim() || 'India',
        google_maps_link: googleMapsLink.trim() || null,
        remarks: remarks.trim() || null,
        origin: effectiveOrigin,
        branch_id: effectiveBranchId,
        zone_id: zoneId ? parseInt(zoneId, 10) : null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col my-8 z-10 max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2d8d9b] to-[#1c6670] px-8 py-6 text-white relative flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-2xl font-black italic tracking-tight">
              {editingFeed ? 'Edit Feed Profile' : 'Add New Feed'}
            </h3>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              {editingFeed ? `Update scouting prospect details for ${editingFeed.name}` : 'Add new feed to the dataset.'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
          {/* Authenticated Staff Auto-Logged */}
          <div className="bg-teal-50/70 border border-teal-100/80 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-teal-700 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#2d8d9b]" />
                Authenticated Staff & Branch (Auto-Logged)
              </span>
              <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                Active Session
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/80 rounded-xl p-2.5 border border-teal-100/60">
                <p className="text-[8px] font-black uppercase text-zinc-400">Agent Name</p>
                <p className="text-xs font-black text-[#3a525d] truncate mt-0.5">{authorName}</p>
              </div>
              <div className="bg-white/80 rounded-xl p-2.5 border border-teal-100/60">
                <p className="text-[8px] font-black uppercase text-zinc-400">Origin / Branch</p>
                <p className="text-xs font-black text-[#2d8d9b] truncate mt-0.5">
                  {isBranchUser ? (userBranchName || `Branch #${userBranchId}`) : 'Headquarters (HQ)'}
                </p>
              </div>
              <div className="bg-white/80 rounded-xl p-2.5 border border-teal-100/60">
                <p className="text-[8px] font-black uppercase text-zinc-400">Department</p>
                <p className="text-xs font-black text-zinc-700 truncate mt-0.5">{authorDepartment}</p>
              </div>
            </div>
          </div>

          {/* Customer Name & Industry Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="e.g. Apex Hospital, Greenfield High"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#2d8d9b]" />
                Industry Sector
              </label>
              <select
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white cursor-pointer"
              >
                <option value="">Select Sector / Category</option>
                {industries.map((ind) => (
                  <option key={ind.id} value={String(ind.id)}>
                    {ind.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Person: Title + Full Name + Designation */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <User size={13} className="text-[#2d8d9b]" />
              Contact Person Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <select
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
                >
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Full Name (e.g. Senthil Kumar)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Designation (e.g. Admin Officer)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Contact Number & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Contact Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98450 12345"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Area / Locality
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="e.g. Indiranagar 100ft Road"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Address Details: Street, City, State, Pincode, Country */}
          <div className="space-y-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <MapPin size={13} className="text-[#2d8d9b]" />
              5-Part Standard Address Details
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Street / Building Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="e.g. Plot #45, Near Metro Pillar 112"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Mumbai, Bengaluru, Chennai"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Maharashtra, Tamil Nadu"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Pin Code
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 560001"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. India"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Navigation size={13} className="text-[#2d8d9b]" />
                Google Maps Link (Optional)
              </label>
              <input
                type="text"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="e.g. https://maps.app.goo.gl/..."
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Automatic Origin & Branch Confirmation */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#2d8d9b]" />
                Intake Origin Source & Branch (Auto-Detected)
              </span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isBranchUser ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                {isBranchUser ? 'Branch Session' : 'HQ Session'}
              </span>
            </div>
            {isBranchUser ? (
              <p className="text-xs font-bold text-teal-900">
                Origin: <span className="font-black">BRANCH</span> • Assigned Branch: <span className="font-black">{userBranchName || `Branch #${userBranchId}`}</span>
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-zinc-600 font-medium">
                  Select a branch or pick a zone to automatically assign the branch:
                </p>
                <select
                  value={hqBranchId}
                  onChange={(e) => {
                    const newBranchId = e.target.value;
                    setHqBranchId(newBranchId);
                    if (zoneId) {
                      const currentZone = zones.find(z => String(z.id) === String(zoneId));
                      if (!newBranchId || String(currentZone?.branch_id) !== String(newBranchId)) {
                        setZoneId('');
                        setZoneSearchQuery('');
                      }
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] text-xs font-bold text-zinc-800 bg-white"
                >
                  <option value="">Select Branch (Optional / Auto-assigned)</option>
                  {selectableBranches.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Searchable Zone Selection within NewFeedModal */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-200/70" ref={zoneDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#2d8d9b]" />
                  Assigned Zone {availableZones.length > 0 ? `(${availableZones.length})` : ''}
                </label>
                {!effectiveBranchId && availableZones.length > 0 && (
                  <span className="text-[9px] font-semibold text-zinc-400">
                    Auto-assigns branch
                  </span>
                )}
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={
                    isZoneDropdownOpen
                      ? zoneSearchQuery
                      : selectedZone
                      ? `${selectedZone.name}${selectedZone.code ? ` (${selectedZone.code})` : ''}`
                      : zoneSearchQuery
                  }
                  onChange={(e) => {
                    setZoneSearchQuery(e.target.value);
                    if (!isZoneDropdownOpen) setIsZoneDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsZoneDropdownOpen(true);
                  }}
                  placeholder={
                    availableZones.length > 0
                      ? 'Type to search zone (e.g. Indiranagar, South)...'
                      : 'No zones available'
                  }
                  disabled={availableZones.length === 0}
                  className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-2 focus:ring-[#2d8d9b]/15 text-xs font-bold text-zinc-800 bg-white disabled:bg-zinc-100 disabled:text-zinc-400 placeholder:text-zinc-400 placeholder:font-normal cursor-pointer"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {(zoneId || zoneSearchQuery) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoneId('');
                        setZoneSearchQuery('');
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-100 transition cursor-pointer"
                      title="Clear zone"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsZoneDropdownOpen(prev => !prev)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isZoneDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {isZoneDropdownOpen && availableZones.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-zinc-200 shadow-2xl max-h-56 overflow-y-auto z-50 py-1 divide-y divide-zinc-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between sticky top-0 z-10 border-b border-zinc-100">
                      <span>{zoneSearchQuery.trim() ? `Matching Zones (${displayedZones.length})` : `All Zones (${availableZones.length})`}</span>
                      {!effectiveBranchId && <span className="text-[9px] text-[#2d8d9b] font-bold normal-case">Auto-assigns branch</span>}
                    </div>

                    {displayedZones.length > 0 ? (
                      displayedZones.map((z) => {
                        const isSelected = String(z.id) === String(zoneId);
                        const bName = branchMap.get(String(z.branch_id));
                        return (
                          <button
                            key={z.id}
                            type="button"
                            onClick={() => {
                              const newZoneId = String(z.id);
                              setZoneId(newZoneId);
                              setZoneSearchQuery('');
                              setIsZoneDropdownOpen(false);
                              if (z.branch_id && !isBranchUser) {
                                setHqBranchId(String(z.branch_id));
                              }
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? 'bg-[#2d8d9b]/10 text-[#2d8d9b] font-black' 
                                : 'hover:bg-zinc-50 text-zinc-800'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold">{z.name}</span>
                                {z.code && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold">
                                    {z.code}
                                  </span>
                                )}
                                {!effectiveBranchId && bName && (
                                  <span className="text-[10px] font-medium text-zinc-400">
                                    — [{bName}]
                                  </span>
                                )}
                              </div>
                              {z.description && (
                                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{z.description}</p>
                              )}
                            </div>
                            {isSelected && <Check size={14} className="text-[#2d8d9b] shrink-0 stroke-[3]" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center space-y-1">
                        <p className="text-xs font-bold text-zinc-600">No zones found</p>
                        <p className="text-[10px] text-zinc-400">
                          No zones match "{zoneSearchQuery}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Agent Remarks & Contact Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
              autoCapitalize="sentences"
              placeholder="e.g. Visited institution reception, collected brochure, interested in staff uniforms..."
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-semibold text-zinc-800 transition-all placeholder:text-zinc-400 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-[#2d8d9b] hover:bg-[#257a87] transition-all shadow-lg shadow-[#2d8d9b]/25 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving Feed...' : 'Save Field Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Component 2: Full Lead Registry / Edit Modal (With Feed Prefill capability)
// -------------------------------------------------------------------------------------
interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  editingLead: Lead | null;
  prefillData: Partial<Lead> | null;
  industries: Industry[];
  branches: Branch[];
  zones?: Zone[];
  employees: Employee[];
  currentUser?: any;
  userBranchId?: number | null;
  userBranchName?: string | null;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingLead,
  prefillData,
  industries,
  branches,
  zones = [],
  employees,
  currentUser,
  userBranchId,
  userBranchName
}) => {
  const [name, setName] = useState('');
  const [contactTitle, setContactTitle] = useState('Mr.');
  const [contactPerson, setContactPerson] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Direct');
  const [requirements, setRequirements] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');
  const [branchId, setBranchId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [status, setStatus] = useState('New Leads');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const intakeRole = getUserIntakeRole(currentUser);
  const isEditing = Boolean(editingLead);

  useEffect(() => {
    const data = editingLead || prefillData;
    if (data) {
      setName(data.name || '');
      setContactTitle(data.contact_title || 'Mr.');
      setContactPerson(data.contact_person || '');
      setContactDesignation(data.contact_designation || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setSource(data.source || 'Direct');
      setRequirements(data.requirements || '');
      setIndustryId(data.industry_id ? String(data.industry_id) : '');
      setAddress(data.address || '');
      setArea(data.area || '');
      setGoogleMapsLink(data.google_maps_link || '');
      setCity(data.city || '');
      setState(data.state || '');
      setPincode(data.pincode || '');
      setCountry(data.country || 'India');
      setBranchId(data.branch_id ? String(data.branch_id) : (userBranchId ? String(userBranchId) : ''));
      setZoneId(data.zone_id ? String(data.zone_id) : '');
      setAssignedStaffId(data.assigned_staff_id ? String(data.assigned_staff_id) : '');
      setStatus(data.status || 'New Leads');
      setRemarks(typeof data.remarks === 'string' ? data.remarks : '');
    } else {
      setName('');
      setContactTitle('Mr.');
      setContactPerson('');
      setContactDesignation('');
      setPhone('');
      setEmail('');
      setSource('Direct');
      setRequirements('');
      setIndustryId('');
      setAddress('');
      setArea('');
      setGoogleMapsLink('');
      setCity('');
      setState('');
      setPincode('');
      setCountry('India');
      setBranchId(userBranchId ? String(userBranchId) : '');
      setZoneId('');
      if (intakeRole === 'salesperson') {
        const selfEmployee = employees.find(e => 
          (currentUser?.employeeRecordId && e.id === currentUser.employeeRecordId) ||
          (currentUser?.employeeId && e.employee_id === currentUser.employeeId) ||
          (currentUser?.id && (e as any).user_id === currentUser.id)
        );
        setAssignedStaffId(selfEmployee ? String(selfEmployee.id) : (currentUser?.employeeRecordId ? String(currentUser.employeeRecordId) : ''));
      } else {
        setAssignedStaffId('');
      }
      setStatus('New Leads');
      setRemarks('');
    }
  }, [editingLead, prefillData, isOpen, userBranchId, intakeRole, currentUser, employees]);

  // Live dynamic intake stage calculation for preview and submission
  const derivedTargetBranchId = isEditing
    ? branchId
    : intakeRole === 'hq_staff'
    ? branchId
    : (userBranchId ? String(userBranchId) : branchId);

  const derivedTargetStaffId = isEditing
    ? assignedStaffId
    : intakeRole === 'salesperson'
    ? (assignedStaffId || (currentUser?.employeeRecordId ? String(currentUser.employeeRecordId) : ''))
    : intakeRole === 'branch_staff'
    ? assignedStaffId
    : '';

  const derivedIntakeStage = (derivedTargetBranchId && derivedTargetStaffId)
    ? 'Sales Leads'
    : derivedTargetBranchId
    ? 'New Leads'
    : 'Open Leads';

  const effectiveBranchId = derivedTargetBranchId;

  const availableZones = useMemo(() => {
    if (!effectiveBranchId) return [];
    return (zones || []).filter(z => String(z.branch_id) === String(effectiveBranchId));
  }, [zones, effectiveBranchId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Lead / Company name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        contact_title: contactTitle,
        contact_person: contactPerson.trim() || null,
        contact_designation: contactDesignation.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        source: source.trim() || null,
        requirements: requirements.trim() || null,
        industry_id: industryId || null,
        address: address.trim() || null,
        area: area.trim() || null,
        google_maps_link: googleMapsLink.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        country: country.trim() || 'India',
        branch_id: isEditing
          ? (branchId || null)
          : intakeRole === 'hq_staff'
          ? (branchId || null)
          : (userBranchId ? String(userBranchId) : branchId || null),
        zone_id: zoneId ? parseInt(zoneId, 10) : null,
        assigned_staff_id: isEditing
          ? (assignedStaffId || null)
          : intakeRole === 'salesperson'
          ? (assignedStaffId || (currentUser?.employeeRecordId ? String(currentUser.employeeRecordId) : null))
          : intakeRole === 'branch_staff'
          ? (assignedStaffId || null)
          : null,
        status: isEditing ? (status || 'New Leads') : derivedIntakeStage,
        remarks: remarks.trim() || null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col my-8 z-10 max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3a525d] to-[#24343b] px-8 py-6 text-white relative flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-[#2d8d9b]/30 text-teal-200 border border-[#2d8d9b]/40 text-[9px] font-black uppercase tracking-wider">
                {editingLead ? (editingLead.lead_code || `Lead #${editingLead.id}`) : 'Lead Pipeline'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[9px] font-black uppercase tracking-wider">
                {prefillData ? 'Convert Feed to Lead' : editingLead ? 'Edit Profile' : 'New Prospect'}
              </span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tight">
              {prefillData ? 'Convert Field Feed to Lead' : editingLead ? 'Edit Lead Profile' : 'Add New Commercial Lead'}
            </h3>
            <p className="text-xs text-white/70 font-semibold mt-0.5">
              {prefillData
                ? 'Review and complete information from the field intake to advance into the pipeline'
                : editingLead ? `Update details for ${editingLead.name}` : 'Register full prospect profile to initiate the 11-stage sales funnel'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
          {/* Intake Protocol Preview Banner (when adding a lead) */}
          {!isEditing && (
            <div className="p-4 bg-gradient-to-r from-teal-50/90 to-sky-50/90 rounded-2xl border border-teal-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2d8d9b] text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                  <Layers size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-900">
                      Intake Pipeline Protocol:
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white border border-teal-300 text-[#2d8d9b] shadow-2xs">
                      {derivedIntakeStage}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-600 mt-0.5">
                    {intakeRole === 'salesperson' && `Auto-assigned to your queue (${currentUser?.fullName || 'Salesperson'}) • Branch: ${userBranchName || 'Your Branch'}`}
                    {intakeRole === 'branch_staff' && `Branch: ${userBranchName || 'Assigned Branch'} • ${assignedStaffId ? 'Assigned to selected salesperson' : 'Branch Intake (Salesperson unassigned)'}`}
                    {intakeRole === 'hq_staff' && (branchId ? `Routed directly to ${branches.find(b => String(b.id) === branchId)?.name || 'Branch'}` : 'Central HQ Intake (Open Leads queue)')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Initial Stage:</span>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#2d8d9b] text-white shadow-xs">
                  {derivedIntakeStage}
                </span>
              </div>
            </div>
          )}
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#2d8d9b]" />
              Lead / Company Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(capitalizeWords(e.target.value))}
              autoCapitalize="words"
              placeholder="e.g. Acme Corporation, St. Mary Academy"
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Contact Person Details: Title + Full Name + Designation */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <User size={13} className="text-[#2d8d9b]" />
              Contact Person Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <select
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
                >
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Full Name (e.g. Rajesh Sharma)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Designation (e.g. Principal / Director)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Phone size={13} className="text-[#2d8d9b]" />
                Primary Phone Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Mail size={13} className="text-[#2d8d9b]" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@acme.com"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Area & Google Maps Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#2d8d9b]" />
                Area / Locality
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="e.g. Whitefield Industrial Area"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Navigation size={13} className="text-[#2d8d9b]" />
                Google Maps Link
              </label>
              <input
                type="text"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="e.g. https://maps.app.goo.gl/..."
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Sector, Source, Branch, Salesperson, and Stage Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#2d8d9b]" />
                Industry Sector
              </label>
              <select
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="">Select Sector</option>
                {industries.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Compass size={13} className="text-[#2d8d9b]" />
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="Direct">Direct / Walk-in</option>
                <option value="Field Feed">Field Agent Discovery</option>
                <option value="Referral">Client Referral</option>
                <option value="Website">Website / Online</option>
                <option value="Cold Call">Cold Outreach</option>
                <option value="Exhibition">Exhibition / Expo</option>
              </select>
            </div>

            {/* Branch Assignment Provision: Visible for HQ staff or when editing */}
            {(isEditing || intakeRole === 'hq_staff') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#2d8d9b]" />
                  Branch Assignment
                </label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setZoneId('');
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
                >
                  <option value="">HQ / Unassigned (Open Leads)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Zone Assignment Provision: Filtered by effective branch */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#2d8d9b]" />
                Zone / Region {effectiveBranchId ? `(${availableZones.length})` : ''}
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                disabled={!effectiveBranchId}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white disabled:bg-zinc-50 disabled:text-zinc-400 cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="">{effectiveBranchId ? (availableZones.length > 0 ? 'Select Zone / Sector' : 'No zones for this branch') : 'Select Branch first'}</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={String(z.id)}>
                    {z.name} {z.code ? `(${z.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Salesperson Assignment Provision: Visible for Branch staff or when editing */}
            {(isEditing || intakeRole === 'branch_staff') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#2d8d9b]" />
                  Salesperson Assignment
                </label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
                >
                  <option value="">Unassigned (Branch Intake)</option>
                  {employees
                    .filter(emp => !userBranchId || emp.branch_id === userBranchId)
                    .map((emp) => (
                      <option key={emp.id} value={String(emp.id)}>
                        {emp.full_name} ({emp.employee_id})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Pipeline Stage Provision: Visible ONLY when editing an existing lead */}
            {isEditing && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Layers size={13} className="text-[#2d8d9b]" />
                  Pipeline Stage
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
                >
                  {PIPELINE_STAGES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FileSpreadsheet size={13} className="text-[#2d8d9b]" />
              Inquired Uniform Requirements
            </label>
            <textarea
              rows={2}
              value={requirements}
              onChange={(e) => setRequirements(capitalizeFirstLetter(e.target.value))}
              autoCapitalize="sentences"
              placeholder="e.g. 500 sets corporate blazers, 1200 sets industrial coveralls..."
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-semibold text-zinc-800 transition-all placeholder:text-zinc-400 resize-none"
            />
          </div>

          {/* Address & City */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="e.g. 12th Main Road, HAL 2nd Stage"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 560008"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. India"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-[#3a525d] hover:bg-[#2d8d9b] transition-all shadow-lg shadow-[#3a525d]/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : editingLead ? 'Save Changes' : 'Register Prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Component 3: 11-Stage Interactive Pipeline & Isolated Stage Logs in LeadViewModal
// -------------------------------------------------------------------------------------
interface LeadViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: () => void;
  onDelete?: () => void;
  onFeedOutcome: () => void;
  onAssignBranch: () => void;
  onAssignStaff: () => void;
  onFollowUp: () => void;
  onMeetingOutcome: () => void;
  onConvertFeed: () => void;
  onReload: () => void;
  permissions?: {
    canManageLeads: boolean;
    canManageFeeds: boolean;
    canAssignBranch: boolean;
    canAssignStaff: boolean;
    canSalesContact: boolean;
    canManageFollowups: boolean;
    canManageMeetings: boolean;
    canManageHotLeads: boolean;
  };
}

export const LeadViewModal: React.FC<LeadViewModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
  onDelete,
  onFeedOutcome,
  onAssignBranch,
  onAssignStaff,
  onFollowUp,
  onMeetingOutcome,
  onConvertFeed,
  onReload,
  permissions
}) => {
  const perms = permissions || {
    canManageLeads: true,
    canManageFeeds: true,
    canAssignBranch: true,
    canAssignStaff: true,
    canSalesContact: true,
    canManageFollowups: true,
    canManageMeetings: true,
    canManageHotLeads: true,
  };

  const [selectedStageTab, setSelectedStageTab] = useState<string>('ALL');
  const [stageActivities, setStageActivities] = useState<LeadActivity[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (lead) {
      // By default, select the lead's current stage to focus on relevant logs
      setSelectedStageTab(lead.status || 'Follow-ups');
    }
  }, [lead]);

  // Fetch activities attributed specifically to selectedStageTab
  const fetchLogs = useCallback(async () => {
    if (!lead) return;
    setIsLoadingLogs(true);
    try {
      const stageParam = selectedStageTab === 'ALL' ? '' : `?stage=${encodeURIComponent(selectedStageTab)}`;
      const res = await api.get(`/leads/${lead.id}/activities${stageParam}`);
      
      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.activities)
        ? res.data.activities
        : [];

      const mapped: LeadActivity[] = rawList.map((act: any, idx: number) => ({
        id: act.id || idx,
        lead_id: act.lead_id || lead.id,
        stage: act.stage || selectedStageTab,
        activity_type: act.activity_type || act.response_type || 'Note',
        response_type: act.response_type || act.response || act.outcome,
        remarks: act.remarks || act.notes || act.text || '',
        staff_name: act.staff_name || act.performed_by_name || act.author?.name || 'Staff Member',
        staff_employee_id: act.staff_employee_id || act.performed_by_emp_id || act.author?.employee_id || 'STAFF',
        staff_designation: act.staff_designation || act.performed_by_designation || act.author?.designation || 'Staff',
        staff_department: act.staff_department || act.performed_by_dept || act.author?.department || 'Operations',
        created_at: act.created_at || (act.date ? `${act.date} ${act.time || ''}` : lead.updated_at)
      }));

      if (mapped.length === 0 && Array.isArray(lead.remarks) && lead.remarks.length > 0) {
        let derived: LeadActivity[] = lead.remarks
          .filter(r => {
            if (selectedStageTab === 'ALL') return true;
            if (selectedStageTab === 'Follow-ups') {
              return r.stage === 'Follow-ups' || (!r.stage) || 
                     String(r.response_type || '').toLowerCase().includes('cold') || 
                     String(r.outcome || '').toLowerCase().includes('cold') ||
                     String(r.stage || '').toLowerCase().includes('cold');
            }
            if (selectedStageTab === 'Deals') {
              return r.stage === 'Deals' || 
                     String(r.response_type || '').toLowerCase().includes('deal') || 
                     String(r.outcome || '').toLowerCase().includes('deal') ||
                     String(r.activity_type || '').toLowerCase().includes('deal') ||
                     String(r.activity_type || '').toLowerCase().includes('payment') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('initial payment') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('deal');
            }
            if (selectedStageTab === 'SO Converted Deals') {
              return r.stage === 'SO Converted Deals' || 
                     String(r.response_type || '').toLowerCase().includes('so_converted') || 
                     String(r.outcome || '').toLowerCase().includes('so_converted') ||
                     String(r.activity_type || '').toLowerCase().includes('order') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('sales order') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('converted');
            }
            return r.stage === selectedStageTab;
          })
          .map((r: any, i: number) => ({
            id: r.id || i,
            lead_id: lead.id,
            stage: r.stage || selectedStageTab,
            activity_type: r.activity_type || r.response_type || 'Note',
            response_type: r.response_type || r.response || r.outcome,
            remarks: r.text || r.remarks || r.notes || '',
            staff_name: r.author?.name || 'Staff Member',
            staff_employee_id: r.author?.employee_id || 'STAFF',
            staff_designation: r.author?.designation || 'Staff',
            staff_department: r.author?.department || 'Operations',
            created_at: r.date ? `${r.date} ${r.time || ''}` : lead.updated_at
          }))
          .reverse();

        if (derived.length === 0 && selectedStageTab === 'Deals' && (lead.status === 'Deals' || lead.status === 'SO Converted Deals')) {
          derived = [{
            id: 'milestone_deal',
            lead_id: lead.id,
            stage: 'Deals',
            activity_type: 'Deal Milestone',
            response_type: 'deal_won',
            remarks: 'Commercial Deal Active: Initial payment recorded. Deal confirmed and in commercial order pipeline.',
            staff_name: lead.employees?.full_name || 'Commercial Team',
            staff_employee_id: lead.employees?.employee_id || 'SALES',
            staff_designation: 'Commercial Manager',
            staff_department: 'Sales & Marketing',
            created_at: lead.updated_at || lead.created_at
          }];
        } else if (derived.length === 0 && selectedStageTab === 'SO Converted Deals' && lead.status === 'SO Converted Deals') {
          derived = [{
            id: 'milestone_so',
            lead_id: lead.id,
            stage: 'SO Converted Deals',
            activity_type: 'Order Conversion',
            response_type: 'so_converted',
            remarks: 'Sales Order Converted: Commercial deal successfully advanced to production manufacturing order queue.',
            staff_name: lead.employees?.full_name || 'Production Lead',
            staff_employee_id: lead.employees?.employee_id || 'OPS',
            staff_designation: 'Production Executive',
            staff_department: 'Operations',
            created_at: lead.updated_at || lead.created_at
          }];
        } else if (derived.length === 0 && selectedStageTab === 'Feeds' && lead.requirements) {
          derived = [{
            id: 'milestone_feed',
            lead_id: lead.id,
            stage: 'Feeds',
            activity_type: 'Raw Feed Intake',
            response_type: 'feed_recorded',
            remarks: `Inquired Feed Requirements: ${lead.requirements}`,
            staff_name: 'Field Scout',
            staff_employee_id: 'FIELD',
            staff_designation: 'Field Agent',
            staff_department: 'Field Scouting',
            created_at: lead.created_at
          }];
        }
        setStageActivities(derived);
      } else {
        if (mapped.length === 0 && selectedStageTab === 'Deals' && (lead.status === 'Deals' || lead.status === 'SO Converted Deals')) {
          setStageActivities([{
            id: 'milestone_deal',
            lead_id: lead.id,
            stage: 'Deals',
            activity_type: 'Deal Milestone',
            response_type: 'deal_won',
            remarks: 'Commercial Deal Active: Initial payment recorded. Deal confirmed and in commercial order pipeline.',
            staff_name: lead.employees?.full_name || 'Commercial Team',
            staff_employee_id: lead.employees?.employee_id || 'SALES',
            staff_designation: 'Commercial Manager',
            staff_department: 'Sales & Marketing',
            created_at: lead.updated_at || lead.created_at
          }]);
        } else if (mapped.length === 0 && selectedStageTab === 'SO Converted Deals' && lead.status === 'SO Converted Deals') {
          setStageActivities([{
            id: 'milestone_so',
            lead_id: lead.id,
            stage: 'SO Converted Deals',
            activity_type: 'Order Conversion',
            response_type: 'so_converted',
            remarks: 'Sales Order Converted: Commercial deal successfully advanced to production manufacturing order queue.',
            staff_name: lead.employees?.full_name || 'Production Lead',
            staff_employee_id: lead.employees?.employee_id || 'OPS',
            staff_designation: 'Production Executive',
            staff_department: 'Operations',
            created_at: lead.updated_at || lead.created_at
          }]);
        } else if (mapped.length === 0 && selectedStageTab === 'Feeds' && lead.requirements) {
          setStageActivities([{
            id: 'milestone_feed',
            lead_id: lead.id,
            stage: 'Feeds',
            activity_type: 'Raw Feed Intake',
            response_type: 'feed_recorded',
            remarks: `Inquired Feed Requirements: ${lead.requirements}`,
            staff_name: 'Field Scout',
            staff_employee_id: 'FIELD',
            staff_designation: 'Field Agent',
            staff_department: 'Field Scouting',
            created_at: lead.created_at
          }]);
        } else {
          setStageActivities(mapped);
        }
      }
    } catch (e) {
      console.error('Failed to load stage-specific activities', e);
      // Fallback: derive from lead.remarks JSONB
      let derived: LeadActivity[] = [];
      if (Array.isArray(lead.remarks)) {
        derived = lead.remarks
          .filter(r => {
            if (selectedStageTab === 'ALL') return true;
            if (selectedStageTab === 'Follow-ups') {
              return r.stage === 'Follow-ups' || (!r.stage) || 
                     String(r.response_type || '').toLowerCase().includes('cold') || 
                     String(r.outcome || '').toLowerCase().includes('cold') ||
                     String(r.stage || '').toLowerCase().includes('cold');
            }
            if (selectedStageTab === 'Deals') {
              return r.stage === 'Deals' || 
                     String(r.response_type || '').toLowerCase().includes('deal') || 
                     String(r.outcome || '').toLowerCase().includes('deal') ||
                     String(r.activity_type || '').toLowerCase().includes('deal') ||
                     String(r.activity_type || '').toLowerCase().includes('payment') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('initial payment') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('deal');
            }
            if (selectedStageTab === 'SO Converted Deals') {
              return r.stage === 'SO Converted Deals' || 
                     String(r.response_type || '').toLowerCase().includes('so_converted') || 
                     String(r.outcome || '').toLowerCase().includes('so_converted') ||
                     String(r.activity_type || '').toLowerCase().includes('order') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('sales order') ||
                     String(r.notes || r.remarks || r.text || '').toLowerCase().includes('converted');
            }
            return r.stage === selectedStageTab;
          })
          .map((r: any, i: number) => ({
            id: r.id || i,
            lead_id: lead.id,
            stage: r.stage || selectedStageTab,
            activity_type: r.activity_type || r.response_type || 'Note',
            response_type: r.response_type || r.response || r.outcome,
            remarks: r.text || r.remarks || r.notes || '',
            staff_name: r.author?.name || 'Staff Member',
            staff_employee_id: r.author?.employee_id || 'STAFF',
            staff_designation: r.author?.designation || 'Staff',
            staff_department: r.author?.department || 'Operations',
            created_at: r.date ? `${r.date} ${r.time || ''}` : lead.updated_at
          }))
          .reverse();
      }

      if (derived.length === 0 && selectedStageTab === 'Deals' && (lead.status === 'Deals' || lead.status === 'SO Converted Deals')) {
        derived = [{
          id: 'milestone_deal',
          lead_id: lead.id,
          stage: 'Deals',
          activity_type: 'Deal Milestone',
          response_type: 'deal_won',
          remarks: 'Commercial Deal Active: Initial payment recorded. Deal confirmed and in commercial order pipeline.',
          staff_name: lead.employees?.full_name || 'Commercial Team',
          staff_employee_id: lead.employees?.employee_id || 'SALES',
          staff_designation: 'Commercial Manager',
          staff_department: 'Sales & Marketing',
          created_at: lead.updated_at || lead.created_at
        }];
      } else if (derived.length === 0 && selectedStageTab === 'SO Converted Deals' && lead.status === 'SO Converted Deals') {
        derived = [{
          id: 'milestone_so',
          lead_id: lead.id,
          stage: 'SO Converted Deals',
          activity_type: 'Order Conversion',
          response_type: 'so_converted',
          remarks: 'Sales Order Converted: Commercial deal successfully advanced to production manufacturing order queue.',
          staff_name: lead.employees?.full_name || 'Production Lead',
          staff_employee_id: lead.employees?.employee_id || 'OPS',
          staff_designation: 'Production Executive',
          staff_department: 'Operations',
          created_at: lead.updated_at || lead.created_at
        }];
      } else if (derived.length === 0 && selectedStageTab === 'Feeds' && lead.requirements) {
        derived = [{
          id: 'milestone_feed',
          lead_id: lead.id,
          stage: 'Feeds',
          activity_type: 'Raw Feed Intake',
          response_type: 'feed_recorded',
          remarks: `Inquired Feed Requirements: ${lead.requirements}`,
          staff_name: 'Field Scout',
          staff_employee_id: 'FIELD',
          staff_designation: 'Field Agent',
          staff_department: 'Field Scouting',
          created_at: lead.created_at
        }];
      }
      setStageActivities(derived);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [lead, selectedStageTab]);

  useEffect(() => {
    if (isOpen && lead) {
      fetchLogs();
    }
  }, [isOpen, lead, selectedStageTab, fetchLogs]);

  if (!isOpen || !lead) return null;

  // Compute stage status index in 10-stage pipeline
  const stageKeys = PIPELINE_STAGES.map(s => s.key);
  const currentStageIndex = stageKeys.indexOf(lead.status as any);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#3a525d] via-[#2d4752] to-[#1c3038] py-5 px-8 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl text-[10px] font-mono font-bold bg-white/10 border border-white/20 text-white">
                {lead.lead_code || `Lead #${lead.id}`}
              </span>
              <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#2d8d9b] text-white border border-[#2d8d9b]/50 shadow-sm flex items-center gap-1.5">
                Active Stage: {lead.status}
              </span>
              {lead.is_cold && (
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white border border-rose-400 flex items-center gap-1 shadow-sm">
                  <Snowflake size={11} /> Cold Lead Tag
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div>
              <h3 className="text-2xl font-black italic tracking-tight">{lead.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                  {lead.industries?.name || 'Institutional'}
                </span>
                {lead.area && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-[10px] font-semibold text-white/80 flex items-center gap-1">
                      <MapPin size={11} className="text-teal-300" />
                      {lead.area}
                    </span>
                  </>
                )}
                {lead.google_maps_link && (
                  <a
                    href={lead.google_maps_link.startsWith('http') ? lead.google_maps_link : `https://${lead.google_maps_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-teal-400/20 text-teal-200 hover:text-white transition-colors"
                    title="Open Google Maps Location"
                  >
                    <Navigation size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* Context-Sensitive Stage Action Button in Header */}
            <div className="flex items-center gap-2">
              {lead.status === 'Feeds' && (
                perms.canManageFeeds ? (
                  <button
                    onClick={onFeedOutcome}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#2d8d9b] text-white hover:bg-[#257a87] transition-all shadow-md cursor-pointer"
                  >
                    Follow-up
                  </button>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/10 text-white/70 border border-white/20 flex items-center gap-1.5 select-none" title="Requires permission: manage_lead_stage_feeds">
                    <Lock size={12} /> Feed Processing Locked
                  </span>
                )
              )}
              {lead.status === 'Open Leads' && (
                perms.canAssignBranch ? (
                  <button
                    onClick={onAssignBranch}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Building2 size={13} />
                    Assign Branch
                  </button>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/10 text-white/70 border border-white/20 flex items-center gap-1.5 select-none" title="Requires permission: manage_lead_stage_assign_branch">
                    <Lock size={12} /> Branch Assignment Locked
                  </span>
                )
              )}
              {lead.status === 'New Leads' && (
                perms.canAssignStaff ? (
                  <button
                    onClick={onAssignStaff}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck size={13} />
                    Assign Salesperson
                  </button>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/10 text-white/70 border border-white/20 flex items-center gap-1.5 select-none" title="Requires permission: manage_lead_stage_assign_staff">
                    <Lock size={12} /> Salesperson Assignment Locked
                  </span>
                )
              )}
              {(lead.status === 'Follow-ups' || lead.status === 'Sales Leads') && (
                (lead.status === 'Sales Leads' ? perms.canSalesContact : perms.canManageFollowups) ? (
                  <button
                    onClick={onFollowUp}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquarePlus size={13} />
                    Log Follow-up Note
                  </button>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/10 text-white/70 border border-white/20 flex items-center gap-1.5 select-none" title="Requires permission: manage_lead_stage_followups">
                    <Lock size={12} /> Follow-up Logging Locked
                  </span>
                )
              )}
              {lead.status === 'Meetings' && (
                perms.canManageMeetings ? (
                  <button
                    onClick={onMeetingOutcome}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-500 hover:bg-purple-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle size={13} />
                    Record Meeting Outcome
                  </button>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/10 text-white/70 border border-white/20 flex items-center gap-1.5 select-none" title="Requires permission: manage_lead_stage_meetings">
                    <Lock size={12} /> Meeting Outcome Locked
                  </span>
                )
              )}
              {lead.status === 'Hot Leads' && (
                perms.canManageHotLeads ? (
                  <a
                    href={`/marketing/quotations`}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={13} />
                    Create Quotation
                  </a>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/10 text-white/70 border border-white/20 flex items-center gap-1.5 select-none" title="Requires permission: manage_lead_stage_hot_leads">
                    <Lock size={12} /> Quotation Creation Locked
                  </span>
                )
              )}
              {lead.status === 'Deals' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onFollowUp}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-teal-500 hover:bg-teal-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquarePlus size={13} />
                    Log Deal Note
                  </button>
                  <a
                    href={`/marketing/order-placement?lead_id=${lead.id}`}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag size={13} />
                    Create Sales Order
                  </a>
                </div>
              )}
              {lead.status === 'SO Converted Deals' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onFollowUp}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-teal-500 hover:bg-teal-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquarePlus size={13} />
                    Log Order Note
                  </button>
                  <a
                    href={`/marketing/order-placement?lead_id=${lead.id}`}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    Production Orders Hub
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          {/* 10-Stage Pipeline Interactive Roadmap Stepper */}
          <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d] flex items-center gap-1.5">
                <Layers size={13} className="text-[#2d8d9b]" />
                10-Stage Commercial Sales Pipeline (Click any stage to view stage logs)
              </span>
              <span className="text-[9px] font-bold text-zinc-400">
                Current: <span className="text-[#2d8d9b] font-black">{lead.status}</span>
                {lead.is_cold && <span className="text-rose-600 font-black ml-1">(Cold Lead Tag)</span>}
              </span>
            </div>

            {/* Inactivity Alert Banner */}
            {(() => {
              const refDate = lead.updated_at || lead.created_at;
              const daysInactive = refDate ? Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              if (daysInactive >= 3 && (lead.status === 'Sales Leads' || lead.status === 'New Leads' || lead.status === 'Follow-ups')) {
                return (
                  <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-amber-900">
                          Pending Follow-up: No activity recorded for {daysInactive} days
                        </p>
                        <p className="text-[10px] text-amber-700 font-medium">
                          Assigned to {lead.employees?.full_name || 'salesperson'} (Branch #{lead.branch_id || '3'}). Awaiting first follow-up note.
                        </p>
                      </div>
                    </div>
                    {(lead.status === 'Follow-ups' || lead.status === 'Sales Leads') && (
                      <button
                        onClick={onFollowUp}
                        className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm shrink-0 cursor-pointer self-start sm:self-auto"
                      >
                        + Log Follow-up
                      </button>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* Stepper Nodes */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-thin">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isSelected = selectedStageTab === stage.key;
                const isCurrent = lead.status === stage.key;
                const isPassed = currentStageIndex >= 0 && idx < currentStageIndex;
                const isFollowUp = stage.key === 'Follow-ups';
                const hasColdTag = isFollowUp && lead.is_cold;

                let circleClass = 'bg-white border-zinc-300 text-zinc-400';
                if (isCurrent) {
                  circleClass = 'bg-[#2d8d9b] border-[#2d8d9b] text-white ring-4 ring-teal-100 shadow-md';
                } else if (isPassed) {
                  circleClass = 'bg-emerald-500 border-emerald-500 text-white';
                }

                return (
                  <div
                    key={stage.key}
                    onClick={() => setSelectedStageTab(stage.key)}
                    className={`flex flex-col items-center min-w-[92px] max-w-[102px] p-2 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white shadow-md border-2 border-[#2d8d9b] scale-105'
                        : 'hover:bg-white/60 border border-transparent'
                    }`}
                    title={`Click to filter logs for ${stage.label}`}
                  >
                    {/* Circle Node */}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-black mb-1.5 transition-all ${circleClass}`}>
                      {isCurrent ? (
                        <Check size={14} strokeWidth={3} />
                      ) : isPassed ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span className={`text-[10px] text-center font-black leading-tight truncate w-full ${
                      isCurrent
                        ? 'text-[#2d8d9b]'
                        : isSelected ? 'text-[#3a525d]' : 'text-zinc-500'
                    }`}>
                      {stage.label}
                    </span>
                    {hasColdTag ? (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 mt-0.5">
                        <Snowflake size={8} /> Cold Lead
                      </span>
                    ) : (
                      <span className="text-[8px] text-zinc-400 text-center font-medium truncate w-full mt-0.5">
                        {isCurrent ? '• Active' : isPassed ? 'Done' : 'Pending'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Prospect Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Person */}
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Contact Person</label>
              <div className="flex items-start gap-2">
                <User size={14} className="text-[#2d8d9b] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#3a525d]">
                    {lead.contact_person ? `${lead.contact_title ? lead.contact_title + ' ' : ''}${lead.contact_person}` : 'Not specified'}
                  </p>
                  {lead.contact_designation && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded-md inline-block mt-0.5">
                      {lead.contact_designation}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Phone Number</label>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#2d8d9b]" />
                <p className="text-xs font-bold font-mono text-[#3a525d]">{lead.phone || 'No phone'}</p>
              </div>
            </div>

            {/* Email Address */}
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Email</label>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#2d8d9b]" />
                <p className="text-xs font-bold text-[#3a525d] truncate">{lead.email || '—'}</p>
              </div>
            </div>

            {/* Assigned Staff */}
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Sales Operator</label>
              {lead.employees ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <ShieldCheck size={14} className="text-[#2d8d9b]" />
                  <div>
                    <p className="text-xs font-black text-[#3a525d]">{lead.employees.full_name}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">{lead.employees.employee_id}</p>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-zinc-400 italic font-medium">Unassigned</span>
              )}
            </div>

            {/* Location & 5-Part Address */}
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 md:col-span-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Location &amp; 5-Part Address</label>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-[#2d8d9b] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#3a525d]">
                    {[lead.city, lead.state].filter(Boolean).join(', ') || lead.area || 'Location unlisted'}
                  </p>
                  {lead.address && <p className="text-[11px] text-zinc-600 font-medium mt-0.5">{lead.address}</p>}
                  {lead.area && <p className="text-[11px] text-[#2d8d9b] font-bold mt-0.5">Area: {lead.area}</p>}
                  {(lead.pincode || lead.country) && (
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                      {[lead.pincode ? `PIN: ${lead.pincode}` : null, lead.country || 'India'].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {lead.zones?.name && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black uppercase">
                        Zone: {lead.zones.name}
                      </span>
                    </div>
                  )}
                </div>
                {lead.google_maps_link && (
                  <a
                    href={lead.google_maps_link.startsWith('http') ? lead.google_maps_link : `https://${lead.google_maps_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-[#2d8d9b] rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                  >
                    <Navigation size={11} /> Maps
                  </a>
                )}
              </div>
            </div>

            {/* Requirements */}
            {lead.requirements && (
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/80 md:col-span-3">
                <label className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest block mb-1">
                  Inquired Requirements
                </label>
                <p className="text-xs font-semibold text-zinc-800 leading-relaxed">{lead.requirements}</p>
              </div>
            )}
          </div>

          {/* Stage-Specific Activity Log Section */}
          <div className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#2d8d9b]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                  Activity Log History
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#2d8d9b] border border-teal-200 text-[10px] font-black">
                  Filtered by: {selectedStageTab}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStageTab('ALL')}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    selectedStageTab === 'ALL'
                      ? 'bg-[#3a525d] text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  View All Stages
                </button>
              </div>
            </div>

            {/* Feed & Commercial Stage Summary Banner for Deals, SO Converted Deals, and Feeds */}
            {(selectedStageTab === 'Deals' || selectedStageTab === 'SO Converted Deals' || selectedStageTab === 'Feeds') && (
              <div className="p-4 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-slate-50 rounded-2xl border border-teal-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-900">
                      {selectedStageTab === 'Feeds' ? 'Raw Intake Feed Prospect' : selectedStageTab === 'Deals' ? 'Deals Commercial Stage & Feeds' : 'SO Converted Production Stage & Feeds'}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500">
                    Lead Status: <strong className="text-[#3a525d]">{lead.status}</strong>
                  </span>
                </div>
                {lead.requirements ? (
                  <p className="text-xs font-semibold text-zinc-700">
                    <span className="font-bold text-[#2d8d9b]">Origin Feed Requirements: </span>
                    {lead.requirements}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Origin Feed: Field scout prospect registered for {lead.area || lead.city || 'commercial uniforms'}.
                  </p>
                )}
              </div>
            )}

            {/* Logs List */}
            {isLoadingLogs ? (
              <div className="py-8 text-center text-xs text-zinc-400 font-bold">
                Loading stage logs...
              </div>
            ) : stageActivities.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {stageActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 bg-zinc-50 hover:bg-teal-50/30 rounded-2xl border border-zinc-150 space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#2d8d9b]/15 text-[#2d8d9b]">
                          {act.stage}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700">
                          {act.activity_type}
                        </span>
                        {act.response_type && (
                          <span className={`px-2 py-0.5 rounded-md ${
                            act.response_type === 'positive' || act.response_type === 'hot_lead'
                              ? 'bg-emerald-100 text-emerald-800'
                              : act.response_type === 'cold_lead'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {act.response_type}
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-400 font-mono font-medium">
                        {formatDate(act.created_at, true)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {act.remarks || 'No remarks added'}
                    </p>

                    {/* Updating Staff Badge */}
                    {act.staff_name && (
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/60 text-[10px] text-zinc-500 font-semibold">
                        <ShieldCheck size={12} className="text-[#2d8d9b]" />
                        <span className="font-bold text-[#3a525d]">{act.staff_name}</span>
                        {act.staff_employee_id && (
                          <span className="text-[9px] font-mono text-zinc-400">({act.staff_employee_id})</span>
                        )}
                        {act.staff_designation && (
                          <>
                            <span className="text-zinc-300">•</span>
                            <span className="text-zinc-600">{act.staff_designation}</span>
                          </>
                        )}
                        {act.staff_department && (
                          <>
                            <span className="text-zinc-300">•</span>
                            <span className="text-zinc-400">{act.staff_department}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-zinc-50/60 rounded-2xl border border-dashed border-zinc-200">
                <p className="text-xs text-zinc-400 font-medium italic">
                  No activity logs recorded specifically for <span className="font-bold text-[#3a525d]">{selectedStageTab}</span> stage.
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Click another stage node above or use "View All Stages" to see all history.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            {onDelete && (
              <Button
                onClick={onDelete}
                variant="outline"
                className="h-11 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 size={13} className="mr-1.5" /> Delete Lead
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="h-11 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest text-zinc-500"
            >
              Close
            </Button>

            <Button
              onClick={onEdit}
              className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#2d8d9b] text-white hover:bg-[#257a87] gap-1.5"
            >
              <Edit2 size={13} /> Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Component 4: Feed Outcome Modal
// -------------------------------------------------------------------------------------
interface FeedOutcomeModalProps {
  lead: Lead;
  branches: Branch[];
  onClose: () => void;
  onSuccess: (updatedLead?: Lead) => void;
  onConvertToLead?: () => void;
}

export const FeedOutcomeModal: React.FC<FeedOutcomeModalProps> = ({
  lead,
  branches,
  onClose,
  onSuccess,
  onConvertToLead
}) => {
  const [responseType, setResponseType] = useState<'positive' | 'negative'>('positive');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading('Recording feed response outcome...');
    try {
      const logNote = remarks.trim() || (responseType === 'positive' ? 'Positive response from prospect' : 'Prospect unavailable / hold');
      const res = await api.post(`/leads/${lead.id}/activity`, {
        stage: 'Feeds',
        activity_type: 'Feed Contact Outcome',
        response_type: responseType,
        remarks: logNote,
        text: logNote
      });
      toast.success(res.data?.message || 'Feed outcome updated!', { id: toastId });
      onSuccess(res.data?.lead);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to update feed outcome', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative p-8 space-y-5 z-10 animate-in zoom-in-95">
        <div className="flex justify-between items-start">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-black uppercase">
              Stage: Feeds
            </span>
            <h3 className="text-xl font-black text-[#3a525d] italic mt-1.5">
              Feed Follow-up &amp; Contact Outcome
            </h3>
            <p className="text-xs text-zinc-400 font-bold mt-0.5">
              Prospect: <span className="text-[#3a525d]">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        {/* Field Contact Response Outcome Options */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
            Field Contact Response Outcome *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setResponseType('positive')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'positive'
                  ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  responseType === 'positive' ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300'
                }`}>
                  {responseType === 'positive' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-black text-emerald-800">Positive Response</span>
              </div>
              <p className="text-[10px] text-emerald-700/80 font-medium mt-1">
                {lead.branch_id || lead.origin === 'BRANCH' ? 'Directly converts to New Leads queue' : 'Converts to Open Leads queue'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setResponseType('negative')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'negative'
                  ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  responseType === 'negative' ? 'border-amber-600 bg-amber-600' : 'border-zinc-300'
                }`}>
                  {responseType === 'negative' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-black text-amber-800">Negative / Pending</span>
              </div>
              <p className="text-[10px] text-amber-700/80 font-medium mt-1">
                Retains raw lead at Feeds stage for future retry
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-400">Remarks & Follow-up Notes</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Discussed uniform catalog, agreed to proceed with sample meeting..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500 hover:bg-zinc-100"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-[10px] font-black uppercase bg-[#2d8d9b] hover:bg-[#257a87] text-white"
          >
            {isSubmitting ? 'Recording...' : 'Submit Outcome'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Component 5: Assign Branch Modal (Open Leads -> New Leads)
// -------------------------------------------------------------------------------------
interface AssignBranchModalProps {
  lead: Lead;
  branches: Branch[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignBranchModal: React.FC<AssignBranchModalProps> = ({
  lead,
  branches,
  onClose,
  onSuccess
}) => {
  const [branchId, setBranchId] = useState(lead.branch_id ? String(lead.branch_id) : '');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!branchId) {
      toast.error('Please select a branch');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Assigning branch & advancing lead to New Leads...');
    try {
      const res = await api.post(`/leads/${lead.id}/assign-branch`, {
        branch_id: parseInt(branchId, 10),
        remarks: remarks.trim() || undefined
      });
      toast.success(res.data?.message || 'Branch assigned successfully!', { id: toastId });
      onSuccess();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to assign branch', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative p-8 space-y-5 z-10 animate-in zoom-in-95">
        <div className="flex justify-between items-start">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase">
              Stage: Open Leads
            </span>
            <h3 className="text-xl font-black text-[#3a525d] italic mt-1.5">Assign Branch to Lead</h3>
            <p className="text-xs text-zinc-400 font-bold mt-0.5">
              Prospect: <span className="text-[#3a525d]">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-800 font-semibold">
          Assigning a branch from Headquarters will immediately advance this lead from <span className="font-black">Open Leads</span> to <span className="font-black">New Leads</span>.
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-400">Select Target Branch *</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-bold text-zinc-800 bg-white focus:outline-none focus:border-[#2d8d9b]"
          >
            <option value="">Select Branch</option>
            {branches.map(b => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-400">Assignment Remarks</label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Routed based on proximity to client factory..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 text-white"
          >
            Assign Branch
          </Button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Component 6: Assign Staff Modal (New Leads -> Sales Leads)
// -------------------------------------------------------------------------------------
interface AssignStaffModalProps {
  lead: Lead;
  employees: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignStaffModal: React.FC<AssignStaffModalProps> = ({
  lead,
  employees,
  onClose,
  onSuccess
}) => {
  const [staffId, setStaffId] = useState(lead.assigned_staff_id ? String(lead.assigned_staff_id) : '');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!staffId) {
      toast.error('Please select a salesperson');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Assigning salesperson & advancing lead to Sales Leads...');
    try {
      const res = await api.post(`/leads/${lead.id}/assign-staff`, {
        assigned_staff_id: parseInt(staffId, 10),
        remarks: remarks.trim() || undefined
      });
      toast.success(res.data?.message || 'Salesperson assigned successfully!', { id: toastId });
      onSuccess();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to assign salesperson', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative p-8 space-y-5 z-10 animate-in zoom-in-95">
        <div className="flex justify-between items-start">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase">
              Stage: New Leads
            </span>
            <h3 className="text-xl font-black text-[#3a525d] italic mt-1.5">Assign Salesperson</h3>
            <p className="text-xs text-zinc-400 font-bold mt-0.5">
              Prospect: <span className="text-[#3a525d]">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-800 font-semibold">
          Assigning a dedicated sales representative advances this lead from <span className="font-black">New Leads</span> to <span className="font-black">Sales Leads</span>.
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-400">Select Salesperson *</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-bold text-zinc-800 bg-white focus:outline-none focus:border-[#2d8d9b]"
          >
            <option value="">Select Salesperson</option>
            {employees.map(emp => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.full_name} ({emp.employee_id}) - {emp.department || 'Sales'}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-400">Delegation Remarks</label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Assigned to handle institutional samples..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Assign Salesperson
          </Button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Component 7: Follow-up Note & Outcome Modal (Follow-ups -> Meetings)
// -------------------------------------------------------------------------------------
interface FollowUpOutcomeModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (updatedLead?: Lead) => void;
}

export const FollowUpOutcomeModal: React.FC<FollowUpOutcomeModalProps> = ({
  lead,
  onClose,
  onSuccess
}) => {
  const [responseType, setResponseType] = useState<'positive' | 'hold' | 'cold_lead'>(lead.is_cold ? 'hold' : 'positive');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      toast.error('Please enter follow-up communication notes');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Saving follow-up log & evaluating pipeline stage...');
    try {
      const res = await api.post(`/leads/${lead.id}/activity`, {
        stage: 'Follow-ups',
        activity_type: 'Follow-up Communication',
        response_type: responseType,
        outcome: responseType,
        remarks: remarks.trim(),
        text: remarks.trim()
      });
      toast.success(res.data?.message || 'Follow-up log saved successfully!', { id: toastId });
      onSuccess(res.data?.lead);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to record follow-up', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative p-8 space-y-5 z-10 animate-in zoom-in-95">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                Stage: Follow-ups
              </span>
              {lead.is_cold && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase inline-flex items-center gap-1">
                  <Snowflake size={10} className="text-rose-500" />
                  Cold Lead Tag
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-[#3a525d] italic mt-1.5">Record Follow-up Communication</h3>
            <p className="text-xs text-zinc-400 font-bold mt-0.5">
              Prospect: <span className="text-[#3a525d]">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-zinc-400">Call / Follow-up Outcome *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setResponseType('positive')}
              className={`p-3 rounded-2xl border-2 text-left transition-all ${
                responseType === 'positive'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block">Positive (Meeting)</span>
              <span className="text-[10px] text-emerald-700/80 font-medium mt-0.5 block">Advances to Meetings</span>
            </button>
            <button
              type="button"
              onClick={() => setResponseType('hold')}
              className={`p-3 rounded-2xl border-2 text-left transition-all ${
                responseType === 'hold'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block">Hold / Ongoing</span>
              <span className="text-[10px] text-amber-700/80 font-medium mt-0.5 block">Stays in Follow-ups</span>
            </button>
            <button
              type="button"
              onClick={() => setResponseType('cold_lead')}
              className={`p-3 rounded-2xl border-2 text-left transition-all ${
                responseType === 'cold_lead'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block flex items-center gap-1">
                <Snowflake size={12} className="text-rose-500" /> Cold Lead
              </span>
              <span className="text-[10px] text-rose-700/80 font-medium mt-0.5 block">Mark Cold in Follow-ups</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-400">Communication Remarks *</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Spoke to procurement manager; scheduled on-site sample presentation on Friday..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className={`flex-1 py-3 text-[10px] font-black uppercase text-white ${
              responseType === 'positive' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : responseType === 'cold_lead'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {responseType === 'positive' ? 'Advance to Meetings' : responseType === 'cold_lead' ? 'Mark Cold Lead' : 'Save Note (Keep Follow-up)'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Component 8: Meeting Outcome Modal (Hot Lead [Approved] vs Cold Lead [Rejected])
// -------------------------------------------------------------------------------------
interface MeetingOutcomeModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (credentials?: any, updatedLead?: Lead) => void;
}

export const MeetingOutcomeModal: React.FC<MeetingOutcomeModalProps> = ({
  lead,
  onClose,
  onSuccess
}) => {
  const [outcome, setOutcome] = useState<'hot_lead' | 'cold_lead'>('hot_lead');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      toast.error('Please enter meeting outcome remarks');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading(
      outcome === 'hot_lead'
        ? 'Approving meeting, creating customer organization & advancing to Hot Leads...'
        : 'Marking meeting outcome as Cold Lead & returning to Follow-ups queue...'
    );

    try {
      const res = await api.post(`/leads/${lead.id}/activity`, {
        stage: 'Meetings',
        activity_type: 'Meeting Outcome Evaluation',
        response_type: outcome,
        outcome: outcome,
        remarks: remarks.trim(),
        text: remarks.trim()
      });

      toast.success(res.data?.message || 'Meeting outcome recorded!', { id: toastId });

      let creds: any = null;
      if (res.data?.credentials && res.data?.organization) {
        creds = {
          full_name: res.data.organization.name,
          username: res.data.credentials.username,
          email: res.data.credentials.email,
          password: res.data.credentials.password
        };
      }
      onSuccess(creds, res.data?.lead);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to record meeting outcome', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative p-8 space-y-5 z-10 animate-in zoom-in-95">
        <div className="flex justify-between items-start">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black uppercase">
              Stage 06: Meetings
            </span>
            <h3 className="text-xl font-black text-[#3a525d] italic mt-1.5">Record Meeting Outcome</h3>
            <p className="text-xs text-zinc-400 font-bold mt-0.5">
              Prospect: <span className="text-[#3a525d]">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        {/* Outcome Choice Radio */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-zinc-400">Meeting Decision *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome('hot_lead')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                outcome === 'hot_lead'
                  ? 'border-orange-500 bg-orange-50/70 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5 text-orange-700 font-black text-xs">
                <Flame size={14} className="text-orange-500" /> Hot Lead (Approved)
              </div>
              <p className="text-[10px] text-orange-800/80 font-medium mt-1">
                Creates Customer Org, issues credentials, advances to Hot Leads queue.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('cold_lead')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                outcome === 'cold_lead'
                  ? 'border-rose-500 bg-rose-50/70 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5 text-rose-700 font-black text-xs">
                <Snowflake size={14} className="text-rose-500" /> Cold Lead (Rejected)
              </div>
              <p className="text-[10px] text-rose-800/80 font-medium mt-1">
                Retains organization profile, applies mild red tag, returns to Follow-ups.
              </p>
            </button>
          </div>
        </div>

        {/* Dynamic Alert Banner */}
        {outcome === 'hot_lead' ? (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              <span className="font-black">Customer Creation:</span> Submitting Hot Lead will automatically register a new customer organization profile in <span className="font-mono">organizations</span> and generate login credentials for the customer.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
            <Snowflake size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              <span className="font-black">Cold Lead Protocol:</span> The lead returns to the <span className="font-mono">Follow-ups</span> pipeline stage tagged with a <span className="font-mono">Cold Lead</span> tag for ongoing nurturing.
            </p>
          </div>
        )}

        {/* Meeting Remarks */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-400">Meeting Notes & Minutes *</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Presented fabric samples, client reviewed pricing brackets, agreed on institutional delivery timeline..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className={`flex-1 py-3 text-[10px] font-black uppercase text-white ${
              outcome === 'hot_lead' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {outcome === 'hot_lead' ? 'Approve & Create Customer' : 'Mark as Cold Lead (Follow-ups)'}
          </Button>
        </div>
      </div>
    </div>
  );
};
