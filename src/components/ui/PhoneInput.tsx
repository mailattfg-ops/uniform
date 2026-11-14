'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Phone, ChevronDown } from 'lucide-react';
import { COUNTRY_DIAL_CODES, formatPhoneNumber, CountryDialCode } from '@/lib/formatters';

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  country?: string;
  onCountryChange?: (country: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  country: controlledCountry = 'India',
  onCountryChange,
  label,
  required = false,
  disabled = false,
  placeholder = '9876 543 210',
  className = '',
  id
}) => {
  const [selectedCountryName, setSelectedCountryName] = useState<string>(controlledCountry || 'India');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with external country if it changes
  useEffect(() => {
    if (controlledCountry && controlledCountry !== selectedCountryName) {
      setSelectedCountryName(controlledCountry);
    }
  }, [controlledCountry]);

  // Click outside listener for country dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCountryObj: CountryDialCode = useMemo(() => {
    const found = COUNTRY_DIAL_CODES.find(
      c => c.country.toLowerCase() === selectedCountryName.toLowerCase()
    );
    return found || COUNTRY_DIAL_CODES[0]; // Default India (+91)
  }, [selectedCountryName]);

  // Extract dial code and local digits from current value
  const { dialCode, localDigits } = useMemo(() => {
    const val = (value || '').trim();
    let code = activeCountryObj.code;
    let rawLocal = val;

    for (const c of COUNTRY_DIAL_CODES) {
      if (val.startsWith(c.code)) {
        code = c.code;
        rawLocal = val.slice(c.code.length).trim();
        break;
      }
    }

    const digits = rawLocal.replace(/\D/g, '');
    return { dialCode: code, localDigits: digits };
  }, [value, activeCountryObj]);

  // Format local digits nicely as: xxxx xxx xxx
  const formattedLocal = useMemo(() => {
    if (!localDigits) return '';
    const part1 = localDigits.slice(0, 4);
    const part2 = localDigits.slice(4, 7);
    const part3 = localDigits.slice(7, 10);
    const remaining = localDigits.slice(10);
    return [part1, part2, part3, remaining].filter(Boolean).join(' ');
  }, [localDigits]);

  const handleCountrySelect = (c: CountryDialCode) => {
    setSelectedCountryName(c.country);
    setIsDropdownOpen(false);
    onCountryChange?.(c.country);

    // Re-format existing digits with new dial code
    if (localDigits) {
      const formatted = formatPhoneNumber(localDigits, c.country);
      onChange(formatted);
    } else {
      onChange(c.code);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const digitsOnly = inputVal.replace(/\D/g, '');
    if (!digitsOnly) {
      onChange('');
      return;
    }
    const formatted = formatPhoneNumber(digitsOnly, activeCountryObj.country);
    onChange(formatted);
  };

  const isMandatory = required || (typeof label === 'string' && label.includes('*'));

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isMandatory ? 'text-[#C82A2B]' : 'text-zinc-500'
          }`}
        >
          <Phone size={13} className={isMandatory ? 'text-[#C82A2B]' : 'text-[#9E1B1D]'} />
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {/* Country Selector Dropdown Trigger */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="h-11 px-3 bg-zinc-50 hover:bg-zinc-100 border border-r-0 border-zinc-200 rounded-l-2xl flex items-center gap-1.5 text-xs font-bold text-zinc-800 transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
            title={`Country: ${activeCountryObj.country} (${activeCountryObj.code})`}
          >
            <span className="text-sm">{activeCountryObj.flag}</span>
            <span className="font-mono text-[11px] font-bold text-zinc-700">{activeCountryObj.code}</span>
            <ChevronDown size={12} className="text-zinc-400 ml-0.5" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-60 max-h-60 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1">
                Select Country &amp; Dial Code
              </div>
              {COUNTRY_DIAL_CODES.map(c => (
                <button
                  key={c.country}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    c.country === activeCountryObj.country
                      ? 'bg-[#FFF1F1] text-[#9E1B1D] font-bold'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base shrink-0">{c.flag}</span>
                    <span className="truncate">{c.country}</span>
                  </span>
                  <span className="font-mono font-bold text-[11px] text-zinc-500 shrink-0 ml-2">
                    {c.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Local Digits Input */}
        <input
          id={id}
          type="tel"
          disabled={disabled}
          required={required}
          value={formattedLocal}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full h-11 px-4 rounded-r-2xl border border-zinc-200 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 text-xs font-mono font-bold text-zinc-800 transition-all placeholder:text-zinc-400 placeholder:font-mono"
        />
      </div>
    </div>
  );
};
