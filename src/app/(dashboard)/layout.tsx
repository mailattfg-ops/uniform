'use client';

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden relative w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative w-full">
        <Header />
        <div className="flex-1 bg-white rounded-tl-[2rem] lg:rounded-tl-[4.5rem] p-6 pb-32 lg:p-12 overflow-y-auto no-scrollbar shadow-[inset_0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-500 w-full max-w-full">
          <div className="w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
