"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AUTH_PATHS = ["/login", "/register", "/auth"];

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return;

    // Apply a pending remember preference set before an OAuth redirect
    const pending = localStorage.getItem("bandapa_remember_pending");
    if (pending !== null) {
      localStorage.setItem("bandapa_remember", pending);
      localStorage.removeItem("bandapa_remember_pending");
      if (pending === "false") {
        sessionStorage.setItem("bandapa_session", "1");
      }
    }

    const remember = localStorage.getItem("bandapa_remember");
    if (remember !== "false") return;

    // "Don't remember me" was chosen. sessionStorage is cleared when the
    // browser is closed, so a missing marker means a new browser session.
    const sessionActive = sessionStorage.getItem("bandapa_session");
    if (!sessionActive) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        localStorage.removeItem("bandapa_remember");
        router.replace("/login");
      });
    }
  }, [pathname, router]);

  return null;
}
