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
  X,
  Plus,
  Trash2
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { Select } from '@/components/ui/Select';
import { PhoneInput } from '@/components/ui/PhoneInput';
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
  const [altContactTitle, setAltContactTitle] = useState('Mr.');
  const [altContactPerson, setAltContactPerson] = useState('');
  const [altContactDesignation, setAltContactDesignation] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [clientTag, setClientTag] = useState<'standard' | 'special' | 'risk'>('standard');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [showAltContact, setShowAltContact] = useState(false);
  
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
      setAltContactTitle(editingCustomer.alt_contact_title || 'Mr.');
      setAltContactPerson(editingCustomer.alt_contact_person || '');
      setAltContactDesignation(editingCustomer.alt_contact_designation || '');
      setAltPhone(editingCustomer.alt_contact_number || editingCustomer.alt_phone || '');
      setShowAltContact(Boolean(editingCustomer.alt_contact_person || editingCustomer.alt_contact_number || editingCustomer.alt_phone));
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
    } else {
      setName('');
      setContactTitle('Mr.');
      setContactPerson('');
      setContactDesignation('');
      setAltContactTitle('Mr.');
      setAltContactPerson('');
      setAltContactDesignation('');
      setAltPhone('');
      setShowAltContact(false);
      setPhone('');
      setEmail('');
      setIndustryId(industries.length > 0 ? String(industries[0].id) : '');
      setBranchId('');
      setZoneId('');
      setClientTag('standard');
      setIsActive(true);
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
    if (!contactTitle) {
      toast.error('Contact person salutation is required');
      return;
    }
    if (!contactPerson.trim()) {
      toast.error('Contact person name is required');
      return;
    }
    if (!contactDesignation.trim()) {
      toast.error('Contact person designation is required');
      return;
    }
    if (!industryId) {
      toast.error('Customer sector / type is required');
      return;
    }
    if (!address.trim()) {
      toast.error('Street / building address is required');
      return;
    }
    if (!city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!state.trim()) {
      toast.error('State is required');
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        contact_title: contactTitle,
        contact_person: contactPerson.trim() || null,
        contact_designation: contactDesignation.trim() || null,
        alt_contact_title: altContactTitle,
        alt_contact_person: altContactPerson.trim() || null,
        alt_contact_designation: altContactDesignation.trim() || null,
        alt_contact_number: altPhone.trim() || null,
        alt_phone: altPhone.trim() || null,
        phone: phone.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        industry_id: industryId || null,
        branch_id: branchId ? parseInt(branchId, 10) : null,
        zone_id: zoneId ? parseInt(zoneId, 10) : null,
        client_tag: clientTag,
        is_active: isActive ? 'true' : 'false',
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

      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-200/80 overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col my-8 z-10 max-h-[92vh]">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />

        {/* Executive Brand Obsidian Header */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-8 py-6 text-white relative flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 text-[9px] font-black uppercase tracking-wider font-mono">
                {editingCustomer ? (editingCustomer.customer_code || `Customer #${editingCustomer.id}`) : 'Customer Directory'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF1F1]/10 text-white/90 border border-white/10 text-[9px] font-black uppercase tracking-wider">
                {editingCustomer ? 'Edit Profile' : 'New Customer'}
              </span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tight text-white">
              {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
            </h3>
            <p className="text-xs text-zinc-400 font-semibold mt-0.5">
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
          {/* Customer Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
              <Building2 size={13} className="text-[#C82A2B]" />
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(capitalizeWords(e.target.value))}
              autoCapitalize="words"
              placeholder="e.g. St. Xavier International, Apollo Healthcare"
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Contact Persons Details: Single Line Format per Contact */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <User size={13} className="text-[#C82A2B]" />
                Primary Contact Person Details *
              </label>
              {!showAltContact && (
                <button
                  type="button"
                  onClick={() => setShowAltContact(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C82A2B] hover:text-[#A81D1E] transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  Add Contact Person
                </button>
              )}
            </div>

            {/* Line 1: Primary Contact (salutation, contact person name, phone number, designation) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B] block">Title *</span>
                <Select
                  value={contactTitle}
                  onChange={setContactTitle}
                  options={['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.']}
                  className="rounded-2xl py-3"
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B] block">Name *</span>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Full Name"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B] block">Phone *</span>
                <PhoneInput
                  required
                  value={phone}
                  onChange={setPhone}
                  country={country}
                  onCountryChange={setCountry}
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B] block">Designation *</span>
                <input
                  type="text"
                  required
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="Designation"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Line 2: Secondary / Additional Contact Person Details */}
            {showAltContact && (
              <div className="space-y-1 pt-2 border-t border-dashed border-zinc-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <User size={13} className="text-zinc-400" />
                    Additional Contact Person Details
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAltContactPerson('');
                      setAltPhone('');
                      setAltContactDesignation('');
                      setShowAltContact(false);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Title</span>
                    <Select
                      value={altContactTitle}
                      onChange={setAltContactTitle}
                      options={['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.']}
                      className="rounded-2xl py-3"
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Name</span>
                    <input
                      type="text"
                      value={altContactPerson}
                      onChange={(e) => setAltContactPerson(capitalizeWords(e.target.value))}
                      autoCapitalize="words"
                      placeholder="Alt Contact Name"
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Phone</span>
                    <PhoneInput
                      value={altPhone}
                      onChange={setAltPhone}
                      country={country}
                      onCountryChange={setCountry}
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Designation</span>
                    <input
                      type="text"
                      value={altContactDesignation}
                      onChange={(e) => setAltContactDesignation(capitalizeWords(e.target.value))}
                      autoCapitalize="words"
                      placeholder="Alt Designation"
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Mail size={13} className="text-[#9E1B1D]" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. billing@institution.com"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Sector & Classification in 2 columns (Account status removed as requested) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#C82A2B]" />
                Customer Sector / Type *
              </label>
              <Select
                required
                placeholder="Select Sector"
                value={industryId}
                onChange={setIndustryId}
                options={industries.map(i => ({ label: i.name, value: String(i.id) }))}
                className="rounded-2xl py-3"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Star size={13} className="text-[#9E1B1D]" />
                Classification
              </label>
              <Select
                value={clientTag}
                onChange={(val) => setClientTag(val as any)}
                options={[
                  { label: 'Standard Customer', value: 'standard' },
                  { label: '★ Favourite Customer', value: 'special' },
                  { label: '⚠ Risk Customer', value: 'risk' }
                ]}
                className="rounded-2xl py-3"
              />
            </div>
          </div>

          {/* Branch & Zone Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#9E1B1D]" />
                Assigned Branch
              </label>
              <Select
                placeholder="HQ / Unassigned Branch"
                value={branchId}
                onChange={(val) => {
                  setBranchId(val);
                  setZoneId('');
                }}
                options={[
                  { label: 'HQ / Unassigned Branch', value: '' },
                  ...branchesList.map((b) => ({ label: b.name, value: String(b.id) }))
                ]}
                className="rounded-2xl py-3"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#9E1B1D]" />
                Assigned Zone {branchId ? `(${availableZones.length})` : ''}
              </label>
              <Select
                placeholder={branchId ? (availableZones.length > 0 ? 'Select Zone' : 'No zones for this branch') : 'Select Branch first'}
                value={zoneId}
                onChange={setZoneId}
                disabled={!branchId}
                options={availableZones.map((z) => ({
                  label: z.name,
                  value: String(z.id)
                }))}
                className="rounded-2xl py-3"
              />
            </div>
          </div>

          {/* Address Details: Street, City, State, Pin Code, Country */}
          <div className="space-y-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <MapPin size={13} className="text-[#9E1B1D]" />
              Address Details
            </div>

            {/* Street / Building Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                <MapPin size={13} className="text-[#C82A2B]" />
                Street / Building Address *
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                placeholder="Campus address, Street, Building"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* City & State in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#C82A2B]" />
                  City *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Mumbai, Bengaluru"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#C82A2B]" />
                  State *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={state}
                  onChange={(e) => setState(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  placeholder="e.g. Maharashtra, Karnataka"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
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
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
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
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Initial Financial Ledger Balances */}
          <div className="space-y-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <CreditCard size={13} className="text-[#9E1B1D]" />
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
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
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
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
                  <span>Credit Period</span>
                  <span className="text-[9px] font-black uppercase bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/15 px-1.5 py-0.5 rounded">Days</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(e.target.value)}
                  placeholder="30"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-bold text-zinc-800 transition-all placeholder:text-zinc-400 bg-white"
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
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-[#C82A2B] hover:bg-[#A81D1E] transition-all shadow-lg shadow-[#C82A2B]/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
