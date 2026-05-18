'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Eye, Clock, ShieldCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MeasurementDetailModal } from '@/components/measurements/MeasurementDetailModal';
import { Select } from '@/components/ui/Select';
import { Filter } from 'lucide-react';

interface MeasurementRecord {
  id: string;
  member_id: string;
  suggested_size: string;
  recorded_at: string;
  dynamic_data: any;
  notes: string;
  status: string;
  registry_members: {
    full_name: string;
    admission_no: string;
    organizations: {
      name: string;
    }
  };
  user_profiles?: {
    full_name: string;
  };
}

export const MeasurementTable: React.FC = () => {
  const [data, setData] = useState<MeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MeasurementRecord | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');

  const [measurementFields, setMeasurementFields] = useState<any[]>([]);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOrg) params.append('orgId', selectedOrg);
      if (selectedDept) params.append('deptId', selectedDept);

      const res = await api.get(`/measurements?${params.toString()}`);
      // Flatten for search support
      const enriched = res.data.map((r: any) => {
        const name = r.registry_members?.full_name || '';
        const rid = r.registry_members?.admission_no || '';
        const org = r.registry_members?.organizations?.name || '';
        const staff = r.user_profiles?.full_name || 'System';
        
        return {
          ...r,
          search_name: name,
          search_id: rid,
          search_org: org,
          search_staff: staff,
          // Combined catch-all for the table's simple filter
          search_all: `${name} ${rid} ${org} ${staff}`.toLowerCase()
        };
      });
      setData(enriched);
    } catch (err) {
      toast.error('Failed to load measurement history');
    } finally {
      setIsLoading(false);
    }
  };
  
  const downloadCSV = () => {
    if (data.length === 0) {
        toast.error('No data to export');
        return;
    }

    // 1. Prepare Headers
    const baseHeaders = ['Full Name', 'Admission No', 'Organization', 'Suggested Size', 'Status', 'Date', 'Time', 'Recorded By', 'Notes'];
    
    // 2. Identify all unique dynamic measurement labels
    const dynamicLabels = new Set<string>();
    data.forEach(r => {
        if (r.dynamic_data) {
            Object.entries(r.dynamic_data).forEach(([category, metrics]: [string, any]) => {
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
    
    // 3. Prepare Rows
    const rows = data.map(r => {
      const date = new Date(r.recorded_at);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const baseValues = [
        `"${r.registry_members?.full_name || ''}"`,
        `"${r.registry_members?.admission_no || ''}"`,
        `"${r.registry_members?.organizations?.name || ''}"`,
        `"${r.suggested_size || ''}"`,
        `"${r.status || ''}"`,
        `"${formattedDate}"`,
        `"${formattedTime}"`,
        `"${r.user_profiles?.full_name || 'System'}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];

      const dynamicValues = dynamicLabelsArray.map(fullLabel => {
          const [category, label] = fullLabel.split('|');
          const metrics = r.dynamic_data?.[category];
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

    // 4. Combine and Trigger Download
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `uniform_measurements_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported');
  };

  useEffect(() => {
    fetchData();
  }, [selectedOrg, selectedDept]);

  const columns: Column<MeasurementRecord>[] = [
    {
      header: 'Member Details',
      accessor: (r) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] shadow-inner font-black italic">
            {r.registry_members?.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-black text-[13px] tracking-tighter text-[#3a525d] leading-none uppercase">{r.registry_members?.full_name}</p>
            <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-[0.2em] mt-2 opacity-70">RID-{r.registry_members?.admission_no}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Entity / Organization',
      accessor: (r) => (
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] opacity-80">{r.registry_members?.organizations?.name || 'Inland ERP'}</p>
          <span className="text-[8px] font-black text-[#2d8d9b] uppercase tracking-widest bg-zinc-50 px-2 py-0.5 rounded mt-1 inline-block border border-zinc-100">Verified System Data</span>
        </div>
      ),
    },
    {
      header: 'Suggested Size',
      accessor: (r) => (
        <div className="flex items-center gap-3">
           <div className="px-5 py-2 bg-[#2d8d9b] text-white rounded-xl font-black text-xs shadow-lg shadow-[#2d8d9b]/20 italic tracking-tighter">
              {r.suggested_size}
           </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (r) => (
        <div className="flex items-center gap-2">
           <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
             r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' : 
             r.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100/50' :
             r.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100/50' :
             'bg-zinc-50 text-zinc-700 border-zinc-100'
           }`}>
              {r.status === 'Approved' ? <ShieldCheck size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={3} />}
              <span className="text-[9px] font-black uppercase tracking-wider">{r.status || 'Verified'}</span>
           </div>
        </div>
      ),
    },
    {
      header: 'Capture Log',
      accessor: (r) => {
        const date = new Date(r.recorded_at);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        
        return (
          <div className="space-y-1.5 py-2">
            <div className="flex items-center gap-2 text-zinc-400">
               <Clock size={10} />
               <span className="text-[10px] font-bold">{formattedDate} • {formattedTime}</span>
            </div>
            <p className="text-[9px] font-black text-[#8b6b5a] uppercase tracking-widest">
               REF: {r.user_profiles?.full_name || 'System Auto'}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <div className="flex gap-1 justify-end">
          <button 
            onClick={() => setSelectedRecord(r)}
            className="p-3 bg-zinc-50 hover:bg-[#2d8d9b] hover:text-white transition-all rounded-xl text-zinc-400 group"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="p-3 bg-[#3a525d]/5 rounded-2xl hidden sm:block">
                  <Filter size={20} className="text-[#3a525d]" />
              </div>
              <div className="w-full sm:w-[220px]">
                <Select 
                  placeholder="All Organizations"
                  value={selectedOrg}
                  options={organizations.map(o => ({ label: o.name, value: o.id.toString() }))}
                  onChange={(val: string) => {
                    setSelectedOrg(val);
                    setSelectedDept(''); // Reset dept when org changes
                  }}
                />
              </div>
              <div className="w-full sm:w-[220px]">
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

          <Button 
            variant="secondary" 
            onClick={downloadCSV}
            className="h-12 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#3a525d]/20 gap-3 w-full xl:w-auto"
          >
            <Download size={16} />
            Export CSV
          </Button>
      </div>

      <DataTable 
        title="Measurement History"
        subtitle="Universal Tailoring Audit Log"
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Filter logic by member name or ID..."
      />

      <MeasurementDetailModal 
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </div>
  );
};
