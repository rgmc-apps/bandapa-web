"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Announcement, Band, Event, Profile } from "@/lib/types";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function DashboardHomePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Announcement | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, announcementsRes, eventsRes, membershipRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(5),
      supabase.from("events").select("*").order("start_time"),
      supabase.from("band_members").select("band:bands(*)").eq("user_id", user.id),
    ]);

    setProfile(profileRes.data);
    setAnnouncements(announcementsRes.data ?? []);
    setTodayEvents((eventsRes.data ?? []).filter((e) => isToday(e.start_time)));
    setBands((membershipRes.data ?? []).map((r) => r.band).filter(Boolean) as unknown as Band[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("home-announcements")
      .on("postgres_changes", { event: "INSERT", schema: "bandapa-main", table: "announcements" }, (payload) => {
        const row = payload.new as Announcement;
        if (row.is_active) {
          setToast(row);
          setAnnouncements((prev) => [row, ...prev].slice(0, 5));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  if (loading || !profile) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>;
  }

  return (
    <div className="p-6 md:p-8 page-enter max-w-2xl relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm card p-4 flex gap-3 animate-fade-in-up shadow-modal">
          <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: "20px" }}>campaign</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-obsidian truncate">{toast.title}</p>
            <p className="text-xs text-on-surface-variant line-clamp-2">{toast.body}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-on-surface-variant hover:text-obsidian">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
          </button>
        </div>
      )}

      <p className="font-mono text-xs text-primary uppercase tracking-[0.15em] mb-2">{greeting()}</p>
      <h1 className="font-headline font-bold text-3xl text-obsidian mb-8">{profile.full_name || profile.username}</h1>

      {announcements.length > 0 && (
        <div className="mb-6">
          <h2 className="font-headline font-semibold text-sm text-obsidian mb-3">Announcements</h2>
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="card p-4">
                <p className="text-sm font-semibold text-obsidian">{a.title}</p>
                <p className="text-sm text-on-surface-variant mt-0.5">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-headline font-semibold text-sm text-obsidian mb-3">Today&apos;s events</h2>
        {todayEvents.length === 0 ? (
          <div className="card py-8 text-center text-sm text-on-surface-variant">Nothing scheduled today.</div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((e) => (
              <div key={e.id} className="card p-4 flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${e.band_id ? "bg-status-upcoming" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-obsidian truncate">{e.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {e.is_all_day ? "All day" : new Date(e.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-headline font-semibold text-sm text-obsidian mb-3">My bands</h2>
        {bands.length === 0 ? (
          <Link href="/dashboard/bands" className="card py-8 flex items-center justify-center text-sm text-primary hover:bg-surface-mist/40 transition-colors">
            Join or create a band →
          </Link>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bands.map((b) => (
              <Link key={b.id} href={`/dashboard/bands/${b.id}`} className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-outline-variant/50 hover:border-chlorophyll transition-colors">
                <span className="text-sm font-medium text-obsidian">{b.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
