"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  src: string;
  aspect: number;        // width / height — 1 for square, 4 for banner
  outputWidth?: number;  // output canvas width in px
  label?: string;
  onCrop: (file: File, preview: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  src,
  aspect,
  outputWidth = 800,
  label,
  onCrop,
  onCancel,
}: Props) {
  const outputHeight = Math.round(outputWidth / aspect);

  // Display dimensions — fit inside modal (max-w-lg = 512px minus 2×20px padding)
  const { FW, FH, PAD, CW, CH } = useMemo(() => {
    const fw  = 432;
    const fh  = Math.max(Math.round(fw / aspect), 108);
    const pad = 24;
    return { FW: fw, FH: fh, PAD: pad, CW: fw + pad * 2, CH: fh + pad * 2 };
  }, [aspect]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);

  const [nat,      setNat]      = useState({ w: 1, h: 1 });
  const [off,      setOff]      = useState({ x: 0, y: 0 });
  const [scale,    setScale]    = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  // ── Load image, initialise fit-to-cover scale & centred offset ──────────────
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNat({ w: nw, h: nh });
      const ms = Math.max(FW / nw, FH / nh);
      setMinScale(ms);
      setScale(ms);
      setOff({ x: (FW - nw * ms) / 2, y: (FH - nh * ms) / 2 });
    };
    img.src = src;
  }, [src, FW, FH]);

  // ── Clamp offset so image always covers the frame ────────────────────────────
  const clamp = useCallback(
    (ox: number, oy: number, s: number) => ({
      x: Math.min(0, Math.max(FW - nat.w * s, ox)),
      y: Math.min(0, Math.max(FH - nat.h * s, oy)),
    }),
    [nat, FW, FH]
  );

  // ── Canvas render ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext("2d");
    const img    = imgRef.current;
    if (!canvas || !ctx || !img || nat.w === 1) return;

    ctx.clearRect(0, 0, CW, CH);

    // dark background
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, CW, CH);

    // image
    ctx.drawImage(img, PAD + off.x, PAD + off.y, nat.w * scale, nat.h * scale);

    // scrim overlay with even-odd hole = the crop frame
    const isCircle = aspect === 1;
    const r = isCircle ? FH / 2 : 8;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.rect(0, 0, CW, CH);
    rrectPath(ctx, PAD, PAD, FW, FH, r);
    ctx.fill("evenodd");

    // rule-of-thirds grid (only while dragging)
    if (dragging) {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth   = 1;
      for (let i = 1; i < 3; i++) {
        seg(ctx, PAD + (FW / 3) * i, PAD,        PAD + (FW / 3) * i, PAD + FH);
        seg(ctx, PAD,        PAD + (FH / 3) * i, PAD + FW,            PAD + (FH / 3) * i);
      }
    }

    // frame border
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    rrectPath(ctx, PAD, PAD, FW, FH, r);
    ctx.stroke();

    // corner handles (not for circular crops)
    if (!isCircle) {
      const hL = 12;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = "round";
      for (const [cx, cy, sx, sy] of [
        [PAD,      PAD,      1, 1], [PAD + FW, PAD,      -1, 1],
        [PAD,      PAD + FH, 1,-1], [PAD + FW, PAD + FH, -1,-1],
      ] as [number, number, number, number][]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * hL, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * hL);
        ctx.stroke();
      }
    }
  }, [off, scale, nat, dragging, CW, CH, FW, FH, PAD, aspect]);

  // ── Pointer helpers ───────────────────────────────────────────────────────────
  function ptOf(e: React.MouseEvent | React.TouchEvent) {
    if ("touches" in e && e.touches.length > 0)
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if ("clientX" in e) return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    return null;
  }

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    setDragging(true);
    lastPt.current = ptOf(e);
  }
  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (!dragging || !lastPt.current) return;
    const pt = ptOf(e);
    if (!pt) return;
    const dx = pt.x - lastPt.current.x;
    const dy = pt.y - lastPt.current.y;
    lastPt.current = pt;
    setOff(prev => clamp(prev.x + dx, prev.y + dy, scale));
  }
  function onUp() { setDragging(false); lastPt.current = null; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const ns = Math.min(Math.max(scale * (e.deltaY < 0 ? 1.08 : 0.93), minScale), minScale * 6);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) / rect.width  * CW - PAD;
    const my = (e.clientY - rect.top)  / rect.height * CH - PAD;
    const ratio = ns / scale;
    setScale(ns);
    setOff(prev => clamp(mx - ratio * (mx - prev.x), my - ratio * (my - prev.y), ns));
  }

  function zoom(factor: number) {
    const ns = Math.min(Math.max(scale * factor, minScale), minScale * 6);
    const ratio = ns / scale;
    const cx = FW / 2, cy = FH / 2;
    setScale(ns);
    setOff(prev => clamp(cx - ratio * (cx - prev.x), cy - ratio * (cy - prev.y), ns));
  }

  // ── Apply crop to output canvas ───────────────────────────────────────────────
  function applyCrop() {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width  = outputWidth;
    out.height = outputHeight;
    const ctx = out.getContext("2d")!;

    if (aspect === 1) {
      // circular clip for avatars
      ctx.beginPath();
      ctx.arc(outputWidth / 2, outputHeight / 2, outputWidth / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(
      img,
      -off.x / scale, -off.y / scale,
      FW / scale,     FH / scale,
      0, 0, outputWidth, outputHeight
    );

    out.toBlob(blob => {
      if (!blob) return;
      const file    = new File([blob], "image.jpg", { type: "image/jpeg" });
      const preview = out.toDataURL("image/jpeg", 0.92);
      onCrop(file, preview);
    }, "image/jpeg", 0.92);
  }

  const zoomPct = Math.round((scale / minScale) * 100);

  return (
    <div className="p-5 flex flex-col gap-3">
      {label && <p className="text-sm font-medium text-obsidian">{label}</p>}

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden bg-[#111]" style={{ aspectRatio: `${CW}/${CH}` }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className={`w-full h-full select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
          onWheel={onWheel}
        />
      </div>

      {/* Zoom controls + hint */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => zoom(0.88)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-mist transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>remove</span>
          </button>
          <span className="text-xs font-mono text-on-surface-variant w-12 text-center">{zoomPct}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => zoom(1.14)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-mist transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
          </button>
        </div>
        <p className="text-[11px] font-mono text-on-surface-variant/60">drag · scroll to zoom</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" onClick={applyCrop}>Apply</button>
      </div>
    </div>
  );
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────

function rrectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const cr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + cr, y);
  ctx.lineTo(x + w - cr, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + cr);
  ctx.lineTo(x + w, y + h - cr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
  ctx.lineTo(x + cr, y + h);
  ctx.quadraticCurveTo(x,     y + h, x,     y + h - cr);
  ctx.lineTo(x, y + cr);
  ctx.quadraticCurveTo(x,     y,     x + cr, y);
  ctx.closePath();
}

function seg(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
