"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import Modal from "@/components/Modal";
import Image from "next/image";

type AnnouncementForm = { title: string; body: string; is_active: boolean };

const empty: AnnouncementForm = { title: "", body: "", is_active: true };

const BUCKET = "announcement-images";

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setError("");
    setModalOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({ title: item.title, body: item.body, is_active: item.is_active });
    setImageFile(null);
    setImagePreview(item.image_url ?? null);
    setRemoveImage(false);
    setError("");
    setModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });
    if (uploadErr) throw new Error(uploadErr.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function deleteImageByUrl(url: string) {
    const path = url.split(`/${BUCKET}/`)[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    let imageUrl: string | null = editing?.image_url ?? null;

    if (imageFile) {
      // Delete old image if replacing
      if (editing?.image_url) await deleteImageByUrl(editing.image_url);
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Image upload failed");
        setSaving(false);
        return;
      }
    } else if (removeImage) {
      if (editing?.image_url) await deleteImageByUrl(editing.image_url);
      imageUrl = null;
    }

    const payload = { ...form, image_url: imageUrl };
    let err;
    if (editing) {
      ({ error: err } = await supabase.from("announcements").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("announcements").insert(payload));
    }

    if (err) { setError(err.message); setSaving(false); return; }
    setModalOpen(false);
    fetchItems();
    setSaving(false);
  }

  async function handleDelete(item: Announcement) {
    if (!confirm("Delete this announcement? Users will no longer see it.")) return;
    if (item.image_url) await deleteImageByUrl(item.image_url);
    await supabase.from("announcements").delete().eq("id", item.id);
    fetchItems();
  }

  async function toggleActive(item: Announcement) {
    await supabase.from("announcements").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  }

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-obsidian">Announcements</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {items.filter((i) => i.is_active).length} active · {items.length} total
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Announcement
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-chlorophyll/10 border border-chlorophyll/25 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-chlorophyll/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-chlorophyll-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-obsidian">App Notification</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Active announcements are shown to all app users via real-time notifications. Deactivate an announcement to stop showing it.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-5xl mb-4">📢</div>
          <p className="text-sm text-on-surface-variant mb-4">No announcements yet.</p>
          <button className="btn-primary" onClick={openCreate}>Create your first announcement</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className={`card p-5 spring-row ${!item.is_active ? "opacity-60" : ""}`} style={{ animationDelay: `${i * 35}ms` }}>
              <div className="flex items-start gap-4">
                {/* Active indicator */}
                <button
                  onClick={() => toggleActive(item)}
                  className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                    item.is_active
                      ? "bg-chlorophyll-dark border-chlorophyll-dark"
                      : "bg-transparent border-outline"
                  }`}
                  title={item.is_active ? "Click to deactivate" : "Click to activate"}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-headline font-semibold text-obsidian text-base">{item.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-mono rounded-full border ${
                      item.is_active
                        ? "bg-chlorophyll/10 text-chlorophyll-dark border-chlorophyll/20"
                        : "bg-surface-mist text-on-surface-variant border-outline-variant/50"
                    }`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{item.body}</p>

                  {item.image_url && (
                    <div className="mt-3 relative w-full max-w-sm h-40 rounded-xl overflow-hidden border border-surface-mist">
                      <Image
                        src={item.image_url}
                        alt="Announcement image"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 384px"
                      />
                    </div>
                  )}

                  <time className="text-xs font-mono text-on-surface-variant/60 mt-2 block">
                    {new Date(item.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </time>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="p-2 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors" title="Delete">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? "Edit Announcement" : "New Announcement"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Title *</label>
            <input
              className="input-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. App Update v1.2 — New Features"
            />
          </div>
          <div>
            <label className="label-field">Message *</label>
            <textarea
              className="input-field min-h-[120px] resize-y"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write your announcement here. This will be shown to all app users…"
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="label-field">Image (optional)</label>
            {imagePreview ? (
              <div className="relative mt-1.5 rounded-xl overflow-hidden border border-surface-mist bg-surface-mist group">
                <div className="relative w-full h-44">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="480px"
                    unoptimized={imagePreview.startsWith("data:")}
                  />
                </div>
                <div className="absolute inset-0 bg-obsidian-deep/0 group-hover:bg-obsidian-deep/40 transition-colors duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-obsidian-deep rounded-lg text-xs font-mono font-semibold hover:bg-white transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>upload</span>
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-error/90 text-white rounded-lg text-xs font-mono font-semibold hover:bg-error transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>delete</span>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 w-full h-28 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>add_photo_alternate</span>
                <span className="text-xs font-mono">Click to upload image</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-surface-mist rounded-lg">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                form.is_active ? "bg-chlorophyll-dark" : "bg-outline-variant"
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.is_active ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
            <div>
              <p className="text-sm font-medium text-obsidian">Publish immediately</p>
              <p className="text-xs text-on-surface-variant">When active, this announcement is visible to all app users.</p>
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !form.title || !form.body}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Publish"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
