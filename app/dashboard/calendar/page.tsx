"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Band, Event, Venue } from "@/lib/types";
import { detectAndReportConflicts } from "@/lib/conflicts";
import Modal from "@/components/Modal";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

type EventForm = {
  title: string;
  is_all_day: boolean;
  start_time: string;
  end_time: string;
  band_id: string;
  venue_id: string;
  location: string;
  description: string;
};

const emptyForm: EventForm = {
  title: "",
  is_all_day: false,
  start_time: "18:00",
  end_time: "20:00",
  band_id: "",
  venue_id: "",
  location: "",
  description: "",
};

export default function CalendarPage() {
  const supabase = createClient();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [events, setEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: memberRows } = await supabase.from("band_members").select("band:bands(*)").eq("user_id", user.id);
    setBands((memberRows ?? []).map((r) => r.band).filter(Boolean) as unknown as Band[]);

    const { data: venueRows } = await supabase.from("venues").select("*").order("name");
    setVenues(venueRows ?? []);

    const rangeStart = new Date(viewYear, viewMonth, 1).toISOString();
    const rangeEnd = new Date(viewYear, viewMonth + 1, 1).toISOString();
    const { data: eventRows } = await supabase
      .from("events")
      .select("*")
      .lt("start_time", rangeEnd)
      .gte("end_time", rangeStart)
      .order("start_time");
    setEvents(eventRows ?? []);
  }, [supabase, viewYear, viewMonth]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const key = toDateKey(new Date(e.start_time));
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const selectedDayEvents = eventsByDay.get(toDateKey(selectedDate)) ?? [];

  function prevMonth() {
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewMonth(m); setViewYear(y);
  }
  function nextMonth() {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewMonth(m); setViewYear(y);
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setError("");
    setAddOpen(true);
  }

  async function handleCreateEvent() {
    if (!form.title.trim() || !userId) return;
    setSaving(true);
    setError("");

    const dateKey = toDateKey(selectedDate);
    const start = form.is_all_day ? `${dateKey}T00:00:00` : `${dateKey}T${form.start_time}:00`;
    const end = form.is_all_day ? `${dateKey}T23:59:59` : `${dateKey}T${form.end_time}:00`;

    if (!form.is_all_day && form.end_time <= form.start_time) {
      setError("End time must be after start time.");
      setSaving(false);
      return;
    }

    const { data: created, error: err } = await supabase
      .from("events")
      .insert({
        title: form.title.trim(),
        event_type: form.band_id ? "band_rehearsal" : "personal",
        owner_id: userId,
        band_id: form.band_id || null,
        venue_id: form.venue_id || null,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        is_all_day: form.is_all_day,
        location: form.location || null,
        description: form.description || null,
      })
      .select("*")
      .single();

    if (err || !created) {
      setError(err?.message ?? "Failed to create event.");
      setSaving(false);
      return;
    }

    if (!form.band_id) {
      await detectAndReportConflicts(supabase, userId, created as Event);
    }

    setAddOpen(false);
    setSaving(false);
    fetchEvents();
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setDetailEvent(null);
    fetchEvents();
  }

  const cells = buildMonthGrid(viewYear, viewMonth);
  const bandById = useMemo(() => new Map(bands.map((b) => [b.id, b])), [bands]);
  const venueById = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);

  return (
    <div className="p-6 md:p-8 page-enter max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline font-bold text-2xl text-obsidian">Calendar</h1>
        <button onClick={openAdd} className="btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
          Add Event
        </button>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-surface-mist rounded-lg transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_left</span>
          </button>
          <h2 className="font-headline font-semibold text-obsidian">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-surface-mist rounded-lg transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((d, i) => (
            <div key={i} className="text-center text-xs font-mono text-on-surface-variant py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const key = toDateKey(date);
            const hasEvents = eventsByDay.has(key);
            const isSelected = toDateKey(selectedDate) === key;
            const isToday = toDateKey(today) === key;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors ${
                  isSelected ? "bg-chlorophyll text-obsidian font-semibold" : isToday ? "bg-surface-mist text-primary font-semibold" : "text-obsidian hover:bg-surface-mist"
                }`}
              >
                {date.getDate()}
                {hasEvents && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-obsidian" : "bg-primary"}`} />}
              </button>
            );
          })}
        </div>
      </div>

      <h3 className="font-headline font-semibold text-sm text-obsidian mb-3">
        {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </h3>

      {selectedDayEvents.length === 0 ? (
        <div className="card py-10 text-center text-sm text-on-surface-variant">No events this day.</div>
      ) : (
        <div className="space-y-2">
          {selectedDayEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => setDetailEvent(e)}
              className="w-full card p-4 flex items-center gap-3 text-left hover:bg-surface-mist/40 transition-colors"
            >
              <span className={`w-1.5 self-stretch rounded-full ${e.band_id ? "bg-[#22d3ee]" : "bg-chlorophyll"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-obsidian truncate">{e.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {e.is_all_day ? "All day" : `${new Date(e.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${new Date(e.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                  {e.band_id && bandById.get(e.band_id) ? ` · ${bandById.get(e.band_id)!.name}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal title="New Event" open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Title *</label>
            <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Rehearsal, gig, hangout…" />
          </div>

          <label className="flex items-center gap-2 text-sm text-obsidian">
            <input type="checkbox" checked={form.is_all_day} onChange={(e) => setForm({ ...form, is_all_day: e.target.checked })} />
            All day
          </label>

          {!form.is_all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Start</label>
                <input type="time" className="input-field" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <label className="label-field">End</label>
                <input type="time" className="input-field" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
          )}

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

      <Modal title={detailEvent?.title ?? ""} open={!!detailEvent} onClose={() => setDetailEvent(null)}>
        {detailEvent && (
          <div className="p-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>schedule</span>
              {detailEvent.is_all_day ? "All day" : `${new Date(detailEvent.start_time).toLocaleString()} – ${new Date(detailEvent.end_time).toLocaleTimeString()}`}
            </div>
            {detailEvent.band_id && bandById.get(detailEvent.band_id) && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>groups</span>
                {bandById.get(detailEvent.band_id)!.name}
              </div>
            )}
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
            {detailEvent.description && <p className="text-obsidian">{detailEvent.description}</p>}

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
