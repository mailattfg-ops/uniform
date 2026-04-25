'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { UserPlus, ArrowLeft, ShieldCheck, Briefcase, Mail, Phone, Calendar } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

import { CredentialsModal } from '@/components/ui/CredentialsModal';

interface EmployeeRegisterFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export const EmployeeRegisterForm: React.FC<EmployeeRegisterFormProps> = ({ onCancel, onSuccess, initialData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  // Form State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [phone, setPhone] = useState(initialData?.contact_mobile || '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[0-9]/g, '');
    setFullName(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 15) {
      setPhone(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Validation
    if (phone.length < 10) {
      toast.error('Mobile number should be at least 10 digits');
      setIsLoading(false);
      return;
    }

    try {
      if (initialData) {
        await api.put(`/employees/${initialData.id}`, { ...data, full_name: fullName, contact_mobile: phone });
        toast.success(`${fullName}'s profile updated successfully`);
        onSuccess();
      } else {
        const response = await api.post('/employees/register', { ...data, full_name: fullName, contact_mobile: phone });
        toast.success(`Hired! ${fullName} is now part of the team.`);
        
        // Show credentials popup
        setCredsModal({
          isOpen: true,
          data: {
            full_name: fullName,
            username: response.data.credentials.username,
            password: response.data.credentials.password
          }
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to sync employee data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-zinc-400 hover:text-[#3a525d] font-bold text-sm transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-[#3a525d] group-hover:text-white transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Directory
        </button>
        <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
           <ShieldCheck size={14} />
           Automatic ERP Provisioning Active
        </div>
      </div>

      <Card className="p-10 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-32 -translate-y-32 blur-3xl opacity-50" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 bg-[#3a525d] rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-[#3a525d]/30">
              <UserPlus size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic tracking-tight text-[#3a525d]">
                {initialData ? 'Update Staff Member' : 'Onboard New Employee'}
              </h2>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">Staff Recruitment & Registry</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input 
                name="full_name" 
                label="Full Official Name" 
                placeholder="Enter Full Name ..." 
                required 
                value={fullName}
                onChange={handleNameChange}
                icon={<Briefcase size={18} />}
              />
              <Input 
                name="employee_id" 
                label="Employee ID (Unique)" 
                placeholder="e.g. EMP-2024-001" 
                required 
                maxLength={20}
                defaultValue={initialData?.employee_id}
                icon={<ShieldCheck size={18} />}
              />
              <Input 
                name="designation" 
                label="Designation / Role" 
                placeholder="e.g. Senior Regional Manager" 
                required 
                maxLength={50}
                defaultValue={initialData?.designation}
              />
              <Select 
                name="department" 
                label="Department" 
                required
                defaultValue={initialData?.department}
                options={[
                  { label: 'Measurements', value: 'Measurements' },
                  { label: 'Sales & Marketing', value: 'Sales' },
                  { label: 'Inventory & Logistics', value: 'Logistics' },
                ]}
              />
              <Input 
                name="contact_mobile" 
                label="Primary Contact No" 
                placeholder="Numbers only (10-15 digits)" 
                type="tel" 
                required 
                value={phone}
                onChange={handlePhoneChange}
                icon={<Phone size={18} />}
              />
              <Input 
                name="email" 
                label="Official Email (Optional)" 
                placeholder="david@company.com" 
                type="email" 
                maxLength={100}
                defaultValue={initialData?.email}
                icon={<Mail size={18} />}
              />
              <Input 
                name="joining_date" 
                label="Date of Joining" 
                type="date" 
                required 
                max={new Date().toISOString().split('T')[0]}
                defaultValue={initialData?.joining_date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                icon={<Calendar size={18} />}
              />
              <Select 
                name="status" 
                label="Service Status" 
                defaultValue={initialData?.status || 'Active'}
                options={[
                  { label: 'Active Service', value: 'Active' },
                  { label: 'On Notice Period', value: 'Notice' },
                  { label: 'Terminated / Resigned', value: 'Deactivated' }
                ]}
              />
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-zinc-100">
               <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="h-14 rounded-2xl px-10 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-[#3a525d]"
               >
                 Cancel Entry
               </Button>
               <Button 
                type="submit" 
                isLoading={isLoading}
                className="h-14 rounded-2xl px-12 font-black uppercase text-[10px] tracking-[0.2em] bg-[#2d8d9b] hover:bg-[#236e7a] text-white shadow-xl shadow-[#2d8d9b]/20"
               >
                 {initialData ? 'Save Modifications' : 'Confirm Onboarding'}
               </Button>
            </div>
          </form>
        </div>
      </Card>
      
      <div className="mt-8 p-6 bg-[#3a525d]/5 rounded-[2rem] border border-[#3a525d]/10">
         <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#2d8d9b] shadow-sm shrink-0">
               <ShieldCheck size={20} />
            </div>
            <div>
               <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3a525d] mb-1">Confidential Note</h4>
               <p className="text-[10px] font-bold text-zinc-400 leading-relaxed uppercase">Upon onboarding, the system will automatically architect a unique login package. This includes a hashed password and a professional domain-mapped username for the Inland Uniform Enterprise Portal.</p>
            </div>
         </div>
      </div>

      <CredentialsModal 
        isOpen={credsModal.isOpen}
        onClose={() => {
          setCredsModal({ isOpen: false, data: null });
          onSuccess();
        }}
        data={credsModal.data}
      />
    </div>
  );
};
