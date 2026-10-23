'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F5F4F2] gap-4">
      <Loader2 className="animate-spin text-[#CC9448]" size={42} />
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
        Loading Forma Apparels ERP...
      </p>
    </div>
  );
}
