'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';

interface UnauthorizedAccessProps {
  userRole?: string;
  userEmail?: string;
  requiredPermissions?: string[];
  pathname?: string;
}

export const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
  userRole = 'User',
  userEmail,
  requiredPermissions = [],
  pathname
}) => {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Shield Icon Badge with Glow */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl" />
          <div className="w-20 h-20 bg-gradient-to-tr from-[#1c1a17] to-[#2d2720] border-2 border-[#CC9448] rounded-2xl flex items-center justify-center shadow-lg relative z-10">
            <ShieldAlert className="w-10 h-10 text-[#CC9448]" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-full text-xs font-bold tracking-wider uppercase">
            <Lock size={12} /> 403 Access Denied
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Unauthorized Access
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
            You do not have the required administrative permissions to access this screen.
          </p>
        </div>

        {/* Access Diagnostics Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-semibold text-slate-500">Your Current Role:</span>
            <span className="font-bold px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-md">
              {userRole}
            </span>
          </div>

          {userEmail && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-500">Logged in as:</span>
              <span className="font-mono text-slate-700">{userEmail}</span>
            </div>
          )}

          {pathname && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-500">Attempted Route:</span>
              <span className="font-mono text-slate-700">{pathname}</span>
            </div>
          )}

          {requiredPermissions.length > 0 && (
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-1">
              <span className="font-semibold text-slate-500">Required Capability:</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {requiredPermissions.map(p => (
                  <span key={p} className="px-2 py-0.5 bg-[#CC9448]/15 text-[#885c22] border border-[#CC9448]/30 rounded font-mono text-[11px] font-semibold">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
          >
            <ArrowLeft size={16} /> Go Back
          </button>

          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#CC9448] hover:bg-[#b8823b] text-white font-bold rounded-xl text-sm transition shadow-md shadow-[#CC9448]/25"
          >
            <Home size={16} /> Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
};
