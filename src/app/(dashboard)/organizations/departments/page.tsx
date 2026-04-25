'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, BookOpen, Trash2, Filter, Edit2 } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Select } from '@/components/ui/Select';

interface DepartmentRecord {
  id: number;
  name: string;
  organization_id: number;
  organizations: { name: string };
  created_at: string;
}

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isOrgRole = user?.role?.toLowerCase() === 'school' || user?.role?.toLowerCase() === 'organization';

      let orgsData = [];
      let deptsData = [];

      if (isOrgRole) {
        const deptsRes = await api.get('/departments');
        deptsData = deptsRes.data;
        orgsData = [{ id: user.schoolId || user.organizationId, name: user.schoolName || user.organizationName || user.fullName }];
      } else {
        const [orgsRes, deptsRes] = await Promise.all([
          api.get('/organizations'),
          api.get('/departments' + (selectedOrg ? `?orgId=${selectedOrg}` : ''))
        ]);
        orgsData = orgsRes.data;
        deptsData = deptsRes.data;
      }
      
      setOrganizations(orgsData);
      setDepartments(deptsData);
    } catch (err) {
      toast.error('Failed to load department data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedOrg]);

  const deptFields: FormField[] = [
    { 
      name: 'orgId', 
      label: 'Select Organization', 
      type: 'select', 
      options: organizations.map(o => ({ label: o.name, value: String(o.id) })),
      required: true,
      defaultValue: editingDept?.organization_id ? String(editingDept.organization_id) : undefined
    },
    { 
      name: 'name', 
      label: 'Department Name', 
      type: 'text', 
      placeholder: 'e.g. Sales, HR, Production', 
      required: true,
      maxLength: 20,
      defaultValue: editingDept?.name
    }
  ];

  const handleAddOrUpdate = async (data: any) => {
    const loadingToast = toast.loading(editingDept ? 'Updating department...' : 'Setting up department...');
    try {
      if (editingDept) {
          await api.put(`/departments/${editingDept.id}`, data);
          toast.success('Department updated successfully!', { id: loadingToast });
      } else {
          await api.post('/departments', data);
          toast.success('Department created successfully!', { id: loadingToast });
      }
      setIsAdding(false);
      setEditingDept(null);
      fetchData();
    } catch (err) {
      toast.error('Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    
    const loadingToast = toast.loading('Removing department...');
    const id = deleteConfirm.id;
    setDeleteConfirm({ isOpen: false, id: null });
    
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department removed!', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete department', { id: loadingToast });
    }
  };

  const columns: Column<DepartmentRecord>[] = [
    {
      header: 'Department / Unit',
      accessor: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2d8d9b]/5 rounded-lg flex items-center justify-center text-[#2d8d9b]">
            <BookOpen size={16} />
          </div>
          <p className="font-black text-sm tracking-tight text-[#3a525d]">{d.name || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Parent Organization',
      accessor: (d) => (
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3a525d]">{d.organizations?.name || 'Main Office'}</span>
        </div>
      )
    },
    {
        header: 'Setup Date',
        accessor: (d) => (
            <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-500">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
            </div>
        )
    },
    {
      header: 'Actions',
      accessor: (d) => (
        <div className="flex items-center gap-3">
          <button 
                onClick={() => {
                    setEditingDept(d);
                    setIsAdding(true);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm"
            >
                <Edit2 size={16} />
            </button>
            <button 
                onClick={() => setDeleteConfirm({ isOpen: true, id: d.id.toString() })}
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
          title={editingDept ? "Edit Department" : "Setup New Department"}
          subtitle={editingDept ? `Modify details for ${editingDept.name}` : "Define a new functional unit for an organization"}
          fields={deptFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
              setIsAdding(false);
              setEditingDept(null);
          }}
          submitLabel={editingDept ? "Update Department" : "Create Department"}
          columns={1}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100">
          <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-3 bg-[#3a525d]/5 rounded-2xl">
                  <Filter size={20} className="text-[#3a525d]" />
              </div>
              <div className="min-w-[240px]">
                <Select 
                  placeholder="All Organizations"
                  value={selectedOrg}
                  options={organizations.map(o => ({ label: o.name, value: o.id.toString() }))}
                  onChange={(val: string) => setSelectedOrg(val)}
                />
              </div>
          </div>

          <Button 
            onClick={() => setIsAdding(true)}
            className="h-12 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#3a525d]/20 gap-3 w-full md:w-auto"
          >
            <Plus size={16} strokeWidth={3} />
            Setup Department
          </Button>
      </div>

      <DataTable 
        title="Department Management"
        subtitle="Organize functional groups per organization"
        columns={columns}
        data={departments}
        isLoading={isLoading}
        searchPlaceholder="Filter departments..."
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Department?"
        message="This will permanently remove this department group. This action cannot be undone."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Yes, Delete Department"
        variant="danger"
      />
    </div>
  );
}
