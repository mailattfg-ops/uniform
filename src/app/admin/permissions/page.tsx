'use client';

import React from 'react';
import { Users } from 'lucide-react';

export default function PermissionsPage() {
  return (
    <div className="p-20 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
      <Users className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
      <p className="text-sm font-bold text-zinc-400">Granular Permission Management Coming Soon</p>
    </div>
  );
}
