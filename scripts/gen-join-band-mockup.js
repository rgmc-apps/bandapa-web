/**
 * Generates the "Join a Band" screen reference image for Bandapa.
 * Output: public/static/join-band-mockup.png (1600x1000, 16:10)
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// ─── Canvas setup ──────────────────────────────────────────────────────────────
const W = 1600;
const H = 1000;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ─── Palette ───────────────────────────────────────────────────────────────────
const BG       = '#080808';
const SCREEN   = '#141414';
const CARD     = '#1C1C1C';
const AMBER    = '#F5A623';
const AMBER2   = '#D4891A';
const WHITE    = '#FFFFFF';
const MUTED    = '#6B6B6B';
const HINT     = '#484848';
const FRAME    = '#2A2A2A';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hex2rgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}

// ─── STEP 1: Canvas background (dark + bokeh) ─────────────────────────────────
ctx.fillStyle = BG;
ctx.fillRect(0, 0, W, H);

// Bokeh amber orbs
const bokeh = [
  { x: 0.12, y: 0.2,  r: 160, a: 0.18 },
  { x: 0.88, y: 0.15, r: 120, a: 0.14 },
  { x: 0.75, y: 0.8,  r: 200, a: 0.12 },
  { x: 0.2,  y: 0.78, r: 140, a: 0.16 },
  { x: 0.5,  y: 0.05, r: 80,  a: 0.10 },
  { x: 0.95, y: 0.55, r: 90,  a: 0.09 },
];
bokeh.forEach(b => {
  const grd = ctx.createRadialGradient(b.x*W, b.y*H, 0, b.x*W, b.y*H, b.r);
  grd.addColorStop(0,   `rgba(245,166,35,${b.a})`);
  grd.addColorStop(0.4, `rgba(220,140,20,${b.a*0.5})`);
  grd.addColorStop(1,   `rgba(200,100,10,0)`);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(b.x*W, b.y*H, b.r, 0, Math.PI*2);
  ctx.fill();
});

// Film grain overlay (procedural noise-like pattern)
for (let i = 0; i < 18000; i++) {
  const x = Math.random() * W;
  const y = Math.random() * H;
  const alpha = Math.random() * 0.04;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(x, y, 1, 1);
}

// ─── STEP 2: Phone frame ───────────────────────────────────────────────────────
const PH = 820;  // phone height
const PW = 390;  // phone width
const PX = (W - PW) / 2;
const PY = (H - PH) / 2;
const PR = 46;   // phone corner radius

// Drop shadow
const shadowSteps = 8;
for (let s = shadowSteps; s >= 1; s--) {
  const spread = s * 10;
  const alpha  = 0.06 * (shadowSteps - s + 1) / shadowSteps;
  roundRect(ctx, PX - spread/2, PY + 20 + spread/3, PW + spread, PH + spread/2, PR + spread/2);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fill();
}

// Phone outer frame
roundRect(ctx, PX, PY, PW, PH, PR);
ctx.fillStyle = FRAME;
ctx.fill();

// Very subtle amber phone glow at bottom
const phoneGlow = ctx.createLinearGradient(PX, PY + PH*0.6, PX, PY + PH);
phoneGlow.addColorStop(0, 'rgba(245,166,35,0)');
phoneGlow.addColorStop(1, 'rgba(245,166,35,0.04)');
roundRect(ctx, PX, PY, PW, PH, PR);
ctx.fillStyle = phoneGlow;
ctx.fill();

// Phone bezel inner (screen area)
const BZ = 8; // bezel thickness
const SW = PW - BZ*2;
const SH = PH - BZ*2;
const SX = PX + BZ;
const SY = PY + BZ;
const SR = PR - BZ;

roundRect(ctx, SX, SY, SW, SH, SR);
ctx.fillStyle = SCREEN;
ctx.fill();

// Clip all screen content to phone screen
ctx.save();
roundRect(ctx, SX, SY, SW, SH, SR);
ctx.clip();

// ─── STEP 3: Screen content ────────────────────────────────────────────────────
// All coords relative to screen origin (SX, SY)
const cx = SX + SW / 2; // horizontal center

// Status bar
ctx.fillStyle = 'rgba(255,255,255,0.55)';
ctx.font = '500 11px -apple-system, "SF Pro Text", sans-serif';
ctx.textAlign = 'left';
ctx.fillText('9:41', SX + 20, SY + 20);
// Battery / signal icons (simple rectangles)
ctx.fillStyle = 'rgba(255,255,255,0.55)';
// signal bars
for (let b = 0; b < 4; b++) {
  const bh = 4 + b * 2;
  ctx.fillRect(SX + SW - 50 + b*5, SY + 14 - bh, 3, bh);
}
// wifi
ctx.fillRect(SX + SW - 30, SY + 10, 8, 4);
// battery
ctx.strokeStyle = 'rgba(255,255,255,0.5)';
ctx.lineWidth = 1;
ctx.strokeRect(SX + SW - 18, SY + 9, 12, 6);
ctx.fillStyle = 'rgba(255,255,255,0.5)';
ctx.fillRect(SX + SW - 6, SY + 11, 2, 2);
ctx.fillRect(SX + SW - 17, SY + 10, 8, 4);

// ── Header row ─────────────────────────────────────────────────────────────────
const headerY = SY + 40;

// Back arrow
ctx.strokeStyle = WHITE;
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(SX + 26, headerY + 11);
ctx.lineTo(SX + 18, headerY + 7);
ctx.lineTo(SX + 26, headerY + 3);
ctx.stroke();

// Title
ctx.fillStyle = WHITE;
ctx.font = 'bold 17px -apple-system, "SF Pro Display", sans-serif';
ctx.textAlign = 'center';
ctx.fillText('Join a Band', cx, headerY + 11);

// ── Subtitle ──────────────────────────────────────────────────────────────────
ctx.fillStyle = MUTED;
ctx.font = '400 12px -apple-system, "SF Pro Text", sans-serif';
ctx.textAlign = 'center';
const subtitleY = headerY + 44;
ctx.fillText('Enter the 6-character invite code', cx, subtitleY);
ctx.fillText('shared by your band.', cx, subtitleY + 18);

// ── Invite code input block (HERO) ────────────────────────────────────────────
const inputY = subtitleY + 80;
const inputW = 260;
const inputX = cx - inputW/2;
const inputH = 64;

// Subtle input bg
roundRect(ctx, inputX, inputY, inputW, inputH, 10);
ctx.fillStyle = 'rgba(255,255,255,0.03)';
ctx.fill();

// 'ABC123' monospaced large text
ctx.fillStyle = WHITE;
ctx.font = 'bold 36px "Courier New", "SF Mono", Courier, monospace';
ctx.textAlign = 'center';
ctx.letterSpacing = '0.4em'; // Note: canvas doesn't support CSS letterSpacing natively
// Simulate wide tracking by drawing chars individually
const code = 'ABC123';
const charWidth = 34;
const startX = cx - (code.length * charWidth) / 2 + 14;
ctx.fillStyle = WHITE;
for (let i = 0; i < code.length; i++) {
  ctx.fillText(code[i], startX + i * charWidth, inputY + 44);
}

// Amber underline glow
const underlineY = inputY + inputH - 2;

// Wide amber glow below underline (multi-pass for bloom effect)
for (let pass = 0; pass < 3; pass++) {
  const radius = inputW * (0.5 + pass * 0.15);
  const alpha  = 0.18 - pass * 0.04;
  const amberGlow = ctx.createRadialGradient(cx, underlineY + 6, 0, cx, underlineY + 6, radius);
  amberGlow.addColorStop(0,   `rgba(245,166,35,${alpha})`);
  amberGlow.addColorStop(0.5, `rgba(220,140,20,${alpha * 0.4})`);
  amberGlow.addColorStop(1,   'rgba(200,100,10,0)');
  ctx.fillStyle = amberGlow;
  ctx.fillRect(inputX - 60, underlineY - 10, inputW + 120, 50);
}

// The amber underline itself
ctx.beginPath();
ctx.moveTo(inputX + 6, underlineY);
ctx.lineTo(inputX + inputW - 6, underlineY);
ctx.strokeStyle = AMBER;
ctx.lineWidth = 2.5;
ctx.shadowColor = AMBER;
ctx.shadowBlur = 18;
ctx.stroke();
ctx.shadowBlur = 0;

// Cursor blink indicator
ctx.fillStyle = AMBER;
ctx.fillRect(cx + 68, inputY + 14, 2, 32);

// ── FIND button ───────────────────────────────────────────────────────────────
const findY = inputY + inputH + 20;
const findW = 100;
const findH = 40;
const findX = cx - findW/2;

// Amber pill
roundRect(ctx, findX, findY, findW, findH, findH/2);
ctx.fillStyle = AMBER;
ctx.fill();

// Find label
ctx.fillStyle = '#1A1000';
ctx.font = 'bold 14px -apple-system, "SF Pro Text", sans-serif';
ctx.textAlign = 'center';
ctx.fillText('Find', cx, findY + 26);

// ── Band preview card ─────────────────────────────────────────────────────────
const cardY = findY + findH + 32;
const cardW = 310;
const cardH = 70;
const cardX = cx - cardW/2;
const cardR = 14;

// Card shadow
for (let s = 4; s >= 1; s--) {
  const sp = s * 4;
  roundRect(ctx, cardX - sp/2, cardY + sp/2, cardW + sp, cardH + sp, cardR + sp/2);
  ctx.fillStyle = `rgba(0,0,0,${0.15 * s / 4})`;
  ctx.fill();
}

// Card bg
roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
ctx.fillStyle = CARD;
ctx.fill();

// Clip card contents
ctx.save();
roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
ctx.clip();

// Amber left-border stripe (3px)
ctx.fillStyle = AMBER;
ctx.fillRect(cardX, cardY, 3, cardH);

// Band icon square (48x48)
const iconSize = 48;
const iconX = cardX + 18;
const iconY = cardY + (cardH - iconSize) / 2;
roundRect(ctx, iconX, iconY, iconSize, iconSize, 8);
ctx.fillStyle = '#252525';
ctx.fill();

// Amber tint over icon
roundRect(ctx, iconX, iconY, iconSize, iconSize, 8);
ctx.fillStyle = 'rgba(245,166,35,0.15)';
ctx.fill();

// Music note icon (simple)
ctx.fillStyle = AMBER;
ctx.font = '22px "Segoe UI Symbol", Arial, serif';
ctx.textAlign = 'center';
ctx.fillText('♪', iconX + iconSize/2, iconY + iconSize/2 + 8);
ctx.font = '13px Arial, sans-serif'; // reset font

// Text start x
const textX = iconX + iconSize + 14;
const textMaxW = cardX + cardW - textX - 14;

// Band name
ctx.fillStyle = WHITE;
ctx.font = 'bold 13px -apple-system, "SF Pro Display", sans-serif';
ctx.textAlign = 'left';
// Draw with clipping to max width
ctx.fillText('The Midnight Collective', textX, cardY + 30, textMaxW);

// Genre
ctx.fillStyle = MUTED;
ctx.font = '400 12px -apple-system, "SF Pro Text", sans-serif';
ctx.fillText('Rock · Indie', textX, cardY + 48, textMaxW);

ctx.restore();

// Subtle amber card border
roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
ctx.strokeStyle = 'rgba(245,166,35,0.18)';
ctx.lineWidth = 1;
ctx.stroke();

// ── JOIN BAND button ──────────────────────────────────────────────────────────
const joinY = cardY + cardH + 20;
const joinW = cardW + 10;
const joinH = 52;
const joinX = cx - joinW/2;

// Amber pill button with subtle gradient
roundRect(ctx, joinX, joinY, joinW, joinH, joinH/2);
const joinGrad = ctx.createLinearGradient(joinX, joinY, joinX, joinY + joinH);
joinGrad.addColorStop(0, '#F7B030');
joinGrad.addColorStop(1, '#E89A10');
ctx.fillStyle = joinGrad;
ctx.fill();

// Label
ctx.fillStyle = '#1A0F00';
ctx.font = 'bold 16px -apple-system, "SF Pro Display", sans-serif';
ctx.textAlign = 'center';
ctx.fillText('Join Band', cx, joinY + 33);

// ── Hint text ─────────────────────────────────────────────────────────────────
ctx.save();
ctx.fillStyle = HINT;
ctx.font = '400 11px Arial, Helvetica, sans-serif';
ctx.textAlign = 'center';
ctx.fillText("You'll be added as a member instantly.", cx, joinY + joinH + 18);
ctx.restore();

// ── Home indicator ────────────────────────────────────────────────────────────
const hiW = 120;
const hiH = 4;
const hiX = cx - hiW/2;
const hiY = SY + SH - 14;
roundRect(ctx, hiX, hiY, hiW, hiH, 2);
ctx.fillStyle = 'rgba(255,255,255,0.22)';
ctx.fill();

// Done clipping
ctx.restore();

// ─── STEP 4: Phone notch/dynamic island ───────────────────────────────────────
const notchW = 90;
const notchH = 26;
const notchX = cx - notchW/2;
const notchY = PY + BZ + 4;
roundRect(ctx, notchX, notchY, notchW, notchH, notchH/2);
ctx.fillStyle = FRAME;
ctx.fill();

// ─── STEP 5: Subtle phone frame edge highlight ─────────────────────────────────
roundRect(ctx, PX, PY, PW, PH, PR);
ctx.strokeStyle = 'rgba(255,255,255,0.06)';
ctx.lineWidth = 1;
ctx.stroke();

// ─── Save ──────────────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'public', 'static', 'join-band-mockup.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log(`Saved: ${outPath} (${(buffer.length/1024).toFixed(1)} KB)`);
console.log(`Canvas: ${W}x${H} (16:10)`);
