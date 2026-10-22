'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ProductDetailsRoute() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/admin/products?product=${params.id}`);
    } else {
      router.replace('/admin/products');
    }
  }, [router, params]);

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-8 h-8 border-3 border-[#2d8d9b] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
