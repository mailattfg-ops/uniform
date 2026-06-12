'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Building2, MapPin, Edit2, Trash2, X, Check, Users, School, Calendar, Key, Grid, Eye, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface Organization {
  id: number;
  customer_code: string | null;
  name: string;
  address: string;
  industry_id: number;
  industries?: { name: string };
  relationship_manager_id: number | null;
  relationship_manager?: { id: number; full_name: string; employee_id: string } | null;
  assigned_operator_id: number | null;
  assigned_operator?: { id: number; full_name: string; employee_id: string } | null;
  created_at: string;
}

interface Industry {
  id: number;
  name: string;
}

export default function OrganizationsRegistry() {
  const router = useRouter();
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
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [orgsRes, indRes, empRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/industries'),
        api.get('/employees')
      ]);
      setOrganizations(orgsRes.data);
      setIndustries(indRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      toast.error('Failed to load registry data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = (org: Organization) => {
    router.push(`/organizations/registry/${org.id}`);
  };

  const generateInitialPassword = () => Math.random().toString(36).slice(-6).toUpperCase();

  const orgFields: FormField[] = [
    {
      name: 'name',
      label: 'Organization Name',
      type: 'text',
      placeholder: 'Only letters allowed',
      required: true,
      pattern: "[a-zA-Z\\s]*",
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
      maxLength: 200,
      defaultValue: editingOrg?.address
    },
    {
      name: 'relationship_manager_id',
      label: 'Assign Relationship Manager (Staff)',
      type: 'select',
      options: [
        { label: 'Unassigned', value: '' },
        ...employees.map(e => ({
          label: `${e.full_name} (${e.employee_id})`,
          value: String(e.id)
        }))
      ],
      required: false,
      defaultValue: editingOrg?.relationship_manager_id ? String(editingOrg.relationship_manager_id) : undefined
    },
    ...(editingOrg && editingOrg.assigned_operator_id ? [
      {
        name: 'assigned_operator_id',
        label: 'Assign Marketing Operator (Staff)',
        type: 'select' as const,
        options: [
          { label: 'Unassigned', value: '' },
          ...employees.map(e => ({
            label: `${e.full_name} (${e.employee_id})`,
            value: String(e.id)
          }))
        ],
        required: false,
        defaultValue: editingOrg?.assigned_operator_id ? String(editingOrg.assigned_operator_id) : undefined
      }
    ] : []),
    ...(!editingOrg ? [
      { name: 'username', label: 'Admin Username', type: 'text' as const, placeholder: 'Max 20 chars', required: true, maxLength: 20 }
    ] : [])
  ];

  const handleAddOrUpdate = async (formData: any) => {
    const loadingToast = toast.loading(editingOrg ? 'Updating organization...' : 'Registering organization...');

    // Normalize fields
    const payload = {
      name: formData.name,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address || null,
      relationship_manager_id: formData.relationship_manager_id ? parseInt(formData.relationship_manager_id, 10) : null,
      assigned_operator_id: formData.assigned_operator_id ? parseInt(formData.assigned_operator_id, 10) : null
    };

    try {
      if (editingOrg) {
        await api.put(`/organizations/${editingOrg.id}`, payload);
        toast.success('Organization updated successfully!', { id: loadingToast });
      } else {
        // Auto-generate password for new organization
        const autoPassword = generateInitialPassword();
        const submissionData = {
          ...payload,
          username: formData.username,
          password: autoPassword
        };

        await api.post('/organizations', submissionData);
        toast.success('Organization registered successfully!', { id: loadingToast });

        setCredsModal({
          isOpen: true,
          data: {
            full_name: formData.name,
            username: formData.username,
            password: autoPassword
          }
        });
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
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                {o.customer_code ? `Code: ${o.customer_code}` : `ID: #${o.id}`}
              </p>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <p className="text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest">{o.industries?.name || 'School'}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Relationship Manager',
      accessor: (o) => (
        o.relationship_manager ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Users size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-[#3a525d]">{o.relationship_manager.full_name}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{o.relationship_manager.employee_id}</p>
            </div>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-zinc-50 border border-zinc-150 rounded-lg text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Unassigned</span>
        )
      )
    },
    {
      header: 'Marketing Operator',
      accessor: (o) => (
        o.assigned_operator ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 flex items-center justify-center text-[#2d8d9b]">
              <Users size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-[#3a525d]">{o.assigned_operator.full_name}</p>
              <p className="text-[9px] font-bold text-zinc-455 uppercase tracking-wider mt-0.5">{o.assigned_operator.employee_id} (Lead)</p>
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">—</span>
        )
      )
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
          <Button
            onClick={() => handleViewDetails(o)}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-sm !p-0"
            title="View Details"
          >
            <Eye size={16} />
          </Button>
          <Button
            onClick={() => {
              setEditingOrg(o);
              setIsAdding(true);
            }}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm !p-0"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={() => handleResetPassword(o)}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f2994a]/10 text-[#f2994a] border border-[#f2994a]/20 hover:bg-[#f2994a] hover:text-white transition-all shadow-sm !p-0"
          >
            <Key size={16} />
          </Button>
          <Button
            onClick={() => setDeleteConfirm({ isOpen: true, id: o.id })}
            variant="secondary"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm !p-0"
          >
            <Trash2 size={16} />
          </Button>
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
