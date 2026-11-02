'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  options?: (SelectOption | string)[];
  children?: React.ReactNode;
  error?: string;
  icon?: React.ReactNode;
  onChange?: (value: any) => void;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  dropdownClassName?: string;
  wrapperClassName?: string;
  size?: number;
}

function extractOptionsFromChildren(children: React.ReactNode): { options: SelectOption[]; defaultPlaceholder?: string } {
  const options: SelectOption[] = [];
  let defaultPlaceholder: string | undefined = undefined;

  const traverse = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, child => {
      if (!child) return;
      if (Array.isArray(child)) {
        traverse(child);
      } else if (React.isValidElement(child)) {
        const props = child.props as any;
        if (child.type === 'option') {
          const val = props.value !== undefined ? String(props.value) : (props.children !== undefined ? String(props.children) : '');
          let text = '';
          if (typeof props.children === 'string' || typeof props.children === 'number') {
            text = String(props.children);
          } else if (Array.isArray(props.children)) {
            text = props.children.map((c: any) => (typeof c === 'string' || typeof c === 'number' ? String(c) : '')).join('');
          } else if (props.label) {
            text = String(props.label);
          } else {
            text = val;
          }

          if (val === '' && !defaultPlaceholder && text.trim()) {
            defaultPlaceholder = text.trim();
          }
          options.push({
            value: val,
            label: text.trim() || val,
            disabled: !!props.disabled
          });
        } else if (props && props.children) {
          traverse(props.children);
        }
      }
    });
  };

  traverse(children);
  return { options, defaultPlaceholder };
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  options, 
  children,
  error, 
  icon, 
  className = '', 
  name,
  id,
  onChange,
  value: controlledValue,
  defaultValue,
  required,
  placeholder,
  disabled = false,
  dropdownClassName = '',
  wrapperClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue !== undefined ? String(defaultValue) : '');
  const [filterQuery, setFilterQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentValue = controlledValue !== undefined ? String(controlledValue) : internalValue;

  useEffect(() => {
    if (defaultValue !== undefined && controlledValue === undefined) {
      setInternalValue(String(defaultValue));
    }
  }, [defaultValue, controlledValue]);

  const { parsedOptions, defaultPlaceholder } = useMemo(() => {
    if (options && options.length > 0) {
      return {
        parsedOptions: options.map(opt => (typeof opt === 'string' ? { label: opt, value: opt } : { ...opt, value: String(opt.value) })),
        defaultPlaceholder: undefined
      };
    }
    if (children) {
      const extracted = extractOptionsFromChildren(children);
      return {
        parsedOptions: extracted.options,
        defaultPlaceholder: extracted.defaultPlaceholder
      };
    }
    return { parsedOptions: [], defaultPlaceholder: undefined };
  }, [options, children]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFilterQuery('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setFilterQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && parsedOptions.length > 6 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, parsedOptions.length]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setFilterQuery('');
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    setInternalValue(option.value);
    setFilterQuery('');
    setIsOpen(false);
    if (onChange) {
      const fnStr = onChange.toString();
      if (fnStr.includes('.target') || fnStr.includes('.currentTarget')) {
        const syntheticEvent = {
          target: { value: option.value, name: name || '' },
          currentTarget: { value: option.value, name: name || '' },
          preventDefault: () => {},
          stopPropagation: () => {}
        };
        (onChange as any)(syntheticEvent);
      } else {
        onChange(option.value);
      }
    }
  };

  const filteredOptions = parsedOptions.filter(opt => 
    opt.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
    opt.value.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const selectedOption = parsedOptions.find(opt => String(opt.value) === String(currentValue));
  const effectivePlaceholder = placeholder || defaultPlaceholder || (label ? `Select ${label}` : 'Select option');
  const displayValue = selectedOption && selectedOption.value !== '' ? selectedOption.label : effectivePlaceholder;
  const hasValue = selectedOption !== undefined && selectedOption.value !== '';

  return (
    <div className={`flex flex-col gap-1.5 w-full group relative ${wrapperClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={containerRef}>
      {label && (
        <label className={`text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1 transition-colors ${!disabled ? 'group-focus-within:text-[#C82A2B]' : ''}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative w-full">
        <input type="hidden" name={name} id={id} value={currentValue} required={required} />

        <div
          onClick={handleToggle}
          className={`w-full px-3.5 py-2.5 bg-white border ${
            isOpen 
              ? 'border-[#C82A2B] ring-2 ring-[#C82A2B]/15 shadow-sm' 
              : error 
                ? 'border-red-500' 
                : 'border-zinc-200/90 hover:border-zinc-300'
          } rounded-xl transition-all text-xs font-bold text-zinc-800 flex items-center justify-between cursor-pointer select-none shadow-2xs group ${
            icon ? 'pl-10' : ''
          } ${disabled ? 'pointer-events-none bg-zinc-50' : ''} ${className}`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
            {icon && (
               <div className="absolute left-3 text-zinc-400 group-hover:text-[#C82A2B] transition-colors pointer-events-none">
                 {icon}
               </div>
            )}
            <span className={`truncate ${!hasValue ? 'text-zinc-400 font-medium' : 'text-zinc-800 font-bold'}`}>
              {displayValue}
            </span>
          </div>
          <ChevronDown 
            size={14} 
            strokeWidth={2.5}
            className={`text-zinc-400 group-hover:text-zinc-600 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#C82A2B]' : ''}`} 
          />
        </div>

        {isOpen && !disabled && (
          <div className={`absolute top-[calc(100%+6px)] left-0 min-w-full min-w-[200px] max-w-[420px] bg-white border border-zinc-200/90 rounded-2xl shadow-xl shadow-zinc-900/10 z-[999] animate-in fade-in zoom-in-95 duration-150 overflow-hidden ${dropdownClassName}`}>
            {parsedOptions.length > 6 && (
              <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
                <div className="relative flex items-center">
                  <Search size={12} className="absolute left-2.5 text-zinc-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={`Search ${label ? label.toLowerCase() : 'options'}...`}
                    className="w-full h-8 pl-7 pr-7 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#C82A2B] focus:ring-1 focus:ring-[#C82A2B]/20 transition-all"
                  />
                  {filterQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterQuery('')}
                      className="absolute right-2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isItemActive = String(opt.value) === String(currentValue);
                  return (
                    <div
                      key={opt.value + '_' + opt.label}
                      onClick={() => handleSelect(opt)}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors mb-0.5 group ${
                        opt.disabled 
                          ? 'opacity-40 pointer-events-none text-zinc-400' 
                          : isItemActive
                            ? 'bg-[#FFF1F1] text-[#9E1B1D] font-black'
                            : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 font-bold'
                      }`}
                      title={opt.label}
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isItemActive && <Check size={13} strokeWidth={3} className="text-[#C82A2B] shrink-0" />}
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-zinc-400 text-xs font-medium">
                  No matching options
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
