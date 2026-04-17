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
      <div className="flex h-screen w-full items-center justify-center bg-[#516d7a]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#6fa1ac]/30 border-t-[#fce4d4] rounded-full animate-spin shadow-2xl" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white opacity-50">Checking Authorization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative w-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 bg-white">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scrollbar-hide">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
