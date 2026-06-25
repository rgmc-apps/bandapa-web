"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "home", exact: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: "calendar_month" },
  { href: "/dashboard/bands", label: "Bands", icon: "groups" },
  { href: "/dashboard/venues", label: "Venues", icon: "location_on" },
  { href: "/dashboard/profile", label: "Profile", icon: "person" },
];

interface DashboardShellProps {
  displayName: string;
  email: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}

export default function DashboardShell({ displayName, email, isAdmin, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(item: typeof navItems[number]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 bg-obsidian-deep flex-col p-6 sidebar-scroll overflow-y-auto">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-1">
            <Image src="/static/app-logo.png" alt="Bandapa" width={36} height={36} className="object-contain" />
            <span className="font-headline font-bold text-pure-white text-lg tracking-tight">Bandapa</span>
          </div>
          <p className="font-mono text-[11px] text-pure-white/45 tracking-wider truncate">{displayName}</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item, i) => {
            const active = isActive(item);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-mono text-sm animate-fade-in ${
                  active
                    ? "text-chlorophyll-green bg-white/10"
                    : "text-pure-white/65 hover:bg-white/[0.06] hover:text-pure-white"
                }`}
                style={{ animationDelay: `${60 + i * 45}ms` }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-chlorophyll-green rounded-r-full" />
                )}
                <span
                  className="material-symbols-outlined shrink-0"
                  style={{ fontSize: "20px", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="pt-5 border-t border-white/10 space-y-1 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <p className="px-4 text-pure-white/40 text-xs font-mono truncate mb-2">{email}</p>
          {isAdmin && (
            <a
              href="/admin"
              className="w-full flex items-center gap-3 px-4 py-3 text-chlorophyll-green/70 hover:bg-white/[0.06] hover:text-chlorophyll-green transition-all duration-200 rounded-lg font-mono text-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
              Switch to Admin
            </a>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-pure-white/65 hover:bg-white/[0.06] hover:text-pure-white transition-all duration-200 rounded-lg font-mono text-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-obsidian-deep border-t border-white/10 flex items-stretch h-[64px]">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                active ? "text-chlorophyll-green" : "text-pure-white/55"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "22px", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-mono text-[10px] tracking-tight">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
