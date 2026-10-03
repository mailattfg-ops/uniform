'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DesignCatalogRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/design-numbers?type=DNG');
  }, [router]);

  return (
    <div className="p-12 text-center text-zinc-400 font-bold">
      Redirecting to unified Design Numbers Catalog...
    </div>
  );
}
