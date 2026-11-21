'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Star, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';

export type CustomerClassification = 'standard' | 'special' | 'risk';

export interface CustomerClassificationDropdownProps {
  customerId: number | string;
  initialTag?: CustomerClassification | string | null;
  initialIsSpecial?: boolean | null;
  initialIsRisk?: boolean | null;
  customerName?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  readOnly?: boolean;
  className?: string;
  onClassificationChange?: (newClassification: CustomerClassification) => void;
}

export const CustomerClassificationDropdown: React.FC<CustomerClassificationDropdownProps> = ({
  customerId,
  initialTag,
  initialIsSpecial,
  initialIsRisk,
  customerName,
  size = 'md',
  showLabel = true,
  readOnly = false,
  className = '',
  onClassificationChange
}) => {
  const resolveCurrent = (
    tag?: string | null,
    isSpecial?: boolean | null,
    isRisk?: boolean | null
  ): CustomerClassification => {
    if (tag === 'special' || isSpecial === true) return 'special';
    if (tag === 'risk' || isRisk === true) return 'risk';
    return 'standard';
  };

  const [current, setCurrent] = useState<CustomerClassification>(
    resolveCurrent(initialTag, initialIsSpecial, initialIsRisk)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(resolveCurrent(initialTag, initialIsSpecial, initialIsRisk));
  }, [initialTag, initialIsSpecial, initialIsRisk]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (newType: CustomerClassification) => {
    if (readOnly || isUpdating || newType === current) {
      setIsOpen(false);
      return;
    }

    const prevType = current;
    setCurrent(newType);
    setIsOpen(false);
    setIsUpdating(true);

    const isSpecial = newType === 'special';
    const isRisk = newType === 'risk';
    const label = newType === 'special' ? 'Favourite Customer' : newType === 'risk' ? 'Risk Customer' : 'Standard Customer';
    const loadingToast = toast.loading(`Updating ${customerName || 'customer'} to ${label}...`);

    try {
      const payload = {
        client_tag: newType,
        is_special: isSpecial,
        is_risk: isRisk
      };

      await api.put(`/customers/${customerId}`, payload).catch(() => api.put(`/organizations/${customerId}`, payload));

      toast.success(`${customerName || 'Customer'} marked as ${label}`, { id: loadingToast });
      if (onClassificationChange) {
        onClassificationChange(newType);
      }
    } catch (err: any) {
      setCurrent(prevType);
      toast.error(err.response?.data?.error || 'Failed to update customer classification', { id: loadingToast });
    } finally {
      setIsUpdating(false);
    }
  };

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 13 : 15;

  return (
    <div className={`relative inline-flex items-center text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={readOnly || isUpdating}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
          isSmall ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1.5 text-xs'
        } ${
          current === 'special'
            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs'
            : current === 'risk'
            ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 shadow-2xs'
            : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200/70'
        } ${readOnly ? 'opacity-80 cursor-default' : ''}`}
        title={`Customer Classification: ${current === 'special' ? 'Favourite' : current === 'risk' ? 'Risk' : 'Standard'}. Click to change.`}
      >
        {current === 'special' && (
          <Star size={iconSize} className="fill-amber-400 text-amber-500 shrink-0" />
        )}
        {current === 'risk' && (
          <AlertTriangle size={iconSize} className="text-rose-600 stroke-[2.5] shrink-0" />
        )}
        {current === 'standard' && (
          <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
        )}

        {showLabel && (
          <span>
            {current === 'special' ? 'Favourite' : current === 'risk' ? 'Risk' : 'Standard'}
          </span>
        )}

        {!readOnly && (
          <ChevronDown size={isSmall ? 10 : 12} className={`text-current opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !readOnly && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200 p-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 border-b border-zinc-100 mb-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Customer Classification
            </p>
          </div>

          {/* Option: Favourite */}
          <button
            type="button"
            onClick={() => handleSelect('special')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left ${
              current === 'special'
                ? 'bg-amber-50 text-amber-900 font-black'
                : 'text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Star size={13} className="fill-amber-400 text-amber-500" />
              </span>
              <div>
                <p className="leading-tight">Favourite Customer</p>
                <p className="text-[9px] font-medium text-zinc-400">High priority VIP client</p>
              </div>
            </div>
            {current === 'special' && <Check size={14} className="text-amber-600 shrink-0" />}
          </button>

          {/* Option: Risk */}
          <button
            type="button"
            onClick={() => handleSelect('risk')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left ${
              current === 'risk'
                ? 'bg-rose-50 text-rose-900 font-black'
                : 'text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={13} className="stroke-[2.5]" />
              </span>
              <div>
                <p className="leading-tight">Risk Customer</p>
                <p className="text-[9px] font-medium text-zinc-400">Credit / payment alert</p>
              </div>
            </div>
            {current === 'risk' && <Check size={14} className="text-rose-600 shrink-0" />}
          </button>

          {/* Option: Standard */}
          <button
            type="button"
            onClick={() => handleSelect('standard')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left ${
              current === 'standard'
                ? 'bg-zinc-100 text-zinc-900 font-black'
                : 'text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
              </span>
              <div>
                <p className="leading-tight">Standard Customer</p>
                <p className="text-[9px] font-medium text-zinc-400">Regular account standing</p>
              </div>
            </div>
            {current === 'standard' && <Check size={14} className="text-zinc-600 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerClassificationDropdown;
