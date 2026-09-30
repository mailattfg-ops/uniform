'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Activity, Clock, Edit, UserPlus, Database, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { formatDate } from '@/lib/formatters';

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  user: string;
  details: string;
  time: string;
  created_at: string;
}

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMissingSchema, setIsMissingSchema] = useState(false);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    api.get('/audit')
      .then(res => {
        if (res.data.error === 'SCHEMA_MISSING') {
            setIsMissingSchema(true);
        } else {
            setLogs(res.data);
        }
      })
      .catch(err => {
        console.error('Audit fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const getActionLabel = (action: string, entity: string) => {
    const act = (action || 'ACTION').toUpperCase();
    const ent = (entity || 'SYSTEM').toUpperCase();
    
    const labels: Record<string, string> = {
      'CREATE_MEMBER': 'Member Registration',
      'UPDATE_MEMBER': 'Member Profile Update',
      'DELETE_MEMBER': 'Member De-registered',
      'SAVE_MEASUREMENT': 'Measurement Logged',
      'UPDATE_ORGANIZATION': 'Organization Updated',
      'CREATE_ORGANIZATION': 'New Organization Added',
      'LOGIN_AUTH': 'System Login',
      'CREATE_PRODUCT': 'Inventory Item Added',
      'UPDATE_PRODUCT': 'Product Article Updated',
      'APPROVED_MEASUREMENT': 'Measurement Approved',
      'REJECTED_MEASUREMENT': 'Measurement Rejected',
      // Employee & Workforce HRMS
      'CREATE_EMPLOYEE': 'Staff Onboarded',
      'UPDATE_EMPLOYEE': 'Staff Profile Updated',
      'DELETE_EMPLOYEE': 'Staff Profile Removed',
      'DEPUTE_EMPLOYEE': 'Temporary Deputation Assigned',
      'RECALL_EMPLOYEE': 'Deputation Recalled to Base',
      'TRANSFER_EMPLOYEE': 'Permanent Branch Transfer',
      'RESET_PASSWORD_EMPLOYEE': 'Portal Access / Password Reset',
      // Branch Outlets
      'CREATE_BRANCH': 'New Branch Registered',
      'UPDATE_BRANCH': 'Branch Details Updated',
      'CREATE_USER_BRANCH': 'Branch User Credentials Added',
    };

    return labels[`${act}_${ent}`] || `${act} ${ent}`;
  };

  const getActionIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN')) return <Activity size={16} className="text-emerald-500" />;
    if (act.includes('APPROVED')) return <CheckCircle2 size={16} className="text-green-500" />;
    if (act.includes('REJECTED')) return <XCircle size={16} className="text-red-500" />;
    if (act.includes('DEPUTE')) return <Activity size={16} className="text-amber-500" />;
    if (act.includes('TRANSFER')) return <Edit size={16} className="text-indigo-500" />;
    if (act.includes('RECALL')) return <CheckCircle2 size={16} className="text-teal-500" />;
    if (act.includes('UPDATE') || act.includes('SAVE')) return <Edit size={16} className="text-amber-500" />;
    if (act.includes('CREATE')) return <UserPlus size={16} className="text-[#2d8d9b]" />;
    return <Database size={16} className="text-zinc-400" />;
  };

  const columns: Column<AuditEntry>[] = [
    {
      header: 'System Activity',
      accessor: (l) => (
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100">
            {getActionIcon(l.action)}
          </div>
          <div>
            <p className="font-bold text-[12px]">{getActionLabel(l.action, l.entity_type)}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5 tracking-widest leading-none">REF-{l.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Performed By',
      accessor: (l) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">{l.user}</span>
      ),
    },
    {
       header: 'Action Details',
       accessor: (l) => {
         try {
           const d = JSON.parse(l.details);
           
           // Measurement specific formatting
           if (l.action === 'SAVE' && l.entity_type === 'measurement') {
             return (
               <div className="space-y-1">
                 <p className="text-xs text-[#2d8d9b] font-bold uppercase tracking-tight">Size: {d.suggested_size || 'N/A'}</p>
                 {d.notes && <p className="text-[10px] text-muted-foreground italic truncate max-w-[300px]">Notes: "{d.notes}"</p>}
               </div>
             );
           }

           // Employee Specific Formatting
           if (l.entity_type === 'employee') {
             if (l.action === 'DEPUTE') {
               return (
                 <p className="text-xs text-amber-900 font-semibold">
                   ✈️ Deputed {d.employee_name || 'Staff'} to Branch #{d.temp_branch_id} {d.temp_branch_until ? `until ${formatDate(d.temp_branch_until)}` : ''}
                 </p>
               );
             }
             if (l.action === 'RECALL') {
               return (
                 <p className="text-xs text-teal-800 font-semibold">
                   ↩️ Recalled {d.employee_name || 'Staff'} back to Base Branch
                 </p>
               );
             }
             if (l.action === 'TRANSFER') {
               return (
                 <p className="text-xs text-indigo-900 font-semibold">
                   🔄 Permanently transferred {d.employee_name || 'Staff'} to Branch #{d.to_branch_id}
                 </p>
               );
             }
             if (l.action === 'CREATE') {
               return (
                 <p className="text-xs text-slate-700 font-medium">
                   Onboarded: <strong className="text-[#3a525d]">{d.full_name}</strong> ({d.employee_id}) • {d.designation || 'Staff'}
                 </p>
               );
             }
             if (l.action === 'RESET_PASSWORD') {
               return (
                 <p className="text-xs text-slate-700 font-medium">
                   🔑 Reset portal password for staff: <strong className="text-[#3a525d]">{d.employee_id || `#${d.employee_record_id}`}</strong>
                 </p>
               );
             }
           }

           // Branch Specific Formatting
           if (l.entity_type === 'branch') {
             return (
               <p className="text-xs text-slate-700 font-medium">
                 {l.action === 'CREATE' ? 'Created Branch: ' : 'Updated Branch: '}
                 <strong className="text-[#3a525d]">{d.name}</strong> ({d.code || 'N/A'}) {d.tier ? `• Tier: ${d.tier}` : ''}
               </p>
             );
           }

           // Update specific formatting (Entity Field Diff)
           if (l.action === 'UPDATE') {
             return (
               <div className="space-y-1">
                 <p className="text-[10px] font-bold text-[#3a525d] uppercase tracking-tighter">Fields Modified</p>
                 <div className="flex flex-wrap gap-1">
                    {Object.keys(d.updated_fields || d || {}).filter(k => k !== 'timestamp_ist' && k !== 'performed_by_name').map(k => (
                      <span key={k} className="text-[8px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500 font-bold uppercase">{k.replace('_', ' ')}</span>
                    ))}
                 </div>
               </div>
             );
           }

           // Create specific formatting
           if (l.action === 'CREATE') {
            return <p className="text-xs text-muted-foreground font-medium">New Record: <span className="text-[#3a525d] font-bold">{d.name || d.full_name || 'System Generated'}</span></p>;
           }

           // Login specific formatting
           if (l.action === 'LOGIN') {
             return (
               <div className="space-y-0.5">
                 <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                   <span>Authenticated Session:</span>
                   <span className="font-mono text-[11px] font-bold text-[#3a525d]">{d.performed_by_name || d.email}</span>
                 </p>
                 {(d.role || d.branch_name) && (
                   <p className="text-[10px] text-zinc-500 font-medium">
                     Role: <strong className="text-slate-700">{d.role || 'User'}</strong>
                     {d.branch_name ? ` • Branch: ${d.branch_name}` : ''}
                   </p>
                 )}
               </div>
             );
           }

           return <p className="text-xs text-muted-foreground italic truncate max-w-[400px]">"{l.details}"</p>;
         } catch (e) {
           return <p className="text-xs text-muted-foreground italic truncate max-w-[400px]">"{l.details}"</p>;
         }
       },
    },
    {
       header: 'Timestamp (IST)',
       accessor: (l) => (
         <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
           <Clock size={12} className="shrink-0 text-[#2d8d9b]" />
           <span className="text-[10px] font-bold tracking-wider text-slate-700">
             {formatDate(l.created_at || l.time, true, true)}
           </span>
         </div>
       ),
    },
  ];

  const processedLogs = React.useMemo(() => {
    return logs
      .filter(l => {
        if (!dateFilter) return true;
        const ts = l.created_at || l.time;
        if (!ts) return false;
        
        const logDate = new Date(ts);
        if (isNaN(logDate.getTime())) return false;
        
        // Match against HTML date input (YYYY-MM-DD) in Indian Standard Time (Asia/Kolkata)
        const istDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(logDate);
        
        return istDateStr === dateFilter;
      })
      .sort((a, b) => new Date(b.created_at || b.time).getTime() - new Date(a.created_at || a.time).getTime());
  }, [logs, dateFilter]);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2d8d9b]" size={32} />
      </div>
    );
  }

  if (isMissingSchema) {
    return (
        <div className="p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-100 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500">
                <Database size={40} />
            </div>
            <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-black text-[#3a525d]">Audit Logs are Offline</h3>
                <p className="text-sm text-muted-foreground font-medium">The database table for tracking activity hasn't been created yet. Please copy the SQL from `backend/migrations/create_audit_logs_table.sql` and run it in your Supabase SQL Editor.</p>
            </div>
        </div>
    );
  }

  return (
    <DataTable 
      title="Audit Logs" 
      subtitle="Complete system trace and activity monitoring (Who updated what)"
      columns={columns} 
      data={processedLogs}
      headerAction={
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            onClick={(e) => {
              try {
                (e.target as HTMLInputElement).showPicker();
              } catch (err) {
                // Fallback for browsers that don't support showPicker
              }
            }}
            className="h-11 px-4 rounded-2xl border-2 border-zinc-100 bg-zinc-50 text-[11px] font-black uppercase tracking-widest text-[#3a525d] outline-none focus:border-[#2d8d9b] focus:bg-white transition-all cursor-pointer"
          />
          {dateFilter && (
            <Button
              onClick={() => setDateFilter('')}
              variant="secondary"
              className="text-[9px] uppercase font-black tracking-widest text-zinc-400 hover:text-red-500 transition-colors bg-transparent border-none shadow-none"
            >
              Clear Date
            </Button>
          )}
        </div>
      }
    />
  );
};
