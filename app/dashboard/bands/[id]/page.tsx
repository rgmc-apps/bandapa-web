"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [copiedShare, setCopiedShare] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", label: "", spotify_url: "", date_formed: "" });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
  const isOwner = band?.owner_id === currentUserId;
  const isAdmin = isOwner || myMembership?.role === "admin";

  function openEdit() {
    if (!band) return;
    setEditForm({
      name: band.name,
      description: band.description ?? "",
      label: band.label ?? "",
      spotify_url: band.spotify_url ?? "",
      date_formed: band.date_formed ?? "",
    });
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditBannerFile(null);
    setEditBannerPreview(null);
    setError("");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!band) return;
    setSaving(true);
    setError("");

    let image_url = band.image_url;
    let banner_url = band.banner_url;

    if (editImageFile) {
      const ext = editImageFile.name.split(".").pop() ?? "jpg";
      const path = `${band.id}/cover.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("band-images").upload(path, editImageFile, { upsert: true });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from("band-images").getPublicUrl(path);
        image_url = pub.publicUrl;
      }
    }

    if (editBannerFile) {
      const ext = editBannerFile.name.split(".").pop() ?? "jpg";
      const path = `${band.id}/banner.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("band-images").upload(path, editBannerFile, { upsert: true });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from("band-images").getPublicUrl(path);
        banner_url = pub.publicUrl;
      }
    }

    const { error: err } = await supabase
      .from("bands")
      .update({
        name: editForm.name,
        description: editForm.description || null,
        label: editForm.label || null,
        spotify_url: editForm.spotify_url || null,
        date_formed: editForm.date_formed || null,
        image_url,
        banner_url,
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
    const isCurrentlyAdmin = member.role === "admin";
    const action = isCurrentlyAdmin ? "Remove admin from" : "Make admin";
    if (!confirm(`${action} ${member.user.full_name || member.user.username}?`)) return;
    await supabase.from("band_members").update({ role: isCurrentlyAdmin ? "member" : "admin" }).eq("id", member.id);
    fetchData();
  }

  function copyInviteCode() {
    if (!band) return;
    navigator.clipboard.writeText(band.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleShare() {
    if (!band) return;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: band.name, text: `Check out ${band.name} on Bandapa`, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1500);
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditBannerFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (loading || !band) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>;
  }

  const displayImage = editImagePreview ?? band.image_url;
  const displayBanner = editBannerPreview ?? band.banner_url;

  return (
    <div className="p-6 md:p-8 page-enter max-w-3xl">
      <div className="card mb-6 overflow-hidden">
        {/* Banner */}
        <div className="relative h-44">
          {band.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={band.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-chlorophyll/20 to-surface-mist" />
          )}

          {/* Top-right actions */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-obsidian hover:bg-white transition-colors font-medium shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>share</span>
              {copiedShare ? "Copied!" : "Share"}
            </button>
            {isAdmin && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-obsidian hover:bg-white transition-colors font-medium shadow-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>edit</span>
                Edit band
              </button>
            )}
          </div>

          {/* Display picture overlapping banner */}
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-2xl ring-4 ring-white bg-surface-mist overflow-hidden flex items-center justify-center shadow-md">
              {band.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={band.image_url} alt={band.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary" style={{ fontSize: "32px" }}>groups</span>
              )}
            </div>
          </div>
        </div>

        {/* Band info */}
        <div className="pt-14 px-6 pb-6">
          <h1 className="font-headline font-bold text-2xl text-obsidian">{band.name}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{band.description || "No description yet."}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {band.genres.map((g) => (
              <span key={g} className="text-xs font-mono px-2 py-0.5 rounded-full bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20">{g}</span>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-5 pt-5 border-t border-outline-variant">
            <div>
              <p className="label-field">Formed</p>
              <p className="text-obsidian">{band.date_formed || "—"}</p>
            </div>
            <div>
              <p className="label-field">Label</p>
              <p className="text-obsidian">{band.label || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="label-field">Invite code</p>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={copyInviteCode} className="flex items-center gap-1.5 font-mono text-chlorophyll-dark hover:underline">
                  {band.invite_code}
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{copied ? "check" : "content_copy"}</span>
                </button>
              </div>
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
                {(m.role === "admin" || m.user_id === band.owner_id) && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-container/30 text-primary">
                    {m.user_id === band.owner_id ? "Owner" : "Admin"}
                  </span>
                )}
                {isAdmin && m.user_id !== currentUserId && m.user_id !== band.owner_id && (
                  <button
                    onClick={() => handleToggleAdmin(m)}
                    className="p-1.5 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                    title={m.role === "admin" ? "Remove admin" : "Make admin"}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      {m.role === "admin" ? "shield_with_heart" : "shield_person"}
                    </span>
                  </button>
                )}
                {isAdmin && m.role !== "admin" && m.user_id !== currentUserId && m.user_id !== band.owner_id && (
                  <button
                    onClick={() => handleRemoveMember(m)}
                    className="p-1.5 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors"
                    title="Remove"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person_remove</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {myMembership && !isOwner && (
        <button onClick={handleLeave} className="btn-danger">Leave band</button>
      )}

      <Modal title="Edit Band" open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="p-6 space-y-4">
          {/* Banner upload */}
          <div>
            <label className="label-field">Banner image</label>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="relative w-full h-28 rounded-xl overflow-hidden bg-surface-mist flex items-center justify-center border border-outline-variant hover:border-primary transition-colors group"
            >
              {displayBanner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayBanner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-chlorophyll/10 to-surface-mist flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary" style={{ fontSize: "28px" }}>add_photo_alternate</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Change banner</span>
              </div>
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerPick} />
          </div>

          {/* Display picture upload */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-mist shrink-0 flex items-center justify-center border border-outline-variant hover:border-primary transition-colors group"
            >
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary" style={{ fontSize: "24px" }}>add_a_photo</span>
              )}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <p className="text-xs text-on-surface-variant">Band display picture</p>
          </div>

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
            <input className="input-field" value={editForm.spotify_url} onChange={(e) => setEditForm({ ...editForm, spotify_url: e.target.value })} />
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
