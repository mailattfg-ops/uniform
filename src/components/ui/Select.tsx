'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  group?: string;
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

  const traverse = (nodes: React.ReactNode, currentGroup?: string) => {
    React.Children.forEach(nodes, child => {
      if (!child) return;
      if (Array.isArray(child)) {
        traverse(child, currentGroup);
      } else if (React.isValidElement(child)) {
        const props = child.props as any;
        if (child.type === 'optgroup') {
          const groupLabel = props.label ? String(props.label) : undefined;
          if (props.children) {
            traverse(props.children, groupLabel);
          }
        } else if (child.type === 'option') {
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
            disabled: !!props.disabled,
            group: currentGroup
          });
        } else if (props && props.children) {
          traverse(props.children, currentGroup);
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placeAbove: boolean;
  }>({ top: 0, left: 0, width: 0, maxHeight: 300, placeAbove: false });

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

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // If completely scrolled out of viewport, close to prevent orphaned dropdown
    if (rect.bottom < -20 || rect.top > viewportHeight + 20) {
      setIsOpen(false);
      return;
    }

    const dropdownPreferredHeight = 300;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableHeight = placeAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(120, Math.min(dropdownPreferredHeight, availableHeight));

    const targetWidth = Math.max(rect.width, 240);
    let left = rect.left;
    if (left + targetWidth > viewportWidth - 16) {
      left = Math.max(12, viewportWidth - targetWidth - 16);
    }

    setCoords({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(8, left),
      width: targetWidth,
      maxHeight,
      placeAbove
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
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
      updatePosition();
      const rafId = requestAnimationFrame(updatePosition);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        cancelAnimationFrame(rafId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (isOpen && parsedOptions.length > 6 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, parsedOptions.length]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    } else {
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
      const expectsEvent = 
        fnStr.includes('.target') || 
        fnStr.includes('target') || 
        fnStr.includes('.currentTarget') || 
        fnStr.includes('currentTarget');

      const syntheticEvent = {
        target: { value: option.value, name: name || '' },
        currentTarget: { value: option.value, name: name || '' },
        preventDefault: () => {},
        stopPropagation: () => {}
      };

      if (expectsEvent) {
        (onChange as any)(syntheticEvent);
      } else {
        onChange(option.value);
      }
    }
  };

  const filteredOptions = parsedOptions.filter(opt => 
    opt.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
    opt.value.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (opt.group && opt.group.toLowerCase().includes(filterQuery.toLowerCase()))
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
          title={displayValue}
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

        {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              maxWidth: 'min(94vw, 560px)',
              zIndex: 99999,
            }}
            className={`bg-white border border-zinc-200/95 rounded-2xl shadow-2xl shadow-zinc-950/25 animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden ring-1 ring-black/5 ${dropdownClassName}`}
          >
            {/* Search Input when options > 6 */}
            {parsedOptions.length > 6 && (
              <div className="p-2 border-b border-zinc-100 bg-zinc-50/80 shrink-0">
                <div className="relative flex items-center">
                  <Search size={13} className="absolute left-2.5 text-zinc-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={`Search ${label ? label.toLowerCase() : 'options'}...`}
                    className="w-full h-8 pl-8 pr-7 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#C82A2B] focus:ring-1 focus:ring-[#C82A2B]/20 transition-all"
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

            {/* Options Scrollable List - Full Content Visibility */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent] p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => {
                  const isItemActive = String(opt.value) === String(currentValue);
                  const showGroupHeader = opt.group && (i === 0 || filteredOptions[i - 1].group !== opt.group);
                  return (
                    <React.Fragment key={opt.value + '_' + opt.label + '_' + i}>
                      {showGroupHeader && (
                        <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#C82A2B] bg-[#FFF1F1]/80 rounded-lg my-1 border border-[#C82A2B]/15 select-none">
                          {opt.group}
                        </div>
                      )}
                      <div
                        onClick={() => handleSelect(opt)}
                        className={`px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors mb-0.5 group ${
                          opt.disabled 
                            ? 'opacity-40 pointer-events-none text-zinc-400' 
                            : isItemActive
                              ? 'bg-[#FFF1F1] text-[#9E1B1D] font-black'
                              : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 font-bold'
                        }`}
                        title={opt.label}
                      >
                        <span className="break-words whitespace-normal leading-snug pr-2 text-left flex-1">{opt.label}</span>
                        {isItemActive && <Check size={14} strokeWidth={3} className="text-[#C82A2B] shrink-0 ml-1" />}
                      </div>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-zinc-400 text-xs font-medium">
                  No matching options
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {error && <span className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1 animate-in shake duration-300">{error}</span>}
    </div>
  );
};
