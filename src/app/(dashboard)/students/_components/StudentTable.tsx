'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Eye, Edit2, Trash2, UserPlus, FileUp, Key } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { Select } from '@/components/ui/Select';

interface Student {
  id: number;
  admission_no: string;
  full_name: string;
  status: string;
  schools?: { name: string };
  class_name?: string;
  created_at: string;
}

interface StudentTableProps {
  onRegister: () => void;
  onBulkUpload: () => void;
  onEdit: (student: any) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({ onRegister, onBulkUpload, onEdit }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [resetConfirm, setResetConfirm] = useState<{ isOpen: boolean; student: Student | null }>({
    isOpen: false,
    student: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  const fetchSchools = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isSchoolRole = user?.role?.toLowerCase() === 'school';

      if (isSchoolRole) {
        setSchools([{ id: user.schoolId, name: user.schoolName || user.fullName }]);
        setSelectedSchool(user.schoolId.toString());
      } else {
        const response = await api.get('/schools');
        setSchools(response.data);
      }
    } catch (err) {
      console.error('Failed to load schools');
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedSchool) queryParams.append('schoolId', selectedSchool);
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await api.get(`/students?${queryParams.toString()}`);
      setStudents(response.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, searchQuery ? 500 : 0); // Debounce search
    return () => clearTimeout(timer);
  }, [selectedSchool, searchQuery]);

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Deleting student...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/students/${deleteConfirm.id}`);
      toast.success('Student record and login account purged', { id: loadingToast });
      fetchStudents();
    } catch (err) {
      toast.error('Failed to delete student', { id: loadingToast });
    }
  };

  const handleConfirmedReset = async () => {
    if (!resetConfirm.student) return;
    const student = resetConfirm.student;
    const loadingToast = toast.loading('Generating new secure password...');
    setResetConfirm({ isOpen: false, student: null });
    
    try {
      const response = await api.post(`/students/${student.id}/reset-password`);
      setCredsModal({
        isOpen: true,
        data: {
          full_name: student.full_name,
          username: response.data.username,
          password: response.data.newPassword
        }
      });
      toast.success('Password reset successfully!', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to reset password', { id: loadingToast });
    }
  };

  const columns: Column<Student>[] = [
    {
      header: 'Student Name',
      accessor: (s) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#3a525d]/5 border border-[#3a525d]/10 flex items-center justify-center font-bold text-[#3a525d] text-[10px] shadow-sm">
            {s.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight text-[#3a525d] leading-none">{s.full_name}</p>
            <p className="text-[9px] text-[#2d8d9b] font-bold uppercase tracking-[0.1em] mt-1.5 opacity-80">#{s.admission_no}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'School & Registry',
      accessor: (s) => (
        <div className="flex flex-col gap-1">
          <p className="font-bold text-[12px] tracking-tight text-[#3a525d]">{s.schools?.name || 'Unassigned'}</p>
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] leading-none">
            Registered: {new Date(s.created_at).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (s) => (
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
          s.status === 'Active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          {s.status || 'Active'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (s) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setResetConfirm({ isOpen: true, student: s })}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
            title="Reset Login Access"
          >
            <Key size={16} />
          </button>
          <button 
            onClick={() => onEdit(s)}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm"
            title="Edit Profile"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => setDeleteConfirm({ isOpen: true, id: s.id })}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm"
            title="Delete Student"
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
      <DataTable 
        title="Student Directory"
        subtitle="Live Registry Sync"
        columns={columns}
        data={students}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        searchPlaceholder="Search by name, grade or ID..."
        headerAction={
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* School Filter - Only for Admin/Staff or show as label for School */}
            <div className="min-w-[240px]">
              <Select 
                placeholder="All Institutions"
                value={selectedSchool}
                options={schools.map(s => ({ label: s.name, value: s.id.toString() }))}
                onChange={(val: string) => setSelectedSchool(val)}
              />
            </div>

            <div className="flex gap-2">
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
                Bulk Upload
              </Button>
            </div>
          </div>
        }
      />

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Student Record?"
        message="This action will permanently remove the student profile and revoke their portal access. This cannot be undone."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />

      {/* Reset Confirmation */}
      <ConfirmModal 
        isOpen={resetConfirm.isOpen}
        title="Reset Access Credentials?"
        message={`You are about to generate a new secure password for ${resetConfirm.student?.full_name}. The old password will stop working immediately.`}
        onConfirm={handleConfirmedReset}
        onCancel={() => setResetConfirm({ isOpen: false, student: null })}
        confirmLabel="Generate New Password"
        variant="warning"
      />

      <CredentialsModal 
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />
    </>
  );
};
