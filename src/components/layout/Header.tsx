'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Bell, Search, User, Settings, LogOut, ChevronDown, UserCircle } from 'lucide-react';
import Link from 'next/link';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-background/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between transition-colors">
      {/* Left: Search */}
      <div className="max-w-md w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input 
          type="text" 
          placeholder="Global search..." 
          className="w-full bg-muted/50 dark:bg-zinc-800/50 border-none rounded-2xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium text-foreground"
        />
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="p-2 h-auto rounded-full relative hover:bg-muted/50 transition-all">
          <Bell size={22} className="text-muted-foreground hover:text-primary transition-colors" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-background" />
        </Button>
        
        <div className="h-8 w-[1px] bg-border mx-1" />
        
        {/* <ThemeToggle /> */}

        {/* User Dropdown */}
        <div className="relative ml-2" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-[2rem] bg-white dark:bg-zinc-800 shadow-sm border border-border hover:shadow-md transition-all active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                alt="user" 
                className="w-full h-full object-cover"
              />
            </div>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-4 w-64 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-3 animate-in fade-in slide-in-from-top-4 duration-300 scale-100 origin-top-right z-50 overflow-hidden">
               <div className="px-5 py-4 border-b border-zinc-50 dark:border-zinc-800 mb-2">
                 <p className="text-sm font-black text-foreground">John Doe</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Administrator</p>
               </div>
               
               <div className="space-y-1">
                 <Link 
                   href="/profile" 
                   className="flex items-center gap-4 px-5 py-3 rounded-2xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-[#fce4d4] hover:text-[#2d8d9b] dark:hover:bg-zinc-800 transition-all group"
                 >
                   <User size={18} className="text-zinc-400 group-hover:text-[#2d8d9b]" />
                   My Profile
                 </Link>
                 <Link 
                   href="/settings" 
                   className="flex items-center gap-4 px-5 py-3 rounded-2xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-[#fce4d4] hover:text-[#2d8d9b] dark:hover:bg-zinc-800 transition-all group"
                 >
                   <Settings size={18} className="text-zinc-400 group-hover:text-[#2d8d9b]" />
                   Settings
                 </Link>
                 <div className="h-[1px] bg-zinc-50 dark:bg-zinc-800 my-2 mx-5" />
                 <button 
                   className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-xs font-black text-error hover:bg-error/5 transition-all group"
                 >
                   <LogOut size={18} />
                   Log out
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
