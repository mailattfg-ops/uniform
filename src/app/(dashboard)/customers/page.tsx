'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { 
  Plus, 
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Star,
  AlertTriangle,
  Phone,
  Edit2,
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
  contact_person?: string | null;
  phone?: string | null;
  contact_number?: string | null;
  email?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  pin_code?: string | null;
  country?: string | null;
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
  printedAt,
  invoices = []
}: {
  customers: Customer[];
  sortInfo: SortInfo<Customer>;
  statusFilter: string;
  selectedIndustryName: string;
  printedAt: string;
  invoices?: any[];
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
    selectedIndustryName !== 'ALL' ? `Sector: ${selectedIndustryName}` : 'All Sectors'
  ].join(' • ');

  const rowsHtml = customers.map((c, idx) => {
    const custId = c.customer_code || `#${c.id}`;
    const name = c.name || 'Unnamed Customer';
    const sector = c.industries?.name || '—';
    const contactPerson = c.contact_person || '—';
    const phone = c.phone || c.contact_phone || c.contact_number || '—';
    const isActive = c.is_active !== false;
    const clientType = c.is_special ? '★ Favourite' : c.is_risk ? '⚠ Risk' : 'Standard';
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
        <td style="font-family: monospace; font-weight: bold; color: #2d8d9b; white-space: nowrap;">${custId}</td>
        <td>
          <div style="font-weight: 800; color: #1a202c; font-size: 11px;">${name}</div>
        </td>
        <td style="font-size: 10px; color: #4a5568;">${sector}</td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 600;">${contactPerson}</div>
          <div style="color: #718096; font-size: 9px; font-family: monospace;">${phone}</div>
        </td>
        <td style="text-align: center;">
          <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
            ${isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td style="text-align: center;">
          <span class="badge ${c.is_special ? 'badge-special' : c.is_risk ? 'badge-risk' : 'badge-standard'}">
            ${clientType}
          </span>
        </td>
        <td style="font-size: 10px; color: #4a5568;">${salesPerson}</td>
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
      margin: 10mm;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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
      gap: 12px;
      margin-bottom: 14px;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
    }

    .kpi-col {
      flex: 1;
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
        <th style="width: 30px;">#</th>
        <th style="width: 85px;">Cust ID</th>
        <th>Customer / Institution Name</th>
        <th>Sector</th>
        <th>Contact Person & Phone</th>
        <th style="width: 65px; text-align: center;">Status</th>
        <th style="width: 80px; text-align: center;">Type</th>
        <th>Sales Person</th>
        <th style="text-align: right; width: 100px;">Receivables</th>
        <th style="text-align: right; width: 90px;">Credits</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #718096;">No customer records matching the active filters.</td></tr>'}
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

  // Print Report Modal State
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    data: Customer[];
    sortInfo: SortInfo<Customer>;
  } | null>(null);

  const handlePrintCustomers = (sortedData: Customer[], sortInfo: SortInfo<Customer>) => {
    setPrintModal({
      isOpen: true,
      data: sortedData,
      sortInfo: sortInfo,
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
    const now = new Date();
    const printedAt = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    return compileCustomerDirectoryHTML({
      customers: printModal.data,
      sortInfo: printModal.sortInfo,
      statusFilter,
      selectedIndustryName: selectedInd ? selectedInd.name : (selectedIndustry === 'ALL' ? 'All Sectors' : selectedIndustry),
      printedAt,
      invoices,
    });
  }, [printModal, industries, selectedIndustry, statusFilter, invoices]);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, indRes, empRes, invRes] = await Promise.all([
        api.get('/customers').catch(() => api.get('/organizations')).catch(() => ({ data: [] })),
        api.get('/industries').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/invoices').catch(() => ({ data: [] }))
      ]);
      setCustomers(custRes.data || []);
      setIndustries(indRes.data || []);
      setEmployees(empRes.data || []);
      setInvoices(invRes.data || []);
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
      contact_person: formData.contact_person?.trim() || null,
      phone: formData.phone.trim(),
      contact_number: formData.phone.trim(),
      contact_phone: formData.phone.trim(),
      email: formData.email?.trim() || null,
      contact_email: formData.email?.trim() || null,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      pincode: formData.pincode?.trim() || null,
      country: formData.country?.trim() || 'India',
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
      const contactPhone = linkedCust?.phone || linkedCust?.contact_number || linkedCust?.contact_phone || undefined;
      const creditPeriod = inv.credit_period_days || linkedCust?.credit_period_days || 30;

      const invDateStr = inv.invoice_date || inv.created_at;
      const invDate = invDateStr ? new Date(invDateStr) : new Date();
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(invDate.getTime() + creditPeriod * 24 * 60 * 60 * 1000);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueMidnight = new Date(dueDate);
      dueMidnight.setHours(0, 0, 0, 0);

      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.round((today.getTime() - dueMidnight.getTime()) / msPerDay);

      let dueStatus: 'Active' | 'Due' | 'Overdue' | 'Paid' = inv.due_status || 'Active';
      let daysRemaining = inv.days_remaining !== undefined ? inv.days_remaining : 0;
      let daysOverdue = inv.days_overdue !== undefined ? inv.days_overdue : 0;
      let statusMessage = inv.status_message || '';

      if (inv.payment_status === 'Paid' || balance <= 0) {
        dueStatus = 'Paid';
      } else if (diffDays === 0) {
        dueStatus = 'Due';
        statusMessage = 'Due Today (Last day of credit period)';
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
          due_date: dueDate.toISOString(),
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
  }, [customers, selectedIndustry, statusFilter]);

  // Columns definition
  const columns: Column<Customer>[] = [
    {
      header: 'Customer ID',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (c) => c.customer_code || String(c.id),
      accessor: (c) => {
        const idLabel = c.customer_code || `#${c.id}`;
        return (
          <div className="group inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleViewDetails(c, false)}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#fce4d4]/40 text-[#8b6b5a] border border-[#fce4d4] hover:bg-[#fce4d4]/70 hover:text-[#3a525d] transition-all cursor-pointer"
              title="Click to view details"
            >
              {idLabel}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(c, true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-all cursor-pointer shrink-0"
              title="Open customer in new tab"
            >
              <ExternalLink size={12} />
            </button>
          </div>
        );
      }
    },
    {
      header: 'Name',
      className: 'min-w-[220px]',
      sortValue: (c) => c.name,
      accessor: (c) => (
        <div className="flex items-center gap-3 group">
          <div 
            onClick={() => handleViewDetails(c, false)}
            className="w-9 h-9 bg-[#3a525d]/5 hover:bg-[#2d8d9b]/15 rounded-xl flex items-center justify-center text-[#3a525d] hover:text-[#2d8d9b] border border-[#3a525d]/10 transition-all cursor-pointer shrink-0"
            title="Click to view details"
          >
            <Building2 size={18} className="group-hover:scale-105 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleViewDetails(c, false)}
                className="text-left font-black text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline transition-all cursor-pointer border-none bg-transparent p-0 outline-none block"
                title="Click to view details"
              >
                <span>{c.name}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(c, true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-all cursor-pointer shrink-0"
                title="Open customer in new tab"
              >
                <ExternalLink size={12} />
              </button>
            </div>
            {c.industries?.name && (
              <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-wider mt-0.5">
                {c.industries.name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Phone Number',
      className: 'w-[150px] whitespace-nowrap',
      sortValue: (c) => c.phone || '',
      accessor: (c) => (
        c.phone ? (
          <a
            href={`tel:${c.phone}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#3a525d] hover:text-[#2d8d9b] transition-colors"
            title={`Call ${c.phone}`}
          >
            <Phone size={13} className="text-[#2d8d9b] shrink-0" />
            <span>{c.phone}</span>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Status',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (c) => (c.is_active !== false ? 'Active' : 'Inactive'),
      accessor: (c) => {
        const isActive = c.is_active !== false;

        if (isClientUser) {
          return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}>
              {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        }

        return (
          <div className="flex items-center">
            {/* Staff inline toggle for Active / Inactive */}
            <button
              type="button"
              onClick={() => handleToggleStatus(c, !isActive)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-zinc-100 text-zinc-500 border-zinc-300 hover:bg-zinc-200'
              }`}
              title="Click to toggle Active / Inactive"
            >
              {isActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  <span>Inactive</span>
                </>
              )}
            </button>
          </div>
        );
      }
    },
    {
      header: 'Client Type',
      className: 'w-[150px] whitespace-nowrap',
      sortValue: (c) => (c.is_special ? 'Favourite' : c.is_risk ? 'Risk' : 'Standard'),
      accessor: (c) => {
        const isSpecial = !!c.is_special;
        const isRisk = !!c.is_risk;

        if (isClientUser) {
          if (isSpecial) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-300">
                <Star size={11} className="fill-amber-500 text-amber-500" /> Favourite Client
              </span>
            );
          }
          if (isRisk) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-300">
                <AlertTriangle size={11} className="text-red-600" /> Risk Alert
              </span>
            );
          }
          return <span className="text-zinc-400 text-xs font-semibold">Standard</span>;
        }

        // Allowed staff can mark either Favourite or Risk (mutually exclusive)
        const currentType = isSpecial ? 'special' : isRisk ? 'risk' : 'standard';

        return (
          <div className="flex items-center gap-1.5">
            <select
              value={currentType}
              onChange={(e) => handleSetClassification(c, e.target.value as any)}
              className={`h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-all shadow-2xs ${
                isSpecial
                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-black'
                  : isRisk
                  ? 'bg-red-50 text-red-700 border-red-300 font-black'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <option value="standard">Standard</option>
              <option value="special">★ Favourite</option>
              <option value="risk">⚠ Risk Client</option>
            </select>
          </div>
        );
      }
    },
    {
      header: 'Sales Person',
      className: 'w-[180px] whitespace-nowrap',
      sortValue: (c) => c.relationship_manager?.full_name || '',
      accessor: (c) => (
        c.relationship_manager ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <Users size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-[#3a525d]">{c.relationship_manager.full_name}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                Staff ID: {c.relationship_manager.employee_id}
              </p>
            </div>
          </div>
        ) : (
          <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Unassigned
          </span>
        )
      )
    },
    {
      header: 'Receivables',
      className: 'w-[150px] whitespace-nowrap',
      sortValue: (c) => Number(c.receivables ?? 0),
      accessor: (c) => {
        const amt = Number(c.receivables ?? 0);
        const hasDue = amt > 0;
        return (
          <div className="flex flex-col" title={String(amt)}>
            <span className={`text-xs font-black font-mono ${hasDue ? 'text-rose-600' : 'text-zinc-600'}`}>
              ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${hasDue ? 'text-rose-500' : 'text-zinc-400'}`}>
              {hasDue ? 'Amount Due' : 'Zero Due'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Credits',
      className: 'w-[150px] whitespace-nowrap',
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
          <div className="flex flex-col" title={`Credit (Amount Paid - Invoice): ₹${amt.toFixed(2)}`}>
            <span className={`text-xs font-black font-mono ${hasCredit ? 'text-emerald-600' : 'text-zinc-600'}`}>
              ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${hasCredit ? 'text-emerald-600' : 'text-zinc-400'}`}>
              {hasCredit ? 'Credit Balance' : 'Zero Credit'}
            </span>
          </div>
        );
      }
    },
    ...(!isClientUser ? [
      {
        header: 'Actions',
        className: 'w-[90px] text-right whitespace-nowrap',
        accessor: (c: Customer) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(c);
                setIsAdding(false);
              }}
              className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-[#2d8d9b] hover:text-white text-zinc-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              title="Edit Customer Profile"
            >
              <Edit2 size={13} />
            </button>
          </div>
        )
      }
    ] : [])
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Customers</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Institutional Directory &amp; Account Classifications
          </p>
        </div>

        {!isClientUser && (
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setIsAdding(true);
            }}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={20} strokeWidth={3} />
            New
          </Button>
        )}
      </div>

      {/* Metrics Row (Total Customers, Total Receivables, Upcoming Dues, Dues, Overdues) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Total Customers */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#fce4d4] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Total Customers</p>
            <h3 className="text-3xl font-black text-[#3a525d] tracking-tight">{stats.total}</h3>
            {/* <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Directory Accounts</p> */}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#3a525d]/5 flex items-center justify-center text-[#3a525d] shrink-0">
            <Building2 size={22} />
          </div>
        </div>

        {/* 2. Total Receivables (Clickable -> Opens Breakdown Modal) */}
        <div 
          onClick={() => {
            setFinancialModal({ isOpen: true, type: 'receivables' });
            setModalSearchQuery('');
          }}
          className="bg-white p-5 rounded-3xl shadow-xs border border-[#fce4d4] hover:border-[#2d8d9b] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
          title="Click to view total receivables breakdown"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] mb-1 flex items-center gap-1">
              <span>Total Receivables</span>
            </p>
            <h3 className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
              ₹{totalReceivablesAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            {/* <p className="text-[9px] font-bold text-[#2d8d9b] group-hover:underline mt-0.5">
              {receivablesItems.length} Pending Account(s) →
            </p> */}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 group-hover:bg-[#2d8d9b] flex items-center justify-center text-[#2d8d9b] group-hover:text-white transition-colors shrink-0">
            <CreditCard size={22} />
          </div>
        </div>

        {/* 3. Upcoming Dues (Clickable -> Opens Upcoming Dues Modal) */}
        <div 
          onClick={() => {
            setFinancialModal({ isOpen: true, type: 'upcoming' });
            setModalSearchQuery('');
          }}
          className="bg-white p-5 rounded-3xl shadow-xs border border-[#fce4d4] hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group bg-blue-50/10"
          title="Click to view upcoming dues list (due in next 7 days)"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">Upcoming Dues (Next 7 Days)</p>
            <h3 className="text-2xl font-black text-blue-700 tracking-tight font-mono">
              ₹{upcomingDuesAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            {/* <p className="text-[9px] font-bold text-blue-600 group-hover:underline mt-0.5">
              {upcomingItems.length} Due in Next 7 Days →
            </p> */}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-600 flex items-center justify-center text-blue-600 group-hover:text-white transition-colors shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* 4. Dues (Clickable -> Opens Due Today Modal) */}
        <div 
          onClick={() => {
            setFinancialModal({ isOpen: true, type: 'due' });
            setModalSearchQuery('');
          }}
          className="bg-white p-5 rounded-3xl shadow-xs border border-[#fce4d4] hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group bg-amber-50/20"
          title="Click to view invoices due today (final credit day)"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1">Dues</p>
            <h3 className="text-2xl font-black text-amber-700 tracking-tight font-mono">
              ₹{duesAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            {/* <p className="text-[9px] font-bold text-amber-700 group-hover:underline mt-0.5">
              {dueItems.length} Due Today (Last Day) →
            </p> */}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 group-hover:bg-amber-600 flex items-center justify-center text-amber-700 group-hover:text-white transition-colors shrink-0">
            <AlertCircle size={22} />
          </div>
        </div>

        {/* 5. Overdues (Clickable -> Opens Overdue Modal) */}
        <div 
          onClick={() => {
            setFinancialModal({ isOpen: true, type: 'overdue' });
            setModalSearchQuery('');
          }}
          className="bg-white p-5 rounded-3xl shadow-xs border border-[#fce4d4] hover:border-rose-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group bg-rose-50/20"
          title="Click to view overdue invoices past credit period"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-1">Overdues</p>
            <h3 className="text-2xl font-black text-rose-600 tracking-tight font-mono">
              ₹{overduesAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            {/* <p className="text-[9px] font-bold text-rose-600 group-hover:underline mt-0.5">
              {overdueItems.length} Past Credit Window →
            </p> */}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 group-hover:bg-rose-600 flex items-center justify-center text-rose-600 group-hover:text-white transition-colors shrink-0">
            <AlertTriangle size={22} />
          </div>
        </div>

      </div>

      {/* Main Table with Header Actions */}
      <DataTable
        title="Customer Directory"
        subtitle="Manage client accounts, active status, favourite/risk classifications, and financial ledgers"
        columns={columns}
        data={filteredCustomers}
        isLoading={isLoading}
        searchPlaceholder="Search customers by code, name, location, sector, manager..."
        onPrint={handlePrintCustomers}
        headerAction={
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            
            {/* USER REQUEST: Dropdown Filter for All, Active, Inactive, Favourite, Risk */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-black uppercase tracking-wider text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Customers ({customers.length})</option>
                <option value="ACTIVE">Active Customers ({stats.activeCount})</option>
                <option value="INACTIVE">Inactive Customers ({stats.inactiveCount})</option>
                <option value="SPECIAL">★ Favourite Customers ({stats.specialCount})</option>
                <option value="RISK">⚠ Risk Customers ({stats.riskCount})</option>
              </select>
            </div>

            {/* Sector / Industry Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="h-10 px-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
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
      />

      {/* Financial Breakdown Modal */}
      {financialModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
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
                : 'bg-teal-50/60 border-teal-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  financialModal.type === 'upcoming'
                    ? 'bg-blue-600 text-white'
                    : financialModal.type === 'due'
                    ? 'bg-amber-600 text-white'
                    : financialModal.type === 'overdue'
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#2d8d9b] text-white'
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
                        : 'bg-teal-100 text-teal-800'
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
                      ? 'bg-white text-[#2d8d9b] shadow-2xs'
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPrintModal(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4 bg-zinc-50/70">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center shrink-0">
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
                  className="h-10 px-5 rounded-xl bg-[#2d8d9b] hover:bg-[#236e7a] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm"
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
                className="w-full flex-1 min-h-[550px] bg-white rounded-2xl border border-zinc-200 shadow-sm"
              />
            </div>

            {/* Footer */}
            <div className="p-4 px-6 bg-zinc-50 border-t border-zinc-200 flex flex-wrap justify-between items-center gap-3 text-xs text-zinc-500 font-medium">
              <span>Ready for printing or PDF export • Landscape A4 / Letter format</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPrintModal(null)}
                >
                  Close Preview
                </Button>
                <Button
                  onClick={() => executePrint(compiledPrintHTML)}
                  className="bg-[#2d8d9b] hover:bg-[#236e7a] text-white"
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
