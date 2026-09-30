'use client';

import React, { useState } from 'react';
import { Building2, X, Plus, ShieldCheck, Mail, Phone, MapPin, Key } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AddBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBranch?: any) => void;
}

export const AddBranchModal: React.FC<AddBranchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState('Branch');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/branches', {
        code,
        name,
        tier,
        address,
        contact_number: contactNumber,
        email,
        manager_name: managerName,
        manager_email: managerEmail,
        manager_password: managerPassword
      });

      toast.success(`${tier === 'Corporate' ? 'Corporate HQ' : tier === 'Factory' ? 'Factory Unit' : 'Branch Outlet'} created successfully!`);
      resetForm();
      onSuccess(response.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setTier('Branch');
    setAddress('');
    setContactNumber('');
    setEmail('');
    setManagerName('');
    setManagerEmail('');
    setManagerPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] border border-[#fce4d4] max-w-xl w-full p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center shadow-inner">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#3a525d] tracking-tight">Add New Branch / Unit</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Corporate HQ, Factory Unit, or Retail Outlet</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d]">Branch Code</label>
                <span className="text-[9px] text-[#2d8d9b] font-bold uppercase">(Auto if blank)</span>
              </div>
              <input
                type="text"
                placeholder="Leave blank for auto (e.g. BR-001)"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">Branch Tier / Type *</label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
              >
                <option value="Branch">🏪 Retail Outlet / Showroom</option>
                <option value="Factory">🏭 Factory (Production Unit)</option>
                <option value="Corporate">🏢 Headquarters (Corporate HQ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">Branch Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Central Production Factory or Cochin Retail Hub"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">Address Location</label>
            <input
              type="text"
              placeholder="Street address, city, district"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">Contact Phone</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">Branch Email</label>
              <input
                type="email"
                placeholder="branch@forma.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#2d8d9b] flex items-center gap-1.5 mb-3">
              <Key size={14} /> Optional Manager Login Credentials
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Manager Name</label>
                <input
                  type="text"
                  placeholder="Manager Name"
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Login Email</label>
                <input
                  type="email"
                  placeholder="manager@forma.com"
                  value={managerEmail}
                  onChange={e => setManagerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Password</label>
                <input
                  type="text"
                  placeholder="Password"
                  value={managerPassword}
                  onChange={e => setManagerPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#2d8d9b] hover:bg-[#236e7a] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#2d8d9b]/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={14} />
              {loading ? 'Creating Branch...' : 'Register Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
