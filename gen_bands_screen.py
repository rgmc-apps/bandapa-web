from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

W, H = 1600, 1000

# ─── BASE CANVAS ───────────────────────────────────────────────
canvas = Image.new("RGB", (W, H), (8, 8, 8))

# ─── STAGE BOKEH ───────────────────────────────────────────────
bk = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(bk)

orbs = [
    # left warm cluster
    (85,  150, 115, 58, (245, 155, 22)),
    (200,  55,  68, 32, (255, 185, 48)),
    (38,  380,  88, 28, (195, 118, 14)),
    (148, 740,  72, 24, (240, 152, 22)),
    (310, 895,  52, 20, (185, 108, 14)),
    (58,  555,  44, 16, (218, 138, 18)),
    (175, 940,  36, 12, (200, 120, 15)),
    # right warm cluster
    (1515, 185, 118, 55, (245, 155, 22)),
    (1375,  60,  70, 30, (255, 192, 58)),
    (1550, 475,  90, 26, (205, 132, 18)),
    (1428, 855,  98, 30, (242, 152, 22)),
    (1268, 948,  60, 20, (212, 138, 20)),
    (1498, 640,  46, 16, (218, 142, 18)),
    (1420, 300,  38, 12, (230, 148, 20)),
    # subtle top scatter
    (768,  32,  54, 14, (242, 152, 22)),
    (1010,  50,  40, 11, (252, 168, 36)),
    (550,  100,  40, 11, (242, 142, 20)),
    (1130, 108,  42, 13, (238, 148, 18)),
    # subtle bottom
    (700, 948,  42, 13, (228, 138, 16)),
    (895, 962,  34, 11, (212, 128, 14)),
]

for (bx, by, br, ba, bc) in orbs:
    for s in range(7, 0, -1):
        r2 = int(br * s / 7)
        a2 = int(ba * s / 7)
        bd.ellipse([bx-r2, by-r2, bx+r2, by+r2], fill=(bc[0], bc[1], bc[2], a2))

bk = bk.filter(ImageFilter.GaussianBlur(radius=44))
canvas = canvas.convert("RGBA")
canvas.alpha_composite(bk)
canvas = canvas.convert("RGB")
draw = ImageDraw.Draw(canvas)

# ─── PHONE DIMENSIONS ──────────────────────────────────────────
phone_w = 360
phone_h = 800
phone_x = (W - phone_w) // 2
phone_y = (H - phone_h) // 2
fr      = 46  # frame radius

# Drop shadow
for i in range(28, 0, -2):
    v = max(0, 22 - i)
    draw.rounded_rectangle(
        [phone_x - i*2, phone_y - i, phone_x + phone_w + i*2, phone_y + phone_h + i],
        radius=fr + i, outline=(v, v-2, v-4), width=1
    )

# Metal bezel
draw.rounded_rectangle(
    [phone_x-5, phone_y-5, phone_x+phone_w+5, phone_y+phone_h+5],
    radius=fr+3, fill=(44, 44, 48), outline=(72, 72, 76), width=2
)
draw.rounded_rectangle(
    [phone_x-2, phone_y-2, phone_x+phone_w+2, phone_y+phone_h+2],
    radius=fr+1, fill=None, outline=(26, 26, 28), width=2
)

# Screen body
draw.rounded_rectangle(
    [phone_x, phone_y, phone_x+phone_w, phone_y+phone_h],
    radius=fr, fill=(20, 20, 20)
)

# Dynamic Island
diw, dih = 90, 28
dix = phone_x + (phone_w - diw) // 2
diy = phone_y + 14
draw.rounded_rectangle([dix, diy, dix+diw, diy+dih], radius=14, fill=(10, 10, 10))

# Side buttons
draw.rounded_rectangle([phone_x-8, phone_y+128, phone_x-5, phone_y+166], radius=2, fill=(56,56,60))
draw.rounded_rectangle([phone_x-8, phone_y+180, phone_x-5, phone_y+218], radius=2, fill=(56,56,60))
draw.rounded_rectangle([phone_x+phone_w+5, phone_y+158, phone_x+phone_w+8, phone_y+220], radius=2, fill=(56,56,60))

# ─── CONTENT SETUP ─────────────────────────────────────────────
pad  = 18
sx   = phone_x + pad
sw   = phone_w - pad * 2
cy   = phone_y + 56

def tf(name, sz):
    try:    return ImageFont.truetype(f"C:/Windows/Fonts/{name}", sz)
    except: return ImageFont.load_default()

F_st  = tf("arial.ttf",   10)
F_ttl = tf("arialbd.ttf", 29)
F_btn = tf("arialbd.ttf", 12)
F_sec = tf("arialbd.ttf",  9)
F_cnm = tf("arialbd.ttf", 12)
F_cgn = tf("arial.ttf",   10)
F_cmb = tf("arial.ttf",    9)
F_adm = tf("arialbd.ttf",  9)
F_gh  = tf("arial.ttf",   10)
F_plg = tf("arialbd.ttf", 17)
F_pls = tf("arialbd.ttf", 13)
F_tab = tf("arial.ttf",    8)
F_act = tf("arialbd.ttf", 10)
F_acs = tf("arial.ttf",    9)
F_br  = tf("arialbd.ttf", 11)

C_WH  = (250, 250, 250)
C_AMB = (245, 166, 35)
C_Z5  = (113, 113, 122)
C_Z8  = (39, 39, 42)
C_CD  = (28, 28, 28)
C_BG  = (20, 20, 20)

# ── STATUS BAR ──
draw.text((sx, cy), "9:41", fill=(180, 180, 192), font=F_st)
draw.text((sx+sw-54, cy), "▲  ◆  ▓", fill=(160, 160, 174), font=F_st)
cy += 20

# ── HEADER ──
draw.text((sx, cy), "Bands", fill=C_WH, font=F_ttl)
# + btn
pcx, pcy, pr = sx+sw-18, cy+14, 17
draw.rounded_rectangle([pcx-pr, pcy-pr, pcx+pr, pcy+pr], radius=pr, fill=(42,42,46), outline=(62,62,68), width=1)
draw.text((pcx-5, pcy-10), "+", fill=C_WH, font=F_plg)
cy += 40

# ── CTA BUTTONS ──
gap = 8
bw2 = (sw - gap) // 2
bh2 = 36
br2 = 18

draw.rounded_rectangle([sx, cy, sx+bw2, cy+bh2], radius=br2, fill=C_AMB)
t1 = "Create band"
b1 = draw.textbbox((0,0), t1, font=F_btn)
draw.text((sx+(bw2-(b1[2]-b1[0]))//2, cy+11), t1, fill=(10,10,10), font=F_btn)

b2x = sx + bw2 + gap
draw.rounded_rectangle([b2x, cy, b2x+bw2, cy+bh2], radius=br2, fill=(24,24,26), outline=C_Z8, width=1)
t2 = "Join with code"
b2b = draw.textbbox((0,0), t2, font=F_btn)
draw.text((b2x+(bw2-(b2b[2]-b2b[0]))//2, cy+11), t2, fill=C_WH, font=F_btn)
cy += bh2 + 16

# ── SECTION LABEL ──
draw.text((sx, cy), "MY BANDS", fill=(75, 75, 86), font=F_sec)
sl = draw.textbbox((0,0), "MY BANDS", font=F_sec)
dot_x = sx + sl[2]-sl[0] + 6
draw.ellipse([dot_x, cy+2, dot_x+4, cy+6], fill=C_AMB)
cy += 15

# ── BAND CARDS ──
card_h = 72
cgap   = 8
isz    = 46
ir     = 10

def note(draw, ix, iy, sz, color):
    cx = ix + sz//2
    cy_ = iy + sz//2
    draw.ellipse([cx-8, cy_+5, cx+1, cy_+13], fill=color)
    draw.rectangle([cx, cy_-7, cx+3, cy_+9], fill=color)
    draw.arc([cx+3, cy_-7, cx+13, cy_+2], start=270, end=45, fill=color, width=3)

bands = [
    ("The Midnight Collective", "Rock · Indie",        "4 members", True,  True,  (42,28,0),  C_AMB,     C_AMB, 1),
    ("Coda Republic",           "Alternative · Metal",  "7 members", False, False, (34,34,38), (85,85,95), C_Z8,  1),
    ("Solo Project",            "Electronic · Ambient", "1 member",  False, False, (34,34,38), (85,85,95), C_Z8,  1),
]

for (nm, gn, mb, adm, glow, ibg, iic, bdr, bdw) in bands:
    bx, by = sx, cy

    if glow:
        gl = Image.new("RGBA", (W, H), (0,0,0,0))
        gd = ImageDraw.Draw(gl)
        for gi in range(16, 0, -1):
            ga = int(20*(1-gi/16))
            gd.rounded_rectangle([bx-gi, by-gi, bx+sw+gi, by+card_h+gi],
                                  radius=16+gi, outline=(245,166,35,ga), width=1)
        gl = gl.filter(ImageFilter.GaussianBlur(radius=3))
        canvas = canvas.convert("RGBA")
        canvas.alpha_composite(gl)
        canvas = canvas.convert("RGB")
        draw = ImageDraw.Draw(canvas)

    draw.rounded_rectangle([bx, by, bx+sw, by+card_h], radius=14, fill=C_CD)
    draw.rounded_rectangle([bx, by, bx+sw, by+card_h], radius=14, fill=None, outline=bdr, width=bdw)

    ix = bx + 12
    iy = by + (card_h - isz) // 2
    draw.rounded_rectangle([ix, iy, ix+isz, iy+isz], radius=ir, fill=ibg)
    note(draw, ix, iy, isz, iic)

    tx = ix + isz + 12
    ty = by + 12
    draw.text((tx, ty),    nm, fill=C_WH, font=F_cnm)
    draw.text((tx, ty+16), gn, fill=C_Z5,  font=F_cgn)

    my = ty + 30
    draw.ellipse([tx,   my+1, tx+7,  my+7], fill=C_Z5)
    draw.ellipse([tx+5, my+1, tx+13, my+7], fill=C_Z5)
    draw.text((tx+17, my), mb, fill=C_Z5, font=F_cmb)

    chx = bx + sw - 22
    chy = by + card_h // 2
    draw.polygon([(chx-4, chy-6),(chx+2, chy),(chx-4, chy+6)], fill=(76,76,86))

    if adm:
        bt = "Admin"
        bb = draw.textbbox((0,0), bt, font=F_adm)
        bw3 = bb[2]-bb[0]+10
        bh3 = 16
        bax = chx - 14 - bw3
        bay = by + (card_h - bh3)//2
        draw.rounded_rectangle([bax, bay, bax+bw3, bay+bh3], radius=8, fill=C_AMB)
        draw.text((bax+5, bay+3), bt, fill=(10,10,10), font=F_adm)

    cy += card_h + cgap

cy += 5

# ── EMPTY STATE ──
ghy = cy
ghh = 50
draw.rounded_rectangle([sx, ghy, sx+sw, ghy+ghh], radius=12, fill=(21,21,23))

def dashed(draw, x,y,w,h,r,col,d=7,g=5):
    for px in range(x+r, x+w-r, d+g):
        ex = min(px+d, x+w-r)
        draw.line([(px,y),(ex,y)], fill=col, width=1)
        draw.line([(px,y+h),(ex,y+h)], fill=col, width=1)
    for py in range(y+r, y+h-r, d+g):
        ey = min(py+d, y+h-r)
        draw.line([(x,py),(x,ey)], fill=col, width=1)
        draw.line([(x+w,py),(x+w,ey)], fill=col, width=1)

dashed(draw, sx, ghy, sw, ghh, 12, (58,58,68))

gt  = "Join or create a band"
tb  = draw.textbbox((0,0), gt, font=F_gh)
tw  = tb[2]-tb[0]
stx = sx + (sw - (22+8+tw)) // 2
pc2x = stx+11
pc2y = ghy + ghh//2
draw.ellipse([pc2x-11, pc2y-11, pc2x+11, pc2y+11], fill=(36,36,40))
draw.ellipse([pc2x-11, pc2y-11, pc2x+11, pc2y+11], fill=None, outline=(64,64,72), width=1)
draw.text((pc2x-4, pc2y-8), "+", fill=(82,82,92), font=F_pls)
draw.text((stx+28, ghy+(ghh-11)//2), gt, fill=(70,70,80), font=F_gh)

cy += ghh + 14

# ── RECENT ACTIVITY ──
draw.text((sx, cy), "RECENT ACTIVITY", fill=(68,68,78), font=F_sec)
cy += 14

act_items = [
    ("The Midnight Collective", "New rehearsal scheduled", "2h ago"),
    ("Coda Republic",           "Setlist updated",          "Yesterday"),
    ("Solo Project",            "New track added",          "3d ago"),
]

for (ab, at, atm) in act_items:
    ax, ay, ah = sx, cy, 42
    draw.rounded_rectangle([ax, ay, ax+sw, ay+ah], radius=10, fill=(24,24,26))
    draw.rounded_rectangle([ax, ay, ax+sw, ay+ah], radius=10, fill=None, outline=(36,36,40), width=1)
    # amber left bar
    draw.rounded_rectangle([ax, ay+6, ax+3, ay+ah-6], radius=1, fill=C_AMB)
    draw.text((ax+12, ay+8),  ab, fill=(195,195,208), font=F_act)
    draw.text((ax+12, ay+22), at, fill=(82,82,92),    font=F_acs)
    # timestamp right
    tmb = draw.textbbox((0,0), atm, font=F_acs)
    tmw = tmb[2]-tmb[0]
    draw.text((ax+sw-tmw-4, ay+22), atm, fill=(65,65,74), font=F_acs)
    cy += ah + 6

cy += 2

# ── TAB BAR ──
tab_h   = 52
tab_y   = phone_y + phone_h - tab_h - 10  # sits just above home indicator
tab_bg_y = tab_y

# Tab bar background
draw.rectangle([phone_x, tab_bg_y, phone_x+phone_w, phone_y+phone_h], fill=(14,14,16))
draw.line([(phone_x, tab_bg_y), (phone_x+phone_w, tab_bg_y)], fill=(34,34,38), width=1)

tabs = [
    ("Home",   False, "⌂"),
    ("Bands",  True,  "♪"),
    ("Events", False, "◷"),
    ("Profile",False, "◉"),
]
tw_each = phone_w // len(tabs)
for ti, (tlbl, tact, tico) in enumerate(tabs):
    tx_ = phone_x + ti * tw_each + tw_each // 2
    ty_ = tab_bg_y + 8
    # icon
    ico_col = C_AMB if tact else (70, 70, 80)
    lbl_col = C_AMB if tact else (65, 65, 75)
    F_ico = tf("arial.ttf", 16)
    F_tl  = tf("arial.ttf",  8)
    ib = draw.textbbox((0,0), tico, font=F_ico)
    iw = ib[2]-ib[0]
    draw.text((tx_ - iw//2, ty_), tico, fill=ico_col, font=F_ico)
    lb = draw.textbbox((0,0), tlbl, font=F_tl)
    lw = lb[2]-lb[0]
    draw.text((tx_ - lw//2, ty_+20), tlbl, fill=lbl_col, font=F_tl)
    # active dot
    if tact:
        draw.ellipse([tx_-2, ty_+30, tx_+2, ty_+34], fill=C_AMB)

# Rounded tab bar corners at bottom of phone
draw.rounded_rectangle(
    [phone_x, tab_bg_y, phone_x+phone_w, phone_y+phone_h],
    radius=fr, fill=None, outline=(14,14,16), width=12
)

# ── HOME INDICATOR ──
hi_y = phone_y + phone_h - 14
hi_w = 96
hi_x = phone_x + (phone_w - hi_w)//2
draw.rounded_rectangle([hi_x, hi_y, hi_x+hi_w, hi_y+4], radius=2, fill=(70,70,76))

# ─── AMBIENT TYPOGRAPHY ────────────────────────────────────────
base_y = H//2 - 58
for i, ch in enumerate("BANDAPA"):
    draw.text((52, base_y + i*17), ch, fill=(50,36,6), font=F_br)

# right side — ensure it fits
right_txt = "BANDS"
for i, ch in enumerate(right_txt):
    draw.text((W-68, base_y + 20 + i*17), ch, fill=(36,26,5), font=F_br)

# ─── SAVE ──────────────────────────────────────────────────────
out = r"C:\claude\bandapa-web\bandapa_bands_screen.png"
canvas.save(out, "PNG")
print(f"Done: {out}  |  {canvas.size}")
