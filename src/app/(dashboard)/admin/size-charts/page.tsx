'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Info, 
  Shirt, 
  Package, 
  Plus,
  Edit2,
  Trash2,
  Maximize2,
  Settings2,
  X,
  PlusCircle
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface MetricGroup {
  label: string;
  data: { size: string; value: string }[];
}

interface SizeChart {
  id: string;
  name: string;
  category: 'top_wear' | 'bottom_wear';
  unit: 'cm' | 'in';
  metric_groups: MetricGroup[];
}

export default function SizeChartPage() {
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'top_wear' | 'bottom_wear'>('top_wear');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Custom Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chartToDelete, setChartToDelete] = useState<string | null>(null);

  const getInitialMetrics = (cat: string) => {
    if (cat === 'top_wear') {
      return [
        { label: 'Chest (to fit)', data: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map(s => ({ size: s, value: '' })) },
        { label: 'Body Length', data: ['Short', 'Standard', 'Long'].map(s => ({ size: s, value: '' })) }
      ];
    } else {
      return [
        { label: 'Waist (to fit)', data: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map(s => ({ size: s, value: '' })) },
        { label: 'Leg Length', data: ['Short', 'Standard', 'Long', 'Extra Long'].map(s => ({ size: s, value: '' })) }
      ];
    }
  };

  const [newChart, setNewChart] = useState({
    name: '',
    category: 'top_wear' as 'top_wear' | 'bottom_wear',
    unit: 'cm' as 'cm' | 'in',
    metric_groups: getInitialMetrics('top_wear')
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/size-charts');
      setCharts(res.data.map((c: any) => ({
        ...c,
        metric_groups: c.metric_groups || (c.chart_data ? [{ label: (c.category === 'top_wear' ? 'Chest' : 'Waist'), data: c.chart_data }] : [])
      })));
    } catch (err) {
      toast.error('Failed to load size charts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (chart: SizeChart) => {
    setEditingId(chart.id);
    setNewChart({
      name: chart.name,
      category: chart.category,
      unit: chart.unit,
      metric_groups: JSON.parse(JSON.stringify(chart.metric_groups))
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!newChart.name) return toast.error('Please enter a chart name');
    const loading = toast.loading(editingId ? 'Updating size chart...' : 'Registering size chart...');
    try {
      if (editingId) {
        await api.put(`/size-charts/${editingId}`, newChart);
        toast.success('Size chart updated!', { id: loading });
      } else {
        await api.post('/size-charts', newChart);
        toast.success('Size chart registered!', { id: loading });
      }
      setIsAdding(false);
      setEditingId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save', { id: loading });
    }
  };

  const confirmDelete = async () => {
    if (!chartToDelete) return;
    const loading = toast.loading('Removing chart...');
    try {
      await api.delete(`/size-charts/${chartToDelete}`);
      toast.success('Chart removed permanently', { id: loading });
      setIsDeleteModalOpen(false);
      setChartToDelete(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete', { id: loading });
    }
  };

  const updateMetricValue = (groupIndex: number, sizeIndex: number, value: string) => {
    setNewChart(prev => {
      const groups = [...prev.metric_groups];
      groups[groupIndex].data[sizeIndex].value = value;
      return { ...prev, metric_groups: groups };
    });
  };

  const addSizeOption = (groupIndex: number) => {
    setNewChart(prev => {
      const groups = [...prev.metric_groups];
      groups[groupIndex].data.push({ size: 'New', value: '' });
      return { ...prev, metric_groups: groups };
    });
  };

  const removeSizeOption = (groupIndex: number, sizeIndex: number) => {
    setNewChart(prev => {
      const groups = [...prev.metric_groups];
      groups[groupIndex].data.splice(sizeIndex, 1);
      return { ...prev, metric_groups: groups };
    });
  };

  const updateSizeLabel = (groupIndex: number, sizeIndex: number, label: string) => {
    setNewChart(prev => {
      const groups = [...prev.metric_groups];
      groups[groupIndex].data[sizeIndex].size = label;
      return { ...prev, metric_groups: groups };
    });
  };

  const filteredCharts = charts.filter(c => c.category === activeTab);

  if (isAdding) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in zoom-in duration-500 pb-40">
         <div className="flex items-center justify-between">
           <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-[#3a525d]">
                {editingId ? 'Modify Size Chart' : 'Architect Size Chart'}
              </h1>
              <p className="text-[10px] font-black uppercase text-[#2d8d9b] tracking-widest mt-1">Multi-Table Configuration</p>
           </div>
           <Button 
            onClick={() => {
              setIsAdding(false);
              setEditingId(null);
            }} 
            variant="secondary" 
            className="rounded-xl px-6 uppercase text-[10px] font-black border-none bg-zinc-100 text-zinc-500"
           >
              Cancel
           </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 space-y-6 text-[#3a525d]">
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest">Chart Name</label>
                  <input 
                    className="w-full h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#2d8d9b] transition-all outline-none text-[#333]"
                    placeholder="e.g. Premium Casual Trousers"
                    value={newChart.name}
                    onChange={e => setNewChart({...newChart, name: e.target.value})}
                  />
               </div>
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest">Category</label>
                  <div className="flex gap-4">
                     <button 
                       onClick={() => {
                         if (!editingId) {
                           setNewChart({
                              ...newChart, 
                              category: 'top_wear',
                              metric_groups: getInitialMetrics('top_wear')
                           });
                         }
                       }}
                       disabled={!!editingId}
                       className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase transition-all ${newChart.category === 'top_wear' ? 'bg-[#2d8d9b] text-white shadow-lg' : 'bg-zinc-50 text-zinc-400'} ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       Top Wear (Chest/Length)
                     </button>
                     <button 
                       onClick={() => {
                        if (!editingId) {
                          setNewChart({
                             ...newChart, 
                             category: 'bottom_wear',
                             metric_groups: getInitialMetrics('bottom_wear')
                          });
                        }
                       }}
                       disabled={!!editingId}
                       className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase transition-all ${newChart.category === 'bottom_wear' ? 'bg-[#2d8d9b] text-white shadow-lg' : 'bg-zinc-50 text-zinc-400'} ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       Bottom Wear (Waist/Length)
                     </button>
                  </div>
               </div>
            </Card>

            <Card className="p-8 space-y-6 bg-[#3a525d] text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Maximize2 size={120} />
               </div>
               <h3 className="text-sm font-black italic tracking-tighter relative z-10">System Reference</h3>
               <ul className="text-xs space-y-4 opacity-80 font-medium leading-relaxed relative z-10">
                  <li>• Use hyphen ranges (e.g., 81-86) for measurement bounds.</li>
                  <li>• Editing labels (XS, S, etc.) will update all linked templates.</li>
                  <li>• Ensure the unit (cm/in) matches your production standards.</li>
               </ul>
            </Card>
         </div>

         {newChart.metric_groups.map((group, gIdx) => (
           <Card key={gIdx} className="p-10 border-none shadow-2xl rounded-[3rem]">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-sm font-black uppercase tracking-widest text-[#3a525d]">Table {gIdx + 1}: {group.label} ({unit})</h3>
                 <Button 
                   onClick={() => addSizeOption(gIdx)}
                   variant="secondary" 
                   className="h-8 rounded-lg px-3 text-[10px] font-black gap-2 bg-zinc-50 text-[#2d8d9b]"
                 >
                    <PlusCircle size={12} /> Add Size
                 </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4 text-[#333]">
                 {group.data.map((d, i) => (
                   <div key={i} className="space-y-3 relative group">
                      <input 
                        className="text-[10px] font-black text-center block w-full bg-transparent border-none text-zinc-400 uppercase outline-none focus:text-[#2d8d9b]"
                        value={d.size}
                        onChange={e => updateSizeLabel(gIdx, i, e.target.value)}
                      />
                      <input 
                        className="w-full h-12 bg-zinc-50 border-2 border-transparent focus:border-[#2d8d9b] rounded-xl text-center text-xs font-black transition-all outline-none shadow-sm"
                        placeholder="Range"
                        value={d.value}
                        onChange={e => updateMetricValue(gIdx, i, e.target.value)}
                      />
                      <button 
                        onClick={() => removeSizeOption(gIdx, i)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                         <X size={10} />
                      </button>
                   </div>
                 ))}
              </div>
           </Card>
         ))}

         <div className="flex justify-end gap-4">
            <Button 
               onClick={handleSave} 
               className="h-16 px-12 bg-[#2d8d9b] hover:bg-[#3a525d] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl flex gap-3"
            >
               <Plus size={18} strokeWidth={3} />
               {editingId ? 'Update Size Chart' : 'Register Size Chart'}
            </Button>
         </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">US Size Chart</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Standardized Tailoring Reference
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-[#fce4d4] shadow-sm">
          <button 
            onClick={() => setUnit('cm')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              unit === 'cm' ? 'bg-[#2d8d9b] text-white shadow-lg' : 'text-[#3a525d]/40'
            }`}
          >
            cm
          </button>
          <button 
            onClick={() => setUnit('in')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              unit === 'in' ? 'bg-[#2d8d9b] text-white shadow-lg' : 'text-[#3a525d]/40'
            }`}
          >
            in
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-zinc-100 uppercase text-[11px] font-black tracking-[0.2em] pb-0">
        <button 
           onClick={() => setActiveTab('top_wear')}
           className={`pb-4 px-4 transition-all relative ${
             activeTab === 'top_wear' ? 'text-[#2d8d9b]' : 'text-zinc-400 hover:text-zinc-600'
           }`}
        >
          Top Wear (Chest/Length)
          {activeTab === 'top_wear' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2d8d9b] rounded-t-full" />}
        </button>
        <button 
           onClick={() => setActiveTab('bottom_wear')}
           className={`pb-4 px-4 transition-all relative ${
             activeTab === 'bottom_wear' ? 'text-[#2d8d9b]' : 'text-zinc-400 hover:text-zinc-600'
           }`}
        >
          Bottom Wear (Waist/Length)
          {activeTab === 'bottom_wear' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2d8d9b] rounded-t-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-[#2d8d9b]/10 border-t-[#2d8d9b] rounded-full animate-spin" />
          </div>
        ) : filteredCharts.length === 0 ? (
          <div className="grid justify-center py-20 text-center border-2 border-dashed border-zinc-100 rounded-[3rem]">
            <Package size={48} className="mx-auto text-zinc-200 mb-4" />
            <p className="text-zinc-400 font-bold italic">No size charts defined for this category</p>
            <Button 
               onClick={() => {
                 setNewChart({ ...newChart, category: activeTab, metric_groups: getInitialMetrics(activeTab) });
                 setEditingId(null);
                 setIsAdding(true);
               }}
               className="mt-6 bg-[#3a525d] rounded-2xl px-8 h-12 uppercase text-[10px] font-black tracking-widest"
            >
              Add New Chart
            </Button>
          </div>
        ) : filteredCharts.map(chart => (
          <div key={chart.id} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               {/* Measuring Advice */}
               <Card className="p-8 lg:col-span-3 border-none shadow-xl bg-gradient-to-br from-white to-zinc-50 h-full">
                  <h3 className="text-lg font-black text-[#3a525d] mb-4 flex items-center gap-2">
                     <Info size={18} className="text-[#2d8d9b]" />
                     Measuring Advice
                  </h3>
                  <div className="flex justify-center flex-col items-center py-8">
                      {activeTab === 'top_wear' ? (
                        <>
                           <div className="w-24 h-24 bg-white shadow-inner rounded-full flex items-center justify-center text-[#2d8d9b] mb-4">
                              <Shirt size={48} strokeWidth={1} />
                           </div>
                           <p className="text-xs font-black text-[#3a525d]">US Standard Sizing</p>
                           <p className="text-[9px] text-zinc-400 text-center mt-3 font-medium leading-relaxed">
                             Check chest circumference and body length for top wear.
                           </p>
                        </>
                      ) : (
                        <>
                           <div className="w-24 h-24 bg-white shadow-inner rounded-full flex items-center justify-center text-[#2d8d9b] mb-4">
                              <Maximize2 size={48} strokeWidth={1} />
                           </div>
                           <p className="text-xs font-black text-[#3a525d]">US Bottom Sizing</p>
                           <p className="text-[9px] text-zinc-400 text-center mt-3 font-medium leading-relaxed">
                              Check waist measurement and leg length options.
                           </p>
                        </>
                      )}
                  </div>
               </Card>

               {/* Metric Tables */}
               <div className="lg:col-span-9 space-y-6">
                  {chart.metric_groups.map((group, idx) => (
                    <Card key={idx} className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                        <div className="bg-[#3a525d] p-5 text-white flex justify-between items-center">
                           <div>
                              <h2 className="text-lg font-black italic tracking-tighter uppercase">{chart.name} - {group.label}</h2>
                              <p className="text-[8px] font-black tracking-widest opacity-60">REF TABLE {idx + 1} • {unit.toUpperCase()}</p>
                           </div>
                           {idx === 0 && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEdit(chart)} 
                                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-black text-white px-2 text-[10px]"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => {
                                  setChartToDelete(chart.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="w-8 h-8 rounded-lg bg-red-500/20 text-red-100 flex items-center justify-center hover:bg-red-500/30 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                           )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-zinc-50 bg-zinc-50/30">
                                <th className="p-5 text-[9px] font-black uppercase text-zinc-300">Size Label</th>
                                {group.data.map((d, si) => (
                                  <th key={si} className="p-5 text-[10px] font-black uppercase text-[#3a525d] text-center border-l border-zinc-50">
                                     {d.size}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="p-5">
                                   <p className="text-[10px] font-black text-[#3a525d]">{group.label}</p>
                                </td>
                                {group.data.map((d, i) => (
                                  <td key={i} className="p-5 text-[10px] font-bold text-[#2d8d9b] text-center border-l border-zinc-50">
                                     {d.value}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                    </Card>
                  ))}
               </div>
            </div>
          </div>
        ))}

        <div className="flex justify-center pt-10">
           <Button 
            onClick={() => {
              setNewChart({ ...newChart, category: activeTab, metric_groups: getInitialMetrics(activeTab) });
              setEditingId(null);
              setIsAdding(true);
            }}
            className="h-16 px-12 bg-[#2d8d9b] hover:bg-[#3a525d] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#2d8d9b]/20 gap-3"
           >
              <Plus size={20} strokeWidth={3} />
              Register New Size Chart
           </Button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Delete Size Chart?"
        message="This action will permanently remove this record from the database. This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setChartToDelete(null);
        }}
        confirmLabel="Permanent Delete"
        variant="danger"
      />
    </div>
  );
}
