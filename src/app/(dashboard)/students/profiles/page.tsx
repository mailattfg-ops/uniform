'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Ruler, 
  Mail, 
  Phone, 
  ChevronRight, 
  MapPin, 
  Calendar,
  Activity,
  User,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Measurement {
  label: string;
  value: string;
  unit: string;
}

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  class: string;
  school: string;
  joinDate: string;
  measurements: Measurement[];
  status: 'Complete' | 'Pending' | 'Update Required';
}

const mockProfiles: StudentProfile[] = [
  {
    id: 'STU-1001',
    name: 'James Wilson',
    email: 'james.w@greenwood.edu',
    phone: '+1 234 567 8901',
    class: 'Grade 5-A',
    school: 'Greenwood High',
    joinDate: 'Aug 2023',
    status: 'Complete',
    measurements: [
      { label: 'Chest', value: '32', unit: 'in' },
      { label: 'Waist', value: '28', unit: 'in' },
      { label: 'Length', value: '24', unit: 'in' },
      { label: 'Shoulder', value: '14', unit: 'in' },
    ]
  },
  {
    id: 'STU-1002',
    name: 'Sophia Chen',
    email: 's.chen@riverdale.org',
    phone: '+1 234 567 8902',
    class: 'Grade 3-B',
    school: 'Riverdale Academy',
    joinDate: 'Sept 2023',
    status: 'Pending',
    measurements: [
      { label: 'Chest', value: '28', unit: 'in' },
      { label: 'Waist', value: '24', unit: 'in' },
    ]
  },
  {
    id: 'STU-1003',
    name: 'Liam Garcia',
    email: 'l.garcia@mail.com',
    phone: '+1 234 567 8903',
    class: 'Grade 5-A',
    school: 'Greenwood High',
    joinDate: 'Aug 2023',
    status: 'Update Required',
    measurements: [
      { label: 'Chest', value: '30', unit: 'in' },
      { label: 'Waist', value: '26', unit: 'in' },
      { label: 'Length', value: '22', unit: 'in' },
    ]
  }
];

export default function StudentProfilesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black italic tracking-tighter text-[#3a525d]">Student Profiles</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] opacity-70">Detailed records & biometric tracking</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search by name or ID..."
              className="bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-6 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 w-full md:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" className="p-3 rounded-2xl border-[#fce4d4] bg-white"><Filter size={18} /></Button>
        </div>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {mockProfiles.map((profile) => (
          <div key={profile.id} className="group bg-white rounded-[2.5rem] border border-[#fce4d4] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col md:flex-row">
            
            {/* Left: Basic Info Sidebar */}
            <div className="w-full md:w-72 bg-[#fce4d4]/20 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-[#fce4d4]">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center p-1 border-2 border-[#2d8d9b]/10">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} alt={profile.name} className="w-full h-full rounded-2xl object-cover" />
                </div>
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border-4 border-white dark:border-zinc-900 flex items-center justify-center shadow-lg ${
                  profile.status === 'Complete' ? 'bg-success' : profile.status === 'Pending' ? 'bg-[#f2994a]' : 'bg-error'
                }`}>
                  <Activity size={14} className="text-white" />
                </div>
              </div>

              <div className="text-center space-y-1 mb-8">
                <h3 className="text-xl font-black italic text-[#3a525d] leading-none">{profile.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b]">{profile.id}</p>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center gap-3 text-zinc-500">
                  <MapPin size={14} />
                  <span className="text-[11px] font-bold">{profile.school}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-500">
                  <Mail size={14} />
                  <span className="text-[11px] font-bold truncate max-w-[160px]">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-500">
                  <Phone size={14} />
                  <span className="text-[11px] font-bold">{profile.phone}</span>
                </div>
              </div>
            </div>

            {/* Right: Measurements & Details */}
            <div className="flex-1 p-8 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Ruler size={18} className="text-[#2d8d9b]" />
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#3a525d]">Measurement Log</h4>
                </div>
                <span className="text-[10px] font-black uppercase text-[#8b6b5a] bg-[#fce4d4] px-3 py-1 rounded-lg">Last Sync: Oct 12</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {profile.measurements.map((m, idx) => (
                  <div key={idx} className="bg-zinc-50 border border-zinc-100 p-4 rounded-2xl group-hover:bg-[#2d8d9b]/5 group-hover:border-[#2d8d9b]/20 transition-all">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#8b6b5a] mb-1">{m.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#3a525d]">{m.value}</span>
                      <span className="text-[10px] font-bold text-[#6fa1ac]">{m.unit}</span>
                    </div>
                  </div>
                ))}
                {profile.measurements.length < 4 && (
                   <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-4 rounded-2xl flex items-center justify-center opacity-40">
                     <span className="text-[9px] font-black uppercase">Incomplete</span>
                   </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-[#fce4d4]/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-[#8b6b5a] uppercase">Current Class</span>
                     <span className="text-xs font-bold text-[#3a525d]">{profile.class}</span>
                   </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl border-[#fce4d4] bg-white group/btn">
                    <History size={14} className="mr-2 group-hover/btn:rotate-[-45deg] transition-transform" />
                    History
                  </Button>
                  <Button className="text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl bg-[#2d8d9b] text-white shadow-lg hover:shadow-[#2d8d9b]/40">
                    Full Detail
                  </Button>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
