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
  BookOpen,
  Settings2
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface IndustryTemplate {
  id: number;
  organization_id: number;
  name: string;
  department_ids: number[];
  boys_config: { product_id: number; quantity: number; design_id?: string; entry_methods?: string[] }[];
  girls_config: { product_id: number; quantity: number; design_id?: string; entry_methods?: string[] }[];
  organizations?: { name: string };
}

interface Organization {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  organization_id: number;
}

interface Product {
  id: number;
  name: string;
  art_number: string;
  entry_methods?: string[];
}

export default function IndustryTemplatesPage() {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [designs, setDesigns] = useState<{ label: string; value: string }[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IndustryTemplate | null>(null);

  // Form State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [maleConfig, setMaleConfig] = useState<{ product_id: string; quantity: number; design_id?: string; entry_methods?: string[] }[]>([]);
  const [femaleConfig, setFemaleConfig] = useState<{ product_id: string; quantity: number; design_id?: string; entry_methods?: string[] }[]>([]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Template registry inaccessible');
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      setOrganizations(res.data);
    } catch (err) {
      toast.error('Failed to load organizations');
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
      fetchOrganizations(),
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
    if (selectedOrgId) {
      api.get(`/departments?orgId=${selectedOrgId}`)
        .then(res => setDepartments(res.data))
        .catch(() => toast.error('Failed to load departments'));
    } else {
      setDepartments([]);
    }
  }, [selectedOrgId]);

  const handleAddProduct = (section: 'male' | 'female') => {
    const newItem = { product_id: '', quantity: 1, design_id: '', entry_methods: ['manual'] };
    if (section === 'male') setMaleConfig([...maleConfig, newItem]);
    else setFemaleConfig([...femaleConfig, newItem]);
  };

  const handleRemoveProduct = (section: 'male' | 'female', index: number) => {
    if (section === 'male') setMaleConfig(maleConfig.filter((_, i) => i !== index));
    else setFemaleConfig(femaleConfig.filter((_, i) => i !== index));
  };

  const handleUpdateProduct = (section: 'male' | 'female', index: number, field: string, value: any) => {
    const config = section === 'male' ? [...maleConfig] : [...femaleConfig];
    
    if (field === 'product_id' && value) {
        const prod = products.find(p => p.id.toString() === value);
        if (prod) {
            config[index] = { ...config[index], [field]: value, entry_methods: prod.entry_methods || ['manual'] };
        } else {
            config[index] = { ...config[index], [field]: value };
        }
    } else {
        config[index] = { ...config[index], [field]: value };
    }

    if (section === 'male') setMaleConfig(config);
    else setFemaleConfig(config);
  };

  const handleToggleDept = (deptId: number) => {
    if (selectedDepts.includes(deptId)) {
        setSelectedDepts(selectedDepts.filter(id => id !== deptId));
    } else {
        setSelectedDepts([...selectedDepts, deptId]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrgId || !templateName || selectedDepts.length === 0) {
      toast.error('Please fill all mandatory fields');
      return;
    }

    const payload = {
      organization_id: parseInt(selectedOrgId),
      name: templateName,
      department_ids: selectedDepts,
      boys_config: maleConfig.map(c => ({ 
        product_id: parseInt(c.product_id), 
        quantity: c.quantity,
        design_id: c.design_id || null,
        entry_methods: c.entry_methods || ['manual']
      })),
      girls_config: femaleConfig.map(c => ({ 
        product_id: parseInt(c.product_id), 
        quantity: c.quantity,
        design_id: c.design_id || null,
        entry_methods: c.entry_methods || ['manual']
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
    setSelectedOrgId('');
    setTemplateName('');
    setSelectedDepts([]);
    setMaleConfig([]);
    setFemaleConfig([]);
  };

  const startEdit = (t: IndustryTemplate) => {
    setEditingTemplate(t);
    setSelectedOrgId(t.organization_id.toString());
    setTemplateName(t.name);
    setSelectedDepts(t.department_ids || []);
    setMaleConfig(t.boys_config?.map(c => ({ 
        product_id: c.product_id.toString(), 
        quantity: c.quantity, 
        design_id: c.design_id,
        entry_methods: c.entry_methods || ['manual']
    })) || []);
    setFemaleConfig(t.girls_config?.map(c => ({ 
        product_id: c.product_id.toString(), 
        quantity: c.quantity, 
        design_id: c.design_id,
        entry_methods: c.entry_methods || ['manual']
    })) || []);
    setIsAdding(true);
  };

  const columns: Column<IndustryTemplate>[] = [
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
      header: 'Organization',
      accessor: (t) => (
        <div className="flex items-center gap-2 text-zinc-500">
          <SchoolIcon size={14} className="text-[#2d8d9b]" />
          <span className="text-xs font-bold">{t.organizations?.name}</span>
        </div>
      )
    },
    {
       header: 'Male Config',
       accessor: (t) => (
         <p className="text-[10px] font-black uppercase text-[#3a525d] bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100 inline-block">
           {t.boys_config?.length || 0} Products
         </p>
       )
    },
    {
        header: 'Female Config',
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
              if (confirm('Permanently remove this template?')) {
                await api.delete(`/templates/${t.id}`);
                toast.success('Template purged');
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
                {editingTemplate ? 'Refine Logic' : 'Architect Template'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
                Defining specialized bundles for industry sectors
              </p>
           </div>
           <Button variant="secondary" onClick={() => { setIsAdding(false); resetForm(); }}>
              Go Back
           </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <Card className="lg:col-span-1 p-8 space-y-6 h-fit">
            <h3 className="font-black italic text-lg text-[#3a525d] flex items-center gap-3">
              <Settings2 className="text-[#2d8d9b]" size={20} />
              Foundation Details
            </h3>
            
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">Assigned Organization</label>
                  <Select 
                    options={organizations.map(o => ({ label: o.name, value: o.id.toString() }))}
                    value={selectedOrgId}
                    onChange={setSelectedOrgId}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">Template Identifier</label>
                  <Input 
                    placeholder="e.g. Factory Floor Set A"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
               </div>
            </div>

            <div className="pt-6 border-t border-zinc-100">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 block">Applicable Departments</label>
                {!selectedOrgId ? (
                   <p className="text-xs text-zinc-300 italic">Select an organization first...</p>
                ) : (
                   <div className="grid grid-cols-1 gap-2">
                      {departments.map(dept => (
                        <button 
                          key={dept.id}
                          onClick={() => handleToggleDept(dept.id)}
                          className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                            selectedDepts.includes(dept.id) 
                            ? 'bg-[#3a525d] text-white border-[#3a525d] shadow-lg shadow-[#3a525d]/20' 
                            : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-zinc-100'
                          }`}
                        >
                           <BookOpen size={12} />
                           {dept.name}
                        </button>
                      ))}
                   </div>
                )}
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-10">
              <Card className="p-8 border-l-4 border-l-blue-500 shadow-2xl shadow-blue-500/5">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                          <UserCircle size={28} />
                       </div>
                       <div>
                          <h3 className="font-black italic text-xl text-[#3a525d]">Male Member Set</h3>
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600">Primary Industry Config</p>
                       </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="rounded-xl h-10 px-4 text-[9px] font-black gap-2"
                      onClick={() => handleAddProduct('male')}
                    >
                       <Plus size={14} /> Add Product
                    </Button>
                 </div>

                 <div className="space-y-4">
                    {maleConfig.map((item, idx) => (
                        <div key={idx} className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-6 group animate-in slide-in-from-right-4 duration-300">
                           <div className="flex items-center gap-4">
                                <div className="flex-[2]">
                                    <Select 
                                        options={products.map(p => ({ label: `${p.name} (${p.art_number})`, value: p.id.toString() }))}
                                        value={item.product_id}
                                        onChange={(val: string) => handleUpdateProduct('male', idx, 'product_id', val)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Select 
                                        placeholder="Variation No"
                                        options={designs}
                                        value={item.design_id || ''}
                                        onChange={(val: string) => handleUpdateProduct('male', idx, 'design_id', val)}
                                    />
                                </div>
                                <div className="w-24">
                                    <Input 
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateProduct('male', idx, 'quantity', parseInt(e.target.value))}
                                        placeholder="Qty"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleRemoveProduct('male', idx)}
                                    className="p-3 text-zinc-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash size={18} />
                                </button>
                           </div>

                           {/* Entry Logic Selection */}
                           {item.product_id && (
                             <div className="flex items-center gap-6 px-2 border-t border-zinc-100 pt-4">
                               <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Entry Logic:</p>
                               <div className="flex items-center gap-2">
                                 {['manual', 'us_size_chart'].map(method => {
                                   const prod = products.find(p => p.id.toString() === item.product_id);
                                   const isSupported = prod?.entry_methods?.includes(method);
                                   const isActive = item.entry_methods?.includes(method);

                                   if (!isSupported) return null;

                                   return (
                                     <button
                                       key={method}
                                       onClick={() => {
                                         handleUpdateProduct('male', idx, 'entry_methods', [method]);
                                       }}
                                       className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all ${
                                         isActive 
                                         ? 'bg-[#3a525d] text-white border-[#3a525d] shadow-md shadow-[#3a525d]/20' 
                                         : 'bg-white text-zinc-400 border-zinc-200 hover:border-[#3a525d]/30 font-extrabold'
                                       }`}
                                     >
                                       {method.replace(/_/g, ' ')}
                                     </button>
                                   );
                                 })}
                               </div>
                             </div>
                           )}
                        </div>
                    ))}
                 </div>
              </Card>

              <Card className="p-8 border-l-4 border-l-pink-500 shadow-2xl shadow-pink-500/5">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500">
                          <UserCircle2 size={28} />
                       </div>
                       <div>
                          <h3 className="font-black italic text-xl text-[#3a525d]">Female Member Set</h3>
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-pink-600">Primary Industry Config</p>
                       </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="rounded-xl h-10 px-4 text-[9px] font-black gap-2"
                      onClick={() => handleAddProduct('female')}
                    >
                       <Plus size={14} /> Add Product
                    </Button>
                 </div>

                 <div className="space-y-4">
                    {femaleConfig.map((item, idx) => (
                        <div key={idx} className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-6 group animate-in slide-in-from-right-4 duration-300">
                           <div className="flex items-center gap-4">
                                <div className="flex-[2]">
                                    <Select 
                                        options={products.map(p => ({ label: `${p.name} (${p.art_number})`, value: p.id.toString() }))}
                                        value={item.product_id}
                                        onChange={(val: string) => handleUpdateProduct('female', idx, 'product_id', val)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Select 
                                        placeholder="Variation No"
                                        options={designs}
                                        value={item.design_id || ''}
                                        onChange={(val: string) => handleUpdateProduct('female', idx, 'design_id', val)}
                                    />
                                </div>
                                <div className="w-24">
                                    <Input 
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateProduct('female', idx, 'quantity', parseInt(e.target.value))}
                                        placeholder="Qty"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleRemoveProduct('female', idx)}
                                    className="p-3 text-zinc-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash size={18} />
                                </button>
                           </div>

                           {/* Entry Logic Selection */}
                           {item.product_id && (
                             <div className="flex items-center gap-6 px-2 border-t border-zinc-100 pt-4">
                               <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Entry Logic:</p>
                               <div className="flex items-center gap-2">
                                 {['manual', 'us_size_chart'].map(method => {
                                   const prod = products.find(p => p.id.toString() === item.product_id);
                                   const isSupported = prod?.entry_methods?.includes(method);
                                   const isActive = item.entry_methods?.includes(method);

                                   if (!isSupported) return null;

                                   return (
                                     <button
                                       key={method}
                                       onClick={() => {
                                         handleUpdateProduct('female', idx, 'entry_methods', [method]);
                                       }}
                                       className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all ${
                                         isActive 
                                         ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20' 
                                         : 'bg-white text-zinc-400 border-zinc-200 hover:border-pink-500/30 font-extrabold'
                                       }`}
                                     >
                                       {method.replace(/_/g, ' ')}
                                     </button>
                                   );
                                 })}
                               </div>
                             </div>
                           )}
                        </div>
                    ))}
                 </div>
              </Card>

              <div className="flex justify-end pt-10">
                 <Button 
                   onClick={handleSubmit}
                   className="h-20 px-20 text-lg font-black italic rounded-[2rem] bg-[#3a525d] hover:bg-[#2d8d9b] text-white shadow-2xl shadow-[#3a525d]/30 gap-4"
                 >
                    Publish Template <ArrowRight />
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">Design & Manage industry-specific bundle templates</p>
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
        searchPlaceholder="Filter bundles by name or organization..."
      />
    </div>
  );
}
