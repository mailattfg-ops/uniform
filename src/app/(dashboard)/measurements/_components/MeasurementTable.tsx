'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Eye, Clock, CheckCircle2, MoreHorizontal, User, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface MeasurementRecord {
  id: string;
  member_id: string;
  suggested_size: string;
  recorded_at: string;
  dynamic_data: any;
  notes: string;
  registry_members: {
    full_name: string;
    admission_no: string;
    organizations: {
      name: string;
    }
  };
  user_profiles?: {
    full_name: string;
  };
}

export const MeasurementTable: React.FC = () => {
  const [data, setData] = useState<MeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/measurements');
      // Flatten for search support
      const enriched = res.data.map((r: any) => {
        const name = r.registry_members?.full_name || '';
        const rid = r.registry_members?.admission_no || '';
        const org = r.registry_members?.organizations?.name || '';
        const staff = r.user_profiles?.full_name || 'System';
        
        return {
          ...r,
          search_name: name,
          search_id: rid,
          search_org: org,
          search_staff: staff,
          // Combined catch-all for the table's simple filter
          search_all: `${name} ${rid} ${org} ${staff}`.toLowerCase()
        };
      });
      setData(enriched);
    } catch (err) {
      toast.error('Failed to load measurement history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: Column<MeasurementRecord>[] = [
    {
      header: 'Member Details',
      accessor: (r) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b] shadow-inner font-black italic">
            {r.registry_members?.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-black text-[13px] tracking-tighter text-[#3a525d] leading-none uppercase">{r.registry_members?.full_name}</p>
            <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-[0.2em] mt-2 opacity-70">RID-{r.registry_members?.admission_no}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Entity / Organization',
      accessor: (r) => (
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] opacity-80">{r.registry_members?.organizations?.name || 'Inland ERP'}</p>
          <span className="text-[8px] font-black text-[#2d8d9b] uppercase tracking-widest bg-zinc-50 px-2 py-0.5 rounded mt-1 inline-block border border-zinc-100">Verified System Data</span>
        </div>
      ),
    },
    {
      header: 'Suggested Size',
      accessor: (r) => (
        <div className="flex items-center gap-3">
           <div className="px-5 py-2 bg-[#2d8d9b] text-white rounded-xl font-black text-xs shadow-lg shadow-[#2d8d9b]/20 italic tracking-tighter">
              {r.suggested_size}
           </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: () => (
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100/50">
              <ShieldCheck size={12} strokeWidth={3} />
              <span className="text-[9px] font-black uppercase tracking-wider">Measured</span>
           </div>
        </div>
      ),
    },
    {
      header: 'Capture Log',
      accessor: (r) => {
        const date = new Date(r.recorded_at);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        
        return (
          <div className="space-y-1.5 py-2">
            <div className="flex items-center gap-2 text-zinc-400">
               <Clock size={10} />
               <span className="text-[10px] font-bold">{formattedDate} • {formattedTime}</span>
            </div>
            <p className="text-[9px] font-black text-[#8b6b5a] uppercase tracking-widest">
               REF: {r.user_profiles?.full_name || 'System Auto'}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: () => (
        <div className="flex gap-1 justify-end">
          <button className="p-3 bg-zinc-50 hover:bg-[#2d8d9b] hover:text-white transition-all rounded-xl text-zinc-400 group">
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-in fade-in duration-700">
      <DataTable 
        title="Measurement History"
        subtitle="Universal Tailoring Audit Log"
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Filter logic by member name or ID..."
      />
    </div>
  );
};
