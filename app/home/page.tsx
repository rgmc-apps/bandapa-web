import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export const metadata = {
  title: "Bandapa | Home",
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const apkUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ?? "#";
  const displayName = user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-pure-white text-on-surface font-sans">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-pure-white/92 backdrop-blur-xl border-b border-surface-mist">
        <div className="flex justify-between items-center h-16 px-4 md:px-16 max-w-[1280px] mx-auto">
          <Link href="/home" className="flex items-center gap-2.5 group">
            <Image
              src="/static/app-logo.png"
              alt="Bandapa Logo"
              width={32}
              height={32}
              className="object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <span className="font-headline font-bold text-obsidian-deep text-lg tracking-tight">
              Bandapa
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block font-mono text-xs text-secondary truncate max-w-[200px]">
              {user.email}
            </span>
            <SignOutButton className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-mono transition-colors duration-200 cursor-pointer" />
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero */}
        <section className="relative min-h-[60vh] flex items-center hero-gradient overflow-hidden">
          <div className="absolute top-1/4 right-[10%] w-[400px] h-[400px] bg-chlorophyll-green/10 blur-[100px] rounded-full animate-float pointer-events-none" />
          <div className="absolute bottom-0 left-[5%] w-[240px] h-[240px] bg-primary/5 blur-[60px] rounded-full animate-float pointer-events-none" style={{ animationDelay: "2s" }} />

          <div className="max-w-[1280px] mx-auto px-4 md:px-16 w-full py-20">
            <p className="font-mono text-xs text-primary uppercase tracking-[0.15em] mb-5 animate-fade-in-up">
              — Welcome back
            </p>
            <h1
              className="font-headline font-bold text-5xl md:text-[64px] leading-none tracking-tighter mb-6 animate-fade-in-up"
              style={{ animationDelay: "60ms" }}
            >
              Hey,{" "}
              <span className="text-primary italic">{displayName}</span>
            </h1>
            <p
              className="font-sans text-lg text-secondary max-w-lg leading-relaxed animate-fade-in-up"
              style={{ animationDelay: "140ms" }}
            >
              Your Bandapa account is active. Download the Android app to start
              connecting with bands, venues, and the live music scene.
            </p>

            <div
              className="flex flex-wrap gap-4 pt-8 animate-fade-in-up"
              style={{ animationDelay: "220ms" }}
            >
              <a
                href={apkUrl}
                download
                className="inline-flex items-center gap-3 px-8 py-4 bg-chlorophyll-green text-obsidian-deep rounded-xl font-headline font-bold text-base hover:opacity-90 hover:shadow-[0_0_32px_rgba(110,227,132,0.4)] active:scale-[0.98] transition-all duration-300"
                style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
                >
                  android
                </span>
                Download the App
              </a>
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-surface-mist text-on-surface rounded-xl font-headline font-semibold text-base hover:bg-surface-mist hover:border-outline-variant active:scale-[0.98] transition-all duration-300"
                style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
              >
                Install guide
              </Link>
            </div>
          </div>
        </section>

        {/* Info cards */}
        <section className="py-20 bg-surface">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "groups",
                  title: "Join a Band",
                  body: "Use the invite code from your band leader to join or create your own band and manage your roster.",
                },
                {
                  icon: "calendar_month",
                  title: "Manage Gigs",
                  body: "Coordinate rehearsals, schedule performances, and keep every event organized in one place.",
                },
                {
                  icon: "campaign",
                  title: "Stay Updated",
                  body: "Receive real-time announcements from venues and bands you follow directly in the app.",
                },
              ].map(({ icon, title, body }, i) => (
                <div
                  key={title}
                  className="bg-pure-white rounded-2xl p-8 border border-surface-mist hover:shadow-[0_16px_32px_rgba(15,21,9,0.07)] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-12 h-12 bg-primary-container/20 text-primary rounded-xl flex items-center justify-center mb-5">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}
                    >
                      {icon}
                    </span>
                  </div>
                  <h3 className="font-headline font-semibold text-lg mb-2">{title}</h3>
                  <p className="font-sans text-sm text-secondary leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Account info */}
        <section className="py-20 bg-pure-white">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16">
            <div className="bg-surface-mist rounded-3xl p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <p className="font-mono text-xs text-primary uppercase tracking-[0.15em] mb-3">Your account</p>
                <p className="font-headline font-semibold text-xl">{user.email}</p>
                <p className="font-mono text-xs text-secondary mt-1">
                  ID: {user.id.slice(0, 8)}…
                </p>
              </div>
              <SignOutButton className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant rounded-xl text-sm font-mono text-on-surface-variant hover:border-error hover:text-error transition-all duration-200 cursor-pointer" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-mist py-8 px-4 md:px-16 max-w-[1280px] mx-auto flex justify-between items-center">
        <p className="font-sans text-sm text-secondary">© {new Date().getFullYear()} Bandapa</p>
        <Link href="/download" className="font-mono text-xs text-secondary hover:text-primary transition-colors">
          Download Page
        </Link>
      </footer>
    </div>
  );
}
