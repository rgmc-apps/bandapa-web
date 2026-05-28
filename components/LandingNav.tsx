"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface LandingNavProps {
  apkUrl: string;
}

export default function LandingNav({ apkUrl }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 32);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "bg-pure-white/92 backdrop-blur-xl shadow-[0_1px_0_rgba(15,21,9,0.07)]"
          : "bg-transparent"
      }`}
    >
      <div className="flex justify-between items-center h-16 px-4 md:px-16 max-w-[1280px] mx-auto">
        {/* Logo + links */}
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2.5 group">
            <Image
              src="/static/app-logo.png"
              alt="Bandapa Logo"
              width={36}
              height={36}
              className="object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <span className="font-headline font-bold text-obsidian-deep text-xl tracking-tight">
              Bandapa
            </span>
          </a>

          <div className="hidden md:flex gap-6 items-center">
            {[
              { label: "Product", href: "#" },
              { label: "Download", href: "#download", active: true },
              { label: "Features", href: "#features" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`relative text-sm transition-colors duration-200 pb-0.5 ${
                  link.active
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 after:ease-out hover:after:w-full"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="hidden sm:block text-on-surface-variant font-mono text-sm hover:text-primary transition-colors duration-200"
          >
            Sign In
          </a>
          <a
            href={apkUrl}
            download
            className="bg-chlorophyll-green text-obsidian-deep px-6 py-2 rounded-full font-mono text-sm font-bold transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_24px_rgba(110,227,132,0.45)] active:scale-95"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}
