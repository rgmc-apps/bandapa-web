"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  image_url: string | null;
};

type ConflictRow = {
  id: string;
  status: string;
  created_at: string;
  band_event: {
    id: string;
    title: string;
    start_time: string;
    band: { name: string } | null;
  } | null;
  personal_event: { id: string; title: string } | null;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SEEN_KEY = "bandapa_seen_notifs";

function readSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function writeSeenIds(ids: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch {}
}

export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const total = conflicts.length + announcements.length;
  const unseen = [...conflicts, ...announcements].filter(item => !seenIds.has(item.id)).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const [annRes, conRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, body, created_at, image_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("conflicts")
        .select(`
          id, status, created_at,
          band_event:band_event_id(id, title, start_time, band:band_id(name)),
          personal_event:personal_event_id(id, title)
        `)
        .neq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setAnnouncements(annRes.data ?? []);
    setConflicts((conRes.data ?? []) as unknown as ConflictRow[]);
    setLoading(false);
  }, [supabase]);

  // Load seen IDs from localStorage on mount
  useEffect(() => {
    setMounted(true);
    setSeenIds(readSeenIds());
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark all loaded notifications as seen whenever the panel is open
  useEffect(() => {
    if (!open || (conflicts.length === 0 && announcements.length === 0)) return;
    const allIds = [...conflicts.map(c => c.id), ...announcements.map(a => a.id)];
    const updated = new Set([...readSeenIds(), ...allIds]);
    writeSeenIds(updated);
    setSeenIds(updated);
  }, [open, conflicts, announcements]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    fetchNotifications();
  }

  if (!mounted) return null;

  return (
    <>
      {/* Bell trigger */}
      <button
        aria-label="Notifications"
        onClick={handleOpen}
        className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
          dark
            ? "hover:bg-white/10 text-pure-white/65 hover:text-pure-white"
            : "hover:bg-surface-mist text-on-surface-variant hover:text-obsidian"
        }`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
          notifications
        </span>
        {unseen > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-error text-white rounded-full text-[9px] font-mono flex items-center justify-center px-0.5 leading-none">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {/* Backdrop + panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div
            ref={panelRef}
            className="w-[340px] max-w-[90vw] h-full bg-white border-l border-outline-variant shadow-2xl flex flex-col animate-slide-in-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>
                  notifications
                </span>
                <h2 className="font-headline font-semibold text-obsidian text-base">Notifications</h2>
                {total > 0 && (
                  <span className="text-xs font-mono px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                    {total}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-mist text-on-surface-variant hover:text-obsidian transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-5 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[72px] bg-surface-mist rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : total === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-8 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-mist flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: "28px" }}>
                      notifications_none
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant font-medium">All clear</p>
                  <p className="text-xs text-on-surface-variant/60">No pending conflicts or announcements.</p>
                </div>
              ) : (
                <div className="p-4 space-y-5">
                  {/* Conflicts */}
                  {conflicts.length > 0 && (
                    <section>
                      <p className="text-[10px] font-mono font-semibold text-on-surface-variant/50 uppercase tracking-[0.08em] mb-2.5 px-1">
                        Schedule Conflicts · {conflicts.length}
                      </p>
                      <div className="space-y-2">
                        {conflicts.map((c) => (
                          <Link
                            key={c.id}
                            href="/dashboard/conflicts"
                            onClick={() => setOpen(false)}
                            className="flex items-start gap-3 p-3.5 rounded-xl border border-error/20 bg-error/5 hover:bg-error/10 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-error/15 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="material-symbols-outlined text-error" style={{ fontSize: "16px" }}>warning</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className="text-sm font-semibold text-obsidian truncate">
                                  {c.band_event?.band?.name ?? "Band event"}
                                </p>
                                <span className="text-[10px] font-mono text-on-surface-variant/50 shrink-0">
                                  {timeAgo(c.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant truncate">
                                {c.band_event?.title ?? "Event"} conflicts with {c.personal_event?.title ?? "personal event"}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      {conflicts.length >= 10 && (
                        <Link
                          href="/dashboard/conflicts"
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-center gap-1.5 mt-2 py-2 text-xs font-mono text-primary hover:text-primary/70 transition-colors"
                        >
                          View all conflicts
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_forward</span>
                        </Link>
                      )}
                    </section>
                  )}

                  {/* Announcements */}
                  {announcements.length > 0 && (
                    <section>
                      <p className="text-[10px] font-mono font-semibold text-on-surface-variant/50 uppercase tracking-[0.08em] mb-2.5 px-1">
                        Announcements · {announcements.length}
                      </p>
                      <div className="space-y-2">
                        {announcements.map((a) => (
                          <div
                            key={a.id}
                            className="p-3.5 rounded-xl border border-outline-variant bg-surface-mist/40"
                          >
                            {a.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.image_url}
                                alt=""
                                className="w-full h-24 object-cover rounded-lg mb-3"
                              />
                            )}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-obsidian leading-tight">{a.title}</p>
                              <span className="text-[10px] font-mono text-on-surface-variant/50 shrink-0 mt-0.5">
                                {timeAgo(a.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{a.body}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-outline-variant shrink-0">
              <Link
                href="/dashboard/conflicts"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-surface-mist hover:bg-surface-mist/80 transition-colors text-sm font-medium text-on-surface-variant"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>calendar_view_month</span>
                View all conflicts
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
