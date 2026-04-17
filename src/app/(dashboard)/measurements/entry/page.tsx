'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Search, Ruler, User, ShieldCheck, Save, History, Scale, Building2, Library, Settings2, Clock, Plus } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LabelConfigModal } from '../_components/LabelConfigModal';
import { AdHocFieldModal } from '../_components/AdHocFieldModal';
import { useRouter } from 'next/navigation';

export default function MeasurementEntryPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [measurementFields, setMeasurementFields] = useState<any[]>([]);
  
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
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
        const [schoolsRes, configRes] = await Promise.all([
          api.get('/schools'),
          api.get('/measurements/config')
        ]);
        setSchools(schoolsRes.data.map((s: any) => ({ label: s.name, value: s.id.toString() })));
        setMeasurementFields(configRes.data);
      } catch (err) {
        toast.error('Failed to initialize settings');
      }
    };
    fetchData();
  }, []);

  // 2. Fetch Classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSchool) {
        setClasses([]);
        setSelectedClass('');
        return;
      }
      try {
        const response = await api.get(`/schools/classes?schoolId=${selectedSchool}`);
        setClasses(response.data.map((c: any) => ({ label: c.name, value: c.id.toString() })));
      } catch (err) {
        toast.error('Failed to load classes');
      }
    };
    fetchClasses();
  }, [selectedSchool]);

  // 3. Fetch Students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }
      setIsDataLoading(true);
      try {
        const response = await api.get(`/students?classId=${selectedClass}`);
        setStudents(response.data);
      } catch (err) {
        toast.error('Failed to load students');
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // 4. Fetch History when Student is selected
  useEffect(() => {
    setExtraFields([]); 
    const fetchHistory = async () => {
      if (!selectedStudent) {
        setLastMeasurement(null);
        return;
      }
      try {
        const response = await api.get(`/measurements/student/${selectedStudent.id}`);
        if (response.data && response.data.length > 0) {
          const last = response.data[0];
          setLastMeasurement(last);
          
          // SMART RECALL: If there were extra fields last time, re-inject them!
          const standardLabels = measurementFields.map(f => f.label);
          const historyLabels = Object.keys(last.dynamic_data || {});
          const extras = historyLabels
            .filter(label => !standardLabels.includes(label))
            .map(label => ({ label, unit: 'Inches' }));
          
          setExtraFields(extras);
        }
      } catch (err) {
        console.error('History fetch failed');
      }
    };
    fetchHistory();
  }, [selectedStudent, measurementFields]); // Re-run if student or global config changes

  const handleAddExtraField = (field: { label: string, unit: string }) => {
    setExtraFields([...extraFields, field]);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    const { suggested_size, notes, ...dynamic_data } = rawData;

    try {
      await api.post('/measurements/record', {
        student_id: selectedStudent.id,
        suggested_size,
        notes,
        dynamic_data
      });
      toast.success(`Measurements Updated for ${selectedStudent.full_name}`);
      setSelectedStudent(null);
      setExtraFields([]); // Reset extra fields for next student
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

        {!selectedStudent && (
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl bg-white p-4 rounded-[2rem] border border-[#fce4d4] shadow-sm">
            <div className="flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] mb-2 px-2 flex items-center gap-2">
                 <Building2 size={10} /> School
               </label>
               <Select 
                 name="filter_school" 
                 options={schools} 
                 placeholder="Select..."
                 defaultValue={selectedSchool}
                 onChange={(val) => setSelectedSchool(val)}
               />
            </div>
            <div className="flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] mb-2 px-2 flex items-center gap-2">
                 <Library size={10} /> Class
               </label>
               <Select 
                 name="filter_class" 
                 options={classes.length > 0 ? classes : [{ label: 'Select School...', value: '' }]} 
                 placeholder="Select..."
                 defaultValue={selectedClass}
                 onChange={(val) => setSelectedClass(val)}
                 disabled={!selectedSchool}
               />
            </div>
          </div>
        )}
      </div>

      {!selectedStudent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((s) => (
            <Card 
              key={s.id} 
              className="p-6 cursor-pointer hover:border-[#2d8d9b] hover:shadow-2xl transition-all group border-2 border-transparent"
              onClick={() => setSelectedStudent(s)}
            >
               <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-[#3a525d] font-black italic group-hover:bg-[#2d8d9b] group-hover:text-white transition-all">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                    s.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {s.gender || 'Not Set'}
                  </div>
               </div>
               <h3 className="font-bold text-[#3a525d] text-base leading-tight">{s.full_name}</h3>
               <p className="text-[9px] font-black text-[#2d8d9b] tracking-widest mt-1 opacity-60 uppercase">ID: {s.admission_no}</p>
            </Card>
          ))}
          
          {!selectedClass && (
            <div className="col-span-full py-20 text-center opacity-20">
               <Scale size={64} className="mx-auto mb-4" />
               <p className="text-xl font-black italic tracking-tighter">Choose School & Class to begin</p>
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
            {/* Student Profile & HISTORY */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-8 border-none bg-gradient-to-br from-[#3a525d] to-[#2d8d9b] text-white shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                      <Button 
                        variant="secondary" 
                        onClick={() => setSelectedStudent(null)}
                        className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border-none text-white text-[9px] mb-8"
                      >
                        Back to List
                      </Button>
                      <h2 className="text-3xl font-black italic tracking-tighter mb-4">{selectedStudent.full_name}</h2>
                      <div className="space-y-2 opacity-70">
                         <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck size={14} /> ID: {selectedStudent.admission_no}
                         </div>
                         <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <User size={14} /> Gender: {selectedStudent.gender || 'Not Set'}
                         </div>
                      </div>
                   </div>
                </Card>

                {/* HISTORICAL PREVIEW CARD */}
                <Card className={`p-6 border-none shadow-xl ${lastMeasurement ? 'bg-orange-50/80 border border-orange-100' : 'bg-zinc-50 opacity-40'}`}>
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
                      <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                         {lastMeasurement && Object.entries(lastMeasurement.dynamic_data || {}).map(([label, val]: [string, any]) => {
                            const fieldConfig = measurementFields.find(f => f.label === label);
                            const unit = fieldConfig?.unit || 'In';
                            return (
                              <div key={label} className="flex justify-between items-end border-b border-orange-100 pb-2 group">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-[#f2994a] opacity-70 group-hover:opacity-100 transition-opacity">{label}</span>
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black italic tracking-tighter text-[#3a525d] leading-none">{val}</span>
                                    <span className="text-[8px] font-black uppercase text-zinc-300">{unit}</span>
                                 </div>
                              </div>
                            );
                         })}
                      </div>
                      {lastMeasurement && (
                        <div className="col-span-2 pt-3 flex justify-between items-center">
                           <span className="text-[10px] font-black text-orange-600 uppercase">Suggested Size</span>
                           <span className="px-3 py-1 bg-white rounded-lg font-black text-[#3a525d] shadow-sm">{lastMeasurement.suggested_size}</span>
                        </div>
                      )}
                   </div>
                </Card>
            </div>

            {/* NEW Measurement Entry Form */}
            <div className="lg:col-span-2">
               <Card className="p-10 border-none shadow-2xl rounded-[3rem]">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                            <Clock size={20} />
                         </div>
                         <div>
                            <h3 className="text-xl font-black italic tracking-tighter text-[#3a525d]">New Sizing Entry</h3>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] opacity-60">Overwrite or update metrics</p>
                         </div>
                      </div>
                      
                      {/* INLINE LABEL EDITOR TRIGGER */}
                      <Button 
                        onClick={() => setIsLabelModalOpen(true)}
                        variant="secondary"
                        className="h-10 px-4 rounded-xl bg-zinc-50 border-none text-[#3a525d] text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-100"
                      >
                         <Settings2 size={14} /> Customize Labels
                      </Button>
                   </div>

                  <form 
                    key={selectedStudent.id + (lastMeasurement?.recorded_at || '')}
                    onSubmit={handleSave} 
                    className="space-y-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                       {measurementFields.map((field) => (
                          <Input 
                             key={field.id}
                             name={field.label} 
                             label={`${field.label} (${field.unit || 'In'})`} 
                             defaultValue={lastMeasurement?.dynamic_data?.[field.label] || ''} 
                             type="number" 
                             step="0.1" 
                             required={field.is_required}
                             className={lastMeasurement?.dynamic_data?.[field.label] ? 'border-[#2d8d9b]/20 bg-[#2d8d9b]/5' : ''}
                          />
                        ))}
                       {extraFields.map((field, idx) => (
                          <Input 
                             key={`extra-${idx}`}
                             name={field.label} 
                             label={`${field.label} (${field.unit})`} 
                             defaultValue={lastMeasurement?.dynamic_data?.[field.label] || ''} 
                             type="number" 
                             step="0.1" 
                          />
                        ))}

                        <div className="md:col-span-2">
                           <Button 
                             type="button"
                             onClick={() => setIsAdHocModalOpen(true)}
                             variant="secondary"
                             className="w-full h-12 dashed border-2 border-zinc-100 bg-zinc-50/50 hover:bg-zinc-100 text-[#3a525d] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                           >
                              <Plus size={14} /> Add Student-Specific Metric
                           </Button>
                        </div>
                        
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
                          <Input 
                            name="notes" 
                            label="Special Tailoring Instructions" 
                            defaultValue={lastMeasurement?.notes}
                            placeholder="e.g. Loose fit on sleeves" 
                          />
                       </div>
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
