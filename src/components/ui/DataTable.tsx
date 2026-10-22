'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Info, ArrowUp, ArrowDown, ArrowUpDown, Printer, X } from 'lucide-react';
import { Button } from './Button';

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | Date | null | undefined;
}

export interface SortInfo<T> {
  columnIndex: number | null;
  column: Column<T> | null;
  direction: 'asc' | 'desc';
  headerLabel: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  isLoading?: boolean;
  headerAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  defaultSortIndex?: number | null;
  defaultSortDirection?: 'asc' | 'desc';
  onPrint?: (sortedData: T[], sortInfo: SortInfo<T>) => void;
  pinRowTop?: (item: T) => boolean;
  rowClassName?: (item: T) => string | undefined;
  onRowClick?: (item: T) => void;
}

function extractTextFromReactNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(extractTextFromReactNode).join(' ');
  }
  if (React.isValidElement(node)) {
    const props = node.props as any;
    if (props) {
      if (props['data-sort-value'] !== undefined) {
        return String(props['data-sort-value']);
      }
      if (props.children) {
        const text = extractTextFromReactNode(props.children);
        if (text.trim()) return text;
      }
      if (typeof props.title === 'string' && props.title.trim()) {
        const t = props.title.trim().toLowerCase();
        if (!t.startsWith('click') && !t.startsWith('hover')) {
          return props.title;
        }
      }
    }
  }
  return '';
}

function naturalCompare(a: any, b: any): number {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  const strA = String(a).trim();
  const strB = String(b).trim();

  // If numbers embedded in strings (e.g. ₹ 5,000, 100 kg, 20%)
  const cleanA = strA.replace(/^[₹$€£\s]+/, '').replace(/,/g, '').replace(/%$/, '');
  const cleanB = strB.replace(/^[₹$€£\s]+/, '').replace(/,/g, '').replace(/%$/, '');
  const numA = Number(cleanA);
  const numB = Number(cleanB);
  if (!isNaN(numA) && !isNaN(numB) && cleanA !== '' && cleanB !== '') {
    return numA - numB;
  }

  // If date strings (e.g. 2026-10-06, 05/10/2026)
  const dateA = Date.parse(strA);
  const dateB = Date.parse(strB);
  if (!isNaN(dateA) && !isNaN(dateB) && (strA.includes('-') || strA.includes('/')) && strA.length >= 8 && strB.length >= 8) {
    return dateA - dateB;
  }

  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

function getColumnValue<T>(item: T, col: Column<T>): any {
  if (col.sortValue) {
    return col.sortValue(item);
  }

  if (typeof col.accessor === 'string' || typeof col.accessor === 'number') {
    return (item as any)[col.accessor];
  }

  if (typeof col.accessor === 'function') {
    try {
      const rendered = col.accessor(item);
      if (typeof rendered === 'string' || typeof rendered === 'number' || typeof rendered === 'boolean') {
        return rendered;
      }
      return extractTextFromReactNode(rendered);
    } catch {
      return '';
    }
  }

  return '';
}

export function DataTable<T extends { id: string | number }>({ 
  columns, 
  data, 
  title, 
  subtitle, 
  searchPlaceholder = "Search...", 
  onSearch,
  isLoading,
  headerAction,
  rightAction,
  pageSize = 10,
  emptyMessage,
  defaultSortIndex = null,
  defaultSortDirection = 'asc',
  onPrint,
  pinRowTop,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(defaultSortIndex ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection || 'asc');

  // Auto-focus search input when popup opens
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Click outside and escape key handling to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    if (onSearch) onSearch(e.target.value);
  };

  const handleSort = (index: number) => {
    const col = columns[index];
    const isAction = typeof col.header === 'string' && (col.header.toLowerCase() === 'actions' || col.header.toLowerCase() === 'action');
    if (col.sortable === false || isAction) return;

    if (sortColumnIndex === index) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumnIndex(index);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const filteredData = React.useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const lowerSearch = searchTerm.toLowerCase().trim();
    const searchWords = lowerSearch.split(/\s+/).filter(Boolean);
    
    // Deep flattener to extract all string values from an object/array
    const getAllValues = (obj: any): string[] => {
      let values: string[] = [];
      if (obj === null || obj === undefined) return values;
      
      if (typeof obj === 'string' || typeof obj === 'number') {
        values.push(obj.toString().toLowerCase());
      } else if (Array.isArray(obj)) {
        obj.forEach(item => {
          values = values.concat(getAllValues(item));
        });
      } else if (typeof obj === 'object') {
        Object.values(obj).forEach(val => {
          values = values.concat(getAllValues(val));
        });
      }
      return values;
    };

    return data.filter(item => {
      const itemValues = getAllValues(item);

      return searchWords.every(word => 
        itemValues.some(val => val.includes(word))
      );
    });
  }, [data, searchTerm]);

  const sortedData = React.useMemo(() => {
    let list = filteredData;
    if (sortColumnIndex !== null && sortColumnIndex >= 0 && sortColumnIndex < columns.length) {
      const activeCol = columns[sortColumnIndex];
      const modifier = sortDirection === 'asc' ? 1 : -1;
      list = [...filteredData].sort((a, b) => {
        const valA = getColumnValue(a, activeCol);
        const valB = getColumnValue(b, activeCol);
        return modifier * naturalCompare(valA, valB);
      });
    }

    if (pinRowTop) {
      const pinned: T[] = [];
      const regular: T[] = [];
      list.forEach(item => {
        if (pinRowTop(item)) {
          pinned.push(item);
        } else {
          regular.push(item);
        }
      });
      return [...pinned, ...regular];
    }

    return list;
  }, [filteredData, sortColumnIndex, sortDirection, columns, pinRowTop]);

  const currentSortInfo: SortInfo<T> = React.useMemo(() => {
    const col = sortColumnIndex !== null && sortColumnIndex >= 0 && sortColumnIndex < columns.length ? columns[sortColumnIndex] : null;
    let label = 'Default';
    if (col) {
      if (typeof col.header === 'string') {
        label = col.header;
      } else {
        label = extractTextFromReactNode(col.header) || 'Selected Column';
      }
    }
    return {
      columnIndex: sortColumnIndex,
      column: col,
      direction: sortDirection,
      headerLabel: label,
    };
  }, [sortColumnIndex, sortDirection, columns]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-[#fce4d4] overflow-hidden shadow-sm transition-all duration-300">
      {/* Table Header Section - Unified One-Line Toolbar */}
      {(title || subtitle || searchPlaceholder || headerAction || rightAction || onPrint) && (
        <div className="px-4 py-2.5 md:px-6 md:py-3 border-b border-[#fce4d4] flex flex-wrap items-center justify-between gap-2.5 bg-[#fce4d4]/10 min-w-0">
          {/* Left: Title & Subtitle Info (if provided) */}
          {(title || subtitle) && (
            <div className="flex items-center gap-2.5 shrink-0">
              {title && <h3 className="text-lg md:text-xl font-black tracking-tight text-[#3a525d]">{title}</h3>}
              {subtitle && (
                <div className="relative group/info inline-flex items-center">
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="Table description info"
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[#2d8d9b] bg-[#2d8d9b]/15 hover:bg-[#2d8d9b]/25 hover:text-[#1b5b64] transition-all cursor-help focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/40 shrink-0"
                  >
                    <Info size={12} strokeWidth={2.5} />
                  </button>
                  <div className="pointer-events-none group-hover/info:pointer-events-auto absolute left-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-3rem)] p-3 bg-[#1e293b] text-white rounded-xl shadow-xl border border-slate-700/50 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible group-focus-within/info:opacity-100 group-focus-within/info:visible transition-all duration-200 transform scale-95 group-hover/info:scale-100 group-focus-within/info:scale-100 origin-top-left before:absolute before:-top-2 before:left-0 before:right-0 before:h-2">
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-[#1e293b] border-t border-l border-slate-700/50 rotate-45" />
                    <p className="relative z-10 text-xs font-medium leading-relaxed text-slate-200 normal-case tracking-normal">
                      {subtitle}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right: Filters, Search Lens Icon & Popup, Print Button, and Right Action all in one line */}
          <div className="flex items-center gap-2 flex-wrap justify-end flex-1 min-w-0">
            {/* Filters */}
            {headerAction && (
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {headerAction}
              </div>
            )}

            {/* Search (Lens) Icon & Popup */}
            {searchPlaceholder && (
              <div className="relative shrink-0" ref={searchContainerRef}>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(prev => !prev)}
                  className={`h-10 ${searchTerm.trim() ? 'px-3' : 'w-10 px-0 justify-center'} bg-white border border-[#fce4d4] hover:border-[#2d8d9b]/60 rounded-xl text-xs font-bold text-[#3a525d] transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                    searchTerm.trim()
                      ? '!bg-[#2d8d9b] !text-white !border-[#2d8d9b] shadow-md shadow-[#2d8d9b]/25 ring-2 ring-[#2d8d9b]/30'
                      : isSearchOpen
                        ? 'bg-[#2d8d9b]/10 text-[#2d8d9b] border-[#2d8d9b] ring-2 ring-[#2d8d9b]/20'
                        : 'hover:bg-[#fce4d4]/20'
                  }`}
                  title={searchTerm.trim() ? `Filtered by "${searchTerm}" (Click to edit)` : (typeof searchPlaceholder === 'string' && searchPlaceholder ? searchPlaceholder : "Search table")}
                  aria-label="Search"
                >
                  <Search size={15} className={searchTerm.trim() ? 'text-white' : 'text-[#2d8d9b]'} />
                  {searchTerm.trim() ? (
                    <span className="flex items-center gap-1.5 max-w-[120px]">
                      <span className="truncate text-xs font-bold">{searchTerm}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchTerm('');
                          setCurrentPage(1);
                          if (onSearch) onSearch('');
                        }}
                        className="p-0.5 rounded-full hover:bg-black/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Clear search"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </span>
                    </span>
                  ) : null}
                </button>

                {/* Search Popup Dropdown */}
                {isSearchOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 p-3 bg-white rounded-2xl shadow-2xl border border-[#2d8d9b]/30 animate-in fade-in zoom-in-95 duration-150 ring-4 ring-[#2d8d9b]/10">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 text-[#2d8d9b]" size={15} />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' || e.key === 'Enter') {
                            setIsSearchOpen(false);
                          }
                        }}
                        placeholder={searchPlaceholder}
                        className="h-10 bg-[#fce4d4]/15 border border-[#fce4d4] focus:border-[#2d8d9b] rounded-xl py-2 pl-9 pr-14 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 w-full transition-all text-[#3a525d] placeholder:text-zinc-400"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setCurrentPage(1);
                              if (onSearch) onSearch('');
                              searchInputRef.current?.focus();
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Clear search"
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsSearchOpen(false)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Close popup"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                    {searchTerm && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] font-bold text-zinc-500 px-1">
                        <span>Found <span className="text-[#2d8d9b] font-black">{filteredData.length}</span> matching rows</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setCurrentPage(1);
                            if (onSearch) onSearch('');
                            setIsSearchOpen(false);
                          }}
                          className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Print Button */}
            {onPrint && (
              <button
                type="button"
                onClick={() => onPrint(sortedData, currentSortInfo)}
                className="h-10 px-3.5 bg-white border border-[#fce4d4] hover:bg-[#fce4d4]/30 hover:border-[#2d8d9b] text-[#3a525d] hover:text-[#2d8d9b] text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
                title="Print table data (as per current sort applied)"
              >
                <Printer size={15} className="text-[#2d8d9b]" />
                <span className="hidden sm:inline">Print</span>
              </button>
            )}

            {/* Right Action */}
            {rightAction && (
              <div className="shrink-0 flex items-center">
                {rightAction}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="bg-[#fce4d4]/20 border-b border-[#fce4d4]">
              {columns.map((col, idx) => {
                const isAction = typeof col.header === 'string' && (col.header.toLowerCase() === 'actions' || col.header.toLowerCase() === 'action');
                const isLast = idx === columns.length - 1;
                const isCollapsed = col.className?.includes('!w-0');
                const isSticky = (isAction || isLast) && !isCollapsed;
                const isSortable = col.sortable !== false && !isAction && !isCollapsed;
                const isSorted = sortColumnIndex === idx;
                const isRightAligned = col.className?.includes('text-right');

                return (
                  <th 
                    key={idx} 
                    onClick={() => isSortable && handleSort(idx)}
                    aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                    title={isSortable ? `Click to sort by ${typeof col.header === 'string' ? col.header : 'column'} (${isSorted && sortDirection === 'asc' ? 'Descending' : 'Ascending'})` : undefined}
                    className={`transition-all duration-300 ease-in-out px-4 py-2 md:py-2.5 text-[10px] md:text-[11px] font-black tracking-[0.12em] uppercase whitespace-nowrap select-none border-r border-[#fce4d4]/30 last:border-r-0 ${
                      isSortable 
                        ? 'cursor-pointer hover:bg-[#fce4d4]/35 hover:text-[#3a525d] group/th' 
                        : ''
                    } ${
                      isSorted 
                        ? 'bg-[#fce4d4]/40 text-[#2d8d9b] border-b-2 border-b-[#2d8d9b]' 
                        : 'text-[#8b6b5a]'
                    } ${
                      isSticky ? 'sticky right-0 bg-[#fef7f2] z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]' : ''
                    } ${col.className || ''}`}
                  >
                    <div className={`flex items-center gap-1.5 ${isRightAligned ? 'justify-end' : 'justify-between'}`}>
                      <span className="truncate">{col.header}</span>
                      {isSortable && (
                        <span className="inline-flex items-center shrink-0 ml-1">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp size={13} strokeWidth={3} className="text-[#2d8d9b] animate-in fade-in zoom-in-75 duration-150" />
                            ) : (
                              <ArrowDown size={13} strokeWidth={3} className="text-[#2d8d9b] animate-in fade-in zoom-in-75 duration-150" />
                            )
                          ) : (
                            <ArrowUpDown size={12} strokeWidth={2} className="text-[#8b6b5a]/30 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col, j) => {
                    const isAction = typeof col.header === 'string' && (col.header.toLowerCase() === 'actions' || col.header.toLowerCase() === 'action');
                    const isLast = j === columns.length - 1;
                    const isCollapsed = col.className?.includes('!w-0');
                    const isSticky = (isAction || isLast) && !isCollapsed;
                    return (
                      <td 
                        key={j} 
                        className={`transition-all duration-300 ease-in-out px-4 py-2 md:py-2.5 ${
                          isSticky ? 'sticky right-0 bg-white z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]' : ''
                        } ${col.className || ''}`}
                      >
                        <div className="h-5 bg-zinc-100 rounded-xl w-3/4" />
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item) => {
                const customRowClass = rowClassName ? (rowClassName(item) || '') : '';
                const hasRedShade = customRowClass.includes('rose') || customRowClass.includes('red');
                return (
                  <tr 
                    key={item.id} 
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a, input, select, textarea, [data-prevent-row-click]')) {
                        return;
                      }
                      if (onRowClick) onRowClick(item);
                    }}
                    className={`transition-colors group ${onRowClick ? 'cursor-pointer hover:bg-[#2d8d9b]/5 hover:shadow-2xs' : ''} ${customRowClass || 'hover:bg-[#fce4d4]/5'}`}
                  >
                    {columns.map((col, idx) => {
                      const isAction = typeof col.header === 'string' && (col.header.toLowerCase() === 'actions' || col.header.toLowerCase() === 'action');
                      const isLast = idx === columns.length - 1;
                      const isFirst = idx === 0;
                      const isCollapsed = col.className?.includes('!w-0');
                      const isSticky = (isAction || isLast) && !isCollapsed;
                      const isSorted = sortColumnIndex === idx;

                      return (
                        <td 
                          key={idx} 
                          className={`transition-all duration-300 ease-in-out px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-foreground ${
                            isSorted && !hasRedShade ? 'bg-[#fce4d4]/5 font-semibold' : ''
                          } ${
                            isSticky 
                              ? `sticky right-0 ${hasRedShade ? 'bg-rose-50/95 group-hover:bg-rose-100/90' : 'bg-white group-hover:bg-[#fef9f6]'} z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors` 
                              : ''
                          } ${
                            isFirst && hasRedShade ? 'border-l-4 border-l-rose-500 shadow-[inset_4px_0_0_0_#f43f5e]' : ''
                          } ${col.className || ''}`}
                        >
                          {typeof col.accessor === 'function' 
                            ? col.accessor(item) 
                            : (item[col.accessor] as React.ReactNode)
                          }
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 md:p-12 text-center">
                   <div className="flex flex-col items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300">
                       <Search size={24} />
                     </div>
                     <p className="text-base font-black text-[#3a525d]">
                       {searchTerm 
                         ? `No records matching "${searchTerm}"` 
                         : (emptyMessage || (title ? `No ${title.toLowerCase().replace(/directory|table|registry|management|hub/gi, '').trim() || 'data'} available to display` : 'No data available to display'))}
                     </p>
                     <p className="text-xs text-zinc-400 font-medium max-w-sm">
                       {searchTerm 
                         ? 'Try adjusting your search criteria or clearing filters.' 
                         : 'There are currently no records available in this table.'}
                     </p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Footer */}
      <div className="px-4 py-3 md:px-6 md:py-3.5 border-t border-[#fce4d4] flex flex-col md:flex-row justify-between items-center gap-3 bg-[#fce4d4]/5 transition-colors">
        <span className="text-[10px] md:text-[11px] text-[#8b6b5a] font-black uppercase tracking-[0.2em] text-center md:text-left">
          Showing <span className="text-[#2d8d9b] text-sm md:text-base">{sortedData.length === 0 ? 0 : Math.min(sortedData.length, (currentPage - 1) * pageSize + 1)}</span> to <span className="text-[#2d8d9b] text-sm md:text-base">{Math.min(sortedData.length, currentPage * pageSize)}</span> of <span className="text-[#2d8d9b] text-xs md:text-sm font-black">{sortedData.length}</span> entries
        </span>
        <div className="flex gap-2 md:gap-2.5 w-full md:w-auto">
          <Button 
            variant="secondary" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="flex-1 md:flex-initial px-4 md:px-5 py-2 h-auto text-[10px] md:text-[11px] font-black tracking-widest rounded-xl border-border bg-white group uppercase disabled:opacity-30"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Prev
          </Button>
          <Button 
             variant="secondary" 
             disabled={currentPage === totalPages || totalPages === 0}
             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
             className="flex-1 md:flex-initial px-4 md:px-5 py-2 h-auto text-[10px] md:text-[11px] font-black tracking-widest rounded-xl border-border bg-white group uppercase disabled:opacity-30"
          >
            Next
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
