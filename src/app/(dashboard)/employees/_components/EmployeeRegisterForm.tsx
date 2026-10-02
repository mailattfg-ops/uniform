'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { UserPlus, ArrowLeft, ShieldCheck, Briefcase, Mail, Phone, Calendar, Key } from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';

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
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialData?.branch_id ? String(initialData.branch_id) : (initialData?.branches?.id ? String(initialData.branches.id) : '')
  );
  const [employmentType, setEmploymentType] = useState<string>(initialData?.employment_type || 'Permanent');
  const [department, setDepartment] = useState<string>(initialData?.department || 'Production & Tailoring');
  const [hasLoginAccess, setHasLoginAccess] = useState<boolean>(initialData?.user_id ? true : false);
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [phone, setPhone] = useState(initialData?.contact_mobile || '');

  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        setBranches(res.data || []);
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    fetchBranches();
  }, []);

  React.useEffect(() => {
    if (initialData) {
      setSelectedBranchId(
        initialData.branch_id ? String(initialData.branch_id) : (initialData.branches?.id ? String(initialData.branches.id) : '')
      );
      setEmploymentType(initialData.employment_type || 'Permanent');
      setDepartment(initialData.department || 'Production & Tailoring');
      setHasLoginAccess(Boolean(initialData.user_id));
      setFullName(initialData.full_name || '');
      setPhone(initialData.contact_mobile || '');
    } else {
      setSelectedBranchId('');
      setEmploymentType('Permanent');
      setDepartment('Production & Tailoring');
      setHasLoginAccess(false);
      setFullName('');
      setPhone('');
    }
  }, [initialData]);

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

    const payload = {
      ...data,
      full_name: fullName,
      contact_mobile: phone,
      branch_id: selectedBranchId ? Number(selectedBranchId) : null,
      employment_type: employmentType,
      department: department,
      has_login_access: hasLoginAccess
    };

    try {
      if (initialData) {
        await api.put(`/employees/${initialData.id}`, payload);
        toast.success(`${fullName}'s profile updated successfully`);
        onSuccess();
      } else {
        const response = await api.post('/employees/register', payload);
        toast.success(`Hired! ${fullName} is now part of the team.`);
        
        // Show credentials popup if credentials were generated
        if (response.data.credentials) {
          setCredsModal({
            isOpen: true,
            data: {
              full_name: fullName,
              username: response.data.credentials.username,
              password: response.data.credentials.password
            }
          });
        } else {
          onSuccess();
        }
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
        <Button
          onClick={onCancel}
          variant="secondary"
          className="flex items-center gap-2 text-zinc-400 hover:text-[#3a525d] font-bold text-sm transition-colors group bg-transparent border-none shadow-none p-0"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-[#3a525d] group-hover:text-white transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Directory
        </Button>
        <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
           <ShieldCheck size={14} />
           Unified HRMS & ERP Provisioning Active
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
                {initialData ? 'Update Staff Member' : 'Add New Employee'}
              </h2>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">Staff Management</p>
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
                label="Employee ID (Auto-generated if blank)" 
                placeholder="Leave blank for auto (e.g. EMP-2026-001)" 
                maxLength={20}
                defaultValue={initialData?.employee_id}
                icon={<ShieldCheck size={18} />}
              />

              {/* Branch Assignment */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] block">
                  Assigned Branch / Location *
                </label>
                <select
                  required
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all shadow-sm"
                >
                  <option value="">Select Branch / Unit...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.tier === 'Corporate' ? '🏢 [HQ]' : b.tier === 'Factory' ? '🏭 [Factory]' : '🏪 [Outlet]'} {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Type */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] block">
                  Employment Type *
                </label>
                <select
                  required
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all shadow-sm"
                >
                  <option value="Permanent">Permanent (Full Time)</option>
                  <option value="Temporary">Temporary (Seasonal / Short Term)</option>
                  <option value="Contract">Contract (Third-Party / Fixed Period)</option>
                  <option value="Probation">Probation (New Hire Evaluation)</option>
                  <option value="Intern">Intern / Trainee</option>
                </select>
              </div>

              <Input 
                name="designation" 
                label="Designation / Job Title" 
                placeholder="e.g. Master Tailor, Store Manager, QC Inspector" 
                required 
                maxLength={50}
                defaultValue={initialData?.designation}
              />

              {/* Department */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] block">
                  Department *
                </label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold text-[#3a525d] outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all shadow-sm"
                >
                  <option value="Production & Tailoring">Production & Tailoring</option>
                  <option value="Cutting & Pattern Making">Cutting & Pattern Making</option>
                  <option value="Quality Control & Finishing">Quality Control & Finishing</option>
                  <option value="Measurements & Fitting">Measurements & Fitting</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Inventory & Logistics">Inventory & Logistics</option>
                  <option value="Accounts & Finance">Accounts & Finance</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Management & Admin">Management & Administration</option>
                </select>
              </div>

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

              {/* Portal Login Access Permission (Optional) */}
              {!initialData && (
                <div className="md:col-span-2 p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
                  <input 
                    type="checkbox"
                    id="has_login_access"
                    checked={hasLoginAccess}
                    onChange={(e) => setHasLoginAccess(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded-md text-[#2d8d9b] border-slate-300 focus:ring-[#2d8d9b] cursor-pointer"
                  />
                  <label htmlFor="has_login_access" className="cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-[#2d8d9b]" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                        Grant ERP Portal Login Access
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        (Optional)
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                      Check this for managers, administrative staff, and sales executives who need system access. Leave unchecked for factory floor workers, tailors, helpers, and contract staff who only need to be recorded in the HRMS directory.
                    </p>
                  </label>
                </div>
              )}
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
               <p className="text-[10px] font-bold text-zinc-400 leading-relaxed uppercase">Upon Adding, the system will automatically architect a unique login package. This includes a hashed password and a professional domain-mapped username for the Forma Apparels Enterprise Portal.</p>
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
