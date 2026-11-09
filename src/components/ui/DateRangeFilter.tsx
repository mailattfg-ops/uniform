'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';

export type DatePreset = 
  | 'ALL' 
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'this_month' 
  | 'last_month' 
  | 'last_30_days' 
  | 'custom';

export interface DateFilterValue {
  preset: DatePreset;
  startDate?: string; // Format: 'YYYY-MM-DD'
  endDate?: string;   // Format: 'YYYY-MM-DD'
}

export interface DateRangeFilterProps {
  label?: string;
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
  maxWidth?: string;
  align?: 'left' | 'right';
}

const PRESET_OPTIONS: { label: string; value: DatePreset }[] = [
  { label: 'All Dates', value: 'ALL' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 30 Days', value: 'last_30_days' },
];

function formatDisplayDate(val?: string): string {
  if (!val) return '';
  const parts = val.trim().split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  }
  return val;
}

export function matchesDateFilter(
  itemDateStr: string | null | undefined,
  filter: DateFilterValue
): boolean {
  if (!filter || filter.preset === 'ALL' || (!filter.preset && !filter.startDate && !filter.endDate)) {
    return true;
  }
  if (!itemDateStr) return false;

  let itemDate = new Date(itemDateStr);
  if (isNaN(itemDate.getTime())) {
    // Attempt fallback parsing for DD-MM-YYYY
    const parts = String(itemDateStr).trim().split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD-MM-YYYY
        itemDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD
        itemDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
  }
  if (isNaN(itemDate.getTime())) return false;

  const itemYear = itemDate.getFullYear();
  const itemMonth = itemDate.getMonth();
  const itemDay = itemDate.getDate();
  const itemDayTimestamp = new Date(itemYear, itemMonth, itemDay).getTime();

  const now = new Date();
  const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  switch (filter.preset) {
    case 'today':
      return itemDayTimestamp === todayTimestamp;

    case 'yesterday': {
      const yesterdayTimestamp = todayTimestamp - 24 * 60 * 60 * 1000;
      return itemDayTimestamp === yesterdayTimestamp;
    }

    case 'this_week': {
      const dayOfWeek = (now.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
      const mondayTimestamp = todayTimestamp - dayOfWeek * 24 * 60 * 60 * 1000;
      const sundayTimestamp = mondayTimestamp + 6 * 24 * 60 * 60 * 1000;
      return itemDayTimestamp >= mondayTimestamp && itemDayTimestamp <= sundayTimestamp;
    }

    case 'this_month': {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime();
      return itemDayTimestamp >= firstOfMonth && itemDayTimestamp <= lastOfMonth;
    }

    case 'last_month': {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getTime();
      return itemDayTimestamp >= firstOfLastMonth && itemDayTimestamp <= lastOfLastMonth;
    }

    case 'last_30_days': {
      const thirtyDaysAgo = todayTimestamp - 30 * 24 * 60 * 60 * 1000;
      return itemDayTimestamp >= thirtyDaysAgo && itemDayTimestamp <= todayTimestamp;
    }

    case 'custom':
    default: {
      if (filter.startDate) {
        const startParts = filter.startDate.split('-').map(Number);
        const startTimestamp = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();
        if (itemDayTimestamp < startTimestamp) return false;
      }
      if (filter.endDate) {
        const endParts = filter.endDate.split('-').map(Number);
        const endTimestamp = new Date(endParts[0], endParts[1] - 1, endParts[2]).getTime();
        if (itemDayTimestamp > endTimestamp) return false;
      }
      return true;
    }
  }
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  label = 'Date',
  value,
  onChange,
  className = '',
  maxWidth = 'max-w-[260px]',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState<string>(value.startDate || '');
  const [customEnd, setCustomEnd] = useState<string>(value.endDate || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize internal custom date state with incoming props
  useEffect(() => {
    setCustomStart(value.startDate || '');
    setCustomEnd(value.endDate || '');
  }, [value.startDate, value.endDate]);

  const isFiltered = value.preset !== 'ALL' || Boolean(value.startDate) || Boolean(value.endDate);

  const displayLabel = useMemo(() => {
    if (!isFiltered) return 'All Dates';

    const matchedPreset = PRESET_OPTIONS.find(p => p.value === value.preset);
    if (matchedPreset && matchedPreset.value !== 'ALL') {
      return matchedPreset.label;
    }

    if (value.startDate && value.endDate) {
      if (value.startDate === value.endDate) {
        return formatDisplayDate(value.startDate);
      }
      return `${formatDisplayDate(value.startDate)} to ${formatDisplayDate(value.endDate)}`;
    }
    if (value.startDate) {
      return `From ${formatDisplayDate(value.startDate)}`;
    }
    if (value.endDate) {
      return `Until ${formatDisplayDate(value.endDate)}`;
    }
    return 'Custom Range';
  }, [isFiltered, value]);

  // Click outside and escape handling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
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

  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === 'ALL') {
      onChange({ preset: 'ALL', startDate: '', endDate: '' });
      setCustomStart('');
      setCustomEnd('');
    } else {
      onChange({ preset, startDate: '', endDate: '' });
    }
    setIsOpen(false);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart && !customEnd) {
      onChange({ preset: 'ALL', startDate: '', endDate: '' });
    } else {
      onChange({
        preset: 'custom',
        startDate: customStart || undefined,
        endDate: customEnd || undefined
      });
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ preset: 'ALL', startDate: '', endDate: '' });
    setCustomStart('');
    setCustomEnd('');
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${maxWidth} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 border shadow-2xs cursor-pointer w-full ${
          isFiltered
            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
            : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200/80 hover:border-zinc-300'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar size={13} className={isFiltered ? 'text-[#C82A2B]' : 'text-zinc-400'} />
          <span className="text-[10px] uppercase font-black tracking-wider opacity-60 shrink-0">
            {label}:
          </span>
          <span className="truncate font-semibold">{displayLabel}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isFiltered && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title="Reset date filter"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-50 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-zinc-200/80 p-3 space-y-3 animate-in fade-in-50 zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-150">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Filter By Date
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-bold text-[#C82A2B] hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_OPTIONS.map((opt) => {
              const isSelected = value.preset === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectPreset(opt.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFF1F1] text-[#9E1B1D] font-bold border border-[#C82A2B]/20'
                      : 'hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="text-[#C82A2B] shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Section */}
          <div className="pt-2 border-t border-zinc-150 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Custom Range
            </p>
            <form onSubmit={handleApplyCustomRange} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-zinc-400 block mb-0.5">
                    From
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full text-xs font-medium px-2 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C82A2B] text-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-zinc-400 block mb-0.5">
                    To
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full text-xs font-medium px-2 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C82A2B] text-zinc-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-8 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer active:scale-98"
              >
                Apply Range
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

