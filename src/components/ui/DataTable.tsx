'use client';

import React, { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-[3rem] border border-[#fce4d4] dark:border-zinc-800 overflow-hidden shadow-sm transition-all duration-300">
      {/* Table Header Section - Light Themed */}
      {(title || subtitle || searchPlaceholder) && (
        <div className="p-8 border-b border-[#fce4d4] dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fce4d4]/10">
          <div className="space-y-1">
            {title && <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] dark:text-zinc-200">{title}</h3>}
            {subtitle && (
              <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-[0.2em] opacity-80">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="flex gap-3 items-center">
            {headerAction}
            <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d8d9b]/50 group-focus-within:text-[#2d8d9b] transition-colors" size={16} />
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={handleSearchChange}
                 placeholder={searchPlaceholder} 
                 className="bg-white dark:bg-zinc-900 border border-[#fce4d4] dark:border-zinc-800 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 w-72 transition-all text-foreground shadow-sm"
               />
            </div>
            <Button variant="secondary" className="gap-2 text-[10px] rounded-2xl h-11 uppercase font-black tracking-[0.2em] px-6 border border-[#fce4d4] text-[#2d8d9b] bg-white hover:bg-[#fce4d4]">
               <Filter size={14} />
               Filter
            </Button>
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#fce4d4]/20 dark:bg-zinc-900/40">
              {columns.map((col, idx) => (
                <th key={idx} className={`p-6 text-[11px] font-black tracking-[0.2em] uppercase text-[#8b6b5a] dark:text-zinc-500 border-b border-[#fce4d4] dark:border-zinc-800 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="p-6">
                      <div className="h-5 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-[#fce4d4]/5 dark:hover:bg-zinc-900 transition-colors group">
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
      <div className="p-8 border-t border-[#fce4d4] dark:border-zinc-800 flex justify-between items-center bg-[#fce4d4]/5 transition-colors">
        <span className="text-[11px] text-[#8b6b5a] font-black uppercase tracking-[0.2em]">
          Total <span className="text-[#2d8d9b] text-sm">{data.length}</span> entries found
        </span>
        <div className="flex gap-3">
          <Button variant="secondary" className="px-6 py-2.5 h-auto text-[11px] font-black tracking-widest rounded-2xl border-border bg-white group uppercase">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Prev
          </Button>
          <Button variant="secondary" className="px-6 py-2.5 h-auto text-[11px] font-black tracking-widest rounded-2xl border-border bg-white group uppercase">
            Next
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
