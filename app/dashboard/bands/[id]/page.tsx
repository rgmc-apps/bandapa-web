"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Band, BandMember, Profile } from "@/lib/types";
import Modal from "@/components/Modal";

type MemberRow = BandMember & { user: Profile };

export default function BandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();

  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", label: "", spotify_artist_id: "", date_formed: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: bandRow } = await supabase.from("bands").select("*").eq("id", id).single();
    setBand(bandRow);

    const { data: memberRows } = await supabase
      .from("band_members")
      .select("*, user:users(*)")
      .eq("band_id", id)
      .order("joined_at", { ascending: true });
    setMembers((memberRows ?? []) as unknown as MemberRow[]);

    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const myMembership = members.find((m) => m.user_id === currentUserId);
  const isAdmin = myMembership?.is_admin ?? false;
  const isCreator = band?.created_by === currentUserId;

  function openEdit() {
    if (!band) return;
    setEditForm({
      name: band.name,
      description: band.description ?? "",
      label: band.label ?? "",
      spotify_artist_id: band.spotify_artist_id ?? "",
      date_formed: band.date_formed,
    });
    setError("");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!band) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("bands")
      .update({
        name: editForm.name,
        description: editForm.description || null,
        label: editForm.label || null,
        spotify_artist_id: editForm.spotify_artist_id || null,
        date_formed: editForm.date_formed,
      })
      .eq("id", band.id);

    if (err) { setError(err.message); setSaving(false); return; }
    setEditOpen(false);
    setSaving(false);
    fetchData();
  }

  async function handleRemoveMember(memberRow: MemberRow) {
    if (!confirm(`Remove ${memberRow.user.full_name || memberRow.user.username} from the band?`)) return;
    await supabase.from("band_members").delete().eq("id", memberRow.id);
    fetchData();
  }

  async function handleLeave() {
    if (!myMembership) return;
    if (!confirm("Leave this band?")) return;
    await supabase.from("band_members").delete().eq("id", myMembership.id);
    router.push("/dashboard/bands");
  }

  async function handleToggleAdmin(member: MemberRow) {
    const action = member.is_admin ? "Remove admin from" : "Make admin";
    if (!confirm(`${action} ${member.user.full_name || member.user.username}?`)) return;
    await supabase.from("band_members").update({ is_admin: !member.is_admin }).eq("id", member.id);
    fetchData();
  }

  function copyInviteCode() {
    if (!band) return;
    navigator.clipboard.writeText(band.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function copyInviteLink() {
    if (!band) return;
    const link = `${window.location.origin}/dashboard/bands/join?code=${band.invite_code}`;
    if (navigator.share) {
      navigator.share({ title: `Join ${band.name} on Bandapa`, url: link });
    } else {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    }
  }

  if (loading || !band) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>;
  }

  return (
    <div className="p-6 md:p-8 page-enter max-w-3xl">
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-surface-mist overflow-hidden shrink-0 flex items-center justify-center">
            {band.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={band.image_url} alt={band.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "26px" }}>groups</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline font-bold text-2xl text-obsidian truncate">{band.name}</h1>
            <p className="text-sm text-on-surface-variant mt-1">{band.description || "No description yet."}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {band.genres.map((g) => (
                <span key={g} className="text-xs font-mono px-2 py-0.5 rounded-full bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20">{g}</span>
              ))}
            </div>
          </div>
          {isAdmin && (
            <button onClick={openEdit} className="btn-secondary shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit</span>
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="label-field">Formed</p>
            <p className="text-obsidian">{band.date_formed}</p>
          </div>
          <div>
            <p className="label-field">Label</p>
            <p className="text-obsidian">{band.label || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="label-field">Invite</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={copyInviteCode} className="flex items-center gap-1.5 font-mono text-chlorophyll-dark hover:underline">
                {band.invite_code}
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{copied ? "check" : "content_copy"}</span>
              </button>
              {isAdmin && (
                <button onClick={copyInviteLink} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>share</span>
                  {copiedLink ? "Link copied!" : "Share link"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-headline font-semibold text-sm text-obsidian mb-3">Members ({members.length})</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-mist/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-mist overflow-hidden flex items-center justify-center shrink-0">
                  {m.user.display_picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.user.display_picture} alt={m.user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-mono text-xs text-primary">{(m.user.full_name || m.user.username).charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-obsidian">{m.user.full_name || m.user.username}</p>
                  <p className="text-xs text-on-surface-variant">@{m.user.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.is_admin && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-container/30 text-primary">Admin</span>
                )}
                {isAdmin && m.user_id !== currentUserId && m.user_id !== band.created_by && (
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
                {isAdmin && !m.is_admin && m.user_id !== currentUserId && (
                  <button onClick={() => handleRemoveMember(m)} className="p-1.5 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors" title="Remove">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person_remove</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {myMembership && !isCreator && (
        <button onClick={handleLeave} className="btn-danger">Leave band</button>
      )}

      <Modal title="Edit Band" open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Band name</label>
            <input className="input-field" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[64px] resize-y" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Date formed</label>
              <input type="date" className="input-field" value={editForm.date_formed} onChange={(e) => setEditForm({ ...editForm, date_formed: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Record label</label>
              <input className="input-field" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Spotify artist URL</label>
            <input className="input-field" value={editForm.spotify_artist_id} onChange={(e) => setEditForm({ ...editForm, spotify_artist_id: e.target.value })} />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
