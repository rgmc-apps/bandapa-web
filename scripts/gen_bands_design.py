from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

TMPDIR = r"C:\Users\erarellano\AppData\Local\Temp"
BG_PATH = os.path.join(TMPDIR, "bandapa_bg.png")
OUT = os.path.join(TMPDIR, "bandapa_bands_final.png")

W, H = 1920, 1200

# ─── FONT HELPERS ─────────────────────────────────────────────────────────────
def load_font(size, bold=False):
    candidates_bold = [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
    ]
    candidates_regular = [
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibri.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
    ]
    candidates = candidates_bold if bold else candidates_regular
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def load_font_condensed(size):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


# ─── BACKGROUND ───────────────────────────────────────────────────────────────
img = Image.new("RGB", (W, H), (14, 14, 14))
bg_draw = ImageDraw.Draw(img)

# Warm dark gradient — slightly lighter at top, darker at bottom edges
for i in range(H):
    t = i / H
    r_val = int(22 - 8 * t)
    g_val = int(18 - 5 * t)
    b_val = int(14 - 2 * t)
    bg_draw.line([(0, i), (W, i)], fill=(max(r_val, 10), max(g_val, 10), max(b_val, 10)))

# Amber bokeh
bokeh_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(bokeh_layer)
specs = [
    # Bottom stage floor bokeh — warm amber pools
    (160, 970, 140, 28), (380, 1080, 90, 18), (130, 1120, 70, 12),
    (1730, 920, 150, 28), (1600, 1070, 100, 18), (1810, 1120, 78, 13),
    (590, 1000, 110, 20), (1320, 980, 120, 20), (890, 1070, 85, 14),
    (450, 820, 62, 9),   (1470, 870, 70, 10), (1090, 1120, 92, 14),
    (70, 770, 50, 6),    (1870, 770, 55, 7),
    # Upper atmospheric haze
    (300, 330, 220, 9), (1630, 220, 195, 8), (960, 170, 180, 7),
    (700, 1160, 58, 10), (1200, 1160, 63, 11),
    # Mid-canvas subtle warmth to frame the phone
    (400, 600, 180, 4), (1520, 600, 180, 4),
]
for (cx, cy, r, op) in specs:
    for rr in range(r, 0, -3):
        t = 1 - rr / r
        a = int(op * t * t * 3.2)
        a = min(a, 255)
        bd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(245, 166, 35, a))

bokeh_blur = bokeh_layer.filter(ImageFilter.GaussianBlur(radius=45))
img_rgba = img.convert("RGBA")
img_rgba.alpha_composite(bokeh_blur)
img = img_rgba.convert("RGB")

# Vignette
vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
vd = ImageDraw.Draw(vig)
for i in range(0, 380, 2):
    t = i / 380
    a = int(170 * (1 - t) ** 2.4)
    vd.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(0, 0, 0, a))
img_rgba = img.convert("RGBA")
img_rgba.alpha_composite(vig)
img = img_rgba.convert("RGB")
draw = ImageDraw.Draw(img)

print("Background built.")

# ─── PHONE DIMENSIONS ─────────────────────────────────────────────────────────
# Larger phone — fills the canvas height with comfortable 60px top/bottom margin
PHONE_H = 1080
PHONE_W = int(PHONE_H * 390 / 844)  # ~499px — standard iPhone aspect ratio
PHONE_X = (W - PHONE_W) // 2
PHONE_Y = (H - PHONE_H) // 2

# ─── PHONE SHADOW & GLOW ─────────────────────────────────────────────────────
shadow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow_layer)
# Hard drop shadow
for s in range(60, 0, -2):
    a = int(200 * (1 - s / 60) ** 1.6)
    sd.rounded_rectangle(
        [PHONE_X - s + 10, PHONE_Y - s + 18,
         PHONE_X + PHONE_W + s + 10, PHONE_Y + PHONE_H + s + 18],
        radius=60, fill=(0, 0, 0, a)
    )
# Amber edge glow — warm halo around phone body
for s in range(40, 0, -2):
    a = int(28 * (1 - s / 40) ** 1.8)
    sd.rounded_rectangle(
        [PHONE_X - s, PHONE_Y + PHONE_H // 3 - s,
         PHONE_X + PHONE_W + s, PHONE_Y + PHONE_H * 2 // 3 + s],
        radius=s + 40, fill=(245, 166, 35, a)
    )
img_rgba = img.convert("RGBA")
img_rgba.alpha_composite(shadow_layer)
img = img_rgba.convert("RGB")
draw = ImageDraw.Draw(img)

# ─── PHONE BODY ───────────────────────────────────────────────────────────────
BEZEL = (25, 24, 28)
BEZEL_RIM = (58, 52, 40)
draw.rounded_rectangle(
    [PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + PHONE_H],
    radius=56, fill=BEZEL
)
draw.rounded_rectangle(
    [PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + PHONE_H],
    radius=56, outline=BEZEL_RIM, width=2
)

# Screen inset
INSET = 12
SCR_X = PHONE_X + INSET
SCR_Y = PHONE_Y + INSET
SCR_W = PHONE_W - INSET * 2
SCR_H = PHONE_H - INSET * 2
draw.rounded_rectangle(
    [SCR_X, SCR_Y, SCR_X + SCR_W, SCR_Y + SCR_H],
    radius=46, fill=(20, 20, 20)
)

# Dynamic island
DI_W = int(SCR_W * 0.30)
DI_H = 30
DI_X = SCR_X + (SCR_W - DI_W) // 2
DI_Y = SCR_Y + 14
draw.rounded_rectangle([DI_X, DI_Y, DI_X + DI_W, DI_Y + DI_H], radius=15, fill=(10, 10, 10))

# Side buttons
BTN_C = (34, 33, 38)
draw.rounded_rectangle([PHONE_X - 5, PHONE_Y + 160, PHONE_X, PHONE_Y + 200], radius=2, fill=BTN_C)
draw.rounded_rectangle([PHONE_X - 5, PHONE_Y + 218, PHONE_X, PHONE_Y + 268], radius=2, fill=BTN_C)
draw.rounded_rectangle([PHONE_X + PHONE_W, PHONE_Y + 200, PHONE_X + PHONE_W + 5, PHONE_Y + 310], radius=2, fill=BTN_C)

print("Phone frame done.")

# ─── SCREEN CONTENT ───────────────────────────────────────────────────────────
def sx(x): return SCR_X + x
def sy(y): return SCR_Y + y

# Scale factor relative to reference 380px screen width
SCALE = SCR_W / 380.0

C_BG       = (20, 20, 20)
C_CARD     = (28, 28, 28)
C_CARD_HL  = (34, 31, 24)
C_AMBER    = (245, 166, 35)
C_AMBER_DK = (180, 120, 18)
C_TEXT     = (240, 238, 232)
C_MUTED    = (120, 118, 112)
C_DIM      = (78, 76, 70)
C_BORDER   = (42, 40, 36)
C_BDR_HL   = (95, 70, 18)
C_DASHED   = (52, 50, 46)

def sc(v): return int(v * SCALE)


# ── Status bar ───────────────────────────────────────────────────────────────
STATUS_Y = sy(58)
font_status = load_font(sc(12))
draw.text((sx(sc(22)), STATUS_Y), "9:41", font=font_status, fill=C_MUTED)
# Battery
bx, by = sx(SCR_W - sc(62)), STATUS_Y + 2
draw.rounded_rectangle([bx, by, bx + sc(20), by + sc(11)], radius=2, outline=C_MUTED, width=1)
draw.rectangle([bx + sc(21), by + sc(3), bx + sc(23), by + sc(8)], fill=C_MUTED)
draw.rectangle([bx + 1, by + 1, bx + sc(14), by + sc(9)], fill=C_MUTED)
# WiFi / signal arcs
for di in range(3):
    r2 = sc(3 + di * 1)
    dxx = sx(SCR_W - sc(38)) + di * sc(9)
    draw.ellipse([dxx, by + sc(5) - r2, dxx + r2 * 2, by + sc(5) + r2], fill=C_MUTED)


# ── Header ───────────────────────────────────────────────────────────────────
HEADER_Y = sy(sc(102))
font_title = load_font_condensed(sc(38))
draw.text((sx(sc(24)), HEADER_Y), "Bands", font=font_title, fill=C_TEXT)

# "+" amber circle button
PLUS_R = sc(20)
PLUS_CX = sx(SCR_W - sc(38))
PLUS_CY = HEADER_Y + sc(18)
draw.ellipse(
    [PLUS_CX - PLUS_R, PLUS_CY - PLUS_R, PLUS_CX + PLUS_R, PLUS_CY + PLUS_R],
    fill=C_AMBER
)
font_plus = load_font(sc(24), bold=True)
plus_bb = draw.textbbox((0, 0), "+", font=font_plus)
plus_w = plus_bb[2] - plus_bb[0]
plus_h = plus_bb[3] - plus_bb[1]
draw.text((PLUS_CX - plus_w // 2, PLUS_CY - plus_h // 2 - sc(1)), "+", font=font_plus, fill=(18, 18, 18))


# ── Action Buttons ────────────────────────────────────────────────────────────
BTN_Y = HEADER_Y + sc(58)
BTN_H = sc(40)
BTN_GAP = sc(10)
BTN_W = (SCR_W - sc(48) - BTN_GAP) // 2

CB_X = sx(sc(24))
# Amber filled pill
draw.rounded_rectangle([CB_X, BTN_Y, CB_X + BTN_W, BTN_Y + BTN_H], radius=BTN_H // 2, fill=C_AMBER)
font_btn = load_font(sc(14), bold=True)
cb_text = "Create band"
cb_bb = draw.textbbox((0, 0), cb_text, font=font_btn)
cb_tw = cb_bb[2] - cb_bb[0]
draw.text((CB_X + (BTN_W - cb_tw) // 2, BTN_Y + (BTN_H - (cb_bb[3]-cb_bb[1])) // 2), cb_text, font=font_btn, fill=(18, 18, 18))

JC_X = CB_X + BTN_W + BTN_GAP
# Zinc outline pill
draw.rounded_rectangle([JC_X, BTN_Y, JC_X + BTN_W, BTN_Y + BTN_H], radius=BTN_H // 2, fill=(30, 29, 26), outline=(55, 53, 48), width=1)
jc_text = "Join with code"
jc_bb = draw.textbbox((0, 0), jc_text, font=font_btn)
jc_tw = jc_bb[2] - jc_bb[0]
draw.text((JC_X + (BTN_W - jc_tw) // 2, BTN_Y + (BTN_H - (jc_bb[3]-jc_bb[1])) // 2), jc_text, font=font_btn, fill=C_MUTED)


# ── Band Cards ────────────────────────────────────────────────────────────────
CARD_PAD_H = sc(20)
CARD_X     = sx(sc(16))
CARD_W     = SCR_W - sc(32)
CARD_H     = sc(90)
CARD_GAP   = sc(10)
CARD_R     = sc(18)
CARD_Y0    = BTN_Y + BTN_H + sc(24)

band_data = [
    {"name": "The Midnight Collective", "genres": "Rock  ·  Indie",        "members": "4 members", "admin": True,  "hl": True},
    {"name": "Coda Republic",           "genres": "Alternative  ·  Metal", "members": "7 members", "admin": False, "hl": False},
    {"name": "Solo Project",            "genres": "Electronic  ·  Ambient","members": "1 member",  "admin": False, "hl": False},
]

font_band  = load_font(sc(15), bold=True)
font_genre = load_font(sc(12))
font_meta  = load_font(sc(12))
font_admin = load_font(sc(11), bold=True)

for i, band in enumerate(band_data):
    cy = CARD_Y0 + i * (CARD_H + CARD_GAP)
    is_hl = band["hl"]

    # Highlighted card: amber glow + deeper shadow (rendered as RGBA composite)
    if is_hl:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        # Soft drop shadow
        for s in range(22, 0, -1):
            a = int(110 * (1 - s / 22) ** 1.5)
            gd.rounded_rectangle(
                [CARD_X - s + 5, cy - s + 8,
                 CARD_X + CARD_W + s + 5, cy + CARD_H + s + 8],
                radius=CARD_R + s, fill=(0, 0, 0, a)
            )
        # Amber glow halo
        for s in range(14, 0, -1):
            a = int(55 * (1 - s / 14) ** 2)
            gd.rounded_rectangle(
                [CARD_X - s, cy - s, CARD_X + CARD_W + s, cy + CARD_H + s],
                radius=CARD_R + s, fill=(245, 166, 35, a)
            )
        img_rgba = img.convert("RGBA")
        img_rgba.alpha_composite(glow)
        img = img_rgba.convert("RGB")
        draw = ImageDraw.Draw(img)
    else:
        # Subtle shadow for non-highlighted cards
        for s in range(6, 0, -1):
            a = int(40 * (1 - s / 6))
            draw.rounded_rectangle(
                [CARD_X - s + 2, cy - s + 3,
                 CARD_X + CARD_W + s + 2, cy + CARD_H + s + 3],
                radius=CARD_R + s, fill=(10, 10, 10)
            )

    # Card body
    fill = C_CARD_HL if is_hl else C_CARD
    draw.rounded_rectangle([CARD_X, cy, CARD_X + CARD_W, cy + CARD_H],
                            radius=CARD_R, fill=fill)
    border = C_BDR_HL if is_hl else C_BORDER
    draw.rounded_rectangle([CARD_X, cy, CARD_X + CARD_W, cy + CARD_H],
                            radius=CARD_R, outline=border, width=1)

    # Subtle inner highlight top edge on highlighted card
    if is_hl:
        draw.rounded_rectangle([CARD_X + 1, cy + 1, CARD_X + CARD_W - 1, cy + 3],
                                radius=CARD_R, fill=(100, 80, 30))

    # ── Avatar placeholder (48x48) ─────────────────────────────────────────
    AV = sc(48)
    AV_X = CARD_X + sc(14)
    AV_Y = cy + (CARD_H - AV) // 2
    draw.rounded_rectangle([AV_X, AV_Y, AV_X + AV, AV_Y + AV],
                            radius=sc(10), fill=(42, 30, 7))
    draw.rounded_rectangle([AV_X, AV_Y, AV_X + AV, AV_Y + AV],
                            radius=sc(10), outline=(78, 54, 11), width=1)

    # Music note icon centered in avatar
    nx = AV_X + AV // 2
    ny = AV_Y + AV // 2
    # Note head
    draw.ellipse([nx - sc(7), ny + sc(2), nx + sc(2), ny + sc(10)], fill=C_AMBER)
    # Stem
    draw.rectangle([nx + sc(1), ny - sc(10), nx + sc(3), ny + sc(6)], fill=C_AMBER)
    # Flag / beam
    draw.polygon([
        (nx + sc(1), ny - sc(10)),
        (nx + sc(12), ny - sc(14)),
        (nx + sc(12), ny - sc(9)),
        (nx + sc(1), ny - sc(5))
    ], fill=C_AMBER)

    # ── Text block ────────────────────────────────────────────────────────
    TX = AV_X + AV + sc(12)
    TY_NAME  = cy + sc(14)
    TY_GENRE = TY_NAME + sc(22)
    TY_META  = TY_GENRE + sc(18)

    name_col = C_TEXT
    draw.text((TX, TY_NAME), band["name"], font=font_band, fill=name_col)
    draw.text((TX, TY_GENRE), band["genres"], font=font_genre, fill=C_MUTED)

    # People icon
    draw.ellipse([TX, TY_META + sc(3), TX + sc(5), TY_META + sc(8)], fill=C_DIM)
    draw.ellipse([TX + sc(4), TY_META + sc(2), TX + sc(9), TY_META + sc(7)], fill=C_DIM)
    draw.text((TX + sc(13), TY_META), band["members"], font=font_meta, fill=C_DIM)

    # Admin badge
    if band["admin"]:
        mb_bb = draw.textbbox((0, 0), band["members"], font=font_meta)
        BDG_X = TX + sc(13) + (mb_bb[2] - mb_bb[0]) + sc(8)
        BDG_Y = TY_META - sc(2)
        BDG_W = sc(46)
        BDG_H = sc(18)
        draw.rounded_rectangle([BDG_X, BDG_Y, BDG_X + BDG_W, BDG_Y + BDG_H],
                                radius=BDG_H // 2, fill=(58, 40, 5))
        draw.rounded_rectangle([BDG_X, BDG_Y, BDG_X + BDG_W, BDG_Y + BDG_H],
                                radius=BDG_H // 2, outline=(115, 82, 10), width=1)
        a_bb = draw.textbbox((0, 0), "Admin", font=font_admin)
        a_w = a_bb[2] - a_bb[0]
        draw.text((BDG_X + (BDG_W - a_w) // 2, BDG_Y + sc(3)), "Admin",
                  font=font_admin, fill=C_AMBER)

    # Chevron
    CVX = CARD_X + CARD_W - sc(26)
    CVY = cy + CARD_H // 2
    CHSZ = sc(7)
    draw.line([(CVX, CVY - CHSZ), (CVX + CHSZ, CVY)], fill=C_DIM, width=2)
    draw.line([(CVX + CHSZ, CVY), (CVX, CVY + CHSZ)], fill=C_DIM, width=2)

print("Cards done.")

# ── Ghost empty-state card ────────────────────────────────────────────────────
GHOST_Y = CARD_Y0 + 3 * (CARD_H + CARD_GAP)
GHOST_H  = sc(56)

draw.rounded_rectangle([CARD_X, GHOST_Y, CARD_X + CARD_W, GHOST_Y + GHOST_H],
                        radius=CARD_R, outline=C_DASHED, width=1)
# Dashed top & bottom edges (erase segments)
for step in range(0, CARD_W, sc(14)):
    if (step // sc(14)) % 2 == 1:
        x0 = CARD_X + step
        x1 = min(x0 + sc(6), CARD_X + CARD_W)
        draw.rectangle([x0, GHOST_Y, x1, GHOST_Y + 1], fill=C_BG)
        draw.rectangle([x0, GHOST_Y + GHOST_H - 1, x1, GHOST_Y + GHOST_H], fill=C_BG)

font_ghost = load_font(sc(13))
gh_text = "+   Join or create a band"
gh_bb = draw.textbbox((0, 0), gh_text, font=font_ghost)
gh_w = gh_bb[2] - gh_bb[0]
gh_h = gh_bb[3] - gh_bb[1]
draw.text(
    (CARD_X + (CARD_W - gh_w) // 2, GHOST_Y + (GHOST_H - gh_h) // 2),
    gh_text, font=font_ghost, fill=C_DASHED
)


# ── Bottom tab bar ────────────────────────────────────────────────────────────
TAB_H = sc(74)
TAB_Y = sy(SCR_H - TAB_H)

# Separator line
draw.line([(sx(0), TAB_Y), (sx(SCR_W), TAB_Y)], fill=(36, 34, 30), width=1)
draw.rectangle([sx(0), TAB_Y + 1, sx(SCR_W), sy(SCR_H)], fill=(22, 22, 22))

tab_items = [
    ("Home",    False),
    ("Bands",   True),
    ("Events",  False),
    ("Profile", False),
]
NCOL = len(tab_items)
tab_w = SCR_W // NCOL
font_tab_lbl = load_font(sc(10))

for ti, (label, active) in enumerate(tab_items):
    tcx = sx(ti * tab_w + tab_w // 2)
    icon_y = TAB_Y + sc(12)
    ic = C_AMBER if active else C_DIM
    lc = C_AMBER if active else C_DIM

    IS = sc(10)   # icon half-size

    if label == "Home":
        # House outline
        draw.line([(tcx, icon_y), (tcx - IS, icon_y + IS)], fill=ic, width=2)
        draw.line([(tcx, icon_y), (tcx + IS, icon_y + IS)], fill=ic, width=2)
        draw.rectangle([tcx - IS + sc(2), icon_y + IS, tcx + IS - sc(2), icon_y + IS * 2], outline=ic, width=1)

    elif label == "Bands":
        # Double music note
        draw.ellipse([tcx - IS, icon_y + IS - sc(2), tcx - IS + sc(7), icon_y + IS + sc(5)], fill=ic)
        draw.rectangle([tcx - IS + sc(6), icon_y - IS + sc(2), tcx - IS + sc(8), icon_y + IS + sc(1)], fill=ic)
        draw.ellipse([tcx - IS + sc(8), icon_y + IS - sc(2), tcx - IS + sc(15), icon_y + IS + sc(5)], fill=ic)
        draw.rectangle([tcx - IS + sc(14), icon_y - IS, tcx - IS + sc(16), icon_y + IS + sc(1)], fill=ic)
        draw.line([(tcx - IS + sc(6), icon_y - IS + sc(2)), (tcx - IS + sc(16), icon_y - IS)], fill=ic, width=2)
        # Active indicator pill
        if active:
            draw.ellipse([tcx - sc(2), TAB_Y + TAB_H - sc(8), tcx + sc(2), TAB_Y + TAB_H - sc(4)], fill=C_AMBER)

    elif label == "Events":
        draw.rounded_rectangle([tcx - IS, icon_y - sc(4), tcx + IS, icon_y + IS * 2 - sc(2)],
                                radius=sc(2), outline=ic, width=1)
        draw.line([(tcx - IS, icon_y + sc(2)), (tcx + IS, icon_y + sc(2))], fill=ic, width=1)
        draw.rectangle([tcx - sc(3), icon_y + sc(5), tcx - sc(1), icon_y + sc(8)], fill=ic)
        draw.rectangle([tcx + sc(1), icon_y + sc(5), tcx + sc(3), icon_y + sc(8)], fill=ic)

    elif label == "Profile":
        draw.ellipse([tcx - sc(5), icon_y - sc(2), tcx + sc(5), icon_y + sc(8)], fill=ic)
        draw.arc([tcx - IS, icon_y + sc(6), tcx + IS, icon_y + IS * 2 + sc(2)],
                 start=0, end=180, fill=ic, width=2)

    lbl_bb = draw.textbbox((0, 0), label, font=font_tab_lbl)
    lbl_w = lbl_bb[2] - lbl_bb[0]
    draw.text((tcx - lbl_w // 2, TAB_Y + sc(38)), label, font=font_tab_lbl, fill=lc)

# Home indicator
HI_W = sc(110)
HI_H = sc(4)
HI_X = sx(SCR_W // 2 - HI_W // 2)
HI_Y = sy(SCR_H - sc(8))
draw.rounded_rectangle([HI_X, HI_Y, HI_X + HI_W, HI_Y + HI_H], radius=2, fill=(68, 65, 58))

print("Tab bar done.")

# ─── CANVAS ANNOTATIONS ───────────────────────────────────────────────────────
font_brand    = load_font_condensed(24)
font_spec_v   = load_font(15, bold=True)
font_spec_l   = load_font(13)
font_cap      = load_font(14)
font_cap_sm   = load_font(12)

# Brandmark top-left
draw.text((52, 46), "BANDAPA", font=font_brand, fill=(88, 80, 54))

# ── Left spec panel (vertically centered against phone) ──────────────────────
specs_L = [
    ("#141414", (20, 20, 20),    "Screen background"),
    ("#1C1C1C", (28, 28, 28),    "Card surface"),
    ("#F5A623", (245, 166, 35),  "Amber accent"),
    ("16–18 px",  None,          "Card border radius"),
    ("48 × 48",   None,          "Band avatar size"),
    ("Elevated",  None,          "Active card state"),
]
ROW_H = 58
PANEL_H = len(specs_L) * ROW_H
LX = 68
LY0 = PHONE_Y + (PHONE_H - PANEL_H) // 2

for idx, (val, swatch, label) in enumerate(specs_L):
    y = LY0 + idx * ROW_H
    # Divider line
    if idx > 0:
        draw.line([(LX, y - 8), (LX + 180, y - 8)], fill=(38, 36, 30), width=1)
    if swatch:
        sw_x, sw_y = LX, y + 2
        draw.rounded_rectangle([sw_x, sw_y, sw_x + 18, sw_y + 18], radius=4,
                                fill=swatch, outline=(68, 65, 54), width=1)
        draw.text((sw_x + 24, y), val, font=font_spec_v, fill=(172, 164, 130))
        draw.text((sw_x + 24, y + 20), label, font=font_spec_l, fill=(88, 84, 66))
    else:
        draw.text((LX, y), val, font=font_spec_v, fill=(172, 164, 130))
        draw.text((LX, y + 20), label, font=font_spec_l, fill=(88, 84, 66))

# ── Right spec panel ─────────────────────────────────────────────────────────
specs_R = [
    ("Compressed bold",   "Title typeface"),
    ("Clean grotesk",     "Body & card type"),
    ("Amber border glow", "Active card treatment"),
    ("Amber pill badge",  "Admin role indicator"),
    ("Dashed ghost card", "Empty state hint"),
    ("Zinc outline pill", "Secondary action"),
]
RX = W - 260
RY0 = LY0
for idx, (val, label) in enumerate(specs_R):
    y = RY0 + idx * ROW_H
    if idx > 0:
        draw.line([(RX, y - 8), (RX + 220, y - 8)], fill=(38, 36, 30), width=1)
    draw.text((RX, y), val, font=font_spec_v, fill=(172, 164, 130))
    draw.text((RX, y + 20), label, font=font_spec_l, fill=(88, 84, 66))

# ── Footer caption ────────────────────────────────────────────────────────────
cap1 = "Bandapa  ·  My Bands  ·  iOS Mobile  ·  Design Reference"
cap2 = "#141414 bg  /  #1C1C1C cards  /  #F5A623 amber  /  Dark stage environment with amber bokeh"
c1_bb = draw.textbbox((0, 0), cap1, font=font_cap)
c2_bb = draw.textbbox((0, 0), cap2, font=font_cap_sm)
CAP_Y = PHONE_Y + PHONE_H + 18
draw.text(((W - (c1_bb[2] - c1_bb[0])) // 2, CAP_Y), cap1, font=font_cap, fill=(110, 104, 80))
draw.text(((W - (c2_bb[2] - c2_bb[0])) // 2, CAP_Y + 20), cap2, font=font_cap_sm, fill=(66, 63, 52))

img.save(OUT)
print(f"Saved: {OUT}  {img.size}")
