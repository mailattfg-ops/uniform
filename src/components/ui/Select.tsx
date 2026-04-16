'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(controlledValue || defaultValue || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal value with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSelect = (option: SelectOption) => {
    setInternalValue(option.value);
    setIsOpen(false);
    if (onChange) {
      onChange(option.value);
    }
  };

  const selectedOption = options.find(opt => opt.value === internalValue);
  const displayValue = selectedOption ? selectedOption.label : `Select ${label || ''}`;

  return (
    <div className="flex flex-col gap-2 w-full group relative" ref={containerRef}>
      {label && (
        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] dark:text-zinc-500 ml-1 transition-colors group-focus-within:text-[#2d8d9b]">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Hidden original select for form compatibility if needed, though we should use a hidden input for better control */}
        <input type="hidden" name={name} value={internalValue} required={required} />

        <div
          onClick={handleToggle}
          className={`w-full px-5 py-3.5 bg-[#fce4d4]/5 dark:bg-zinc-900/50 border-2 ${
            isOpen ? 'border-[#2d8d9b] ring-4 ring-[#fce4d4]/30' : (error ? 'border-error' : 'border-[#fce4d4] hover:border-[#fce4d4]/80')
          } rounded-[1.2rem] transition-all text-sm font-bold text-foreground flex items-center justify-between cursor-pointer shadow-sm ${
            icon ? 'pl-12' : ''
          } ${className}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {icon && (
               <div className="absolute left-4 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors pointer-events-none">
                 {icon}
               </div>
            )}
            <span className={`truncate ${!selectedOption ? 'text-zinc-400 dark:text-zinc-600 font-medium' : ''}`}>
              {displayValue}
            </span>
          </div>
          <ChevronDown 
            size={18} 
            className={`text-[#2d8d9b] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>

        {/* Custom Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-950 border-2 border-[#fce4d4] dark:border-zinc-800 rounded-[1.5rem] shadow-2xl z-[999] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto no-scrollbar p-2">
              <div className={`text-[9px] font-black uppercase tracking-[0.2em] text-[#8b6b5a]/40 py-2 mb-1 ${icon ? 'pl-7' : 'px-4'}`}>
                Choose {label || 'Option'}
              </div>
              {options.length > 0 ? (
                options.map((opt) => {
                  const isSelected = opt.value === internalValue;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt)}
                      className={`flex items-center justify-between py-3 rounded-xl cursor-pointer transition-all mb-1 ${
                        isSelected 
                        ? 'bg-[#2d8d9b] text-white shadow-lg' 
                        : 'hover:bg-[#6fa1ac]/5 text-foreground'
                      } ${icon ? 'pl-7 pr-4' : 'px-4'}`}
                    >
                      <span className={`text-[13px] ${isSelected ? 'font-black' : 'font-bold'}`}>
                        {opt.label}
                      </span>
                      {isSelected && <Check size={14} strokeWidth={4} />}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center opacity-20 flex flex-col items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                      <div className="w-1 h-4 bg-zinc-300 rounded-full rotate-45" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest">No options</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <span className="text-[10px] text-error font-black uppercase tracking-widest ml-1 animate-in shake duration-300">{error}</span>}
    </div>
  );
};
