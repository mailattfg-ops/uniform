'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, User, Calendar, Ruler, MessageSquare, Loader2, Eye, Download } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MeasurementDetailModal } from '@/components/measurements/MeasurementDetailModal';
import { Select } from '@/components/ui/Select';
import { Filter } from 'lucide-react';

interface Measurement {
  id: number;
  member_id: number;
  status: string;
  dynamic_data: Record<string, any>;
  suggested_size: string;
  notes: string;
  recorded_at: string;
  user_profiles: { full_name: string };
  registry_members: { full_name: string; admission_no: string; organizations: { name: string } };
}

export default function MeasurementApprovals() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<Measurement | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [measurementFields, setMeasurementFields] = useState<any[]>([]);

  const fetchFilters = async () => {
    try {
      const [orgsRes, deptsRes, chartsRes, configRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/departments'),
        api.get('/size-charts'),
        api.get('/measurements/config')
      ]);
      setOrganizations(orgsRes.data);
      setDepartments(deptsRes.data);
      setSizeCharts(chartsRes.data);
      setMeasurementFields(configRes.data);
    } catch (err) {
      console.error('Failed to load filters');
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOrg) params.append('orgId', selectedOrg);
      if (selectedDept) params.append('deptId', selectedDept);

      const res = await api.get(`/measurements?${params.toString()}`);
      // Filter for Pending only
      setMeasurements(res.data.filter((m: any) => m.status === 'Pending'));
    } catch (err) {
      toast.error('Failed to load pending queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [selectedOrg, selectedDept]);

  const handleUpdateStatus = async (id: number, status: string) => {
    const loadingToast = toast.loading(`${status === 'Approved' ? 'Approving' : 'Rejecting'} measurement...`);
    try {
      await api.post(`/measurements/${id}/status`, { status });
      toast.success(`Measurement ${status.toLowerCase()} successfully`, { id: loadingToast });
      fetchPending();
    } catch (err) {
      toast.error('Action failed', { id: loadingToast });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;
    
    const loadingToast = toast.loading(`${status === 'Approved' ? 'Approving' : 'Rejecting'} ${selectedIds.length} measurements...`);
    try {
      await Promise.all(selectedIds.map(id => api.post(`/measurements/${id}/status`, { status })));
      toast.success(`${selectedIds.length} measurements ${status.toLowerCase()} successfully`, { id: loadingToast });
      setSelectedIds([]);
      fetchPending();
    } catch (err) {
      toast.error('Bulk operation failed', { id: loadingToast });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === measurements.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(measurements.map(m => m.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const downloadCSV = () => {
    if (measurements.length === 0) {
        toast.error('No data to export');
        return;
    }

    const baseHeaders = ['Full Name', 'Admission No', 'Organization', 'Suggested Size', 'Status', 'Date', 'Time', 'Recorded By', 'Notes'];
    
    const dynamicLabels = new Set<string>();
    measurements.forEach(m => {
        if (m.dynamic_data) {
            Object.entries(m.dynamic_data).forEach(([category, metrics]: [string, any]) => {
                if (typeof metrics === 'object' && metrics !== null) {
                    const strategy = metrics.strategy || 'manual';
                    const displayMetrics = strategy === 'us_size_chart' 
                        ? (metrics.selected_size || {})
                        : Object.fromEntries(Object.entries(metrics).filter(([k]) => k !== 'strategy' && k !== 'chart_id'));
                    
                    Object.keys(displayMetrics).forEach(label => {
                        const cleanCat = category.trim();
                        const cleanLab = label.trim();
                        if (cleanLab) {
                            dynamicLabels.add(`${cleanCat}|${cleanLab}`);
                        }
                    });
                }
            });
        }
    });

    const dynamicLabelsArray = Array.from(dynamicLabels).sort();
    const dynamicHeaders = dynamicLabelsArray.map(l => {
        const [cat, lab] = l.split('|');
        return `"${cat}: ${lab}"`;
    });

    const headers = [...baseHeaders.map(h => `"${h}"`), ...dynamicHeaders];
    
    const rows = measurements.map(m => {
      const date = new Date(m.recorded_at);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const baseValues = [
        `"${m.registry_members?.full_name || ''}"`,
        `"${m.registry_members?.admission_no || ''}"`,
        `"${m.registry_members?.organizations?.name || ''}"`,
        `"${m.suggested_size || ''}"`,
        `"${m.status || ''}"`,
        `"${formattedDate}"`,
        `"${formattedTime}"`,
        `"${m.user_profiles?.full_name || 'System'}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`
      ];

      const dynamicValues = dynamicLabelsArray.map(fullLabel => {
          const [category, label] = fullLabel.split('|');
          const metrics = m.dynamic_data?.[category];
          let val: any = '';
          
          if (metrics) {
              const strategy = metrics.strategy || 'manual';
              if (strategy === 'us_size_chart') {
                  const sizeLabel = metrics.selected_size?.[label];
                  if (sizeLabel) {
                      const chart = sizeCharts.find(c => c.id === metrics.chart_id);
                      if (chart) {
                          const group = chart.metric_groups?.find((g: any) => g.label === label);
                          const valObj = group?.data?.find((d: any) => d.size === sizeLabel);
                          const unit = chart.unit || '';
                          val = valObj ? `${sizeLabel} (${valObj.value}${unit ? ' ' + unit : ''})` : sizeLabel;
                      } else {
                          val = sizeLabel;
                      }
                  }
              } else {
                  const rawVal = metrics[label];
                  if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                      const fieldConfig = measurementFields.find(f => f.label === label);
                      const unit = fieldConfig?.unit || '';
                      val = unit ? `${rawVal} ${unit}` : rawVal;
                  }
              }
          }
          return `"${val !== undefined && val !== null ? String(val).replace(/"/g, '""') : ''}"`;
      });

      return [...baseValues, ...dynamicValues];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pending_approvals_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported');
  };

  const columns: Column<Measurement>[] = [
    {
      header: (
        <input 
          type="checkbox" 
          checked={measurements.length > 0 && selectedIds.length === measurements.length}
          onChange={toggleSelectAll}
          className="w-5 h-5 rounded-lg border-[#fce4d4] text-[#2d8d9b] focus:ring-[#2d8d9b] transition-all cursor-pointer"
        />
      ),
      accessor: (m) => (
        <input 
          type="checkbox" 
          checked={selectedIds.includes(m.id)}
          onChange={() => toggleSelect(m.id)}
          className="w-5 h-5 rounded-lg border-[#fce4d4] text-[#2d8d9b] focus:ring-[#2d8d9b] transition-all cursor-pointer"
        />
      ),
      className: "w-12"
    },
    {
      header: 'Staff Member',
      accessor: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100">
            <User size={16} />
          </div>
          <div>
            <p className="text-xs font-black text-[#3a525d]">{m.user_profiles?.full_name || 'System'}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Recorded By</p>
          </div>
        </div>
      )
    },
    {
      header: 'Target Member',
      accessor: (m) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-[#1a1d21]">{m.registry_members?.full_name}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-bold text-[#2d8d9b] uppercase">{m.registry_members?.admission_no}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{m.registry_members?.organizations?.name}</span>
          </div>
        </div>
      )
    },
    {
        header: 'Captured Data',
        accessor: (m) => (
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-[#2d8d9b]/10 text-[#2d8d9b] px-2 py-0.5 rounded-full uppercase">SIZE {m.suggested_size}</span>
                {m.notes && <MessageSquare size={12} className="text-amber-400" />}
             </div>
             <p className="text-[9px] text-muted-foreground font-medium truncate max-w-[150px]">
                {Object.keys(m.dynamic_data || {}).length} modules captured
             </p>
          </div>
        )
    },
    {
        header: 'Recorded On',
        accessor: (m) => (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={14} strokeWidth={2.5} />
                <span className="text-[10px] font-bold">{new Date(m.recorded_at).toLocaleDateString()}</span>
            </div>
        )
    },
    {
      header: 'Actions',
      accessor: (m) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSelectedRecord(m)}
            className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-zinc-100 group shadow-sm"
            title="View Details"
          >
            <Eye size={16} className="group-hover:scale-110 transition-transform" />
          </button>
          <div className="w-px h-6 bg-zinc-100 mx-1" />
          <button 
            onClick={() => handleUpdateStatus(m.id, 'Approved')}
            className="h-9 px-4 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white flex items-center gap-2 transition-all border border-green-500/20 group shadow-sm"
          >
            <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">Approve</span>
          </button>
          <button 
             onClick={() => handleUpdateStatus(m.id, 'Rejected')}
             className="h-9 px-4 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white flex items-center gap-2 transition-all border border-red-500/20 group shadow-sm"
          >
            <XCircle size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">Reject</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
        <div>
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 leading-none">Administrative Gateway</p>
           <h1 className="text-4xl font-black text-[#3a525d] tracking-tighter italic">Measurements Approvals</h1>
        </div>
        <div className="flex gap-4">
            <div className="bg-amber-50 px-8 py-4 rounded-3xl border border-amber-100 flex items-center gap-5 shadow-inner">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-500/30">
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <MessageSquare size={24} />}
                </div>
                <div>
                    <h4 className="text-2xl font-black text-amber-600 leading-none">{measurements.length}</h4>
                    <p className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mt-1">Pending Review</p>
                </div>
            </div>
        </div>
      </div>
      
      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="p-3 bg-[#3a525d]/5 rounded-2xl hidden sm:block">
                  <Filter size={20} className="text-[#3a525d]" />
              </div>
              <div className="w-full sm:w-[240px]">
                <Select 
                  placeholder="All Organizations"
                  value={selectedOrg}
                  options={organizations.map(o => ({ label: o.name, value: o.id.toString() }))}
                  onChange={(val: string) => {
                    setSelectedOrg(val);
                    setSelectedDept(''); 
                  }}
                />
              </div>
              <div className="w-full sm:w-[240px]">
                <Select 
                  placeholder="All Departments"
                  value={selectedDept}
                  options={departments
                    .filter(d => !selectedOrg || d.organization_id.toString() === selectedOrg)
                    .map(d => ({ label: d.name, value: d.id.toString() }))}
                  onChange={(val: string) => setSelectedDept(val)}
                />
              </div>
          </div>

          <div className="flex items-center gap-4">
              <Button 
                variant="secondary" 
                onClick={downloadCSV}
                className="h-12 px-8 bg-[#3a525d]/5 text-[#3a525d] hover:bg-[#3a525d] hover:text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-none gap-3 shadow-sm"
              >
                <Download size={16} />
                Export CSV
              </Button>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#2d8d9b] bg-[#2d8d9b]/5 px-4 py-2 rounded-xl border border-[#2d8d9b]/10">
                    Auto-Sync Active
                  </span>
              </div>
          </div>
      </div>

      <DataTable 
        title="Pending Measurements Queue"
        subtitle="Review staff submissions before they go live in the registry"
        columns={columns}
        data={measurements}
        isLoading={loading}
        headerAction={
          selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-300">
               <span className="text-[10px] font-black uppercase text-[#2d8d9b] bg-[#2d8d9b]/10 px-4 py-2 rounded-xl border border-[#2d8d9b]/20">
                  {selectedIds.length} Selected
               </span>
               <Button 
                onClick={() => handleBulkStatusUpdate('Approved')}
                className="h-10 px-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-green-500/20 gap-2"
               >
                  <CheckCircle2 size={14} /> Approve Selected
               </Button>
               <Button 
                onClick={() => handleBulkStatusUpdate('Rejected')}
                variant="secondary"
                className="h-10 px-6 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl font-black uppercase tracking-widest text-[9px] border-red-100 gap-2"
               >
                  <XCircle size={14} /> Reject
               </Button>
            </div>
          )
        }
      />

      <MeasurementDetailModal 
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </div>
  );
}
