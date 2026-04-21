'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Building2, MapPin, Edit2, Trash2, X, Check, Users, School, Calendar, Key } from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface School {
  id: number;
  name: string;
  address: string;
  created_at: string;
}

export default function SchoolsRegistry() {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
    } catch (err) {
      toast.error('Failed to load schools registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const schoolFields: FormField[] = [
    { name: 'name', label: 'School Name', type: 'text', placeholder: 'e.g. St. Xavier High School', required: true, defaultValue: editingSchool?.name },
    { name: 'address', label: 'Full Address', type: 'text', placeholder: 'Street, City, Pin Code', defaultValue: editingSchool?.address },
    ...(!editingSchool ? [
      { name: 'username', label: 'System Username', type: 'text' as const, placeholder: 'e.g. stxaviers_admin', required: true },
      { name: 'password', label: 'Initial Password', type: 'password' as const, placeholder: 'Set login password', required: true }
    ] : [])
  ];

  const handleAddOrUpdate = async (data: any) => {
    const loadingToast = toast.loading(editingSchool ? 'Updating school...' : 'Registering school...');
    try {
      if (editingSchool) {
        await api.put(`/schools/${editingSchool.id}`, data);
        toast.success('School updated successfully!', { id: loadingToast });
      } else {
        const response = await api.post('/schools/create', data);
        toast.success('School registered successfully!', { id: loadingToast });
        
        // Show credentials for new school
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
      setEditingSchool(null);
      fetchSchools();
    } catch (err) {
      toast.error('Operation failed', { id: loadingToast });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    
    const loadingToast = toast.loading('Purging school record...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/schools/${deleteConfirm.id}`);
      toast.success('School and all linked data removed', { id: loadingToast });
      fetchSchools();
    } catch (err) {
      toast.error('Failed to delete school', { id: loadingToast });
    }
  };

  const handleResetPassword = async (school: School) => {
    const loadingToast = toast.loading('Generating secure access key...');
    try {
      const response = await api.post(`/schools/${school.id}/reset-password`);
      const { newPassword, username } = response.data;
      
      toast.success('Credentials Reset Successfully!', { id: loadingToast });
      
      setCredsModal({
        isOpen: true,
        data: {
          full_name: school.name,
          username: username,
          password: newPassword
        }
      });

    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password', { id: loadingToast });
    }
  };

  const columns: Column<School>[] = [
    {
      header: 'School Details',
      accessor: (s) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#3a525d]/5 rounded-2xl flex items-center justify-center text-[#3a525d]">
            <Building2 size={24} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{s.name}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Ref ID: #{s.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: (s) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin size={14} className="text-[#2d8d9b]" />
          <span className="text-xs font-semibold">{s.address || 'Location not set'}</span>
        </div>
      )
    },
    {
        header: 'Registered On',
        accessor: (s) => (
            <div className="flex flex-col">
                <span className="text-xs font-black text-[#3a525d]">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">System Logged</span>
            </div>
        )
    },
    {
      header: 'Actions',
      accessor: (s) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
                setEditingSchool(s);
                setIsAdding(true);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm"
            title="Edit School"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleResetPassword(s)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f2994a]/10 text-[#f2994a] border border-[#f2994a]/20 hover:bg-[#f2994a] hover:text-white transition-all shadow-sm"
            title="Reset Password"
          >
            <Key size={16} />
          </button>
          <button 
            onClick={() => setDeleteConfirm({ isOpen: true, id: s.id })}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm"
            title="Delete School"
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
          title={editingSchool ? "Edit School Details" : "Register New School"}
          subtitle={editingSchool ? `Modify profile for ${editingSchool.name}` : "Add a new academic partner to the system"}
          fields={schoolFields}
          onSubmit={handleAddOrUpdate}
          onCancel={() => {
              setIsAdding(false);
              setEditingSchool(null);
          }}
          submitLabel={editingSchool ? "Save Changes" : "Create School Profile"}
          columns={1}
        />
      </div>
    );
  }

  const latestSchool = schools.length > 0 ? schools[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#3a525d]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Total Institutions</p>
            <h3 className="text-4xl font-black text-[#3a525d] tracking-tighter">{schools.length}</h3>
            <p className="text-[10px] font-bold text-green-600 mt-2 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-green-500" />
              Live Connectivity
            </p>
          </div>
          <div className="w-16 h-16 bg-[#3a525d]/5 rounded-3xl flex items-center justify-center text-[#3a525d] group-hover:scale-110 group-hover:bg-[#3a525d] group-hover:text-white transition-all duration-500">
            <School size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#2d8d9b]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Partner Coverage</p>
            <h3 className="text-4xl font-black text-[#2d8d9b] tracking-tighter">100%</h3>
            <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              Active Integration
            </p>
          </div>
          <div className="w-16 h-16 bg-[#2d8d9b]/5 rounded-3xl flex items-center justify-center text-[#2d8d9b] group-hover:scale-110 group-hover:bg-[#2d8d9b] group-hover:text-white transition-all duration-500">
            <Users size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#f2994a]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Latest Entry</p>
            <h3 className="text-xl font-black text-[#3a525d] tracking-tight truncate max-w-[180px]">
              {latestSchool ? latestSchool.name : 'No Entries'}
            </h3>
            <p className="text-[10px] font-bold text-[#f2994a] mt-2 uppercase flex items-center gap-1">
              <Calendar size={10} />
              {latestSchool ? new Date(latestSchool.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="w-16 h-16 bg-[#f2994a]/5 rounded-3xl flex items-center justify-center text-[#f2994a] group-hover:scale-110 group-hover:bg-[#f2994a] group-hover:text-white transition-all duration-500">
            <Building2 size={32} />
          </div>
        </div>
      </div>

      <DataTable 
        title="Schools Registry"
        subtitle="Manage academic institutions and partners"
        columns={columns}
        data={schools}
        isLoading={isLoading}
        searchPlaceholder="Search schools by name or address..."
        headerAction={
          <Button 
            onClick={() => setIsAdding(true)}
            className="h-12 px-8 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={16} strokeWidth={3} />
            Register School
          </Button>
        }
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="De-Register School?"
        message="Running this action will remove the school and all its linked classes and student records. This is a destructive system action."
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
