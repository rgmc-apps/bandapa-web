import Image from "next/image";
import LandingNav from "@/components/LandingNav";
import ScrollReveal from "@/components/ScrollReveal";
import DownloadButton from "@/components/DownloadButton";
import ParticleNetwork from "@/components/ParticleNetwork";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Bandapa | The Pulse of Live Music",
  description:
    "Download the Bandapa app — connecting bands, venues, and fans through a high-precision digital ecosystem.",
};

export default async function DownloadPage() {
  const apkUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ?? "#";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <div className="bg-pure-white text-on-surface font-sans overflow-x-hidden">
      <LandingNav apkUrl={apkUrl} user={user} isAdmin={isAdmin} />

      <main className="pt-16">
        {/* ─── Hero ──────────────────────────────────────────────────── */}
        <section className="relative min-h-[100dvh] flex items-center hero-gradient overflow-hidden">
          {/* Particle network — behind all content */}
          <ParticleNetwork className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Ambient orbs */}
          <div
            className="absolute top-1/4 right-[15%] w-[480px] h-[480px] bg-chlorophyll-green/10 blur-[120px] rounded-full animate-float pointer-events-none"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="absolute bottom-[15%] left-[10%] w-[320px] h-[320px] bg-primary/5 blur-[80px] rounded-full animate-float pointer-events-none"
            style={{ animationDelay: "2.5s" }}
          />

          <div className="max-w-[1280px] mx-auto px-4 md:px-16 w-full grid md:grid-cols-2 gap-12 items-center">
            {/* Left — staggered entrance */}
            <div className="z-10 space-y-8 py-12">
              <div className="animate-fade-in-up inline-flex items-center gap-2 px-3 py-1 bg-primary-container/20 text-primary rounded-full font-mono text-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                LIVE IN 50+ CITIES
              </div>

              <h1
                className="font-headline font-bold text-5xl md:text-[68px] leading-none tracking-tighter animate-fade-in-up"
                style={{ animationDelay: "80ms" }}
              >
                Welcome to{" "}
                <span className="text-primary italic">Bandapa</span>
              </h1>

              <p
                className="font-sans text-lg text-secondary max-w-lg leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "180ms" }}
              >
                Connecting bands, venues, and fans through a high-precision
                digital ecosystem. Real-time scheduling, verified artist
                profiles, and seamless gig management.
              </p>

              <div
                className="flex flex-wrap gap-4 pt-4 animate-fade-in-up"
                style={{ animationDelay: "280ms" }}
              >
                <a
                  href="#download"
                  className="px-8 py-4 bg-obsidian-deep text-pure-white rounded-xl font-headline font-semibold text-lg hover:shadow-[0_16px_40px_rgba(15,21,9,0.2)] hover:-translate-y-0.5 active:-translate-y-[1px] active:scale-[0.98] transition-all duration-300 text-center"
                  style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
                >
                  Download App
                </a>
                <a
                  href="#features"
                  className="px-8 py-4 border-2 border-surface-mist text-on-surface rounded-xl font-headline font-semibold text-lg hover:bg-surface-mist hover:border-outline-variant active:scale-[0.98] transition-all duration-300 text-center"
                  style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
                >
                  Explore Features
                </a>
              </div>
            </div>

            {/* Right — glassmorphic card */}
            <div
              className="relative hidden md:block animate-slide-right"
              style={{ animationDelay: "380ms" }}
            >
              <div
                className="absolute -top-16 -right-16 w-96 h-96 bg-chlorophyll-green/20 blur-[100px] rounded-full animate-float pointer-events-none"
                style={{ animationDelay: "1s" }}
              />
              <div className="glass-card rounded-[2rem] p-8 border border-white/50 shadow-2xl transform rotate-3 hover:rotate-0 hover:shadow-[0_40px_80px_rgba(15,21,9,0.18)] transition-all duration-700 cursor-pointer">
                {/* Concert-style dark card */}
                <div className="rounded-xl w-full h-[300px] bg-gradient-to-br from-obsidian-deep via-[#0f1509] to-[#1a2e0e] flex items-end relative overflow-hidden">
                  {/* Background music icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-white/[0.07]"
                      style={{ fontSize: "160px", fontVariationSettings: "'FILL' 1" }}
                    >
                      music_note
                    </span>
                  </div>
                  {/* Green gradient shimmer at bottom */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(110,227,132,0.12) 0%, transparent 100%)",
                    }}
                  />
                  {/* Live badge + title */}
                  <div className="relative z-10 p-6 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-chlorophyll-green animate-pulse" />
                      <span className="text-chlorophyll-green font-mono text-[11px] uppercase tracking-[0.15em]">
                        Now Available
                      </span>
                    </div>
                    <p className="text-pure-white font-headline font-semibold text-xl">
                      Bandapa for Android
                    </p>
                  </div>
                </div>

                {/* Card footer */}
                <div className="mt-5 flex justify-between items-center">
                  <div>
                    <p className="font-mono text-[11px] text-secondary uppercase tracking-[0.12em]">
                      Version 1.0.0
                    </p>
                    <p className="font-headline font-semibold text-on-surface text-lg mt-0.5">
                      Free Download
                    </p>
                  </div>
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-pure-white bg-surface-dim" />
                    <div className="w-10 h-10 rounded-full border-2 border-pure-white bg-chlorophyll-green" />
                    <div className="w-10 h-10 rounded-full border-2 border-pure-white bg-secondary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Download Section ──────────────────────────────────────── */}
        <section className="py-24 bg-surface" id="download">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <ScrollReveal className="mb-16">
              <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end">
                <div>
                  <p className="font-mono text-xs text-primary uppercase tracking-[0.15em] mb-4">
                    — Android APK
                  </p>
                  <h2 className="font-headline font-bold text-[40px] md:text-[52px] leading-none tracking-tighter">
                    Take the stage<br />everywhere
                  </h2>
                </div>
                <p className="font-sans text-sm text-secondary leading-relaxed max-w-[36ch] md:pb-2">
                  The Bandapa mobile experience, optimized for professional
                  management and real-time community engagement.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-8">
              {/* APK Card */}
              <ScrollReveal>
                <div className="bg-pure-white p-10 rounded-3xl border border-surface-mist shadow-sm hover:shadow-[0_24px_48px_rgba(15,21,9,0.09)] hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <div className="w-16 h-16 bg-primary-container/20 text-primary rounded-2xl flex items-center justify-center mb-8 shrink-0">
                    <span
                      className="material-symbols-outlined text-4xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      android
                    </span>
                  </div>
                  <h3 className="font-headline font-semibold text-2xl mb-4">
                    Download Bandapa
                  </h3>
                  <p className="font-sans text-base text-secondary mb-8 leading-relaxed flex-1">
                    Get the latest Android application package directly from
                    our secure servers. Includes all features and core
                    management tools.
                  </p>
                  <DownloadButton href={apkUrl} />
                  <p className="mt-4 text-center font-mono text-xs text-on-surface-variant">
                    Free • Android 8.0+ • Direct Install
                  </p>
                </div>
              </ScrollReveal>

              {/* Guide Card */}
              <ScrollReveal delay={160}>
                <div className="bg-obsidian-deep p-10 rounded-3xl text-pure-white flex flex-col justify-between h-full hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,21,9,0.25)] transition-all duration-300">
                  <div>
                    <div className="w-16 h-16 bg-white/10 text-chlorophyll-green rounded-2xl flex items-center justify-center mb-8">
                      <span className="material-symbols-outlined text-4xl">
                        menu_book
                      </span>
                    </div>
                    <h3 className="font-headline font-semibold text-2xl mb-4">
                      Direct Install Guide
                    </h3>
                    <ul className="space-y-4">
                      {[
                        'Enable "Install from Unknown Sources" in your device security settings.',
                        "Download the APK file above using your mobile browser.",
                        'Open the file and tap "Install" to begin the setup.',
                      ].map((step, i) => (
                        <li
                          key={i}
                          className="flex gap-4 font-sans text-sm text-pure-white/70 leading-relaxed"
                        >
                          <span className="text-chlorophyll-green font-bold font-mono shrink-0 tabular-nums">
                            0{i + 1}.
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8 flex items-center gap-2 text-chlorophyll-green font-mono text-xs group cursor-default select-none">
                    <span className="flex-1">
                      Settings → Apps → Special Access → Install Unknown Apps
                    </span>
                    <span
                      className="material-symbols-outlined group-hover:translate-x-1 transition-transform duration-200"
                      style={{ fontSize: "16px" }}
                    >
                      arrow_forward
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─── Bento Grid / Features ─────────────────────────────────── */}
        <section className="py-24 bg-pure-white" id="features">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-auto md:h-[600px]">
              {/* Big left card (spans 2 cols × 2 rows) */}
              <ScrollReveal className="md:col-span-2 md:row-span-2 flex">
                <div className="bg-surface-mist rounded-[2rem] p-10 flex flex-col justify-end relative overflow-hidden group flex-1 cursor-default hover:bg-[#eaeaea] transition-colors duration-500">
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] group-hover:opacity-[0.06] transition-opacity duration-700">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "260px", fontVariationSettings: "'FILL' 1" }}
                    >
                      calendar_month
                    </span>
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-headline font-bold text-[40px] leading-tight tracking-tight mb-4">
                      Band & Gig Management
                    </h4>
                    <p className="font-sans text-base text-secondary leading-relaxed">
                      Coordinate rehearsals, manage your roster, and keep every
                      gig organized in one place.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Secure Invites (spans 2 cols) */}
              <ScrollReveal delay={120} className="md:col-span-2 flex">
                <div className="bg-secondary-container/30 rounded-[2rem] p-8 flex items-center justify-between border border-secondary-container/50 group flex-1 hover:bg-secondary-container/40 hover:-translate-y-1 transition-all duration-300 cursor-default">
                  <div>
                    <h4 className="font-headline font-semibold text-2xl">
                      Secure Invites
                    </h4>
                    <p className="font-sans text-sm text-on-secondary-container mt-1">
                      6-character codes for instant band membership.
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform duration-300"
                    style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1" }}
                  >
                    verified_user
                  </span>
                </div>
              </ScrollReveal>

              {/* Stat: 100% Free */}
              <ScrollReveal delay={240} className="flex">
                <div className="bg-primary-container rounded-[2rem] p-8 flex flex-col justify-center text-on-primary-container group hover:-translate-y-1 transition-all duration-300 cursor-default flex-1 hover:shadow-[0_16px_32px_rgba(110,227,132,0.25)]">
                  <p className="font-headline font-bold text-[40px] leading-none">
                    100%
                  </p>
                  <p className="font-mono text-xs uppercase tracking-wider mt-2 opacity-70">
                    Free to Use
                  </p>
                </div>
              </ScrollReveal>

              {/* Stat: Realtime */}
              <ScrollReveal delay={360} className="flex">
                <div className="bg-obsidian-deep rounded-[2rem] p-8 flex flex-col justify-center text-pure-white group hover:-translate-y-1 transition-all duration-300 cursor-default flex-1 relative overflow-hidden hover:shadow-[0_16px_32px_rgba(15,21,9,0.2)]">
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-chlorophyll-green/15 rounded-full blur-2xl group-hover:bg-chlorophyll-green/25 transition-all duration-500" />
                  <p className="font-headline font-bold text-[40px] leading-none relative z-10">
                    Live
                  </p>
                  <p className="font-mono text-xs uppercase tracking-wider mt-2 text-pure-white/60 relative z-10">
                    Realtime Updates
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="w-full bg-surface-container-lowest border-t border-surface-mist">
        <div className="flex flex-col md:flex-row justify-between items-center py-8 px-4 md:px-16 max-w-[1280px] mx-auto gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <Image
                src="/static/app-logo.png"
                alt="Bandapa Logo"
                width={36}
                height={36}
                className="object-contain"
              />
              <span className="font-mono font-bold text-obsidian-deep text-sm tracking-widest uppercase">
                Bandapa
              </span>
            </div>
            <p className="font-sans text-sm text-secondary">
              © {new Date().getFullYear()} Bandapa. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {["Terms", "Privacy", "Contact", "Twitter"].map((link) => (
              <a
                key={link}
                className="font-sans text-sm text-secondary hover:text-primary transition-colors duration-200"
                href="#"
              >
                {link}
              </a>
            ))}
          </div>

          <div className="flex gap-3">
            {[
              { icon: "language", label: "Language" },
              { icon: "share", label: "Share" },
            ].map(({ icon, label }) => (
              <button
                key={icon}
                title={label}
                className="w-8 h-8 rounded-full bg-surface-mist flex items-center justify-center text-obsidian-deep hover:bg-primary hover:text-pure-white transition-all duration-200 hover:scale-110"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  {icon}
                </span>
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
