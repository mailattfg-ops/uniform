'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  User,
  Phone,
  Mail,
  Briefcase,
  Star,
  CheckCircle2,
  MapPin,
  CreditCard,
  Key,
  X
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { capitalizeWords } from '@/lib/formatters';

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  editingCustomer?: any | null;
  industries: { id: number; name: string }[];
  branches?: { id: number; name: string; code?: string }[];
  zones?: { id: number; name: string; code?: string; branch_id: number }[];
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingCustomer,
  industries,
  branches,
  zones
}) => {
  const [name, setName] = useState('');
  const [contactTitle, setContactTitle] = useState('Mr.');
  const [contactPerson, setContactPerson] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [clientTag, setClientTag] = useState<'standard' | 'special' | 'risk'>('standard');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [username, setUsername] = useState('');
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  
  // Branch & Zone
  const [branchesList, setBranchesList] = useState<{ id: number; name: string; code?: string }[]>(branches || []);
  const [zonesList, setZonesList] = useState<{ id: number; name: string; code?: string; branch_id: number }[]>(zones || []);
  const [branchId, setBranchId] = useState('');
  const [zoneId, setZoneId] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');

  // Balances & Credit Terms
  const [receivables, setReceivables] = useState('0');
  const [credits, setCredits] = useState('0');
  const [creditPeriodDays, setCreditPeriodDays] = useState('30');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!branches || branches.length === 0) {
      api.get('/branches').then(res => setBranchesList(res.data || [])).catch(() => {});
    } else {
      setBranchesList(branches);
    }
  }, [branches]);

  useEffect(() => {
    if (!zones || zones.length === 0) {
      api.get('/zones').then(res => setZonesList(res.data || [])).catch(() => {});
    } else {
      setZonesList(zones);
    }
  }, [zones]);

  useEffect(() => {
    if (editingCustomer) {
      setName(editingCustomer.name || '');
      setContactTitle(editingCustomer.contact_title || 'Mr.');
      setContactPerson(editingCustomer.contact_person || '');
      setContactDesignation(editingCustomer.contact_designation || '');
      setPhone(editingCustomer.contact_number || editingCustomer.phone || '');
      setEmail(editingCustomer.email || editingCustomer.contact_email || '');
      setIndustryId(editingCustomer.industry_id ? String(editingCustomer.industry_id) : '');
      setBranchId(editingCustomer.branch_id ? String(editingCustomer.branch_id) : '');
      setZoneId(editingCustomer.zone_id ? String(editingCustomer.zone_id) : '');
      setClientTag(
        editingCustomer.is_special ? 'special' : editingCustomer.is_risk ? 'risk' : (editingCustomer.client_tag || 'standard')
      );
      setIsActive(editingCustomer.is_active !== false);
      setAddress(editingCustomer.address || '');
      setCity(editingCustomer.city || '');
      setState(editingCustomer.state || '');
      setPincode(editingCustomer.pincode || '');
      setCountry(editingCustomer.country || 'India');
      setReceivables(
        editingCustomer.receivables !== undefined && editingCustomer.receivables !== null
          ? String(editingCustomer.receivables)
          : '0'
      );
      setCredits(
        editingCustomer.credits !== undefined && editingCustomer.credits !== null
          ? String(editingCustomer.credits)
          : '0'
      );
      setCreditPeriodDays(
        editingCustomer.credit_period_days !== undefined && editingCustomer.credit_period_days !== null
          ? String(editingCustomer.credit_period_days)
          : '30'
      );
      setUsername('');
      setIsUsernameManuallyEdited(false);
    } else {
      setName('');
      setContactTitle('Mr.');
      setContactPerson('');
      setContactDesignation('');
      setPhone('');
      setEmail('');
      setIndustryId(industries.length > 0 ? String(industries[0].id) : '');
      setBranchId('');
      setZoneId('');
      setClientTag('standard');
      setIsActive(true);
      setUsername('');
      setIsUsernameManuallyEdited(false);
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setCountry('India');
      setReceivables('0');
      setCredits('0');
      setCreditPeriodDays('30');
    }
  }, [editingCustomer, isOpen, industries]);

  const availableZones = useMemo(() => {
    if (!branchId) return [];
    return zonesList.filter(z => String(z.branch_id) === String(branchId));
  }, [zonesList, branchId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Customer / Institution name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }
    if (!editingCustomer && !username.trim()) {
      toast.error('Portal Login Username is required for new accounts');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        contact_title: contactTitle,
        contact_person: contactPerson.trim() || null,
        contact_designation: contactDesignation.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        industry_id: industryId || null,
        branch_id: branchId ? parseInt(branchId, 10) : null,
        zone_id: zoneId ? parseInt(zoneId, 10) : null,
        client_tag: clientTag,
        is_active: isActive ? 'true' : 'false',
        username: username.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        country: country.trim() || 'India',
        receivables: receivables !== '' ? receivables : '0',
        credits: credits !== '' ? credits : '0',
        credit_period_days: creditPeriodDays ? parseInt(creditPeriodDays, 10) : 30
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col my-8 z-10 max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3a525d] to-[#24343b] px-8 py-6 text-white relative flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-[#2d8d9b]/30 text-teal-200 border border-[#2d8d9b]/40 text-[9px] font-black uppercase tracking-wider">
                {editingCustomer ? (editingCustomer.customer_code || `Customer #${editingCustomer.id}`) : 'Customer Directory'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[9px] font-black uppercase tracking-wider">
                {editingCustomer ? 'Edit Profile' : 'New Customer'}
              </span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tight">
              {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
            </h3>
            <p className="text-xs text-white/70 font-semibold mt-0.5">
              {editingCustomer ? `Update account record for ${editingCustomer.name}` : 'Configure a new institutional, corporate, or retail customer'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
          {/* Customer / Institution Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#2d8d9b]" />
              Customer / Institution Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                const capitalized = capitalizeWords(e.target.value);
                setName(capitalized);
                if (!editingCustomer && !isUsernameManuallyEdited) {
                  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
                  setUsername(clean);
                }
              }}
              autoCapitalize="words"
              placeholder="e.g. St. Xavier International, Apollo Healthcare"
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Contact Person Details: Title + Full Name + Designation */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <User size={13} className="text-[#2d8d9b]" />
              Contact Person Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <select
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
                >
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Full Name (e.g. Rajesh Sharma)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Designation (e.g. Principal / Purchase Head)"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Phone & Email in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Phone size={13} className="text-[#2d8d9b]" />
                Primary Phone Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Mail size={13} className="text-[#2d8d9b]" />
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. billing@institution.com"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Sector, Classification, Account Status in 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#2d8d9b]" />
                Customer Sector / Type *
              </label>
              <select
                required
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="">Select Sector</option>
                {industries.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Star size={13} className="text-[#2d8d9b]" />
                Classification
              </label>
              <select
                value={clientTag}
                onChange={(e) => setClientTag(e.target.value as any)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="standard">Standard Customer</option>
                <option value="special">★ Favourite Customer</option>
                <option value="risk">⚠ Risk Customer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#2d8d9b]" />
                Account Status
              </label>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="true">Active Account</option>
                <option value="false">Inactive Account</option>
              </select>
            </div>
          </div>

          {/* Branch & Zone Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#2d8d9b]" />
                Assigned Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setZoneId('');
                }}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white"
              >
                <option value="">HQ / Unassigned Branch</option>
                {branchesList.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#2d8d9b]" />
                Assigned Zone {branchId ? `(${availableZones.length})` : ''}
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                disabled={!branchId}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all bg-white disabled:bg-zinc-50 disabled:text-zinc-400 cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="">{branchId ? (availableZones.length > 0 ? 'Select Zone' : 'No zones for this branch') : 'Select Branch first'}</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={String(z.id)}>
                    {z.name} {z.code ? `(${z.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Portal Username (When Registering New Customer) */}
          {!editingCustomer && (
            <div className="space-y-1.5 p-4 rounded-2xl bg-zinc-50 border border-zinc-150">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Key size={13} className="text-[#2d8d9b]" />
                Portal Login Username *
              </label>
              <input
                type="text"
                required
                maxLength={30}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setIsUsernameManuallyEdited(true);
                }}
                placeholder="e.g. stxavier_admin"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400 bg-white"
              />
              <p className="text-[10px] text-zinc-500 font-medium pt-0.5">
                A secure login password will be generated upon registration and shown immediately to share with the client.
              </p>
            </div>
          )}

          {/* Address Details: Street, City, State, Pin Code, Country */}
          <div className="space-y-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <MapPin size={13} className="text-[#2d8d9b]" />
              Address Details
            </div>

            {/* Street / Building Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Street / Building Address
              </label>
              <input
                type="text"
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="Campus address, Street, Building"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* City & State in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  City
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Mumbai, Bengaluru"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  State
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={state}
                  onChange={(e) => setState(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Maharashtra, Karnataka"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Pin Code & Country in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Pin Code
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 560001"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Country
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={country}
                  onChange={(e) => setCountry(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. India"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Initial Financial Ledger Balances */}
          <div className="space-y-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <CreditCard size={13} className="text-[#2d8d9b]" />
              Initial Financial Balances (Optional)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Receivables (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={receivables}
                  onChange={(e) => setReceivables(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                  <span>Credits (₹)</span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Amount Paid - Invoice</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#2d8d9b] flex items-center justify-between">
                  <span>Credit Period</span>
                  <span className="text-[9px] font-black uppercase bg-[#2d8d9b]/10 px-1.5 py-0.5 rounded text-[#2d8d9b]">Days</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(e.target.value)}
                  placeholder="30"
                  className="w-full px-4 py-3 rounded-2xl border border-teal-200 focus:outline-none focus:border-[#2d8d9b] focus:ring-4 focus:ring-[#2d8d9b]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400 bg-teal-50/20"
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              * Credit Period: Number of days the customer has to clear invoices. The last day of this period is marked as <span className="font-bold text-amber-600">Due</span>, and starting next day it becomes <span className="font-bold text-rose-600">Overdue</span>.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-[#3a525d] hover:bg-[#2d8d9b] transition-all shadow-lg shadow-[#3a525d]/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
