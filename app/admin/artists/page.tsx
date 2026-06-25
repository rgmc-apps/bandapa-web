"use client";

import { useCallback, useEffect, useState } from "react";

type ArtistRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  display_picture: string | null;
  created_at: string;
  band_count: number;
};

export default function ArtistsPage() {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/artists");
    const json = await res.json();
    setArtists(json.artists ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  const filtered = artists.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.full_name ?? "").toLowerCase().includes(q) ||
      (a.username ?? "").toLowerCase().includes(q)
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
            placeholder="Search by name or username…"
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
                  {["Artist", "Joined", "Bands"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((artist, i) => {
                  const displayName = artist.full_name || artist.username || "—";
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
                            <p className="font-semibold text-sm text-obsidian">{artist.full_name || "—"}</p>
                            <p className="text-xs text-on-surface-variant font-mono">
                              {artist.username ? `@${artist.username}` : "no username"}
                            </p>
                          </div>
                        </div>
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
