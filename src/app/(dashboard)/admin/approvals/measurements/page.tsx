'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, User, Calendar, Ruler, MessageSquare, Loader2, Eye } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MeasurementDetailModal } from '@/components/measurements/MeasurementDetailModal';

interface Measurement {
  id: number;
  member_id: number;
  status: string;
  dynamic_data: Record<string, any>;
  suggested_size: string;
  notes: string;
  recorded_at: string;
  user_profiles: { full_name: string };
  registry_members: { full_name: string; admission_no: string; organizations: { name: string } };
}

export default function MeasurementApprovals() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<Measurement | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/measurements');
      // Filter for Pending only
      setMeasurements(res.data.filter((m: any) => m.status === 'Pending'));
    } catch (err) {
      toast.error('Failed to load pending queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    const loadingToast = toast.loading(`${status === 'Approved' ? 'Approving' : 'Rejecting'} measurement...`);
    try {
      await api.post(`/measurements/${id}/status`, { status });
      toast.success(`Measurement ${status.toLowerCase()} successfully`, { id: loadingToast });
      fetchPending();
    } catch (err) {
      toast.error('Action failed', { id: loadingToast });
    }
  };

  const columns: Column<Measurement>[] = [
    {
      header: 'Staff Member',
      accessor: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100">
            <User size={16} />
          </div>
          <div>
            <p className="text-xs font-black text-[#3a525d]">{m.user_profiles?.full_name || 'System'}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Recorded By</p>
          </div>
        </div>
      )
    },
    {
      header: 'Target Member',
      accessor: (m) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-[#1a1d21]">{m.registry_members?.full_name}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-bold text-[#2d8d9b] uppercase">{m.registry_members?.admission_no}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{m.registry_members?.organizations?.name}</span>
          </div>
        </div>
      )
    },
    {
        header: 'Captured Data',
        accessor: (m) => (
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-[#2d8d9b]/10 text-[#2d8d9b] px-2 py-0.5 rounded-full uppercase">SIZE {m.suggested_size}</span>
                {m.notes && <MessageSquare size={12} className="text-amber-400" />}
             </div>
             <p className="text-[9px] text-muted-foreground font-medium truncate max-w-[150px]">
                {Object.keys(m.dynamic_data || {}).length} modules captured
             </p>
          </div>
        )
    },
    {
        header: 'Recorded On',
        accessor: (m) => (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={14} strokeWidth={2.5} />
                <span className="text-[10px] font-bold">{new Date(m.recorded_at).toLocaleDateString()}</span>
            </div>
        )
    },
    {
      header: 'Actions',
      accessor: (m) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSelectedRecord(m)}
            className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-zinc-100 group shadow-sm"
            title="View Details"
          >
            <Eye size={16} className="group-hover:scale-110 transition-transform" />
          </button>
          <div className="w-px h-6 bg-zinc-100 mx-1" />
          <button 
            onClick={() => handleUpdateStatus(m.id, 'Approved')}
            className="h-9 px-4 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white flex items-center gap-2 transition-all border border-green-500/20 group shadow-sm"
          >
            <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">Approve</span>
          </button>
          <button 
             onClick={() => handleUpdateStatus(m.id, 'Rejected')}
             className="h-9 px-4 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white flex items-center gap-2 transition-all border border-red-500/20 group shadow-sm"
          >
            <XCircle size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">Reject</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
        <div>
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 leading-none">Administrative Gateway</p>
           <h1 className="text-4xl font-black text-[#3a525d] tracking-tighter italic">Measurements Approvals</h1>
        </div>
        <div className="flex gap-4">
            <div className="bg-amber-50 px-8 py-4 rounded-3xl border border-amber-100 flex items-center gap-5 shadow-inner">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-500/30">
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <MessageSquare size={24} />}
                </div>
                <div>
                    <h4 className="text-2xl font-black text-amber-600 leading-none">{measurements.length}</h4>
                    <p className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mt-1">Pending Review</p>
                </div>
            </div>
        </div>
      </div>

      <DataTable 
        title="Pending Measurements Queue"
        subtitle="Review staff submissions before they go live in the registry"
        columns={columns}
        data={measurements}
        isLoading={loading}
      />

      <MeasurementDetailModal 
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </div>
  );
}
