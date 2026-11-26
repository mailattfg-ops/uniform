'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, CheckCircle2, Clock, RotateCcw, Send, XCircle } from 'lucide-react';
import api from '@/lib/api';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
  actor_name?: string | null;
  read_at?: string | null;
  created_at: string;
}

const POLL_MS = 30000;

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Icon + colour by outcome
function typeStyle(type: string) {
  if (/approved|accept/.test(type)) return { Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' };
  if (/rejected|reject/.test(type)) return { Icon: XCircle, cls: 'bg-rose-50 text-rose-600' };
  if (/returned|revision|decision/.test(type)) return { Icon: RotateCcw, cls: 'bg-purple-50 text-purple-600' };
  if (/hold/.test(type)) return { Icon: Clock, cls: 'bg-amber-50 text-amber-600' };
  return { Icon: Send, cls: 'bg-[#FFF1F1] text-[#C82A2B]' };
}

interface Props {
  /** sidebar: menu-style row (dark); header: round icon button (mobile top bar) */
  variant?: 'sidebar' | 'header';
  isExpanded?: boolean;
}

export default function NotificationBell({ variant = 'sidebar', isExpanded = true }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnread(res.data?.unread || 0);
    } catch { /* signed out or table not created yet: keep quiet */ }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=20');
      setItems(res.data?.items || []);
      setUnread(res.data?.unread || 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count, and refresh when the tab comes back into view
  useEffect(() => {
    refreshCount();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshCount(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshCount(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, [refreshCount]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const top = Math.min(r.top, window.innerHeight - 480);
      // Sidebar: open beside the collapsed sidebar so it stays put when the sidebar collapses
      setPos(variant === 'sidebar' && window.innerWidth >= 768
        ? { top: Math.max(12, top), left: 96 }
        : { top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen(true);
    loadList();
  };

  const openItem = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.read_at) {
      setItems(list => list.map(x => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread(c => Math.max(0, c - 1));
      api.put(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    setItems(list => list.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setUnread(0);
    api.put('/notifications/read-all').catch(() => {});
  };

  const badge = unread > 99 ? '99+' : String(unread);

  const button = variant === 'sidebar' ? (
    <button
      ref={btnRef}
      type="button"
      onClick={toggle}
      title="Notifications"
      className={`relative flex items-center justify-between p-2.5 rounded-2xl transition-all duration-300 w-full cursor-pointer overflow-hidden ${open ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
    >
      <div className="flex items-center min-w-0">
        <div className="relative shrink-0 w-7 h-7 flex items-center justify-center">
          <Bell size={19} strokeWidth={2} />
          {unread > 0 && !isExpanded && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#C82A2B] text-white text-[9px] font-black flex items-center justify-center">{badge}</span>
          )}
        </div>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${isExpanded ? 'opacity-100 max-w-[160px] ml-3' : 'opacity-0 max-w-0 ml-0 pointer-events-none'}`}>
          <span className="text-[13.5px] font-semibold tracking-wide">Notifications</span>
        </div>
      </div>
      {unread > 0 && isExpanded && (
        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#C82A2B] text-white text-[10px] font-black flex items-center justify-center">{badge}</span>
      )}
    </button>
  ) : (
    <button
      ref={btnRef}
      type="button"
      onClick={toggle}
      title="Notifications"
      className="relative p-3 rounded-2xl bg-white shadow-xl shadow-zinc-200/50 border border-zinc-100 text-zinc-700 hover:bg-[#C82A2B] hover:text-white transition-all active:scale-90 cursor-pointer"
    >
      <Bell size={20} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C82A2B] text-white text-[9px] font-black flex items-center justify-center border-2 border-white">{badge}</span>
      )}
    </button>
  );

  const panel = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={panelRef}
      style={{ top: pos.top, left: pos.left, right: pos.right }}
      className="fixed z-[200] w-[min(92vw,380px)] max-h-[460px] flex flex-col bg-white text-zinc-900 rounded-3xl border border-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden animate-in fade-in duration-150"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-[#C82A2B]" />
          <p className="text-xs font-black uppercase tracking-widest">Notifications</p>
          {unread > 0 && <span className="px-1.5 py-0.5 rounded-md bg-[#FFF1F1] text-[#9E1B1D] text-[10px] font-black">{unread} new</span>}
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAll} className="text-[10px] font-black uppercase tracking-wider text-[#C82A2B] hover:underline inline-flex items-center gap-1 cursor-pointer">
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {loading && items.length === 0 ? (
          <p className="p-6 text-center text-xs font-bold text-zinc-400">Loading...</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <Bell size={22} className="mx-auto text-zinc-300" />
            <p className="text-xs font-bold text-zinc-500">No notifications yet</p>
            <p className="text-[10px] text-zinc-400">Approvals and quote updates for you will show here.</p>
          </div>
        ) : items.map(n => {
          const { Icon, cls } = typeStyle(n.type);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => openItem(n)}
              className={`w-full text-left px-4 py-3 flex gap-3 transition-colors cursor-pointer ${n.read_at ? 'bg-white hover:bg-zinc-50' : 'bg-[#FFF8F8] hover:bg-[#FFF1F1]'}`}
            >
              <span className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}><Icon size={15} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className={`text-xs leading-snug ${n.read_at ? 'font-semibold text-zinc-700' : 'font-black text-zinc-900'}`}>{n.title}</span>
                  {!n.read_at && <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-[#C82A2B]" aria-label="Unread" />}
                </span>
                {n.message && <span className="block mt-0.5 text-[11px] text-zinc-500 leading-snug line-clamp-2">{n.message}</span>}
                <span className="block mt-1 text-[10px] font-semibold text-zinc-400">{timeAgo(n.created_at)}{n.actor_name ? ` · ${n.actor_name}` : ''}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {button}
      {panel}
    </>
  );
}
