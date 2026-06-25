"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Band, Event, Venue } from "@/lib/types";
import { detectPersonalEventConflicts, detectBandEventConflicts, type MemberConflictRow } from "@/lib/conflicts";
import Modal from "@/components/Modal";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEKDAY_LABELS = ["S","M","T","W","T","F","S"];
const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const BAND_COLORS = [
  { accent: "#ea580c", bg: "#fff7ed", text: "#7c2d12" },
  { accent: "#7c3aed", bg: "#f5f3ff", text: "#3b0764" },
  { accent: "#db2777", bg: "#fdf2f8", text: "#831843" },
  { accent: "#0891b2", bg: "#ecfeff", text: "#164e63" },
  { accent: "#dc2626", bg: "#fef2f2", text: "#7f1d1d" },
  { accent: "#2563eb", bg: "#eff6ff", text: "#1e3a8a" },
  { accent: "#d97706", bg: "#fffbeb", text: "#78350f" },
  { accent: "#9333ea", bg: "#faf5ff", text: "#581c87" },
];
const PERSONAL_COLOR = { accent: "#16a34a", bg: "#f0fdf4", text: "#14532d" };

type ViewMode = "month" | "week" | "day";
type EventColor = typeof PERSONAL_COLOR;

type EventForm = {
  title: string; is_all_day: boolean;
  start_date: string; end_date: string;
  start_time: string; end_time: string;
  band_id: string; venue_id: string; location: string; description: string;
};
const emptyForm: EventForm = {
  title: "", is_all_day: false,
  start_date: "", end_date: "",
  start_time: "18:00", end_time: "20:00",
  band_id: "", venue_id: "", location: "", description: "",
};

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstOfMonth.getDay(); i++) cells.push(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}
function eventTopPx(e: Event) {
  const d = new Date(e.start_time);
  return (d.getHours() + d.getMinutes() / 60) * HOUR_HEIGHT;
}
function eventHeightPx(e: Event) {
  const diff = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000;
  return Math.max(diff * HOUR_HEIGHT, HOUR_HEIGHT * 0.45);
}

export default function CalendarPage() {
  const supabase = createClient();
  const today = new Date();

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [now, setNow] = useState(new Date());

  const [events, setEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [conflictWarnings, setConflictWarnings] = useState<Event[]>([]);
  const [memberConflicts, setMemberConflicts] = useState<MemberConflictRow[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const conflictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  const bandColorMap = useMemo(
    () => new Map(bands.map((b, i) => [b.id, BAND_COLORS[i % BAND_COLORS.length]])),
    [bands]
  );
  function getEventColor(ev: Event): EventColor {
    if (ev.band_id) return bandColorMap.get(ev.band_id) ?? PERSONAL_COLOR;
    return PERSONAL_COLOR;
  }

  const fetchRange = useMemo(() => {
    if (viewMode === "month") {
      return { start: new Date(viewYear, viewMonth, 1).toISOString(), end: new Date(viewYear, viewMonth + 1, 1).toISOString() };
    }
    if (viewMode === "week") {
      return { start: weekStart.toISOString(), end: new Date(weekStart.getTime() + 7 * 86400000).toISOString() };
    }
    const s = new Date(selectedDate); s.setHours(0, 0, 0, 0);
    const e = new Date(selectedDate); e.setHours(23, 59, 59, 999);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [viewMode, viewYear, viewMonth, weekStart, selectedDate]);

  const fetchEvents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: memberRows } = await supabase.from("band_members").select("band:bands(*)").eq("user_id", user.id);
    setBands((memberRows ?? []).map((r) => r.band).filter(Boolean) as unknown as Band[]);
    const { data: venueRows } = await supabase.from("venues").select("*").order("name");
    setVenues(venueRows ?? []);
    const { data: eventRows } = await supabase
      .from("events").select("*")
      .lt("start_time", fetchRange.end)
      .gte("end_time", fetchRange.start)
      .order("start_time");
    setEvents(eventRows ?? []);
  }, [supabase, fetchRange]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if ((viewMode === "week" || viewMode === "day") && timeGridRef.current) {
      setTimeout(() => { if (timeGridRef.current) timeGridRef.current.scrollTop = 8 * HOUR_HEIGHT; }, 60);
    }
  }, [viewMode]);

  // ── Real-time conflict check while filling the form ───────────────────────────
  useEffect(() => {
    if (!addOpen || !form.start_date || !form.end_date) {
      setConflictWarnings([]);
      setMemberConflicts([]);
      return;
    }

    if (conflictTimer.current) clearTimeout(conflictTimer.current);
    conflictTimer.current = setTimeout(async () => {
      const startISO = form.is_all_day
        ? `${form.start_date}T00:00:00`
        : `${form.start_date}T${form.start_time}:00`;
      const endISO = form.is_all_day
        ? `${form.end_date}T23:59:59`
        : `${form.end_date}T${form.end_time}:00`;

      if (new Date(endISO) <= new Date(startISO)) {
        setConflictWarnings([]);
        setMemberConflicts([]);
        return;
      }

      setCheckingConflicts(true);

      let data: Event[] | null = null;

      if (form.band_id) {
        // Band event: check for other events already booked for this band
        const res = await supabase
          .from("events")
          .select("id, title, start_time, end_time, band_id, is_all_day")
          .eq("band_id", form.band_id)
          .lt("start_time", endISO)
          .gt("end_time", startISO)
          .limit(5);
        data = res.data as Event[] | null;

        // Check member conflicts (personal events + cross-band events)
        const { data: memberRows } = await supabase.rpc("find_band_event_conflicts", {
          p_band_id: form.band_id,
          p_start: startISO,
          p_end: endISO,
          p_exclude_event_id: "00000000-0000-0000-0000-000000000000",
        });
        setMemberConflicts((memberRows ?? []) as MemberConflictRow[]);
      } else if (bands.length > 0) {
        // Personal event: check for band events the user is a member of
        const res = await supabase
          .from("events")
          .select("id, title, start_time, end_time, band_id, is_all_day")
          .not("band_id", "is", null)
          .in("band_id", bands.map((b) => b.id))
          .lt("start_time", endISO)
          .gt("end_time", startISO)
          .limit(5);
        data = res.data as Event[] | null;
        setMemberConflicts([]);
      } else {
        setMemberConflicts([]);
      }

      setConflictWarnings(data ?? []);
      setCheckingConflicts(false);
    }, 350);

    return () => { if (conflictTimer.current) clearTimeout(conflictTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_date, form.end_date, form.start_time, form.end_time, form.is_all_day, form.band_id, addOpen]);

  // ── View Transitions wrapper ─────────────────────────────────────────────────
  function withVT(fn: () => void) {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof document === "undefined" || !("startViewTransition" in document) || reduced) { fn(); return; }
    (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(fn);
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function prevPeriod() {
    withVT(() => {
      if (viewMode === "month") { const m = viewMonth === 0 ? 11 : viewMonth - 1; setViewMonth(m); setViewYear(viewMonth === 0 ? viewYear - 1 : viewYear); }
      else if (viewMode === "week") setWeekStart(p => new Date(p.getTime() - 7 * 86400000));
      else setSelectedDate(p => { const d = new Date(p); d.setDate(d.getDate() - 1); return d; });
    });
  }
  function nextPeriod() {
    withVT(() => {
      if (viewMode === "month") { const m = viewMonth === 11 ? 0 : viewMonth + 1; setViewMonth(m); setViewYear(viewMonth === 11 ? viewYear + 1 : viewYear); }
      else if (viewMode === "week") setWeekStart(p => new Date(p.getTime() + 7 * 86400000));
      else setSelectedDate(p => { const d = new Date(p); d.setDate(d.getDate() + 1); return d; });
    });
  }
  function goToday() {
    const t = new Date();
    setSelectedDate(t); setViewMonth(t.getMonth()); setViewYear(t.getFullYear()); setWeekStart(getWeekStart(t));
  }
  function switchView(mode: ViewMode) {
    withVT(() => {
      setViewMode(mode);
      if (mode === "week") setWeekStart(getWeekStart(selectedDate));
    });
  }
  function getPeriodLabel() {
    if (viewMode === "month") return `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    if (viewMode === "week") {
      const end = new Date(weekStart.getTime() + 6 * 86400000);
      return `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  // ── Data helpers ─────────────────────────────────────────────────────────────
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const startDay = new Date(e.start_time); startDay.setHours(0, 0, 0, 0);
      const endDay   = new Date(e.end_time);   endDay.setHours(0, 0, 0, 0);
      for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(new Date(d));
        map.set(key, [...(map.get(key) ?? []), e]);
      }
    }
    return map;
  }, [events]);

  const bandById = useMemo(() => new Map(bands.map((b) => [b.id, b])), [bands]);
  const venueById = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);
  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)), [weekStart]);
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const todayKey = toDateKey(today);

  function getDayEvents(date: Date) { return eventsByDay.get(toDateKey(date)) ?? []; }

  // ── Create event ─────────────────────────────────────────────────────────────
  function openAdd() {
    const dateKey = toDateKey(selectedDate);
    setForm({ ...emptyForm, start_date: dateKey, end_date: dateKey });
    setError(""); setConflictWarnings([]); setMemberConflicts([]); setAddOpen(true);
  }

  async function handleCreateEvent() {
    if (!form.title.trim() || !userId) return;
    setSaving(true); setError("");
    if (!form.start_date || !form.end_date) { setError("Please select a date."); setSaving(false); return; }
    if (form.end_date < form.start_date) { setError("End date must be on or after start date."); setSaving(false); return; }
    if (!form.is_all_day && form.start_date === form.end_date && form.end_time <= form.start_time) {
      setError("End time must be after start time."); setSaving(false); return;
    }
    const start = form.is_all_day ? `${form.start_date}T00:00:00` : `${form.start_date}T${form.start_time}:00`;
    const end   = form.is_all_day ? `${form.end_date}T23:59:59`   : `${form.end_date}T${form.end_time}:00`;
    const isMultiDay = form.start_date !== form.end_date;
    const { data: created, error: err } = await supabase.from("events").insert({
      title: form.title.trim(), event_type: form.band_id ? "band_rehearsal" : "personal",
      owner_id: userId, band_id: form.band_id || null, venue_id: form.venue_id || null,
      start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(),
      is_all_day: form.is_all_day || isMultiDay, location: form.location || null, description: form.description || null,
    }).select("*").single();
    if (err || !created) { setError(err?.message ?? "Failed to create event."); setSaving(false); return; }
    if (!form.band_id) {
      await detectPersonalEventConflicts(supabase, userId, created as Event);
    } else {
      await detectBandEventConflicts(supabase, created as Event);
    }
    setAddOpen(false); setSaving(false); fetchEvents();
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setDetailEvent(null); fetchEvents();
  }

  // ── Time grid (shared by week + day) ─────────────────────────────────────────
  function renderTimeGrid(days: Date[]) {
    return (
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="flex border-b border-outline-variant/30">
          <div className="w-14 shrink-0" />
          {days.map((day, i) => {
            const isToday = toDateKey(day) === todayKey;
            return (
              <div key={i} className={`flex-1 text-center py-2.5 border-l border-outline-variant/20 ${isToday ? "bg-primary/5" : ""}`}>
                <p className="text-xs font-mono text-on-surface-variant">{WEEKDAY_SHORT[day.getDay()]}</p>
                <button
                  onClick={() => { setSelectedDate(day); switchView("day"); }}
                  className={`text-lg font-headline font-bold w-9 h-9 rounded-full mx-auto flex items-center justify-center transition-colors ${isToday ? "bg-primary text-white" : "text-obsidian hover:bg-surface-mist"}`}
                >
                  {day.getDate()}
                </button>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        {days.some(d => getDayEvents(d).some(e => e.is_all_day)) && (
          <div className="flex border-b border-outline-variant/30 min-h-[28px]">
            <div className="w-14 shrink-0 flex items-center justify-end pr-2">
              <span className="text-[10px] font-mono text-on-surface-variant leading-none">all<br/>day</span>
            </div>
            {days.map((day, i) => (
              <div key={i} className="flex-1 border-l border-outline-variant/20 p-1 space-y-0.5">
                {getDayEvents(day).filter(e => e.is_all_day).map(ev => {
                  const c = getEventColor(ev);
                  const isBand = !!ev.band_id;
                  return (
                    <button key={ev.id} onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                      className="w-full text-left rounded-md px-1.5 py-0.5 text-xs font-semibold truncate transition-[filter] hover:brightness-90"
                      style={{ background: isBand ? c.accent : c.bg, color: isBand ? "#fff" : c.text }}>
                      {ev.title}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Scrollable time grid */}
        <div ref={timeGridRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)", minHeight: "420px" }}>
          <div className="flex relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {/* Hour labels */}
            <div className="w-14 shrink-0 relative select-none">
              {HOURS.map(h => (
                <div key={h} className="absolute w-full flex justify-end pr-2" style={{ top: `${h * HOUR_HEIGHT - 9}px` }}>
                  {h > 0 && <span className="text-[10px] font-mono text-on-surface-variant">{formatHour(h)}</span>}
                </div>
              ))}
              {/* Floating now time label */}
              <div className="absolute w-full flex justify-end pr-2 z-20 pointer-events-none" style={{ top: `${nowTop - 9}px` }}>
                <span className="text-[10px] font-mono font-bold text-red-500 bg-background px-0.5">
                  {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Day columns */}
            {days.map((day, i) => {
              const isToday = toDateKey(day) === todayKey;
              const timedEvents = getDayEvents(day).filter(e => !e.is_all_day);
              return (
                <div
                  key={i}
                  className={`flex-1 relative border-l border-outline-variant/20 cursor-pointer ${isToday ? "bg-primary/[0.022]" : ""}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scrollTop = timeGridRef.current?.scrollTop ?? 0;
                    const yPx = e.clientY - rect.top + scrollTop;
                    const hour = Math.max(0, Math.min(23, Math.floor(yPx / HOUR_HEIGHT)));
                    const half = (yPx % HOUR_HEIGHT) >= HOUR_HEIGHT / 2;
                    const sm = half ? 30 : 0;
                    const eh = sm === 30 ? Math.min(23, hour + 1) : hour;
                    const em = sm === 30 ? 0 : 30;
                    const st = `${String(hour).padStart(2,"0")}:${String(sm).padStart(2,"0")}`;
                    const et = `${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}`;
                    const dateKey = toDateKey(day);
                    setForm({ ...emptyForm, start_date: dateKey, end_date: dateKey, start_time: st, end_time: et });
                    setError(""); setConflictWarnings([]); setMemberConflicts([]); setAddOpen(true);
                  }}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div key={h} className={`absolute w-full border-t ${h % 6 === 0 ? "border-outline-variant/40" : "border-outline-variant/15"}`}
                      style={{ top: `${h * HOUR_HEIGHT}px` }} />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.map(h => (
                    <div key={`h${h}`} className="absolute w-full border-t border-dashed border-outline-variant/10"
                      style={{ top: `${h * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
                  ))}

                  {/* Floating now indicator */}
                  {isToday && (
                    <div className="absolute w-full z-10 pointer-events-none" style={{ top: `${nowTop}px` }}>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full -ml-1 shrink-0 bg-red-500" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {timedEvents.map(ev => {
                    const c = getEventColor(ev);
                    const isBand = !!ev.band_id;
                    const top = eventTopPx(ev);
                    const height = eventHeightPx(ev);
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                        className={`absolute left-0.5 right-0.5 overflow-hidden text-left z-20 transition-[filter,transform] hover:brightness-90 hover:scale-[1.01] ${isBand ? "rounded-lg" : "rounded-xl"}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          background: isBand ? c.accent : c.bg,
                          border: isBand ? "none" : `1.5px solid ${c.accent}35`,
                        }}
                      >
                        <div className="px-1.5 pt-1 pb-0.5 h-full flex flex-col justify-start">
                          {isBand && height > 26 && (
                            <p className="text-[8px] font-mono text-white/65 truncate leading-none mb-0.5">
                              {bandById.get(ev.band_id!)?.name ?? ""}
                            </p>
                          )}
                          <p className={`text-xs font-semibold leading-tight truncate ${isBand ? "text-white" : ""}`}
                            style={!isBand ? { color: c.text } : undefined}>
                            {ev.title}
                          </p>
                          {height > 42 && (
                            <p className={`text-[10px] font-mono mt-auto leading-none ${isBand ? "text-white/65" : ""}`}
                              style={!isBand ? { color: c.accent } : undefined}>
                              {new Date(ev.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 page-enter" style={{ maxWidth: viewMode === "month" ? "672px" : "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-headline font-bold text-2xl text-obsidian">Calendar</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex rounded-xl bg-surface-mist p-0.5">
            <div
              className="absolute top-0.5 bottom-0.5 rounded-lg bg-white shadow-sm pointer-events-none transition-transform duration-200"
              style={{ width: "calc(100% / 3)", transform: `translateX(${["month","week","day"].indexOf(viewMode) * 100}%)` }}
            />
            {(["month", "week", "day"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => switchView(v)}
                className={`relative z-10 flex-1 px-3 py-1.5 text-xs font-mono font-medium capitalize transition-colors rounded-lg ${
                  viewMode === v ? "text-obsidian" : "text-on-surface-variant hover:text-obsidian"
                }`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={openAdd} className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
            Add Event
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevPeriod} className="p-2 hover:bg-surface-mist rounded-lg transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_left</span>
        </button>
        <div className="flex items-center gap-2">
          <h2 className="font-headline font-semibold text-obsidian">{getPeriodLabel()}</h2>
          <button onClick={goToday} className="text-xs font-mono text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5 transition-colors">
            Today
          </button>
        </div>
        <button onClick={nextPeriod} className="p-2 hover:bg-surface-mist rounded-lg transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_right</span>
        </button>
      </div>

      {/* Month view */}
      {viewMode === "month" && (
        <>
          <div className="card p-4 mb-5" style={{ viewTransitionName: "cal-grid" }}>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={i} className="text-center text-xs font-mono text-on-surface-variant py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((date, i) => {
                if (!date) return <div key={i} className="min-h-[56px]" />;
                const key = toDateKey(date);
                const dayEvs = eventsByDay.get(key) ?? [];
                const isSelected = toDateKey(selectedDate) === key;
                const isToday = todayKey === key;
                return (
                  <button key={i} onClick={() => setSelectedDate(date)}
                    className={`relative min-h-[56px] rounded-xl flex flex-col p-1.5 text-left transition-all duration-150 ${
                      isSelected
                        ? "bg-chlorophyll shadow-sm"
                        : isToday
                        ? "bg-primary/8 ring-1 ring-primary/20"
                        : "hover:bg-surface-mist/80"
                    }`}>
                    <span className={`font-mono text-xs leading-none mb-1.5 ${
                      isSelected ? "font-bold text-obsidian" : isToday ? "font-bold text-primary" : "text-obsidian"
                    }`}>{date.getDate()}</span>
                    {dayEvs.length > 0 && (
                      <div className="w-full space-y-px min-w-0">
                        {dayEvs.slice(0, 2).map(ev => {
                          const c = getEventColor(ev);
                          const isBand = !!ev.band_id;
                          return (
                            <div key={ev.id}
                              className="w-full rounded text-[8px] font-mono px-1 py-px leading-none truncate"
                              style={{
                                background: isSelected
                                  ? "rgba(0,0,0,0.12)"
                                  : isBand ? `${c.accent}22` : `${PERSONAL_COLOR.accent}1a`,
                                color: isSelected ? "#1a1a1a" : isBand ? c.text : PERSONAL_COLOR.text,
                              }}>
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvs.length > 2 && (
                          <span className={`text-[8px] font-mono pl-1 ${isSelected ? "text-obsidian/60" : "text-on-surface-variant/50"}`}>
                            +{dayEvs.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="font-headline font-semibold text-sm text-obsidian mb-3">
            {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          {getDayEvents(selectedDate).length === 0 ? (
            <div className="card py-10 text-center text-sm text-on-surface-variant">No events this day.</div>
          ) : (
            <div className="space-y-2">
              {getDayEvents(selectedDate).map(e => {
                const c = getEventColor(e);
                const isBand = !!e.band_id;
                return (
                  <button key={e.id} onClick={() => setDetailEvent(e)}
                    className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left transition-all duration-150 hover:brightness-95"
                    style={{ background: `${c.accent}10`, border: `1px solid ${c.accent}25` }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.accent }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-obsidian truncate">{e.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {e.is_all_day ? "All day" : `${new Date(e.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${new Date(e.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                        {isBand && bandById.get(e.band_id!) ? ` · ${bandById.get(e.band_id!)!.name}` : ""}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant/40 shrink-0" style={{ fontSize: "16px" }}>chevron_right</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Week view */}
      {viewMode === "week" && <div style={{ viewTransitionName: "cal-grid" }}>{renderTimeGrid(weekDays)}</div>}

      {/* Day view */}
      {viewMode === "day" && <div style={{ viewTransitionName: "cal-grid" }}>{renderTimeGrid([selectedDate])}</div>}

      {/* Band legend */}
      {bands.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PERSONAL_COLOR.accent }} />
            <span className="text-xs text-on-surface-variant">Personal</span>
          </div>
          {bands.map((b, i) => {
            const c = BAND_COLORS[i % BAND_COLORS.length];
            return (
              <div key={b.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.accent }} />
                <span className="text-xs text-on-surface-variant">{b.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* New Event Modal */}
      <Modal title="New Event" open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Title *</label>
            <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Rehearsal, gig, hangout…" />
          </div>

          {/* Date range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-field mb-0">Date</label>
              {form.start_date && form.end_date && form.start_date !== form.end_date && (() => {
                const days = Math.round((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1;
                return (
                  <span className="text-xs font-mono text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                    {days} days
                  </span>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Start</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.start_date}
                  onChange={(e) => {
                    const d = e.target.value;
                    setForm((f) => ({ ...f, start_date: d, end_date: f.end_date < d ? d : f.end_date }));
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-on-surface-variant mb-1">End</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* All day + times */}
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div
                onClick={() => setForm((f) => ({ ...f, is_all_day: !f.is_all_day }))}
                className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer ${
                  form.is_all_day
                    ? "bg-primary border-primary"
                    : "bg-transparent border-outline-variant group-hover:border-primary/50"
                }`}
              >
                {form.is_all_day && (
                  <span className="material-symbols-outlined text-white" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                    check
                  </span>
                )}
              </div>
              <span className="text-sm text-obsidian group-hover:text-obsidian/80 transition-colors">All day</span>
            </label>

            {!form.is_all_day && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-on-surface-variant mb-1">
                    {form.start_date !== form.end_date ? "Start time (day 1)" : "Start time"}
                  </label>
                  <input type="time" className="input-field" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-on-surface-variant mb-1">
                    {form.start_date !== form.end_date ? "End time (last day)" : "End time"}
                  </label>
                  <input type="time" className="input-field" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label-field">Band (optional)</label>
            <select className="input-field" value={form.band_id} onChange={(e) => setForm({ ...form, band_id: e.target.value })}>
              <option value="">Personal event</option>
              {bands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Venue (optional)</label>
            <select className="input-field" value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: e.target.value })}>
              <option value="">None</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Location</label>
            <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Free-text location" />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[64px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {/* Conflict warnings */}
          {checkingConflicts && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              Checking for conflicts…
            </div>
          )}
          {!checkingConflicts && (conflictWarnings.length > 0 || memberConflicts.length > 0) && (() => {
            const total = conflictWarnings.length + memberConflicts.length;
            return (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 shrink-0" style={{ fontSize: "18px" }}>warning</span>
                  <p className="text-sm font-semibold text-amber-800">
                    {total === 1 ? "Schedule conflict detected" : `${total} schedule conflicts detected`}
                  </p>
                </div>

                {conflictWarnings.length > 0 && (
                  <div className="space-y-1.5 pl-1">
                    {form.band_id && memberConflicts.length > 0 && (
                      <p className="text-[10px] font-mono font-semibold text-amber-700/60 uppercase tracking-wider mb-1">Band schedule</p>
                    )}
                    {conflictWarnings.map((w) => (
                      <div key={w.id} className="flex items-start gap-1.5 text-xs text-amber-700">
                        <span className="shrink-0 mt-0.5">·</span>
                        <span>
                          <span className="font-semibold">{w.title}</span>
                          {w.band_id && bandById.get(w.band_id) && (
                            <span className="font-normal"> · {bandById.get(w.band_id)!.name}</span>
                          )}
                          <span className="font-normal text-amber-600">
                            {" — "}
                            {w.is_all_day
                              ? "All day"
                              : `${new Date(w.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${new Date(w.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {memberConflicts.length > 0 && (
                  <div className="space-y-1.5 pl-1">
                    <p className="text-[10px] font-mono font-semibold text-amber-700/60 uppercase tracking-wider mb-1">Member conflicts</p>
                    {memberConflicts.map((mc, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                        <span className="shrink-0 mt-0.5">·</span>
                        <span>
                          <span className="font-semibold">{mc.member_name}</span>
                          <span className="font-normal"> has </span>
                          <span className="font-semibold">{mc.conflicting_event_title}</span>
                          {mc.conflicting_band_name && (
                            <span className="font-normal text-amber-600"> · {mc.conflicting_band_name}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-amber-600 pt-0.5">
                  {form.band_id
                    ? memberConflicts.length > 0
                      ? "Some band members have conflicting schedules. A conflict will be recorded on save."
                      : "This band already has an event at this time. You can still save."
                    : "Your personal event overlaps with band schedule. A conflict will be recorded on save."}
                </p>
              </div>
            );
          })()}

          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button
              className={(conflictWarnings.length > 0 || memberConflicts.length > 0) ? "btn-danger" : "btn-primary"}
              onClick={handleCreateEvent}
              disabled={saving || !form.title.trim()}
            >
              {saving ? "Saving…" : (conflictWarnings.length > 0 || memberConflicts.length > 0) ? "Save Anyway" : "Add Event"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Event detail modal */}
      <Modal title={detailEvent?.title ?? ""} open={!!detailEvent} onClose={() => setDetailEvent(null)}>
        {detailEvent && (
          <div className="p-6 space-y-3 text-sm">
            {(() => { const c = getEventColor(detailEvent); return (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium w-fit"
                style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.accent}40` }}>
                {detailEvent.band_id && bandById.get(detailEvent.band_id) ? bandById.get(detailEvent.band_id)!.name : "Personal event"}
              </div>
            ); })()}
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>schedule</span>
              {detailEvent.is_all_day ? "All day" : `${new Date(detailEvent.start_time).toLocaleString()} – ${new Date(detailEvent.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
            </div>
            {detailEvent.venue_id && venueById.get(detailEvent.venue_id) && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>location_on</span>
                {venueById.get(detailEvent.venue_id)!.name}
              </div>
            )}
            {detailEvent.location && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>map</span>
                {detailEvent.location}
              </div>
            )}
            {detailEvent.description && <p className="text-obsidian pt-1">{detailEvent.description}</p>}
            {detailEvent.owner_id === userId && (
              <button className="btn-danger w-full justify-center mt-4" onClick={() => handleDeleteEvent(detailEvent.id)}>
                Delete event
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
