"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Album, Band, Track } from "@/lib/types";
import Modal from "@/components/Modal";

type AlbumForm = {
  band_id: string;
  name: string;
  description: string;
  cover_url: string;
  release_date: string;
  tracks: Track[];
};

const empty: AlbumForm = {
  band_id: "",
  name: "",
  description: "",
  cover_url: "",
  release_date: "",
  tracks: [],
};

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<(Album & { bands?: { name: string } })[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const [form, setForm] = useState<AlbumForm>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newTrack, setNewTrack] = useState({ title: "", duration: "" });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [albumsRes, bandsRes] = await Promise.all([
      supabase.from("albums").select("*, bands(name)").order("created_at", { ascending: false }),
      supabase.from("bands").select("*").order("name"),
    ]);
    setAlbums(albumsRes.data ?? []);
    setBands(bandsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, band_id: bands[0]?.id ?? "" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(album: Album) {
    setEditing(album);
    setForm({
      band_id: album.band_id,
      name: album.name,
      description: album.description ?? "",
      cover_url: album.cover_url ?? "",
      release_date: album.release_date ?? "",
      tracks: album.tracks ?? [],
    });
    setError("");
    setModalOpen(true);
  }

  function addTrack() {
    if (!newTrack.title) return;
    const track: Track = {
      title: newTrack.title,
      duration: parseInt(newTrack.duration) || 0,
      order: form.tracks.length + 1,
    };
    setForm({ ...form, tracks: [...form.tracks, track] });
    setNewTrack({ title: "", duration: "" });
  }

  function removeTrack(index: number) {
    const updated = form.tracks.filter((_, i) => i !== index).map((t, i) => ({ ...t, order: i + 1 }));
    setForm({ ...form, tracks: updated });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const payload = {
      band_id: form.band_id,
      name: form.name,
      description: form.description || null,
      cover_url: form.cover_url || null,
      release_date: form.release_date || null,
      tracks: form.tracks,
    };

    let err;
    if (editing) {
      ({ error: err } = await supabase.from("albums").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("albums").insert(payload));
    }

    if (err) { setError(err.message); setSaving(false); return; }
    setModalOpen(false);
    fetchData();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this album? This cannot be undone.")) return;
    await supabase.from("albums").delete().eq("id", id);
    fetchData();
  }

  const filtered = albums.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.bands?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-obsidian">Albums</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{albums.length} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary" disabled={bands.length === 0}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Album
        </button>
      </div>

      {bands.length === 0 && !loading && (
        <div className="mb-4 p-4 bg-secondary-container/40 border border-secondary-container rounded-xl text-sm text-secondary">
          You need at least one band before adding albums. <a href="/admin/bands" className="font-semibold underline">Add a band →</a>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-outline-variant/40">
          <input className="input-field max-w-xs" placeholder="Search albums…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">No albums found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Album", "Band", "Release Date", "Tracks", "Actions"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((album, i) => (
                  <tr key={album.id} className="hover:bg-surface-low/40 transition-colors spring-row" style={{ animationDelay: `${i * 28}ms` }}>
                    <td className="table-cell font-semibold text-obsidian">{album.name}</td>
                    <td className="table-cell text-on-surface-variant">
                      {(album as Album & { bands?: { name: string } }).bands?.name ?? "—"}
                    </td>
                    <td className="table-cell font-mono text-xs">{album.release_date ?? "—"}</td>
                    <td className="table-cell">
                      <span className="px-2.5 py-1 bg-surface-container text-secondary text-xs font-mono rounded-full border border-outline-variant/40">
                        {(album.tracks as Track[]).length} tracks
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(album)} className="p-2 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                        </button>
                        <button onClick={() => handleDelete(album.id)} className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors" title="Delete">
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

      <Modal title={editing ? "Edit Album" : "New Album"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Band *</label>
            <select className="input-field" value={form.band_id} onChange={(e) => setForm({ ...form, band_id: e.target.value })}>
              {bands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Album Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Debut Album" />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[72px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Release Date</label>
              <input type="date" className="input-field" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Cover URL</label>
              <input className="input-field font-mono text-xs" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>

          {/* Tracks */}
          <div>
            <label className="label-field">Tracks ({form.tracks.length})</label>
            <div className="space-y-1.5 mb-3">
              {form.tracks.map((track, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-mist rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-on-surface-variant w-5">{track.order}.</span>
                  <span className="flex-1 text-sm text-obsidian">{track.title}</span>
                  <span className="font-mono text-xs text-on-surface-variant">{formatDuration(track.duration)}</span>
                  <button onClick={() => removeTrack(i)} className="text-error/60 hover:text-error ml-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="Track title"
                value={newTrack.title}
                onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addTrack()}
              />
              <input
                type="number"
                className="input-field w-24 font-mono"
                placeholder="Sec"
                value={newTrack.duration}
                onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })}
              />
              <button className="btn-secondary flex-shrink-0" onClick={addTrack}>Add</button>
            </div>
            <p className="text-xs text-on-surface-variant mt-1.5 font-mono">Duration in seconds. Press Enter or click Add.</p>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.band_id}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Album"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
