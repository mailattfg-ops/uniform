'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Info, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Button } from './Button';

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | Date | null | undefined;
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
  pageSize?: number;
  emptyMessage?: string;
  defaultSortIndex?: number | null;
  defaultSortDirection?: 'asc' | 'desc';
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
  pageSize = 10,
  emptyMessage,
  defaultSortIndex = null,
  defaultSortDirection = 'asc',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(defaultSortIndex ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection || 'asc');

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
    if (sortColumnIndex === null || sortColumnIndex < 0 || sortColumnIndex >= columns.length) {
      return filteredData;
    }

    const activeCol = columns[sortColumnIndex];
    const modifier = sortDirection === 'asc' ? 1 : -1;

    return [...filteredData].sort((a, b) => {
      const valA = getColumnValue(a, activeCol);
      const valB = getColumnValue(b, activeCol);
      return modifier * naturalCompare(valA, valB);
    });
  }, [filteredData, sortColumnIndex, sortDirection, columns]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-[#fce4d4] overflow-hidden shadow-sm transition-all duration-300">
      {/* Table Header Section - Light Themed */}
      {(title || subtitle || searchPlaceholder) && (
        <div className="px-4 py-3.5 md:px-6 md:py-4 border-b border-[#fce4d4] flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-[#fce4d4]/10">
          <div className="flex items-center gap-2.5 flex-wrap">
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
          
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {headerAction && <div className="flex justify-start">{headerAction}</div>}
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative group flex-1 sm:flex-initial">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={15} />
                 <input 
                   type="text" 
                   value={searchTerm}
                   onChange={handleSearchChange}
                   placeholder={searchPlaceholder} 
                   className="h-10 bg-white border border-[#fce4d4] rounded-xl py-2 pl-10 pr-9 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 w-full sm:w-60 transition-all text-foreground shadow-xs"
                 />
                 {searchTerm && (
                   <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                   >
                     <ChevronRight size={14} className="rotate-45" />
                   </button>
                 )}
              </div>
            </div>
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
                const isSticky = isAction || isLast;
                const isSortable = col.sortable !== false && !isAction;
                const isSorted = sortColumnIndex === idx;
                const isRightAligned = col.className?.includes('text-right');

                return (
                  <th 
                    key={idx} 
                    onClick={() => isSortable && handleSort(idx)}
                    aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                    title={isSortable ? `Click to sort by ${typeof col.header === 'string' ? col.header : 'column'} (${isSorted && sortDirection === 'asc' ? 'Descending' : 'Ascending'})` : undefined}
                    className={`px-4 py-2.5 md:py-3 text-[10px] md:text-[11px] font-black tracking-[0.12em] uppercase whitespace-nowrap select-none transition-all border-r border-[#fce4d4]/30 last:border-r-0 ${
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
                    const isSticky = isAction || isLast;
                    return (
                      <td 
                        key={j} 
                        className={`px-4 py-2.5 md:py-3 ${
                          isSticky ? 'sticky right-0 bg-white z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]' : ''
                        }`}
                      >
                        <div className="h-5 bg-zinc-100 rounded-xl w-3/4" />
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-[#fce4d4]/5 transition-colors group">
                  {columns.map((col, idx) => {
                    const isAction = typeof col.header === 'string' && (col.header.toLowerCase() === 'actions' || col.header.toLowerCase() === 'action');
                    const isLast = idx === columns.length - 1;
                    const isSticky = isAction || isLast;
                    const isSorted = sortColumnIndex === idx;

                    return (
                      <td 
                        key={idx} 
                        className={`px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-foreground ${
                          isSorted ? 'bg-[#fce4d4]/5 font-semibold' : ''
                        } ${
                          isSticky ? 'sticky right-0 bg-white group-hover:bg-[#fef9f6] z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors' : ''
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
              ))
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
