'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Edit2, Trash2, UserPlus, FileUp, Key, Download, Filter, User } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { Select } from '@/components/ui/Select';
import { MemberProfileModal } from '@/components/entities/MemberProfileModal';

interface Entity {
  id: number;
  admission_no: string;
  full_name: string;
  status: string;
  organizations?: { name: string };
  departments?: { name: string };
  created_at: string;
  measurement_status?: string;
}

interface EntityTableProps {
  onRegister: () => void;
  onBulkUpload: () => void;
  onEdit: (entity: any) => void;
}

export const StudentTable: React.FC<EntityTableProps> = ({ onRegister, onBulkUpload, onEdit }) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [resetConfirm, setResetConfirm] = useState<{ isOpen: boolean; entity: Entity | null }>({
    isOpen: false,
    entity: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });
  const [profileModal, setProfileModal] = useState<{ isOpen: boolean; member: Entity | null }>({
    isOpen: false,
    member: null
  });

  const fetchFilters = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isOrgRole = user?.role?.toLowerCase() === 'school' || user?.role?.toLowerCase() === 'organization';

      const [orgsRes, deptsRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/departments')
      ]);

      if (isOrgRole) {
        const orgId = user.schoolId || user.organizationId;
        setOrganizations([{ id: orgId, name: user.schoolName || user.organizationName || user.fullName }]);
        setSelectedOrg(orgId.toString());
      } else {
        setOrganizations(orgsRes.data);
      }
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error('Failed to load filters');
    }
  };

  const fetchEntities = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedOrg) queryParams.append('schoolId', selectedOrg);
      if (selectedDept) queryParams.append('classId', selectedDept);
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await api.get(`/students?${queryParams.toString()}`);
      setEntities(response.data);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
      toast.error('Failed to load registry');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = () => {
    if (entities.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Full Name', 'Reference No', 'Organization', 'Department / Section', 'Status', 'Measurement Status', 'Onboarded Date'];
    const rows = entities.map(e => [
      `"${e.full_name}"`,
      `"${e.admission_no}"`,
      `"${e.organizations?.name || 'Main Registry'}"`,
      `"${e.departments?.name || 'N/A'}"`,
      `"${e.status || 'Active'}"`,
      `"${e.measurement_status || 'Missing'}"`,
      `"${new Date(e.created_at).toLocaleDateString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `entity_directory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Directory Exported');
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEntities();
    }, searchQuery ? 500 : 0);
    return () => clearTimeout(timer);
  }, [selectedOrg, selectedDept, searchQuery]);

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Deleting record...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/students/${deleteConfirm.id}`);
      toast.success('Record and access account purged', { id: loadingToast });
      fetchEntities();
    } catch (err) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const handleConfirmedReset = async () => {
    if (!resetConfirm.entity) return;
    const entity = resetConfirm.entity;
    const loadingToast = toast.loading('Generating secure access...');
    setResetConfirm({ isOpen: false, entity: null });
    
    try {
      const response = await api.post(`/students/${entity.id}/reset-password`);
      setCredsModal({
        isOpen: true,
        data: {
          full_name: entity.full_name,
          username: response.data.username,
          password: response.data.newPassword
        }
      });
      toast.success('Access keys updated!', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to reset access', { id: loadingToast });
    }
  };

  const columns: Column<Entity>[] = [
    {
      header: 'Entity / Member Name',
      accessor: (e) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#3a525d]/5 border border-[#3a525d]/10 flex items-center justify-center font-bold text-[#3a525d] text-[10px] shadow-sm">
            {e.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight text-[#3a525d] leading-none">{e.full_name}</p>
            <p className="text-[9px] text-[#2d8d9b] font-bold uppercase tracking-[0.1em] mt-1.5 opacity-80">Ref: #{e.admission_no}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Org & Registry',
      accessor: (e) => (
        <div className="flex flex-col gap-1">
          <p className="font-bold text-[12px] tracking-tight text-[#3a525d]">{e.organizations?.name || 'Main Registry'}</p>
          <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-[0.1em] leading-none">
            {e.departments?.name || 'Unassigned'}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (e: any) => (
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
          e.status === 'Active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          {e.status || 'Active'}
        </span>
      ),
    },
    {
        header: 'Measurement Status',
        accessor: (e: any) => {
          const status = e.measurement_status || 'Missing';
          const colors: Record<string, string> = {
            'Approved': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
            'Pending': 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse',
            'Missing': 'bg-zinc-100 text-zinc-400 border border-zinc-200'
          };
          return (
            <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-lg ${colors[status]}`}>
              {status === 'Pending' ? 'Awaiting Review' : status}
            </span>
          );
        }
    },
    {
      header: 'Actions',
      accessor: (e) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setProfileModal({ isOpen: true, member: e })}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-[#3a525d]/5 text-[#3a525d] hover:bg-[#3a525d] hover:text-white transition-all shadow-sm"
            title="View Profile"
          >
            <User size={16} />
          </button>
          <button 
            onClick={() => setResetConfirm({ isOpen: true, entity: e })}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
          >
            <Key size={16} />
          </button>
          <button 
            onClick={() => onEdit(e)}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteConfirm({ isOpen: true, id: e.id })}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      className: 'w-40',
    },
  ];

  return (
    <>
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="p-3 bg-[#3a525d]/5 rounded-2xl hidden sm:block">
                  <Filter size={20} className="text-[#3a525d]" />
              </div>
              <div className="w-full sm:w-[220px]">
                <Select 
                  placeholder="All Organizations"
                  value={selectedOrg}
                  options={organizations.map(o => ({ label: o.name, value: o.id.toString() }))}
                  onChange={(val: string) => {
                    setSelectedOrg(val);
                    setSelectedDept(''); 
                  }}
                />
              </div>
              <div className="w-full sm:w-[220px]">
                <Select 
                  placeholder="All Departments"
                  value={selectedDept}
                  options={departments
                    .filter(d => !selectedOrg || d.organization_id.toString() === selectedOrg)
                    .map(d => ({ label: d.name, value: d.id.toString() }))}
                  onChange={(val: string) => setSelectedDept(val)}
                />
              </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
              <Button 
                onClick={downloadCSV}
                variant="secondary"
                className="h-11 px-6 bg-[#3a525d]/5 text-[#3a525d] hover:bg-[#3a525d] hover:text-black rounded-2xl font-black uppercase tracking-widest text-[9px] border-none gap-2 shadow-sm"
              >
                <Download size={14} /> Export
              </Button>
              <Button 
                onClick={onRegister}
                className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white border-none shadow-lg shadow-[#3a525d]/20"
              >
                <UserPlus size={14} strokeWidth={3} />
                Register
              </Button>
              <Button 
                onClick={onBulkUpload}
                variant="secondary" 
                className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 border border-[#fce4d4] text-[#3a525d] bg-white hover:bg-[#fce4d4]"
              >
                <FileUp size={14} strokeWidth={3} />
                Import Data
              </Button>
          </div>
      </div>

      <DataTable 
        title="Entity Directory"
        subtitle="Global Registry Management"
        columns={columns}
        data={entities}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        searchPlaceholder="Search by name, ID or reference..."
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Record?"
        message="This action will permanently remove the profile and revoke portal access. This cannot be undone."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />

      <ConfirmModal 
        isOpen={resetConfirm.isOpen}
        title="Reset Access Keys?"
        message={`Generate new secure credentials for ${resetConfirm.entity?.full_name}? Old keys will expire immediately.`}
        onConfirm={handleConfirmedReset}
        onCancel={() => setResetConfirm({ isOpen: false, entity: null })}
        confirmLabel="Generate Keys"
        variant="warning"
      />

      <CredentialsModal 
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

      <MemberProfileModal 
        isOpen={profileModal.isOpen}
        onClose={() => setProfileModal({ isOpen: false, member: null })}
        member={profileModal.member}
      />
    </>
  );
};
