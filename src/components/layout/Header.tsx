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
    <header className="h-24 bg-transparent sticky top-0 z-40 px-6 lg:px-10 flex items-center justify-between border-b border-zinc-200/20 transition-all duration-300">
      {/* Left: Mobile Toggle & Breadcrumbs/Title */}
      <div className="flex items-center gap-6">
        <Button
          onClick={toggleSidebar}
          variant="secondary"
          className="p-3 rounded-2xl bg-white shadow-xl shadow-zinc-200/50 border border-zinc-100 hover:bg-[#CC9448] hover:text-white transition-all lg:hidden active:scale-90"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>

        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#CC9448] animate-pulse shadow-[0_0_8px_#CC9448]" />
            <h1 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#030303]">Forma Apparels Enterprise</h1>
          </div>
        </div>
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-6">
        <div className="h-6 w-[1px] bg-zinc-200 hidden sm:block" />

        {/* User Dropdown */}
        <div className="relative" ref={menuRef}>
          <Button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            variant="secondary"
            className="flex items-center gap-3 p-1.5 pr-4 rounded-[1.5rem] bg-white shadow-sm border border-zinc-100 hover:shadow-xl hover:border-[#CC9448]/20 transition-all active:scale-95 group h-auto"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-[#CC9448]/10 group-hover:border-[#CC9448]/40 transition-all shadow-inner flex items-center justify-center bg-zinc-50 font-black text-[#CC9448]">
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
              <p className="text-[10px] font-black text-[#030303] leading-none mb-1">{userName}</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{userRole}</p>
              </div>
            </div>
            <ChevronDown size={12} className={`text-[#030303] transition-transform duration-500 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </Button>

          {/* Premium Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-100 p-2 animate-in fade-in slide-in-from-top-4 duration-300 scale-100 origin-top-right z-50 overflow-hidden">
              <div className="p-2 space-y-1">
                <Button
                  onClick={handleLogout}
                  className="w-full mt-2 flex items-center gap-4 px-5 py-4 rounded-xl text-xs hover:text-sm font-black text-white bg-[#030303] hover:bg-[#CC9448] transition-all shadow-lg hover:shadow-[#CC9448]/20 group border-none h-auto"
                >
                  <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                  Secure Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
