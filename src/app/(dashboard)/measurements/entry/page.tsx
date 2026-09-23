'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Search, Ruler, User, ShieldCheck, CheckCircle2, Save, History, Scale, Building2, Library, Settings2, Clock, Plus, Package, Info } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { extractGarmentDisplayMetrics } from '@/lib/formatters';
import { LabelConfigModal } from '../_components/LabelConfigModal';
import { AdHocFieldModal } from '../_components/AdHocFieldModal';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MeasurementEntryPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Redirect client users to history (staff-only capture)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        const roleLower = (u?.role || '').toLowerCase();
        const isClient = Boolean(u?.organizationId || u?.memberId || ['organisation', 'organization', 'school', 'entity', 'student', 'member'].includes(roleLower));
        if (isClient) {
          router.replace('/measurements/history');
        }
      }
    } catch (e) {
      // ignore
    }
  }, [router]);
  const [members, setMembers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [measurementFields, setMeasurementFields] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<{[key: string]: string}>({});
  const [productSizingModes, setProductSizingModes] = useState<Record<number, 'us_size_chart' | 'manual'>>({});
  const [productAssignedChart, setProductAssignedChart] = useState<Record<number, string>>({});
  const [lastMeasurement, setLastMeasurement] = useState<any>(null);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false);

  const getResolvedChart = (prod: any) => {
    if (!prod) return null;
    const selectedChartId = productAssignedChart[prod.id];
    if (selectedChartId) {
      const found = sizeCharts.find(c => c.id === selectedChartId);
      if (found) return found;
    }
    if (prod.size_chart_id) {
      const found = sizeCharts.find(c => c.id === prod.size_chart_id);
      if (found) return found;
    }
    const prodName = (prod.name || '').toLowerCase();
    const byName = sizeCharts.find(c => {
      const cName = (c.name || '').toLowerCase();
      return cName === prodName || prodName.includes(cName) || cName.includes(prodName);
    });
    if (byName) return byName;
    return sizeCharts.length > 0 ? sizeCharts[0] : null;
  };
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [extraFields, setExtraFields] = useState<{label: string, unit: string}[]>([]);

  // 1. Fetch Config & Schools on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgsRes, configRes, productsRes, sizeChartsRes, staffRes] = await Promise.all([
          api.get('/organizations'),
          api.get('/measurements/config'),
          api.get('/products'),
          api.get('/size-charts'),
          api.get('/employees').catch(() => ({ data: [] }))
        ]);
        setOrganizations(orgsRes.data.map((o: any) => ({ label: o.name, value: o.id.toString() })));
        setMeasurementFields(configRes.data);
        setProducts(productsRes.data);
        setSizeCharts(sizeChartsRes.data);
        setStaff(staffRes.data.map((s: any) => ({ label: s.full_name, value: s.user_id })));
      } catch (err) {
        toast.error('Failed to initialize settings');
      }
    };
    fetchData();
  }, []);

  // 2. Fetch Departments
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!selectedOrg) {
        setDepartments([]);
        setSelectedDept('');
        return;
      }
      try {
        const response = await api.get(`/departments?orgId=${selectedOrg}`);
        setDepartments(response.data.map((d: any) => ({ label: d.name, value: d.id.toString() })));
      } catch (err) {
        toast.error('Failed to load departments');
      }
    };
    fetchDepartments();
  }, [selectedOrg]);

  const handleReset = () => {
    setSelectedOrg('');
    setSelectedDept('');
    setSelectedMember(null);
    setSelectedTemplate(null);
    setMembers([]);
    setDepartments([]);
    setAvailableTemplates([]);
    setSelectedSizes({});
    setProductSizingModes({});
    setLastMeasurement(null);
    setIsEditingMeasurement(false);
  };

  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  // 3. Fetch Members & Templates on Department selection
  useEffect(() => {
    const fetchDeptData = async () => {
      if (studentIdParam && !selectedMember) {
        setIsDataLoading(true);
        try {
          const response = await api.get(`/members`); 
          const member = response.data.find((m: any) => m.id.toString() === studentIdParam);
          if (member) {
            setSelectedMember(member);
            if (member.organization_id) setSelectedOrg(member.organization_id.toString());
            if (member.department_id) setSelectedDept(member.department_id.toString());
          }
        } catch (err) {
          toast.error('Failed to load member');
        } finally {
          setIsDataLoading(false);
        }
        return;
      }

      if (!selectedDept) {
        setMembers([]);
        setAvailableTemplates([]);
        setSelectedTemplate(null);
        return;
      }
      setIsDataLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('deptId', selectedDept);
        if (selectedOrg) queryParams.append('orgId', selectedOrg);

        const [membersRes, templatesRes] = await Promise.all([
          api.get(`/members?classId=${selectedDept}`),
          api.get(`/templates?${queryParams.toString()}`)
        ]);
        setMembers(membersRes.data || []);
        setAvailableTemplates(templatesRes.data || []);
        if (templatesRes.data && templatesRes.data.length > 0) {
            // Automatically select and bind the assigned department bundle
            setSelectedTemplate(templatesRes.data[0]);
        } else {
            setSelectedTemplate(null);
        }
      } catch (err) {
        toast.error('Failed to load department members or templates');
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchDeptData();
  }, [selectedDept, selectedOrg, studentIdParam]);

  // 4. Fetch Member Context (History & Template)
  useEffect(() => {
    const fetchMemberContext = async () => {
      if (!selectedMember) return;
      try {
        let historyRes: any;
        try {
          historyRes = await api.get(`/measurements/history/${selectedMember.id}`);
        } catch {
          historyRes = await api.get(`/measurements/member/${selectedMember.id}`);
        }
        
        if (historyRes?.data && historyRes.data.length > 0) {
            const latest = historyRes.data[0];
            setLastMeasurement(latest);
            setIsEditingMeasurement(false); // Display existing measurement banner by default

            // Populate initial sizing modes & selected sizes based on latest recorded fitting
            if (latest.dynamic_data) {
              const initialModes: Record<number, 'us_size_chart' | 'manual'> = {};
              const initialSizes: Record<string, string> = {};

              Object.entries(latest.dynamic_data).forEach(([prodName, data]: [string, any]) => {
                const prod = products.find(p => p.name === prodName);
                if (prod) {
                  initialModes[prod.id] = data?.strategy === 'us_size_chart' ? 'us_size_chart' : 'manual';
                  if (data?.selected_size && typeof data.selected_size === 'object') {
                    Object.entries(data.selected_size).forEach(([grpLabel, szVal]) => {
                      initialSizes[`${prod.id}-${grpLabel}`] = String(szVal);
                    });
                  }
                }
              });
              setProductSizingModes(prev => ({ ...initialModes, ...prev }));
              setSelectedSizes(prev => ({ ...initialSizes, ...prev }));
            }
        } else {
            setLastMeasurement(null);
            setIsEditingMeasurement(true); // Direct entry for new member without measurements
        }
      } catch (err) {
        console.error('History or Template fetch failed:', err);
        setLastMeasurement(null);
        setIsEditingMeasurement(true);
      }
    };
    fetchMemberContext();
  }, [selectedMember, products]);

  const handleAddExtraField = (field: { label: string, unit: string }) => {
    setExtraFields([...extraFields, field]);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMember || !selectedTemplate) return;
    
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const suggested_size = formData.get('suggested_size');
    const notes = formData.get('notes');
    const recorded_by = formData.get('recorded_by');
    
    // Group measurements product-wise
    const config = selectedMember.gender === 'Female' ? selectedTemplate.girls_config : selectedTemplate.boys_config;
    const dynamic_data: any = {};
    
    config?.forEach((item: any) => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        // Enforce strict mutual exclusivity: standard US size OR custom measurement, never both
        const currentMode = productSizingModes[prod.id] || (item.entry_methods?.includes('us_size_chart') ? 'us_size_chart' : 'manual');
        
        if (currentMode === 'us_size_chart') {
          const chart = getResolvedChart(prod);
          const selections: {[key: string]: string} = {};
          const assignedDims: {[key: string]: string} = {};
          
          chart?.metric_groups?.forEach((group: any) => {
            const val = formData.get(`${prod.id}-${group.label}`) || selectedSizes[`${prod.id}-${group.label}`];
            if (val) {
              const valStr = val.toString();
              selections[group.label] = valStr;
              const foundData = group.data?.find((d: any) => String(d.size).toLowerCase() === valStr.toLowerCase());
              if (foundData?.value) {
                assignedDims[group.label] = `${foundData.value}${chart.unit ? ' ' + chart.unit : ''}`;
              }
            }
          });

          dynamic_data[prod.name] = {
            selected_size: selections,
            assigned_dimensions: assignedDims,
            strategy: 'us_size_chart',
            chart_id: chart?.id || prod.size_chart_id,
            chart_name: chart?.name || prod.name,
            chart_unit: chart?.unit || 'in'
          };
        } else {
          dynamic_data[prod.name] = {
            strategy: 'manual'
          };
          (prod.measurements || []).forEach((label: string) => {
            const val = formData.get(`${prod.id}-${label}`);
            if (val !== null && val !== undefined && val !== '') {
              dynamic_data[prod.name][label] = val;
            }
          });
        }
      }
    });

    try {
      const saveRes = await api.post('/measurements/record', {
        member_id: selectedMember.id,
        suggested_size,
        notes,
        dynamic_data,
        recorded_by,
        status: 'Pending',
        force_new: Boolean(lastMeasurement)
      });

      toast.success(
        lastMeasurement 
          ? 'Measurement updated — submitted to Admin Approval Queue!' 
          : 'Measurement recorded — submitted to Admin Approval Queue!'
      );

      // Update members list state to Pending review
      setMembers(prev => {
        const updated = prev.map(m => {
          if (String(m.id) === String(selectedMember.id)) {
            return { ...m, measurement_status: 'Pending' };
          }
          return m;
        });
        return updated;
      });

      if (saveRes?.data?.measurement) {
        setLastMeasurement(saveRes.data.measurement);
        setIsEditingMeasurement(false);
      }

      // Wait 300ms for DB index to catch up before re-fetch
      setTimeout(async () => {
        const response = await api.get(`/members?classId=${selectedDept}`);
        setMembers(response.data);
      }, 300);
    } catch (err) {
      toast.error('Failed to update sizing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Advanced Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Record Entry</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Tailoring Intelligence</p>
        </div>

        {!selectedMember && (
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl bg-white p-4 rounded-[2rem] border border-[#fce4d4] shadow-sm">
            <div className="flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] mb-2 px-2 flex items-center gap-2">
                 <Building2 size={10} /> Organization
               </label>
               <Select 
                 name="filter_org" 
                 options={organizations} 
                 defaultValue={selectedOrg}
                 onChange={(val) => setSelectedOrg(val)}
               />
            </div>
            <div className="flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] mb-2 px-2 flex items-center gap-2">
                 <Library size={10} /> Department
               </label>
               <Select 
                 name="filter_dept" 
                 options={departments.length > 0 ? departments : [{ label: 'Select Organization...', value: '' }]} 
                 defaultValue={selectedDept}
                 onChange={(val) => setSelectedDept(val)}
                 disabled={!selectedOrg}
               />
            </div>
            <div className="flex items-end pb-1">
               <Button 
                variant="secondary" 
                onClick={handleReset}
                className="h-10 px-4 rounded-xl text-[9px] font-black uppercase border-none bg-zinc-50 hover:bg-zinc-100 text-zinc-400 gap-2"
               >
                  Reset
               </Button>
            </div>
          </div>
        )}
      </div>

      {!selectedMember ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => (
            <Card 
              key={m.id} 
              className="p-6 cursor-pointer hover:border-[#2d8d9b] hover:shadow-2xl transition-all group border-2 border-transparent"
              onClick={() => setSelectedMember(m)}
            >
               <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-[#3a525d] font-black italic group-hover:bg-[#2d8d9b] group-hover:text-white transition-all">
                    {m.full_name.charAt(0)}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                      m.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {m.gender || 'Not Set'}
                    </div>
                    {m.measurement_status === 'Approved' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 animate-in zoom-in duration-500 shadow-sm">
                        <ShieldCheck size={10} strokeWidth={3} />
                        Measured
                      </div>
                    ) : m.measurement_status === 'Pending' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 animate-pulse shadow-sm">
                        <Clock size={10} strokeWidth={3} />
                        Reviewing
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 text-zinc-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-zinc-100 opacity-60">
                        <Info size={10} strokeWidth={3} />
                        Not Measured
                      </div>
                    )}
                  </div>
               </div>
               <h3 className="font-bold text-[#3a525d] text-base leading-tight">{m.full_name}</h3>
               <p className="text-[9px] font-black text-[#2d8d9b] tracking-widest mt-1 opacity-60 uppercase">ID: {m.admission_no}</p>
            </Card>
          ))}
          
          {!selectedDept && (
            <div className="col-span-full py-20 text-center opacity-20">
               <Scale size={64} className="mx-auto mb-4" />
               <p className="text-xl font-black italic tracking-tighter">Choose Organization & Department to begin</p>
            </div>
          )}

          {isDataLoading && (
             <div className="col-span-full py-20 flex justify-center">
                <div className="w-12 h-12 border-4 border-[#2d8d9b]/10 border-t-[#2d8d9b] rounded-full animate-spin" />
             </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 animate-in zoom-in duration-500">
            {/* Member Profile & HISTORY */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-8 border-none bg-gradient-to-br from-[#3a525d] to-[#2d8d9b] text-white shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                      <Button 
                        variant="secondary" 
                        onClick={() => setSelectedMember(null)}
                        className="h-10 px-6 rounded-xl bg-white/20 hover:bg-white/30 border-none text-white text-[10px] font-black uppercase tracking-widest mb-8 gap-2"
                      >
                         &larr; Back to Registry
                      </Button>
                      <h2 className="text-3xl font-black italic tracking-tighter mb-4">{selectedMember.full_name}</h2>
                      <div className="space-y-2 opacity-70">
                         <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck size={14} /> ID: {selectedMember.admission_no}
                         </div>
                         <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <User size={14} /> Gender: {selectedMember.gender || 'Not Set'}
                         </div>
                      </div>
                   </div>
                </Card>

                {/* DEPARTMENT BUNDLE: Auto-linked if 1, Selection presented if > 1 */}
                {availableTemplates.length === 0 ? (
                  <Card className="p-6 border-none bg-white shadow-xl rounded-[2rem]">
                     <h3 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] flex items-center gap-2 mb-3">
                        <Library size={14} className="text-[#2d8d9b]" />
                        Department Bundle
                     </h3>
                     <p className="text-xs text-orange-500 font-bold bg-orange-50 p-4 rounded-xl border border-orange-100">
                        No uniform templates defined for this department. Please configure one under Measurements &gt; Templates.
                     </p>
                  </Card>
                ) : availableTemplates.length === 1 ? (
                  <Card className="p-6 border border-zinc-150 bg-white shadow-lg rounded-[2rem]">
                     <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] flex items-center gap-2">
                           <Library size={14} className="text-[#2d8d9b]" />
                           Department Bundle
                        </h3>
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-wider rounded-full border border-emerald-100 flex items-center gap-1">
                           <CheckCircle2 size={10} /> Auto-Linked
                        </span>
                     </div>
                     <div className="p-4 rounded-2xl bg-[#2d8d9b]/5 border border-[#2d8d9b]/20 flex items-center justify-between">
                        <div>
                           <p className="font-black text-xs text-[#2d8d9b]">{selectedTemplate?.name}</p>
                           <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                              {selectedMember.gender === 'Female' ? selectedTemplate?.girls_config?.length : selectedTemplate?.boys_config?.length} Products Assigned
                           </p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#2d8d9b] flex items-center justify-center text-white">
                           <CheckCircle2 size={14} />
                        </div>
                     </div>
                  </Card>
                ) : (
                  <Card className="p-6 border-2 border-[#2d8d9b]/30 bg-white shadow-xl rounded-[2rem]">
                     <div className="flex items-center justify-between mb-3">
                        <div>
                           <h3 className="text-xs font-black uppercase tracking-widest text-[#3a525d] flex items-center gap-2">
                              <Library size={15} className="text-[#2d8d9b]" />
                              Select Bundle Template
                           </h3>
                           <p className="text-[9px] text-zinc-400 font-bold mt-0.5">
                             {availableTemplates.length} bundles available for this department
                           </p>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider rounded-xl border border-amber-200">
                           Choose Set
                        </span>
                     </div>

                     <div className="space-y-2.5 pt-1">
                        {availableTemplates.map(t => {
                           const isSelected = selectedTemplate?.id === t.id;
                           const prodCount = selectedMember.gender === 'Female' ? t.girls_config?.length : t.boys_config?.length;
                           return (
                              <button 
                                 key={t.id}
                                 type="button"
                                 onClick={() => setSelectedTemplate(t)}
                                 className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                                    isSelected 
                                    ? 'border-[#2d8d9b] bg-[#2d8d9b]/10 shadow-md ring-2 ring-[#2d8d9b]/20' 
                                    : 'border-zinc-200 bg-zinc-50/60 hover:border-[#2d8d9b]/40 hover:bg-white'
                                 }`}
                              >
                                 <div>
                                    <p className={`font-black text-xs ${isSelected ? 'text-[#2d8d9b]' : 'text-[#3a525d]'}`}>
                                       {t.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                       {prodCount || 0} Products Linked
                                    </p>
                                 </div>
                                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected ? 'border-[#2d8d9b] bg-[#2d8d9b] text-white shadow-sm' : 'border-zinc-300 bg-white'
                                 }`}>
                                    {isSelected ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-zinc-200" />}
                                 </div>
                              </button>
                           );
                        })}
                     </div>
                  </Card>
                )}

                {/* HISTORICAL PREVIEW CARD */}
                {lastMeasurement && (
                  <Card className="p-6 border-none shadow-xl bg-orange-50/80 border border-orange-100 animate-in fade-in duration-300">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-100 text-orange-600">
                           <History size={20} />
                        </div>
                        <div>
                           <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d]">Active Measurement Record</h4>
                           <p className="text-[9px] font-bold text-zinc-400">
                             Recorded on {new Date(lastMeasurement.recorded_at).toLocaleDateString()}
                           </p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        {lastMeasurement && Object.entries(lastMeasurement.dynamic_data || {}).map(([prodName, prodData]: [string, any]) => {
                          const display = extractGarmentDisplayMetrics(prodName, prodData, sizeCharts);
                          return (
                            <div key={prodName} className="space-y-3 pb-4 border-b border-orange-100 last:border-0">
                               <div className="flex items-center justify-between">
                                  <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{prodName}</h5>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                     display.strategy === 'us_size_chart'
                                       ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                       : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                     {display.strategy === 'us_size_chart' ? 'US Standard Size' : 'Custom Bespoke'}
                                  </span>
                               </div>
                               <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                  {display.metrics.map((m) => {
                                     const fieldConfig = measurementFields.find(f => f.label === m.label);
                                     const unit = m.isStandardSize ? '' : (fieldConfig?.unit || 'In');
                                     return (
                                        <div key={m.label} className="flex justify-between items-end border-b border-orange-50/50 pb-1 group">
                                           <span className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] opacity-50 truncate max-w-[110px]" title={m.label}>
                                              {m.label}
                                           </span>
                                           <div className="flex items-baseline gap-1 text-right">
                                              <span className="text-xs font-black italic tracking-tight text-[#3a525d]">{m.value}</span>
                                              {unit && <span className="text-[7px] font-black uppercase text-zinc-300">{unit}</span>}
                                           </div>
                                        </div>
                                     );
                                  })}
                               </div>
                            </div>
                          );
                        })}
                        
                        {lastMeasurement && (
                          <div className="space-y-4">
                            <div className="pt-3 flex justify-between items-center border-t border-orange-100/50 mt-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-orange-600 uppercase">Captured By</span>
                                    <span className="text-[9px] font-bold text-[#3a525d] opacity-60">{lastMeasurement.user_profiles?.full_name || 'System'}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-orange-600 uppercase">Suggested Size</span>
                                    <span className="px-3 py-1 bg-white rounded-lg font-black text-[#3a525d] shadow-sm">{lastMeasurement.suggested_size}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 shadow-sm animate-in zoom-in duration-500">
                                <ShieldCheck size={14} strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Measured</span>
                            </div>
                          </div>
                        )}
                     </div>
                  </Card>
                )}
            </div>

            {/* Active Measurement Profile & Sizing Entry Form */}
            <div className="lg:col-span-2 space-y-8">
                {lastMeasurement && (
                  <Card className="p-8 md:p-10 border-2 border-emerald-500/25 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 rounded-[3rem] shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-emerald-500/15">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                          <ShieldCheck size={30} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-2xl font-black italic tracking-tighter text-[#3a525d]">Active Measurement on File</h3>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-xs ${
                              lastMeasurement.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {lastMeasurement.status === 'Approved' ? 'Verified for Commercial Orders' : 'Pending Admin Approval'}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-bold mt-1.5 flex items-center gap-2">
                            <span>Recorded {new Date(lastMeasurement.recorded_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>By: {lastMeasurement.user_profiles?.full_name || 'Staff'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-start md:self-auto">
                        <div className="px-5 py-2.5 bg-white rounded-2xl border border-emerald-200/80 shadow-sm text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Active Size</p>
                          <p className="text-2xl font-black italic text-[#3a525d] leading-none mt-0.5">{lastMeasurement.suggested_size}</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-6 space-y-4">
                      {lastMeasurement.status === 'Approved' ? (
                        <p className="text-xs text-[#3a525d] leading-relaxed font-medium">
                          <strong className="text-emerald-800 font-bold">Reusable for Subsequent Orders: </strong>
                          This member already has verified measurements in the ERP. These metrics are <strong>automatically reused</strong> whenever new dress orders, annual batches, or quotation allocations are created for {selectedMember.full_name}. No re-entry is necessary unless their physical fitting has changed.
                        </p>
                      ) : (
                        <p className="text-xs text-[#3a525d] leading-relaxed font-medium">
                          <strong className="text-amber-800 font-bold">Awaiting Admin Approval: </strong>
                          These metrics have been recorded and are currently in the <strong>Admin Approvals Queue</strong>. Once approved by an Admin or Head Tailor at <code>Admin &gt; Approvals &gt; Measurements</code>, they will be released for repeat commercial orders and job cards.
                        </p>
                      )}

                      {/* Snapshot of recorded product sizes / metrics */}
                      {lastMeasurement.dynamic_data && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                          {Object.entries(lastMeasurement.dynamic_data).map(([prodName, prodData]: [string, any]) => {
                            const display = extractGarmentDisplayMetrics(prodName, prodData, sizeCharts);
                            return (
                              <div key={prodName} className="p-3.5 bg-white rounded-2xl border border-emerald-100 shadow-xs">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b] truncate">{prodName}</p>
                                  <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    display.strategy === 'us_size_chart' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {display.strategy === 'us_size_chart' ? 'US Size' : 'Bespoke'}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-[#3a525d] leading-snug">{display.summaryText}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-emerald-500/15 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span className="text-[11px] font-black uppercase tracking-wide">
                          Active in Commercial Quotations & Factory Job Cards
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setSelectedMember(null)}
                          className="h-11 px-5 rounded-2xl bg-white hover:bg-zinc-100 text-[#3a525d] font-black uppercase text-[10px] tracking-wider border border-zinc-200"
                        >
                          Select Next Member
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setIsEditingMeasurement(!isEditingMeasurement)}
                          className="h-11 px-6 rounded-2xl bg-[#2d8d9b] hover:bg-[#3a525d] text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-md shadow-[#2d8d9b]/20"
                        >
                          <Ruler size={14} />
                          {isEditingMeasurement ? 'Hide Update Form' : 'Update Sizing / Log New Fitting'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Sizing Entry / Edit Form */}
                {(!lastMeasurement || isEditingMeasurement) && (
                <Card className="p-10 border-none shadow-2xl rounded-[3rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                            {lastMeasurement ? <Ruler size={20} /> : <Clock size={20} />}
                         </div>
                         <div>
                            <h3 className="text-xl font-black italic tracking-tighter text-[#3a525d]">
                              {lastMeasurement ? 'Update Sizing / Log New Fitting' : 'New Sizing Entry'}
                            </h3>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] opacity-60">
                              {lastMeasurement ? 'Pre-populated with previous metrics — only edit fields that changed' : 'Record initial metrics for this member'}
                            </p>
                         </div>
                      </div>
                      
                      {selectedTemplate && (
                        <div className="flex flex-wrap gap-2 md:justify-end max-w-md">
                           {(selectedMember.gender === 'Female' ? selectedTemplate.girls_config : selectedTemplate.boys_config)?.map((item: any) => {
                              const prod = products.find(p => p.id === item.product_id);
                              return (
                                 <div key={item.product_id} className="px-3 py-1.5 bg-[#2d8d9b]/5 border border-[#2d8d9b]/10 rounded-xl flex items-center gap-2">
                                    <Package size={10} className="text-[#2d8d9b]" />
                                    <span className="text-[10px] font-black uppercase text-[#3a525d]">{prod?.name} ({prod?.art_number})</span>
                                    <span className="text-[9px] font-bold text-[#2d8d9b] bg-white px-2 rounded-lg ml-1">x{item.quantity}</span>
                                 </div>
                              );
                           })}
                        </div>
                      )}

                      {availableTemplates.length > 1 && (
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 rounded-xl border border-amber-200 shrink-0">
                          <Library size={13} className="text-amber-800" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">Switch Bundle:</span>
                          <select
                            value={selectedTemplate?.id || ''}
                            onChange={(e) => {
                              const found = availableTemplates.find(t => String(t.id) === e.target.value);
                              if (found) setSelectedTemplate(found);
                            }}
                            className="text-xs font-bold text-[#3a525d] bg-white border border-amber-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]"
                          >
                            {availableTemplates.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({selectedMember.gender === 'Female' ? t.girls_config?.length : t.boys_config?.length} items)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                   </div>

                  <form 
                    key={selectedMember.id + (lastMeasurement?.recorded_at || '') + (selectedTemplate?.id || '')}
                    onSubmit={handleSave} 
                    className="space-y-10"
                  >
                    {!selectedTemplate ? (
                       <div className="py-20 text-center opacity-30 italic">
                          <Package size={48} className="mx-auto mb-4" />
                          <p className="text-sm font-black uppercase tracking-widest">Select a Template to begin Sizing</p>
                       </div>
                    ) : (
                       <div className="space-y-12">
                          {(selectedMember.gender === 'Female' ? selectedTemplate.girls_config : selectedTemplate.boys_config)?.map((item: any) => {
                             const prod = products.find(p => p.id === item.product_id);
                             if (!prod) return null;

                             return (
                               <div key={prod.id} className="p-8 bg-zinc-50/50 rounded-[2.5rem] border border-zinc-100/50">
                                  <div className="flex items-center gap-3 mb-8">
                                     <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#2d8d9b]">
                                        <Package size={24} />
                                     </div>
                                     <div>
                                        <div className="flex items-center gap-2">
                                           <h4 className="text-lg font-black italic tracking-tighter text-[#3a525d]">{prod.name} ({prod.art_number})</h4>
                                           <span className="px-2 py-0.5 bg-[#2d8d9b] text-white text-[10px] font-black rounded-lg">x{item.quantity}</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">Sizing requirements</p>
                                     </div>
                                  </div>

                                  {/* Sizing Mode Switcher: Strictly Mutually Exclusive */}
                                   <div className="flex items-center gap-2 mb-8 p-1.5 bg-zinc-100/80 rounded-2xl w-fit border border-zinc-200/60">
                                     <button
                                       type="button"
                                       disabled={sizeCharts.length === 0}
                                       onClick={() => setProductSizingModes(prev => ({ ...prev, [prod.id]: 'us_size_chart' }))}
                                       className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                         (productSizingModes[prod.id] || (item.entry_methods?.includes('us_size_chart') ? 'us_size_chart' : 'manual')) === 'us_size_chart'
                                           ? 'bg-white text-[#3a525d] shadow-sm'
                                           : 'text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed'
                                       }`}
                                     >
                                       <Ruler size={13} />
                                       <span>Standard US Size</span>
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => setProductSizingModes(prev => ({ ...prev, [prod.id]: 'manual' }))}
                                       className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                         (productSizingModes[prod.id] || (item.entry_methods?.includes('us_size_chart') ? 'us_size_chart' : 'manual')) === 'manual'
                                           ? 'bg-white text-[#3a525d] shadow-sm'
                                           : 'text-zinc-400 hover:text-zinc-700'
                                       }`}
                                     >
                                       <User size={13} />
                                       <span>Custom Measurement</span>
                                     </button>
                                   </div>

                                   {/* Dynamic Strategy UI: Strictly Either Standard US Size OR Custom Measurement */}
                                   {(productSizingModes[prod.id] || (item.entry_methods?.includes('us_size_chart') ? 'us_size_chart' : 'manual')) === 'us_size_chart' ? (
                                     <div className="space-y-12">
                                        {(() => {
                                           const chart = getResolvedChart(prod);
                                           
                                           return (
                                             <>
                                               {/* Size Chart Switcher / Indicator Bar */}
                                               <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-100/70 rounded-2xl border border-zinc-200/60">
                                                 <div className="flex items-center gap-2">
                                                   <Ruler size={16} className="text-[#2d8d9b]" />
                                                   <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">Active Size Chart:</span>
                                                   <span className="text-xs font-bold text-[#2d8d9b]">{chart?.name || 'Standard Chart'}</span>
                                                   {chart?.unit && <span className="text-[10px] text-zinc-400 font-bold">({chart.unit})</span>}
                                                 </div>
                                                 {sizeCharts.length > 1 && (
                                                   <div className="flex items-center gap-2">
                                                     <span className="text-[10px] font-black uppercase text-zinc-400">Switch Chart:</span>
                                                     <select
                                                       value={chart?.id || ''}
                                                       onChange={(e) => setProductAssignedChart(prev => ({ ...prev, [prod.id]: e.target.value }))}
                                                       className="text-xs font-bold bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-[#3a525d] focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]"
                                                     >
                                                       {sizeCharts.map((c: any) => (
                                                         <option key={c.id} value={c.id}>
                                                           {c.name} {c.unit ? `(${c.unit})` : ''}
                                                         </option>
                                                       ))}
                                                     </select>
                                                   </div>
                                                 )}
                                               </div>

                                               {chart?.metric_groups?.map((group: any) => {
                                                 const groupSizes = group.data?.map((d: any) => d.size) || [];
                                                 const selectionKey = `${prod.id}-${group.label}`;
                                                 
                                                 // Resolve current selection: state first, then history
                                                 const historyVal = lastMeasurement?.dynamic_data?.[prod.name]?.selected_size?.[group.label];
                                                 const currentSize = selectedSizes[selectionKey] || historyVal;

                                                 return (
                                                    <div key={group.label} className="space-y-6">
                                                       <div className="flex items-center justify-between">
                                                          <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                                                             Select {group.label}
                                                          </label>
                                                          <div className="flex items-center gap-2 text-[#2d8d9b]">
                                                             <Ruler size={12} />
                                                             <span className="text-[9px] font-black uppercase tracking-widest">{chart?.name || 'Standard Chart'}</span>
                                                          </div>
                                                       </div>

                                                       <input type="hidden" name={selectionKey} value={currentSize || ''} />
                                                       
                                                       <div className="flex flex-wrap gap-4">
                                                          {groupSizes.map((size: string) => {
                                                             const isSelected = currentSize === size;
                                                             const dimVal = group.data?.find((d: any) => d.size === size)?.value;
                                                             return (
                                                                <button
                                                                   key={size}
                                                                   type="button"
                                                                   onClick={() => setSelectedSizes(prev => ({...prev, [selectionKey]: size}))}
                                                                   className={`min-w-[84px] h-[72px] px-3 py-2 flex flex-col items-center justify-center border-2 rounded-2xl transition-all font-black relative group cursor-pointer ${
                                                                      isSelected 
                                                                      ? 'bg-[#2d8d9b] border-[#2d8d9b] text-white shadow-xl scale-105 z-10' 
                                                                      : 'bg-white border-zinc-100 text-[#3a525d] hover:border-[#2d8d9b]/30'
                                                                   }`}
                                                                >
                                                                   <span className="text-sm font-black">{size}</span>
                                                                   {dimVal && (
                                                                      <span className={`text-[8.5px] font-bold tracking-tight mt-0.5 ${isSelected ? 'text-white/80' : 'text-zinc-400 group-hover:text-[#2d8d9b]'}`}>
                                                                         {dimVal}{chart.unit ? ` ${chart.unit}` : ''}
                                                                      </span>
                                                                   )}
                                                                   {isSelected && (
                                                                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                                                         <ShieldCheck size={12} className="text-[#2d8d9b]" />
                                                                      </div>
                                                                   )}
                                                                </button>
                                                             );
                                                          })}
                                                       </div>
                                                    </div>
                                                 );
                                               })}

                                              {/* Live Reference Card */}
                                              <div className="bg-[#fcf8f5] p-8 rounded-[2.5rem] border border-[#fce4d4]/50 shadow-inner">
                                                 <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-1.5 h-6 bg-[#2d8d9b] rounded-full" />
                                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3a525d]">
                                                       Live Chart Reference
                                                    </h5>
                                                 </div>
                                                 
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-8">
                                                    {chart?.metric_groups?.map((group: any) => {
                                                       const selectionKey = `${prod.id}-${group.label}`;
                                                       const currentVal = selectedSizes[selectionKey] || lastMeasurement?.dynamic_data?.[prod.name]?.selected_size?.[group.label];
                                                       const metricValue = group.data.find((d: any) => d.size === currentVal)?.value || '--';
                                                       
                                                       return (
                                                          <div key={group.label} className="bg-white p-6 rounded-3xl shadow-sm border border-[#fce4d4]/20 flex flex-col items-center group hover:bg-[#2d8d9b] transition-all">
                                                             <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-white/60">{group.label}</span>
                                                             {currentVal && <span className="text-[7px] font-bold text-[#2d8d9b] mb-1 group-hover:text-white/80">SIZE: {currentVal}</span>}
                                                             <div className="flex items-baseline gap-1 mt-2">
                                                                <span className="text-xl font-black italic tracking-tighter text-[#3a525d] group-hover:text-white">{metricValue}</span>
                                                                <span className="text-[8px] font-black uppercase text-zinc-300 group-hover:text-white/40">{chart.unit}</span>
                                                             </div>
                                                          </div>
                                                       );
                                                    })}
                                                 </div>
                                              </div>
                                            </>
                                          );
                                       })()}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                                      {(prod.measurements || []).map((label: string) => {
                                          const field = measurementFields.find(f => f.label === label);
                                          const historyVal = lastMeasurement?.dynamic_data?.[prod.name]?.[label] || '';
                                          
                                          return (
                                            <Input 
                                              key={`${prod.id}-${label}`}
                                              name={`${prod.id}-${label}`} 
                                              label={label} 
                                              suffix={field?.unit || 'In'}
                                              defaultValue={historyVal} 
                                              type="number" 
                                              step="0.1" 
                                              required={field?.is_required}
                                              className={historyVal ? 'border-[#2d8d9b]/20 bg-white shadow-sm' : 'bg-white shadow-sm border-zinc-100'}
                                            />
                                          );
                                      })}
                                    </div>
                                  )}
                               </div>
                             );
                          })}
                       </div>
                    )}

                    <div className="md:col-span-2 pt-8 border-t border-zinc-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <Select 
                          name="suggested_size" 
                          label="Suggested Size" 
                          required
                          defaultValue={lastMeasurement?.suggested_size}
                          options={[
                            { label: 'Small (S)', value: 'S' }, { label: 'Medium (M)', value: 'M' },
                            { label: 'Large (L)', value: 'L' }, { label: 'Extra Large (XL)', value: 'XL' },
                            { label: '2XL', value: '2XL' }, { label: 'Custom', value: 'Custom' }
                          ]}
                       />
                       <Select 
                          name="recorded_by" 
                          label="Recorded By (Staff/Admin)" 
                          defaultValue={typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').id : ''}
                          options={staff}
                       />
                       
                    </div>
                    <div className="md:col-span-2 pt-8 border-t border-zinc-50 grid grid-cols-1 gap-8">
                       <Input 
                          name="notes" 
                          label="Special Tailoring Instructions" 
                          defaultValue={lastMeasurement?.notes}
                          placeholder="e.g. Loose fit on sleeves" 
                       />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-zinc-100">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                             <Clock size={16} />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-xs font-black uppercase text-[#3a525d] tracking-wide">
                                Submits to Admin Approval Queue
                             </span>
                             <span className="text-[10px] text-zinc-400 font-medium">
                                Sizing enters as Pending and will be audited at Admin &gt; Approvals before release
                             </span>
                          </div>
                       </div>

                       <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                          {lastMeasurement && isEditingMeasurement && (
                             <Button 
                                type="button" 
                                variant="secondary"
                                onClick={() => setIsEditingMeasurement(false)}
                                className="h-16 px-8 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-[#3a525d] font-black uppercase text-[10px] tracking-wider"
                             >
                                Cancel
                             </Button>
                          )}
                          <Button 
                            type="submit" 
                            isLoading={isLoading}
                            className="h-16 px-14 rounded-2xl bg-[#3a525d] hover:bg-[#2d8d9b] text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-xl flex gap-3 transition-opacity"
                          >
                            <Save size={20} />
                            {lastMeasurement ? 'Submit Updated Fitting' : 'Submit Sizing for Approval'}
                          </Button>
                       </div>
                    </div>
                  </form>
               </Card>
               )}
            </div>
        </div>
      )}

      <LabelConfigModal 
        isOpen={isLabelModalOpen} 
        onClose={async () => {
          setIsLabelModalOpen(false);
          // Re-fetch config to show new labels immediately
          const configRes = await api.get('/measurements/config');
          setMeasurementFields(configRes.data);
        }} 
      />

      <AdHocFieldModal 
        isOpen={isAdHocModalOpen}
        onClose={() => setIsAdHocModalOpen(false)}
        onAdd={handleAddExtraField}
      />
    </div>
  );
}
