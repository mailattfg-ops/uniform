'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { 
  Plus, 
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Star,
  AlertTriangle,
  Phone,
  ExternalLink,
  CreditCard,
  Clock,
  AlertCircle,
  X,
  Search,
  ReceiptText,
  Printer
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { CustomerFormModal } from '@/components/entities/CustomerFormModal';
import { formatDate } from '@/lib/formatters';

interface Customer {
  id: number;
  customer_code: string | null;
  name: string;
  contact_title?: string | null;
  contact_person?: string | null;
  contact_designation?: string | null;
  origin?: string | null;
  phone?: string | null;
  contact_number?: string | null;
  email?: string | null;
  contact_email?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  branch_id?: number | null;
  zone_id?: number | null;
  zones?: { id: number; name: string; code?: string } | null;
  industry_id: number;
  industries?: { name: string };
  relationship_manager_id: number | null;
  relationship_manager?: { id: number; full_name: string; employee_id: string } | null;
  assigned_operator_id: number | null;
  assigned_operator?: { id: number; full_name: string; employee_id: string } | null;
  is_active?: boolean | null;
  is_special?: boolean | null;
  is_risk?: boolean | null;
  receivables?: number | null;
  credits?: number | null;
  credit_period_days?: number | null;
  created_at: string;
}

interface Industry {
  id: number;
  name: string;
}

function compileCustomerDirectoryHTML({
  customers,
  sortInfo,
  statusFilter,
  selectedIndustryName,
  selectedBranchName,
  printedAt,
  invoices = [],
  branches = []
}: {
  customers: Customer[];
  sortInfo: SortInfo<Customer>;
  statusFilter: string;
  selectedIndustryName: string;
  selectedBranchName?: string;
  printedAt: string;
  invoices?: any[];
  branches?: any[];
}): string {
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.is_active !== false).length;
  const inactiveCount = customers.filter(c => c.is_active === false).length;
  const specialCount = customers.filter(c => c.is_special).length;
  const riskCount = customers.filter(c => c.is_risk).length;
  const totalReceivables = customers.reduce((sum, c) => sum + Number(c.receivables || 0), 0);

  const sortLabel = sortInfo.headerLabel && sortInfo.headerLabel !== 'Default'
    ? `${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending / A→Z' : 'Descending / Z→A'})`
    : 'Default / Account Order';

  const filterLabel = [
    statusFilter === 'ALL' ? 'All Customers' : `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Customers`,
    selectedIndustryName !== 'ALL' ? `Sector: ${selectedIndustryName}` : 'All Sectors',
    selectedBranchName && selectedBranchName !== 'All Branches' ? `Branch: ${selectedBranchName}` : 'All Branches'
  ].join(' • ');

  const rowsHtml = customers.map((c, idx) => {
    const custId = c.customer_code || `#${c.id}`;
    const name = c.name || 'Unnamed Customer';
    const sector = c.industries?.name || '';
    const branchName = branches?.find((b: any) => String(b.id) === String(c.branch_id))?.name || (c as any).branches?.name || '—';
    const contactPerson = c.contact_person || '—';
    const phone = c.contact_number || c.phone || '—';
    const salesPerson = c.relationship_manager?.full_name || 'Unassigned';
    const receivables = Number(c.receivables || 0);

    let credits = Number(c.credits ?? 0);
    if (credits === 0 && invoices && invoices.length > 0) {
      const custInvs = invoices.filter(inv =>
        (inv.organization_id && inv.organization_id === c.id) ||
        (c.name && inv.customer_name && inv.customer_name.toLowerCase().trim() === c.name.toLowerCase().trim())
      );
      if (custInvs.length > 0) {
        const invTotal = custInvs.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount || 0), 0);
        const invPaid = custInvs.reduce((sum: number, inv: any) => sum + parseFloat(inv.paid_amount || 0), 0);
        credits = Math.max(0, invPaid - invTotal);
      }
    }

    return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold; color: #2d8d9b; font-size: 10px;">${custId}</td>
        <td>
          <div style="font-weight: 800; color: #1a202c; font-size: 11px;">${name}</div>
          ${sector ? `<div style="font-size: 8px; color: #2d8d9b; font-weight: bold; text-transform: uppercase;">${sector}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 600;">${contactPerson}</div>
          ${c.contact_designation ? `<div style="color: #a0aec0; font-size: 8px;">${c.contact_designation}</div>` : ''}
        </td>
        <td style="font-size: 10px; font-family: monospace; color: #4a5568;">${phone}</td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; color: ${receivables > 0 ? '#e53e3e' : '#4a5568'}; white-space: nowrap;">
          ₹${receivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; color: ${credits > 0 ? '#38a169' : '#4a5568'}; white-space: nowrap;">
          ₹${credits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Customer Directory Report - Forma Apparels</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Inter:wght@400;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #1a202c;
      padding: 24px;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @page {
      size: landscape;
      margin: 8mm;
    }

    .report-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      border-bottom: 2px solid #3a525d;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #3a525d;
    }

    .brand-subtitle {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #2d8d9b;
      font-weight: 800;
      margin-top: 2px;
    }

    .report-meta {
      text-align: right;
      font-size: 10px;
    }

    .meta-item {
      margin-bottom: 3px;
      color: #4a5568;
    }

    .meta-item strong {
      color: #1a202c;
    }

    .meta-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: #e6fffa;
      color: #234e52;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #b2f5ea;
    }

    .kpi-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
    }

    .kpi-col {
      flex: 1;
      min-width: 80px;
      border-right: 1px solid #e2e8f0;
      padding-right: 10px;
    }
    .kpi-col:last-child {
      border-right: none;
      padding-right: 0;
    }

    .kpi-label {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #718096;
      font-weight: 700;
    }

    .kpi-value {
      font-size: 14px;
      font-weight: 800;
      color: #2d3748;
      font-family: monospace;
      margin-top: 2px;
    }

    table {
      width: 100%;
      min-width: 650px;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: #3a525d;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 8px 6px;
      border: 1px solid #2d424b;
      white-space: nowrap;
    }

    td {
      padding: 6px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
      font-size: 10px;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    tr {
      page-break-inside: avoid;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-active {
      background: #def7ec;
      color: #03543f;
    }
    .badge-inactive {
      background: #f3f4f6;
      color: #4b5563;
    }
    .badge-special {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-risk {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-standard {
      background: #f1f5f9;
      color: #64748b;
    }

    .report-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 9px;
      color: #718096;
      margin-top: 16px;
    }

    @media print {
      body {
        padding: 0;
      }
      table {
        min-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-title">FORMA APPARELS</div>
      <div class="brand-subtitle">Central Manufacturing & Institutional Distribution</div>
      <div style="font-size: 14px; font-weight: 800; color: #2d8d9b; margin-top: 6px;">Customer Directory Registry</div>
    </div>
    <div class="report-meta">
      <div class="meta-item"><strong>Printed:</strong> ${printedAt}</div>
      <div class="meta-item"><strong>Filter Scope:</strong> ${filterLabel}</div>
      <div class="meta-item"><strong>Sorting Applied:</strong> <span class="meta-tag">${sortLabel}</span></div>
      <div class="meta-item"><strong>Total Records:</strong> ${totalCount}</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-col">
      <div class="kpi-label">Total Listed</div>
      <div class="kpi-value">${totalCount}</div>
    </div>
    <div class="kpi-col">
      <div class="kpi-label">Active Accounts</div>
      <div class="kpi-value" style="color: #047857;">${activeCount}</div>
    </div>
    <div class="kpi-col">
      <div class="kpi-label">Inactive Accounts</div>
      <div class="kpi-value" style="color: #6b7280;">${inactiveCount}</div>
    </div>
    <div class="kpi-col">
      <div class="kpi-label">Favourite Clients</div>
      <div class="kpi-value" style="color: #b45309;">${specialCount}</div>
    </div>
    <div class="kpi-col">
      <div class="kpi-label">Risk Accounts</div>
      <div class="kpi-value" style="color: #b91c1c;">${riskCount}</div>
    </div>
    <div class="kpi-col">
      <div class="kpi-label">Total Receivables</div>
      <div class="kpi-value" style="color: #0369a1;">₹${totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25px;">#</th>
        <th style="width: 80px;">CUST. ID</th>
        <th>CUSTOMER NAME</th>
        <th>CONTACT PERSON</th>
        <th>CONTACT PHONE</th>
        <th style="text-align: right; width: 85px;">RECEIVABLES</th>
        <th style="text-align: right; width: 80px;">CREDITS</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #718096;">No customer records matching the active filters.</td></tr>'}
    </tbody>
  </table>

  <div class="report-footer">
    <div>Forma Apparels ERP • Confidential Internal Registry Report</div>
    <div>Sorted as per view: ${sortLabel} • Generated on ${printedAt}</div>
  </div>
</body>
</html>`;
}

export default function CustomersRegistry() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SPECIAL' | 'RISK'>('ALL');
  
  // Modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [financialModal, setFinancialModal] = useState<{
    isOpen: boolean;
    type: 'receivables' | 'upcoming' | 'due' | 'overdue' | null;
  }>({
    isOpen: false,
    type: null
  });
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Print Report & User Activity Report Handlers
  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    data: Customer[];
    sortInfo: SortInfo<Customer>;
  } | null>(null);

  const handlePrintCustomers = (sortedData?: Customer[], sortInfo?: SortInfo<Customer>) => {
    const dataToPrint = (sortedData && sortedData.length > 0) ? sortedData : filteredCustomers;
    const infoToPrint: SortInfo<Customer> = sortInfo || { columnIndex: null, column: null, direction: 'asc', headerLabel: 'Default' };
    setPrintModal({
      isOpen: true,
      data: dataToPrint,
      sortInfo: infoToPrint,
    });
  };

  const executePrint = (html: string) => {
    let iframe = document.getElementById('customer-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'customer-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 300);
    }
  };

  const compiledPrintHTML = useMemo(() => {
    if (!printModal?.isOpen) return '';
    const selectedInd = industries.find(i => String(i.id) === String(selectedIndustry));
    const activeBranch = branches.find(b => String(b.id) === selectedBranch);
    const selectedBranchName = selectedBranch === 'ALL' ? 'All Branches' : (activeBranch?.name || `Branch #${selectedBranch}`);
    const now = new Date();
    const printedAt = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    return compileCustomerDirectoryHTML({
      customers: printModal.data,
      sortInfo: printModal.sortInfo,
      statusFilter,
      selectedIndustryName: selectedInd ? selectedInd.name : (selectedIndustry === 'ALL' ? 'All Sectors' : selectedIndustry),
      selectedBranchName,
      printedAt,
      invoices,
      branches,
    });
  }, [printModal, industries, selectedIndustry, selectedBranch, branches, statusFilter, invoices]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const isClientUser = Boolean(
    currentUser?.organizationId || 
    currentUser?.memberId || 
    ['organisation', 'organization', 'school', 'entity', 'student', 'member'].includes((currentUser?.role || '').toLowerCase())
  );

  const [zones, setZones] = useState<any[]>([]);

  const availableFilterZones = useMemo(() => {
    if (selectedBranch === 'ALL') return zones;
    return zones.filter(z => String(z.branch_id) === selectedBranch);
  }, [zones, selectedBranch]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, indRes, empRes, invRes, branchRes, zoneRes] = await Promise.all([
        api.get('/customers').catch(() => api.get('/organizations')).catch(() => ({ data: [] })),
        api.get('/industries').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/invoices').catch(() => ({ data: [] })),
        api.get('/branches').catch(() => ({ data: [] })),
        api.get('/zones').catch(() => ({ data: [] }))
      ]);
      setCustomers(custRes.data || []);
      setIndustries(indRes.data || []);
      setEmployees(empRes.data || []);
      setInvoices(invRes.data || []);
      setBranches(branchRes.data || []);
      setZones(zoneRes.data || []);
    } catch (err) {
      toast.error('Failed to load customer directory data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = (cust: Customer, openInNewTab: boolean = false) => {
    if (openInNewTab) {
      window.open(`/customers/${cust.id}`, '_blank');
    } else {
      router.push(`/customers/${cust.id}`);
    }
  };

  // Toggle Status: Active vs Inactive
  const handleToggleStatus = async (cust: Customer, nextActive: boolean) => {
    if (isClientUser) return;
    const oldActive = cust.is_active !== false;
    if (oldActive === nextActive) return;

    // Optimistic update
    setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_active: nextActive } : c));
    const loadingToast = toast.loading(`Marking ${cust.name} as ${nextActive ? 'Active' : 'Inactive'}...`);

    try {
      await api.put(`/customers/${cust.id}`, { is_active: nextActive })
        .catch(() => api.put(`/organizations/${cust.id}`, { is_active: nextActive }));
      toast.success(`${cust.name} is now ${nextActive ? 'Active' : 'Inactive'}`, { id: loadingToast });
    } catch (err: any) {
      // Rollback
      setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_active: oldActive } : c));
      toast.error(err.response?.data?.error || 'Failed to update status', { id: loadingToast });
    }
  };

  // Mutually Exclusive: Special vs Risk vs Standard
  const handleSetClassification = async (cust: Customer, newType: 'standard' | 'special' | 'risk') => {
    if (isClientUser) return;
    const oldSpecial = !!cust.is_special;
    const oldRisk = !!cust.is_risk;

    const nextSpecial = newType === 'special';
    const nextRisk = newType === 'risk';

    // Optimistic update
    setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_special: nextSpecial, is_risk: nextRisk } : c));
    
    const label = newType === 'special' ? 'Favourite Customer' : newType === 'risk' ? 'Risk Customer' : 'Standard Customer';
    const loadingToast = toast.loading(`Classifying ${cust.name} as ${label}...`);

    try {
      await api.put(`/customers/${cust.id}`, {
        is_special: nextSpecial,
        is_risk: nextRisk,
        client_tag: newType
      }).catch(() => api.put(`/organizations/${cust.id}`, {
        is_special: nextSpecial,
        is_risk: nextRisk,
        client_tag: newType
      }));
      toast.success(`${cust.name} classified as ${label}`, { id: loadingToast });
    } catch (err: any) {
      // Rollback
      setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, is_special: oldSpecial, is_risk: oldRisk } : c));
      toast.error(err.response?.data?.error || 'Failed to update classification', { id: loadingToast });
    }
  };

  const generateInitialPassword = () => Math.random().toString(36).slice(-6).toUpperCase();

  const handleAddOrUpdate = async (formData: any) => {
    if (!formData.phone || !formData.phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }

    const loadingToast = toast.loading(editingCustomer ? 'Updating customer profile...' : 'Adding new customer...');

    const isSpecial = formData.client_tag === 'special';
    const isRisk = formData.client_tag === 'risk';

    // Automatically resolve relationship manager from logged-in user if creating
    const matchedEmployee = employees.find(e => 
      (currentUser?.employeeRecordId && e.id === currentUser.employeeRecordId) ||
      (currentUser?.employeeId && e.employee_id === currentUser.employeeId) ||
      (currentUser?.fullName && e.full_name?.toLowerCase() === currentUser.fullName?.toLowerCase()) ||
      (currentUser?.id && (e as any).user_id === currentUser.id)
    );
    const resolvedRmId = editingCustomer?.relationship_manager_id || (matchedEmployee ? matchedEmployee.id : null);

    const payload = {
      name: formData.name,
      contact_title: formData.contact_title || 'Mr.',
      contact_person: formData.contact_person?.trim() || null,
      contact_designation: formData.contact_designation?.trim() || null,
      phone: formData.phone.trim(),
      contact_number: formData.phone.trim(),
      email: formData.email?.trim() || null,
      contact_email: formData.email?.trim() || null,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      pincode: formData.pincode?.trim() || null,
      country: formData.country?.trim() || 'India',
      branch_id: formData.branch_id ? parseInt(formData.branch_id, 10) : (currentUser?.branchId || null),
      zone_id: formData.zone_id ? parseInt(formData.zone_id, 10) : null,
      origin: currentUser?.branchId ? 'BRANCH' : 'HQ',
      relationship_manager_id: resolvedRmId,
      is_active: formData.is_active === 'true',
      is_special: isSpecial,
      is_risk: isRisk,
      client_tag: formData.client_tag || 'standard',
      receivables: formData.receivables !== undefined && formData.receivables !== '' ? parseFloat(formData.receivables) : 0,
      credits: formData.credits !== undefined && formData.credits !== '' ? parseFloat(formData.credits) : 0,
      credit_period_days: formData.credit_period_days !== undefined && formData.credit_period_days !== '' ? parseInt(formData.credit_period_days, 10) : 30,
    };

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload).catch(() => api.put(`/organizations/${editingCustomer.id}`, payload));
        toast.success('Customer profile updated successfully!', { id: loadingToast });
      } else {
        const autoPassword = generateInitialPassword();
        const submissionData = {
          ...payload,
          username: formData.username,
          password: autoPassword
        };

        await api.post('/customers', submissionData).catch(() => api.post('/organizations', submissionData));
        toast.success('Customer registered successfully!', { id: loadingToast });

        setCredsModal({
          isOpen: true,
          data: {
            full_name: formData.name,
            username: formData.username,
            password: autoPassword
          }
        });
      }
      setIsAdding(false);
      setEditingCustomer(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;

    const loadingToast = toast.loading('Purging customer account...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/customers/${deleteConfirm.id}`).catch(() => api.delete(`/organizations/${deleteConfirm.id}`));
      toast.success('Customer account and linked data removed', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete customer', { id: loadingToast });
      console.error(err)
    }
  };

  const handleResetPassword = async (cust: Customer) => {
    const loadingToast = toast.loading('Generating secure portal access key...');
    try {
      const response = await api.post(`/customers/${cust.id}/reset-password`).catch(() => api.post(`/organizations/${cust.id}/reset-password`));
      const { newPassword, username } = response.data;

      toast.success('Portal Credentials Reset Successfully!', { id: loadingToast });

      setCredsModal({
        isOpen: true,
        data: {
          full_name: cust.name,
          username: username,
          password: newPassword
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset credentials', { id: loadingToast });
    }
  };

  // Unified Financial Items (Invoices & Receivables)
  const financialItems = useMemo(() => {
    const items: Array<{
      id: string | number;
      type: 'invoice' | 'opening';
      invoice_id?: number;
      invoice_no?: string;
      order_ref?: string;
      sale_type?: string;
      customer_id?: number;
      customer_name: string;
      customer_code?: string;
      contact_person?: string;
      contact_phone?: string;
      invoice_date?: string;
      due_date?: string;
      credit_period_days?: number;
      total_amount: number;
      paid_amount: number;
      balance_amount: number;
      due_status: 'Active' | 'Due' | 'Overdue' | 'Paid';
      days_remaining: number;
      days_overdue: number;
      status_message?: string;
    }> = [];

    const orgInvoicedIds = new Set<number>();

    // 1. Process all invoices
    (invoices || []).forEach((inv: any) => {
      const total = parseFloat(inv.total_amount || 0);
      const paid = parseFloat(inv.paid_amount || 0);
      const balance = Math.max(0, total - paid);

      const linkedCust = customers.find(c =>
        (inv.organization_id && c.id === inv.organization_id) ||
        (c.name && c.name.toLowerCase().trim() === (inv.customer_name || '').toLowerCase().trim())
      );

      if (linkedCust) {
        orgInvoicedIds.add(linkedCust.id);
      }

      const customerName = linkedCust?.name || inv.customer_name || 'Customer';
      const customerCode = linkedCust?.customer_code || (linkedCust ? `#${linkedCust.id}` : undefined);
      const contactPerson = linkedCust?.contact_person || undefined;
      const contactPhone = linkedCust?.contact_number || linkedCust?.phone || undefined;
      const creditPeriod = inv.credit_period_days || linkedCust?.credit_period_days || 30;
      const invDateStr = inv.invoice_date || inv.created_at || '';

      // Safe date parser to avoid UTC/local day-shifting
      const parseLocal = (dStr?: string) => {
        if (!dStr) return null;
        const p = dStr.split('T')[0].split('-');
        if (p.length === 3) return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
        const d = new Date(dStr);
        return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      let dueMidnight = parseLocal(inv.due_date);
      if (!dueMidnight) {
        const invMidnight = parseLocal(invDateStr) || todayMidnight;
        dueMidnight = new Date(invMidnight.getTime() + creditPeriod * 24 * 60 * 60 * 1000);
      }

      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.round((todayMidnight.getTime() - dueMidnight.getTime()) / msPerDay);
      const dueDateStr = inv.due_date || (dueMidnight ? dueMidnight.toISOString() : '');

      let dueStatus: 'Active' | 'Due' | 'Overdue' | 'Paid' = (inv.due_status as any) || 'Active';
      let daysRemaining = inv.days_remaining !== undefined ? inv.days_remaining : 0;
      let daysOverdue = inv.days_overdue !== undefined ? inv.days_overdue : 0;
      let statusMessage = inv.status_message || '';

      if (inv.payment_status === 'Paid' || inv.payment_status === 'Fully Paid' || balance <= 0) {
        dueStatus = 'Paid';
        daysRemaining = 0;
        daysOverdue = 0;
        statusMessage = 'Paid';
      } else if (inv.due_status) {
        dueStatus = inv.due_status as any;
      } else if (diffDays === 0) {
        dueStatus = 'Due';
        statusMessage = 'Due Today';
        daysRemaining = 0;
        daysOverdue = 0;
      } else if (diffDays > 0) {
        dueStatus = 'Overdue';
        statusMessage = `Overdue by ${diffDays} day${diffDays === 1 ? '' : 's'}`;
        daysOverdue = diffDays;
        daysRemaining = 0;
      } else {
        dueStatus = 'Active';
        daysRemaining = Math.abs(diffDays);
        statusMessage = `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
        daysOverdue = 0;
      }

      if (balance > 0) {
        items.push({
          id: `inv-${inv.id}`,
          type: 'invoice',
          invoice_id: inv.id,
          invoice_no: inv.invoice_no,
          order_ref: inv.order_id ? `Order #${inv.order_id}` : (inv.sale_type === 'retail' ? 'Retail Sale' : 'Direct'),
          sale_type: inv.sale_type,
          customer_id: linkedCust?.id || inv.organization_id,
          customer_name: customerName,
          customer_code: customerCode,
          contact_person: contactPerson,
          contact_phone: contactPhone,
          invoice_date: invDateStr,
          due_date: dueDateStr,
          credit_period_days: creditPeriod,
          total_amount: total,
          paid_amount: paid,
          balance_amount: balance,
          due_status: dueStatus,
          days_remaining: daysRemaining,
          days_overdue: daysOverdue,
          status_message: statusMessage
        });
      }
    });

    return items;
  }, [customers, invoices]);

  // Specific filtered lists
  const receivablesItems = financialItems;
  const upcomingItems = useMemo(
    () => financialItems.filter(i => i.due_status === 'Active' && i.days_remaining <= 7 && i.days_remaining > 0),
    [financialItems]
  );
  const dueItems = useMemo(() => financialItems.filter(i => i.due_status === 'Due'), [financialItems]);
  const overdueItems = useMemo(() => financialItems.filter(i => i.due_status === 'Overdue'), [financialItems]);

  const totalReceivablesAmt = useMemo(() => receivablesItems.reduce((acc, i) => acc + i.balance_amount, 0), [receivablesItems]);
  const upcomingDuesAmt = useMemo(() => upcomingItems.reduce((acc, i) => acc + i.balance_amount, 0), [upcomingItems]);
  const duesAmt = useMemo(() => dueItems.reduce((acc, i) => acc + i.balance_amount, 0), [dueItems]);
  const overduesAmt = useMemo(() => overdueItems.reduce((acc, i) => acc + i.balance_amount, 0), [overdueItems]);

  const modalItems = useMemo(() => {
    let list = receivablesItems;
    if (financialModal.type === 'upcoming') list = upcomingItems;
    else if (financialModal.type === 'due') list = dueItems;
    else if (financialModal.type === 'overdue') list = overdueItems;

    if (!modalSearchQuery.trim()) return list;
    const q = modalSearchQuery.toLowerCase().trim();
    return list.filter(item =>
      (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
      (item.customer_code && item.customer_code.toLowerCase().includes(q)) ||
      (item.invoice_no && item.invoice_no.toLowerCase().includes(q)) ||
      (item.contact_person && item.contact_person.toLowerCase().includes(q)) ||
      (item.contact_phone && item.contact_phone.includes(q))
    );
  }, [financialModal.type, receivablesItems, upcomingItems, dueItems, overdueItems, modalSearchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let special = 0;
    let risk = 0;

    customers.forEach(c => {
      if (c.is_active !== false) active++;
      else inactive++;

      if (c.is_special) special++;
      else if (c.is_risk) risk++;
    });

    return {
      total: customers.length,
      activeCount: active,
      inactiveCount: inactive,
      specialCount: special,
      riskCount: risk
    };
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Branch filter
      if (selectedBranch !== 'ALL' && String(c.branch_id || '') !== selectedBranch) {
        return false;
      }

      // Zone filter
      if (selectedZone !== 'ALL' && String(c.zone_id || '') !== selectedZone) {
        return false;
      }

      // Sector filter
      if (selectedIndustry !== 'ALL' && String(c.industry_id) !== selectedIndustry) {
        return false;
      }

      // Status & Classification filter (USER REQUEST)
      if (statusFilter === 'ACTIVE' && c.is_active === false) return false;
      if (statusFilter === 'INACTIVE' && c.is_active !== false) return false;
      if (statusFilter === 'SPECIAL' && !c.is_special) return false;
      if (statusFilter === 'RISK' && !c.is_risk) return false;

      return true;
    });
  }, [customers, selectedBranch, selectedZone, selectedIndustry, statusFilter]);

  // Exact 6 Standardized Columns:
  // 1. CUST. ID
  // 2. CUSTOMER NAME (enlarged Risk & Favorite icons to 18px)
  // 3. CONTACT PERSON
  // 4. CONTACT PHONE
  // 5. RECEIVABLES
  // 6. CREDITS
  const columns: Column<Customer>[] = [
    {
      header: 'CUST. ID',
      className: 'w-[100px] whitespace-nowrap',
      sortValue: (c) => c.customer_code || `#${c.id}`,
      accessor: (c) => (
        <span className="font-mono text-xs font-bold text-[#2d8d9b] bg-[#2d8d9b]/10 px-2 py-0.5 rounded-md">
          {c.customer_code || `#${c.id}`}
        </span>
      )
    },
    {
      header: 'CUSTOMER NAME',
      className: 'min-w-[170px] max-w-[280px]',
      sortValue: (c) => c.name,
      accessor: (c) => {
        const isRisk = Boolean(c.is_risk);
        const isSpecial = Boolean(c.is_special);
        const isActive = c.is_active !== false;

        return (
          <div className="group min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isActive
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    : 'bg-rose-400'
                }`}
                title={isActive ? 'Active Customer' : 'Inactive Customer'}
              />
              <button
                type="button"
                onClick={() => handleViewDetails(c, false)}
                className="text-left font-black text-xs md:text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline transition-all cursor-pointer border-none bg-transparent p-0 outline-none truncate block"
                title={c.name}
              >
                {c.name}
              </button>
              {isRisk && (
                <span title="Risk Client" className="shrink-0 text-rose-500 transition-transform hover:scale-110">
                  <AlertTriangle size={18} className="stroke-[2.5]" />
                </span>
              )}
              {isSpecial && (
                <span title="Favourite Client" className="shrink-0 text-amber-500 transition-transform hover:scale-110">
                  <Star size={18} className="fill-amber-400 text-amber-400" />
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(c, true);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-all cursor-pointer shrink-0"
                title="Open customer in new tab"
              >
                <ExternalLink size={13.5} />
              </button>
            </div>
            {c.industries?.name && (
              <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-wider truncate mt-0.5 ml-4">
                {c.industries.name}
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: 'CONTACT PERSON',
      className: 'min-w-[130px] max-w-[200px] whitespace-nowrap',
      sortValue: (c) => c.contact_person || '',
      accessor: (c) => (
        c.contact_person ? (
          <div className="flex flex-col min-w-0 max-w-[190px]">
            <span className="text-xs font-bold text-[#3a525d] truncate block" title={`${c.contact_title ? c.contact_title + ' ' : ''}${c.contact_person}`}>
              {c.contact_title ? `${c.contact_title} ` : ''}{c.contact_person}
            </span>
            {c.contact_designation && (
              <span className="text-[9px] text-zinc-400 font-medium truncate block" title={c.contact_designation}>
                {c.contact_designation}
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'CONTACT PHONE',
      className: 'w-[130px] whitespace-nowrap',
      sortValue: (c) => c.contact_number || c.phone || '',
      accessor: (c) => {
        const num = c.contact_number || c.phone;
        return num ? (
          <a
            href={`tel:${num}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#3a525d] hover:text-[#2d8d9b] transition-colors"
            title={`Call ${num}`}
          >
            <Phone size={12} className="text-[#2d8d9b] shrink-0" />
            <span>{num}</span>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        );
      }
    },
    {
      header: 'RECEIVABLES',
      className: 'w-[120px] whitespace-nowrap text-right',
      sortValue: (c) => Number(c.receivables ?? 0),
      accessor: (c) => {
        const amt = Number(c.receivables ?? 0);
        const hasDue = amt > 0;
        return (
          <div className="flex flex-col items-end" title={String(amt)}>
            <span className={`text-xs font-black font-mono ${hasDue ? 'text-rose-600' : 'text-zinc-600'}`}>
              ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[8px] font-bold uppercase tracking-wider ${hasDue ? 'text-rose-500' : 'text-zinc-400'}`}>
              {hasDue ? 'Due' : 'Zero Due'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'CREDITS',
      className: 'w-[120px] whitespace-nowrap text-right',
      sortValue: (c) => {
        let amt = Number(c.credits ?? 0);
        if (amt === 0 && invoices && invoices.length > 0) {
          const custInvs = invoices.filter(inv =>
            (inv.organization_id && inv.organization_id === c.id) ||
            (c.name && inv.customer_name && inv.customer_name.toLowerCase().trim() === c.name.toLowerCase().trim())
          );
          if (custInvs.length > 0) {
            const invTotal = custInvs.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
            const invPaid = custInvs.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);
            amt = Math.max(0, invPaid - invTotal);
          }
        }
        return amt;
      },
      accessor: (c) => {
        let amt = Number(c.credits ?? 0);
        if (amt === 0 && invoices && invoices.length > 0) {
          const custInvs = invoices.filter(inv =>
            (inv.organization_id && inv.organization_id === c.id) ||
            (c.name && inv.customer_name && inv.customer_name.toLowerCase().trim() === c.name.toLowerCase().trim())
          );
          if (custInvs.length > 0) {
            const invTotal = custInvs.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
            const invPaid = custInvs.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);
            amt = Math.max(0, invPaid - invTotal);
          }
        }
        const hasCredit = amt > 0;
        return (
          <div className="flex flex-col items-end" title={`Credit (Amount Paid - Invoice): ₹${amt.toFixed(2)}`}>
            <span className={`text-xs font-black font-mono ${hasCredit ? 'text-emerald-600' : 'text-zinc-600'}`}>
              ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[8px] font-bold uppercase tracking-wider ${hasCredit ? 'text-emerald-600' : 'text-zinc-400'}`}>
              {hasCredit ? 'Credit' : 'Zero Credit'}
            </span>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Customers</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Institutional Directory &amp; Account Classifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isClientUser && (
            <Button
              onClick={() => {
                setEditingCustomer(null);
                setIsAdding(true);
              }}
              className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={3} />
              New Customer
            </Button>
          )}
          <PageActionsMenu
            onPrint={() => {
              if (printTriggerRef.current) {
                printTriggerRef.current();
              } else {
                handlePrintCustomers(filteredCustomers);
              }
            }}
            printLabel="Print Customers"
            onUserReport={() => userReportTriggerRef.current?.()}
            userReportLabel="My Updated Report"
          />
        </div>
      </div>

      {/* Main Table with Header Actions */}
      <DataTable
        columns={columns}
        data={filteredCustomers}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onPrint={handlePrintCustomers}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        headerAction={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
            
            {/* 2. Customers Dropdown Filter: All, Active, Inactive, Special, Risk */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="ALL">All Customers ({customers.length})</option>
              <option value="ACTIVE">Active Customers ({stats.activeCount})</option>
              <option value="INACTIVE">Inactive Customers ({stats.inactiveCount})</option>
              <option value="SPECIAL">★ Favourite Customers ({stats.specialCount})</option>
              <option value="RISK">⚠ Risk Customers ({stats.riskCount})</option>
            </select>

            {/* 3. Zone Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="ALL">All Zones ({customers.length})</option>
              {availableFilterZones.map(z => {
                const count = customers.filter(c => String(c.zone_id) === String(z.id)).length;
                return (
                  <option key={z.id} value={String(z.id)}>
                    {z.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 4. Sector / Industry Filter */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="ALL">All Sectors ({customers.length})</option>
              {industries.map(ind => {
                const count = customers.filter(c => String(c.industry_id) === String(ind.id)).length;
                return (
                  <option key={ind.id} value={String(ind.id)}>
                    {ind.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        }
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Customer Account?"
        message="Are you sure you want to remove this customer? This will purge linked departments, students, and order linkages."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        variant="danger"
      />

      {/* Generated Credentials Modal */}
      <CredentialsModal
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

      {/* Add / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isAdding || Boolean(editingCustomer)}
        onClose={() => {
          setIsAdding(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleAddOrUpdate}
        editingCustomer={editingCustomer}
        industries={industries}
        branches={branches}
        zones={zones}
      />

      {/* Financial Breakdown Modal */}
      {financialModal.isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setFinancialModal({ isOpen: false, type: null })}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b flex flex-wrap items-center justify-between gap-4 ${
              financialModal.type === 'upcoming' 
                ? 'bg-blue-50/60 border-blue-100' 
                : financialModal.type === 'due'
                ? 'bg-amber-50/70 border-amber-200'
                : financialModal.type === 'overdue'
                ? 'bg-rose-50/70 border-rose-200'
                : 'bg-zinc-900 text-white border-zinc-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  financialModal.type === 'upcoming'
                    ? 'bg-blue-600 text-white'
                    : financialModal.type === 'due'
                    ? 'bg-amber-600 text-white'
                    : financialModal.type === 'overdue'
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#C82A2B] text-white'
                }`}>
                  {financialModal.type === 'upcoming' ? (
                    <Clock size={24} />
                  ) : financialModal.type === 'due' ? (
                    <AlertCircle size={24} />
                  ) : financialModal.type === 'overdue' ? (
                    <AlertTriangle size={24} />
                  ) : (
                    <ReceiptText size={24} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-[#3a525d]">
                      {financialModal.type === 'upcoming' && 'Upcoming Dues (Next 7 Days)'}
                      {financialModal.type === 'due' && 'Dues (Due Today)'}
                      {financialModal.type === 'overdue' && 'Overdue Receivables'}
                      {financialModal.type === 'receivables' && 'Total Receivables Breakdown'}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      financialModal.type === 'upcoming'
                        ? 'bg-blue-100 text-blue-800'
                        : financialModal.type === 'due'
                        ? 'bg-amber-100 text-amber-900'
                        : financialModal.type === 'overdue'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20'
                    }`}>
                      {modalItems.length} {modalItems.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {financialModal.type === 'upcoming' && 'Invoices due within the next 7 days.'}
                    {financialModal.type === 'due' && 'Invoices reaching the exact final day of credit period today.'}
                    {financialModal.type === 'overdue' && 'Invoices or balances that have exceeded the credit period.'}
                    {financialModal.type === 'receivables' && 'Comprehensive overview of all outstanding customer balances and invoices.'}
                  </p>
                </div>
              </div>

              {/* Close Button & Total Amount Badge */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Outstanding</p>
                  <p className="text-lg font-black font-mono text-[#3a525d]">
                    ₹{modalItems.reduce((acc, i) => acc + i.balance_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFinancialModal({ isOpen: false, type: null })}
                  className="w-9 h-9 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors shadow-2xs"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Sub-navigation Tabs & Real-time Search */}
            <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
              {/* Category Quick Switcher Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFinancialModal({ isOpen: true, type: 'receivables' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    financialModal.type === 'receivables'
                      ? 'bg-white text-[#9E1B1D] shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  All Receivables ({receivablesItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialModal({ isOpen: true, type: 'upcoming' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    financialModal.type === 'upcoming'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-blue-600'
                  }`}
                >
                  Upcoming (7 Days) ({upcomingItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialModal({ isOpen: true, type: 'due' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    financialModal.type === 'due'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-amber-600'
                  }`}
                >
                  Due Today ({dueItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialModal({ isOpen: true, type: 'overdue' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    financialModal.type === 'overdue'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-rose-600'
                  }`}
                >
                  Overdue ({overdueItems.length})
                </button>
              </div>

              {/* Real-time search filter */}
              <div className="relative min-w-[260px] flex-1 sm:flex-initial">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Filter customer, code, contact, phone, inv #..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-[#3a525d] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/30"
                />
                {modalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setModalSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* List / Table Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {modalItems.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-3">
                    <ReceiptText size={28} />
                  </div>
                  <h3 className="text-sm font-black text-[#3a525d]">No records found</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    {modalSearchQuery
                      ? 'No items match your search filter in this category.'
                      : 'There are currently no items under this financial classification.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-zinc-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Contact Details</th>
                        <th className="py-3 px-4">Reference / Type</th>
                        <th className="py-3 px-4">Credit Terms & Due Date</th>
                        <th className="py-3 px-4">Status & Aging</th>
                        <th className="py-3 px-4 text-right">Outstanding Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs">
                      {modalItems.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-black text-[#3a525d] hover:text-[#2d8d9b] cursor-pointer"
                                onClick={() => {
                                  if (item.customer_id) {
                                    setFinancialModal({ isOpen: false, type: null });
                                    router.push(`/customers/${item.customer_id}`);
                                  }
                                }}
                              >
                                {item.customer_name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-zinc-400">
                                {item.customer_code || `#${item.customer_id}`}
                              </span>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-700">
                                {item.contact_person || 'N/A'}
                              </span>
                              {item.contact_phone ? (
                                <a 
                                  href={`tel:${item.contact_phone}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline mt-0.5"
                                >
                                  <Phone size={10} />
                                  <span>{item.contact_phone}</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-zinc-400">No phone</span>
                              )}
                            </div>
                          </td>

                          {/* Reference / Type */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-black font-mono text-[#3a525d]">
                                {item.invoice_no || 'Opening Balance'}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                {item.order_ref || (item.type === 'opening' ? 'Ledger Balance' : 'Direct Invoice')}
                              </span>
                            </div>
                          </td>

                          {/* Credit Terms & Due Date */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-black text-zinc-700">
                                {item.due_date ? formatDate(item.due_date) : 'N/A'}
                              </span>
                              <span className="text-[10px] font-semibold text-zinc-400">
                                {item.credit_period_days ? `${item.credit_period_days} Days Credit` : 'Standard terms'}
                              </span>
                            </div>
                          </td>

                          {/* Status & Aging */}
                          <td className="py-3.5 px-4">
                            {item.due_status === 'Active' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock size={11} /> {item.days_remaining}d Left
                              </span>
                            )}
                            {item.due_status === 'Due' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                                <AlertCircle size={11} /> Due Today
                              </span>
                            )}
                            {item.due_status === 'Overdue' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-300">
                                <AlertTriangle size={11} /> Overdue by {item.days_overdue}d
                              </span>
                            )}
                          </td>

                          {/* Outstanding Amount */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-black font-mono text-sm text-rose-600">
                                ₹{item.balance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {item.total_amount > item.balance_amount && (
                                <span className="text-[10px] font-medium text-zinc-400">
                                  of ₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zinc-500 font-medium">
                Showing <strong className="text-zinc-800">{modalItems.length}</strong> items • Total Pending: <strong className="text-rose-600 font-mono">₹{modalItems.reduce((acc, i) => acc + i.balance_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFinancialModal({ isOpen: false, type: null })}
                >
                  Close
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Customer Directory Print Preview Modal */}
      {printModal?.isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPrintModal(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4 bg-zinc-50/70">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
                  <Printer size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-[#3a525d]">
                      Customer Directory Print Preview
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                      {printModal.data.length} {printModal.data.length === 1 ? 'Record' : 'Records'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                      Sort: {printModal.sortInfo.headerLabel && printModal.sortInfo.headerLabel !== 'Default' 
                        ? `${printModal.sortInfo.headerLabel} (${printModal.sortInfo.direction === 'asc' ? 'A→Z' : 'Z→A'})` 
                        : 'Default Order'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Print-ready formatted document honoring current column sorting, search terms, and active category filters.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => executePrint(compiledPrintHTML)}
                  className="h-10 px-5 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-[#C82A2B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Printer size={15} />
                  Print / Save as PDF
                </Button>
                <button
                  type="button"
                  onClick={() => setPrintModal(null)}
                  className="w-9 h-9 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors shadow-2xs"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded Live Preview */}
            <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-zinc-100/50 flex flex-col">
              <iframe
                id="customer-preview-frame"
                srcDoc={compiledPrintHTML}
                title="Customer Directory Print Preview"
                className="w-full flex-1 min-h-[450px] sm:min-h-[550px] bg-white rounded-2xl border border-zinc-200 shadow-sm"
              />
            </div>

            {/* Footer */}
            <div className="p-4 px-6 bg-zinc-50 border-t border-zinc-200 flex flex-wrap justify-between items-center gap-3 text-xs text-zinc-500 font-medium">
              <span>Ready for printing or PDF export • Portrait A4 / Letter format</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPrintModal(null)}
                >
                  Close Preview
                </Button>
                <Button
                  onClick={() => executePrint(compiledPrintHTML)}
                  className="bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-sm shadow-[#C82A2B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Print / Save as PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
