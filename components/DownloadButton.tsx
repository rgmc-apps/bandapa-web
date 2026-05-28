"use client";

import { useState } from "react";

interface DownloadButtonProps {
  href: string;
}

export default function DownloadButton({ href }: DownloadButtonProps) {
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");

  function handleClick() {
    if (phase !== "idle") return;
    setPhase("loading");
    setTimeout(() => {
      setPhase("done");
      setTimeout(() => setPhase("idle"), 3500);
    }, 1500);
  }

  return (
    <a
      href={href}
      download
      onClick={handleClick}
      className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 group select-none cursor-pointer ${
        phase === "done"
          ? "bg-primary text-pure-white shadow-[0_0_24px_rgba(0,110,45,0.35)]"
          : "bg-chlorophyll-green text-obsidian-deep hover:opacity-90 hover:shadow-[0_0_28px_rgba(110,227,132,0.5)]"
      }`}
    >
      {phase === "loading" && (
        <>
          <span
            className="material-symbols-outlined animate-spin"
            style={{ fontSize: "20px" }}
          >
            refresh
          </span>
          Preparing Download…
        </>
      )}
      {phase === "done" && (
        <>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          Download Started!
        </>
      )}
      {phase === "idle" && (
        <>
          Download Latest APK
          <span
            className="material-symbols-outlined group-hover:translate-y-1 transition-transform duration-200"
            style={{ fontSize: "20px" }}
          >
            download
          </span>
        </>
      )}
    </a>
  );
}
