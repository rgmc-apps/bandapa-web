"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Venue } from "@/lib/types";
import Modal from "@/components/Modal";
import AddressAutocomplete from "@/components/AddressAutocomplete";

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
  bar: "Bar / Live Venue",
  hangout_place: "Hangout",
};

const venueTypeIcons: Record<Venue["venue_type"], string> = {
  studio: "mic",
  bar: "local_bar",
  hangout_place: "place",
};

export default function VenuesPage() {
  const supabase = createClient();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [form, setForm] = useState<VenueForm>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    const { data } = await supabase.from("venues").select("*").order("created_at", { ascending: false });
    setVenues(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  function openCreate() {
    setForm(empty);
    setError("");
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("venues").insert({
      ...form,
      description: form.description || null,
      added_by: user?.id ?? null,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    setModalOpen(false);
    setSaving(false);
    fetchVenues();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this venue?")) return;
    await supabase.from("venues").delete().eq("id", id);
    fetchVenues();
  }

  return (
    <div className="p-6 md:p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline font-bold text-2xl text-obsidian">Venues</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{venues.length} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
          Add Venue
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
      ) : venues.length === 0 ? (
        <div className="card py-16 text-center text-sm text-on-surface-variant">No venues yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue, i) => (
            <div key={venue.id} className="card p-5 spring-row" style={{ animationDelay: `${i * 35}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-full bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20">
                  <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>{venueTypeIcons[venue.venue_type]}</span>
                  {venueTypeLabels[venue.venue_type]}
                </span>
                {venue.added_by === currentUserId && (
                  <button onClick={() => handleDelete(venue.id)} className="p-1.5 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                  </button>
                )}
              </div>
              <h3 className="font-headline font-semibold text-obsidian mb-1">{venue.name}</h3>
              <p className="text-xs text-on-surface-variant">{venue.address}</p>
            </div>
          ))}
        </div>
      )}

      <Modal title="Add Venue" open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Venue Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Studio 54 Manila" />
          </div>
          <div>
            <label className="label-field">Type *</label>
            <div className="flex gap-2">
              {(["studio", "bar", "hangout_place"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, venue_type: type })}
                  className={`flex-1 text-xs font-mono px-2 py-2 rounded-lg border transition-colors ${
                    form.venue_type === type ? "bg-chlorophyll text-obsidian border-chlorophyll" : "bg-white text-on-surface-variant border-outline-variant"
                  }`}
                >
                  {venueTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">Address *</label>
            <AddressAutocomplete
              key={modalKey}
              address={form.address}
              lat={form.lat}
              lng={form.lng}
              onPlaceSelect={(address, lat, lng) => setForm((f) => ({ ...f, address, lat, lng }))}
              onAddressChange={(address) => setForm((f) => ({ ...f, address }))}
            />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[64px] resize-y" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes…" />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name.trim() || !form.address.trim()}>
              {saving ? "Saving…" : "Add Venue"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
