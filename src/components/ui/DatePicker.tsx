'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown, Check } from 'lucide-react';

export interface DatePickerProps {
  label?: string;
  value?: string; // Format: 'YYYY-MM-DD'
  defaultValue?: string;
  onChange?: (value: any) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string; // 'YYYY-MM-DD'
  max?: string; // 'YYYY-MM-DD'
  error?: string;
  helperText?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  displayFormat?: 'DD-MM-YYYY' | 'DD MMM YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Helpers
function parseDateString(val?: string): Date | null {
  if (!val || typeof val !== 'string') return null;
  const parts = val.trim().split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const date = new Date(y, m, d);
  return isNaN(date.getTime()) ? null : date;
}

function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(val?: string, format: 'DD-MM-YYYY' | 'DD MMM YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' = 'DD-MM-YYYY'): string {
  if (!val) return '';
  const d = parseDateString(val);
  if (!d) return val;
  const day = String(d.getDate()).padStart(2, '0');
  const monthIdx = d.getMonth();
  const monthNum = String(monthIdx + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'DD-MM-YYYY') {
    return `${day}-${monthNum}-${year}`;
  }
  if (format === 'DD/MM/YYYY') {
    return `${day}/${monthNum}/${year}`;
  }
  if (format === 'YYYY-MM-DD') {
    return `${year}-${monthNum}-${day}`;
  }
  return `${day} ${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  id,
  placeholder = 'Select date',
  disabled = false,
  required = false,
  min,
  max,
  error,
  helperText,
  className = '',
  wrapperClassName = '',
  size = 'md',
  align = 'left',
  displayFormat = 'DD-MM-YYYY'
}) => {
  const [internalValue, setInternalValue] = useState<string>(defaultValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  const containerRef = useRef<HTMLDivElement>(null);

  const currentValue = controlledValue !== undefined ? String(controlledValue) : internalValue;
  const parsedCurrent = useMemo(() => parseDateString(currentValue), [currentValue]);

  // Current viewing month/year in calendar
  const [viewYear, setViewYear] = useState<number>(() => {
    return parsedCurrent ? parsedCurrent.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parsedCurrent ? parsedCurrent.getMonth() : new Date().getMonth();
  });

  // Sync viewing month/year when currentValue changes and popup is opened
  useEffect(() => {
    if (parsedCurrent) {
      setViewYear(parsedCurrent.getFullYear());
      setViewMonth(parsedCurrent.getMonth());
    }
  }, [currentValue, parsedCurrent]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Emit change helper
  const emitChange = useCallback((newVal: string) => {
    setInternalValue(newVal);
    if (onChange) {
      const fnStr = onChange.toString();
      if (fnStr.includes('.target') || fnStr.includes('.currentTarget')) {
        const syntheticEvent = {
          target: { value: newVal, name: name || '' },
          currentTarget: { value: newVal, name: name || '' },
          preventDefault: () => {},
          stopPropagation: () => {}
        };
        (onChange as any)(syntheticEvent);
      } else {
        onChange(newVal);
      }
    }
  }, [onChange, name]);

  const handleSelectDay = (day: number, monthOffset: number = 0) => {
    if (disabled) return;
    let targetYear = viewYear;
    let targetMonth = viewMonth + monthOffset;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const targetDate = new Date(targetYear, targetMonth, day);
    const isoString = formatDateToISO(targetDate);

    // Bounds check
    if (min && isoString < min) return;
    if (max && isoString > max) return;

    emitChange(isoString);
    setIsOpen(false);
    setViewMode('days');
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (disabled) return;
    emitChange('');
  };

  const handleToday = () => {
    if (disabled) return;
    const now = new Date();
    const isoString = formatDateToISO(now);
    if (min && isoString < min) return;
    if (max && isoString > max) return;
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    emitChange(isoString);
    setIsOpen(false);
    setViewMode('days');
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Build days grid for viewing month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    // Monday as 0, Sunday as 6
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const daysInCurrentMonth = lastDay.getDate();

    const days: { day: number; monthOffset: number; iso: string; isCurrentMonth: boolean }[] = [];

    // Preceding days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      let prevY = viewYear;
      let prevM = viewMonth - 1;
      if (prevM < 0) { prevM = 11; prevY -= 1; }
      const iso = formatDateToISO(new Date(prevY, prevM, d));
      days.push({ day: d, monthOffset: -1, iso, isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const iso = formatDateToISO(new Date(viewYear, viewMonth, d));
      days.push({ day: d, monthOffset: 0, iso, isCurrentMonth: true });
    }

    // Trailing days from next month to complete 6-row or 5-row grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      let nextY = viewYear;
      let nextM = viewMonth + 1;
      if (nextM > 11) { nextM = 0; nextY += 1; }
      const iso = formatDateToISO(new Date(nextY, nextM, d));
      days.push({ day: d, monthOffset: 1, iso, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const todayIso = useMemo(() => formatDateToISO(new Date()), []);

  // Year range for years view
  const yearRange = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = Math.min(viewYear - 6, currentYear - 10);
    const years: number[] = [];
    for (let y = startYear; y < startYear + 24; y++) {
      years.push(y);
    }
    return years;
  }, [viewYear]);

  // Size styling classes
  const sizeClasses = {
    sm: {
      trigger: 'h-8 px-2.5 py-1 text-xs rounded-xl',
      icon: 13,
      clearIcon: 12
    },
    md: {
      trigger: 'h-10 px-3.5 py-2 text-xs rounded-xl',
      icon: 14,
      clearIcon: 13
    },
    lg: {
      trigger: 'h-12 px-4 py-3 text-sm rounded-2xl',
      icon: 16,
      clearIcon: 14
    }
  }[size];

  const formattedDisplay = formatDisplayDate(currentValue, displayFormat);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-1.5 group relative ${wrapperClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label && (
        <label className={`text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6b5a] ml-1 transition-colors ${!disabled ? 'group-focus-within:text-[#C82A2B]' : ''}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative w-full">
        {/* Hidden input for form submission */}
        <input type="hidden" name={name} id={id} value={currentValue} required={required} />

        {/* Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setIsOpen(prev => !prev);
            setViewMode('days');
          }}
          className={`w-full bg-white border ${
            isOpen
              ? 'border-[#C82A2B] ring-2 ring-[#C82A2B]/15 shadow-sm'
              : error
              ? 'border-red-500 ring-1 ring-red-500/20'
              : 'border-zinc-200/90 hover:border-zinc-300'
          } ${sizeClasses.trigger} transition-all font-bold text-zinc-800 flex items-center justify-between cursor-pointer select-none shadow-2xs group text-left ${
            disabled ? 'pointer-events-none bg-zinc-50' : ''
          } ${className}`}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            <CalendarIcon
              size={sizeClasses.icon}
              className={`shrink-0 transition-colors ${
                isOpen || currentValue ? 'text-[#C82A2B]' : 'text-zinc-400 group-hover:text-zinc-600'
              }`}
            />
            <span className={`truncate ${!currentValue ? 'text-zinc-400 font-medium' : 'text-zinc-900 font-bold'}`}>
              {formattedDisplay || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {currentValue && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Clear date"
              >
                <X size={sizeClasses.clearIcon} />
              </span>
            )}
            <ChevronDown
              size={13}
              className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#C82A2B]' : ''}`}
            />
          </div>
        </button>

        {/* Calendar Popover */}
        {isOpen && !disabled && (
          <div
            className={`absolute top-[calc(100%+6px)] ${
              align === 'right' ? 'right-0' : 'left-0'
            } w-[290px] bg-white border border-zinc-200/90 rounded-2xl shadow-2xl shadow-zinc-900/15 z-[999] p-3.5 animate-in fade-in zoom-in-95 duration-150 select-none`}
          >
            {/* Top Brand Accent Rail */}
            <div className="h-1 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] rounded-full mb-3" />

            {/* Header: Month / Year Navigation */}
            <div className="flex items-center justify-between gap-1 mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode(prev => prev === 'months' ? 'days' : 'months')}
                  className="px-2 py-1 rounded-lg text-xs font-black text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  {MONTH_NAMES[viewMonth]}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode(prev => prev === 'years' ? 'days' : 'years')}
                  className="px-2 py-1 rounded-lg text-xs font-black text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  {viewYear}
                  <ChevronDown size={11} className="text-zinc-400" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* VIEW 1: Days Grid */}
            {viewMode === 'days' && (
              <>
                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {DAY_NAMES.map(name => (
                    <div key={name} className="text-[10px] font-black uppercase text-zinc-400 tracking-wider py-1">
                      {name}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((item, idx) => {
                    const isSelected = item.iso === currentValue;
                    const isToday = item.iso === todayIso;
                    const isOutOfRange = Boolean((min && item.iso < min) || (max && item.iso > max));

                    return (
                      <button
                        key={`${item.iso}_${idx}`}
                        type="button"
                        disabled={isOutOfRange}
                        onClick={() => handleSelectDay(item.day, item.monthOffset)}
                        className={`h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${
                          isSelected
                            ? 'bg-[#C82A2B] text-white shadow-md shadow-[#C82A2B]/25 font-black scale-105 z-10'
                            : isOutOfRange
                            ? 'opacity-20 cursor-not-allowed text-zinc-400'
                            : isToday
                            ? 'border border-[#C82A2B] text-[#9E1B1D] font-black bg-red-50/50 hover:bg-[#FFF1F1]'
                            : item.isCurrentMonth
                            ? 'text-zinc-800 hover:bg-[#FFF1F1] hover:text-[#9E1B1D]'
                            : 'text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500'
                        }`}
                      >
                        {item.day}
                        {isToday && !isSelected && (
                          <span className="w-1 h-1 bg-[#C82A2B] rounded-full absolute bottom-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* VIEW 2: Month Selector Grid */}
            {viewMode === 'months' && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {MONTH_NAMES_SHORT.map((mShort, idx) => {
                  const isCurrent = idx === viewMonth;
                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => {
                        setViewMonth(idx);
                        setViewMode('days');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C82A2B] text-white font-black shadow-xs'
                          : 'bg-zinc-50 text-zinc-700 hover:bg-[#FFF1F1] hover:text-[#9E1B1D]'
                      }`}
                    >
                      {mShort}
                    </button>
                  );
                })}
              </div>
            )}

            {/* VIEW 3: Year Selector Grid */}
            {viewMode === 'years' && (
              <div className="max-h-[190px] overflow-y-auto no-scrollbar grid grid-cols-3 gap-1.5 py-1 pr-1">
                {yearRange.map(yr => {
                  const isCurrent = yr === viewYear;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setViewYear(yr);
                        setViewMode('days');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C82A2B] text-white font-black shadow-xs'
                          : 'bg-zinc-50 text-zinc-700 hover:bg-[#FFF1F1] hover:text-[#9E1B1D]'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer Toolbar: Today, Clear, Close */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-150 text-[11px] font-bold">
              <button
                type="button"
                onClick={handleToday}
                className="text-[#9E1B1D] hover:underline font-black cursor-pointer"
              >
                Today
              </button>

              <div className="flex items-center gap-2">
                {currentValue && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClear();
                      setIsOpen(false);
                    }}
                    className="text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setViewMode('days');
                  }}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <span className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1 animate-in shake duration-300">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="text-[11px] font-semibold text-amber-700/95 ml-1 flex items-center gap-1.5 mt-0.5">
          {helperText}
        </span>
      )}
    </div>
  );
};
