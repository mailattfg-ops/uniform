'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  Printer, 
  Download, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileText, 
  MessageSquare, 
  PlusCircle, 
  RefreshCw, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { Button } from './Button';
import { toast } from 'react-hot-toast';

export interface ActivityEntry<T = any> {
  id: string;
  item: T;
  itemTitle: string;
  itemSubtitle?: string;
  activityType: 'ADDED' | 'UPDATED' | 'FOLLOWUP' | 'PAYMENT' | 'JOURNAL';
  activityLabel: string;
  timestamp: string;
  timestampDate: Date;
  performerName: string;
  performerId?: string | number | null;
  notes?: string;
  stageOrStatus?: string;
  nextFollowUpDate?: string;
  metadata?: any;
}

export interface UserActivityReportModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  data: T[];
  title?: string;
  onApplyFilter?: (filteredData: T[], filterSummary: string) => void;
  onClearFilter?: () => void;
  isFilterApplied?: boolean;
}

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';

function formatISTDateTime(dateOrStr: string | Date | null | undefined): string {
  if (!dateOrStr) return '—';
  try {
    const d = new Date(dateOrStr);
    if (isNaN(d.getTime())) return String(dateOrStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateOrStr);
  }
}

function formatISTDateOnly(dateOrStr: string | Date | null | undefined): string {
  if (!dateOrStr) return '—';
  try {
    const d = new Date(dateOrStr);
    if (isNaN(d.getTime())) return String(dateOrStr);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(dateOrStr);
  }
}

function getItemTitle(item: any): string {
  if (!item || typeof item !== 'object') return 'Item';
  return (
    item.name ||
    item.lead_code ||
    item.title ||
    item.company_name ||
    item.organization_name ||
    item.customer_name ||
    item.quotation_no ||
    item.invoice_no ||
    item.product_name ||
    item.item_name ||
    item.code ||
    (item.id ? `#${item.id}` : 'Record')
  );
}

function getItemSubtitle(item: any): string {
  if (!item || typeof item !== 'object') return '';
  const parts: string[] = [];
  if (item.lead_code && item.name) parts.push(item.lead_code);
  if (item.contact_person) parts.push(`Contact: ${item.contact_person}`);
  if (item.phone) parts.push(item.phone);
  if (item.status) parts.push(`Status: ${item.status}`);
  if (item.branch_name || item.branch) parts.push(item.branch_name || item.branch);
  return parts.slice(0, 3).join(' • ');
}

export function UserActivityReportModal<T = any>({
  isOpen,
  onClose,
  data,
  title = 'Table Records',
  onApplyFilter,
  onClearFilter,
  isFilterApplied = false
}: UserActivityReportModalProps<T>) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Activity Category Toggles
  const [includeAdded, setIncludeAdded] = useState(true);
  const [includeUpdated, setIncludeUpdated] = useState(true);
  const [includeFollowups, setIncludeFollowups] = useState(true);

  // Load current logged in user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse current user for activity report modal:', e);
    }
  }, []);

  // Compute preset date bounds
  const setPresetDates = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    const formatDateVal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'today') {
      const todayStr = formatDateVal(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDateVal(yest);
      setFromDate(yestStr);
      setToDate(yestStr);
    } else if (preset === 'last7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setFromDate(formatDateVal(past));
      setToDate(formatDateVal(now));
    } else if (preset === 'last30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      setFromDate(formatDateVal(past));
      setToDate(formatDateVal(now));
    } else if (preset === 'thisMonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatDateVal(monthStart));
      setToDate(formatDateVal(now));
    }
  }, []);

  // Initialize dates to Today on open
  useEffect(() => {
    if (isOpen) {
      setPresetDates('today');
    }
  }, [isOpen, setPresetDates]);

  // Determine user match helper
  const matchesUser = useCallback((performerId: any, performerName: any, performerEmpId: any): boolean => {
    if (!currentUser) return true; // If no logged-in user context, include all in date range
    
    const curId = String(currentUser.id || '');
    const curEmpId = String(currentUser.employee_id || currentUser.employeeId || '').toLowerCase();
    const curName = String(currentUser.fullName || currentUser.full_name || currentUser.name || currentUser.username || '').toLowerCase();
    const curEmail = String(currentUser.email || '').toLowerCase();

    // Check ID
    if (performerId !== null && performerId !== undefined) {
      const pIdStr = String(performerId);
      if (curId && pIdStr === curId) return true;
    }

    // Check Employee ID
    if (performerEmpId && curEmpId) {
      const pEmpStr = String(performerEmpId).toLowerCase();
      if (pEmpStr === curEmpId) return true;
    }

    // Check Name or Email in performer string
    if (performerName) {
      const pNameStr = String(performerName).toLowerCase();
      if (curName && (pNameStr.includes(curName) || curName.includes(pNameStr))) return true;
      if (curEmail && pNameStr.includes(curEmail)) return true;
    }

    // If user is Admin/SuperAdmin, also allow viewing all team activities
    const roleLower = String(currentUser.role || '').toLowerCase();
    if (roleLower === 'admin' || roleLower === 'superadmin' || roleLower === 'corporate') {
      return true;
    }

    return false;
  }, [currentUser]);

  // Scan items and extract matching activities within date range
  const { activities, matchedItemsMap, counts } = useMemo(() => {
    if (!fromDate || !toDate || !Array.isArray(data)) {
      return { activities: [], matchedItemsMap: new Map<any, T>(), counts: { added: 0, updated: 0, followups: 0, total: 0 } };
    }

    const start = new Date(`${fromDate}T00:00:00.000`);
    const end = new Date(`${toDate}T23:59:59.999`);

    const resultActivities: ActivityEntry<T>[] = [];
    const matchedMap = new Map<any, T>();
    let countAdded = 0;
    let countUpdated = 0;
    let countFollowups = 0;

    data.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      const itemTitle = getItemTitle(item);
      const itemSubtitle = getItemSubtitle(item);
      const itemKey = item.id || `idx_${idx}`;

      // 1. FOLLOW-UPS & REMARKS
      if (includeFollowups) {
        // A. Lead Remarks array
        const remarksList: any[] = Array.isArray(item.remarks) ? item.remarks : [];
        remarksList.forEach((r, rIdx) => {
          if (!r || typeof r !== 'object') return;
          const rDateStr = r.created_at || r.timestamp || r.date;
          if (!rDateStr) return;
          const rDate = new Date(rDateStr);
          if (isNaN(rDate.getTime())) return;

          if (rDate >= start && rDate <= end) {
            const pId = r.performed_by;
            const pName = r.performed_by_name || r.staff || 'Staff';
            const pEmp = r.performed_by_emp_id;

            if (matchesUser(pId, pName, pEmp)) {
              countFollowups++;
              matchedMap.set(itemKey, item);
              resultActivities.push({
                id: `fu_${itemKey}_${rIdx}_${rDate.getTime()}`,
                item,
                itemTitle,
                itemSubtitle,
                activityType: 'FOLLOWUP',
                activityLabel: r.stage ? `Follow-up (${r.stage})` : 'Follow-up Logged',
                timestamp: rDateStr,
                timestampDate: rDate,
                performerName: pName,
                performerId: pId,
                notes: r.notes || r.remarks || r.text || r.outcome || 'Follow-up note recorded',
                stageOrStatus: r.stage || r.outcome,
                nextFollowUpDate: r.next_followup_date || r.nextDate
              });
            }
          }
        });

        // B. Quotation Metrics Follow-ups
        const quoteFollowups: any[] = Array.isArray(item.metrics_summary?.followups)
          ? item.metrics_summary.followups
          : Array.isArray(item.followups)
            ? item.followups
            : [];
        quoteFollowups.forEach((f, fIdx) => {
          if (!f || typeof f !== 'object') return;
          const fDateStr = f.created_at || f.date || f.timestamp;
          if (!fDateStr) return;
          const fDate = new Date(fDateStr);
          if (isNaN(fDate.getTime())) return;

          if (fDate >= start && fDate <= end) {
            const pId = f.performed_by || f.user_id;
            const pName = f.performed_by_name || f.user || 'Sales Rep';

            if (matchesUser(pId, pName, null)) {
              countFollowups++;
              matchedMap.set(itemKey, item);
              resultActivities.push({
                id: `qfu_${itemKey}_${fIdx}_${fDate.getTime()}`,
                item,
                itemTitle,
                itemSubtitle,
                activityType: 'FOLLOWUP',
                activityLabel: 'Quotation Follow-up',
                timestamp: fDateStr,
                timestampDate: fDate,
                performerName: pName,
                performerId: pId,
                notes: f.notes || f.remarks || f.outcome || 'Quotation communication recorded',
                stageOrStatus: f.outcome || f.response_type,
                nextFollowUpDate: f.next_followup_date || f.nextFollowUpDate
              });
            }
          }
        });

        // C. Payments (Invoice payments)
        const paymentsList: any[] = Array.isArray(item.payments) ? item.payments : [];
        paymentsList.forEach((p, pIdx) => {
          if (!p || typeof p !== 'object') return;
          const pDateStr = p.payment_date || p.created_at || p.date;
          if (!pDateStr) return;
          const pDate = new Date(pDateStr);
          if (isNaN(pDate.getTime())) return;

          if (pDate >= start && pDate <= end) {
            const pId = p.received_by || p.created_by;
            const pName = p.received_by_name || 'Accountant';
            if (matchesUser(pId, pName, null)) {
              countFollowups++;
              matchedMap.set(itemKey, item);
              resultActivities.push({
                id: `pay_${itemKey}_${pIdx}_${pDate.getTime()}`,
                item,
                itemTitle,
                itemSubtitle,
                activityType: 'PAYMENT',
                activityLabel: 'Payment Received',
                timestamp: pDateStr,
                timestampDate: pDate,
                performerName: pName,
                performerId: pId,
                notes: `Amount: ₹${Number(p.amount || 0).toLocaleString('en-IN')} via ${p.payment_mode || 'Cash/Bank'}`
              });
            }
          }
        });
      }

      // 2. ADDED / CREATED
      if (includeAdded) {
        const createdDateStr = item.created_at || item.createdAt || item.date || item.invoice_date || item.created_date;
        if (createdDateStr) {
          const cDate = new Date(createdDateStr);
          if (!isNaN(cDate.getTime()) && cDate >= start && cDate <= end) {
            const creatorId = item.created_by || item.createdBy || item.user_id || item.userId || item.sales_person_id || item.assigned_staff_id;
            
            // Check remarks or author metadata
            const firstRemark = Array.isArray(item.remarks) && item.remarks.length > 0 ? item.remarks[0] : null;
            const remarkAuthor = firstRemark?.author?.name || firstRemark?.performed_by_name || (typeof firstRemark?.author === 'string' ? firstRemark.author : null) || firstRemark?.staff;

            const defaultUserName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || currentUser?.username || 'Staff Member';
            const creatorName = 
              item.created_by_name ||
              item.creator_name ||
              item.author?.name ||
              (typeof item.author === 'string' ? item.author : null) ||
              remarkAuthor ||
              item.employees?.full_name ||
              (creatorId && currentUser?.id && String(creatorId) === String(currentUser.id) ? defaultUserName : null) ||
              (creatorId ? `User #${creatorId}` : defaultUserName);

            if (matchesUser(creatorId, creatorName, null)) {
              countAdded++;
              matchedMap.set(itemKey, item);
              resultActivities.push({
                id: `add_${itemKey}_${cDate.getTime()}`,
                item,
                itemTitle,
                itemSubtitle,
                activityType: 'ADDED',
                activityLabel: 'Record Created / Added',
                timestamp: createdDateStr,
                timestampDate: cDate,
                performerName: creatorName,
                performerId: creatorId,
                notes: `Added into ${title}`,
                stageOrStatus: item.status || 'Active'
              });
            }
          }
        }
      }

      // 3. UPDATED / MODIFIED
      if (includeUpdated) {
        const updatedDateStr = item.updated_at || item.updatedAt || item.modified_at || item.last_updated;
        const createdDateStr = item.created_at || item.createdAt;
        
        if (updatedDateStr) {
          const uDate = new Date(updatedDateStr);
          // Only treat as updated if it falls in range AND differs from created_at by > 2 minutes
          const isDistinctFromCreate = !createdDateStr || Math.abs(uDate.getTime() - new Date(createdDateStr).getTime()) > 120000;
          
          if (!isNaN(uDate.getTime()) && uDate >= start && uDate <= end && isDistinctFromCreate) {
            const updaterId = item.updated_by || item.modified_by || item.user_id;

            // Check latest remark author if available
            const lastRemark = Array.isArray(item.remarks) && item.remarks.length > 0 ? item.remarks[item.remarks.length - 1] : null;
            const remarkUpdater = lastRemark?.author?.name || lastRemark?.performed_by_name || (typeof lastRemark?.author === 'string' ? lastRemark.author : null) || lastRemark?.staff;

            const defaultUserName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || currentUser?.username || 'Staff Member';
            const updaterName = 
              item.updated_by_name ||
              item.modified_by_name ||
              remarkUpdater ||
              item.employees?.full_name ||
              (updaterId && currentUser?.id && String(updaterId) === String(currentUser.id) ? defaultUserName : null) ||
              (updaterId ? `User #${updaterId}` : defaultUserName);

            if (matchesUser(updaterId, updaterName, null)) {
              countUpdated++;
              matchedMap.set(itemKey, item);
              resultActivities.push({
                id: `upd_${itemKey}_${uDate.getTime()}`,
                item,
                itemTitle,
                itemSubtitle,
                activityType: 'UPDATED',
                activityLabel: 'Record Modified / Updated',
                timestamp: updatedDateStr,
                timestampDate: uDate,
                performerName: updaterName,
                performerId: updaterId,
                notes: `Status: ${item.status || 'Updated'}`,
                stageOrStatus: item.status
              });
            }
          }
        }
      }
    });

    // Sort newest activity first
    resultActivities.sort((a, b) => b.timestampDate.getTime() - a.timestampDate.getTime());

    return {
      activities: resultActivities,
      matchedItemsMap: matchedMap,
      counts: {
        added: countAdded,
        updated: countUpdated,
        followups: countFollowups,
        total: matchedMap.size
      }
    };
  }, [fromDate, toDate, data, includeAdded, includeUpdated, includeFollowups, matchesUser, title]);

  // Filter activities by search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase();
    return activities.filter(a => 
      a.itemTitle.toLowerCase().includes(q) ||
      (a.itemSubtitle && a.itemSubtitle.toLowerCase().includes(q)) ||
      a.activityLabel.toLowerCase().includes(q) ||
      (a.notes && a.notes.toLowerCase().includes(q)) ||
      a.performerName.toLowerCase().includes(q)
    );
  }, [activities, searchQuery]);

  // Handle Apply Filter to Table
  const handleApplyToTable = () => {
    if (!onApplyFilter) return;
    const uniqueItems = Array.from(matchedItemsMap.values());
    const filterSummary = `${datePreset.toUpperCase() === 'CUSTOM' ? `${formatISTDateOnly(fromDate)} - ${formatISTDateOnly(toDate)}` : datePreset.toUpperCase()} (${uniqueItems.length} items)`;
    onApplyFilter(uniqueItems, filterSummary);
    toast.success(`Table filtered to ${uniqueItems.length} items updated by ${currentUser?.fullName || 'user'}`);
    onClose();
  };

  // Handle Print Report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print preview. Please allow popups.');
      return;
    }

    const userName = currentUser?.fullName || currentUser?.name || currentUser?.email || 'Logged-in User';
    const userRole = currentUser?.role || 'Staff';
    const userEmail = currentUser?.email || '';
    const nowIST = formatISTDateTime(new Date());
    const rangeLabel = `${formatISTDateOnly(fromDate)} to ${formatISTDateOnly(toDate)} (${datePreset.toUpperCase()})`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Activity Report - ${userName}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          body { padding: 32px; color: #1e293b; background: #fff; font-size: 12px; }
          .header { border-bottom: 2px solid #C82A2B; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title-area h1 { font-size: 20px; font-weight: 900; color: #09090B; text-transform: uppercase; letter-spacing: -0.5px; }
          .title-area h2 { font-size: 13px; font-weight: 700; color: #C82A2B; margin-top: 4px; }
          .meta-area { text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; }
          .meta-area strong { color: #1e293b; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
          .kpi-val { font-size: 20px; font-weight: 900; color: #C82A2B; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
          th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          tr:nth-child(even) td { background: #fafafa; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .badge-added { background: #dcfce7; color: #15803d; }
          .badge-updated { background: #fef3c7; color: #b45309; }
          .badge-followup { background: #e0f2fe; color: #0369a1; }
          .badge-payment { background: #f3e8ff; color: #6b21a8; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
          @media print {
            body { padding: 0; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>FORMA APPARELS</h1>
            <h2>User Activity & Updates Report: ${title}</h2>
            <p style="margin-top: 4px; color: #64748b; font-size: 11px;">
              Target Module: <strong>${title}</strong> • User: <strong>${userName}</strong>
            </p>
          </div>
          <div class="meta-area">
            <div>Date Range: <strong>${rangeLabel}</strong></div>
            <div>Generated: <strong>${nowIST}</strong></div>
            <div>User Email: <strong>${userEmail || '—'}</strong></div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Unique Records Modified</div>
            <div class="kpi-val">${counts.total}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Records Created / Added</div>
            <div class="kpi-val">${counts.added}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Records Updated</div>
            <div class="kpi-val">${counts.updated}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Follow-ups / Notes Logged</div>
            <div class="kpi-val">${counts.followups}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">#</th>
              <th style="width: 190px;">Record / Entity</th>
              <th style="width: 150px;">Activity Type</th>
              <th style="width: 140px;">Date & Time (IST)</th>
              <th>Details / Remarks / Follow-up Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              filteredActivities.length === 0
                ? '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">No activity logged by this user within selected dates.</td></tr>'
                : filteredActivities.map((act, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>
                      <strong>${act.itemTitle}</strong>
                      ${act.itemSubtitle ? `<div style="color: #64748b; font-size: 10px; margin-top: 2px;">${act.itemSubtitle}</div>` : ''}
                    </td>
                    <td>
                      <span class="badge ${
                        act.activityType === 'ADDED' ? 'badge-added' :
                        act.activityType === 'UPDATED' ? 'badge-updated' :
                        act.activityType === 'PAYMENT' ? 'badge-payment' : 'badge-followup'
                      }">
                        ${act.activityLabel}
                      </span>
                      ${act.stageOrStatus ? `<div style="font-size: 9px; color: #64748b; margin-top: 3px;">Status: ${act.stageOrStatus}</div>` : ''}
                    </td>
                    <td>${formatISTDateTime(act.timestamp)}</td>
                    <td>
                      <div style="line-height: 1.4;">${act.notes || '—'}</div>
                      ${act.nextFollowUpDate ? `<div style="color: #0369a1; font-weight: 700; font-size: 10px; margin-top: 3px;">Next Follow-up: ${formatISTDateOnly(act.nextFollowUpDate)}</div>` : ''}
                    </td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>

        <div class="footer">
          <div>Report generated automatically from Forma Apparels ERP Telemetry</div>
          <div>Authorized User Signature: _______________________</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredActivities.length === 0) {
      toast.error('No activities to export');
      return;
    }

    const headers = ['#', 'Record Name', 'Record Subtitle', 'Activity Type', 'Date & Time (IST)', 'Details / Remarks', 'Next Follow-up Date'];
    const rows = filteredActivities.map((act, idx) => [
      idx + 1,
      `"${(act.itemTitle || '').replace(/"/g, '""')}"`,
      `"${(act.itemSubtitle || '').replace(/"/g, '""')}"`,
      `"${(act.activityLabel || '').replace(/"/g, '""')}"`,
      `"${formatISTDateTime(act.timestamp)}"`,
      `"${(act.notes || '').replace(/"/g, '""')}"`,
      `"${act.nextFollowUpDate ? formatISTDateOnly(act.nextFollowUpDate) : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `user_report_${(currentUser?.fullName || 'user').toLowerCase().replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV');
  };

  if (!isOpen) return null;

  const userName = currentUser?.fullName || currentUser?.name || currentUser?.email || 'Logged-in User';
  const userRole = currentUser?.role || 'Staff Member';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-zinc-200/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />

        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-zinc-50 via-white to-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <User size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                  Updated Reports for User
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20">
                  {title}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Showing activity records for <strong className="text-zinc-900 font-bold">{userName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3.5 bg-zinc-50/80 border-b border-zinc-100 space-y-3">
          {/* Row 1: Date Presets & Custom Pickers */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Calendar size={13} className="text-[#C82A2B]" /> Date Filter:
              </span>
              {(['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'custom'] as DatePreset[]).map(preset => {
                const labels: Record<DatePreset, string> = {
                  today: 'Today',
                  yesterday: 'Yesterday',
                  last7days: 'Last 7 Days',
                  last30days: 'Last 30 Days',
                  thisMonth: 'This Month',
                  custom: 'Custom Range'
                };
                const isActive = datePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPresetDates(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#C82A2B] text-white shadow-xs'
                        : 'bg-white text-zinc-600 hover:bg-zinc-200/60 border border-zinc-200/80'
                    }`}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            {/* Custom Range Inputs */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-zinc-400 font-bold text-[10px] uppercase">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => {
                    setFromDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="font-semibold text-zinc-700 outline-none bg-transparent cursor-pointer"
                />
              </div>
              <span className="text-zinc-400 text-xs font-bold">to</span>
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-zinc-400 font-bold text-[10px] uppercase">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => {
                    setToDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="font-semibold text-zinc-700 outline-none bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Category Checkboxes & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-200/60">
            <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">Include:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAdded}
                  onChange={e => setIncludeAdded(e.target.checked)}
                  className="rounded text-[#C82A2B] focus:ring-[#C82A2B] cursor-pointer"
                />
                <span>Added / Created</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeUpdated}
                  onChange={e => setIncludeUpdated(e.target.checked)}
                  className="rounded text-[#C82A2B] focus:ring-[#C82A2B] cursor-pointer"
                />
                <span>Updated / Modified</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFollowups}
                  onChange={e => setIncludeFollowups(e.target.checked)}
                  className="rounded text-[#C82A2B] focus:ring-[#C82A2B] cursor-pointer"
                />
                <span>Follow-ups & Notes Logged</span>
              </label>
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Search report..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-[#C82A2B] focus:ring-1 focus:ring-[#C82A2B]"
              />
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="px-6 py-3 bg-white border-b border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Matched Records</span>
            <div className="text-xl font-black text-zinc-900 mt-0.5">{counts.total}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Added / Created</span>
            <div className="text-xl font-black text-emerald-800 mt-0.5">{counts.added}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Updated / Modified</span>
            <div className="text-xl font-black text-amber-800 mt-0.5">{counts.updated}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-sky-50/70 border border-sky-200/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Follow-ups Logged</span>
            <div className="text-xl font-black text-sky-800 mt-0.5">{counts.followups}</div>
          </div>
        </div>

        {/* Activity List Body */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2.5">
          {filteredActivities.length === 0 ? (
            <div className="py-16 text-center">
              <Clock size={36} className="mx-auto text-zinc-300 mb-2" />
              <h4 className="text-sm font-bold text-zinc-700">No Activity Recorded</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No items were added, updated, or had follow-ups logged by {userName} between {formatISTDateOnly(fromDate)} and {formatISTDateOnly(toDate)}.
              </p>
            </div>
          ) : (
            <div className="border border-zinc-200/80 rounded-2xl overflow-hidden divide-y divide-zinc-100">
              {filteredActivities.map((act) => {
                const isAdded = act.activityType === 'ADDED';
                const isUpdated = act.activityType === 'UPDATED';
                const isFollowup = act.activityType === 'FOLLOWUP';
                const isPayment = act.activityType === 'PAYMENT';

                return (
                  <div key={act.id} className="p-3.5 hover:bg-zinc-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-zinc-900 text-sm">
                          {act.itemTitle}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                          isAdded ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          isUpdated ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          isPayment ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                          'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}>
                          {act.activityLabel}
                        </span>

                        {act.stageOrStatus && (
                          <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                            {act.stageOrStatus}
                          </span>
                        )}
                      </div>

                      {act.itemSubtitle && (
                        <p className="text-[11px] text-zinc-400 font-medium">
                          {act.itemSubtitle}
                        </p>
                      )}

                      {act.notes && (
                        <p className="text-zinc-600 bg-white/80 border border-zinc-100 rounded-lg p-2 font-medium text-xs mt-1 leading-relaxed">
                          {act.notes}
                        </p>
                      )}

                      {act.nextFollowUpDate && (
                        <p className="text-[11px] font-bold text-[#9E1B1D] flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          <span>Next Follow-up Scheduled: {formatISTDateOnly(act.nextFollowUpDate)}</span>
                        </p>
                      )}
                    </div>

                    <div className="sm:text-right shrink-0 text-zinc-500 text-[11px]">
                      <div className="font-bold text-zinc-700">{formatISTDateTime(act.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">
            {isFilterApplied ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                <Check size={14} strokeWidth={3} /> Filter currently applied to table
              </span>
            ) : (
              <span>Showing <strong>{filteredActivities.length}</strong> activity logs across <strong>{counts.total}</strong> records</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isFilterApplied && onClearFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClearFilter();
                  toast.success('Table filter cleared');
                  onClose();
                }}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl font-bold cursor-pointer"
              >
                Clear Filter
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredActivities.length === 0}
              className="border-zinc-300 rounded-xl font-bold text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReport}
              disabled={filteredActivities.length === 0}
              className="border-zinc-300 rounded-xl font-bold text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Report</span>
            </Button>

            {onApplyFilter && (
              <Button
                size="sm"
                onClick={handleApplyToTable}
                disabled={matchedItemsMap.size === 0}
                className="bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-[#C82A2B]/20 cursor-pointer"
              >
                <Filter size={14} />
                <span>Filter Table ({matchedItemsMap.size})</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
