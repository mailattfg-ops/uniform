'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { 
  Plus, Users, MapPin, Edit2, Trash2, Target, ShieldCheck, 
  Phone, Mail, Clock, Briefcase, FileText, X, Check, MessageSquarePlus, 
  CheckCircle2, PauseCircle, Building2, FileSpreadsheet, Sparkles, User, 
  Compass, UserCheck, ExternalLink, Flame, Snowflake, ArrowRight,
  Filter, Layers, Send, ChevronRight, CheckCircle, Navigation, AlertCircle, Lock,
  ShoppingBag, Search, ChevronDown, Calendar, MessageSquare, Award
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ContactPhoneLink } from '@/components/ui/ContactPhoneLink';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { Select } from '@/components/ui/Select';
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
  outcome?: string | null;
  remarks?: string | null;
  staff_name?: string | null;
  staff_employee_id?: string | null;
  staff_designation?: string | null;
  staff_department?: string | null;
  staff_branch?: string | null;
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
  const [isLoading, setIsLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const userRole = (currentUser?.role || '').toLowerCase();
  const userPermissions: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isSuperAdmin = userRole === 'admin' || userRole === 'super admin' || userRole === 'superadmin' || userRole === 'corporate' || userPermissions.includes('all');

  // Available zones filtered by selected branch
  const availableFilterZones = useMemo(() => {
    const effectiveBranch = (!isSuperAdmin && currentUser?.branchId) ? String(currentUser.branchId) : selectedBranch;
    if (effectiveBranch === 'ALL') return zones;
    if (effectiveBranch === 'HQ') {
      const hqZones = zones.filter(z => !z.branch_id);
      return hqZones.length > 0 ? hqZones : zones;
    }
    return zones.filter(z => String(z.branch_id) === effectiveBranch);
  }, [zones, selectedBranch, isSuperAdmin, currentUser?.branchId]);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser(u);
        const r = (u.role || '').toLowerCase();
        const perms = Array.isArray(u.permissions) ? u.permissions : [];
        const isAdmin = r === 'admin' || r === 'super admin' || r === 'superadmin' || r === 'corporate' || perms.includes('all');
        if (!isAdmin && u.branchId) {
          setSelectedBranch(String(u.branchId));
        }
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
    if (isOverdueSalesLead(l)) {
      return '!bg-rose-50/75 hover:!bg-rose-100/75 transition-colors border-b border-rose-200/50';
    }
    return undefined;
  }, [isOverdueSalesLead]);

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
      // 1. Branch filter & branch staff isolation
      if (!isSuperAdmin && currentUser?.branchId) {
        const bId = String(l.branch_id || l.employees?.branch_id || '');
        if (bId !== String(currentUser.branchId)) return false;
      } else if (selectedBranch !== 'ALL') {
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
      <div className="flex flex-col items-center gap-1 mx-auto">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
          {l.status === 'Hot Leads' && <Flame size={11} className="text-orange-500" />}
          {l.status}
        </span>
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
      className: 'min-w-[150px] max-w-[200px] text-left',
      sortValue: (l) => l.name,
      accessor: (l) => {
        const industryName = l.industries?.name || industries.find(ind => ind.id === l.industry_id)?.name;
        return (
          <div className="min-w-0 text-left flex flex-col items-start">
            <p className="font-bold text-xs md:text-sm tracking-tight text-zinc-900 truncate w-full" title={l.name}>
              {l.name}
            </p>
            {industryName && (
              <p className="text-[10px] font-bold text-[#9E1B1D] uppercase tracking-wider truncate mt-0.5 w-full">
                {industryName}
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: 'Area/Locality',
      className: 'w-[125px] min-w-[110px] whitespace-nowrap text-left',
      sortValue: (l) => [l.city, l.state].filter(Boolean).join(', ') || l.city || l.state || '',
      accessor: (l) => {
        const locality = [l.city, l.state].filter(Boolean).join(', ') || l.city || l.state || '';
        const fullTooltip = [l.address, l.city, l.state, l.pincode].filter(Boolean).join(', ') || locality;
        return locality ? (
          <div className="flex items-center justify-start gap-1.5 text-xs font-bold text-zinc-800 truncate" title={fullTooltip}>
            <MapPin size={12} className="text-[#9E1B1D] shrink-0" />
            <span className="truncate">{locality}</span>
          </div>
        ) : (
          <div className="text-left">
            <span className="text-zinc-400 text-xs italic font-medium">—</span>
          </div>
        );
      }
    },
    {
      header: 'Zone',
      className: 'w-[90px] min-w-[80px] whitespace-nowrap text-center',
      sortValue: (l) => l.zones?.name || (zones.find(z => z.id === l.zone_id)?.name) || '',
      accessor: (l) => {
        const zoneName = l.zones?.name || zones.find(z => z.id === l.zone_id)?.name;
        return zoneName ? (
          <div className="text-xs font-medium text-zinc-700 truncate text-center" title={zoneName}>
            <span className="truncate">{zoneName}</span>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-zinc-400 text-xs italic font-medium">—</span>
          </div>
        );
      }
    },
    {
      header: 'Contact',
      className: 'w-[130px] min-w-[120px] whitespace-nowrap text-left',
      sortValue: (l) => l.contact_person || l.phone || '',
      accessor: (l) => (
        l.contact_person || l.phone ? (
          <div className="flex flex-col items-start justify-center text-left min-w-0 max-w-[210px]">
            {l.contact_person && (
              <span className="text-xs font-bold text-zinc-900 truncate block w-full" title={`${l.contact_title ? l.contact_title + ' ' : ''}${l.contact_person}${l.contact_designation ? ` (${l.contact_designation})` : ''}`}>
                {l.contact_title ? `${l.contact_title} ` : ''}{l.contact_person}
                {l.contact_designation && (
                  <span className="text-[10px] text-zinc-400 font-normal ml-1">({l.contact_designation})</span>
                )}
              </span>
            )}
            {l.phone && (
              <div className="mt-0.5">
                <ContactPhoneLink phone={l.phone} name={l.contact_person || l.name} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-left">
            <span className="text-zinc-400 text-xs italic font-medium">—</span>
          </div>
        )
      )
    },
    {
      header: 'Sales Person',
      className: 'w-[110px] min-w-[100px] whitespace-nowrap text-center',
      sortValue: (l) => l.employees?.full_name || '',
      accessor: (l) => (
        l.employees ? (
          <div className="min-w-0 max-w-[190px] text-center flex flex-col items-center mx-auto">
            <p className="text-xs font-bold text-zinc-800 truncate block" title={l.employees.full_name}>
              {l.employees.full_name}
            </p>
            {l.employees.employee_id && (
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate block">
                {l.employees.employee_id}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <span className="text-zinc-400 text-xs italic font-medium">Unassigned</span>
          </div>
        )
      )
    },
    {
      header: 'Lead Status',
      className: 'w-[110px] min-w-[100px] whitespace-nowrap text-center',
      sortValue: (l) => `${l.status}_${l.is_cold ? '1' : '0'}`,
      accessor: (l) => renderStatusBadge(l)
    },
    {
      header: 'Next step',
      className: 'w-[115px] min-w-[105px] whitespace-nowrap text-center',
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
          <div className="whitespace-nowrap flex items-center justify-center text-center mx-auto">
            {content}
          </div>
        );
      }
    }
  ], [branches, zones, industries, canManageFeeds, canAssignBranch, canAssignStaff, canSalesContact, canManageFollowups, canManageMeetings, canManageHotLeads]);

  // Print Report & User Activity Report Handlers
  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintLeads = (sortedData?: Lead[], sortInfo?: SortInfo<Lead>) => {
    const dataToPrint = (sortedData && sortedData.length > 0) ? sortedData : filteredLeads;
    const printedAt = formatDate(new Date(), true);

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = dataToPrint.map((l, idx) => {
      const zoneName = l.zones?.name || zones.find(z => z.id === l.zone_id)?.name;
      const locality = [l.city, l.state].filter(Boolean).join(', ') || l.city || l.state || '—';
      const industryName = l.industries?.name || industries.find(ind => ind.id === l.industry_id)?.name;
      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">
          <div>${l.name}</div>
          ${industryName ? `<div style="font-size: 9px; font-weight: 800; color: #9e1b1d; text-transform: uppercase; margin-top: 2px;">${industryName}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568; text-align: left;">${locality}</td>
        <td style="font-size: 10px; color: #4a5568; text-align: center;">${zoneName || '—'}</td>
        <td style="font-size: 10px; color: #4a5568; text-align: left;">
          <div style="font-weight: 600; color: #1a202c;">${l.contact_person ? `${l.contact_title ? `${l.contact_title} ` : ''}${l.contact_person}` : '—'}</div>
          ${l.contact_designation ? `<div style="color: #a0aec0; font-size: 8px;">${l.contact_designation}</div>` : ''}
          ${l.phone ? `<div style="color: #2d8d9b; font-family: monospace; font-size: 9px; font-weight: bold; margin-top: 2px;">${l.phone}</div>` : ''}
        </td>
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
      <div><strong>Total Records:</strong> ${dataToPrint.length}</div>
      ${sortInfo?.headerLabel && sortInfo.headerLabel !== 'Default' ? `<div><strong>Sorted by:</strong> ${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending' : 'Descending'})</div>` : ''}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px;">#</th>
        <th>Customer Name</th>
        <th style="text-align: left;">Area/Locality</th>
        <th style="text-align: center;">Zone</th>
        <th style="text-align: left;">Contact</th>
        <th>Sales Person</th>
        <th>Lead Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">No leads matching filters</td></tr>'}
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
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Leads</h1>
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
              className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={3} />
              New Lead
            </Button>
          )}
          <PageActionsMenu
            onPrint={() => {
              if (printTriggerRef.current) {
                printTriggerRef.current();
              } else {
                handlePrintLeads(filteredLeads);
              }
            }}
            printLabel="Print Leads"
            onUserReport={() => userReportTriggerRef.current?.()}
            userReportLabel="My Report"
          />
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={filteredLeads}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onRowClick={(lead) => setViewingLead(lead)}
        onPrint={handlePrintLeads}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        pinRowTop={isOverdueSalesLead}
        rowClassName={getRowClassName}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Pipeline Stage Status Dropdown Filter */}
            <FilterDropdown
              label="Stage"
              allLabel="All Stages"
              allBadge={stageCounts['ALL'] || 0}
              value={activeStageFilter}
              onChange={(val) => {
                setActiveStageFilter(val);
                if (val !== 'Follow-ups') {
                  setFollowUpFilter('all');
                }
              }}
              options={[
                ...ACTIVE_LEAD_STAGES.map((s, idx) => ({
                  label: `${idx + 1}. ${s.label}`,
                  value: s.key,
                  badge: stageCounts[s.key] || 0
                })),
                {
                  label: '❄ Cold Leads',
                  value: 'cold_leads',
                  badge: stageCounts['cold_followups'] || 0
                }
              ]}
            />

            {/* Follow-ups Sub-filter Dropdown (Active vs Cold Leads Tag) */}
            {activeStageFilter === 'Follow-ups' && (
              <FilterDropdown
                label="Follow-up Type"
                allLabel="All Follow-ups"
                allBadge={stageCounts['Follow-ups'] || 0}
                allValue="all"
                value={followUpFilter}
                onChange={(val) => setFollowUpFilter(val as any)}
                options={[
                  { label: 'Active Follow-ups', value: 'active', badge: stageCounts['active_followups'] || 0 },
                  { label: '❄ Cold Leads Tagged', value: 'cold', badge: stageCounts['cold_followups'] || 0 }
                ]}
              />
            )}

            {/* 2. Branch Dropdown Filter - Only for Global Admins */}
            {isSuperAdmin && (
              <FilterDropdown
                label="Branch"
                allLabel="All Branches"
                allBadge={leads.length}
                value={selectedBranch}
                onChange={(val) => {
                  setSelectedBranch(val);
                  setSelectedZone('ALL');
                }}
                options={[
                  {
                    label: 'Headquarters (HQ Central)',
                    value: 'HQ',
                    badge: leads.filter(l => !l.branch_id || l.origin === 'HQ').length
                  },
                  ...branches.map((b) => ({
                    label: b.name,
                    value: String(b.id),
                    badge: leads.filter(l => String(l.branch_id || l.employees?.branch_id || '') === String(b.id)).length
                  }))
                ]}
              />
            )}

            {/* 3. Zone Dropdown Filter */}
            <FilterDropdown
              label="Zone"
              allLabel="All Zones"
              allBadge={leads.length}
              value={selectedZone}
              onChange={(val) => setSelectedZone(val)}
              options={availableFilterZones.map(z => ({
                label: z.name,
                value: String(z.id),
                badge: leads.filter(l => String(l.zone_id) === String(z.id)).length
              }))}
            />

            {/* 4. Sector / Industry Dropdown Filter */}
            <FilterDropdown
              label="Sector"
              allLabel={`All Sectors (${leads.length})`}
              value={selectedIndustry}
              onChange={(val) => setSelectedIndustry(val)}
              options={industries.map(ind => ({
                label: ind.name,
                value: String(ind.id),
                badge: leads.filter(l => String(l.industry_id) === String(ind.id)).length
              }))}
            />


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
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
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
        setEmail(editingFeed.email || '');
        setAddress(editingFeed.address || '');
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
        setEmail('');
        setAddress('');
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
    if (!industryId) {
      toast.error('Industry Sector is required');
      return;
    }
    if (!city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!state.trim()) {
      toast.error('State is required');
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }
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
        email: email.trim() ? email.trim().toLowerCase() : null,
        address: address.trim() || null,
        area: null,
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
        {/* Top Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] shrink-0" />
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-8 py-6 text-white relative flex justify-between items-start shrink-0 border-b border-white/10">
          <div>
            <h3 className="text-2xl font-black italic tracking-tight">
              {editingFeed ? 'Edit Feed Profile' : 'Add New Feed'}
            </h3>
            <p className="text-xs text-zinc-300 font-medium mt-0.5">
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
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#9E1B1D]" />
                Authenticated Staff & Branch (Auto-Logged)
              </span>
              <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20 uppercase">
                Active Session
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-2.5 border border-zinc-200 shadow-2xs">
                <p className="text-[8px] font-black uppercase text-zinc-400">Agent Name</p>
                <p className="text-xs font-black text-zinc-900 truncate mt-0.5">{authorName}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-zinc-200 shadow-2xs">
                <p className="text-[8px] font-black uppercase text-zinc-400">Origin / Branch</p>
                <p className="text-xs font-black text-[#9E1B1D] truncate mt-0.5">
                  {isBranchUser ? (userBranchName || `Branch #${userBranchId}`) : 'Headquarters (HQ)'}
                </p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-zinc-200 shadow-2xs">
                <p className="text-[8px] font-black uppercase text-zinc-400">Department</p>
                <p className="text-xs font-black text-zinc-700 truncate mt-0.5">{authorDepartment}</p>
              </div>
            </div>
          </div>

          {/* Customer Name & Industry Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <Building2 size={13} className="text-[#C82A2B]" />
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="e.g. Apex Hospital, Greenfield High"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#C82A2B]" />
                Industry Sector *
              </label>
              <Select
                value={industryId}
                onChange={(val) => setIndustryId(val)}
                placeholder="Select Sector / Category"
                options={industries.map((ind) => ({
                  value: String(ind.id),
                  label: ind.name
                }))}
              />
            </div>
          </div>

          {/* Contact Person: Title + Full Name + Designation */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <User size={13} className="text-[#9E1B1D]" />
              Contact Person Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <Select
                  value={contactTitle}
                  onChange={(val) => setContactTitle(val)}
                  options={[
                    { value: 'Mr.', label: 'Mr.' },
                    { value: 'Mrs.', label: 'Mrs.' },
                    { value: 'Ms.', label: 'Ms.' },
                    { value: 'Dr.', label: 'Dr.' },
                    { value: 'Prof.', label: 'Prof.' }
                  ]}
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Full Name (e.g. Senthil Kumar)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Designation (e.g. Admin Officer)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Contact Number & Email Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Phone size={13} className="text-[#9E1B1D]" />
                Contact Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98450 12345"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Mail size={13} className="text-[#9E1B1D]" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@institution.com"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Address Details: Street, City, State, Pincode, Country */}
          <div className="space-y-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <MapPin size={13} className="text-[#9E1B1D]" />
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
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#C82A2B]" />
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Mumbai, Bengaluru, Chennai"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#C82A2B]" />
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Maharashtra, Tamil Nadu"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
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
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
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
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Navigation size={13} className="text-[#9E1B1D]" />
                Google Maps Link (Optional)
              </label>
              <input
                type="text"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="e.g. https://maps.app.goo.gl/..."
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Automatic Origin & Branch Confirmation */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#9E1B1D]" />
                Intake Origin Source & Branch (Auto-Detected)
              </span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isBranchUser ? 'bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20' : 'bg-zinc-200 text-zinc-800'}`}>
                {isBranchUser ? 'Branch Session' : 'HQ Session'}
              </span>
            </div>
            {isBranchUser ? (
              <p className="text-xs font-bold text-[#9E1B1D]">
                Origin: <span className="font-black">BRANCH</span> • Assigned Branch: <span className="font-black">{userBranchName || `Branch #${userBranchId}`}</span>
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-zinc-600 font-medium">
                  Select a branch or pick a zone to automatically assign the branch:
                </p>
                <Select
                  value={hqBranchId}
                  onChange={(val) => {
                    const newBranchId = val;
                    setHqBranchId(newBranchId);
                    if (zoneId) {
                      const currentZone = zones.find(z => String(z.id) === String(zoneId));
                      if (!newBranchId || String(currentZone?.branch_id) !== String(newBranchId)) {
                        setZoneId('');
                        setZoneSearchQuery('');
                      }
                    }
                  }}
                  placeholder="Select Branch (Optional / Auto-assigned)"
                  options={selectableBranches.map(b => ({
                    value: String(b.id),
                    label: b.name
                  }))}
                />
              </div>
            )}

            {/* Searchable Zone Selection within NewFeedModal */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-200/70" ref={zoneDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#9E1B1D]" />
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
                      ? selectedZone.name
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
                  className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/15 text-xs font-bold text-zinc-800 bg-white disabled:bg-zinc-100 disabled:text-zinc-400 placeholder:text-zinc-400 placeholder:font-normal cursor-pointer"
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
                      {!effectiveBranchId && <span className="text-[9px] text-[#9E1B1D] font-bold normal-case">Auto-assigns branch</span>}
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
                                ? 'bg-[#FFF1F1] text-[#9E1B1D] font-black' 
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
                            {isSelected && <Check size={14} className="text-[#9E1B1D] shrink-0 stroke-[3]" />}
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
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-semibold text-zinc-800 transition-all placeholder:text-zinc-400 resize-none"
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
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-[#C82A2B] hover:bg-[#A81D1E] transition-all shadow-lg shadow-[#C82A2B]/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
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

  const isConvertingFeed = Boolean(prefillData || (editingLead && (editingLead.status === 'Feeds' || editingLead.status === 'Open Feeds' || editingLead.status === 'Contacted Leads')));

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Customer / Lead name is required');
      return;
    }
    if (!industryId) {
      toast.error('Industry Sector is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }
    if (!contactTitle) {
      toast.error('Contact person salutation is required');
      return;
    }
    if (!contactPerson.trim()) {
      toast.error('Contact person name is required');
      return;
    }
    if (!contactDesignation.trim()) {
      toast.error('Contact person designation is required');
      return;
    }
    if (!address.trim()) {
      toast.error('Street Address is required');
      return;
    }
    if (!city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!state.trim()) {
      toast.error('State is required');
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        contact_title: contactTitle,
        contact_person: contactPerson.trim() || null,
        contact_designation: contactDesignation.trim() || null,
        phone: phone.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        source: source.trim() || null,
        requirements: requirements.trim() || null,
        industry_id: industryId || null,
        address: address.trim() || null,
        area: null,
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
        {/* Top Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] shrink-0" />
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-8 py-6 text-white relative flex justify-between items-start shrink-0 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 text-[9px] font-black uppercase tracking-wider">
                {editingLead ? (editingLead.lead_code || `Lead #${editingLead.id}`) : 'Lead Pipeline'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF1F1]/10 text-rose-200 border border-white/15 text-[9px] font-black uppercase tracking-wider">
                {isConvertingFeed ? 'Customer Update • Convert to Lead' : editingLead ? 'Edit Profile' : 'New Prospect'}
              </span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tight">
              {isConvertingFeed ? 'Customer Update — Convert Feed to Lead' : editingLead ? 'Edit Lead Profile' : 'Add New Commercial Lead'}
            </h3>
            <p className="text-xs text-zinc-300 font-semibold mt-0.5">
              {isConvertingFeed
                ? 'Update mandatory contact person details and address to graduate this feed into the active commercial pipeline'
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
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                  <Layers size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-800">
                      Intake Pipeline Protocol:
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[#FFF1F1] border border-[#C82A2B]/20 text-[#9E1B1D] shadow-2xs">
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
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#9E1B1D] text-white shadow-xs">
                  {derivedIntakeStage}
                </span>
              </div>
            </div>
          )}
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
              <Building2 size={13} className="text-[#C82A2B]" />
              Lead / Company Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(capitalizeWords(e.target.value))}
              autoCapitalize="words"
              placeholder="e.g. Acme Corporation, St. Mary Academy"
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Contact Person Details: Title + Full Name + Designation */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
              <User size={13} className="text-[#C82A2B]" />
              Contact Person Details *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B] block">Salutation *</span>
                <Select
                  value={contactTitle}
                  onChange={(val) => setContactTitle(val)}
                  options={[
                    { value: 'Mr.', label: 'Mr.' },
                    { value: 'Mrs.', label: 'Mrs.' },
                    { value: 'Ms.', label: 'Ms.' },
                    { value: 'Dr.', label: 'Dr.' },
                    { value: 'Prof.', label: 'Prof.' }
                  ]}
                />
              </div>
              <div className="sm:col-span-5 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B] block">Contact Person Name *</span>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Full Name (e.g. Rajesh Sharma)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B] block">Designation *</span>
                <input
                  type="text"
                  required
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Designation (e.g. Principal / Director)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <Phone size={13} className="text-[#C82A2B]" />
                Primary Phone Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Mail size={13} className="text-[#9E1B1D]" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@acme.com"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Sector, Source, Branch, Salesperson, and Stage Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#C82A2B]" />
                Industry Sector *
              </label>
              <Select
                value={industryId}
                onChange={(val) => setIndustryId(val)}
                placeholder="Select Sector"
                options={industries.map((i) => ({
                  value: String(i.id),
                  label: i.name
                }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Compass size={13} className="text-[#9E1B1D]" />
                Lead Source
              </label>
              <Select
                value={source}
                onChange={(val) => setSource(val)}
                options={[
                  { value: 'Direct Visit', label: 'Direct Visit' },
                  { value: 'Referral', label: 'Referral' },
                  { value: 'Website', label: 'Website' },
                  { value: 'Phone Enquiry', label: 'Phone Enquiry' },
                  { value: 'Exhibition', label: 'Exhibition' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
            </div>

            {/* Branch Assignment Provision: Visible for HQ staff or when editing */}
            {(isEditing || intakeRole === 'hq_staff') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#9E1B1D]" />
                  Branch Assignment
                </label>
                <Select
                  value={branchId}
                  onChange={(val) => {
                    setBranchId(val);
                    setZoneId('');
                  }}
                  placeholder="HQ / Unassigned (Open Leads)"
                  options={[
                    { value: '', label: 'HQ / Unassigned (Open Leads)' },
                    ...branches.map((b) => ({
                      value: String(b.id),
                      label: b.name
                    }))
                  ]}
                />
              </div>
            )}

            {/* Zone Assignment Provision: Filtered by effective branch */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#9E1B1D]" />
                Zone / Region {effectiveBranchId ? `(${availableZones.length})` : ''}
              </label>
              <Select
                value={zoneId}
                onChange={(val) => setZoneId(val)}
                disabled={!effectiveBranchId}
                placeholder={effectiveBranchId ? (availableZones.length > 0 ? 'Select Zone / Sector' : 'No zones for this branch') : 'Select Branch first'}
                options={availableZones.map((z) => ({
                  value: String(z.id),
                  label: z.name
                }))}
              />
            </div>

            {/* Salesperson Assignment Provision: Visible for Branch staff or when editing */}
            {(isEditing || intakeRole === 'branch_staff') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#9E1B1D]" />
                  Salesperson Assignment
                </label>
                <Select
                  value={assignedStaffId}
                  onChange={(val) => setAssignedStaffId(val)}
                  placeholder="Unassigned (Branch Intake)"
                  options={[
                    { value: '', label: 'Unassigned (Branch Intake)' },
                    ...employees
                      .filter(emp => !userBranchId || emp.branch_id === userBranchId)
                      .map((emp) => ({
                        value: String(emp.id),
                        label: `${emp.full_name} (${emp.employee_id})`
                      }))
                  ]}
                />
              </div>
            )}

            {/* Pipeline Stage Provision: Visible ONLY when editing an existing lead */}
            {isEditing && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Layers size={13} className="text-[#9E1B1D]" />
                  Pipeline Stage
                </label>
                <Select
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                  options={PIPELINE_STAGES.map(s => ({
                    value: s.key,
                    label: s.label
                  }))}
                />
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FileSpreadsheet size={13} className="text-[#9E1B1D]" />
              Inquired Uniform Requirements
            </label>
            <textarea
              rows={2}
              value={requirements}
              onChange={(e) => setRequirements(capitalizeFirstLetter(e.target.value))}
              autoCapitalize="sentences"
              placeholder="e.g. 500 sets corporate blazers, 1200 sets industrial coveralls..."
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-semibold text-zinc-800 transition-all placeholder:text-zinc-400 resize-none"
            />
          </div>

          {/* Address & City */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <MapPin size={13} className="text-[#C82A2B]" />
                Street Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="e.g. 12th Main Road, HAL 2nd Stage"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B]">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B]">State *</label>
                <input
                  type="text"
                  required
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Navigation size={13} className="text-[#9E1B1D]" />
                Google Maps Link (Optional)
              </label>
              <input
                type="text"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="e.g. https://maps.app.goo.gl/..."
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
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
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-[#C82A2B] hover:bg-[#A81D1E] transition-all shadow-lg shadow-[#C82A2B]/25 disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
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
  const [leadQuotations, setLeadQuotations] = useState<any[]>([]);

  useEffect(() => {
    if (lead) {
      const orgId = lead.organization_id;
      api.get('/quotations').then(res => {
        const allQuotes = Array.isArray(res.data) ? res.data : [];
        const matched = allQuotes.filter((q: any) => 
          (orgId && q.organization_id === orgId) ||
          (q.organizations?.name && q.organizations.name.toLowerCase().trim() === lead.name.toLowerCase().trim()) ||
          (q.lead_id && q.lead_id === lead.id)
        );
        setLeadQuotations(matched);
      }).catch(() => {});
    } else {
      setLeadQuotations([]);
    }
  }, [lead]);

  const renderRemarksWithQuoteLinks = (text?: string | null) => {
    if (!text) return 'No remarks added';
    const quotePattern = /(QT-[A-Za-z0-9\-_]+|Q-\d+)/gi;
    const parts = text.split(quotePattern);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
      if (part.match(quotePattern)) {
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/marketing/quotations?quote_no=${encodeURIComponent(part)}&action=view`, '_blank');
            }}
            className="inline-flex items-center gap-1 font-mono font-black text-[#2d8d9b] hover:text-[#C82A2B] hover:underline bg-[#2d8d9b]/10 hover:bg-[#2d8d9b]/20 px-1.5 py-0.5 rounded cursor-pointer mx-0.5 align-baseline transition-colors"
            title={`Click to view quotation ${part}`}
          >
            <span>{part}</span>
            <ExternalLink size={10} className="shrink-0" />
          </button>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    if (lead) {
      if (lead.status === 'Open Feeds' || lead.status === 'Contacted Leads' || lead.status === 'Feeds') {
        setSelectedStageTab('Feeds');
      } else if (['Open Leads', 'New Leads', 'Sales Leads', 'Follow-ups', 'Meetings', 'Hot Leads'].includes(lead.status)) {
        setSelectedStageTab('Leads');
      } else if (lead.status === 'Quotations') {
        setSelectedStageTab('Quotations');
      } else if (lead.status === 'Deals') {
        setSelectedStageTab('Deals');
      } else if (lead.status === 'SO Converted Deals' || lead.status === 'SO Converted') {
        setSelectedStageTab('SO Converted');
      } else {
        setSelectedStageTab('Feeds');
      }
    }
  }, [lead]);

  // Fetch activities attributed specifically to selectedStageTab
  const fetchLogs = useCallback(async () => {
    if (!lead) return;
    setIsLoadingLogs(true);
    try {
      const stageParam = `?stage=${encodeURIComponent(selectedStageTab)}`;
      const res = await api.get(`/leads/${lead.id}/activities${stageParam}`);
      
      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.activities)
        ? res.data.activities
        : [];

      let mapped: LeadActivity[] = rawList.map((act: any, idx: number) => ({
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
        staff_branch: act.staff_branch || act.performed_by_branch || act.author?.branch || act.author?.branch_name || act.metadata?.branch_name || (act.branches?.name) || (lead as any).branches?.name || (lead as any).branch_name || null,
        created_at: act.created_at || (act.date ? `${act.date} ${act.time || ''}` : lead.updated_at)
      }));

      if (mapped.length === 0 && Array.isArray(lead.remarks) && lead.remarks.length > 0) {
        let derived: LeadActivity[] = lead.remarks
          .filter(r => {
            if (selectedStageTab === 'Feeds') {
              return r.stage === 'Feeds' || r.stage === 'Open Feeds' || r.stage === 'Contacted Leads' || 
                     String(r.activity_type || '').toLowerCase().includes('feed');
            }
            if (selectedStageTab === 'Leads') {
              return ['Open Leads', 'New Leads', 'Sales Leads', 'Follow-ups', 'Meetings', 'Hot Leads', 'Leads'].includes(r.stage) ||
                     (!r.stage && !['Feeds', 'Open Feeds', 'Contacted Leads', 'Quotations', 'Deals', 'SO Converted Deals'].includes(r.stage));
            }
            if (selectedStageTab === 'Quotations') {
              return r.stage === 'Quotations' || String(r.remarks || r.notes || r.text || '').includes('QT-') || String(r.remarks || r.notes || r.text || '').includes('Q-');
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
            if (selectedStageTab === 'SO Converted') {
              return r.stage === 'SO Converted Deals' || r.stage === 'SO Converted' ||
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
            staff_branch: r.author?.branch || r.author?.branch_name || r.metadata?.branch_name || (lead as any).branches?.name || (lead as any).branch_name || null,
            created_at: r.date ? `${r.date} ${r.time || ''}` : lead.updated_at
          }))
          .reverse();

        mapped = derived;
      }

      // If Quotations stage is selected and has quotations, include them (First quote, Revised quotes, follow-ups)
      if (selectedStageTab === 'Quotations' && leadQuotations.length > 0) {
        // Sort chronologically ascending
        const sortedQuotes = [...leadQuotations].sort((a, b) => {
          const tA = new Date(a.created_at || a.quotation_date || 0).getTime();
          const tB = new Date(b.created_at || b.quotation_date || 0).getTime();
          if (tA !== tB) return tA - tB;
          return a.id - b.id;
        });

        const quoteActs: any[] = [];
        sortedQuotes.forEach((q: any, qIdx: number) => {
          const isFirst = qIdx === 0;
          const verLabel = isFirst ? 'First Quote (Initial)' : `Revised Quote (R${qIdx})`;
          const quoteNo = q.quotation_no || q.quotation_number || `QT-${q.id}`;
          const qVal = Number(q.final_quote_value || q.total_amount || 0);

          quoteActs.push({
            id: `quote_${q.id}`,
            quotation_id: q.id,
            quotation_no: quoteNo,
            lead_id: lead.id,
            stage: 'Quotations',
            activity_type: `${verLabel}: #${quoteNo}`,
            response_type: q.status || 'Active',
            is_quotation_version: true,
            version_label: verLabel,
            quote_amount: qVal,
            remarks: `Quotation #${quoteNo} (${verLabel}) generated for ₹${qVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Status: ${q.status || 'Draft'}${q.metrics_summary?.bm_rejection_reason ? ` | Revision Notes: ${q.metrics_summary.bm_rejection_reason}` : ''}`,
            staff_name: q.sales_person?.name || q.created_by_name || 'Commercial Team',
            staff_employee_id: q.sales_person?.employee_id || 'SALES',
            staff_designation: 'Sales & Marketing',
            staff_department: 'Commercial',
            staff_branch: q.branches?.name || (lead as any).branches?.name || (lead as any).branch_name || null,
            created_at: q.created_at || lead.updated_at
          });

          // Also include any quotation follow-up history from metrics_summary
          if (Array.isArray(q.metrics_summary?.followups)) {
            q.metrics_summary.followups.forEach((f: any, fIdx: number) => {
              quoteActs.push({
                id: f.id || `quote_fu_${q.id}_${fIdx}`,
                quotation_id: q.id,
                quotation_no: quoteNo,
                lead_id: lead.id,
                stage: 'Quotations',
                activity_type: `Quotation Follow-up: #${quoteNo}`,
                response_type: f.outcome || f.response_type || 'Follow-up',
                remarks: f.remarks || f.text || '',
                staff_name: f.author?.name || 'Sales Representative',
                staff_employee_id: 'SALES',
                staff_designation: 'Sales & Marketing',
                staff_department: 'Commercial',
                staff_branch: f.author?.branch || f.author?.branch_name || (lead as any).branches?.name || (lead as any).branch_name || null,
                created_at: f.created_at || (f.date ? `${f.date} ${f.time || ''}` : q.created_at)
              });
            });
          }
        });

        const existingIds = new Set(mapped.map(m => String(m.id)));
        for (const qa of quoteActs) {
          if (!existingIds.has(String(qa.id))) {
            mapped.unshift(qa);
          }
        }
      }

      // Always include enquiry requirements as the first contact log when viewing lead / feed contact logs
      if (lead.requirements && (selectedStageTab === 'Leads' || selectedStageTab === 'Feeds')) {
        const hasEnquiryLog = mapped.some(m => 
          m.id === 'enquiry_requirements_log' || 
          m.activity_type === 'Enquiry Requirements' || 
          m.activity_type === 'First Contact Log' ||
          m.remarks === lead.requirements ||
          m.remarks === `Inquired Feed Requirements: ${lead.requirements}` ||
          m.remarks === `Inquired Requirements: ${lead.requirements}`
        );

        if (!hasEnquiryLog) {
          mapped.push({
            id: 'enquiry_requirements_log',
            lead_id: lead.id,
            stage: selectedStageTab,
            activity_type: 'Enquiry Requirements',
            response_type: 'Initial Enquiry',
            version_label: 'First Contact Log',
            remarks: lead.requirements,
            staff_name: lead.employees?.full_name || 'Customer / Intake',
            staff_employee_id: lead.employees?.employee_id || 'ORIGIN',
            staff_designation: 'Customer Intake',
            staff_department: 'Field Scouting & Intake',
            staff_branch: (lead as any).branches?.name || (lead as any).branch_name || null,
            created_at: lead.created_at
          } as any);
        }
      }

      // Stage milestones when no activities recorded yet
      if (mapped.length === 0) {
        if (selectedStageTab === 'Deals' && (lead.status === 'Deals' || lead.status === 'SO Converted Deals')) {
          mapped = [{
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
            staff_branch: (lead as any).branches?.name || (lead as any).branch_name || null,
            created_at: lead.updated_at || lead.created_at
          }];
        } else if (selectedStageTab === 'SO Converted' && lead.status === 'SO Converted Deals') {
          mapped = [{
            id: 'milestone_so',
            lead_id: lead.id,
            stage: 'SO Converted',
            activity_type: 'Order Conversion',
            response_type: 'so_converted',
            remarks: 'Sales Order Converted: Commercial deal successfully advanced to production manufacturing order queue.',
            staff_name: lead.employees?.full_name || 'Production Lead',
            staff_employee_id: lead.employees?.employee_id || 'OPS',
            staff_designation: 'Production Executive',
            staff_department: 'Operations',
            staff_branch: (lead as any).branches?.name || (lead as any).branch_name || null,
            created_at: lead.updated_at || lead.created_at
          }];
        }
      }

      mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setStageActivities(mapped);
    } catch (e) {
      console.error('Failed to load stage-specific activities', e);
      let derived: LeadActivity[] = [];
      if (Array.isArray(lead.remarks)) {
        derived = lead.remarks
          .filter(r => {
            if (selectedStageTab === 'Feeds') {
              return r.stage === 'Feeds' || r.stage === 'Open Feeds' || r.stage === 'Contacted Leads' || 
                     String(r.activity_type || '').toLowerCase().includes('feed');
            }
            if (selectedStageTab === 'Leads') {
              return ['Open Leads', 'New Leads', 'Sales Leads', 'Follow-ups', 'Meetings', 'Hot Leads', 'Leads'].includes(r.stage) ||
                     (!r.stage && !['Feeds', 'Open Feeds', 'Contacted Leads', 'Quotations', 'Deals', 'SO Converted Deals'].includes(r.stage));
            }
            if (selectedStageTab === 'Quotations') {
              return r.stage === 'Quotations' || String(r.remarks || r.notes || r.text || '').includes('QT-') || String(r.remarks || r.notes || r.text || '').includes('Q-');
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
            if (selectedStageTab === 'SO Converted') {
              return r.stage === 'SO Converted Deals' || r.stage === 'SO Converted' ||
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
            staff_branch: r.author?.branch || r.author?.branch_name || r.metadata?.branch_name || (lead as any).branches?.name || (lead as any).branch_name || null,
            created_at: r.date ? `${r.date} ${r.time || ''}` : lead.updated_at
          }))
          .reverse();
      }

      if (lead.requirements && (selectedStageTab === 'Leads' || selectedStageTab === 'Feeds')) {
        const hasEnquiryLog = derived.some(m => 
          m.id === 'enquiry_requirements_log' || 
          m.activity_type === 'Enquiry Requirements' || 
          m.activity_type === 'First Contact Log' ||
          m.remarks === lead.requirements ||
          m.remarks === `Inquired Feed Requirements: ${lead.requirements}` ||
          m.remarks === `Inquired Requirements: ${lead.requirements}`
        );

        if (!hasEnquiryLog) {
          derived.push({
            id: 'enquiry_requirements_log',
            lead_id: lead.id,
            stage: selectedStageTab,
            activity_type: 'Enquiry Requirements',
            response_type: 'Initial Enquiry',
            version_label: 'First Contact Log',
            remarks: lead.requirements,
            staff_name: lead.employees?.full_name || 'Customer / Intake',
            staff_employee_id: lead.employees?.employee_id || 'ORIGIN',
            staff_designation: 'Customer Intake',
            staff_department: 'Field Scouting & Intake',
            staff_branch: (lead as any).branches?.name || (lead as any).branch_name || null,
            created_at: lead.created_at
          } as any);
        }
      }

      derived.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setStageActivities(derived);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [lead, selectedStageTab, leadQuotations]);

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
      
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Top Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] shrink-0" />
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 py-5 px-8 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl text-[10px] font-mono font-bold bg-white/10 border border-white/20 text-white">
                {lead.lead_code || `Lead #${lead.id}`}
              </span>
              <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#C82A2B] text-white border border-[#C82A2B]/50 shadow-sm flex items-center gap-1.5">
                Active Stage: {lead.status}
              </span>
              {lead.is_cold && (
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white border border-rose-400 flex items-center gap-1 shadow-sm">
                  <Snowflake size={11} /> Cold Lead Tag
                </span>
              )}
              {leadQuotations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStageTab('Quotations')}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/15 hover:bg-white/25 text-white border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Filter to linked Quotations"
                >
                  <FileText size={11} />
                  <span>{leadQuotations.length} Quote{leadQuotations.length > 1 ? 's' : ''}</span>
                </button>
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
              {(() => {
                const isLeadOrFeed = lead.status === 'Feeds' || lead.status === 'Open Feeds' || lead.status === 'Contacted Leads' ||
                  ['Open Leads', 'New Leads', 'Sales Leads', 'Follow-ups', 'Meetings', 'Hot Leads'].includes(lead.status) || !lead.organization_id;

                if (!isLeadOrFeed && lead.organization_id) {
                  return (
                    <button
                      type="button"
                      onClick={() => window.open(`/customers/${lead.organization_id}`, '_blank')}
                      className="text-2xl font-black italic tracking-tight text-white hover:text-red-200 transition-colors cursor-pointer text-left flex items-center gap-2 group"
                      title="View Customer Profile"
                    >
                      <span>{lead.name}</span>
                      <ExternalLink size={18} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                }

                return (
                  <div className="text-2xl font-black italic tracking-tight text-white select-text text-left">
                    {lead.name}
                  </div>
                );
              })()}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-300">
                  {lead.industries?.name || 'Institutional'}
                </span>
                {([lead.city, lead.state].filter(Boolean).join(', ') || lead.city || lead.state) && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-[10px] font-semibold text-white/80 flex items-center gap-1">
                      <MapPin size={11} className="text-red-300" />
                      {[lead.city, lead.state].filter(Boolean).join(', ') || lead.city || lead.state}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Context-Sensitive Stage Action Button in Header */}
            <div className="flex items-center gap-2">
              {lead.status === 'Feeds' && (
                perms.canManageFeeds ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onFeedOutcome}
                      className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 cursor-pointer"
                    >
                      Follow-up
                    </button>
                    <button
                      onClick={onConvertFeed}
                      className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#C82A2B] text-white hover:bg-[#A81D1E] transition-all shadow-lg shadow-[#C82A2B]/20 cursor-pointer flex items-center gap-1.5"
                    >
                      Convert to Lead
                    </button>
                  </div>
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
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white transition-all shadow-lg shadow-[#C82A2B]/20 flex items-center gap-1.5 cursor-pointer"
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
          {/* 5-Stage Commercial Sales Pipeline Interactive Roadmap Stepper */}
          {(() => {
            const isAtFeedStage = lead.status === 'Feeds' || lead.status === 'Open Feeds' || lead.status === 'Contacted Leads';
            const isLeadStage = [
              'Open Leads',
              'New Leads',
              'Sales Leads',
              'Follow-ups',
              'Meetings',
              'Hot Leads'
            ].includes(lead.status);
            const isQuotationStage = lead.status === 'Quotations';
            const isDealStage = lead.status === 'Deals';
            const isSOStage = lead.status === 'SO Converted Deals' || lead.status === 'SO Converted';

            const isPastFeed = !isAtFeedStage;
            const isPastLead = isQuotationStage || isDealStage || isSOStage;
            const isPastQuotation = isDealStage || isSOStage;
            const isPastDeal = isSOStage;
            
            // Helper to check if an activity is initial feed creation / intake note from Add New Feed modal
            const isFeedIntakeActivity = (act: any) => {
              if (!act) return false;
              const type = String(act.activity_type || act.activityType || '').toLowerCase();
              return (
                type === 'feed_note' ||
                type === 'initial_feed_note' ||
                type === 'feed_intake_note' ||
                type === 'raw feed intake' ||
                type === 'feed_creation' ||
                type === 'intake'
              );
            };

            // Check if feed has any genuine follow-up response or activity
            const hasFeedFollowUp = lead.status === 'Contacted Leads' || 
              (Array.isArray(lead.remarks) && lead.remarks.some((r: any) => {
                if (isFeedIntakeActivity(r)) return false;
                const actType = r.activity_type || r.activityType;
                if (actType === 'Feed Contact Outcome') return true;
                const isFeedStage = r.stage === 'Feeds' || r.stage === 'Open Feeds' || r.stage === 'Contacted Leads';
                const resp = String(r.response_type || r.responseType || r.outcome || '').toLowerCase();
                const hasValidOutcome = resp === 'positive' || resp === 'negative' || (resp && resp !== 'hold' && resp !== 'intake' && resp !== 'none');
                return isFeedStage && hasValidOutcome;
              })) ||
              stageActivities.some(a => {
                if (isFeedIntakeActivity(a)) return false;
                const actType = a.activity_type;
                if (actType === 'Feed Contact Outcome') return true;
                const isFeedStage = a.stage === 'Feeds' || a.stage === 'Open Feeds' || a.stage === 'Contacted Leads';
                const resp = String(a.response_type || a.outcome || '').toLowerCase();
                const hasValidOutcome = resp === 'positive' || resp === 'negative' || (resp && resp !== 'hold' && resp !== 'intake' && resp !== 'none');
                return isFeedStage && hasValidOutcome;
              });

            const stepperItems = [
              {
                id: 'feeds',
                num: 1,
                mainTitle: 'Feeds',
                subTitle: hasFeedFollowUp ? 'Contacted Feed' : 'Open Feed',
                stageKey: 'Feeds',
                isCurrent: isAtFeedStage,
                isPassed: isPastFeed,
                hasCold: false,
              },
              {
                id: 'leads',
                num: 2,
                mainTitle: 'Leads',
                subTitle: isLeadStage 
                  ? (lead.status === 'Open Leads' ? 'Open Lead' : lead.status === 'New Leads' ? 'New Lead' : lead.status === 'Sales Leads' ? 'Sales Lead' : lead.status === 'Follow-ups' ? 'Follow-up' : lead.status === 'Meetings' ? 'Meeting' : 'Hot Lead')
                  : isPastLead ? 'Hot Lead' : 'Pending',
                stageKey: 'Leads',
                isCurrent: isLeadStage,
                isPassed: isPastLead,
                hasCold: lead.status === 'Follow-ups' && lead.is_cold,
              },
              {
                id: 'quotations',
                num: 3,
                mainTitle: 'Quotations',
                subTitle: isQuotationStage 
                  ? (leadQuotations.length > 0 ? `${leadQuotations.length} Quote${leadQuotations.length > 1 ? 's' : ''}` : 'Active')
                  : isPastQuotation ? 'Approved' : 'Pending',
                stageKey: 'Quotations',
                isCurrent: isQuotationStage,
                isPassed: isPastQuotation,
                hasCold: false,
              },
              {
                id: 'deals',
                num: 4,
                mainTitle: 'Deals',
                subTitle: isDealStage ? 'Active' : isPastDeal ? 'Converted' : 'Pending',
                stageKey: 'Deals',
                isCurrent: isDealStage,
                isPassed: isPastDeal,
                hasCold: false,
              },
              {
                id: 'so_converted',
                num: 5,
                mainTitle: 'SO Converted',
                subTitle: isSOStage ? 'Production' : 'Pending',
                stageKey: 'SO Converted',
                isCurrent: isSOStage,
                isPassed: false,
                hasCold: false,
              }
            ];

            return (
              <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-3xl p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 flex items-center gap-1.5">
                    <Layers size={13} className="text-[#9E1B1D]" />
                    Commercial Sales Pipeline Stepper (Click stage to filter logs)
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400">
                    Current: <span className="text-[#9E1B1D] font-black">{lead.status}</span>
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

                {/* 5-Node Stepper with Connecting Lines */}
                <div className="flex items-center justify-between relative px-2 sm:px-6">
                  {stepperItems.map((item, idx) => {
                    const isSelected = selectedStageTab === item.stageKey;
                    let circleClass = 'bg-white border-zinc-300 text-zinc-400';
                    if (item.isCurrent) {
                      circleClass = 'bg-[#C82A2B] border-[#C82A2B] text-white ring-4 ring-red-100 shadow-md';
                    } else if (item.isPassed) {
                      circleClass = 'bg-emerald-500 border-emerald-500 text-white';
                    }

                    return (
                      <React.Fragment key={item.id}>
                        {idx > 0 && (
                          <div className={`flex-1 h-0.5 mx-2 min-w-[12px] transition-colors ${
                            item.isPassed || item.isCurrent ? 'bg-emerald-500/80' : 'bg-zinc-200'
                          }`} />
                        )}
                        <div
                          onClick={() => setSelectedStageTab(item.stageKey)}
                          className={`flex flex-col items-center min-w-[85px] sm:min-w-[105px] max-w-[130px] p-2 rounded-2xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white shadow-md border-2 border-[#C82A2B] scale-105 ring-2 ring-red-100'
                              : 'hover:bg-white/60 border border-transparent'
                          }`}
                          title={`Click to view logs for ${item.mainTitle} (${item.subTitle})`}
                        >
                          {/* Circle Node */}
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-black mb-1.5 transition-all ${circleClass}`}>
                            {item.isPassed ? (
                              <Check size={14} strokeWidth={3} />
                            ) : (
                              <span>{item.num}</span>
                            )}
                          </div>

                          {/* Main Stage Label */}
                          <span className={`text-[10px] text-center font-black leading-tight truncate w-full ${
                            item.isCurrent
                              ? 'text-[#9E1B1D]'
                              : isSelected ? 'text-zinc-900' : 'text-zinc-600'
                          }`}>
                            {item.mainTitle}
                          </span>

                          {/* Subtitle / Sub-stage */}
                          {item.hasCold ? (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 mt-0.5">
                              <Snowflake size={8} /> Cold Lead
                            </span>
                          ) : (
                            <span className={`text-[8px] text-center font-semibold truncate w-full mt-0.5 ${
                              isSelected ? 'text-[#C82A2B] font-bold' : item.isCurrent ? 'text-zinc-800 font-bold' : 'text-zinc-400'
                            }`}>
                              {item.subTitle}
                            </span>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 2-Column Split: Prospect Details Cards (Left) & Scrollable Stage Activity Logs (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Vertically Aligned Prospect Detail Cards */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Combined Contact Card: Contact Person, Designation, Phone & Email */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
                {/* Contact Person */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    Contact Person
                  </label>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[#9E1B1D] shrink-0" />
                    <p className="text-xs font-black text-zinc-900">
                      {lead.contact_person
                        ? `${lead.contact_title ? lead.contact_title + ' ' : ''}${lead.contact_person}`
                        : 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Designation - explicit individual title */}
                <div className="space-y-1 pt-2.5 border-t border-zinc-200/60">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    Designation
                  </label>
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-[#9E1B1D] shrink-0" />
                    {lead.contact_designation ? (
                      <span className="text-xs font-bold text-zinc-800">
                        {lead.contact_designation}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400 italic">Not specified</span>
                    )}
                  </div>
                </div>

                {/* Contact Info (Phone & Email) */}
                <div className="space-y-2 pt-2.5 border-t border-zinc-200/60">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    Contact Info
                  </label>
                  {/* Phone */}
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-[#9E1B1D] shrink-0" />
                    <div className="text-xs font-bold text-zinc-800">
                      <ContactPhoneLink phone={lead.phone} name={lead.contact_person || lead.name} />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-[#9E1B1D] shrink-0" />
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-xs font-bold text-zinc-900 hover:text-[#C82A2B] truncate transition-colors"
                        title={lead.email}
                      >
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400 italic">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sales Person / Operator */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 shadow-2xs">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                  Sales Person
                </label>
                {lead.employees ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <ShieldCheck size={14} className="text-[#9E1B1D]" />
                    <div>
                      <p className="text-xs font-black text-zinc-900">{lead.employees.full_name}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase font-mono">{lead.employees.employee_id}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic font-medium">Unassigned</span>
                )}
              </div>

              {/* Location & Address */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    Location &amp; Address
                  </label>
                  {lead.google_maps_link && (
                    <a
                      href={lead.google_maps_link.startsWith('http') ? lead.google_maps_link : `https://${lead.google_maps_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 bg-[#FFF1F1] hover:bg-red-100 text-[#9E1B1D] rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors border border-[#C82A2B]/20"
                    >
                      <Navigation size={10} /> Maps
                    </a>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#9E1B1D] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-zinc-900">
                      {[lead.city, lead.state].filter(Boolean).join(', ') || 'Location unlisted'}
                    </p>
                    {lead.address && <p className="text-[11px] text-zinc-600 font-medium">{lead.address}</p>}
                    {(lead.pincode || lead.country) && (
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {[lead.pincode ? `PIN: ${lead.pincode}` : null, lead.country || 'India'].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    {lead.zones?.name && (
                      <div className="pt-1 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20 text-[10px] font-black uppercase">
                          Zone: {lead.zones.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Stage-Specific Activity Log Section (Zoho Style Timeline) */}
            <div className="lg:col-span-8 p-6 bg-white rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col h-full">
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200/60 flex items-center justify-center text-[#9E1B1D]">
                    <FileText size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                      Stage Timeline &amp; Activity History
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Showing logs for: <strong className="text-zinc-800">{selectedStageTab}</strong> stage
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-600 text-[10px] font-bold font-mono">
                  {stageActivities.length} {stageActivities.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {/* Feed & Commercial Stage Summary Banner */}
              {(selectedStageTab === 'Deals' || selectedStageTab === 'SO Converted' || selectedStageTab === 'Feeds') && (
                <div className="mt-3.5 p-3 bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-slate-50 rounded-2xl border border-teal-200/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-900">
                        {selectedStageTab === 'Feeds' ? 'Pre-Pipeline Field Scouting Feeds' : selectedStageTab === 'Deals' ? 'Deals Commercial Stage & Feeds' : 'SO Converted Production Stage & Feeds'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-zinc-500">
                      Lead Status: <strong className="text-zinc-900">{lead.status}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Zoho Style Activity Timeline */}
              <div className="mt-4 flex-1">
                {isLoadingLogs ? (
                  <div className="py-16 text-center text-xs text-zinc-400 font-bold flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading {selectedStageTab} stage logs...</span>
                  </div>
                ) : stageActivities.length > 0 ? (
                  <div className="max-h-[500px] overflow-y-auto pr-2 relative custom-scrollbar space-y-4">
                    {stageActivities.map((act, idx) => {
                      const typeLower = String(act.activity_type || '').toLowerCase();
                      const respLower = String(act.response_type || (act as any).response || '').toLowerCase();
                      
                      let IconComponent = MessageSquare;
                      let iconColor = 'bg-blue-50 text-blue-600 border-blue-200';

                      if (typeLower.includes('phone') || typeLower.includes('call') || typeLower.includes('follow-up')) {
                        IconComponent = Phone;
                        iconColor = 'bg-sky-50 text-sky-600 border-sky-200';
                      } else if (typeLower.includes('meeting')) {
                        IconComponent = Calendar;
                        iconColor = 'bg-purple-50 text-purple-600 border-purple-200';
                      } else if (typeLower.includes('quot') || typeLower.includes('quote')) {
                        IconComponent = FileText;
                        iconColor = 'bg-orange-50 text-orange-600 border-orange-200';
                      } else if (typeLower.includes('deal') || typeLower.includes('payment')) {
                        IconComponent = Award;
                        iconColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                      } else if (typeLower.includes('order') || typeLower.includes('so') || typeLower.includes('convert')) {
                        IconComponent = ShoppingBag;
                        iconColor = 'bg-teal-50 text-teal-600 border-teal-200';
                      } else if (typeLower.includes('assign') || typeLower.includes('staff') || typeLower.includes('branch')) {
                        IconComponent = ShieldCheck;
                        iconColor = 'bg-indigo-50 text-indigo-600 border-indigo-200';
                      }

                      const staffName = act.staff_name || 'Staff Member';
                      const initials = staffName.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ST';

                      let timeString = '';
                      try {
                        const d = new Date(act.created_at);
                        if (!isNaN(d.getTime())) {
                          timeString = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
                        }
                      } catch {}

                      return (
                        <div key={act.id} className="grid grid-cols-[90px_28px_1fr] sm:grid-cols-[105px_28px_1fr] items-start gap-3 group relative">
                          {/* Left Side: ONLY Date and Time of Logging */}
                          <div className="text-right flex flex-col items-end pt-1 min-w-0 pr-1 select-none">
                            <span className="text-xs font-black text-zinc-900 tracking-tight whitespace-nowrap">
                              {formatDate(act.created_at, false)}
                            </span>
                            {timeString && (
                              <span className="text-[10px] font-mono font-bold text-zinc-500 flex items-center gap-1 justify-end whitespace-nowrap mt-0.5">
                                <Clock size={10} className="text-zinc-400 shrink-0" />
                                {timeString}
                              </span>
                            )}
                          </div>

                          {/* Center Column: Vertical Rail & Icon Node */}
                          <div className="relative flex flex-col items-center h-full self-stretch">
                            {/* Continuous Vertical Rail */}
                            <div className={`absolute top-0 w-0.5 bg-zinc-200 ${
                              idx === stageActivities.length - 1 ? 'bottom-0' : 'bottom-[-16px]'
                            }`} />
                            
                            {/* Icon Node Dot */}
                            <div className={`relative z-10 w-7 h-7 rounded-full border-2 border-white shadow-xs flex items-center justify-center transition-transform group-hover:scale-110 mt-0.5 ${iconColor}`}>
                              <IconComponent size={12} strokeWidth={2.5} />
                            </div>
                          </div>

                          {/* Right Side: Activity Card */}
                          <div 
                            onClick={() => {
                              const qId = (act as any).quotation_id;
                              const qNo = (act as any).quotation_no;
                              if (qId || qNo) {
                                const url = qId
                                  ? `/marketing/quotations?id=${qId}&action=view`
                                  : `/marketing/quotations?quote_no=${encodeURIComponent(qNo)}&action=view`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className={`border rounded-2xl p-4 shadow-2xs transition-all space-y-2 min-w-0 ${
                              (act as any).quotation_id || (act as any).quotation_no
                                ? 'bg-white hover:bg-zinc-50 border-zinc-200/90 hover:border-[#2d8d9b]/60 cursor-pointer group/qcard'
                                : 'bg-white hover:bg-zinc-50/70 border-zinc-200/90'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-zinc-900 tracking-tight">
                                  {act.activity_type || 'Activity Note'}
                                </span>
                                {(act as any).version_label && (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                    (act as any).version_label.includes('First')
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {(act as any).version_label}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {act.response_type && (
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                    respLower === 'positive' || respLower === 'hot_lead' || respLower === 'deal_won' || respLower === 'so_converted'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : respLower === 'cold_lead' || respLower === 'negative'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {act.response_type}
                                  </span>
                                )}

                                {((act as any).quotation_id || (act as any).quotation_no) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const qId = (act as any).quotation_id;
                                      const qNo = (act as any).quotation_no;
                                      const url = qId
                                        ? `/marketing/quotations?id=${qId}&action=view`
                                        : `/marketing/quotations?quote_no=${encodeURIComponent(qNo)}&action=view`;
                                      window.open(url, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#2d8d9b] hover:bg-[#236e7a] text-white shadow-xs transition-all cursor-pointer"
                                  >
                                    <span>View Quotation</span>
                                    <ExternalLink size={10} className="shrink-0" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs font-medium text-zinc-700 leading-relaxed whitespace-pre-wrap">
                              {renderRemarksWithQuoteLinks(act.remarks)}
                            </p>

                            {((act as any).quotation_id || (act as any).quotation_no) && (
                              <div className="pt-1 text-[10px] text-[#2d8d9b] font-bold flex items-center gap-1 group-hover/qcard:underline">
                                <span>Click card to open quotation in another tab</span>
                                <ExternalLink size={10} />
                              </div>
                            )}

                            {/* Staff Attribution Footer: Staff Name, Employee ID, Designation, Branch */}
                            <div className="pt-2.5 mt-2 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                                  <div className="w-5 h-5 rounded-full bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20 flex items-center justify-center text-[9px] font-black shrink-0">
                                    {initials}
                                  </div>
                                  <span className="truncate" title={staffName}>{staffName}</span>
                                </div>

                                {act.staff_employee_id && (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono font-bold text-[9px] border border-zinc-200 shrink-0">
                                    {act.staff_employee_id}
                                  </span>
                                )}

                                {act.staff_designation && (
                                  <span className="text-zinc-500 font-medium text-[10px] truncate" title={act.staff_designation}>
                                    • {act.staff_designation}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-[10px] font-semibold text-zinc-700 shrink-0">
                                <Building2 size={11} className="text-[#9E1B1D] shrink-0" />
                                <span>{act.staff_branch || (lead as any).branches?.name || (lead as any).branch_name || 'Main Branch'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-14 text-center bg-zinc-50/60 rounded-2xl border border-dashed border-zinc-200 p-6 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-2.5">
                      <Clock size={20} />
                    </div>
                    <p className="text-xs text-zinc-700 font-bold">
                      No activity logs recorded for <span className="text-[#9E1B1D]">{selectedStageTab}</span> stage.
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                      Activities, calls, follow-ups, and milestone notes logged in this stage will appear here. Click another stage in the pipeline above to see its logs.
                    </p>
                  </div>
                )}
              </div>
            </div>
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
              className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#C82A2B] text-white hover:bg-[#A81D1E] shadow-lg shadow-[#C82A2B]/20 gap-1.5 cursor-pointer"
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
  const [responseType, setResponseType] = useState<'negative' | 'hold' | 'positive'>('hold');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading('Recording feed response outcome...');
    try {
      const logNote = remarks.trim() || (responseType === 'positive' ? 'Positive response from prospect' : responseType === 'negative' ? 'Negative response from prospect' : 'Prospect ongoing / hold');
      const res = await api.post(`/leads/${lead.id}/activity`, {
        stage: 'Feeds',
        activity_type: 'Feed Contact Outcome',
        response_type: responseType,
        remarks: logNote,
        text: logNote
      });
      toast.success(res.data?.message || 'Feed outcome updated!', { id: toastId });
      onSuccess(res.data?.lead);
      if (responseType === 'positive' && onConvertToLead) {
        onConvertToLead();
      }
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
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-black uppercase">
              Stage: Feeds
            </span>
            <h3 className="text-xl font-black text-zinc-900 italic mt-1.5">
              Feed Follow-up &amp; Contact Outcome
            </h3>
            <p className="text-xs text-zinc-500 font-bold mt-0.5">
              Prospect: <span className="text-zinc-900">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        {/* Field Contact Response Outcome Options */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] block">
            Field Contact Response Outcome *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Negative (Left) */}
            <button
              type="button"
              onClick={() => setResponseType('negative')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'negative'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block flex items-center gap-1">
                <Snowflake size={12} className="text-rose-500" /> Negative
              </span>
              <p className="text-[10px] text-rose-700/80 font-medium mt-0.5 block">
                Mark Cold in Feeds
              </p>
            </button>

            {/* 2. Hold / Pending (Middle - Default) */}
            <button
              type="button"
              onClick={() => setResponseType('hold')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'hold'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block">Hold / Pending</span>
              <p className="text-[10px] text-amber-700/80 font-medium mt-0.5 block">
                Retains at Feeds for retry
              </p>
            </button>

            {/* 3. Positive (Right) */}
            <button
              type="button"
              onClick={() => setResponseType('positive')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'positive'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block">Positive</span>
              <p className="text-[10px] text-emerald-700/80 font-medium mt-0.5 block">
                {lead.branch_id || lead.origin === 'BRANCH' ? 'Converts to New Leads' : 'Converts to Open Leads'}
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-500">Remarks & Follow-up Notes</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Discussed uniform catalog, agreed to proceed with sample meeting..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 resize-none text-zinc-900"
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
            className={`flex-1 py-3 text-[10px] font-black uppercase text-white ${
              responseType === 'positive'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                : responseType === 'negative'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20'
            }`}
          >
            {isSubmitting ? 'Recording...' : responseType === 'positive' ? 'Save & Convert to Lead →' : 'Save Outcome'}
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
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-black uppercase">
              Stage: Open Leads
            </span>
            <h3 className="text-xl font-black text-zinc-900 italic mt-1.5">Assign Branch to Lead</h3>
            <p className="text-xs text-zinc-500 font-bold mt-0.5">
              Prospect: <span className="text-zinc-900">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-800 font-semibold">
          Assigning a branch from Headquarters will immediately advance this lead from <span className="font-black text-zinc-900">Open Leads</span> to <span className="font-black text-zinc-900">New Leads</span>.
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-[#C82A2B]">Select Target Branch *</label>
          <Select
            value={branchId}
            onChange={(val) => setBranchId(val)}
            placeholder="Select Branch"
            options={branches.map(b => ({
              value: String(b.id),
              label: b.name
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-500">Assignment Remarks</label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Routed based on proximity to client factory..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 resize-none text-zinc-900"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500 hover:bg-zinc-100">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-[10px] font-black uppercase bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-md shadow-[#C82A2B]/20"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
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
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-black uppercase">
              Stage: New Leads
            </span>
            <h3 className="text-xl font-black text-zinc-900 italic mt-1.5">Assign Salesperson</h3>
            <p className="text-xs text-zinc-500 font-bold mt-0.5">
              Prospect: <span className="text-zinc-900">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-800 font-semibold">
          Assigning a dedicated sales representative advances this lead from <span className="font-black text-zinc-900">New Leads</span> to <span className="font-black text-zinc-900">Sales Leads</span>.
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-[#C82A2B]">Select Salesperson *</label>
          <Select
            value={staffId}
            onChange={(val) => setStaffId(val)}
            placeholder="Select Salesperson"
            options={employees.map(emp => ({
              value: String(emp.id),
              label: `${emp.full_name} (${emp.employee_id}) - ${emp.department || 'Sales'}`
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-zinc-500">Delegation Remarks</label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Assigned to handle institutional samples..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 resize-none text-zinc-900"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500 hover:bg-zinc-100">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-[10px] font-black uppercase bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-md shadow-[#C82A2B]/20"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
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
  const [responseType, setResponseType] = useState<'negative' | 'hold' | 'positive'>('hold');
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
            <h3 className="text-xl font-black text-zinc-900 italic mt-1.5">Record Follow-up Communication</h3>
            <p className="text-xs text-zinc-500 font-bold mt-0.5">
              Prospect: <span className="text-zinc-900">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#C82A2B]">Call / Follow-up Outcome *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Negative (Left) */}
            <button
              type="button"
              onClick={() => setResponseType('negative')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'negative'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block flex items-center gap-1">
                <Snowflake size={12} className="text-rose-500" /> Negative
              </span>
              <span className="text-[10px] text-rose-700/80 font-medium mt-0.5 block">Mark Cold in Follow-ups</span>
            </button>

            {/* 2. Hold / Pending (Middle - Default) */}
            <button
              type="button"
              onClick={() => setResponseType('hold')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'hold'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block">Hold / Pending</span>
              <span className="text-[10px] text-amber-700/80 font-medium mt-0.5 block">Stays in Follow-ups</span>
            </button>

            {/* 3. Positive (Right) */}
            <button
              type="button"
              onClick={() => setResponseType('positive')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                responseType === 'positive'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-black block">Positive</span>
              <span className="text-[10px] text-emerald-700/80 font-medium mt-0.5 block">Advances to Meetings</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-[#C82A2B]">Communication Remarks *</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Spoke to procurement manager; scheduled on-site sample presentation on Friday..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 resize-none text-zinc-900"
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
                : responseType === 'negative'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
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
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-black uppercase">
              Stage 06: Meetings
            </span>
            <h3 className="text-xl font-black text-zinc-900 italic mt-1.5">Record Meeting Outcome</h3>
            <p className="text-xs text-zinc-500 font-bold mt-0.5">
              Prospect: <span className="text-zinc-900">{lead.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        {/* Outcome Choice Radio */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#C82A2B]">Meeting Decision *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome('hot_lead')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                outcome === 'hot_lead'
                  ? 'border-[#C82A2B] bg-[#FFF1F1] shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[#9E1B1D] font-black text-xs">
                <Flame size={14} className="text-[#C82A2B]" /> Hot Lead (Approved)
              </div>
              <p className="text-[10px] text-zinc-600 font-medium mt-1">
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
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-start gap-2 text-xs text-zinc-800">
            <CheckCircle2 size={16} className="text-[#C82A2B] shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              <span className="font-black text-zinc-900">Customer Creation:</span> Submitting Hot Lead will automatically register a new customer organization profile in <span className="font-mono">organizations</span> and generate login credentials for the customer.
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
          <label className="text-[10px] font-black uppercase text-[#C82A2B]">Meeting Notes & Minutes *</label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
            autoCapitalize="sentences"
            placeholder="e.g. Presented fabric samples, client reviewed pricing brackets, agreed on institutional delivery timeline..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 resize-none text-zinc-900"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500 hover:bg-zinc-100">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className={`flex-1 py-3 text-[10px] font-black uppercase text-white shadow-md ${
              outcome === 'hot_lead' ? 'bg-[#C82A2B] hover:bg-[#A81D1E] shadow-[#C82A2B]/20' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
