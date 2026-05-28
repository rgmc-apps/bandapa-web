"use client";

import { useEffect, useRef } from "react";

interface P {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
}

const N = 115;
const LINK = 128;
const REPEL_RADIUS = 88;
const REPEL_FORCE = 0.65;
const DAMPING = 0.968;

export default function ParticleNetwork({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, mx = -999, my = -999, raf = 0;
    const ps: P[] = [];

    function init() {
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = W;
      canvas!.height = H;
      ps.length = 0;
      for (let i = 0; i < N; i++) {
        ps.push({
          x:  Math.random() * W,
          y:  Math.random() * H,
          vx: (Math.random() - .5) * .45,
          vy: (Math.random() - .5) * .45,
          r:  Math.random() * 1.1 + .55,
        });
      }
    }

    function draw() {
      raf = requestAnimationFrame(draw);
      ctx!.clearRect(0, 0, W, H);

      for (const p of ps) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS) {
          const d = Math.sqrt(d2);
          const f = (REPEL_RADIUS - d) / REPEL_RADIUS * REPEL_FORCE;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }

      // Connections
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x;
          const dy = ps[i].y - ps[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx!.globalAlpha = (1 - d / LINK) * 0.38;
            ctx!.strokeStyle = "#6EE384";
            ctx!.lineWidth = 0.75;
            ctx!.beginPath();
            ctx!.moveTo(ps[i].x, ps[i].y);
            ctx!.lineTo(ps[j].x, ps[j].y);
            ctx!.stroke();
          }
        }
      }

      // Dots
      ctx!.globalAlpha = 1;
      for (const p of ps) {
        ctx!.fillStyle = "rgba(15,21,9,0.55)";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const ro = new ResizeObserver(init);
    ro.observe(canvas);
    init();
    draw();

    function onMove(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    }
    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} className={className} />;
}
