'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { 
  Plus, Compass, MapPin, Phone, Mail, User, ShieldCheck, 
  ExternalLink, Building2, ArrowRight, MessageSquarePlus
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { 
  Lead, 
  Industry, 
  Employee, 
  Branch, 
  Zone,
  NewFeedModal, 
  FeedOutcomeModal, 
  LeadFormModal, 
  LeadViewModal 
} from '../leads/page';

export default function FeedsRegistryPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');

  // Modal States
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [feedOutcomeLead, setFeedOutcomeLead] = useState<Lead | null>(null);
  const [convertingFeed, setConvertingFeed] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });

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

  // Fetch all leads and metadata
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadsRes, indRes, empRes, brRes, zonesRes] = await Promise.all([
        api.get('/leads'),
        api.get('/industries').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/branches').catch(() => ({ data: [] })),
        api.get('/zones').catch(() => ({ data: [] }))
      ]);

      setLeads(leadsRes.data || []);
      setIndustries(indRes.data || []);
      setEmployees(empRes.data || []);
      setBranches(brRes.data || []);
      setZones(zonesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load feeds telemetry:', err);
      toast.error('Failed to load feeds directory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deep-link auto opening via ?id=...
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

  const canManageLeads = isSuperAdmin || userPermissions.includes('manage_leads');
  const canManageFeeds = canManageLeads || userPermissions.includes('manage_lead_stage_feeds');

  const authorName = currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Executive Agent';
  const authorDesignation = currentUser?.designation || currentUser?.role || 'Field Scouting Agent';
  const authorDepartment = currentUser?.department || 'Commercial Sales';

  // Feeds list: raw field prospect scouting feeds
  const feedsList = useMemo(() => {
    return leads.filter(l => l.status === 'Feeds');
  }, [leads]);

  // Available zones filtered by selected branch
  const availableFilterZones = useMemo(() => {
    if (selectedBranch === 'ALL') return zones;
    if (selectedBranch === 'HQ') {
      const hqZones = zones.filter(z => !z.branch_id);
      return hqZones.length > 0 ? hqZones : zones;
    }
    return zones.filter(z => String(z.branch_id) === selectedBranch);
  }, [zones, selectedBranch]);

  // Filtered Feeds
  const filteredFeeds = useMemo(() => {
    return feedsList.filter(l => {
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
      return true;
    });
  }, [feedsList, selectedBranch, selectedZone, selectedIndustry]);

  // Handle Quick Feed Creation
  const handleCreateFeed = async (feedData: any) => {
    const loadingToast = toast.loading('Logging raw field feed...');
    try {
      const res = await api.post('/leads/feed', feedData);
      toast.success('Field feed prospect recorded successfully', { id: loadingToast });
      setIsAddingFeed(false);
      fetchData();
      if (res.data?.lead) {
        setViewingLead(res.data.lead);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit field feed', { id: loadingToast });
      throw err;
    }
  };

  // Handle Edit Feed Profile
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
      throw err;
    }
  };

  // Convert Feed to Full Active Lead
  const handleConvertFeedToLead = (targetFeed: Lead) => {
    setConvertingFeed(targetFeed);
  };

  const handleCompleteFeedConversion = async (formData: any) => {
    const loadingToast = toast.loading('Converting field feed to active lead...');
    try {
      if (convertingFeed) {
        await api.put(`/leads/${convertingFeed.id}`, {
          ...formData,
          status: 'Open Leads' // Advance from Feeds to Open Leads
        });
      }
      toast.success('Feed graduated to active commercial pipeline!', { id: loadingToast });
      setConvertingFeed(null);
      if (viewingLead && viewingLead.id === convertingFeed?.id) {
        setViewingLead(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to convert feed', { id: loadingToast });
    }
  };

  // Delete Feed
  const handleDeleteFeed = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Deleting feed prospect...');
    const id = deleteConfirm.id;
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Feed removed successfully', { id: loadingToast });
      if (viewingLead && viewingLead.id === id) {
        setViewingLead(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete feed', { id: loadingToast });
    }
  };

  // Print & User Activity Report Handlers
  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintFeeds = (sortedData?: Lead[], currentSort?: SortInfo<Lead> | null) => {
    const dataToPrint = (sortedData && sortedData.length > 0) ? sortedData : filteredFeeds;
    const printedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : selectedBranch === 'HQ'
        ? 'Headquarters (HQ Central)'
        : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = dataToPrint.map((l, idx) => {
      const zoneName = l.zones?.name || zones.find(z => z.id === l.zone_id)?.name;
      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">
          <div>${l.name}</div>
          ${l.area ? `<div style="font-size: 9px; color: #2d8d9b; font-weight: normal;">${l.area}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 600;">${l.contact_person || '—'}</div>
          ${l.contact_designation ? `<div style="color: #a0aec0; font-size: 8px;">${l.contact_designation}</div>` : ''}
        </td>
        <td style="font-size: 10px; font-family: monospace; color: #4a5568;">${l.phone || '—'}</td>
        <td style="font-size: 10px; color: #4a5568;">${l.employees?.full_name || 'Scouting Agent'}</td>
        <td style="font-size: 10px; color: #4a5568;">${l.city || l.area || (zoneName ? `Zone: ${zoneName}` : '—')}</td>
      </tr>
    `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Field Feeds Intake Report - Forma Apparels</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Inter:wght@400;600;700;800&display=swap');
    @page { size: landscape; margin: 12mm 10mm; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a202c; background: #fff; margin: 0; padding: 15px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #2d8d9b; margin-bottom: 15px; }
    .brand-title { font-size: 20px; font-weight: 800; color: #1a202c; text-transform: uppercase; letter-spacing: -0.5px; }
    .report-title { font-size: 14px; font-weight: 800; color: #2d8d9b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #fce4d4/30; color: #3a525d; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 6px; border: 1px solid #fed7aa; text-align: left; }
    td { padding: 6px; border: 1px solid #fed7aa; vertical-align: top; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">Forma Apparels ERP</div>
      <div class="report-title">Field Feeds Intake Registry</div>
      <div style="font-size: 9px; color: #718096; margin-top: 4px;">Branch: <strong>${activeBranchName}</strong> • Records: <strong>${dataToPrint.length}</strong>${currentSort?.headerLabel && currentSort.headerLabel !== 'Default' ? ` • Sorted by: <strong>${currentSort.headerLabel} (${currentSort.direction === 'asc' ? 'Ascending' : 'Descending'})</strong>` : ''}</div>
    </div>
    <div style="text-align: right; font-size: 9px; color: #718096;">Printed on: <strong>${printedAt}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">#</th>
        <th>Prospect / Organization</th>
        <th>Contact Person</th>
        <th>Contact Phone</th>
        <th>Scouted By</th>
        <th>Area / City</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #718096;">No field feed records matching the selected filter criteria.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Pop-up blocked. Please allow pop-ups to print feeds.');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  // Table Columns Definition (Customer Name, Contact Person, Contact Phone, Follow-up)
  const columns: Column<Lead>[] = useMemo(() => [
    {
      header: 'Customer Name',
      className: 'min-w-[200px] max-w-[320px]',
      sortValue: (l) => l.name,
      accessor: (l) => (
        <div className="group min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setViewingLead(l)}
              className="text-left font-black text-xs md:text-sm tracking-tight text-zinc-900 hover:text-[#C82A2B] hover:underline transition-all cursor-pointer border-none bg-transparent p-0 outline-none truncate block"
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
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-[#C82A2B] hover:bg-[#FFF1F1] transition-all cursor-pointer shrink-0"
              title="Open feed details"
            >
              <ExternalLink size={13.5} />
            </button>
          </div>
          {(() => {
            const industryName = l.industries?.name || industries.find(ind => ind.id === l.industry_id)?.name;
            const zoneName = l.zones?.name || zones.find(z => z.id === l.zone_id)?.name;
            if (!industryName && !zoneName) return null;
            return (
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {industryName && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded">
                    {industryName}
                  </span>
                )}
                {zoneName && (
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-0.5">
                    <MapPin size={9} className="shrink-0 text-zinc-400" />
                    <span>Zone: {zoneName}</span>
                  </span>
                )}
              </div>
            );
          })()}
          {l.requirements && (
            <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5 max-w-[240px]">
              {l.requirements}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Area',
      className: 'w-[130px] min-w-[110px] whitespace-nowrap',
      sortValue: (l) => l.area || l.city || '',
      accessor: (l) => {
        const zoneName = l.zones?.name || zones.find(z => z.id === l.zone_id)?.name;
        return (
          l.area ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 truncate" title={l.area}>
              <MapPin size={12} className="text-[#9E1B1D] shrink-0" />
              <span className="truncate">{l.area}</span>
            </div>
          ) : l.city ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 truncate" title={l.city}>
              <MapPin size={12} className="text-zinc-400 shrink-0" />
              <span className="truncate">{l.city}</span>
            </div>
          ) : zoneName ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 truncate" title={`Zone: ${zoneName}`}>
              <MapPin size={10} className="text-zinc-400 shrink-0" />
              <span className="truncate">Zone: {zoneName}</span>
            </div>
          ) : (
            <span className="text-zinc-400 text-xs italic font-medium">—</span>
          )
        );
      }
    },
    {
      header: 'Contact Person',
      className: 'w-[160px] min-w-[140px] whitespace-nowrap',
      sortValue: (l) => l.contact_person || '',
      accessor: (l) => (
        l.contact_person ? (
          <div className="flex flex-col min-w-0 max-w-[190px]">
            <span className="text-xs font-bold text-zinc-800 truncate block" title={`${l.contact_title ? l.contact_title + ' ' : ''}${l.contact_person}`}>
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
      className: 'w-[135px] min-w-[125px] whitespace-nowrap',
      sortValue: (l) => l.phone || '',
      accessor: (l) => (
        l.phone ? (
          <a
            href={`tel:${l.phone}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-[#C82A2B] transition-colors"
            title={`Call ${l.phone}`}
          >
            <Phone size={12} className="text-[#9E1B1D] shrink-0" />
            <span>{l.phone}</span>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Follow-up',
      className: 'w-[110px] min-w-[105px] whitespace-nowrap text-center',
      accessor: (l) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {/* Feed Follow-up Outcome */}
          <button
            type="button"
            onClick={() => setFeedOutcomeLead(l)}
            className="px-3.5 py-1.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
            title="Record follow-up outcome for feed"
          >
            <MessageSquarePlus size={12} />
            <span>Update</span>
          </button>
        </div>
      )
    }
  ], [zones, industries]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Feeds</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1 opacity-80">
            Pre-Pipeline Field Prospect Scouting &amp; Commercial Feeds
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageFeeds && (
            <Button
              onClick={() => setIsAddingFeed(true)}
              className="h-14 px-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-xl shadow-[#C82A2B]/25 gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.5} />
              New Feed
            </Button>
          )}
          <PageActionsMenu
            onPrint={() => {
              if (printTriggerRef.current) {
                printTriggerRef.current();
              } else {
                handlePrintFeeds(filteredFeeds);
              }
            }}
            printLabel="Print Feeds"
            onUserReport={() => userReportTriggerRef.current?.()}
            userReportLabel="My Report"
          />
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredFeeds}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onPrint={handlePrintFeeds}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Branch Filter */}
            <FilterDropdown
              label="Branch"
              allLabel={`All Branches (${feedsList.length})`}
              value={selectedBranch}
              onChange={(val) => {
                setSelectedBranch(val);
                setSelectedZone('ALL');
              }}
              options={[
                {
                  label: 'Headquarters (HQ Central)',
                  value: 'HQ',
                  badge: feedsList.filter(l => !l.branch_id || l.origin === 'HQ').length
                },
                ...branches.map((b) => ({
                  label: b.name,
                  value: String(b.id),
                  badge: feedsList.filter(l => String(l.branch_id || l.employees?.branch_id || '') === String(b.id)).length
                }))
              ]}
            />

            {/* Zone Filter */}
            <FilterDropdown
              label="Zone"
              allLabel={`All Zones (${availableFilterZones.length})`}
              value={selectedZone}
              onChange={(val) => setSelectedZone(val)}
              options={availableFilterZones.map((z) => ({
                label: `${z.name}${z.code ? ` (${z.code})` : ''}`,
                value: String(z.id),
                badge: feedsList.filter(l => String(l.zone_id) === String(z.id)).length
              }))}
            />

            {/* Sector / Industry Filter */}
            <FilterDropdown
              label="Sector"
              allLabel={`All Sectors (${feedsList.length})`}
              value={selectedIndustry}
              onChange={(val) => setSelectedIndustry(val)}
              options={industries.map(ind => ({
                label: ind.name,
                value: String(ind.id),
                badge: feedsList.filter(l => String(l.industry_id) === String(ind.id)).length
              }))}
            />
          </div>
        }
      />

      {/* Modals */}
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

      {feedOutcomeLead && (
        <FeedOutcomeModal
          lead={feedOutcomeLead}
          branches={branches}
          onClose={() => setFeedOutcomeLead(null)}
          onSuccess={() => {
            setFeedOutcomeLead(null);
            fetchData();
          }}
          onConvertToLead={() => {
            const target = feedOutcomeLead;
            setFeedOutcomeLead(null);
            handleConvertFeedToLead(target);
          }}
        />
      )}

      {convertingFeed && (
        <LeadFormModal
          isOpen={true}
          onClose={() => setConvertingFeed(null)}
          onSubmit={handleCompleteFeedConversion}
          editingLead={convertingFeed}
          prefillData={convertingFeed}
          industries={industries}
          branches={branches}
          zones={zones}
          employees={employees}
          currentUser={currentUser}
          userBranchId={currentUser?.branchId}
          userBranchName={currentUser?.branchName}
        />
      )}

      {viewingLead && (
        <LeadViewModal
          isOpen={true}
          lead={viewingLead}
          onClose={() => setViewingLead(null)}
          permissions={{
            canManageLeads,
            canManageFeeds,
            canAssignBranch: canManageLeads,
            canAssignStaff: canManageLeads,
            canSalesContact: canManageLeads,
            canManageFollowups: canManageLeads,
            canManageMeetings: canManageLeads,
            canManageHotLeads: canManageLeads
          }}
          onEdit={() => {
            if (viewingLead) {
              setEditingFeed(viewingLead);
            }
          }}
          onDelete={() => {
            setDeleteConfirm({ isOpen: true, id: viewingLead.id });
          }}
          onFeedOutcome={() => setFeedOutcomeLead(viewingLead)}
          onAssignBranch={() => {}}
          onAssignStaff={() => {}}
          onFollowUp={() => {}}
          onMeetingOutcome={() => {}}
          onConvertFeed={() => handleConvertFeedToLead(viewingLead)}
          onReload={fetchData}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Remove Field Feed Prospect?"
        message="Are you sure you want to delete this field feed? This action cannot be undone."
        onConfirm={handleDeleteFeed}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        variant="danger"
      />
    </div>
  );
}
