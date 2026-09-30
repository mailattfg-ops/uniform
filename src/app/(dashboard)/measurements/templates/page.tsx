'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  ArrowRight, 
  UserCircle, 
  UserCircle2,
  BookOpen,
  Settings2,
  UserCheck,
  Building2,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface IndustryTemplate {
  id: number;
  organization_id: number;
  name: string;
  department_ids: number[];
  boys_config: { product_id: number; quantity: number; entry_methods?: string[] }[];
  girls_config: { product_id: number; quantity: number; entry_methods?: string[] }[];
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
  gender?: string;
  entry_methods?: string[];
}

interface EntityDemographics {
  total: number;
  male: number;
  female: number;
  other: number;
  isLoading: boolean;
}

export default function IndustryTemplatesPage() {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IndustryTemplate | null>(null);

  // Form State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [maleConfig, setMaleConfig] = useState<{ product_id: string; quantity: number; entry_methods?: string[] }[]>([]);
  const [femaleConfig, setFemaleConfig] = useState<{ product_id: string; quantity: number; entry_methods?: string[] }[]>([]);
  
  // Organization-level entity state
  const [orgEntities, setOrgEntities] = useState<any[]>([]);
  const [entityDemographics, setEntityDemographics] = useState<EntityDemographics | null>(null);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data || []);
    } catch {
      console.error('Template registry inaccessible');
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      setOrganizations(res.data || []);
    } catch {
      toast.error('Failed to load organizations');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data || []);
    } catch {
      toast.error('Failed to load products registry');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.allSettled([
      fetchTemplates(),
      fetchOrganizations(),
      fetchProducts()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch departments and enrolled members when customer organization changes
  useEffect(() => {
    if (selectedOrgId) {
      api.get(`/departments?orgId=${selectedOrgId}`)
        .then(res => setDepartments(res.data || []))
        .catch(() => toast.error('Failed to load departments'));

      // Fetch enrolled entities for this organization
      setEntityDemographics({ total: 0, male: 0, female: 0, other: 0, isLoading: true });
      api.get(`/quotations/calculate/${selectedOrgId}`)
        .then(res => {
          const entities: any[] = res.data?.entities || [];
          setOrgEntities(entities);

          let male = 0;
          let female = 0;
          let other = 0;
          entities.forEach((e: any) => {
            const g = (e.gender || '').toLowerCase().trim();
            if (g === 'male' || g === 'boy' || g === 'm' || g === 'men' || g === 'boys') male++;
            else if (g === 'female' || g === 'girl' || g === 'f' || g === 'women' || g === 'girls') female++;
            else other++;
          });

          setEntityDemographics({
            total: res.data?.total_entities ?? entities.length,
            male,
            female,
            other,
            isLoading: false
          });
        })
        .catch(() => {
          setOrgEntities([]);
          setEntityDemographics({ total: 0, male: 0, female: 0, other: 0, isLoading: false });
        });
    } else {
      setDepartments([]);
      setOrgEntities([]);
      setEntityDemographics(null);
    }
  }, [selectedOrgId]);

  // Entities belonging specifically to the selected department(s)
  const deptEntities = useMemo(() => {
    if (!selectedOrgId || selectedDepts.length === 0 || orgEntities.length === 0) {
      return [];
    }
    return orgEntities.filter((e: any) => {
      if (e.department_id !== null && e.department_id !== undefined) {
        return selectedDepts.includes(Number(e.department_id));
      }
      // If organization has only 1 department, unassigned members default to it
      if (departments.length === 1 && selectedDepts.includes(departments[0].id)) {
        return true;
      }
      return false;
    });
  }, [orgEntities, selectedDepts, selectedOrgId, departments]);

  // Department-specific gender breakdown
  const deptDemographics = useMemo(() => {
    let male = 0;
    let female = 0;
    let other = 0;

    deptEntities.forEach((e: any) => {
      const g = (e.gender || '').toLowerCase().trim();
      if (g === 'male' || g === 'boy' || g === 'm' || g === 'men' || g === 'boys') {
        male++;
      } else if (g === 'female' || g === 'girl' || g === 'f' || g === 'women' || g === 'girls') {
        female++;
      } else {
        other++;
      }
    });

    return {
      total: deptEntities.length,
      male,
      female,
      other,
      hasMale: male > 0,
      hasFemale: female > 0,
      isUnassigned: deptEntities.length === 0
    };
  }, [deptEntities]);

  // Auto-clear configs if department gender composition does not include that gender
  useEffect(() => {
    if (selectedDepts.length > 0 && !deptDemographics.isUnassigned) {
      if (!deptDemographics.hasFemale && femaleConfig.length > 0) {
        setFemaleConfig([]);
      }
      if (!deptDemographics.hasMale && maleConfig.length > 0) {
        setMaleConfig([]);
      }
    }
  }, [selectedDepts, deptDemographics]);

  // Determine strictly if a product matches target gender (Male vs Female)
  const isProductMatchingGender = (p: Product, target: 'male' | 'female'): boolean => {
    const rawGender = (p.gender || '').toLowerCase().trim();
    const name = (p.name || '').toLowerCase().trim();
    const art = (p.art_number || '').trim();

    // 1. Direct explicit database gender column
    if (rawGender) {
      if (rawGender === 'unisex' || rawGender === 'all') return true;
      if (
        rawGender.includes('female') ||
        rawGender.includes('girl') ||
        rawGender.includes('women') ||
        rawGender === 'f'
      ) {
        return target === 'female';
      }
      if (
        rawGender.includes('male') ||
        rawGender.includes('boy') ||
        rawGender.includes('men') ||
        rawGender === 'm'
      ) {
        return target === 'male';
      }
    }

    // 2. Art number pattern analysis:
    // Option 1: [DressPrefix]-[GenderDigit][Pattern]-[Fit][Allowance] (e.g. 1A-1046-R2, 1A-2047-R3, 4J-1012-R2)
    // Legacy: [Prefix]-[GenderCode]-[Pattern] (e.g. 4J-1-012, 4J-2-012)
    const artParts = art.split('-');
    if (artParts.length >= 2) {
      const middle = artParts[1];
      const genderChar = middle.charAt(0);
      if (genderChar === '1') {
        // Gender code 1 is Male / Boys / Men
        return target === 'male';
      } else if (genderChar === '2') {
        // Gender code 2 is Female / Girls / Women
        return target === 'female';
      } else if (genderChar === '3') {
        // Gender code 3 is Unisex
        return true;
      }
    }

    // 3. Garment name keyword classification
    const hasFemaleKeyword = 
      name.includes('girl') || 
      name.includes('women') || 
      name.includes('female') || 
      name.includes('skirt') || 
      name.includes('pinafore') || 
      name.includes('salwar') || 
      name.includes('kameez') || 
      name.includes('frock') || 
      name.includes('blouse');

    const hasMaleKeyword = 
      name.includes('boy') || 
      name.includes('men') || 
      (name.includes('male') && !name.includes('female'));

    if (hasFemaleKeyword && !hasMaleKeyword) {
      return target === 'female';
    }
    if (hasMaleKeyword && !hasFemaleKeyword) {
      return target === 'male';
    }

    // Fallback: exclude if it contains opposing keywords
    if (target === 'male') {
      return !hasFemaleKeyword;
    }
    if (target === 'female') {
      return !hasMaleKeyword;
    }

    return true;
  };

  // Male configuration: only Male or Unisex products
  const maleProducts = useMemo(() => {
    return products.filter(p => isProductMatchingGender(p, 'male'));
  }, [products]);

  // Female configuration: only Female or Unisex products
  const femaleProducts = useMemo(() => {
    return products.filter(p => isProductMatchingGender(p, 'female'));
  }, [products]);

  const handleAddProduct = (section: 'male' | 'female') => {
    const newItem = { product_id: '', quantity: 1, entry_methods: ['manual'] };
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
      toast.error('Please fill all mandatory fields (Organization, Identifier, and Departments)');
      return;
    }

    const payload = {
      organization_id: parseInt(selectedOrgId),
      name: templateName,
      department_ids: selectedDepts,
      boys_config: maleConfig.map(c => ({ 
        product_id: parseInt(c.product_id), 
        quantity: c.quantity,
        entry_methods: c.entry_methods || ['manual']
      })),
      girls_config: femaleConfig.map(c => ({ 
        product_id: parseInt(c.product_id), 
        quantity: c.quantity,
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
    } catch {
      toast.error('Save failed', { id: loadingToast });
    }
  };

  const resetForm = () => {
    setSelectedOrgId('');
    setTemplateName('');
    setSelectedDepts([]);
    setMaleConfig([]);
    setFemaleConfig([]);
    setOrgEntities([]);
    setEntityDemographics(null);
  };

  const startEdit = (t: IndustryTemplate) => {
    setEditingTemplate(t);
    setSelectedOrgId(t.organization_id.toString());
    setTemplateName(t.name);
    setSelectedDepts(t.department_ids || []);
    setMaleConfig(t.boys_config?.map(c => ({ 
      product_id: c.product_id.toString(), 
      quantity: c.quantity, 
      entry_methods: c.entry_methods || ['manual']
    })) || []);
    setFemaleConfig(t.girls_config?.map(c => ({ 
      product_id: c.product_id.toString(), 
      quantity: c.quantity, 
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
          <Building2 size={14} className="text-[#2d8d9b]" />
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
          <Button
            onClick={() => startEdit(t)}
            variant="secondary"
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10 shadow-none p-0"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={async () => {
              if (confirm('Permanently remove this template?')) {
                await api.delete(`/templates/${t.id}`);
                toast.success('Template purged');
                fetchData();
              }
            }}
            variant="secondary"
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 shadow-none p-0"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  if (isAdding) {
    // Determine which gender provisions are available based on the selected department's members
    const showMaleProvision = selectedDepts.length === 0 || deptDemographics.isUnassigned || deptDemographics.hasMale;
    const showFemaleProvision = selectedDepts.length === 0 || deptDemographics.isUnassigned || deptDemographics.hasFemale;

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
          {/* Left Column: Foundation Details & Applicable Departments */}
          <Card className="lg:col-span-1 p-8 space-y-6 h-fit">
            <h3 className="font-black italic text-lg text-[#3a525d] flex items-center gap-3">
              <Settings2 className="text-[#2d8d9b]" size={20} />
              Foundation Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                  Assigned Organization
                </label>
                <Select 
                  options={organizations.map(o => ({ label: o.name, value: o.id.toString() }))}
                  value={selectedOrgId}
                  onChange={setSelectedOrgId}
                />
              </div>

              {selectedOrgId && (
                <div className="bg-zinc-50 border border-zinc-200/70 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#3a525d] flex items-center gap-1.5">
                      <UserCheck size={14} className="text-[#2d8d9b]" />
                      Customer Roster Demographics
                    </span>
                    {entityDemographics?.isLoading && (
                      <span className="text-[9px] text-[#2d8d9b] font-bold animate-pulse">Scanning...</span>
                    )}
                  </div>

                  {entityDemographics && !entityDemographics.isLoading && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 block">Total Male</span>
                          <span className="text-base font-black text-blue-900 font-mono">
                            {entityDemographics.male}
                          </span>
                        </div>
                        <div className="bg-pink-50 border border-pink-200 p-2.5 rounded-xl text-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-pink-700 block">Total Female</span>
                          <span className="text-base font-black text-pink-900 font-mono">
                            {entityDemographics.female}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold text-center">
                        Total Enrolled: <strong className="text-[#3a525d]">{entityDemographics.total} Members</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                  Template Identifier
                </label>
                <Input 
                  placeholder="e.g. Sales, Service, Operations..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">
                  Applicable Departments
                </label>
                {selectedDepts.length > 0 && (
                  <span className="text-[9px] font-extrabold text-[#2d8d9b] uppercase">
                    {selectedDepts.length} Selected
                  </span>
                )}
              </div>

              {!selectedOrgId ? (
                <p className="text-xs text-zinc-300 italic">Select an organization first...</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {departments.map(dept => (
                    <Button
                      key={dept.id}
                      onClick={() => handleToggleDept(dept.id)}
                      variant="secondary"
                      className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-between shadow-none ${
                        selectedDepts.includes(dept.id) 
                        ? 'bg-[#3a525d] text-white border-[#3a525d] shadow-lg shadow-[#3a525d]/20' 
                        : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen size={12} />
                        {dept.name}
                      </span>
                      {selectedDepts.includes(dept.id) && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {/* Department Gender Summary Banner */}
              {selectedDepts.length > 0 && (
                <div className="mt-4 p-3 bg-zinc-100/80 rounded-xl border border-zinc-200/80 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                    Selected Dept Roster Analysis:
                  </p>
                  {deptDemographics.isUnassigned ? (
                    <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      0 enrolled members in selected dept(s)
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 pt-0.5">
                      {deptDemographics.hasMale && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                          {deptDemographics.male} Men
                        </span>
                      )}
                      {deptDemographics.hasFemale && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-pink-100 text-pink-800 border border-pink-200">
                          {deptDemographics.female} Women
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 font-bold ml-auto">
                        Total: {deptDemographics.total}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Right Columns: Dynamic Gender Provisions */}
          <div className="lg:col-span-2 space-y-10">
            {/* If no departments are selected, show selection prompt */}
            {selectedDepts.length === 0 ? (
              <Card className="p-12 text-center space-y-4 border border-dashed border-zinc-200 bg-zinc-50/50">
                <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
                  <Users size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black uppercase tracking-wider text-[#3a525d]">
                    Select Department(s) To Configure Uniform Bundles
                  </h4>
                  <p className="text-xs text-zinc-400 font-bold max-w-md mx-auto">
                    The template will automatically analyze the gender distribution of enrolled members in the selected department(s) and provide provisions for those genders only.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Single-gender alert banners */}
                {selectedDepts.length > 0 && !deptDemographics.isUnassigned && deptDemographics.hasMale && !deptDemographics.hasFemale && (
                  <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center gap-3 text-blue-900">
                    <UserCircle size={20} className="text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-blue-900">
                        Department Roster: Male Members Only ({deptDemographics.male} Enrolled)
                      </p>
                      <p className="text-[10px] text-blue-700 font-bold">
                        Only Male Member Set provision is enabled. Listing only male and unisex products.
                      </p>
                    </div>
                  </div>
                )}

                {selectedDepts.length > 0 && !deptDemographics.isUnassigned && deptDemographics.hasFemale && !deptDemographics.hasMale && (
                  <div className="p-4 bg-pink-50/80 border border-pink-200/80 rounded-2xl flex items-center gap-3 text-pink-900">
                    <UserCircle2 size={20} className="text-pink-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-pink-900">
                        Department Roster: Female Members Only ({deptDemographics.female} Enrolled)
                      </p>
                      <p className="text-[10px] text-pink-700 font-bold">
                        Only Female Member Set provision is enabled. Listing only female and unisex products.
                      </p>
                    </div>
                  </div>
                )}

                {/* Male Member Set - Only shown if dept has male members or is unassigned */}
                {showMaleProvision && (
                  <Card className="p-8 border-l-4 border-l-blue-500 shadow-2xl shadow-blue-500/5">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                          <UserCircle size={28} />
                        </div>
                        <div>
                          <h3 className="font-black italic text-xl text-[#3a525d]">Male Member Set</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600">
                              Primary Industry Config
                            </p>
                            {deptDemographics.hasMale && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                {deptDemographics.male} Registered Male Entities
                              </span>
                            )}
                          </div>
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
                      {maleConfig.length === 0 ? (
                        <p className="text-xs text-zinc-300 italic p-4 text-center border border-dashed border-zinc-200 rounded-2xl">
                          No products added to Male Member Set yet. Click &quot;Add Product&quot; to configure.
                        </p>
                      ) : (
                        maleConfig.map((item, idx) => (
                          <div key={idx} className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-6 group animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-4">
                              <div className="flex-[3]">
                                <Select 
                                  options={maleProducts.map(p => ({ 
                                    label: `${p.name} (${p.art_number})${p.gender ? ` • [${p.gender}]` : ''}`, 
                                    value: p.id.toString() 
                                  }))}
                                  value={item.product_id}
                                  onChange={(val: string) => handleUpdateProduct('male', idx, 'product_id', val)}
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
                              <Button
                                onClick={() => handleRemoveProduct('male', idx)}
                                variant="secondary"
                                className="p-3 text-zinc-300 hover:text-red-500 transition-colors bg-transparent border-none shadow-none"
                              >
                                <Trash2 size={18} />
                              </Button>
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
                                      <Button
                                        key={method}
                                        variant="secondary"
                                        onClick={() => {
                                          handleUpdateProduct('male', idx, 'entry_methods', [method]);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all ${
                                          isActive 
                                          ? 'bg-[#3a525d] text-white border-[#3a525d] shadow-md shadow-[#3a525d]/20' 
                                          : 'bg-white text-zinc-400 border-zinc-200 hover:border-[#3a525d]/30 font-extrabold shadow-none'
                                        }`}
                                      >
                                        {method.replace(/_/g, ' ')}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                )}

                {/* Female Member Set - Only shown if dept has female members or is unassigned */}
                {showFemaleProvision && (
                  <Card className="p-8 border-l-4 border-l-pink-500 shadow-2xl shadow-pink-500/5">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500">
                          <UserCircle2 size={28} />
                        </div>
                        <div>
                          <h3 className="font-black italic text-xl text-[#3a525d]">Female Member Set</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-pink-600">
                              Primary Industry Config
                            </p>
                            {deptDemographics.hasFemale && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-pink-100 text-pink-800 border border-pink-200">
                                {deptDemographics.female} Registered Female Entities
                              </span>
                            )}
                          </div>
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
                      {femaleConfig.length === 0 ? (
                        <p className="text-xs text-zinc-300 italic p-4 text-center border border-dashed border-zinc-200 rounded-2xl">
                          No products added to Female Member Set yet. Click &quot;Add Product&quot; to configure.
                        </p>
                      ) : (
                        femaleConfig.map((item, idx) => (
                          <div key={idx} className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-6 group animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-4">
                              <div className="flex-[3]">
                                <Select 
                                  options={femaleProducts.map(p => ({ 
                                    label: `${p.name} (${p.art_number})${p.gender ? ` • [${p.gender}]` : ''}`, 
                                    value: p.id.toString() 
                                  }))}
                                  value={item.product_id}
                                  onChange={(val: string) => handleUpdateProduct('female', idx, 'product_id', val)}
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
                              <Button
                                onClick={() => handleRemoveProduct('female', idx)}
                                variant="secondary"
                                className="p-3 text-zinc-300 hover:text-red-500 transition-colors bg-transparent border-none shadow-none"
                              >
                                <Trash2 size={18} />
                              </Button>
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
                                      <Button
                                        key={method}
                                        onClick={() => {
                                          handleUpdateProduct('female', idx, 'entry_methods', [method]);
                                        }}
                                        variant="secondary"
                                        className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all shadow-none ${
                                          isActive 
                                          ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20' 
                                          : 'bg-white text-zinc-400 border-zinc-200 hover:border-pink-500/30 font-extrabold'
                                        }`}
                                      >
                                        {method.replace(/_/g, ' ')}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                )}

                <div className="flex justify-end pt-10">
                  <Button 
                    onClick={handleSubmit}
                    className="h-20 px-20 text-lg font-black italic rounded-[2rem] bg-[#3a525d] hover:bg-[#2d8d9b] text-white shadow-2xl shadow-[#3a525d]/30 gap-4"
                  >
                    Publish Template <ArrowRight />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Industry Templates</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Design &amp; Manage industry-specific bundle templates
          </p>
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
