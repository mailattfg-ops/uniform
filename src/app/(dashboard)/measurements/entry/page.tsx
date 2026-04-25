'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Search, Ruler, User, ShieldCheck, CheckCircle2, Save, History, Scale, Building2, Library, Settings2, Clock, Plus, Package, Info } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LabelConfigModal } from '../_components/LabelConfigModal';
import { AdHocFieldModal } from '../_components/AdHocFieldModal';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MeasurementEntryPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
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
  const [lastMeasurement, setLastMeasurement] = useState<any>(null);
  
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
    setMembers([]);
  };

  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  // 3. Fetch Members or Single Member if param exists
  useEffect(() => {
    const fetchMembers = async () => {
      if (studentIdParam) {
        setIsDataLoading(true);
        try {
          const response = await api.get(`/members`); 
          const member = response.data.find((m: any) => m.id.toString() === studentIdParam);
          if (member) {
            setSelectedMember(member);
            setSelectedOrg(member.organization_id.toString());
            setSelectedDept(member.department_id.toString());
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
        return;
      }
      setIsDataLoading(true);
      try {
        const response = await api.get(`/members?classId=${selectedDept}`);
        setMembers(response.data);
      } catch (err) {
        toast.error('Failed to load members');
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchMembers();
  }, [selectedDept, studentIdParam]);

  // 4. Fetch History and Templates when Member is selected
  useEffect(() => {
    const fetchMemberContext = async () => {
      if (!selectedMember) {
        setAvailableTemplates([]);
        setSelectedTemplate(null);
        setLastMeasurement(null);
        return;
      }

      try {
        // Fetch applicable templates for this organization
        const templRes = await api.get(`/templates?orgId=${selectedMember.organization_id}`);
        // Filter by dept (templates store array of department IDs)
        const relevant = templRes.data.filter((t: any) => 
            t.department_ids?.includes(selectedMember.department_id)
        );
        setAvailableTemplates(relevant);
        
        if (relevant.length === 1) {
            setSelectedTemplate(relevant[0]);
        }

        const historyRes = await api.get(`/measurements/history/${selectedMember.id}`);
        if (historyRes.data && historyRes.data.length > 0) {
            setLastMeasurement(historyRes.data[0]);
        } else {
            setLastMeasurement(null);
        }
      } catch (err) {
        console.error('History or Template fetch failed:', err);
      }
    };
    fetchMemberContext();
  }, [selectedMember]);

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
        // Strategy check
        const strategy = item.entry_methods?.[0] || 'manual';
        
        if (strategy === 'us_size_chart') {
          const chart = sizeCharts.find(c => c.id === prod.size_chart_id);
          const selections: {[key: string]: string} = {};
          
          chart?.metric_groups?.forEach((group: any) => {
            const val = formData.get(`${prod.id}-${group.label}`);
            if (val) selections[group.label] = val.toString();
          });

          dynamic_data[prod.name] = {
            selected_size: selections,
            strategy: 'us_size_chart',
            chart_id: prod.size_chart_id
          };
        } else {
          dynamic_data[prod.name] = {
            strategy: 'manual'
          };
          (prod.measurements || []).forEach((label: string) => {
            dynamic_data[prod.name][label] = formData.get(`${prod.id}-${label}`);
          });
        }
      }
    });

    try {
      await api.post('/measurements/record', {
        member_id: selectedMember.id,
        suggested_size,
        notes,
        dynamic_data,
        recorded_by
      });
      // Deep Debugging & Optimistic Update
      console.log('[SizingHub] Attempting update for member:', selectedMember.id);
      setMembers(prev => {
        const updated = prev.map(m => {
          if (String(m.id) === String(selectedMember.id)) {
            console.log('[SizingHub] Match found. Injecting pending status for:', m.full_name);
            return { ...m, measurement_status: 'Pending' };
          }
          return m;
        });
        return updated;
      });

      // Wait 300ms for DB index to catch up before re-fetch
      setTimeout(async () => {
        const response = await api.get(`/members?classId=${selectedDept}`);
        console.log('[SizingHub] Backend state synced:', response.data.find((m: any) => String(m.id) === String(selectedMember.id)));
        setMembers(response.data);
      }, 300);

      setSelectedMember(null);
      setSelectedTemplate(null);
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
           <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Sizing Hub</h1>
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

                {/* TEMPLATE PICKER */}
                <Card className="p-8 border-none bg-white shadow-xl">
                   <h3 className="text-sm font-black uppercase tracking-widest text-[#3a525d] mb-4 flex items-center gap-2">
                      <Library size={14} className="text-[#2d8d9b]" />
                      1. Select Bundle Template
                   </h3>
                   {availableTemplates.length === 0 ? (
                      <p className="text-xs text-orange-500 font-bold bg-orange-50 p-4 rounded-xl border border-orange-100">
                        No uniform templates defined for this class. Please define one in Measurements {'>'} Templates.
                      </p>
                   ) : (
                      <div className="space-y-3">
                         {availableTemplates.map(t => (
                            <button 
                              key={t.id}
                              onClick={() => setSelectedTemplate(t)}
                              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                                 selectedTemplate?.id === t.id 
                                 ? 'border-[#2d8d9b] bg-[#2d8d9b]/5 shadow-lg' 
                                 : 'border-zinc-50 bg-zinc-50/50 hover:border-zinc-200'
                              }`}
                            >
                               <div className="text-left">
                                  <p className={`font-black text-xs ${selectedTemplate?.id === t.id ? 'text-[#2d8d9b]' : 'text-[#3a525d]'}`}>
                                     {t.name}
                                  </p>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                     {selectedMember.gender === 'Female' ? t.girls_config?.length : t.boys_config?.length} Products Linked
                                  </p>
                               </div>
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                 selectedTemplate?.id === t.id ? 'border-[#2d8d9b] bg-[#2d8d9b]' : 'border-zinc-200 group-hover:border-zinc-300'
                               }`}>
                                  {selectedTemplate?.id === t.id && <div className="w-2 h-2 bg-white rounded-full" />}
                               </div>
                            </button>
                         ))}
                      </div>
                   )}
                </Card>

                {/* HISTORICAL PREVIEW CARD */}
                <Card className={`hidden p-6 border-none shadow-xl ${lastMeasurement ? 'bg-orange-50/80 border border-orange-100' : 'bg-zinc-50 opacity-40'}`}>
                   <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lastMeasurement ? 'bg-orange-100 text-orange-600' : 'bg-zinc-100 text-zinc-400'}`}>
                         <History size={20} />
                      </div>
                      <div>
                         <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d]">Previous Record</h4>
                         <p className="text-[9px] font-bold text-zinc-400">
                           {lastMeasurement ? `Recorded on ${new Date(lastMeasurement.recorded_at).toLocaleDateString()}` : 'No previous data found'}
                         </p>
                      </div>
                   </div>

                     <div className="space-y-6">
                        {lastMeasurement && Object.entries(lastMeasurement.dynamic_data || {}).map(([prodName, prodData]: [string, any]) => {
                          // Handle Nested Structure (New)
                          if (typeof prodData === 'object' && prodData !== null) {
                            return (
                              <div key={prodName} className="space-y-3 pb-4 border-b border-orange-100 last:border-0">
                                 <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{prodName}</h5>
                                 <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                                    {Object.entries(prodData).map(([label, val]: [string, any]) => {
                                       const fieldConfig = measurementFields.find(f => f.label === label);
                                       const unit = fieldConfig?.unit || 'In';
                                       return (
                                          <div key={label} className="flex justify-between items-end border-b border-orange-50/50 pb-1 group">
                                             <span className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] opacity-50">{label}</span>
                                             <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-black italic tracking-tighter text-[#3a525d]">{String(val)}</span>
                                                <span className="text-[7px] font-black uppercase text-zinc-300">{unit}</span>
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                            );
                          }
                          
                          // Handle Flat Structure (Legacy)
                          const fieldConfig = measurementFields.find(f => f.label === prodName);
                          const unit = fieldConfig?.unit || 'In';
                          return (
                            <div key={prodName} className="flex justify-between items-end border-b border-orange-50 pb-1">
                               <span className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] opacity-50">{prodName}</span>
                               <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-black italic tracking-tighter text-[#3a525d]">{prodData}</span>
                                  <span className="text-[7px] font-black uppercase text-zinc-300">{unit}</span>
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
            </div>

            {/* NEW Measurement Entry Form */}
            <div className="lg:col-span-2">
                <Card className="p-10 border-none shadow-2xl rounded-[3rem]">
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                            <Clock size={20} />
                         </div>
                         <div>
                            <h3 className="text-xl font-black italic tracking-tighter text-[#3a525d]">New Sizing Entry</h3>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] opacity-60">Overwrite or update metrics</p>
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

                                  {/* Dynamic Strategy UI */}
                                  {item.entry_methods?.includes('us_size_chart') ? (
                                    <div className="space-y-12">
                                       {(() => {
                                          const chart = sizeCharts.find(c => c.id === prod.size_chart_id);
                                          
                                          return (
                                            <>
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

                                                      <input type="hidden" name={selectionKey} value={currentSize || ''} required />
                                                      
                                                      <div className="flex flex-wrap gap-4">
                                                         {groupSizes.map((size: string) => {
                                                            const isSelected = currentSize === size;
                                                            return (
                                                               <button
                                                                  key={size}
                                                                  type="button"
                                                                  onClick={() => setSelectedSizes(prev => ({...prev, [selectionKey]: size}))}
                                                                  className={`min-w-[70px] h-[70px] px-4 flex items-center justify-center border-2 rounded-2xl transition-all font-black text-sm relative group ${
                                                                     isSelected 
                                                                     ? 'bg-[#2d8d9b] border-[#2d8d9b] text-white shadow-xl scale-110 z-10' 
                                                                     : 'bg-white border-zinc-100 text-[#3a525d] hover:border-[#2d8d9b]/30'
                                                                  }`}
                                                               >
                                                                  {size}
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

                    <div className="flex justify-end pt-8">
                       <Button 
                        type="submit" 
                        isLoading={isLoading}
                        className="h-16 px-14 rounded-2xl bg-[#3a525d] hover:bg-[#2d8d9b] text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-xl flex gap-3 transition-opacity"
                       >
                         <Save size={20} />
                         Save Update
                       </Button>
                    </div>
                  </form>
               </Card>
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
