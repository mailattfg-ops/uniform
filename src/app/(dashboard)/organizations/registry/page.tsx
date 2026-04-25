'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Building2, MapPin, Edit2, Trash2, X, Check, Users, School, Calendar, Key, Grid } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface Organization {
  id: number;
  name: string;
  address: string;
  industry_id: number;
  industries?: { name: string };
  created_at: string;
}

interface Industry {
  id: number;
  name: string;
}

export default function OrganizationsRegistry() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [orgsRes, indRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/industries')
      ]);
      setOrganizations(orgsRes.data);
      setIndustries(indRes.data);
    } catch (err) {
      toast.error('Failed to load registry data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const orgFields: FormField[] = [
    { 
      name: 'name', 
      label: 'Organization Name', 
      type: 'text', 
      placeholder: 'e.g. Acme Corp or St. Xavier School', 
      required: true, 
      defaultValue: editingOrg?.name 
    },
    { 
      name: 'industry_id', 
      label: 'Industry Sector', 
      type: 'select', 
      options: industries.map(i => ({ label: i.name, value: String(i.id) })),
      required: true, 
      defaultValue: editingOrg?.industry_id ? String(editingOrg.industry_id) : undefined
    },
    { 
      name: 'address', 
      label: 'Full Address', 
      type: 'text', 
      placeholder: 'Street, City, Country', 
      defaultValue: editingOrg?.address 
    },
    ...(!editingOrg ? [
      { name: 'username', label: 'Admin Username', type: 'text' as const, placeholder: 'e.g. admin_acme', required: true },
      { name: 'password', label: 'Initial Password', type: 'password' as const, placeholder: 'Set login password', required: true }
    ] : [])
  ];

  const handleAddOrUpdate = async (data: any) => {
    const loadingToast = toast.loading(editingOrg ? 'Updating organization...' : 'Registering organization...');
    try {
      if (editingOrg) {
        await api.put(`/organizations/${editingOrg.id}`, data);
        toast.success('Organization updated successfully!', { id: loadingToast });
      } else {
        const response = await api.post('/organizations', data);
        toast.success('Organization registered successfully!', { id: loadingToast });
        
        if (data.username && data.password) {
          setCredsModal({
            isOpen: true,
            data: {
              full_name: data.name,
              username: data.username,
              password: data.password
            }
          });
        }
      }
      setIsAdding(false);
      setEditingOrg(null);
      fetchData();
    } catch (err) {
      toast.error('Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    
    const loadingToast = toast.loading('Purging record...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/organizations/${deleteConfirm.id}`);
      toast.success('Record and all linked data removed', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete organization', { id: loadingToast });
    }
  };

  const handleResetPassword = async (org: Organization) => {
    const loadingToast = toast.loading('Generating secure access key...');
    try {
      const response = await api.post(`/organizations/${org.id}/reset-password`);
      const { newPassword, username } = response.data;
      
      toast.success('Credentials Reset Successfully!', { id: loadingToast });
      
      setCredsModal({
        isOpen: true,
        data: {
          full_name: org.name,
          username: username,
          password: newPassword
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password', { id: loadingToast });
    }
  };

  const columns: Column<Organization>[] = [
    {
      header: 'Organization Details',
      accessor: (o) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#3a525d]/5 rounded-2xl flex items-center justify-center text-[#3a525d]">
            <Building2 size={24} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{o.name}</p>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID: #{o.id}</p>
               <span className="w-1 h-1 rounded-full bg-zinc-300" />
               <p className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest">{o.industries?.name || 'School'}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: (o) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin size={14} className="text-[#2d8d9b]" />
          <span className="text-xs font-semibold truncate max-w-[200px]">{o.address || 'Location not set'}</span>
        </div>
      )
    },
    {
      header: 'System Log',
      accessor: (o) => (
          <div className="flex flex-col">
              <span className="text-xs font-black text-[#3a525d]">
                  {o.created_at ? new Date(o.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Registered Date</span>
          </div>
      )
    },
    {
      header: 'Actions',
      accessor: (o) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
                setEditingOrg(o);
                setIsAdding(true);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleResetPassword(o)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f2994a]/10 text-[#f2994a] border border-[#f2994a]/20 hover:bg-[#f2994a] hover:text-white transition-all shadow-sm"
          >
            <Key size={16} />
          </button>
          <button 
            onClick={() => setDeleteConfirm({ isOpen: true, id: o.id })}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isAdding) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <DynamicForm 
          title={editingOrg ? "Edit Organization" : "Register New Organization"}
          subtitle={editingOrg ? `Update profile for ${editingOrg.name}` : "Configure a new industry organization"}
          fields={orgFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
              setIsAdding(false);
              setEditingOrg(null);
          }}
          submitLabel={editingOrg ? "Save Changes" : "Register Organization"}
          columns={1}
        />
      </div>
    );
  }

  const latestOrg = organizations.length > 0 ? organizations[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#3a525d]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Total Organizations</p>
            <h3 className="text-4xl font-black text-[#3a525d] tracking-tighter">{organizations.length}</h3>
            <p className="text-[10px] font-bold text-green-600 mt-2 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-green-500" />
              Global Registry
            </p>
          </div>
          <div className="w-16 h-16 bg-[#3a525d]/5 rounded-3xl flex items-center justify-center text-[#3a525d] group-hover:scale-110 group-hover:bg-[#3a525d] group-hover:text-white transition-all duration-500">
            <Building2 size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#2d8d9b]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Sectors Covered</p>
            <h3 className="text-4xl font-black text-[#2d8d9b] tracking-tighter">{industries.length}</h3>
            <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              Active Industries
            </p>
          </div>
          <div className="w-16 h-16 bg-[#2d8d9b]/5 rounded-3xl flex items-center justify-center text-[#2d8d9b] group-hover:scale-110 group-hover:bg-[#2d8d9b] group-hover:text-white transition-all duration-500">
            <Grid size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#f2994a]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Recent Onboarding</p>
            <h3 className="text-xl font-black text-[#3a525d] tracking-tight truncate max-w-[180px]">
              {latestOrg ? latestOrg.name : 'No Entries'}
            </h3>
            <p className="text-[10px] font-bold text-[#f2994a] mt-2 uppercase flex items-center gap-1">
              <Calendar size={10} />
              {latestOrg ? new Date(latestOrg.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="w-16 h-16 bg-[#f2994a]/5 rounded-3xl flex items-center justify-center text-[#f2994a] group-hover:scale-110 group-hover:bg-[#f2994a] group-hover:text-white transition-all duration-500">
            <Building2 size={32} />
          </div>
        </div>
      </div>

      <DataTable 
        title="Organizations Registry"
        subtitle="Manage all multi-industry partners and sectors"
        columns={columns}
        data={organizations}
        isLoading={isLoading}
        searchPlaceholder="Search by name, ID or industry..."
        headerAction={
          <Button 
            onClick={() => setIsAdding(true)}
            className="h-12 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={16} strokeWidth={3} />
            Register Organization
          </Button>
        }
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="De-Register Organization?"
        message="This will remove the organization and all linked departments and member records. This action cannot be reversed."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm De-Registration"
        variant="danger"
      />

      <CredentialsModal 
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />
    </div>
  );
}
