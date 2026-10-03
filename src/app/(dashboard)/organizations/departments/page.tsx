'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DepartmentRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/customers/departments');
  }, [router]);

  return null;
}
