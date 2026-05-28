"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Venue } from "@/lib/types";
import Modal from "@/components/Modal";

type VenueForm = Omit<Venue, "id" | "created_at" | "added_by">;

const empty: VenueForm = {
  name: "",
  description: "",
  venue_type: "studio",
  address: "",
  lat: null,
  lng: null,
};

const venueTypeLabels: Record<Venue["venue_type"], string> = {
  studio: "Studio",
  bar: "Bar",
  hangout_place: "Hangout",
};

const venueTypeIcons: Record<Venue["venue_type"], string> = {
  studio: "mic",
  bar: "local_bar",
  hangout_place: "place",
};

const venueTypeColors: Record<Venue["venue_type"], string> = {
  studio: "bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20",
  bar: "bg-secondary-container text-on-secondary-container border border-secondary-container",
  hangout_place: "bg-surface-container text-secondary border border-outline-variant/40",
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [form, setForm] = useState<VenueForm>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("venues").select("*").order("created_at", { ascending: false });
    setVenues(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError("");
    setModalOpen(true);
  }

  function openEdit(venue: Venue) {
    setEditing(venue);
    setForm({
      name: venue.name,
      description: venue.description ?? "",
      venue_type: venue.venue_type,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      description: form.description || null,
    };

    let err;
    if (editing) {
      ({ error: err } = await supabase.from("venues").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("venues").insert(payload));
    }

    if (err) { setError(err.message); setSaving(false); return; }
    setModalOpen(false);
    fetchVenues();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this venue? This cannot be undone.")) return;
    await supabase.from("venues").delete().eq("id", id);
    fetchVenues();
  }

  const filtered = venues.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-obsidian">Venues</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{venues.length} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Venue
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-outline-variant/40">
          <input className="input-field max-w-xs" placeholder="Search venues…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">No venues found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Name", "Type", "Address", "Coordinates", "Actions"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((venue, i) => (
                  <tr key={venue.id} className="hover:bg-surface-low/40 transition-colors spring-row" style={{ animationDelay: `${i * 28}ms` }}>
                    <td className="table-cell font-semibold text-obsidian">{venue.name}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-full ${venueTypeColors[venue.venue_type]}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>{venueTypeIcons[venue.venue_type]}</span>
                        {venueTypeLabels[venue.venue_type]}
                      </span>
                    </td>
                    <td className="table-cell text-on-surface-variant text-xs max-w-xs truncate">{venue.address}</td>
                    <td className="table-cell font-mono text-xs text-on-surface-variant">
                      {venue.lat && venue.lng ? `${venue.lat}, ${venue.lng}` : "—"}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(venue)} className="p-2 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                        </button>
                        <button onClick={() => handleDelete(venue.id)} className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors" title="Delete">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal title={editing ? "Edit Venue" : "New Venue"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Venue Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Studio 54 Manila" />
          </div>
          <div>
            <label className="label-field">Type *</label>
            <select
              className="input-field"
              value={form.venue_type}
              onChange={(e) => setForm({ ...form, venue_type: e.target.value as Venue["venue_type"] })}
            >
              <option value="studio">Studio</option>
              <option value="bar">Bar / Live Venue</option>
              <option value="hangout_place">Hangout Place</option>
            </select>
          </div>
          <div>
            <label className="label-field">Address *</label>
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[72px] resize-y" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Latitude</label>
              <input
                type="number"
                step="0.000001"
                className="input-field font-mono"
                value={form.lat ?? ""}
                onChange={(e) => setForm({ ...form, lat: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="14.5995"
              />
            </div>
            <div>
              <label className="label-field">Longitude</label>
              <input
                type="number"
                step="0.000001"
                className="input-field font-mono"
                value={form.lng ?? ""}
                onChange={(e) => setForm({ ...form, lng: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="120.9842"
              />
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.address}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Venue"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
