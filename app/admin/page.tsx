import { createClient } from "@/lib/supabase/server";

async function getStats() {
  const supabase = await createClient();
  const [bands, artists, venues, albums, announcements] = await Promise.all([
    supabase.from("bands").select("id", { count: "exact", head: true }),
    supabase.from("artists").select("id", { count: "exact", head: true }),
    supabase.from("venues").select("id", { count: "exact", head: true }),
    supabase.from("albums").select("id", { count: "exact", head: true }),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);
  return {
    bands: bands.count ?? 0,
    artists: artists.count ?? 0,
    venues: venues.count ?? 0,
    albums: albums.count ?? 0,
    announcements: announcements.count ?? 0,
  };
}

async function getRecentAnnouncements() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([
    getStats(),
    getRecentAnnouncements(),
  ]);

  const metricCards = [
    {
      icon: "group",
      label: "Total Bands",
      value: stats.bands,
      href: "/admin/bands",
      highlight: false,
    },
    {
      icon: "person",
      label: "Artists",
      value: stats.artists,
      href: "/admin/artists",
      highlight: false,
    },
    {
      icon: "location_on",
      label: "Venues",
      value: stats.venues,
      href: "/admin/venues",
      highlight: false,
    },
    {
      icon: "campaign",
      label: "Active Announcements",
      value: stats.announcements,
      href: "/admin/announcements",
      highlight: true,
    },
  ];

  return (
    <div className="p-16 min-h-full bg-background page-enter">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <header
        className="flex justify-between items-center mb-12 animate-fade-in-up"
        style={{ animationDelay: "0ms" }}
      >
        <div>
          <h2 className="font-headline font-bold text-[40px] leading-tight tracking-tight text-obsidian-deep">
            Overview
          </h2>
          <p className="font-sans text-base text-on-surface-variant mt-1">
            Welcome back, Administrator. Here&apos;s what&apos;s happening
            today.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              style={{ fontSize: "18px" }}
            >
              search
            </span>
            <input
              className="bg-surface-mist border-none rounded-full pl-10 pr-5 py-2 w-60 font-sans text-sm focus:ring-2 focus:ring-chlorophyll-green transition-all duration-200 outline-none"
              placeholder="Search platform…"
              type="text"
              readOnly
            />
          </div>
          <div className="w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center border-2 border-surface-mist">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontSize: "20px" }}
            >
              admin_panel_settings
            </span>
          </div>
        </div>
      </header>

      {/* ─── Metric Cards ────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {metricCards.map((card, i) => (
          <a
            key={card.label}
            href={card.href}
            className={`p-6 rounded-xl shadow-sm flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300 cursor-pointer animate-scale-in ${
              card.highlight
                ? "bg-primary-container hover:shadow-[0_16px_32px_rgba(110,227,132,0.3)]"
                : "bg-pure-white border border-surface-mist hover:border-chlorophyll-green hover:shadow-[0_12px_24px_rgba(15,21,9,0.07)]"
            }`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div>
              <span
                className={`material-symbols-outlined mb-4 block ${
                  card.highlight ? "text-on-primary-container" : "text-primary"
                }`}
                style={{
                  fontSize: "24px",
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {card.icon}
              </span>
              <p
                className={`font-mono text-[11px] uppercase tracking-widest ${
                  card.highlight
                    ? "text-on-primary-container/70"
                    : "text-on-surface-variant"
                }`}
              >
                {card.label}
              </p>
            </div>
            <div className="mt-4">
              <span
                className={`font-headline font-bold text-2xl ${
                  card.highlight ? "text-on-primary-container" : "text-on-surface"
                }`}
              >
                {card.value.toLocaleString()}
              </span>
            </div>
          </a>
        ))}
      </section>

      {/* ─── Main Content Area ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Announcements (2/3 width) */}
        <div
          className="lg:col-span-2 animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="bg-pure-white rounded-xl border border-surface-mist overflow-hidden">
            <div className="p-6 border-b border-surface-mist flex justify-between items-center">
              <h3 className="font-headline font-semibold text-2xl">
                Recent Announcements
              </h3>
              <a
                href="/admin/announcements"
                className="text-primary font-mono text-sm hover:underline transition-colors"
              >
                View All
              </a>
            </div>

            <div className="divide-y divide-surface-mist">
              {recent.length === 0 ? (
                <div className="p-12 text-center">
                  <span
                    className="material-symbols-outlined text-on-surface-variant/25 mb-3 block mx-auto"
                    style={{ fontSize: "48px" }}
                  >
                    campaign
                  </span>
                  <p className="font-sans text-sm text-on-surface-variant">
                    No announcements yet.
                  </p>
                  <a
                    href="/admin/announcements"
                    className="mt-4 inline-block text-primary font-mono text-sm hover:underline"
                  >
                    Create first →
                  </a>
                </div>
              ) : (
                recent.map((a, i) => (
                  <div
                    key={a.id}
                    className="p-6 flex items-start gap-4 hover:bg-surface transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${460 + i * 70}ms` }}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        a.is_active
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px" }}
                      >
                        campaign
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-semibold text-sm text-on-surface truncate">
                        {a.title}
                      </p>
                      <p className="font-sans text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                        {a.body}
                      </p>
                      <p className="font-mono text-xs text-on-surface-variant mt-1.5 flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            a.is_active ? "bg-primary" : "bg-outline-variant"
                          }`}
                        />
                        {new Date(a.created_at).toLocaleDateString()} •{" "}
                        {a.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Side panel (1/3 width) */}
        <div
          className="space-y-6 animate-fade-in-up"
          style={{ animationDelay: "440ms" }}
        >
          {/* Content Summary dark card */}
          <div className="bg-obsidian-deep text-pure-white rounded-xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-headline font-semibold text-2xl mb-5">
                Content Summary
              </h3>
              <ul className="space-y-4">
                {[
                  { label: "Albums", value: stats.albums, icon: "album", href: "/admin/albums" },
                  { label: "Bands", value: stats.bands, icon: "group", href: "/admin/bands" },
                  { label: "Artists", value: stats.artists, icon: "person", href: "/admin/artists" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center justify-between">
                    <a
                      href={item.href}
                      className="flex items-center gap-3 hover:opacity-75 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "16px" }}
                        >
                          {item.icon}
                        </span>
                      </div>
                      <span className="font-sans text-sm">{item.label}</span>
                    </a>
                    <span className="text-chlorophyll-green font-mono text-sm font-medium">
                      {item.value.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Decorative glow */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-chlorophyll-green/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Quick action card */}
          <div className="bg-surface-mist rounded-xl p-6 border-2 border-dashed border-outline-variant flex flex-col items-center text-center hover:border-primary/30 transition-colors duration-300">
            <span
              className="material-symbols-outlined text-secondary mb-3"
              style={{ fontSize: "40px" }}
            >
              campaign
            </span>
            <h4 className="font-headline font-semibold text-xl text-secondary">
              Broadcast
            </h4>
            <p className="font-sans text-sm text-on-surface-variant mt-2 mb-4 leading-relaxed">
              Write announcements that reach all app users via Supabase
              Realtime.
            </p>
            <a
              href="/admin/announcements"
              className="w-full bg-pure-white text-obsidian-deep border border-outline-variant py-2.5 rounded-lg font-mono text-sm hover:bg-surface-variant hover:border-primary/20 transition-all duration-200 text-center"
            >
              Create Announcement
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
