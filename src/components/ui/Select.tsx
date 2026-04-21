'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  icon?: React.ReactNode;
  onChange?: (value: string) => void;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  options, 
  error, 
  icon, 
  className = '', 
  name,
  onChange,
  value: controlledValue,
  defaultValue,
  required,
  placeholder,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(controlledValue || defaultValue || '');
  const [filterQuery, setFilterQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setFilterQuery('');
    }
  }, [isOpen]);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSelect = (option: SelectOption) => {
    setInternalValue(option.value);
    setIsOpen(false);
    if (onChange) {
      onChange(option.value);
    }
  };

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === internalValue);
  const displayValue = selectedOption ? selectedOption.label : (placeholder || `Select ${label || ''}`);

  return (
    <div className="flex flex-col gap-2 w-full group relative" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1 transition-colors group-focus-within:text-[#2d8d9b]">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input type="hidden" name={name} value={internalValue} required={required} />

        <div
          onClick={handleToggle}
          className={`w-full px-3 py-3 bg-white border-2 ${
            isOpen ? 'border-[#2d8d9b] ring-8 ring-[#2d8d9b]/5' : (error ? 'border-red-500' : 'border-zinc-200/60 hover:border-zinc-300')
          } rounded-2xl transition-all text-sm font-black text-[#3a525d] flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.99] ${
            icon ? 'pl-14' : ''
          } ${className}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {icon && (
               <div className="absolute left-5 text-[#2d8d9b] transition-colors pointer-events-none">
                 {icon}
               </div>
            )}
            <span className={`truncate ${!selectedOption ? 'text-zinc-400 font-bold' : ''}`}>
              {displayValue}
            </span>
          </div>
          <ChevronDown 
            size={18} 
            className={`text-[#2d8d9b] transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>

        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-zinc-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[999] animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
            <div className="p-2 border-b border-zinc-50 bg-zinc-50/30">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#2d8d9b] transition-colors" size={14} />
                  <input 
                    ref={searchInputRef}
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full bg-white border-none py-3 pl-11 pr-4 text-xs font-bold rounded-2xl outline-none ring-1 ring-zinc-100 focus:ring-2 focus:ring-[#2d8d9b]/20 transition-all"
                  />
                  {filterQuery && (
                    <button 
                      onClick={() => setFilterQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100 text-zinc-400"
                    >
                      <X size={12} />
                    </button>
                  )}
               </div>
            </div>

            <div className="max-h-[280px] overflow-y-auto no-scrollbar p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8b6b5a]/40 py-2 px-4">
                Choose {label || 'Option'}
              </div>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === internalValue;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt)}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all mb-1 group ${
                        isSelected 
                        ? 'bg-[#2d8d9b] text-white shadow-lg shadow-[#2d8d9b]/20 scale-[1.02]' 
                        : 'hover:bg-[#2d8d9b]/5 text-[#3a525d] hover:translate-x-1'
                      }`}
                    >
                      <span className={`text-[13px] ${isSelected ? 'font-black' : 'font-bold'}`}>
                        {opt.label}
                      </span>
                      {isSelected && <Check size={14} strokeWidth={4} />}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-12 text-center opacity-30 flex flex-col items-center gap-2">
                   <p className="text-[10px] font-black uppercase tracking-widest italic">No matching options</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <span className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1 animate-in shake duration-300">{error}</span>}
    </div>
  );
};
