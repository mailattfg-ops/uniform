'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Clipboard, Check, UserCheck, Key, LogIn, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StudentRegisterFormProps {
  onCancel?: () => void;
  initialData?: any;
}

export const StudentRegisterForm: React.FC<StudentRegisterFormProps> = ({ onCancel, initialData }) => {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>(initialData?.school_id || '');
  const [isLoading, setIsLoading] = useState(true);
  const [generatedCreds, setGeneratedCreds] = useState<any | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await api.get('/schools');
        setSchools(response.data.map((s: any) => ({ label: s.name, value: s.id })));
      } catch (err) {
        toast.error('Failed to load schools');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSchool) {
        setClasses([]);
        return;
      }
      try {
        const response = await api.get(`/schools/classes?schoolId=${selectedSchool}`);
        setClasses(response.data.map((c: any) => ({ label: c.name, value: c.id })));
      } catch (err) {
        toast.error('Failed to load classes');
      }
    };
    fetchClasses();
  }, [selectedSchool]);

  const studentFields: FormField[] = [
    { 
        name: 'full_name', label: 'Full Name', type: 'text', 
        placeholder: 'e.g. Alex Johnson', required: true, 
        defaultValue: initialData?.full_name 
    },
    { 
        name: 'admission_no', label: 'Admission Number', type: 'text', 
        placeholder: 'e.g. SD-2024-001', required: true,
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
      name: 'school_id', label: 'Select School', type: 'select', 
      options: schools,
      required: true,
      defaultValue: initialData?.school_id,
      onChange: (val) => setSelectedSchool(val)
    },
    { 
      name: 'class_id', 
      label: 'Class / Grade', 
      type: 'select', 
      options: classes.length > 0 ? classes : [{ label: 'Select School First', value: '' }], 
      required: true,
      defaultValue: initialData?.class_id
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
    const loadingToast = toast.loading(isEditing ? 'Updating student record...' : 'Registering student and creating account...');
    
    try {
      if (isEditing) {
        await api.put(`/students/${initialData.id}`, data);
        toast.success('Student profile updated!', { id: loadingToast });
        if (onCancel) onCancel(); // Return to list
      } else {
        const response = await api.post('/students/register', data);
        toast.success('Registration complete!', { id: loadingToast });
        setGeneratedCreds(response.data.credentials);
      }
    } catch (err) {
      toast.error('Action failed. Check if Admission No exists.', { id: loadingToast });
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
            <p className="text-[#fce4d4] font-bold uppercase tracking-widest text-xs mt-2 opacity-80">Login Account Created for student</p>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-4">
               <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Student access portal</span>
                    <LogIn size={16} className="text-[#2d8d9b]" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Login Username (Email)</label>
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
                 {hasCopied ? 'Copied!' : 'Copy Credentials'}
               </Button>

               <Button 
                 onClick={() => {
                   if (onCancel) onCancel();
                   else router.push('/students/directory');
                 }}
                 variant="outline"
                 className="h-14 rounded-2xl border-2 border-[#3a525d]/10 font-black uppercase tracking-widest text-[10px] gap-3"
               >
                 Finish & Exit
                 <ArrowRight size={16} />
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
        title={initialData ? "Edit Student Profile" : "Student Registration"}
        subtitle={initialData ? `Modify record for ${initialData.full_name}` : "Live Portal Account Generation"}
        fields={studentFields}
        onSubmit={handleSubmit}
        onCancel={() => onCancel ? onCancel() : router.push('/students/directory')}
        submitLabel={initialData ? "Update Profile" : "Register & Create Account"}
        columns={2}
      />
    </div>
  );
};
