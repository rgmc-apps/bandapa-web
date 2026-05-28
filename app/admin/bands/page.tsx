"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Band } from "@/lib/types";
import Modal from "@/components/Modal";

type BandForm = Omit<Band, "id" | "created_at" | "invite_code" | "created_by">;

const empty: BandForm = {
  name: "",
  description: "",
  genres: [],
  date_formed: new Date().toISOString().split("T")[0],
  label: "",
  spotify_artist_id: "",
};

export default function BandsPage() {
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Band | null>(null);
  const [form, setForm] = useState<BandForm>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [genreInput, setGenreInput] = useState("");

  const supabase = createClient();

  const fetchBands = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("bands").select("*").order("created_at", { ascending: false });
    setBands(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBands(); }, [fetchBands]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setGenreInput("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(band: Band) {
    setEditing(band);
    setForm({
      name: band.name,
      description: band.description ?? "",
      genres: band.genres,
      date_formed: band.date_formed,
      label: band.label ?? "",
      spotify_artist_id: band.spotify_artist_id ?? "",
    });
    setGenreInput(band.genres.join(", "));
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      genres: genreInput.split(",").map((g) => g.trim()).filter(Boolean),
      description: form.description || null,
      label: form.label || null,
      spotify_artist_id: form.spotify_artist_id || null,
    };

    let err;
    if (editing) {
      ({ error: err } = await supabase.from("bands").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("bands").insert(payload));
    }

    if (err) { setError(err.message); setSaving(false); return; }
    setModalOpen(false);
    fetchBands();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this band? This cannot be undone.")) return;
    await supabase.from("bands").delete().eq("id", id);
    fetchBands();
  }

  const filtered = bands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.label ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-obsidian">Bands</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{bands.length} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Band
        </button>
      </div>

      <div className="card overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-outline-variant/40">
          <input
            className="input-field max-w-xs"
            placeholder="Search bands…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">No bands found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Name", "Genres", "Date Formed", "Label", "Invite Code", "Actions"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((band, i) => (
                  <tr key={band.id} className="hover:bg-surface-low/40 transition-colors spring-row" style={{ animationDelay: `${i * 28}ms` }}>
                    <td className="table-cell font-semibold text-obsidian">{band.name}</td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(band.genres as string[]).map((g) => (
                          <span key={g} className="px-2 py-0.5 bg-chlorophyll/10 text-chlorophyll-dark text-xs font-mono rounded-full border border-chlorophyll/20">{g}</span>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs">{band.date_formed}</td>
                    <td className="table-cell text-on-surface-variant">{band.label ?? "—"}</td>
                    <td className="table-cell font-mono text-xs tracking-widest text-chlorophyll-dark">{band.invite_code}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(band)} className="p-2 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                        </button>
                        <button onClick={() => handleDelete(band.id)} className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors" title="Delete">
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

      <Modal title={editing ? "Edit Band" : "New Band"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Band Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. The Midnight" />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[80px] resize-y" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Band bio…" />
          </div>
          <div>
            <label className="label-field">Genres (comma-separated)</label>
            <input className="input-field" value={genreInput} onChange={(e) => setGenreInput(e.target.value)} placeholder="e.g. Rock, Indie, Alternative" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Date Formed</label>
              <input type="date" className="input-field" value={form.date_formed} onChange={(e) => setForm({ ...form, date_formed: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Record Label</label>
              <input className="input-field" value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="label-field">Spotify Artist ID</label>
            <input className="input-field font-mono" value={form.spotify_artist_id ?? ""} onChange={(e) => setForm({ ...form, spotify_artist_id: e.target.value })} placeholder="Optional" />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Band"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
