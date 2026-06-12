'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Truck, 
  Percent, 
  Sparkles, 
  Loader2, 
  HelpCircle,
  Undo
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface InwardRate {
  id: string | number;
  item: string;
  width: string;
  rate: number;
  isNew?: boolean;
}

interface MarginCalculation {
  id: string | number;
  sales_type: string;
  customer_type: string;
  branded: number;
  semi_branded: number;
  non_branded: number;
  isNew?: boolean;
}

export default function FabricSAMConfigPage() {
  const [inwardRates, setInwardRates] = useState<InwardRate[]>([]);
  const [margins, setMargins] = useState<MarginCalculation[]>([]);
  const [isLoadingInward, setIsLoadingInward] = useState(true);
  const [isLoadingMargins, setIsLoadingMargins] = useState(true);

  // States for row-level inline editing
  const [editingInwardId, setEditingInwardId] = useState<string | number | null>(null);
  const [editingInwardData, setEditingInwardData] = useState<Partial<InwardRate>>({});

  const [editingMarginId, setEditingMarginId] = useState<string | number | null>(null);
  const [editingMarginData, setEditingMarginData] = useState<Partial<MarginCalculation>>({});

  const fetchInwardRates = async () => {
    setIsLoadingInward(true);
    try {
      const response = await api.get('/sam-management/fabric/inward-transportation');
      if (response.data && response.data.error === 'SCHEMA_MISSING') {
        toast.error('Fabric SAM tables have not been created. Please run database migrations.');
      } else {
        setInwardRates(response.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load inward transportation rates.');
    } finally {
      setIsLoadingInward(false);
    }
  };

  const fetchMargins = async () => {
    setIsLoadingMargins(true);
    try {
      const response = await api.get('/sam-management/fabric/margins');
      if (response.data && response.data.error !== 'SCHEMA_MISSING') {
        setMargins(response.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load margin configurations.');
    } finally {
      setIsLoadingMargins(false);
    }
  };

  useEffect(() => {
    fetchInwardRates();
    fetchMargins();
  }, []);

  // --- Inward Rates CRUD Action Handlers ---
  const handleStartEditInward = (rate: InwardRate) => {
    setEditingInwardId(rate.id);
    setEditingInwardData({ ...rate });
  };

  const handleCancelEditInward = (rate: InwardRate) => {
    if (rate.isNew) {
      setInwardRates(prev => prev.filter(r => r.id !== rate.id));
    }
    setEditingInwardId(null);
    setEditingInwardData({});
  };

  const handleSaveInwardRate = async (id: string | number) => {
    const isNew = String(id).startsWith('temp-');
    const dataToSave = editingInwardData;

    if (!dataToSave.item || !dataToSave.width || dataToSave.rate === undefined || dataToSave.rate === null) {
      toast.error('All fields (Item, Width, Rate) are required.');
      return;
    }

    const loadToast = toast.loading(isNew ? 'Adding rate...' : 'Updating rate...');
    try {
      if (isNew) {
        const response = await api.post('/sam-management/fabric/inward-transportation', {
          item: dataToSave.item,
          width: dataToSave.width,
          rate: dataToSave.rate
        });
        toast.success('Inward rate created successfully', { id: loadToast });
        setInwardRates(prev => prev.map(r => r.id === id ? response.data : r));
      } else {
        const response = await api.put(`/sam-management/fabric/inward-transportation/${id}`, {
          item: dataToSave.item,
          width: dataToSave.width,
          rate: dataToSave.rate
        });
        toast.success('Inward rate updated successfully', { id: loadToast });
        setInwardRates(prev => prev.map(r => r.id === id ? response.data : r));
      }
      setEditingInwardId(null);
      setEditingInwardData({});
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save rate record.', { id: loadToast });
    }
  };

  const handleDeleteInwardRate = async (id: string | number) => {
    if (String(id).startsWith('temp-')) {
      setInwardRates(prev => prev.filter(r => r.id !== id));
      return;
    }

    if (!confirm('Are you sure you want to delete this inward transportation rate?')) return;

    const loadToast = toast.loading('Deleting rate...');
    try {
      await api.delete(`/sam-management/fabric/inward-transportation/${id}`);
      toast.success('Rate record deleted successfully', { id: loadToast });
      setInwardRates(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete rate.', { id: loadToast });
    }
  };

  const handleAddNewInwardRate = () => {
    if (editingInwardId !== null) {
      toast.error('Please save or cancel your active inline edit first.');
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const newRow: InwardRate = {
      id: tempId,
      item: 'SHIRTING',
      width: '58',
      rate: 1.0,
      isNew: true
    };
    setInwardRates(prev => [newRow, ...prev]);
    setEditingInwardId(tempId);
    setEditingInwardData(newRow);
  };


  // --- Margins CRUD Action Handlers ---
  const handleStartEditMargin = (margin: MarginCalculation) => {
    setEditingMarginId(margin.id);
    setEditingMarginData({ ...margin });
  };

  const handleCancelEditMargin = (margin: MarginCalculation) => {
    if (margin.isNew) {
      setMargins(prev => prev.filter(m => m.id !== margin.id));
    }
    setEditingMarginId(null);
    setEditingMarginData({});
  };

  const handleSaveMargin = async (id: string | number) => {
    const isNew = String(id).startsWith('temp-');
    const dataToSave = editingMarginData;

    if (
      !dataToSave.sales_type || 
      !dataToSave.customer_type || 
      dataToSave.branded === undefined || 
      dataToSave.semi_branded === undefined || 
      dataToSave.non_branded === undefined
    ) {
      toast.error('All fields are required.');
      return;
    }

    const loadToast = toast.loading(isNew ? 'Adding margin...' : 'Updating margin...');
    try {
      if (isNew) {
        const response = await api.post('/sam-management/fabric/margins', {
          sales_type: dataToSave.sales_type,
          customer_type: dataToSave.customer_type,
          branded: dataToSave.branded,
          semi_branded: dataToSave.semi_branded,
          non_branded: dataToSave.non_branded
        });
        toast.success('Margin mapping created successfully', { id: loadToast });
        setMargins(prev => prev.map(m => m.id === id ? response.data : m));
      } else {
        const response = await api.put(`/sam-management/fabric/margins/${id}`, {
          sales_type: dataToSave.sales_type,
          customer_type: dataToSave.customer_type,
          branded: dataToSave.branded,
          semi_branded: dataToSave.semi_branded,
          non_branded: dataToSave.non_branded
        });
        toast.success('Margin mapping updated successfully', { id: loadToast });
        setMargins(prev => prev.map(m => m.id === id ? response.data : m));
      }
      setEditingMarginId(null);
      setEditingMarginData({});
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save margin configurations.', { id: loadToast });
    }
  };

  const handleDeleteMargin = async (id: string | number) => {
    if (String(id).startsWith('temp-')) {
      setMargins(prev => prev.filter(m => m.id !== id));
      return;
    }

    if (!confirm('Are you sure you want to delete this margin slab?')) return;

    const loadToast = toast.loading('Deleting margin...');
    try {
      await api.delete(`/sam-management/fabric/margins/${id}`);
      toast.success('Margin slab deleted successfully', { id: loadToast });
      setMargins(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete margin record.', { id: loadToast });
    }
  };

  const handleAddNewMargin = () => {
    if (editingMarginId !== null) {
      toast.error('Please save or cancel your active inline edit first.');
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const newRow: MarginCalculation = {
      id: tempId,
      sales_type: 'RETAIL',
      customer_type: 'DIRECT',
      branded: 100,
      semi_branded: 100,
      non_branded: 100,
      isNew: true
    };
    setMargins(prev => [newRow, ...prev]);
    setEditingMarginId(tempId);
    setEditingMarginData(newRow);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#3a525d]">Fabric SAM Configurator</h1>
          <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.3em] mt-1 opacity-80">
            Set Inward Transport Rates and Profit Margin Slabs
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => { fetchInwardRates(); fetchMargins(); }}
            variant="secondary"
            className="rounded-xl h-10 px-4 text-xs font-black uppercase tracking-wider text-[#8b6b5a] hover:text-[#3a525d] border-none shadow-sm"
          >
            <Undo size={14} className="mr-2" />
            Reload Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Section 1: Inward Transportation */}
        <div className="xl:col-span-5 bg-white border border-[#fce4d4] rounded-[2.5rem] p-6 md:p-8 shadow-xl transition-all hover:shadow-2xl flex flex-col">
          <div className="flex items-center justify-between border-b border-[#fce4d4] pb-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#3a525d]">Inward Transportation</h3>
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Per meter shipping rates</span>
              </div>
            </div>
            <Button
              onClick={handleAddNewInwardRate}
              className="h-10 px-4 text-[10px] font-black uppercase tracking-wider bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-xl gap-1.5"
            >
              <Plus size={14} strokeWidth={3} />
              Add Row
            </Button>
          </div>

          {isLoadingInward ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
              <Loader2 size={36} className="animate-spin text-[#2d8d9b]" />
              <span className="text-xs font-bold">Loading rates registry...</span>
            </div>
          ) : inwardRates.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-150 rounded-3xl text-zinc-400">
              <HelpCircle className="mx-auto mb-2 text-zinc-300" size={32} />
              <p className="text-xs font-bold">No inward rates defined yet.</p>
              <p className="text-[10px] text-zinc-400 mt-1">Click &quot;Add Row&quot; to configure your first rate mapping.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#fce4d4]/60">
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Item Category</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Width</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right pr-6">Rate (₹)</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {inwardRates.map((rate) => {
                    const isEditing = editingInwardId === rate.id;
                    return (
                      <tr key={rate.id} className="group hover:bg-zinc-50/60 transition-colors">
                        
                        {/* ITEM name */}
                        <td className="py-4 pl-2 font-bold text-sm text-[#3a525d]">
                          {isEditing ? (
                            <select
                              value={editingInwardData.item || ''}
                              onChange={(e) => setEditingInwardData(prev => ({ ...prev, item: e.target.value }))}
                              className="px-3 py-1.5 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                            >
                              <option value="SHIRTING">SHIRTING</option>
                              <option value="SUITING">SUITING</option>
                              <option value="BOTTOM">BOTTOM</option>
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 bg-[#8b6b5a]/10 border border-[#8b6b5a]/15 text-[#8b6b5a] rounded-xl text-[10px] font-black tracking-wider uppercase">
                              {rate.item}
                            </span>
                          )}
                        </td>

                        {/* WIDTH */}
                        <td className="py-4 font-bold text-sm text-zinc-700">
                          {isEditing ? (
                            <select
                              value={editingInwardData.width || ''}
                              onChange={(e) => setEditingInwardData(prev => ({ ...prev, width: e.target.value }))}
                              className="px-3 py-1.5 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                            >
                              <option value="36">36&quot;</option>
                              <option value="44">44&quot;</option>
                              <option value="58">58&quot;</option>
                            </select>
                          ) : (
                            <span className="font-mono text-xs font-bold text-zinc-500">{rate.width}&quot;</span>
                          )}
                        </td>

                        {/* RATE */}
                        <td className="py-4 text-right pr-6 font-mono font-bold text-sm text-[#2d8d9b]">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingInwardData.rate === undefined ? '' : editingInwardData.rate}
                              onChange={(e) => setEditingInwardData(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                              className="w-20 px-3 py-1.5 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] text-right focus:outline-none focus:border-[#2d8d9b]"
                            />
                          ) : (
                            <span>₹{Number(rate.rate).toFixed(2)}</span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="py-4 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleSaveInwardRate(rate.id)}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all"
                                title="Save Row"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={() => handleCancelEditInward(rate)}
                                className="p-1.5 rounded-lg bg-zinc-50 text-zinc-500 hover:bg-zinc-200 transition-all"
                                title="Cancel Edit"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEditInward(rate)}
                                className="p-1.5 rounded-lg bg-zinc-50 text-zinc-500 hover:bg-zinc-200 transition-all"
                                title="Edit"
                              >
                                <Plus size={14} className="rotate-45" /> {/* Styled like pencil but simpler */}
                              </button>
                              <button
                                onClick={() => handleDeleteInwardRate(rate.id)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Margin Calculation */}
        <div className="xl:col-span-7 bg-white border border-[#fce4d4] rounded-[2.5rem] p-6 md:p-8 shadow-xl transition-all hover:shadow-2xl flex flex-col">
          <div className="flex items-center justify-between border-b border-[#fce4d4] pb-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#8b6b5a]/10 text-[#8b6b5a] flex items-center justify-center">
                <Percent size={20} />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#3a525d]">Margin Calculation</h3>
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Markup percentages for fabric classifications</span>
              </div>
            </div>
            <Button
              onClick={handleAddNewMargin}
              className="h-10 px-4 text-[10px] font-black uppercase tracking-wider bg-[#3a525d] hover:bg-[#8b6b5a] text-white rounded-xl gap-1.5"
            >
              <Plus size={14} strokeWidth={3} />
              Add Slab
            </Button>
          </div>

          {isLoadingMargins ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
              <Loader2 size={36} className="animate-spin text-[#8b6b5a]" />
              <span className="text-xs font-bold">Loading profit margins...</span>
            </div>
          ) : margins.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-150 rounded-3xl text-zinc-400">
              <HelpCircle className="mx-auto mb-2 text-zinc-300" size={32} />
              <p className="text-xs font-bold">No margin configurations seeded.</p>
              <p className="text-[10px] text-zinc-400 mt-1">Click &quot;Add Slab&quot; to define classification markups.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#fce4d4]/60">
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Sales Type</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Customer Type</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center w-20">Branded (%)</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center w-20">Semi-Brand</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center w-20">Non-Brand</th>
                    <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {margins.map((m) => {
                    const isEditing = editingMarginId === m.id;
                    return (
                      <tr key={m.id} className="group hover:bg-zinc-50/60 transition-colors">
                        
                        {/* Sales Type */}
                        <td className="py-4 pl-2 font-bold text-sm text-[#3a525d]">
                          {isEditing ? (
                            <select
                              value={editingMarginData.sales_type || ''}
                              onChange={(e) => setEditingMarginData(prev => ({ ...prev, sales_type: e.target.value }))}
                              className="px-2 py-1 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                            >
                              <option value="RETAIL">RETAIL</option>
                              <option value="WHOLESALE">WHOLESALE</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide ${
                              m.sales_type === 'RETAIL' 
                                ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {m.sales_type}
                            </span>
                          )}
                        </td>

                        {/* Customer Type */}
                        <td className="py-4 font-bold text-xs text-zinc-600">
                          {isEditing ? (
                            <select
                              value={editingMarginData.customer_type || ''}
                              onChange={(e) => setEditingMarginData(prev => ({ ...prev, customer_type: e.target.value }))}
                              className="px-2 py-1 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                            >
                              <option value="DIRECT">DIRECT</option>
                              <option value="AGENT">AGENT</option>
                              <option value="BEST">BEST</option>
                            </select>
                          ) : (
                            <span>{m.customer_type}</span>
                          )}
                        </td>

                        {/* Branded */}
                        <td className="py-4 text-center font-mono font-bold text-xs text-zinc-700">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingMarginData.branded === undefined ? '' : editingMarginData.branded}
                              onChange={(e) => setEditingMarginData(prev => ({ ...prev, branded: parseFloat(e.target.value) }))}
                              className="w-16 px-2 py-1 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] text-center focus:outline-none focus:border-[#2d8d9b]"
                            />
                          ) : (
                            <span>{m.branded}%</span>
                          )}
                        </td>

                        {/* Semi Branded */}
                        <td className="py-4 text-center font-mono font-bold text-xs text-zinc-700">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingMarginData.semi_branded === undefined ? '' : editingMarginData.semi_branded}
                              onChange={(e) => setEditingMarginData(prev => ({ ...prev, semi_branded: parseFloat(e.target.value) }))}
                              className="w-16 px-2 py-1 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] text-center focus:outline-none focus:border-[#2d8d9b]"
                            />
                          ) : (
                            <span>{m.semi_branded}%</span>
                          )}
                        </td>

                        {/* Non Branded */}
                        <td className="py-4 text-center font-mono font-bold text-xs text-zinc-700">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingMarginData.non_branded === undefined ? '' : editingMarginData.non_branded}
                              onChange={(e) => setEditingMarginData(prev => ({ ...prev, non_branded: parseFloat(e.target.value) }))}
                              className="w-16 px-2 py-1 text-xs font-bold border border-zinc-200 rounded-lg text-[#3a525d] text-center focus:outline-none focus:border-[#2d8d9b]"
                            />
                          ) : (
                            <span>{m.non_branded}%</span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="py-4 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleSaveMargin(m.id)}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all"
                                title="Save Slab"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={() => handleCancelEditMargin(m)}
                                className="p-1.5 rounded-lg bg-zinc-50 text-zinc-500 hover:bg-zinc-200 transition-all"
                                title="Cancel Edit"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEditMargin(m)}
                                className="p-1.5 rounded-lg bg-zinc-50 text-zinc-500 hover:bg-zinc-200 transition-all"
                                title="Edit"
                              >
                                <Plus size={14} className="rotate-45" />
                              </button>
                              <button
                                onClick={() => handleDeleteMargin(m.id)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
