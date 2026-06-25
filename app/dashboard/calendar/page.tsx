"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Band, Event, Venue } from "@/lib/types";
import { detectAndReportConflicts } from "@/lib/conflicts";
import Modal from "@/components/Modal";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEKDAY_LABELS = ["S","M","T","W","T","F","S"];
const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const BAND_COLORS = [
  { accent: "#f59e0b", bg: "#fef9ee", text: "#78350f" },
  { accent: "#8b5cf6", bg: "#f5f3ff", text: "#4c1d95" },
  { accent: "#ec4899", bg: "#fdf2f8", text: "#831843" },
  { accent: "#06b6d4", bg: "#ecfeff", text: "#164e63" },
  { accent: "#ef4444", bg: "#fff5f5", text: "#7f1d1d" },
  { accent: "#3b82f6", bg: "#eff6ff", text: "#1e3a8a" },
  { accent: "#f97316", bg: "#fff7ed", text: "#7c2d12" },
  { accent: "#a855f7", bg: "#faf5ff", text: "#581c87" },
];
const PERSONAL_COLOR = { accent: "#22c55e", bg: "#f0fdf4", text: "#14532d" };

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

  // ── Navigation ──────────────────────────────────────────────────────────────
  function prevPeriod() {
    if (viewMode === "month") { const m = viewMonth === 0 ? 11 : viewMonth - 1; setViewMonth(m); setViewYear(viewMonth === 0 ? viewYear - 1 : viewYear); }
    else if (viewMode === "week") setWeekStart(p => new Date(p.getTime() - 7 * 86400000));
    else setSelectedDate(p => { const d = new Date(p); d.setDate(d.getDate() - 1); return d; });
  }
  function nextPeriod() {
    if (viewMode === "month") { const m = viewMonth === 11 ? 0 : viewMonth + 1; setViewMonth(m); setViewYear(viewMonth === 11 ? viewYear + 1 : viewYear); }
    else if (viewMode === "week") setWeekStart(p => new Date(p.getTime() + 7 * 86400000));
    else setSelectedDate(p => { const d = new Date(p); d.setDate(d.getDate() + 1); return d; });
  }
  function goToday() {
    const t = new Date();
    setSelectedDate(t); setViewMonth(t.getMonth()); setViewYear(t.getFullYear()); setWeekStart(getWeekStart(t));
  }
  function switchView(mode: ViewMode) {
    setViewMode(mode);
    if (mode === "week") setWeekStart(getWeekStart(selectedDate));
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
    setError(""); setAddOpen(true);
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
    if (!form.band_id) await detectAndReportConflicts(supabase, userId, created as Event);
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

        {/* All-day row (only if any) */}
        {days.some(d => getDayEvents(d).some(e => e.is_all_day)) && (
          <div className="flex border-b border-outline-variant/30 min-h-[28px]">
            <div className="w-14 shrink-0 flex items-center justify-end pr-2">
              <span className="text-[10px] font-mono text-on-surface-variant leading-none">all<br/>day</span>
            </div>
            {days.map((day, i) => (
              <div key={i} className="flex-1 border-l border-outline-variant/20 p-1 space-y-0.5">
                {getDayEvents(day).filter(e => e.is_all_day).map(ev => {
                  const c = getEventColor(ev);
                  return (
                    <button key={ev.id} onClick={() => setDetailEvent(ev)}
                      className="w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate"
                      style={{ background: c.bg, color: c.text, borderLeft: `3px solid ${c.accent}` }}>
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
            </div>

            {/* Day columns */}
            {days.map((day, i) => {
              const isToday = toDateKey(day) === todayKey;
              const timedEvents = getDayEvents(day).filter(e => !e.is_all_day);
              return (
                <div key={i} className={`flex-1 relative border-l border-outline-variant/20 ${isToday ? "bg-primary/[0.018]" : ""}`}>
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

                  {/* Current time indicator */}
                  {isToday && (
                    <div className="absolute w-full z-10 pointer-events-none flex items-center" style={{ top: `${nowTop}px` }}>
                      <div className="w-2 h-2 rounded-full -ml-1 shrink-0" style={{ background: "#ef4444" }} />
                      <div className="flex-1 h-px" style={{ background: "#ef4444" }} />
                    </div>
                  )}

                  {/* Events */}
                  {timedEvents.map(ev => {
                    const c = getEventColor(ev);
                    const top = eventTopPx(ev);
                    const height = eventHeightPx(ev);
                    return (
                      <button key={ev.id} onClick={() => setDetailEvent(ev)}
                        className="absolute left-0.5 right-0.5 rounded overflow-hidden text-left z-20 hover:brightness-95 transition-[filter]"
                        style={{ top: `${top}px`, height: `${height}px`, background: c.bg, borderLeft: `3px solid ${c.accent}` }}>
                        <div className="px-1.5 py-0.5">
                          <p className="text-xs font-semibold leading-tight truncate" style={{ color: c.text }}>{ev.title}</p>
                          {height > 34 && (
                            <p className="text-[10px] font-mono leading-tight" style={{ color: c.accent }}>
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
          <div className="flex rounded-lg border border-outline-variant overflow-hidden">
            {(["month", "week", "day"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => switchView(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  viewMode === v ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-mist"
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
          <div className="card p-5 mb-6">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={i} className="text-center text-xs font-mono text-on-surface-variant py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const key = toDateKey(date);
                const dayEvs = eventsByDay.get(key) ?? [];
                const isSelected = toDateKey(selectedDate) === key;
                const isToday = todayKey === key;
                return (
                  <button key={i} onClick={() => setSelectedDate(date)}
                    className={`relative aspect-square rounded-lg flex flex-col items-center pt-1 pb-1 text-sm transition-colors ${
                      isSelected ? "bg-chlorophyll text-obsidian font-semibold" : isToday ? "bg-surface-mist text-primary font-semibold" : "text-obsidian hover:bg-surface-mist"
                    }`}>
                    {date.getDate()}
                    {dayEvs.length > 0 && (
                      <div className="flex gap-0.5 mt-auto flex-wrap justify-center px-0.5">
                        {dayEvs.slice(0, 4).map(ev => {
                          const c = getEventColor(ev);
                          return <span key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "#1a1a1a" : c.accent }} />;
                        })}
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
                return (
                  <button key={e.id} onClick={() => setDetailEvent(e)}
                    className="w-full card p-4 flex items-center gap-3 text-left hover:bg-surface-mist/40 transition-colors">
                    <span className="w-1.5 self-stretch rounded-full" style={{ background: c.accent }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-obsidian truncate">{e.title}</p>
                      <p className="text-xs text-on-surface-variant">
                        {e.is_all_day ? "All day" : `${new Date(e.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${new Date(e.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                        {e.band_id && bandById.get(e.band_id) ? ` · ${bandById.get(e.band_id)!.name}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Week view */}
      {viewMode === "week" && renderTimeGrid(weekDays)}

      {/* Day view */}
      {viewMode === "day" && renderTimeGrid([selectedDate])}

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
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreateEvent} disabled={saving || !form.title.trim()}>
              {saving ? "Saving…" : "Add Event"}
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
                style={{ background: c.bg, color: c.text, borderLeft: `3px solid ${c.accent}` }}>
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
