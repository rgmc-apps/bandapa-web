import Image from "next/image";
import PlatformNav from "@/components/PlatformNav";
import ScrollReveal from "@/components/ScrollReveal";
import DownloadButton from "@/components/DownloadButton";
import ParticleNetwork from "@/components/ParticleNetwork";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Bandapa | Band Management Platform",
  description:
    "The web platform for serious musicians. Manage your band, schedule rehearsals, resolve conflicts, and find venues — all in one place.",
  openGraph: {
    title: "Bandapa | Band Management Platform",
    description:
      "The web platform for serious musicians. Manage your band, schedule rehearsals, resolve conflicts, and find venues — all in one place.",
    type: "website",
    siteName: "Bandapa",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bandapa | Band Management Platform",
    description:
      "The web platform for serious musicians. Manage your band, schedule rehearsals, resolve conflicts, and find venues — all in one place.",
  },
};

export default async function IndexPage() {
  const apkUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ?? "#";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .single();
    isAdmin = !!data;
  }

  return (
    <div className="bg-obsidian-deep text-pure-white font-sans overflow-x-hidden">
      <PlatformNav apkUrl={apkUrl} user={user} isAdmin={isAdmin} />

      <main>
        {/* ─── Hero ────────────────────────────────────────────────────── */}
        <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
          <ParticleNetwork className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />

          {/* Ambient glows */}
          <div className="absolute top-[20%] right-[8%] w-[600px] h-[600px] bg-chlorophyll-green/[0.06] blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[10%] left-[5%] w-[360px] h-[360px] bg-chlorophyll-green/[0.04] blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-[1280px] mx-auto px-4 md:px-16 w-full grid md:grid-cols-[1fr_1.1fr] gap-16 items-center py-28 md:py-0 md:min-h-[100dvh]">
            {/* Left — headline */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-chlorophyll-green/10 border border-chlorophyll-green/20 rounded-full font-mono text-[11px] text-chlorophyll-green/80 uppercase tracking-[0.15em] animate-fade-in-up">
                <span className="w-1.5 h-1.5 rounded-full bg-chlorophyll-green animate-pulse" />
                Web Platform
              </div>

              <h1
                className="font-headline font-bold text-[52px] md:text-[72px] lg:text-[84px] leading-[0.92] tracking-[-0.03em] animate-fade-in-up"
                style={{ animationDelay: "80ms" }}
              >
                Run your band{" "}
                <span className="text-chlorophyll-green italic">like a pro.</span>
              </h1>

              <p
                className="font-sans text-base md:text-lg text-pure-white/50 max-w-[42ch] leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "180ms" }}
              >
                Bandapa gives your band a shared command center — scheduling,
                member management, conflict resolution, and venue coordination,
                all in one browser tab.
              </p>

              <div
                className="flex flex-wrap gap-3 animate-fade-in-up"
                style={{ animationDelay: "280ms" }}
              >
                <a
                  href={user ? "/dashboard" : "/login"}
                  className="px-7 py-3.5 bg-chlorophyll-green text-obsidian-deep rounded-full font-mono font-bold text-sm hover:opacity-90 hover:shadow-[0_0_40px_rgba(110,227,132,0.35)] active:scale-[0.97] transition-all duration-200"
                >
                  {user ? "Go to Dashboard →" : "Start for free →"}
                </a>
                <a
                  href="#platform"
                  className="px-7 py-3.5 border border-white/10 text-pure-white/60 rounded-full font-mono text-sm hover:border-white/25 hover:text-pure-white/80 active:scale-[0.97] transition-all duration-200"
                >
                  See features
                </a>
              </div>

              {/* Social proof row */}
              <div
                className="flex items-center gap-6 pt-2 animate-fade-in-up"
                style={{ animationDelay: "380ms" }}
              >
                <div className="flex -space-x-2.5">
                  {["#6EE384", "#3b82f6", "#f59e0b", "#ec4899"].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-obsidian-deep"
                        style={{ background: color }}
                      />
                    )
                  )}
                </div>
                <p className="font-mono text-xs text-pure-white/35">
                  Bands already managing their schedules
                </p>
              </div>
            </div>

            {/* Right — dashboard UI mockup */}
            <div
              className="hidden md:block animate-slide-right"
              style={{ animationDelay: "200ms" }}
            >
              <div className="relative">
                {/* Glow behind mockup */}
                <div className="absolute inset-0 bg-chlorophyll-green/[0.08] blur-[80px] rounded-[2rem] scale-90 translate-y-4" />

                {/* Browser frame */}
                <div className="relative bg-[#1a1f12] rounded-2xl border border-white/[0.07] shadow-[0_40px_80px_rgba(0,0,0,0.5)] overflow-hidden">
                  {/* Chrome bar */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#141910]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                      <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                      <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 bg-[#0f1509]/60 rounded-md px-3 py-1 text-[11px] font-mono text-white/25 border border-white/[0.05]">
                      bandapa.app/dashboard
                    </div>
                  </div>

                  {/* App interior */}
                  <div className="flex h-[400px]">
                    {/* Sidebar */}
                    <div className="w-[160px] shrink-0 border-r border-white/[0.05] bg-[#0f1509]/50 p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 px-2 py-2 mb-3">
                        <div className="w-6 h-6 rounded-md bg-chlorophyll-green/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-chlorophyll-green" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}>music_note</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-pure-white/70">Bandapa</span>
                      </div>
                      {[
                        { icon: "dashboard", label: "Overview", active: false },
                        { icon: "groups", label: "Bands", active: true },
                        { icon: "calendar_month", label: "Schedule", active: false },
                        { icon: "location_on", label: "Venues", active: false },
                        { icon: "warning", label: "Conflicts", active: false },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-mono transition-colors ${
                            item.active
                              ? "bg-chlorophyll-green/15 text-chlorophyll-green"
                              : "text-white/30"
                          }`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                          {item.label}
                        </div>
                      ))}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 p-4 overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-0.5">My Bands</p>
                          <p className="text-sm font-headline font-semibold text-white/80">3 active bands</p>
                        </div>
                        <div className="px-3 py-1.5 bg-chlorophyll-green text-obsidian-deep text-[10px] font-mono font-bold rounded-full">+ New Band</div>
                      </div>

                      {/* Band cards */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { name: "Meridian", genre: "Indie Rock", color: "#6EE384", members: 4 },
                          { name: "Nocturn", genre: "Post-metal", color: "#818cf8", members: 5 },
                          { name: "Solstice", genre: "Jazz Fusion", color: "#fb923c", members: 3 },
                          { name: "Waveform", genre: "Electronic", color: "#34d399", members: 2 },
                        ].map((band) => (
                          <div
                            key={band.name}
                            className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.05] hover:border-white/10 transition-colors"
                          >
                            <div
                              className="w-8 h-8 rounded-lg mb-2 flex items-center justify-center text-[13px] font-headline font-bold text-obsidian-deep"
                              style={{ background: band.color }}
                            >
                              {band.name.charAt(0)}
                            </div>
                            <p className="text-[11px] font-semibold text-white/80">{band.name}</p>
                            <p className="text-[10px] font-mono text-white/30 mt-0.5">{band.genre}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <span className="material-symbols-outlined text-white/20" style={{ fontSize: "11px" }}>person</span>
                              <span className="text-[10px] font-mono text-white/20">{band.members}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Capability strip ────────────────────────────────────────── */}
        <div className="border-y border-white/[0.05] bg-[#0c110a]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {[
                "Band Management",
                "Rehearsal Scheduling",
                "Conflict Detection",
                "Venue Discovery",
                "Member Invites",
                "Role-Based Access",
                "Social Links",
                "Mobile App",
              ].map((cap, i) => (
                <div key={cap} className="flex items-center gap-3">
                  {i > 0 && <span className="hidden sm:block w-px h-3 bg-white/10" />}
                  <span className="font-mono text-xs text-white/35 uppercase tracking-[0.12em]">
                    {cap}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Platform / Feature Bento ─────────────────────────────────── */}
        <section className="py-28 bg-[#111708]" id="platform">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <ScrollReveal className="mb-16">
              <p className="font-mono text-xs text-chlorophyll-green/60 uppercase tracking-[0.2em] mb-5">
                — Platform
              </p>
              <div className="grid md:grid-cols-2 gap-6 items-end">
                <h2 className="font-headline font-bold text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.025em]">
                  Everything your band needs to operate.
                </h2>
                <p className="font-sans text-base text-white/40 leading-relaxed max-w-[40ch]">
                  From first rehearsal to sold-out show — Bandapa handles the
                  logistics so you can focus on the music.
                </p>
              </div>
            </ScrollReveal>

            {/* Bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-2 gap-4 md:h-[620px]">
              {/* Band Hub — large 2×2 */}
              <ScrollReveal className="md:col-span-5 md:row-span-2 flex">
                <div className="bg-[#161d10] rounded-2xl p-8 flex flex-col justify-between border border-white/[0.06] group hover:border-chlorophyll-green/20 transition-colors duration-500 flex-1 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-chlorophyll-green/[0.04] to-transparent pointer-events-none" />
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-chlorophyll-green/10 border border-chlorophyll-green/20 flex items-center justify-center mb-8">
                      <span className="material-symbols-outlined text-chlorophyll-green" style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}>groups</span>
                    </div>
                    <h3 className="font-headline font-bold text-[32px] leading-tight tracking-tight mb-4">
                      Band Hub
                    </h3>
                    <p className="font-sans text-sm text-white/40 leading-relaxed max-w-[34ch]">
                      One profile for your entire band. Members, roles, genres,
                      social links, and invite codes — all managed from a single
                      dashboard.
                    </p>
                  </div>

                  {/* Mini band card mockup */}
                  <div className="mt-8 bg-[#0f1509] rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-chlorophyll-green flex items-center justify-center font-headline font-bold text-obsidian-deep">M</div>
                      <div>
                        <p className="text-sm font-semibold text-white/80">Meridian</p>
                        <p className="text-xs font-mono text-white/30">Indie Rock · 4 members</p>
                      </div>
                      <div className="ml-auto px-2 py-1 bg-chlorophyll-green/10 rounded-full text-[10px] font-mono text-chlorophyll-green border border-chlorophyll-green/20">Owner</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["Indie", "Rock", "Alternative"].map((g) => (
                        <span key={g} className="px-2 py-0.5 rounded-full bg-white/[0.05] text-[10px] font-mono text-white/40 border border-white/[0.07]">{g}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Scheduling */}
              <ScrollReveal delay={80} className="md:col-span-7 flex">
                <div className="bg-[#161d10] rounded-2xl p-8 flex items-center gap-8 border border-white/[0.06] group hover:border-white/10 transition-colors duration-300 flex-1 relative overflow-hidden">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-white/50" style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                    </div>
                    <h3 className="font-headline font-bold text-2xl mb-2">Rehearsal Scheduling</h3>
                    <p className="font-sans text-sm text-white/40 leading-relaxed max-w-[32ch]">
                      Book rehearsals, studio sessions, and gigs. Personal
                      calendars overlay band events so nothing collides.
                    </p>
                  </div>
                  {/* Mini calendar mockup */}
                  <div className="hidden lg:block shrink-0 bg-[#0f1509] rounded-xl border border-white/[0.06] p-4 w-[200px]">
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">June 2026</p>
                    <div className="grid grid-cols-7 gap-1">
                      {["M","T","W","T","F","S","S"].map((d, i) => (
                        <div key={i} className="text-[9px] font-mono text-white/20 text-center">{d}</div>
                      ))}
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                        <div
                          key={d}
                          className={`text-[10px] font-mono text-center py-0.5 rounded ${
                            d === 18 ? "bg-chlorophyll-green text-obsidian-deep font-bold" :
                            [12, 25].includes(d) ? "bg-white/10 text-white/60" :
                            "text-white/25"
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Conflict Detection */}
              <ScrollReveal delay={160} className="md:col-span-4 flex">
                <div className="bg-[#1a1107] rounded-2xl p-8 border border-white/[0.06] group hover:border-[#fb923c]/20 transition-colors duration-300 flex-1 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-[#fb923c]/10 border border-[#fb923c]/20 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[#fb923c]" style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </div>
                  <h3 className="font-headline font-bold text-2xl mb-2">Conflict Detection</h3>
                  <p className="font-sans text-sm text-white/40 leading-relaxed">
                    When a band event clashes with a member&apos;s personal
                    schedule, the system flags it and lets the band vote to
                    cancel or proceed.
                  </p>
                </div>
              </ScrollReveal>

              {/* Venues */}
              <ScrollReveal delay={240} className="md:col-span-3 flex">
                <div className="bg-[#0e1519] rounded-2xl p-8 border border-white/[0.06] group hover:border-[#38bdf8]/20 transition-colors duration-300 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[#38bdf8]" style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  </div>
                  <h3 className="font-headline font-bold text-2xl mb-2">Venue Map</h3>
                  <p className="font-sans text-sm text-white/40 leading-relaxed">
                    Studios, bars, rehearsal spaces — discover and book venues
                    with address-level precision.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─── Features showcase ────────────────────────────────────────── */}
        <section className="py-28 bg-obsidian-deep" id="features">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <ScrollReveal className="mb-20">
              <p className="font-mono text-xs text-chlorophyll-green/60 uppercase tracking-[0.2em] mb-5">
                — Features
              </p>
              <h2 className="font-headline font-bold text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.025em] max-w-[18ch]">
                Designed for how bands actually work.
              </h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-px bg-white/[0.05]">
              {[
                {
                  icon: "lock",
                  label: "Secure Invites",
                  desc: "6-character codes give new members instant access without manual approvals. Revoke anytime.",
                  color: "text-chlorophyll-green",
                  bg: "bg-chlorophyll-green/10",
                  border: "border-chlorophyll-green/20",
                },
                {
                  icon: "shield_person",
                  label: "Role-Based Access",
                  desc: "Band admins control who can edit schedules, update band info, and manage members.",
                  color: "text-[#a78bfa]",
                  bg: "bg-[#a78bfa]/10",
                  border: "border-[#a78bfa]/20",
                },
                {
                  icon: "music_note",
                  label: "Genre & Identity",
                  desc: "Tag your band's genres and link Spotify, Instagram, YouTube — one unified band profile.",
                  color: "text-[#38bdf8]",
                  bg: "bg-[#38bdf8]/10",
                  border: "border-[#38bdf8]/20",
                },
                {
                  icon: "how_to_vote",
                  label: "Conflict Voting",
                  desc: "The whole band votes on whether to cancel or push through when schedules conflict.",
                  color: "text-[#fb923c]",
                  bg: "bg-[#fb923c]/10",
                  border: "border-[#fb923c]/20",
                },
                {
                  icon: "person",
                  label: "Artist Profiles",
                  desc: "Every member gets a public profile listing instruments, band roles, and connected accounts.",
                  color: "text-[#34d399]",
                  bg: "bg-[#34d399]/10",
                  border: "border-[#34d399]/20",
                },
                {
                  icon: "sync",
                  label: "Real-time Updates",
                  desc: "All changes sync instantly across your band — no refreshing, no stale data.",
                  color: "text-chlorophyll-green",
                  bg: "bg-chlorophyll-green/10",
                  border: "border-chlorophyll-green/20",
                },
              ].map((feat, i) => (
                <ScrollReveal key={feat.label} delay={i * 60}>
                  <div className="bg-obsidian-deep p-8 md:p-10 group hover:bg-[#111708] transition-colors duration-300">
                    <div className={`w-11 h-11 rounded-xl ${feat.bg} border ${feat.border} flex items-center justify-center mb-6`}>
                      <span className={`material-symbols-outlined ${feat.color}`} style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>{feat.icon}</span>
                    </div>
                    <h3 className="font-headline font-semibold text-lg mb-3">{feat.label}</h3>
                    <p className="font-sans text-sm text-white/40 leading-relaxed">{feat.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─────────────────────────────────────────────── */}
        <section className="py-28 bg-[#0c110a]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <ScrollReveal className="mb-16 text-center">
              <p className="font-mono text-xs text-chlorophyll-green/60 uppercase tracking-[0.2em] mb-5">
                — Get started
              </p>
              <h2 className="font-headline font-bold text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.025em]">
                Up and running in minutes.
              </h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {[
                {
                  n: "01",
                  title: "Create your account",
                  desc: "Sign up with your email. Set up your artist profile — instruments, roles, and a bio.",
                },
                {
                  n: "02",
                  title: "Start or join a band",
                  desc: "Create a new band or enter an invite code to join one. Your band page is live immediately.",
                },
                {
                  n: "03",
                  title: "Manage together",
                  desc: "Schedule events, resolve conflicts, and keep every member in sync from the web dashboard.",
                },
              ].map((step, i) => (
                <ScrollReveal key={step.n} delay={i * 100}>
                  <div className="relative">
                    <div className="font-mono text-[72px] font-bold leading-none text-white/[0.04] mb-4 select-none">
                      {step.n}
                    </div>
                    <div className="absolute top-0 left-0 w-8 h-px bg-chlorophyll-green/40 mt-9 ml-0" />
                    <h3 className="font-headline font-bold text-2xl mb-3">{step.title}</h3>
                    <p className="font-sans text-sm text-white/40 leading-relaxed">{step.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Mobile section ───────────────────────────────────────────── */}
        <section className="py-28 bg-[#111708]" id="mobile">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <ScrollReveal className="mb-16">
              <p className="font-mono text-xs text-chlorophyll-green/60 uppercase tracking-[0.2em] mb-5">
                — Mobile
              </p>
              <div className="grid md:grid-cols-2 gap-6 items-end">
                <h2 className="font-headline font-bold text-[40px] md:text-[52px] leading-[0.95] tracking-[-0.025em]">
                  Take the stage everywhere.
                </h2>
                <p className="font-sans text-sm text-white/40 leading-relaxed max-w-[38ch]">
                  The Bandapa mobile app gives you access to everything on the
                  go — available now for Android.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-6">
              {/* APK download card */}
              <ScrollReveal>
                <div className="bg-[#161d10] p-10 rounded-2xl border border-white/[0.06] h-full flex flex-col hover:border-chlorophyll-green/20 transition-colors duration-300">
                  <div className="w-14 h-14 bg-chlorophyll-green/10 border border-chlorophyll-green/20 rounded-xl flex items-center justify-center mb-8 shrink-0">
                    <span className="material-symbols-outlined text-chlorophyll-green text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>android</span>
                  </div>
                  <h3 className="font-headline font-semibold text-2xl mb-4">Download Bandapa</h3>
                  <p className="font-sans text-sm text-white/40 mb-8 leading-relaxed flex-1">
                    Get the latest Android package directly from our servers.
                    All core features included.
                  </p>
                  <DownloadButton href={apkUrl} />
                  <p className="mt-4 text-center font-mono text-xs text-white/20">
                    Free · Android 8.0+ · Direct Install
                  </p>
                </div>
              </ScrollReveal>

              {/* Install guide card */}
              <ScrollReveal delay={120}>
                <div className="bg-[#0f1509] p-10 rounded-2xl border border-white/[0.06] flex flex-col justify-between h-full hover:border-white/10 transition-colors duration-300">
                  <div>
                    <div className="w-14 h-14 bg-white/[0.05] border border-white/[0.08] rounded-xl flex items-center justify-center mb-8">
                      <span className="material-symbols-outlined text-white/40 text-3xl">menu_book</span>
                    </div>
                    <h3 className="font-headline font-semibold text-2xl mb-4">Install Guide</h3>
                    <ul className="space-y-5">
                      {[
                        'Enable "Install from Unknown Sources" in device security settings.',
                        "Download the APK using your mobile browser.",
                        'Open the file and tap "Install."',
                      ].map((step, i) => (
                        <li key={i} className="flex gap-4 font-sans text-sm text-white/40 leading-relaxed">
                          <span className="text-chlorophyll-green font-bold font-mono shrink-0 tabular-nums">0{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8 flex items-center gap-2 text-chlorophyll-green/50 font-mono text-xs">
                    <span className="flex-1">Settings → Apps → Special Access → Install Unknown Apps</span>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_forward</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24 bg-chlorophyll-green">
          <ScrollReveal>
            <div className="max-w-[1280px] mx-auto px-4 md:px-16 text-center">
              <p className="font-mono text-xs text-obsidian-deep/40 uppercase tracking-[0.2em] mb-6">
                — Join Bandapa
              </p>
              <h2 className="font-headline font-bold text-[40px] md:text-[64px] leading-[0.95] tracking-[-0.03em] text-obsidian-deep mb-8 max-w-[16ch] mx-auto">
                Your band&apos;s new home base.
              </h2>
              <p className="font-sans text-base text-obsidian-deep/60 max-w-[44ch] mx-auto mb-10">
                Start managing your band today — free, no credit card, no limits
                on members.
              </p>
              <a
                href={user ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-2 px-8 py-4 bg-obsidian-deep text-chlorophyll-green rounded-full font-mono font-bold text-sm hover:opacity-90 hover:shadow-[0_16px_40px_rgba(15,21,9,0.3)] active:scale-[0.97] transition-all duration-200"
              >
                {user ? "Go to Dashboard" : "Get started free"}
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
              </a>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-[#0a0e07] border-t border-white/[0.05]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-16 py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-3">
            <a href="/" className="flex items-center gap-2.5">
              <Image
                src="/static/app-logo.png"
                alt="Bandapa"
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="font-mono font-bold text-white/70 text-sm tracking-widest uppercase">
                Bandapa
              </span>
            </a>
            <p className="font-sans text-xs text-white/20">
              © {new Date().getFullYear()} Bandapa. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { label: "Platform", href: "#platform" },
              { label: "Features", href: "#features" },
              { label: "Mobile", href: "#mobile" },
              { label: "Dashboard", href: "/dashboard" },
              { label: "Sign in", href: "/login" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
