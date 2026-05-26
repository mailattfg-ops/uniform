'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  Clock,
  Database,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Component {
  name: string;
  type: 'percentage';
  value: number;
}

interface Slab {
  min_qty: number;
  max_qty: number | null;
  adjustment_percent: number;
  enabled: boolean;
}

interface SAMConfig {
  id: number;
  name: string;
  product_id: number | null;
  wholesale_slabs: Slab[];
  retail_slabs: Slab[];
  is_active: boolean;
  components: Component[];
}

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  user: string;
  details: string;
  time: string;
  created_at: string;
}

export default function SAMConfigurations() {
  const [activeTab, setActiveTab] = useState<'configure' | 'audit'>('configure');
  const [config, setConfig] = useState<SAMConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Local edit states
  const [components, setComponents] = useState<Component[]>([]);
  const [wholesaleSlabs, setWholesaleSlabs] = useState<Slab[]>([]);
  const [retailSlabs, setRetailSlabs] = useState<Slab[]>([]);

  // Fetch the first global config
  const fetchGlobalConfig = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/sam-management/configurations');
      
      if (res.data && res.data.error === 'SCHEMA_MISSING') {
        setConfig(null);
        return;
      }

      // Find the global config (or use the first available one)
      const globalConfig = (res.data || []).find((c: any) => c.product_id === null) || res.data?.[0];
      
      if (globalConfig) {
        setConfig(globalConfig);
        // Map types to percentage for safety
        const comps = (globalConfig.components || []).map((c: any) => ({
          name: c.name,
          type: 'percentage',
          value: parseFloat(String(c.value || 0))
        }));
        setComponents(comps);
        setWholesaleSlabs(globalConfig.wholesale_slabs || []);
        setRetailSlabs(globalConfig.retail_slabs || []);
      } else {
        // No config seeded yet, let's create a placeholder structure
        const placeholder: SAMConfig = {
          id: 0,
          name: 'Default SAM Setup',
          product_id: null,
          is_active: true,
          wholesale_slabs: [],
          retail_slabs: [],
          components: []
        };
        setConfig(placeholder);
        setComponents([]);
        setWholesaleSlabs([]);
        setRetailSlabs([]);
      }
    } catch (err: any) {
      toast.error('Failed to load SAM configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/sam-management/audit-logs');
      setAuditLogs(res.data || []);
    } catch (err) {
      toast.error('Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'configure') {
      fetchGlobalConfig();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    // Validation
    const emptyNames = components.some(c => !c.name.trim());
    if (emptyNames) {
      toast.error('All Cost Head names must be filled out.');
      return;
    }

    const payload = {
      name: config.name || 'Default Readymade SAM Setup',
      product_id: null,
      wholesale_slabs: wholesaleSlabs,
      retail_slabs: retailSlabs,
      is_active: true,
      components: components
    };

    setIsSaving(true);
    const loadingToast = toast.loading('Saving SAM configuration...');
    try {
      if (config.id > 0) {
        await api.put(`/sam-management/configurations/${config.id}`, payload);
      } else {
        await api.post('/sam-management/configurations', payload);
      }
      toast.success('SAM configuration settings saved successfully!', { id: loadingToast });
      fetchGlobalConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save settings.', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  // Cost head actions
  const handleAddCostHead = () => {
    setComponents([
      ...components,
      { name: '', type: 'percentage', value: 0 }
    ]);
  };

  const handleDeleteCostHead = (index: number) => {
    const updated = [...components];
    updated.splice(index, 1);
    setComponents(updated);
  };

  const handleCostHeadChange = (index: number, field: 'name' | 'value', val: any) => {
    const updated = [...components];
    if (field === 'name') {
      updated[index].name = val;
    } else {
      updated[index].value = parseFloat(val) || 0;
    }
    setComponents(updated);
  };

  const handleSlabChange = (channel: 'wholesale' | 'retail', index: number, field: keyof Slab, val: any) => {
    const target = channel === 'wholesale' ? [...wholesaleSlabs] : [...retailSlabs];
    if (field === 'adjustment_percent') {
      target[index].adjustment_percent = parseFloat(val) || 0;
    } else if (field === 'enabled') {
      target[index].enabled = !!val;
    }
    
    if (channel === 'wholesale') {
      setWholesaleSlabs(target);
    } else {
      setRetailSlabs(target);
    }
  };

  // Audit columns
  const auditColumns: Column<AuditEntry>[] = [
    {
      header: 'Audit Activity',
      accessor: (l) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 text-[#2d8d9b] font-black">
            {l.action === 'CREATE' ? 'C' : l.action === 'UPDATE' ? 'U' : 'D'}
          </div>
          <div>
            <p className="font-bold text-xs text-[#3a525d]">
              {l.action === 'CREATE' ? 'Settings Initialized' : l.action === 'UPDATE' ? 'Settings Modified' : 'Settings Reset'}
            </p>
            <p className="text-[9px] font-black text-muted-foreground uppercase mt-0.5 tracking-widest leading-none">REF-{l.id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Performed By',
      accessor: (l) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">{l.user}</span>
      )
    },
    {
      header: 'Change Log details',
      accessor: (l) => {
        try {
          const d = JSON.parse(l.details);
          if (l.action === 'UPDATE') {
            const oldComps = d.previous?.components || [];
            const newComps = d.updated?.components || [];
            
            // Find added, deleted, or updated
            const added = newComps.filter((nc: any) => !oldComps.some((oc: any) => oc.name === nc.name)).map((c: any) => c.name);
            const deleted = oldComps.filter((oc: any) => !newComps.some((nc: any) => nc.name === oc.name)).map((c: any) => c.name);
            const modified = newComps.filter((nc: any) => {
              const oc = oldComps.find((c: any) => c.name === nc.name);
              return oc && oc.value !== nc.value;
            }).map((c: any) => c.name);

            return (
              <div className="space-y-1 text-xs">
                {added.length > 0 && (
                  <p className="text-emerald-600 font-semibold">Added: {added.join(', ')}</p>
                )}
                {deleted.length > 0 && (
                  <p className="text-rose-500 font-semibold">Removed: {deleted.join(', ')}</p>
                )}
                {modified.length > 0 && (
                  <p className="text-[#2d8d9b] font-semibold">Modified: {modified.join(', ')}</p>
                )}
                {added.length === 0 && deleted.length === 0 && modified.length === 0 && (
                  <p className="text-zinc-400 italic">Slab tier values / Status adjusted</p>
                )}
              </div>
            );
          }
          return <p className="text-xs text-zinc-500">Configuration initial seed</p>;
        } catch (e) {
          return <p className="text-xs text-zinc-400 italic">Details parse error</p>;
        }
      }
    },
    {
      header: 'Timestamp',
      accessor: (l) => (
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Clock size={12} />
          <span className="text-[10px] font-bold tracking-widest">{l.time}</span>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-spin text-[#2d8d9b] border-4 border-t-transparent rounded-full w-12 h-12" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-100 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-black text-[#3a525d]">SAM Schema Missing</h3>
          <p className="text-sm text-muted-foreground font-medium">Please run the SQL migration inside your Supabase Editor to create the SAM configurations and component database tables.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Tab Selector */}
      <div className="flex border-b border-zinc-100 gap-1 bg-white p-1 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('configure')}
          className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'configure'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          Configure Cost Heads & Slabs
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'audit'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          Configuration Audit Log
        </button>
      </div>

      {activeTab === 'configure' ? (
        <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-zinc-100/80 space-y-8 animate-in zoom-in-98 duration-300">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#3a525d]">Readymade SAM Costing Matrix</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Define cost heads as percentages of the calculator base stitching value
              </p>
            </div>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-12 px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          {/* Configurable Cost Heads list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-xs font-black text-[#3a525d] uppercase tracking-widest">
                1. Cost Head Components
              </h4>
              <button
                type="button"
                onClick={handleAddCostHead}
                className="text-xs font-black uppercase tracking-wider text-[#2d8d9b] hover:text-[#2d8d9b]/80 flex items-center gap-1"
              >
                <PlusCircle size={14} />
                Add Cost Head
              </button>
            </div>

            {components.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-6 bg-zinc-50 rounded-2xl border border-zinc-100/50">
                No cost head components defined. Click "Add Cost Head" to add one.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {components.map((comp, idx) => (
                  <div key={idx} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        required
                        value={comp.name}
                        onChange={(e) => handleCostHeadChange(idx, 'name', e.target.value)}
                        placeholder="Cost Head Name (e.g. Profit)"
                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-bold text-[#3a525d] focus:border-[#2d8d9b] outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={comp.value}
                          onChange={(e) => handleCostHeadChange(idx, 'value', e.target.value)}
                          className="w-18 h-9 px-2 rounded-lg border border-zinc-200 bg-white text-xs font-bold text-right text-[#3a525d] focus:border-[#2d8d9b] outline-none"
                        />
                        <span className="text-xs font-black text-[#3a525d]">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCostHead(idx)}
                        className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-100 flex items-center justify-center transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slabs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            {/* Wholesale Slabs */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest border-b pb-2">2. Wholesale slabs modifier</h4>
              <div className="space-y-2 border border-zinc-100 rounded-2xl p-4 bg-zinc-50/30 max-h-[360px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-4 text-[9px] font-black uppercase text-zinc-400 tracking-wider pb-2 border-b">
                  <span className="col-span-2">Quantity Tier</span>
                  <span className="text-right">Adjustment %</span>
                  <span className="text-center">Status</span>
                </div>
                {wholesaleSlabs.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-4 items-center text-xs font-semibold text-[#3a525d] py-2 border-b border-zinc-100/50">
                    <span className="col-span-2 font-mono">
                      {s.max_qty === null ? `${s.min_qty}+` : `${s.min_qty} - ${s.max_qty}`}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={s.adjustment_percent}
                      onChange={(e) => handleSlabChange('wholesale', idx, 'adjustment_percent', e.target.value)}
                      className="w-16 h-8 px-2 rounded border border-zinc-200 text-xs font-semibold text-right justify-self-end focus:border-[#2d8d9b] outline-none"
                    />
                    <div className="text-center flex justify-center">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) => handleSlabChange('wholesale', idx, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 text-[#2d8d9b] focus:ring-[#2d8d9b]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retail Slabs */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-purple-600 uppercase tracking-widest border-b pb-2">3. Retail slabs modifier</h4>
              <div className="space-y-2 border border-zinc-100 rounded-2xl p-4 bg-zinc-50/30 max-h-[360px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-4 text-[9px] font-black uppercase text-zinc-400 tracking-wider pb-2 border-b">
                  <span className="col-span-2">Quantity Tier</span>
                  <span className="text-right">Adjustment %</span>
                  <span className="text-center">Status</span>
                </div>
                {retailSlabs.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-4 items-center text-xs font-semibold text-[#3a525d] py-2 border-b border-zinc-100/50">
                    <span className="col-span-2 font-mono">
                      {s.max_qty === null ? `${s.min_qty}+` : `${s.min_qty} - ${s.max_qty}`}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={s.adjustment_percent}
                      onChange={(e) => handleSlabChange('retail', idx, 'adjustment_percent', e.target.value)}
                      className="w-16 h-8 px-2 rounded border border-zinc-200 text-xs font-semibold text-right justify-self-end focus:border-[#2d8d9b] outline-none"
                    />
                    <div className="text-center flex justify-center">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) => handleSlabChange('retail', idx, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 text-[#2d8d9b] focus:ring-[#2d8d9b]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="animate-in fade-in duration-500">
          <DataTable
            title="SAM Configurations Audit Logs"
            subtitle="Complete trace of costing configuration additions, removals, and edits"
            columns={auditColumns}
            data={auditLogs}
            searchPlaceholder="Filter audit trails..."
          />
        </div>
      )}
    </div>
  );
}
