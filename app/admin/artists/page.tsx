"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ArtistRow = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  display_picture: string | null;
  created_at: string;
  band_count: number;
};

export default function ArtistsPage() {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const supabase = createClient();

  const fetchArtists = useCallback(async () => {
    setLoading(true);

    const [{ data: profiles }, { data: memberships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, username, email, display_picture, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("band_members").select("user_id"),
    ]);

    const bandCountMap: Record<string, number> = {};
    for (const m of memberships ?? []) {
      bandCountMap[m.user_id] = (bandCountMap[m.user_id] ?? 0) + 1;
    }

    setArtists(
      (profiles ?? []).map((p) => ({ ...p, band_count: bandCountMap[p.id] ?? 0 }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  const filtered = artists.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.name ?? "").toLowerCase().includes(q) ||
      (a.username ?? "").toLowerCase().includes(q) ||
      (a.email ?? "").toLowerCase().includes(q)
    );
  });

  const withBands = artists.filter((a) => a.band_count > 0).length;

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-obsidian">Artists</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {loading ? "" : `${artists.length} registered · ${withBands} in a band`}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-outline-variant/40">
          <input
            className="input-field max-w-xs"
            placeholder="Search by name, username, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  {["Artist", "Email", "Joined", "Bands"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((artist, i) => {
                  const displayName = artist.name || artist.username || "—";
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <tr
                      key={artist.id}
                      className="hover:bg-surface-low/40 transition-colors spring-row"
                      style={{ animationDelay: `${i * 28}ms` }}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-surface-mist overflow-hidden shrink-0 flex items-center justify-center">
                            {artist.display_picture ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={artist.display_picture}
                                alt={displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-mono text-sm font-semibold text-primary">{initial}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-obsidian">{artist.name || "—"}</p>
                            <p className="text-xs text-on-surface-variant font-mono">
                              {artist.username ? `@${artist.username}` : "no username"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm text-on-surface-variant">
                        {artist.email ?? "—"}
                      </td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {new Date(artist.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="table-cell">
                        {artist.band_count > 0 ? (
                          <span className="px-2 py-0.5 bg-chlorophyll/10 text-chlorophyll-dark text-xs font-mono rounded-full border border-chlorophyll/20">
                            {artist.band_count} {artist.band_count === 1 ? "band" : "bands"}
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant/40 font-mono">none</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
