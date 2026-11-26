'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mail, Send, X } from 'lucide-react';
import toast from '@/components/ui/toast';
import { emailDocument, EmailDocumentRequest } from '@/lib/emailDocument';

type Props = Omit<EmailDocumentRequest, 'to'> & { defaultEmail?: string | null };

/** "Email to Customer" for a document shown on screen: makes a PDF of it and emails it (Brevo). */
export default function EmailDocumentButton({ defaultEmail, ...doc }: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultEmail || '');
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTo(defaultEmail || ''); }, [defaultEmail]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const send = async () => {
    if (!to.trim()) { toast.error('Enter the customer email address'); return; }
    setSending(true);
    const t = toast.loading('Preparing PDF and sending...');
    try {
      const msg = await emailDocument({ ...doc, to: to.trim() });
      toast.success(msg, { id: t });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Email could not be sent', { id: t });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-10 px-4 rounded-xl bg-white border border-[#C82A2B]/40 text-[#C82A2B] hover:bg-[#FFF1F1] text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
      >
        <Mail size={16} /> Email to Customer
      </button>
      {open && (
        <div className="absolute bottom-12 right-0 z-50 w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Send PDF to</p>
            <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer" aria-label="Close">
              <X size={14} />
            </button>
          </div>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder="customer@company.com"
            autoFocus
            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/15"
          />
          {!defaultEmail && <p className="text-[10px] text-amber-700 font-semibold">No email on file for this customer.</p>}
          <button
            type="button"
            disabled={sending}
            onClick={send}
            className="w-full h-9 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={13} /> {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      )}
    </div>
  );
}
