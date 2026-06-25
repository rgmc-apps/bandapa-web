"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface PlatformNavProps {
  user?: { email?: string } | null;
  isAdmin?: boolean;
  apkUrl: string;
}

export default function PlatformNav({ user, isAdmin, apkUrl }: PlatformNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  void apkUrl;

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "bg-obsidian-deep/95 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="flex justify-between items-center h-16 px-4 md:px-16 max-w-container mx-auto">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/static/app-logo.png"
              alt="Bandapa"
              width={34}
              height={34}
              className="object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <span className="font-headline font-bold text-pure-white text-xl tracking-tight">
              Bandapa
            </span>
          </a>

          <div className="hidden md:flex gap-6 items-center">
            {[
              { label: "Platform", href: "#platform" },
              { label: "Features", href: "#features" },
              { label: "Mobile", href: "#mobile" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-mono text-pure-white/55 hover:text-pure-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {isAdmin && (
                <a
                  href="/admin"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-chlorophyll-green/70 hover:text-chlorophyll-green transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}>
                    admin_panel_settings
                  </span>
                  Admin
                </a>
              )}
              <a
                href="/dashboard"
                className="hidden sm:block text-sm font-mono text-pure-white/55 hover:text-pure-white transition-colors"
              >
                {user.email?.split("@")[0]}
              </a>
              <a
                href="/dashboard"
                className="bg-chlorophyll-green text-obsidian-deep px-5 py-2 rounded-full font-mono text-sm font-bold hover:opacity-90 hover:shadow-[0_0_24px_rgba(110,227,132,0.45)] active:scale-95 transition-all duration-200"
              >
                Dashboard →
              </a>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="hidden sm:block text-sm font-mono text-pure-white/55 hover:text-pure-white transition-colors"
              >
                Sign in
              </a>
              <a
                href="/login"
                className="bg-chlorophyll-green text-obsidian-deep px-5 py-2 rounded-full font-mono text-sm font-bold hover:opacity-90 hover:shadow-[0_0_24px_rgba(110,227,132,0.45)] active:scale-95 transition-all duration-200"
              >
                Get started
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
