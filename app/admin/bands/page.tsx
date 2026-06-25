"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Band, BandMember, Profile } from "@/lib/types";
import Modal from "@/components/Modal";

type BandForm = Omit<Band, "id" | "created_at" | "invite_code" | "created_by" | "image_url" | "banner_url">;
type MemberRow = BandMember & { user: Profile };

const empty: BandForm = {
  name: "",
  description: "",
  genres: [],
  date_formed: new Date().toISOString().split("T")[0],
  label: "",
  spotify_url: "",
  social_links: {},
  is_public: true,
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

  // Members modal
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersBand, setMembersBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const supabase = createClient();

  const fetchBands = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("bands").select("*").order("created_at", { ascending: false });
    setBands(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBands(); }, [fetchBands]);

  async function openMembers(band: Band) {
    setMembersBand(band);
    setMembers([]);
    setMembersOpen(true);
    setMembersLoading(true);
    const res = await fetch(`/api/admin/band-members?band_id=${band.id}`);
    const json = await res.json();
    setMembers(json.members ?? []);
    setMembersLoading(false);
  }

  async function handleRemoveMember(member: MemberRow) {
    if (!confirm(`Remove ${member.user.full_name || member.user.username} from ${membersBand?.name}?`)) return;
    await fetch(`/api/admin/band-members?member_id=${member.id}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== member.id));
  }

  async function handleToggleAdmin(member: MemberRow) {
    const action = member.is_admin ? "Remove admin from" : "Make admin";
    if (!confirm(`${action} ${member.user.full_name || member.user.username}?`)) return;
    await fetch("/api/admin/band-members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: member.id, is_admin: !member.is_admin }),
    });
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_admin: !m.is_admin } : m));
  }

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
      date_formed: band.date_formed ?? "",
      label: band.label ?? "",
      spotify_url: band.spotify_url ?? "",
      social_links: band.social_links ?? {},
      is_public: band.is_public,
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
      spotify_url: form.spotify_url || null,
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
                  {["Name", "Genres", "Date Formed", "Label", "Invite Code", "Visibility", "Actions"].map((h) => (
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
                      {band.is_public ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-chlorophyll/10 text-chlorophyll-dark text-xs font-mono border border-chlorophyll/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-chlorophyll-dark" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-mist text-on-surface-variant text-xs font-mono border border-outline-variant/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40" />
                          Private
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openMembers(band)} className="p-2 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors" title="View members">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>group</span>
                        </button>
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

      {/* Band form modal */}
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
              <input type="date" className="input-field" value={form.date_formed ?? ""} onChange={(e) => setForm({ ...form, date_formed: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Record Label</label>
              <input className="input-field" value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="label-field">Spotify Artist ID</label>
            <input className="input-field font-mono" value={form.spotify_url ?? ""} onChange={(e) => setForm({ ...form, spotify_url: e.target.value })} placeholder="Optional" />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/40 bg-surface-low/40">
            <div>
              <p className="text-sm font-medium text-obsidian">Public visibility</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {form.is_public ? "This band is visible to all users." : "This band is hidden from all users."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_public}
              onClick={() => setForm({ ...form, is_public: !form.is_public })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                form.is_public ? "bg-chlorophyll" : "bg-outline-variant"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  form.is_public ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
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

      {/* Members modal */}
      <Modal
        title={membersBand ? `${membersBand.name} — Members` : "Members"}
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
      >
        <div className="p-6">
          {membersLoading ? (
            <div className="py-10 text-center text-sm text-on-surface-variant">Loading…</div>
          ) : members.length === 0 ? (
            <div className="py-10 text-center text-sm text-on-surface-variant">No members yet.</div>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const displayName = m.user.full_name || m.user.username;
                const initial = displayName.charAt(0).toUpperCase();
                const isCreator = membersBand?.created_by === m.user_id;
                return (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-mist/60 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-surface-mist overflow-hidden flex items-center justify-center shrink-0">
                      {m.user.display_picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.user.display_picture} alt={m.user.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-mono text-sm font-semibold text-primary">{initial}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-obsidian">{displayName}</p>
                        {isCreator && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20">Owner</span>
                        )}
                        {m.is_admin && !isCreator && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary-container/30 text-primary">Admin</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">@{m.user.username}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isCreator && (
                        <button
                          onClick={() => handleToggleAdmin(m)}
                          className="p-1.5 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                          title={m.is_admin ? "Remove admin" : "Make admin"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            {m.is_admin ? "shield_with_heart" : "shield_person"}
                          </span>
                        </button>
                      )}
                      {!isCreator && (
                        <button
                          onClick={() => handleRemoveMember(m)}
                          className="p-1.5 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors"
                          title="Remove member"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person_remove</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant font-mono">{members.length} member{members.length !== 1 ? "s" : ""}</p>
            <button className="btn-secondary" onClick={() => setMembersOpen(false)}>Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
