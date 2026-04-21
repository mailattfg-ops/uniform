'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  School as SchoolIcon, 
  GraduationCap, 
  Users, 
  Package, 
  ArrowRight, 
  UserCircle, 
  UserCircle2,
  Trash,
  ChefHatIcon,
  Archive,
  BookOpen
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface UniformTemplate {
  id: number;
  school_id: number;
  name: string;
  classes: number[];
  boys_config: { product_id: number; quantity: number; design_id?: string }[];
  girls_config: { product_id: number; quantity: number; design_id?: string }[];
  schools?: { name: string };
}

interface School {
  id: number;
  name: string;
}

interface ClassRecord {
  id: number;
  grade: string;
  section: string;
  school_id: number;
}

interface Product {
  id: number;
  name: string;
  art_number: string;
}

export default function UniformTemplatesPage() {
  const [templates, setTemplates] = useState<UniformTemplate[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [designs, setDesigns] = useState<{ label: string; value: string }[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UniformTemplate | null>(null);

  // Form State
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [boysConfig, setBoysConfig] = useState<{ product_id: string; quantity: number; design_id?: string }[]>([]);
  const [girlsConfig, setGirlsConfig] = useState<{ product_id: string; quantity: number; design_id?: string }[]>([]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Templates table not yet created or inaccessible');
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools');
      setSchools(res.data);
    } catch (err) {
      toast.error('Failed to load schools');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      toast.error('Failed to load products registry');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.allSettled([
      fetchTemplates(),
      fetchSchools(),
      fetchProducts(),
      api.get('/inventory/designs').then(res => 
        setDesigns(res.data.map((d: any) => ({ label: d.design_code, value: d.id })))
      )
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) {
      api.get(`/schools/classes?schoolId=${selectedSchoolId}`)
        .then(res => setClasses(res.data))
        .catch(() => toast.error('Failed to load classes for school'));
    } else {
      setClasses([]);
    }
  }, [selectedSchoolId]);

  const handleAddProduct = (section: 'boys' | 'girls') => {
    const defaultProd = products.length > 0 ? products[0].id.toString() : '';
    const newItem = { product_id: defaultProd, quantity: 1, design_id: '' };
    if (section === 'boys') setBoysConfig([...boysConfig, newItem]);
    else setGirlsConfig([...girlsConfig, newItem]);
  };

  const handleRemoveProduct = (section: 'boys' | 'girls', index: number) => {
    if (section === 'boys') setBoysConfig(boysConfig.filter((_, i) => i !== index));
    else setGirlsConfig(girlsConfig.filter((_, i) => i !== index));
  };

  const handleUpdateProduct = (section: 'boys' | 'girls', index: number, field: string, value: any) => {
    const config = section === 'boys' ? [...boysConfig] : [...girlsConfig];
    config[index] = { ...config[index], [field]: value };
    if (section === 'boys') setBoysConfig(config);
    else setGirlsConfig(config);
  };

  const handleToggleGrade = (grade: string) => {
    const classIdsInGrade = classes
      .filter(c => c.grade === grade)
      .map(c => c.id);

    const allInGradeSelected = classIdsInGrade.every(id => selectedClasses.includes(id));

    if (allInGradeSelected) {
      setSelectedClasses(selectedClasses.filter(id => !classIdsInGrade.includes(id)));
    } else {
      setSelectedClasses([...new Set([...selectedClasses, ...classIdsInGrade])]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSchoolId || !templateName || selectedClasses.length === 0) {
      toast.error('Please fill all mandatory fields');
      return;
    }

    const payload = {
      school_id: parseInt(selectedSchoolId),
      name: templateName,
      classes: selectedClasses,
      boys_config: boysConfig.map(c => ({ 
        product_id: parseInt(c.product_id), 
        quantity: c.quantity,
        design_id: c.design_id || null 
      })),
      girls_config: girlsConfig.map(c => ({ 
        product_id: parseInt(c.product_id), 
        quantity: c.quantity,
        design_id: c.design_id || null 
      }))
    };

    const loadingToast = toast.loading(editingTemplate ? 'Updating template...' : 'Creating template...');
    try {
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, payload);
        toast.success('Template updated successfully!', { id: loadingToast });
      } else {
        await api.post('/templates', payload);
        toast.success('Template created successfully!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingTemplate(null);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error('Save failed', { id: loadingToast });
    }
  };

  const resetForm = () => {
    setSelectedSchoolId('');
    setTemplateName('');
    setSelectedClasses([]);
    setBoysConfig([]);
    setGirlsConfig([]);
  };

  const startEdit = (t: UniformTemplate) => {
    setEditingTemplate(t);
    setSelectedSchoolId(t.school_id.toString());
    setTemplateName(t.name);
    setSelectedClasses(t.classes || []);
    setBoysConfig(t.boys_config?.map(c => ({ product_id: c.product_id.toString(), quantity: c.quantity, design_id: c.design_id })) || []);
    setGirlsConfig(t.girls_config?.map(c => ({ product_id: c.product_id.toString(), quantity: c.quantity, design_id: c.design_id })) || []);
    setIsAdding(true);
  };

  const columns: Column<UniformTemplate>[] = [
    {
      header: 'Template Name',
      accessor: (t) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#3a525d] border border-zinc-100 italic font-black shadow-inner">
            {t.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{t.name}</p>
            <p className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-widest mt-1">ID: #{t.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'School',
      accessor: (t) => (
        <div className="flex items-center gap-2 text-zinc-500">
          <SchoolIcon size={14} className="text-[#2d8d9b]" />
          <span className="text-xs font-bold">{t.schools?.name}</span>
        </div>
      )
    },
    {
       header: 'Boys Set',
       accessor: (t) => (
         <p className="text-[10px] font-black uppercase text-[#3a525d] bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100 inline-block">
           {t.boys_config?.length || 0} Products
         </p>
       )
    },
    {
        header: 'Girls Set',
        accessor: (t) => (
          <p className="text-[10px] font-black uppercase text-[#2d8d9b] bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100 inline-block">
            {t.girls_config?.length || 0} Products
          </p>
        )
     },
    {
      header: 'Actions',
      accessor: (t) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => startEdit(t)}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={async () => {
              if (confirm('Delete this template?')) {
                await api.delete(`/templates/${t.id}`);
                toast.success('Template deleted');
                fetchData();
              }
            }}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="space-y-10 py-10 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
           <div>
              <h2 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">
                {editingTemplate ? 'Refine Template' : 'Architect Template'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
                Defining uniform bundles for academic sessions
              </p>
           </div>
           <Button variant="secondary" onClick={() => { setIsAdding(false); resetForm(); }}>
              Go Back
           </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Info */}
          <Card className="lg:col-span-1 p-8 space-y-6">
            <h3 className="font-black italic text-lg text-[#3a525d] flex items-center gap-3">
              <SchoolIcon className="text-[#2d8d9b]" size={20} />
              Foundation Details
            </h3>
            
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">Assigned School</label>
                  <Select 
                    options={schools.map(s => ({ label: s.name, value: s.id.toString() }))}
                    value={selectedSchoolId}
                    onChange={setSelectedSchoolId}
                    // placeholder="Select School..."
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">Template Identifier</label>
                  <Input 
                    placeholder="e.g. Nursery Uniform 2024"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
               </div>
            </div>

            <div className="pt-6 border-t border-zinc-100">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 block">Applicable Classes</label>
                {!selectedSchoolId ? (
                   <p className="text-xs text-zinc-300 italic">Select a school to view grades...</p>
                ) : (
                   <div className="grid grid-cols-2 gap-2">
                      {Array.from(new Set(classes.map(c => c.grade))).map(grade => {
                        const isGradeSelected = classes
                          .filter(c => c.grade === grade)
                          .every(c => selectedClasses.includes(c.id));

                        return (
                          <button 
                            key={grade}
                            onClick={() => handleToggleGrade(grade)}
                            className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                              isGradeSelected 
                              ? 'bg-[#3a525d] text-white border-[#3a525d] shadow-lg shadow-[#3a525d]/20' 
                              : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-zinc-100'
                            }`}
                          >
                             <GraduationCap size={12} />
                             Grade {grade}
                          </button>
                        );
                      })}
                   </div>
                )}
            </div>
          </Card>

          {/* Product Sets */}
          <div className="lg:col-span-2 space-y-10">
              {/* BOYS SECTION */}
              <Card className="p-8 border-l-4 border-l-blue-500 shadow-2xl shadow-blue-500/5">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                          <UserCircle size={28} />
                       </div>
                       <div>
                          <h3 className="font-black italic text-xl text-[#3a525d]">Boys Uniform Set</h3>
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600">Male Student Configuration</p>
                       </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="rounded-xl h-10 px-4 text-[9px] font-black gap-2"
                      onClick={() => handleAddProduct('boys')}
                    >
                       <Plus size={14} /> Add Product
                    </Button>
                 </div>

                 <div className="space-y-4">
                    {boysConfig.map((item, idx) => (
                       <div key={idx} className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 group animate-in slide-in-from-right-4 duration-300">
                          <div className="flex-1">
                             <Select 
                               options={products.map(p => ({ label: `${p.name} (${p.art_number})`, value: p.id.toString() }))}
                               value={item.product_id}
                               onChange={(val: string) => handleUpdateProduct('boys', idx, 'product_id', val)}
                             />
                          </div>
                          <div className="flex-1">
                             <Select 
                               placeholder="Design No"
                               options={designs}
                               value={item.design_id || ''}
                               onChange={(val: string) => handleUpdateProduct('boys', idx, 'design_id', val)}
                             />
                          </div>
                          <div className="w-24">
                             <Input 
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateProduct('boys', idx, 'quantity', parseInt(e.target.value))}
                                placeholder="Qty"
                             />
                          </div>
                          <button 
                            onClick={() => handleRemoveProduct('boys', idx)}
                            className="p-3 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                             <Trash size={18} />
                          </button>
                       </div>
                    ))}
                    {boysConfig.length === 0 && <p className="text-center py-6 text-xs text-zinc-300 italic border-2 border-dashed border-zinc-100 rounded-3xl uppercase font-black">No Products Added to Boys Set</p>}
                 </div>
              </Card>

              {/* GIRLS SECTION */}
              <Card className="p-8 border-l-4 border-l-pink-500 shadow-2xl shadow-pink-500/5">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500">
                          <UserCircle2 size={28} />
                       </div>
                       <div>
                          <h3 className="font-black italic text-xl text-[#3a525d]">Girls Uniform Set</h3>
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-pink-600">Female Student Configuration</p>
                       </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="rounded-xl h-10 px-4 text-[9px] font-black gap-2"
                      onClick={() => handleAddProduct('girls')}
                    >
                       <Plus size={14} /> Add Product
                    </Button>
                 </div>

                 <div className="space-y-4">
                    {girlsConfig.map((item, idx) => (
                       <div key={idx} className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 group animate-in slide-in-from-right-4 duration-300">
                          <div className="flex-1">
                             <Select 
                               options={products.map(p => ({ label: `${p.name} (${p.art_number})`, value: p.id.toString() }))}
                               value={item.product_id}
                               onChange={(val: string) => handleUpdateProduct('girls', idx, 'product_id', val)}
                             />
                          </div>
                          <div className="flex-1">
                             <Select 
                               placeholder="Design No"
                               options={designs}
                               value={item.design_id || ''}
                               onChange={(val: string) => handleUpdateProduct('girls', idx, 'design_id', val)}
                             />
                          </div>
                          <div className="w-24">
                             <Input 
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateProduct('girls', idx, 'quantity', parseInt(e.target.value))}
                                placeholder="Qty"
                             />
                          </div>
                          <button 
                            onClick={() => handleRemoveProduct('girls', idx)}
                            className="p-3 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                             <Trash size={18} />
                          </button>
                       </div>
                    ))}
                    {girlsConfig.length === 0 && <p className="text-center py-6 text-xs text-zinc-300 italic border-2 border-dashed border-zinc-100 rounded-3xl uppercase font-black">No Products Added to Girls Set</p>}
                 </div>
              </Card>

              <div className="flex justify-end pt-10">
                 <Button 
                   onClick={handleSubmit}
                   className="h-20 px-20 text-lg font-black italic rounded-[2rem] bg-[#3a525d] hover:bg-[#2d8d9b] text-white shadow-2xl shadow-[#3a525d]/30 gap-4"
                 >
                    Publish Uniform Bundle <ArrowRight />
                 </Button>
              </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Bundle Architect</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Define & Manage school-wide uniform templates</p>
         </div>
         <Button 
            onClick={() => setIsAdding(true)}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
         >
            <Plus size={20} strokeWidth={3} />
            Architect New Set
         </Button>
      </div>

      <DataTable 
        columns={columns}
        data={templates}
        isLoading={isLoading}
        searchPlaceholder="Filter bundles by name or school..."
      />
    </div>
  );
}
