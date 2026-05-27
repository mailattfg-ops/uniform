'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Building2,
  Landmark,
  Save,
  Globe,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  QrCode
} from 'lucide-react';

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bank_name: string;
  account_no: string;
  branch_name: string;
  ifsc_code: string;
  upi_id: string;
}

export default function CompanySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'Forma Apparels',
    address: '63/3608, CD Tower, Arayidathupalam, Kozhikode, Kerala - 673 004, India',
    phone: '(+91) 7902 499 990 | 0495 2 922 992',
    email: 'info@formaapparels.com',
    website: 'www.formaapparels.com',
    bank_name: 'HDFC BANK',
    account_no: '50200076116064',
    branch_name: 'MAJESTIC CENTER',
    ifsc_code: 'HDFC0001255',
    upi_id: '7902 499 991'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/company-settings');
      if (response.data?.success && response.data.data) {
        setSettings(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load company profile from backend; defaults are active.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanySettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const saveToast = toast.loading('Syncing company configuration...');
    try {
      const response = await api.put('/company-settings', settings);
      if (response.data?.success) {
        toast.success('Company settings synchronized successfully!', { id: saveToast });
        setSettings(response.data.data);
      } else {
        throw new Error('Save operation returned unsuccessful');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save settings: run supabase migrations if table is missing.', { id: saveToast });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2d8d9b] border-t-transparent" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-50/50 min-h-screen">
      {/* Top Title Bar */}
      <div>
        <h1 className="text-3xl font-black italic tracking-tight text-[#3a525d]">Company Profile Settings</h1>
        <p className="text-xs text-[#2d8d9b] font-black uppercase tracking-[0.2em] mt-1">
          Admin Controls &gt; Company &amp; Bank Profile
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Company & Contact Details */}
          <Card className="p-8 border-none shadow-[0_24px_48px_-12px_rgba(0,0,0,0.05)] rounded-[2.5rem] bg-white flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#2d8d9b]/5 rounded-full translate-x-16 -translate-y-16 blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black italic tracking-tight text-[#3a525d]">Address &amp; Contact</h3>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Public invoice &amp; proposal letterhead</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Company Name"
                value={settings.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="e.g. Forma Apparels"
                required
                icon={<Building2 size={16} />}
              />

              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest uppercase text-zinc-400">Company Address</label>
                <textarea
                  rows={3}
                  value={settings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter full street address, zip code..."
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/10 transition-all leading-relaxed"
                />
              </div>

              <Input
                label="Contact Number(s)"
                value={settings.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="e.g. +91 9988776655"
                required
                icon={<Phone size={16} />}
              />

              <Input
                label="Contact Email"
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="info@company.com"
                type="email"
                required
                icon={<Mail size={16} />}
              />

              <Input
                label="Website URL"
                value={settings.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="www.company.com"
                required
                icon={<Globe size={16} />}
              />
            </div>
          </Card>

          {/* Card 2: Bank Account Details */}
          <Card className="p-8 border-none shadow-[0_24px_48px_-12px_rgba(0,0,0,0.05)] rounded-[2.5rem] bg-white flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full translate-x-16 -translate-y-16 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Landmark size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black italic tracking-tight text-[#3a525d]">Bank Ledger Details</h3>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Printed client payment instructions</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Bank Name"
                value={settings.bank_name}
                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                placeholder="e.g. HDFC BANK"
                required
                icon={<Landmark size={16} />}
              />

              <Input
                label="Account Number"
                value={settings.account_no}
                onChange={(e) => handleInputChange('account_no', e.target.value)}
                placeholder="Enter account number..."
                required
                icon={<CreditCard size={16} />}
              />

              <Input
                label="Branch Name"
                value={settings.branch_name}
                onChange={(e) => handleInputChange('branch_name', e.target.value)}
                placeholder="e.g. MAJESTIC CENTER"
                required
                icon={<Building2 size={16} />}
              />

              <Input
                label="IFSC Code"
                value={settings.ifsc_code}
                onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
                placeholder="e.g. HDFC0001255"
                required
                icon={<FileText size={16} />}
              />

              <Input
                label="UPI Pay Number / ID"
                value={settings.upi_id}
                onChange={(e) => handleInputChange('upi_id', e.target.value)}
                placeholder="e.g. 7902499991@upi"
                required
                icon={<QrCode size={16} />}
              />
            </div>
          </Card>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-4 pt-6 border-t border-zinc-200">
          <Button
            type="submit"
            isLoading={isSaving}
            className="h-14 rounded-2xl px-12 font-black uppercase text-xs tracking-[0.25em] bg-[#2d8d9b] hover:bg-[#236e7a] text-white shadow-xl shadow-[#2d8d9b]/20 flex items-center gap-2"
          >
            <Save size={16} />
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
