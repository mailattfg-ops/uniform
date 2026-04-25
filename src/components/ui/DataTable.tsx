'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
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
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    if (onSearch) onSearch(e.target.value);
  };

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    
    return data.filter(item => {
      return Object.values(item as object).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string' || typeof val === 'number') {
          return val.toString().toLowerCase().includes(lowerSearch);
        }
        if (Array.isArray(val)) {
            return (val as any[]).some(v => v?.toString().toLowerCase().includes(lowerSearch));
        }
        return false;
      });
    });
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-[#fce4d4] overflow-hidden shadow-sm transition-all duration-300">
      {/* Table Header Section - Light Themed */}
      {(title || subtitle || searchPlaceholder) && (
        <div className="p-4 md:p-8 border-b border-[#fce4d4] flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#fce4d4]/10">
          <div className="space-y-1">
            {title && <h3 className="text-xl md:text-2xl font-black italic tracking-tight text-[#3a525d]">{title}</h3>}
            {subtitle && (
              <p className="text-[9px] md:text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.2em] opacity-80">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {headerAction && <div className="flex justify-start">{headerAction}</div>}
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative group flex-1 sm:flex-initial">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
                 <input 
                   type="text" 
                   value={searchTerm}
                   onChange={handleSearchChange}
                   placeholder={searchPlaceholder} 
                   className="bg-white border border-[#fce4d4] rounded-2xl py-3 pl-12 pr-6 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 w-full sm:w-64 transition-all text-foreground shadow-sm"
                 />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="overflow-x-auto pb-4">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#fce4d4]/20">
              {columns.map((col, idx) => (
                <th key={idx} className={`p-6 text-[11px] font-black tracking-[0.2em] uppercase text-[#8b6b5a] border-b border-[#fce4d4] ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="p-6">
                      <div className="h-5 bg-zinc-100 rounded-xl w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-[#fce4d4]/5 transition-colors group">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`p-6 text-sm font-medium text-foreground ${col.className || ''}`}>
                      {typeof col.accessor === 'function' 
                        ? col.accessor(item) 
                        : (item[col.accessor] as React.ReactNode)
                      }
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-24 text-center">
                   <div className="flex flex-col items-center gap-4 opacity-30">
                     <Search size={40} className="text-[#2d8d9b]" />
                     <p className="text-lg font-black italic tracking-tight text-[#3a525d]">No records found</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Footer */}
      <div className="p-4 md:p-8 border-t border-[#fce4d4] flex flex-col md:flex-row justify-between items-center gap-4 bg-[#fce4d4]/5 transition-colors">
        <span className="text-[10px] md:text-[11px] text-[#8b6b5a] font-black uppercase tracking-[0.2em] text-center md:text-left">
          Showing <span className="text-[#2d8d9b] text-sm md:text-base">{Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)}</span> to <span className="text-[#2d8d9b] text-sm md:text-base">{Math.min(filteredData.length, currentPage * pageSize)}</span> of <span className="text-[#2d8d9b] text-xs md:text-sm font-black">{filteredData.length}</span> entries
        </span>
        <div className="flex gap-2 md:gap-3 w-full md:w-auto">
          <Button 
            variant="secondary" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="flex-1 md:flex-initial px-4 md:px-6 py-2.5 h-auto text-[10px] md:text-[11px] font-black tracking-widest rounded-2xl border-border bg-white group uppercase disabled:opacity-30"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Prev
          </Button>
          <Button 
             variant="secondary" 
             disabled={currentPage === totalPages || totalPages === 0}
             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
             className="flex-1 md:flex-initial px-4 md:px-6 py-2.5 h-auto text-[10px] md:text-[11px] font-black tracking-widest rounded-2xl border-border bg-white group uppercase disabled:opacity-30"
          >
            Next
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
