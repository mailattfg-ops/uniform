'use client';

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const token = Cookies.get('auth_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthChecking(false);
    }
  }, [router]);

  if (isAuthChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#030303]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#CC9448]/30 border-t-[#CC9448] rounded-full animate-spin shadow-2xl" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#CC9448] opacity-50">Checking Authorization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden relative w-full p-3 lg:p-4 gap-3 lg:gap-4 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 bg-[#F5F4F2] text-[#030303] rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
