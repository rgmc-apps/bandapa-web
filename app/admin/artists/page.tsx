"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Artist } from "@/lib/types";
import Modal from "@/components/Modal";

type ArtistForm = Omit<Artist, "id" | "created_at" | "updated_at">;

const empty: ArtistForm = {
  name: "",
  bio: "",
  photo_url: "",
  genres: [],
  instruments: [],
  spotify_artist_id: "",
};

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [form, setForm] = useState<ArtistForm>(empty);
  const [genreInput, setGenreInput] = useState("");
  const [instrumentInput, setInstrumentInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
    setArtists(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setGenreInput("");
    setInstrumentInput("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(artist: Artist) {
    setEditing(artist);
    setForm({
      name: artist.name,
      bio: artist.bio ?? "",
      photo_url: artist.photo_url ?? "",
      genres: artist.genres,
      instruments: artist.instruments,
      spotify_artist_id: artist.spotify_artist_id ?? "",
    });
    setGenreInput(artist.genres.join(", "));
    setInstrumentInput(artist.instruments.join(", "));
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      genres: genreInput.split(",").map((g) => g.trim()).filter(Boolean),
      instruments: instrumentInput.split(",").map((i) => i.trim()).filter(Boolean),
      bio: form.bio || null,
      photo_url: form.photo_url || null,
      spotify_artist_id: form.spotify_artist_id || null,
    };

    let err;
    if (editing) {
      ({ error: err } = await supabase.from("artists").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("artists").insert(payload));
    }

    if (err) { setError(err.message); setSaving(false); return; }
    setModalOpen(false);
    fetchArtists();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this artist? This cannot be undone.")) return;
    await supabase.from("artists").delete().eq("id", id);
    fetchArtists();
  }

  const filtered = artists.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-obsidian">Artists</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{artists.length} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Artist
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-outline-variant/40">
          <input className="input-field max-w-xs" placeholder="Search artists…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">No artists found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Name", "Genres", "Instruments", "Spotify ID", "Actions"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((artist, i) => (
                  <tr key={artist.id} className="hover:bg-surface-low/40 transition-colors spring-row" style={{ animationDelay: `${i * 28}ms` }}>
                    <td className="table-cell font-semibold text-obsidian">{artist.name}</td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(artist.genres as string[]).map((g) => (
                          <span key={g} className="px-2 py-0.5 bg-chlorophyll/10 text-chlorophyll-dark text-xs font-mono rounded-full border border-chlorophyll/20">{g}</span>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(artist.instruments as string[]).map((i) => (
                          <span key={i} className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-xs font-mono rounded-full border border-secondary-container">{i}</span>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-on-surface-variant">{artist.spotify_artist_id ?? "—"}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(artist)} className="p-2 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                        </button>
                        <button onClick={() => handleDelete(artist.id)} className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors" title="Delete">
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

      <Modal title={editing ? "Edit Artist" : "New Artist"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Artist Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Juan dela Cruz" />
          </div>
          <div>
            <label className="label-field">Bio</label>
            <textarea className="input-field min-h-[80px] resize-y" value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short bio…" />
          </div>
          <div>
            <label className="label-field">Photo URL</label>
            <input className="input-field font-mono text-xs" value={form.photo_url ?? ""} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Genres (comma-separated)</label>
              <input className="input-field" value={genreInput} onChange={(e) => setGenreInput(e.target.value)} placeholder="Rock, Jazz…" />
            </div>
            <div>
              <label className="label-field">Instruments (comma-separated)</label>
              <input className="input-field" value={instrumentInput} onChange={(e) => setInstrumentInput(e.target.value)} placeholder="Guitar, Vocals…" />
            </div>
          </div>
          <div>
            <label className="label-field">Spotify Artist ID</label>
            <input className="input-field font-mono text-xs" value={form.spotify_artist_id ?? ""} onChange={(e) => setForm({ ...form, spotify_artist_id: e.target.value })} placeholder="Optional" />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Artist"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
