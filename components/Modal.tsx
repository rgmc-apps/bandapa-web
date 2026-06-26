"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ENTER_DURATION = 220;
const EXIT_DURATION  = 180;

export default function Modal({ title, open, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // mounted: controls whether the portal is in the DOM
  // visible: drives the CSS transition (opacity + transform)
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two RAFs: let the browser paint the mounted-but-invisible state,
      // then flip visible to true so the enter transition fires.
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const id = setTimeout(() => setMounted(false), EXIT_DURATION + 20);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const dur = `${visible ? ENTER_DURATION : EXIT_DURATION}ms`;
  // Spring easing for enter (overshoot), snappy ease-out for exit
  const ease = visible
    ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
    : "cubic-bezier(0.16, 1, 0.3, 1)";

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{
        backgroundColor: `rgba(15, 21, 9, ${visible ? 0.45 : 0})`,
        transition: `background-color ${dur} ${ease}`,
      }}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col"
        aria-labelledby="modal-title"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.95)",
          transition: [
            `opacity ${dur} ${ease}`,
            `transform ${visible ? ENTER_DURATION : EXIT_DURATION - 20}ms ${ease}`,
          ].join(", "),
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/40 shrink-0 min-w-0">
          <h2 id="modal-title" className="font-headline font-bold text-obsidian text-lg truncate min-w-0 flex-1 pr-3">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-mist active:scale-[0.9] transition-all duration-150"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
