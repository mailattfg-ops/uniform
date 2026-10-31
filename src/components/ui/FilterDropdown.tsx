'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
  badge?: string | number;
}

export interface FilterDropdownProps {
  label: string; // e.g. "Gender", "Product/Dress", "Garment Type"
  allLabel?: string; // e.g. "All Genders", "All Product/Dress", "All Garment Types"
  allValue?: string; // defaults to 'ALL'
  value: string;
  onChange: (value: string) => void;
  options: (FilterOption | string)[];
  icon?: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  allLabel,
  allValue = 'ALL',
  value,
  onChange,
  options,
  icon,
  className = '',
  maxWidth = 'max-w-[240px]'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: FilterOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });

  const effectiveAllLabel = allLabel || `All ${label}s`;
  const isFiltered = value !== allValue && value !== 'ALL' && value !== '';
  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayLabel = isFiltered ? (selectedOption?.label || value) : effectiveAllLabel;

  // Filter options by search query
  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
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
    if (isOpen && normalizedOptions.length > 6 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, normalizedOptions.length]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(allValue);
    setSearchQuery('');
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`h-10 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none shadow-2xs group ${maxWidth} ${
          isFiltered
            ? 'bg-[#FFF1F1] border-[#C82A2B]/40 text-[#9E1B1D] ring-2 ring-[#C82A2B]/15 hover:border-[#C82A2B]'
            : 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50/80 text-zinc-800'
        }`}
        title={`${label}: ${displayLabel}`}
      >
        {icon && (
          <span className={`shrink-0 ${isFiltered ? 'text-[#C82A2B]' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
            {icon}
          </span>
        )}

        {isFiltered && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#C82A2B] shrink-0" />
        )}

        <span className="truncate">
          {displayLabel}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-auto pl-1">
          {isFiltered && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-[#C82A2B]/15 text-[#C82A2B]/70 hover:text-[#C82A2B] transition-colors cursor-pointer"
              title="Reset filter"
            >
              <X size={12} strokeWidth={2.5} />
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ${
              isFiltered ? 'text-[#9E1B1D]' : 'text-zinc-400 group-hover:text-zinc-600'
            } ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[200px] w-max max-w-[280px] bg-white border border-zinc-200/90 rounded-2xl shadow-xl shadow-zinc-900/10 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="px-3.5 py-1.5 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              Filter by {label}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={() => handleSelect(allValue)}
                className="text-[10px] font-bold text-[#C82A2B] hover:text-[#9E1B1D] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Search if option count > 6 */}
          {normalizedOptions.length > 6 && (
            <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2.5 text-zinc-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full h-8 pl-7 pr-7 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#C82A2B] focus:ring-1 focus:ring-[#C82A2B]/20 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-[230px] overflow-y-auto custom-scrollbar p-1">
            {/* "All" default option */}
            <div
              onClick={() => handleSelect(allValue)}
              className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors mb-0.5 ${
                !isFiltered
                  ? 'bg-[#FFF1F1] text-[#9E1B1D] font-black'
                  : 'text-zinc-700 hover:bg-zinc-50 font-bold'
              }`}
            >
              <span>{effectiveAllLabel}</span>
              {!isFiltered && <Check size={13} strokeWidth={3} className="text-[#C82A2B]" />}
            </div>

            {/* Individual options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors mb-0.5 group ${
                      isSelected
                        ? 'bg-[#FFF1F1] text-[#9E1B1D] font-black'
                        : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 font-bold'
                    }`}
                    title={opt.label}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {opt.badge !== undefined && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={13} strokeWidth={3} className="text-[#C82A2B]" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-zinc-400 text-xs italic">
                No matching options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

