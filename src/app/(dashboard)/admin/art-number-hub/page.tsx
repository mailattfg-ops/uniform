'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { 
  Plus, Trash2, Edit2, ArrowRight, Scissors, UserCheck, Palette, 
  Hash, Sparkles, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Dress {
  id: number;
  code: string;
  name: string;
  created_at?: string;
}

interface Gender {
  id: number;
  code: string;
  name: string;
  created_at?: string;
}

interface Pattern {
  id: number;
  code: string;
  name: string;
  created_at?: string;
}

interface ArtNumber {
  id: number;
  dress_id: number;
  gender_id: number;
  pattern_id: number;
  code: string;
  base_size?: string;
  fit?: string;
  created_at?: string;
  art_dresses?: { code: string; name: string };
  art_genders?: { code: string; name: string };
  art_patterns?: { code: string; name: string };
}

type TabType = 'dresses' | 'genders' | 'patterns' | 'registry';

export default function ArtNumberHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<{ type: TabType; id: number; code: string } | null>(null);

  // Core Data States
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [artNumbers, setArtNumbers] = useState<ArtNumber[]>([]);

  // Editing States
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Field States
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  // Compound Generator Field States
  const [selectedDressId, setSelectedDressId] = useState('');
  const [selectedGenderId, setSelectedGenderId] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [baseSize, setBaseSize] = useState('');
  const [fit, setFit] = useState('');

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [dressesRes, gendersRes, patternsRes, artNumbersRes] = await Promise.all([
        api.get('/art-number-hub/dresses'),
        api.get('/art-number-hub/genders'),
        api.get('/art-number-hub/patterns'),
        api.get('/art-number-hub/art-numbers')
      ]);

      setDresses(dressesRes.data.map((d: any) => ({
        ...d,
        search_uid: `DRS-${d.id}`,
        search_string: `${d.code} ${d.name} DRS-${d.id}`.toLowerCase()
      })));

      setGenders(gendersRes.data.map((g: any) => ({
        ...g,
        search_uid: `GND-${g.id}`,
        search_string: `${g.code} ${g.name} GND-${g.id}`.toLowerCase()
      })));

      setPatterns(patternsRes.data.map((p: any) => ({
        ...p,
        search_uid: `PAT-${p.id}`,
        search_string: `${p.code} ${p.name} PAT-${p.id}`.toLowerCase()
      })));

      setArtNumbers(artNumbersRes.data.map((an: any) => ({
        ...an,
        search_uid: `ART-${an.id}`,
        search_string: `${an.code} ${an.art_dresses?.name || ''} ${an.art_genders?.name || ''} ${an.art_patterns?.name || ''} ${an.base_size || ''} ${an.fit || ''} ART-${an.id}`.toLowerCase()
      })));
    } catch (err) {
      toast.error('Failed to load Art Number Hub datasets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setCode('');
    setName('');
    setSelectedDressId('');
    setSelectedGenderId('');
    setSelectedPatternId('');
    setBaseSize('');
    setFit('');
  };

  // Live Generator dynamic calculation
  const getLivePreviewCode = () => {
    if (!selectedDressId || !selectedGenderId || !selectedPatternId) return '---';
    const activeDress = dresses.find(d => String(d.id) === selectedDressId);
    const activeGender = genders.find(g => String(g.id) === selectedGenderId);
    const activePattern = patterns.find(p => String(p.id) === selectedPatternId);
    
    if (!activeDress || !activeGender || !activePattern) return '---';
    return `${activeDress.code}-${activeGender.code}${activePattern.code}`;
  };

  const handleCreateOrUpdate = async () => {
    // 1. COMPOUND CODE REGISTRY
    if (activeTab === 'registry') {
      if (!selectedDressId || !selectedGenderId || !selectedPatternId) {
        toast.error('Please select Dress Prefix, Gender Code, and Pattern Code');
        return;
      }

      const payload = {
        dress_id: Number(selectedDressId),
        gender_id: Number(selectedGenderId),
        pattern_id: Number(selectedPatternId),
        base_size: baseSize.trim() || null,
        fit: fit || null
      };

      const loadingToast = toast.loading('Registering combined Art Number...');
      try {
        await api.post('/art-number-hub/art-numbers', payload);
        toast.success('Art Number registered successfully!', { id: loadingToast });
        handleCancel();
        fetchAllData();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Registration failed', { id: loadingToast });
      }
      return;
    }

    // 2. MASTER REGISTRIES (Dress, Gender, Pattern)
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode || !trimmedName) {
      toast.error('Code and Name are both required');
      return;
    }

    if (activeTab === 'dresses') {
      if (!/^[a-zA-Z0-9\-]+$/.test(trimmedCode)) {
        toast.error('Dress Prefix can only contain alphanumeric characters and hyphens');
        return;
      }
      if (trimmedCode.length > 10) {
        toast.error('Dress Prefix must be 10 characters or less');
        return;
      }
    } else {
      if (!/^[a-zA-Z0-9]+$/.test(trimmedCode)) {
        toast.error('Code must be purely alphanumeric (no spaces or special characters)');
        return;
      }
      if (trimmedCode.length > 10) {
        toast.error('Code must be 10 characters or less');
        return;
      }
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      toast.error('Name must be between 2 and 50 characters');
      return;
    }

    const payload = { code: trimmedCode, name: trimmedName };
    const labelSingular = activeTab === 'dresses' ? 'Dress Prefix' : activeTab === 'genders' ? 'Gender Code' : 'Pattern Code';
    const endpoint = `/art-number-hub/${activeTab}`;
    const isEditing = editingId !== null;

    const loadingToast = toast.loading(isEditing ? `Updating ${labelSingular}...` : `Registering ${labelSingular}...`);

    try {
      if (isEditing) {
        await api.put(`${endpoint}/${editingId}`, payload);
        toast.success(`${labelSingular} updated successfully!`, { id: loadingToast });
      } else {
        await api.post(endpoint, payload);
        toast.success(`New ${labelSingular} registered!`, { id: loadingToast });
      }
      handleCancel();
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed', { id: loadingToast });
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setIsAdding(true);
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    const { type, id, code } = deleteCandidate;
    const endpoint = `/art-number-hub/${type === 'registry' ? 'art-numbers' : type}/${id}`;
    
    try {
      await api.delete(endpoint);
      toast.success(`${type === 'registry' ? 'Art Number combination' : 'Item'} successfully deleted`);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Unable to delete. It might be referenced by products or configurations.');
    } finally {
      setDeleteCandidate(null);
    }
  };

  // Define Columns for the 4 tables
  const dressColumns: Column<Dress>[] = [
    {
      header: 'Dress Prefix Code',
      accessor: (d) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
            <Scissors size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{d.code}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: DRS-{d.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Dress Category Name',
      accessor: (d) => <span className="text-sm font-bold text-[#3a525d]">{d.name}</span>
    },
    {
      header: 'Registered',
      accessor: (d) => (
        <p className="text-xs font-bold text-zinc-500">
          {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (d) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => startEdit(d)}
            className="w-10 h-10 rounded-xl bg-teal-50/50 text-teal-600 hover:bg-teal-600 hover:text-white transition-all flex items-center justify-center border border-teal-100/50"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteCandidate({ type: 'dresses', id: d.id, code: d.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const genderColumns: Column<Gender>[] = [
    {
      header: 'Gender Code',
      accessor: (g) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{g.code}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: GND-{g.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Gender Name',
      accessor: (g) => <span className="text-sm font-bold text-[#3a525d]">{g.name}</span>
    },
    {
      header: 'Registered',
      accessor: (g) => (
        <p className="text-xs font-bold text-zinc-500">
          {g.created_at ? new Date(g.created_at).toLocaleDateString() : 'N/A'}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (g) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => startEdit(g)}
            className="w-10 h-10 rounded-xl bg-teal-50/50 text-teal-600 hover:bg-teal-600 hover:text-white transition-all flex items-center justify-center border border-teal-100/50"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteCandidate({ type: 'genders', id: g.id, code: g.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const patternColumns: Column<Pattern>[] = [
    {
      header: 'Pattern Code',
      accessor: (p) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
            <Palette size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{p.code}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">UID: PAT-{p.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Pattern Name',
      accessor: (p) => <span className="text-sm font-bold text-[#3a525d]">{p.name}</span>
    },
    {
      header: 'Registered',
      accessor: (p) => (
        <p className="text-xs font-bold text-zinc-500">
          {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (p) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => startEdit(p)}
            className="w-10 h-10 rounded-xl bg-teal-50/50 text-teal-600 hover:bg-teal-600 hover:text-white transition-all flex items-center justify-center border border-teal-100/50"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteCandidate({ type: 'patterns', id: p.id, code: p.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const registryColumns: Column<ArtNumber>[] = [
    {
      header: 'Generated Art Number',
      accessor: (an) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-teal-400 border border-zinc-800 shadow-lg">
            <Hash size={20} />
          </div>
          <div>
            <span className="px-3 py-1 bg-zinc-900 text-teal-400 rounded-full font-black text-sm tracking-widest border border-zinc-800">
              {an.code}
            </span>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5 ml-1">UID: ART-{an.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Component Breakdown',
      accessor: (an) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 bg-teal-50/60 border border-teal-100 rounded text-[10px] font-bold text-[#3a525d]">
            Prefix: <strong className="font-black text-teal-700">{an.art_dresses?.code || 'N/A'}</strong> ({an.art_dresses?.name || 'N/A'})
          </span>
          <span className="px-2.5 py-0.5 bg-[#8b6b5a]/10 border border-[#8b6b5a]/10 rounded text-[10px] font-bold text-[#3a525d]">
            Gender: <strong className="font-black text-[#8b6b5a]">{an.art_genders?.code || 'N/A'}</strong> ({an.art_genders?.name || 'N/A'})
          </span>
          <span className="px-2.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-[10px] font-bold text-[#3a525d]">
            Pattern: <strong className="font-black text-zinc-700">{an.art_patterns?.code || 'N/A'}</strong> ({an.art_patterns?.name || 'N/A'})
          </span>
        </div>
      )
    },
    {
      header: 'Base Size',
      accessor: (an) => (
        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-black text-amber-700 font-mono">
          {an.base_size || '—'}
        </span>
      )
    },
    {
      header: 'Fit',
      accessor: (an) => (
        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
          an.fit === 'slim fit' 
            ? 'bg-purple-50 text-purple-700 border-purple-100' 
            : an.fit === 'regular fit'
              ? 'bg-blue-50 text-blue-700 border-blue-100'
              : 'bg-zinc-50 text-zinc-400 border-zinc-100'
        }`}>
          {an.fit || '—'}
        </span>
      )
    },
    {
      header: 'Pre-registered Date',
      accessor: (an) => (
        <p className="text-xs font-bold text-zinc-500">
          {an.created_at ? new Date(an.created_at).toLocaleDateString() : 'N/A'}
        </p>
      )
    },
    {
      header: 'Actions',
      accessor: (an) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDeleteCandidate({ type: 'registry', id: an.id, code: an.code })}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // Helper variables to determine UI based on active tab
  const getTabLabelSingular = () => {
    switch (activeTab) {
      case 'dresses': return 'Dress Prefix';
      case 'genders': return 'Gender Code';
      case 'patterns': return 'Pattern Code';
      case 'registry': return 'Combined Art Number';
    }
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'dresses': return dresses;
      case 'genders': return genders;
      case 'patterns': return patterns;
      case 'registry': return artNumbers;
    }
  };

  const getActiveColumns = () => {
    switch (activeTab) {
      case 'dresses': return dressColumns;
      case 'genders': return genderColumns;
      case 'patterns': return patternColumns;
      case 'registry': return registryColumns;
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'dresses': return 'Search by Dress Code or Category...';
      case 'genders': return 'Search by Gender Code or Description...';
      case 'patterns': return 'Search by Pattern Code or Name...';
      case 'registry': return 'Search combined Art Numbers (e.g. 4J-1012)...';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 overflow-hidden">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Art Number Hub</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600 mt-1 opacity-80">
            Dynamically generated standard catalog components (4 tables structure)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchAllData}
            disabled={isLoading}
            className="w-12 h-16 rounded-[1.2rem] flex items-center justify-center"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-teal-600' : 'text-teal-600'} />
          </Button>

          {!isAdding ? (
            <Button 
              onClick={() => setIsAdding(true)}
              className="h-16 px-8 bg-[#3a525d] hover:bg-teal-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
            >
              <Plus size={20} strokeWidth={3} />
              Register {getTabLabelSingular()}
            </Button>
          ) : (
            <Button 
              variant="secondary"
              onClick={handleCancel}
              className="h-16 px-8 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px]"
            >
              Cancel Entry
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Menu Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-100 p-2.5 rounded-[1.8rem] border border-zinc-200/50 shadow-inner">
        <button
          onClick={() => { setActiveTab('registry'); handleCancel(); }}
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'registry'
              ? 'bg-zinc-900 text-teal-400 shadow-xl border border-zinc-800 scale-[1.02]'
              : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600'
          }`}
        >
          <Hash size={16} />
          Art Number Registry
        </button>

        <button
          onClick={() => { setActiveTab('dresses'); handleCancel(); }}
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'dresses'
              ? 'bg-white text-teal-600 shadow-md scale-[1.02] border border-zinc-200/40'
              : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600'
          }`}
        >
          <Scissors size={16} />
          Dress Prefixes
        </button>

        <button
          onClick={() => { setActiveTab('genders'); handleCancel(); }}
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'genders'
              ? 'bg-white text-teal-600 shadow-md scale-[1.02] border border-zinc-200/40'
              : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600'
          }`}
        >
          <UserCheck size={16} />
          Gender Codes
        </button>

        <button
          onClick={() => { setActiveTab('patterns'); handleCancel(); }}
          className={`flex items-center justify-center gap-2.5 py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'patterns'
              ? 'bg-white text-teal-600 shadow-md scale-[1.02] border border-zinc-200/40'
              : 'text-[#3a525d] hover:bg-white/60 hover:text-teal-600'
          }`}
        >
          <Palette size={16} />
          Pattern Codes
        </button>
      </div>

      {/* Adding / Registering Form View */}
      {isAdding && (
        <div className="max-w-4xl mx-auto">
          {activeTab === 'registry' ? (
            /* Tab 4 Compound Generator Registry Form */
            <Card className="p-8 border border-zinc-200 shadow-2xl rounded-[3rem] bg-white animate-in slide-in-from-top-10 duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                  <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/20">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">Art Number Generator</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 opacity-70">
                      Instantly form codes from registered prefixes & formats
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Select
                      label="Dress Prefix (4J)"
                      value={selectedDressId}
                      onChange={(val) => setSelectedDressId(val)}
                      placeholder="Select Dress Type"
                      options={dresses.map(d => ({
                        label: `[${d.code}] - ${d.name}`,
                        value: String(d.id)
                      }))}
                      icon={<Scissors size={18} />}
                    />
                  </div>

                  <div className="space-y-2">
                    <Select
                      label="Gender Code (1)"
                      value={selectedGenderId}
                      onChange={(val) => setSelectedGenderId(val)}
                      placeholder="Select Gender"
                      options={genders.map(g => ({
                        label: `[${g.code}] - ${g.name}`,
                        value: String(g.id)
                      }))}
                      icon={<UserCheck size={18} />}
                    />
                  </div>

                  <div className="space-y-2">
                    <Select
                      label="Pattern Code (012)"
                      value={selectedPatternId}
                      onChange={(val) => setSelectedPatternId(val)}
                      placeholder="Select Pattern"
                      options={patterns.map(p => ({
                        label: `[${p.code}] - ${p.name}`,
                        value: String(p.id)
                      }))}
                      icon={<Palette size={18} />}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-100">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1">
                      Base Size
                    </label>
                    <Input 
                      placeholder="e.g. 38, M, L"
                      value={baseSize}
                      onChange={(e) => setBaseSize(e.target.value)}
                      className="h-14 rounded-2xl border-zinc-200 focus:border-teal-500 transition-all font-bold text-sm text-[#3a525d]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Select
                      label="Fit"
                      value={fit}
                      onChange={(val) => setFit(val)}
                      placeholder="Select Fit Type"
                      options={[
                        { label: 'Regular Fit', value: 'regular fit' },
                        { label: 'Slim Fit', value: 'slim fit' }
                      ]}
                      icon={<Scissors size={18} />}
                    />
                  </div>
                </div>

                {/* Generator Live Preview Badge */}
                <div className="p-6 bg-zinc-50 border border-zinc-150 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                      <Eye size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Code Integration Preview</p>
                      <p className="text-xs font-bold text-[#3a525d]">Dynamic format: [DressPrefix]-[GenderCode][PatternCode]</p>
                    </div>
                  </div>

                  <div className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3 shadow-lg shadow-black/10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400/60">Output:</span>
                    <span className="text-xl font-black tracking-widest text-teal-400">
                      {getLivePreviewCode()}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateOrUpdate}
                  disabled={!selectedDressId || !selectedGenderId || !selectedPatternId}
                  className="w-full h-20 rounded-[2rem] bg-zinc-900 hover:bg-teal-600 text-white font-black italic text-xl shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Pre-register Dynamic Combination
                  <ArrowRight />
                </Button>
              </div>
            </Card>
          ) : (
            /* Dress, Gender, Pattern Forms */
            <Card className="p-8 border border-zinc-200 shadow-2xl rounded-[3rem] bg-white animate-in slide-in-from-top-10 duration-500">
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                  <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-teal-600/20">
                    {activeTab === 'dresses' ? <Scissors size={24} /> : activeTab === 'genders' ? <UserCheck size={24} /> : <Palette size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic text-[#3a525d] tracking-tight">
                      {editingId ? `Modify ${getTabLabelSingular()}` : `Define New ${getTabLabelSingular()}`}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 opacity-70">
                      Specification Component Catalog Registry
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] ml-1">
                      {getTabLabelSingular()} Code {activeTab === 'dresses' ? '(e.g. 4J)' : activeTab === 'genders' ? '(e.g. 1)' : '(e.g. 012)'}
                    </label>
                    <Input 
                      placeholder={activeTab === 'dresses' ? 'e.g. 4J' : activeTab === 'genders' ? 'e.g. 1' : 'e.g. 012'}
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'dresses') {
                          if (val.length <= 10 && /^[a-zA-Z0-9\-]*$/.test(val)) {
                            setCode(val.toUpperCase());
                          }
                        } else {
                          if (val.length <= 10 && /^[a-zA-Z0-9]*$/.test(val)) {
                            setCode(val);
                          }
                        }
                      }}
                      className="h-14 rounded-2xl border-zinc-200 focus:border-teal-500 transition-all font-black uppercase tracking-wider text-[#3a525d]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] ml-1">
                      Descriptive Category Name {activeTab === 'dresses' ? '(e.g. Cotton Shirt)' : activeTab === 'genders' ? '(e.g. Male)' : '(e.g. Striped)'}
                    </label>
                    <Input 
                      placeholder={activeTab === 'dresses' ? 'e.g. Cotton Shirt' : activeTab === 'genders' ? 'e.g. Male' : 'e.g. Striped Pattern'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      className="h-14 rounded-2xl border-zinc-200 focus:border-teal-500 transition-all text-sm font-bold text-[#3a525d]"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateOrUpdate}
                  className="w-full h-20 rounded-[2rem] bg-[#3a525d] hover:bg-teal-600 text-white font-black italic text-xl shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {editingId ? 'Commit Modifications' : `Initialize ${getTabLabelSingular()} Registry`}
                  <ArrowRight />
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Main DataTable Display */}
      {!isAdding && (
        <div className="bg-white rounded-[2.5rem] p-2 border border-zinc-150 shadow-sm animate-in fade-in duration-500">
          <DataTable 
            columns={getActiveColumns()}
            data={getActiveData()}
            isLoading={isLoading}
            searchPlaceholder={getSearchPlaceholder()}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title={`Remove ${deleteCandidate ? (deleteCandidate.type === 'registry' ? 'Art Number Combination' : getTabLabelSingular()) : ''}`}
        message={`Are you absolutely sure you want to permanently remove the item code '${deleteCandidate?.code}' from the database? This action is irreversible and might cause errors if this component is assigned to any products.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        confirmLabel="Yes, Remove Permanently"
        variant="danger"
      />
    </div>
  );
}
