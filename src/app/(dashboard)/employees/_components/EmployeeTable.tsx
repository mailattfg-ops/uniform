'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { UserPlus, Edit2, Trash2, Mail, Phone, Briefcase, Key } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  designation: string;
  department: string;
  contact_mobile: string;
  status: string;
  created_at: string;
}

interface EmployeeTableProps {
  onRegister: () => void;
  onEdit: (employee: Employee) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ onRegister, onEdit }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [resetConfirm, setResetConfirm] = useState<{ isOpen: boolean; employee: Employee | null }>({
    isOpen: false,
    employee: null
  });
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (err) {
      toast.error('Failed to load employee list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.id) return;
    const loadingToast = toast.loading('Removing employee records...');
    setDeleteConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/employees/${deleteConfirm.id}`);
      toast.success('Employee successfully removed from directory', { id: loadingToast });
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to delete employee profile', { id: loadingToast });
    }
  };

  const handleConfirmedReset = async () => {
    if (!resetConfirm.employee) return;
    const emp = resetConfirm.employee;
    const loadingToast = toast.loading('Generating secure staff credentials...');
    setResetConfirm({ isOpen: false, employee: null });
    
    try {
      const response = await api.post(`/employees/${emp.id}/reset-password`);
      setCredsModal({
        isOpen: true,
        data: {
          full_name: emp.full_name,
          username: response.data.username,
          password: response.data.newPassword
        }
      });
      toast.success('Staff password reset successfully', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to reset staff password', { id: loadingToast });
    }
  };

  const columns: Column<Employee>[] = [
    {
      header: 'Employee Details',
      accessor: (e) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 border border-[#2d8d9b]/10 flex items-center justify-center font-bold text-[#2d8d9b] text-[10px] shadow-sm uppercase">
            {e.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[13px] tracking-tight text-[#3a525d] leading-none">{e.full_name}</p>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.1em] mt-1.5">{e.employee_id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Designation & Dept',
      accessor: (e) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#3a525d]">
             <Briefcase size={12} className="text-[#2d8d9b]" />
             {e.designation || 'Staff'}
          </div>
          <p className="text-[9px] text-[#2d8d9b] font-black uppercase tracking-[0.1em] leading-none opacity-60">
            {e.department || 'General'}
          </p>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      accessor: (e) => (
        <div className="flex flex-col gap-1 text-[11px] font-bold text-zinc-500">
           <div className="flex items-center gap-1.5">
             <Phone size={10} className="text-[#2d8d9b]" />
             {e.contact_mobile || 'No Mobile'}
           </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (e) => (
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
          e.status === 'Active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          {e.status || 'Active'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (e) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setResetConfirm({ isOpen: true, employee: e })}
            className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
            title="Reset ERP Password"
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
      <DataTable 
        title="Employee Directory"
        subtitle="Staff Master Control"
        columns={columns}
        data={employees}
        isLoading={isLoading}
        searchPlaceholder="Search by name, ID or department..."
        headerAction={
          <Button 
            onClick={onRegister}
            className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white border-none shadow-lg shadow-[#3a525d]/20 transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus size={14} strokeWidth={3} />
            Onboard Staff
          </Button>
        }
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Remove Employee Profile?"
        message="This will delete the employee record and disconnect their ERP access. This action is permanent."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmLabel="Deactivate & Delete"
        variant="danger"
      />

      <ConfirmModal 
        isOpen={resetConfirm.isOpen}
        title="Reset Staff Password?"
        message={`Generate a new secure login for ${resetConfirm.employee?.full_name}? The old password will be revoked immediately.`}
        onConfirm={handleConfirmedReset}
        onCancel={() => setResetConfirm({ isOpen: false, employee: null })}
        confirmLabel="Reset Credentials"
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
