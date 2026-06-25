"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { href: "/admin/bands", label: "Bands", icon: "group" },
  { href: "/admin/artists", label: "Artists", icon: "person" },
  { href: "/admin/venues", label: "Venues", icon: "location_on" },
  { href: "/admin/albums", label: "Albums", icon: "album" },
  { href: "/admin/announcements", label: "Announcements", icon: "campaign" },
];

const bottomItems = [
  { href: "/download", label: "View Site", icon: "open_in_new" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("bandapa_remember");
    sessionStorage.removeItem("bandapa_session");
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-[280px] shrink-0 bg-obsidian-deep flex flex-col p-6 sidebar-scroll overflow-y-auto">
      {/* Logo — fade in */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center gap-3 mb-1">
          <Image
            src="/static/app-logo.png"
            alt="Bandapa"
            width={40}
            height={40}
            className="object-contain"
          />
          <span className="font-headline font-bold text-pure-white text-lg tracking-tight">
            Bandapa
          </span>
        </div>
        <p className="font-mono text-[11px] text-pure-white/45 tracking-wider">
          Management Portal
        </p>
      </div>

      {/* Navigation — staggered fade in */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item, i) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <a
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-mono text-sm animate-fade-in ${
                isActive
                  ? "text-chlorophyll-green bg-white/10"
                  : "text-pure-white/65 hover:bg-white/[0.06] hover:text-pure-white"
              }`}
              style={{ animationDelay: `${60 + i * 45}ms` }}
            >
              {/* Active left-border indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-chlorophyll-green rounded-r-full" />
              )}
              <span
                className="material-symbols-outlined shrink-0"
                style={{
                  fontSize: "20px",
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="pt-5 border-t border-white/10 space-y-1 animate-fade-in"
        style={{ animationDelay: "400ms" }}
      >
        {/* New Announcement CTA */}
        <a
          href="/admin/announcements"
          className="w-full bg-chlorophyll-green text-obsidian-deep py-3 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-2 mb-3 hover:brightness-110 hover:shadow-[0_4px_20px_rgba(110,227,132,0.4)] active:scale-95 transition-all duration-200"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            add
          </span>
          New Announcement
        </a>

        {/* Switch to User */}
        <a
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 text-chlorophyll-green/70 hover:bg-white/[0.06] hover:text-chlorophyll-green transition-all duration-200 rounded-lg font-mono text-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>
            switch_account
          </span>
          Switch to User
        </a>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-pure-white/65 hover:bg-white/[0.06] hover:text-pure-white transition-all duration-200 rounded-lg font-mono text-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            logout
          </span>
          Logout
        </button>
      </div>
    </aside>
  );
}
