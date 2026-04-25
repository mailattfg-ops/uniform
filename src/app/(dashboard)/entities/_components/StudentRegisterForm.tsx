'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Clipboard, Check, UserCheck, Key, LogIn, ArrowRight, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StudentRegisterFormProps {
  onCancel?: () => void;
  initialData?: any;
}

export const StudentRegisterForm: React.FC<StudentRegisterFormProps> = ({ onCancel, initialData }) => {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>(initialData?.organization_id || initialData?.school_id || '');
  const [isLoading, setIsLoading] = useState(true);
  const [generatedCreds, setGeneratedCreds] = useState<any | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const isOrgRole = user?.role?.toLowerCase() === 'school' || user?.role?.toLowerCase() === 'organization';

        if (isOrgRole && (user.schoolId || user.organizationId)) {
          const orgData = { label: user.schoolName || user.organizationName || user.fullName, value: user.schoolId || user.organizationId };
          setOrganizations([orgData]);
          setSelectedOrg((user.schoolId || user.organizationId).toString());
        } else {
          const response = await api.get('/organizations');
          setOrganizations(response.data.map((o: any) => ({ label: o.name, value: o.id })));
        }
      } catch (err) {
        toast.error('Failed to load organizations');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  useEffect(() => {
    const fetchDepts = async () => {
      if (!selectedOrg) {
        setDepartments([]);
        return;
      }
      try {
        const response = await api.get(`/departments?orgId=${selectedOrg}`);
        setDepartments(response.data.map((d: any) => ({ label: d.name, value: d.id })));
      } catch (err) {
        toast.error('Failed to load departments');
      }
    };
    fetchDepts();
  }, [selectedOrg]);

  const studentFields: FormField[] = [
    { 
        name: 'full_name', label: 'Full Name', type: 'text', 
        placeholder: 'e.g. Alex Johnson', required: true, 
        defaultValue: initialData?.full_name 
    },
    { 
        name: 'admission_no', label: 'Reference ID / ID', type: 'text', 
        placeholder: 'e.g. EMP-101 or SD-2024-001', required: true,
        defaultValue: initialData?.admission_no
    },
    {
      name: 'gender', label: 'Gender', type: 'select',
      options: [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Other', value: 'Other' }
      ],
      required: true,
      defaultValue: initialData?.gender || 'Male'
    },
    { 
      name: 'school_id', label: 'Organization', type: 'select', 
      options: organizations,
      required: true,
      defaultValue: initialData?.organization_id || initialData?.school_id,
      value: selectedOrg,
      onChange: (val) => setSelectedOrg(val)
    },
    { 
      name: 'class_id', 
      label: 'Department / Unit', 
      type: 'select', 
      options: departments.length > 0 ? departments : [{ label: 'Select Organization First', value: '' }], 
      required: true,
      defaultValue: initialData?.department_id || initialData?.class_id
    },
    { 
        name: 'contact_mobile', label: 'Contact Mobile', type: 'tel', 
        placeholder: 'e.g. +91 9876543210',
        defaultValue: initialData?.contact_mobile
    },
    {
      name: 'status', label: 'Account Status', type: 'select',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Deactivated', value: 'Deactivated' }
      ],
      defaultValue: initialData?.status || 'Active',
      required: true
    }
  ];

  const handleCopy = () => {
    const text = `Username: ${generatedCreds.username}\nPassword: ${generatedCreds.password}`;
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleSubmit = async (data: any) => {
    const isEditing = !!initialData;
    const loadingToast = toast.loading(isEditing ? 'Updating record...' : 'Registering member and creating account...');
    
    try {
      if (isEditing) {
        await api.put(`/students/${initialData.id}`, data);
        toast.success('Profile updated!', { id: loadingToast });
        if (onCancel) onCancel();
      } else {
        const response = await api.post('/students/register', data);
        toast.success('Registration complete!', { id: loadingToast });
        setGeneratedCreds({
            ...response.data.credentials,
            studentId: response.data.student.id
        });
      }
    } catch (err) {
      toast.error('Action failed. Check if ID exists.', { id: loadingToast });
    }
  };

  if (generatedCreds) {
    return (
      <div className="max-w-2xl mx-auto animate-in zoom-in duration-500">
        <div className="bg-white rounded-[3rem] border-4 border-[#2d8d9b]/10 shadow-2xl overflow-hidden">
          <div className="bg-[#2d8d9b] p-10 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCheck size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight italic">Registration Successful!</h2>
            <p className="text-[#fce4d4] font-bold uppercase tracking-widest text-xs mt-2 opacity-80">Access Portal Account Generated</p>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-4">
               <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Entity Access Portal</span>
                    <LogIn size={16} className="text-[#2d8d9b]" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col">
                       <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Login Username</label>
                       <span className="text-lg font-black text-[#3a525d] tracking-tight">{generatedCreds.username}</span>
                    </div>
                    <div className="flex flex-col">
                       <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Temporary Password</label>
                       <div className="flex items-center gap-3">
                         <Key size={14} className="text-[#f2994a]" />
                         <span className="text-xl font-black text-[#f2994a] tracking-[0.2em]">{generatedCreds.password}</span>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Button 
                onClick={handleCopy}
                className={`h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-3 transition-all ${
                  hasCopied ? 'bg-green-500 text-white' : 'bg-[#3a525d] text-white hover:bg-[#2d8d9b]'
                }`}
               >
                 {hasCopied ? <Check size={16} /> : <Clipboard size={16} />}
                 {hasCopied ? 'Copy Credentials' : 'Copy Credentials'}
               </Button>

               <Button 
                 onClick={() => {
                   if (onCancel) onCancel();
                   else router.push('/entities/directory');
                 }}
                 variant="outline"
                 className="h-14 rounded-2xl border-2 border-[#3a525d]/10 font-black uppercase tracking-widest text-[10px] gap-3"
               >
                 Finish & Exit
                 <ArrowRight size={16} />
               </Button>

               <Button 
                 onClick={() => router.push(`/measurements/entry?studentId=${generatedCreds.studentId}`)}
                 className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[11px] gap-3 col-span-2 shadow-xl shadow-orange-500/20 mt-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
               >
                 <Ruler size={18} />
                 Capture Sizing Records Now
               </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
      return (
          <div className="flex items-center justify-center p-20">
              <div className="w-10 h-10 border-4 border-[#2d8d9b]/20 border-t-[#2d8d9b] rounded-full animate-spin" />
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <DynamicForm 
        title={initialData ? "Edit Member Profile" : "Entity Registration"}
        subtitle={initialData ? `Modify record for ${initialData.full_name}` : "Industry-Agnostic Portal Onboarding"}
        fields={studentFields}
        onSubmit={handleSubmit}
        onCancel={() => onCancel ? onCancel() : router.push('/entities/directory')}
        submitLabel={initialData ? "Update Profile" : "Register & Create Account"}
        columns={2}
      />
    </div>
  );
};
