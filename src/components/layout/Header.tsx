'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Bell, User, Settings, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useLayout } from '@/hooks/useLayout';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export const Header: React.FC = () => {
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Administrator');
  const [userRole, setUserRole] = useState('System Admin');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadUser = () => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUserName(user.fullName || user.email || 'Administrator');
        setUserRole(user.role || 'User');
        setAvatarUrl(user.avatar_url || null);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener('storage', loadUser);
    return () => window.removeEventListener('storage', loadUser);
  }, []);

  const handleLogout = () => {
    Cookies.remove('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
    setTimeout(() => {
        window.location.reload();
    }, 100);
  };

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
    <header className="h-24 bg-white/70 backdrop-blur-xl sticky top-0 z-40 px-6 lg:px-10 flex items-center justify-between border-b border-zinc-100/50 shadow-sm transition-all duration-300">
      {/* Left: Mobile Toggle & Breadcrumbs/Title */}
      <div className="flex items-center gap-6">
        <button 
          onClick={toggleSidebar}
          className="p-3 rounded-2xl bg-white shadow-xl shadow-zinc-200/50 border border-zinc-100 hover:bg-[#3a525d] hover:text-white transition-all lg:hidden active:scale-90"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-[#f2994a] animate-pulse" />
             <h1 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3a525d]">Inland Uniform Enterprise</h1>
          </div>
          {/* <p className="text-[9px] font-bold text-[#2d8d9b] opacity-60 ml-4 font-mono">STABLE // REV 2.4.0</p> */}
        </div>
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2">
            <div className="p-2 space-y-1">
                <div className="w-12 h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-[#2d8d9b]" />
                </div>
                <p className="text-[8px] font-black text-zinc-400 text-right uppercase tracking-tighter">System Load</p>
            </div>
        </div>

        {/* <Button variant="ghost" className="p-2.5 h-auto rounded-2xl relative hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-zinc-100">
          <Bell size={20} className="text-[#3a525d]" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#f2994a] rounded-full border-2 border-white ring-2 ring-[#f2994a]/20" />
        </Button> */}
        
        <div className="h-6 w-[1px] bg-zinc-200 hidden sm:block" />

        {/* User Dropdown */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-[1.5rem] bg-white shadow-sm border border-zinc-100 hover:shadow-xl hover:border-[#2d8d9b]/20 transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-[#2d8d9b]/10 group-hover:border-[#2d8d9b]/40 transition-all shadow-inner flex items-center justify-center bg-zinc-50 font-black text-[#2d8d9b]">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="user" 
                  className="w-full h-full object-cover"
                />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="hidden lg:flex flex-col items-start">
                <p className="text-[10px] font-black text-[#3a525d] leading-none mb-1">{userName}</p>
                <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{userRole}</p>
                </div>
            </div>
            <ChevronDown size={12} className={`text-[#3a525d] transition-transform duration-500 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Premium Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-100 p-2 animate-in fade-in slide-in-from-top-4 duration-300 scale-100 origin-top-right z-50 overflow-hidden">
               {/* <div className="px-6 py-6 bg-zinc-50/50 rounded-[1.5rem] mb-2">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-zinc-100 font-black text-[#2d8d9b] text-xl">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          userName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-black text-[#3a525d] leading-none mb-1">{userName}</p>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">{userRole}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-zinc-200 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-green-500" />
                    </div>
                    <span className="text-[9px] font-black text-green-600 uppercase">Live Account</span>
                 </div>
               </div> */}
               
               <div className="p-2 space-y-1">
                 {/* <Link 
                   href="/profile" 
                   className="flex items-center gap-4 px-5 py-4 rounded-xl text-xs font-bold text-zinc-600 hover:bg-[#2d8d9b] hover:text-white transition-all group"
                 >
                   <User size={18} className="text-zinc-400 group-hover:text-white/70" />
                   Security Profile
                 </Link>
                 <Link 
                   href="/settings" 
                   className="flex items-center gap-4 px-5 py-4 rounded-xl text-xs font-bold text-zinc-600 hover:bg-[#2d8d9b] hover:text-white transition-all group"
                 >
                   <Settings size={18} className="text-zinc-400 group-hover:text-white/70" />
                   System Config
                 </Link> */}
                 <button 
                   onClick={handleLogout}
                   className="w-full mt-2 flex items-center gap-4 px-5 py-4 rounded-xl text-xs hover:text-sm font-black text-white bg-[#3a525d] hover:bg-[#3a525e] transition-all shadow-lg hover:shadow-error/20 group"
                 >
                   <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                   Secure Logout
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
