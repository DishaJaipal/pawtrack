"""Builds the PawTrack technical overview PDF."""
import sys

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.platypus import (
    KeepTogether, PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle,
)

OUT = sys.argv[1]

FD = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("Sans", FD + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Bold", FD + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Mono", FD + "DejaVuSansMono.ttf"))
addMapping("Sans", 0, 0, "Sans")
addMapping("Sans", 1, 0, "Sans-Bold")
addMapping("Sans", 0, 1, "Sans")
addMapping("Sans", 1, 1, "Sans-Bold")

# ---------- palette ----------
INK = colors.HexColor("#1f2933")
MUTED = colors.HexColor("#52606d")
ACCENT = colors.HexColor("#0f766e")
ACCENT_LIGHT = colors.HexColor("#ccfbf1")
ACCENT2 = colors.HexColor("#b45309")
ACCENT2_LIGHT = colors.HexColor("#fef3c7")
BLUE = colors.HexColor("#1d4ed8")
BLUE_LIGHT = colors.HexColor("#dbeafe")
PURPLE = colors.HexColor("#6d28d9")
PURPLE_LIGHT = colors.HexColor("#ede9fe")
GREY_LIGHT = colors.HexColor("#f1f5f9")
RULE = colors.HexColor("#cbd5e1")

# ---------- styles ----------
base = ParagraphStyle("base", fontName="Sans", fontSize=10, leading=14.5, textColor=INK, spaceAfter=6)
body = base
small = ParagraphStyle("small", parent=base, fontSize=8.5, leading=11.5, textColor=MUTED)
h1 = ParagraphStyle("h1", parent=base, fontName="Sans-Bold", fontSize=19, leading=24, textColor=ACCENT,
                    spaceBefore=4, spaceAfter=10)
h2 = ParagraphStyle("h2", parent=base, fontName="Sans-Bold", fontSize=13, leading=17, textColor=INK,
                    spaceBefore=10, spaceAfter=5)
h3 = ParagraphStyle("h3", parent=base, fontName="Sans-Bold", fontSize=10.5, leading=14, textColor=ACCENT,
                    spaceBefore=6, spaceAfter=3)
bullet = ParagraphStyle("bullet", parent=base, leftIndent=14, bulletIndent=3, spaceAfter=3)
cell = ParagraphStyle("cell", parent=base, fontSize=8.8, leading=11.8, spaceAfter=0)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Sans-Bold")
code = ParagraphStyle("code", fontName="Mono", fontSize=8, leading=10.5, textColor=INK,
                      backColor=GREY_LIGHT, borderPadding=6, leftIndent=6, rightIndent=6,
                      spaceBefore=4, spaceAfter=10)
callout_style = ParagraphStyle("callout", parent=base, fontSize=9.5, leading=13.5, spaceAfter=0)

story = []


def P(text, style=body):
    story.append(Paragraph(text, style))


def H1(text):
    story.append(Paragraph(text, h1))


def H2(text):
    story.append(Paragraph(text, h2))


def H3(text):
    story.append(Paragraph(text, h3))


def BUL(items):
    for it in items:
        story.append(Paragraph(it, bullet, bulletText="•"))
    story.append(Spacer(1, 4))


def CODE(text):
    story.append(Preformatted(text.strip("\n"), code))


def CALLOUT(title, text, bg=ACCENT_LIGHT, fg=ACCENT):
    t = Table([[Paragraph(f"<font color='#{fg.hexval()[2:]}'><b>{title}</b></font><br/>{text}",
                          callout_style)]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3, fg),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(Spacer(1, 3))
    story.append(t)
    story.append(Spacer(1, 8))


def TABLE(rows, widths, header=True):
    data = []
    for i, r in enumerate(rows):
        st = cellb if (header and i == 0) else cell
        data.append([Paragraph(str(c), st) for c in r])
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1 if header else 0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), ACCENT_LIGHT)]
    for i in range(1 if header else 0, len(rows)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")))
    t.setStyle(TableStyle(style))
    story.append(t)
    story.append(Spacer(1, 10))


# ---------- diagram helpers ----------
def box(d, x, y, w, h, label, fill=BLUE_LIGHT, stroke=BLUE, sub=None, fs=8.5):
    d.add(Rect(x, y, w, h, rx=5, ry=5, fillColor=fill, strokeColor=stroke, strokeWidth=1))
    if sub:
        d.add(String(x + w / 2, y + h / 2 + 2, label, fontName="Sans-Bold", fontSize=fs,
                     fillColor=INK, textAnchor="middle"))
        lines = sub if isinstance(sub, list) else [sub]
        for i, s in enumerate(lines):
            d.add(String(x + w / 2, y + h / 2 - 9 - i * 9, s, fontName="Sans", fontSize=6.8,
                         fillColor=MUTED, textAnchor="middle"))
    else:
        d.add(String(x + w / 2, y + h / 2 - 3, label, fontName="Sans-Bold", fontSize=fs,
                     fillColor=INK, textAnchor="middle"))


def arrow(d, x1, y1, x2, y2, label=None, color=MUTED, dashed=False, lx=0, ly=0, both=False):
    ln = Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1)
    if dashed:
        ln.strokeDashArray = [3, 2]
    d.add(ln)
    import math
    ang = math.atan2(y2 - y1, x2 - x1)

    def head(px, py, a):
        s = 5
        p1 = (px - s * math.cos(a - 0.4), py - s * math.sin(a - 0.4))
        p2 = (px - s * math.cos(a + 0.4), py - s * math.sin(a + 0.4))
        d.add(Polygon([px, py, p1[0], p1[1], p2[0], p2[1]], fillColor=color, strokeColor=color))

    head(x2, y2, ang)
    if both:
        head(x1, y1, ang + math.pi)
    if label:
        cx, cy = (x1 + x2) / 2 + lx, (y1 + y2) / 2 + ly
        tw = pdfmetrics.stringWidth(label, "Sans", 6.8)
        d.add(Rect(cx - tw / 2 - 1.5, cy - 2, tw + 3, 8.5, fillColor=colors.white, strokeColor=None))
        d.add(String(cx, cy, label, fontName="Sans", fontSize=6.8, fillColor=color, textAnchor="middle"))


def caption(text):
    story.append(Paragraph(text, ParagraphStyle("cap", parent=small, alignment=TA_CENTER, spaceAfter=10)))


# ---------- page decoration ----------
def on_page(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(20 * mm, 285 * mm, 190 * mm, 285 * mm)
        canvas.setFont("Sans", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(20 * mm, 287 * mm, "PawTrack — Technical Overview")
        canvas.drawRightString(190 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def on_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ACCENT)
    canvas.rect(0, 200 * mm, 210 * mm, 97 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Sans-Bold", 38)
    canvas.drawString(20 * mm, 255 * mm, "PawTrack")
    canvas.setFont("Sans", 16)
    canvas.drawString(20 * mm, 242 * mm, "Technical Overview & Theory of Operation")
    canvas.setFont("Sans", 10.5)
    canvas.drawString(20 * mm, 225 * mm, "A pet-care platform connecting pet parents with vets, groomers,")
    canvas.drawString(20 * mm, 219 * mm, "trainers and sitters — how it is built, and why it is built that way.")
    canvas.restoreState()


# =====================================================================
# COVER
# =====================================================================
story.append(Spacer(1, 95 * mm))
P("<b>What this document is</b>", h2)
P("A conceptual, theory-first walkthrough of the PawTrack codebase. It explains the architecture, the "
  "data model, and the key algorithms (booking concurrency, slot generation, reminders, real-time "
  "notifications, distance search) in plain language, with just enough code to anchor each idea. It is "
  "written so you can both <i>understand</i> the system and <i>explain</i> it to someone else — for a "
  "project review, viva, interview or onboarding.")
P("<b>Contents</b>", h2)
toc = [
    "1. The product in one page", "2. Technology stack and why each piece was chosen",
    "3. System architecture", "4. Backend structure and the request lifecycle",
    "5. Authentication and authorization", "6. The data model",
    "7. The booking engine (concurrency and state)", "8. Availability: generating time slots",
    "9. Notifications: scheduled reminders and real-time push", "10. Provider discovery: geocoding and distance",
    "11. Medical records and secure file handling", "12. Reference data: species and breeds",
    "13. Frontend architecture", "14. Data integrity, auditing and security principles",
    "15. API reference", "16. Limitations, scaling path and future work",
    "17. Explaining PawTrack: common questions and model answers",
]
for t in toc:
    story.append(Paragraph(t, ParagraphStyle("toc", parent=base, spaceAfter=1.5, leftIndent=6)))
story.append(PageBreak())

# =====================================================================
# 1. PRODUCT
# =====================================================================
H1("1. The product in one page")
P("PawTrack is a two-sided web application. On one side are <b>pet parents</b>, who keep profiles for "
  "their pets, find nearby care providers, book appointments and keep a medical history. On the other "
  "side are <b>providers</b> — vet clinics, independent vets, groomers, trainers and pet sitters — who "
  "publish services, manage staff and their working hours, run their appointment calendar and upload "
  "records after each visit.")
P("Everything in the system revolves around one central event: <b>a booking</b>. A booking ties together "
  "a pet, its owner, a provider, a service, a specific staff member and a specific time slot. Most of the "
  "interesting engineering — concurrency control, notifications, access control to medical records — "
  "exists to make that one event correct and useful for both sides.")

TABLE([
    ["Pet parent can…", "Provider can…"],
    ["Sign up with a first pet in one step", "Sign up as one of five provider types"],
    ["Add, edit and remove pets (age, weight, breed, alerts/allergies)",
     "Create services (category, price, duration) and activate/deactivate them"],
    ["Search providers by name, type, text location or GPS distance",
     "Add staff members and assign which services each can perform"],
    ["See live availability and book a slot for a service",
     "Generate availability slots in bulk (date range × daily hours × weekdays)"],
    ["Cancel or reschedule an appointment", "See a weekly calendar; cancel, reschedule or complete visits"],
    ["View a filtered medical timeline and download files",
     "Upload records (vaccination, lab result, prescription…) tied to a visit"],
    ["Receive instant and scheduled notifications", "See a client list built from completed visits"],
], [85, 85])

H2("The two user journeys at a glance")
d = Drawing(170 * mm, 62 * mm)
W = 170 * mm
steps_p = ["Sign up\n+ first pet", "Find\nprovider", "Pick service\n& slot", "Booking\ncreated", "Get\nreminders", "View\nrecords"]
steps_v = ["Sign up\n(type)", "Services\n& staff", "Generate\nslots", "Receive\nbooking", "Visit &\ncomplete", "Upload\nrecords"]
bw, gap = 23 * mm, 5.4 * mm
for row, (steps, fill, stroke, label) in enumerate([(steps_p, ACCENT_LIGHT, ACCENT, "Pet parent"),
                                                     (steps_v, ACCENT2_LIGHT, ACCENT2, "Provider")]):
    y = 36 * mm - row * 28 * mm
    d.add(String(0, y + 20 * mm, label, fontName="Sans-Bold", fontSize=8.5, fillColor=stroke))
    for i, s in enumerate(steps):
        x = i * (bw + gap)
        d.add(Rect(x, y, bw, 15 * mm, rx=5, ry=5, fillColor=fill, strokeColor=stroke))
        parts = s.split("\n")
        for j, part in enumerate(parts):
            d.add(String(x + bw / 2, y + 15 * mm / 2 + 2 - j * 9 + (len(parts) - 1) * 3, part,
                         fontName="Sans", fontSize=7.5, fillColor=INK, textAnchor="middle"))
        if i < len(steps) - 1:
            arrow(d, x + bw + 0.5, y + 7.5 * mm, x + bw + gap - 0.5, y + 7.5 * mm, color=stroke)
story.append(d)
caption("Figure 1 — The booking sits in the middle of both journeys; it is the point where the two sides meet.")

# =====================================================================
# 2. STACK
# =====================================================================
story.append(PageBreak())
H1("2. Technology stack and why each piece was chosen")
P("PawTrack is a classic <b>three-tier web application</b>: a browser-based single-page app (presentation "
  "tier), a stateless-ish HTTP API (application tier) and a relational database (data tier). Every "
  "technology is a mainstream, well-documented choice; the overall philosophy is <i>simple, single-process, "
  "no paid services</i>.")
TABLE([
    ["Layer", "Technology", "Role in PawTrack", "Why it fits"],
    ["UI library", "React 19", "Component-based UI for all pages", "Declarative UI; state drives rendering; huge ecosystem"],
    ["Routing", "React Router 7", "Client-side routes such as /pets/:petId, /provider/dashboard",
     "Page navigation without full reloads; nested route guards"],
    ["Styling", "Tailwind CSS 4", "Utility classes directly in JSX", "Fast iteration, consistent design tokens, tiny CSS output"],
    ["Build/dev", "Vite 8", "Dev server, hot reload, production bundling, /api proxy",
     "Near-instant startup; proxy removes CORS pain in development"],
    ["Linting", "oxlint", "Static checks on frontend code", "Very fast Rust-based linter"],
    ["Runtime", "Node.js + TypeScript", "Backend language and type system", "Same language as frontend; compile-time type safety"],
    ["HTTP framework", "Express 4", "Routing, middleware, JSON handling", "Minimal, well-understood middleware model"],
    ["ORM", "Prisma 5", "Schema, migrations, type-safe queries, transactions",
     "Schema-as-code; generated types catch query mistakes at compile time"],
    ["Database", "SQLite", "Single-file relational database", "Zero setup; real SQL, foreign keys and transactions"],
    ["Validation", "Zod", "Validates every request body and enum value", "Runtime checks that also produce TypeScript types"],
    ["Passwords", "bcrypt", "Salted, slow password hashing", "Industry standard; resistant to brute force"],
    ["Sessions", "jsonwebtoken + cookie-parser", "Signed login token in an httpOnly cookie", "Stateless auth; no session table needed"],
    ["Uploads", "multer", "multipart/form-data parsing and disk storage", "Standard Express upload middleware"],
    ["Scheduling", "node-cron", "Runs the reminder dispatcher every 5 minutes", "In-process cron; no external job queue"],
    ["Geocoding", "OpenStreetMap Nominatim", "Converts provider addresses to latitude/longitude", "Free, no API key"],
], [22, 30, 58, 60])
CALLOUT("Key idea: one language end-to-end",
        "JavaScript/TypeScript runs on both the browser and the server. This lowers context-switching, lets "
        "the JSON shapes flow naturally between tiers, and means one developer can own a feature end to end.")

# =====================================================================
# 3. ARCHITECTURE
# =====================================================================
H1("3. System architecture")
P("The diagram below shows every runtime component and how data flows between them. Notice that there is "
  "exactly <b>one server process</b> and <b>one database file</b>: in-memory structures (the live "
  "notification connections) and the scheduled job all live inside that one Node process.")

d = Drawing(170 * mm, 128 * mm)
box(d, 0, 98 * mm, 58 * mm, 28 * mm, "Browser (SPA)", ACCENT_LIGHT, ACCENT,
    ["React + React Router", "AuthContext · useNotifications", "fetch() · EventSource · geolocation"])
box(d, 72 * mm, 104 * mm, 52 * mm, 15 * mm, "Vite dev server", GREY_LIGHT, MUTED, "serves JS/CSS · proxies /api")
arrow(d, 58.5 * mm, 111.5 * mm, 71.5 * mm, 111.5 * mm, both=True)
d.add(Rect(0, 22 * mm, 170 * mm, 70 * mm, rx=6, ry=6, fillColor=None, strokeColor=BLUE, strokeWidth=1,
           strokeDashArray=[4, 3]))
d.add(String(31 * mm, 86 * mm, "Node.js process", fontName="Sans-Bold", fontSize=8, fillColor=BLUE))
d.add(String(31 * mm, 82 * mm, "Express · port 4000", fontName="Sans", fontSize=7, fillColor=BLUE))
box(d, 60 * mm, 74 * mm, 108 * mm, 13 * mm, "Middleware chain", BLUE_LIGHT, BLUE,
    "CORS · JSON body · cookies · requireAuth · requireRole")
box(d, 2 * mm, 48 * mm, 50 * mm, 16 * mm, "SSE client map", PURPLE_LIGHT, PURPLE, "userId → open connections")
box(d, 60 * mm, 48 * mm, 50 * mm, 16 * mm, "Route modules", BLUE_LIGHT, BLUE, "auth · pets · providers · bookings…")
box(d, 118 * mm, 48 * mm, 50 * mm, 16 * mm, "Library modules", BLUE_LIGHT, BLUE, "audit · geocode · upload · jwt")
box(d, 2 * mm, 26 * mm, 50 * mm, 16 * mm, "node-cron job", PURPLE_LIGHT, PURPLE, "every 5 min: deliver reminders")
box(d, 60 * mm, 26 * mm, 50 * mm, 16 * mm, "Prisma Client", BLUE_LIGHT, BLUE, "type-safe queries · transactions")
box(d, 118 * mm, 26 * mm, 44 * mm, 16 * mm, "uploads/ folder", ACCENT2_LIGHT, ACCENT2, "private record files")
box(d, 60 * mm, 2 * mm, 50 * mm, 16 * mm, "SQLite file (dev.db)", ACCENT2_LIGHT, ACCENT2, "all relational data")
box(d, 118 * mm, 2 * mm, 52 * mm, 16 * mm, "Nominatim (OSM)", GREY_LIGHT, MUTED, "address → coordinates (HTTPS)")
arrow(d, 98 * mm, 103.5 * mm, 98 * mm, 87.5 * mm, "HTTP /api/*", BLUE, lx=11)
arrow(d, 85 * mm, 74 * mm, 85 * mm, 64.5 * mm, color=BLUE)
arrow(d, 110 * mm, 56 * mm, 117.5 * mm, 56 * mm, color=BLUE)
arrow(d, 60 * mm, 56 * mm, 52.5 * mm, 56 * mm, color=PURPLE)
arrow(d, 85 * mm, 48 * mm, 85 * mm, 42.5 * mm, color=BLUE)
arrow(d, 140 * mm, 48 * mm, 140 * mm, 42.5 * mm, color=ACCENT2)
arrow(d, 166 * mm, 48 * mm, 166 * mm, 18.5 * mm, color=MUTED)
arrow(d, 27 * mm, 42 * mm, 27 * mm, 47.5 * mm, color=PURPLE)
arrow(d, 52 * mm, 34 * mm, 59.5 * mm, 34 * mm, color=PURPLE)
arrow(d, 85 * mm, 26 * mm, 85 * mm, 18.5 * mm, "SQL", ACCENT2, lx=6)
arrow(d, 27 * mm, 64 * mm, 27 * mm, 97.5 * mm, "server push (SSE)", PURPLE, dashed=True, lx=0, ly=12 * mm)
story.append(d)
caption("Figure 2 — Runtime architecture. Route handlers call notifyNow() and the cron job calls pushToUser(); both "
        "write to the SSE map, which streams events to open browser tabs (dashed arrow).")

H2("Architectural style")
BUL([
    "<b>Client–server with a JSON REST API.</b> The React app never touches the database; it only calls "
    "<font face='Mono'>/api/*</font> endpoints and renders the JSON they return.",
    "<b>Single-page application (SPA).</b> The browser downloads the app once; afterwards navigation happens "
    "in JavaScript and only data moves over the network.",
    "<b>Layered backend.</b> Routes (HTTP concerns) → small library modules (auth, audit, notifications, "
    "geocoding, uploads) → Prisma (data access) → SQLite (storage).",
    "<b>Same-origin in development.</b> Vite proxies <font face='Mono'>/api</font> to port 4000, so the "
    "browser sees one origin; cookies \"just work\" and CORS is only a fallback.",
    "<b>Push + pull for notifications.</b> The browser pulls the list on load and receives new items by "
    "server push (Server-Sent Events).",
])

# =====================================================================
# 4. BACKEND STRUCTURE
# =====================================================================
story.append(PageBreak())
H1("4. Backend structure and the request lifecycle")
TABLE([
    ["Path", "Responsibility"],
    ["src/index.ts", "Creates the Express app, installs global middleware, mounts routers, installs the error "
                     "handler, starts listening, starts the cron job."],
    ["src/middleware/auth.ts", "<b>requireAuth</b> (reads + verifies the JWT cookie) and <b>requireRole(role)</b> (403 if the wrong role)."],
    ["src/routes/auth.ts", "Register, login, logout, current user (me), update profile, delete account."],
    ["src/routes/pets.ts", "Pet CRUD (soft delete), medical records list/upload/download/delete."],
    ["src/routes/providers.ts", "Public discovery + availability; provider-only management of services, staff, slots, clients."],
    ["src/routes/bookings.ts", "Create, list, view, cancel, reschedule, complete bookings."],
    ["src/routes/notifications.ts", "SSE stream, list notifications, mark as read."],
    ["src/routes/reference.ts", "Species and breed lookup tables with find-or-create."],
    ["src/lib/*", "prisma (single DB client), jwt, sse, notifications, cron, audit, geocode, upload, enums, asyncHandler."],
    ["prisma/schema.prisma", "The single source of truth for the database structure."],
    ["prisma/migrations/*", "Ordered SQL migration history (init → age/weight → geo → species/breed tables)."],
    ["prisma/seed.ts", "Idempotent seed of starter species and breeds using upsert."],
], [48, 122])

H2("How a request flows through the server")
P("Express processes a request by passing it through an ordered list of <b>middleware functions</b>. Each "
  "one can inspect or modify the request, end the response, or call <font face='Mono'>next()</font> to hand "
  "over to the next function. PawTrack's chain looks like this:")
d = Drawing(170 * mm, 30 * mm)
stages = [("CORS", "allowed origin"), ("express.json", "parse body"), ("cookieParser", "req.cookies"),
          ("requireAuth", "verify JWT"), ("requireRole", "check role"),
          ("Handler", "zod · Prisma")]
sw, sg = 25 * mm, 4 * mm
for i, (a, b) in enumerate(stages):
    x = i * (sw + sg)
    last = i == len(stages) - 1
    box(d, x, 8 * mm, sw, 16 * mm, a, ACCENT_LIGHT if last else BLUE_LIGHT, ACCENT if last else BLUE, b, fs=7.8)
    if not last:
        arrow(d, x + sw + 0.3, 16 * mm, x + sw + sg - 0.3, 16 * mm, color=BLUE)
d.add(String(0, 2 * mm, "Any thrown error / rejected promise → asyncHandler → global error handler → 400 (upload errors) or 500",
             fontName="Sans", fontSize=7, fillColor=MUTED))
story.append(d)
caption("Figure 3 — The middleware pipeline for a protected endpoint.")

H3("Three patterns repeated in every handler")
BUL([
    "<b>Validate first.</b> The body is checked with a Zod schema using <font face='Mono'>safeParse</font>. "
    "Invalid input returns <b>400</b> with the list of issues before any database work happens.",
    "<b>Scope every query to the caller.</b> Instead of \"find booking by id\", handlers ask \"find booking by id "
    "<i>where the caller is the parent or the provider</i>\". A record that exists but belongs to someone else "
    "is indistinguishable from one that does not exist (<b>404</b>), which avoids leaking information.",
    "<b>Wrap multi-step writes in a transaction.</b> <font face='Mono'>prisma.$transaction(async tx =&gt; …)</font> "
    "makes the steps all-or-nothing, and the audit entry and notifications are written inside the same transaction.",
])
H3("Why asyncHandler exists")
P("Express 4 was designed before async/await. If an async handler throws, Express does not notice and the "
  "request hangs. The tiny <font face='Mono'>asyncHandler</font> wrapper attaches <font face='Mono'>.catch(next)</font> "
  "so any failure is routed to the central error handler, which logs it and returns a clean JSON error.")
CODE("""
export function asyncHandler(handler) {
  return (req, res, next) => { handler(req, res, next).catch(next); };
}""")
H3("HTTP status codes used consistently")
TABLE([
    ["Code", "Meaning in PawTrack", "Example"],
    ["200 / 201 / 204", "Success / created / success with no body", "Booking created → 201; logout → 204"],
    ["400", "Input failed validation or a business rule", "Slot in the past; dailyEnd before dailyStart"],
    ["401", "Not logged in or token invalid/expired", "No cookie on /api/auth/me"],
    ["403", "Logged in but wrong role", "A provider calling POST /api/bookings"],
    ["404", "Not found <i>or not yours</i>", "Viewing another parent's pet"],
    ["409", "Conflict with current state", "Slot just taken; cancelling a completed visit; duplicate email"],
    ["500", "Unexpected server error", "Caught by the global error handler"],
], [26, 70, 74])

# =====================================================================
# 5. AUTH
# =====================================================================
story.append(PageBreak())
H1("5. Authentication and authorization")
P("<b>Authentication</b> answers \"who are you?\"; <b>authorization</b> answers \"what are you allowed to do?\". "
  "PawTrack uses stateless token authentication plus two layers of authorization.")
H2("5.1 Password storage with bcrypt")
P("Passwords are never stored. At registration the server stores <font face='Mono'>bcrypt.hash(password, 10)</font>. "
  "bcrypt adds a random <b>salt</b> (so identical passwords produce different hashes) and is deliberately "
  "<b>slow</b> (cost factor 10 means 2<super>10</super> internal rounds), making large-scale guessing expensive "
  "if the database ever leaks. At login, <font face='Mono'>bcrypt.compare</font> re-hashes the attempt with the "
  "stored salt and compares. Wrong email and wrong password produce the <i>same</i> message, so attackers cannot "
  "probe which emails are registered.")
H2("5.2 Sessions with a JWT in an httpOnly cookie")
P("After a successful login or registration the server creates a <b>JSON Web Token</b> containing "
  "<font face='Mono'>{ userId, role }</font>, signed with the server secret (<font face='Mono'>JWT_SECRET</font>) "
  "and valid for 7 days. A JWT has three parts — header, payload, signature — and anyone can read the payload, "
  "but only the server can produce a valid signature. So the server can trust the payload without a database lookup.")
d = Drawing(170 * mm, 44 * mm)
box(d, 0, 14 * mm, 38 * mm, 18 * mm, "Browser", ACCENT_LIGHT, ACCENT, "cookie jar")
box(d, 132 * mm, 14 * mm, 38 * mm, 18 * mm, "Express API", BLUE_LIGHT, BLUE, "JWT_SECRET")
arrow(d, 38.5 * mm, 30 * mm, 131.5 * mm, 30 * mm, "1. POST /api/auth/login {email, password}", ACCENT, ly=3)
arrow(d, 131.5 * mm, 23 * mm, 38.5 * mm, 23 * mm, "2. Set-Cookie: token=<JWT>; HttpOnly; SameSite=Lax", BLUE, ly=3)
arrow(d, 38.5 * mm, 16 * mm, 131.5 * mm, 16 * mm, "3. every later request carries the cookie automatically", ACCENT, ly=3)
d.add(String(85 * mm, 5 * mm, "4. requireAuth: jwt.verify(token) → req.user = { userId, role }", fontName="Sans",
             fontSize=7.3, fillColor=BLUE, textAnchor="middle"))
story.append(d)
caption("Figure 4 — Login and subsequent authenticated requests.")
TABLE([
    ["Cookie option", "What it protects against"],
    ["httpOnly: true", "JavaScript cannot read the token, so an XSS bug cannot steal the session."],
    ["sameSite: 'lax'", "The cookie is not sent on most cross-site requests, reducing CSRF risk."],
    ["secure (in production)", "Cookie is sent only over HTTPS, preventing interception on the network."],
    ["maxAge: 7 days", "Matches the JWT expiry; sessions end on their own."],
], [45, 125])
P("Logout simply clears the cookie. Because the design is stateless there is no server-side session to "
  "delete — the trade-off being that a stolen token stays valid until it expires (see section 16).")
H2("5.3 Authorization: role, ownership, relationship")
BUL([
    "<b>Role-based (RBAC).</b> Every user is either <font face='Mono'>PET_PARENT</font> or <font face='Mono'>PROVIDER</font>. "
    "<font face='Mono'>requireRole('PROVIDER')</font> guards all <font face='Mono'>/api/providers/me/*</font> routes; "
    "only pet parents can create bookings.",
    "<b>Ownership-based.</b> Queries include the caller's id: a parent may edit only pets where "
    "<font face='Mono'>ownerId = me</font>; a provider may edit only services/staff where <font face='Mono'>providerId = me</font>.",
    "<b>Relationship-based.</b> A provider may <i>read</i> a pet and its records only if a booking exists between "
    "that provider and that pet (<font face='Mono'>loadAccessiblePet</font>). The care relationship grants access; "
    "write access to the pet itself stays with the owner.",
])
H2("5.4 The frontend side of auth")
P("On startup <font face='Mono'>AuthContext</font> calls <font face='Mono'>GET /api/auth/me</font>. If the cookie is "
  "valid, the user and profile are stored in React context; if it returns 401 the user is treated as logged out. "
  "<font face='Mono'>ProtectedRoute</font> redirects anonymous visitors to <font face='Mono'>/login</font> and sends a "
  "user with the wrong role to their own home page; <font face='Mono'>PublicOnlyRoute</font> keeps logged-in users "
  "away from the signup/login screens.")
CALLOUT("Important principle",
        "Frontend route guards are only for user experience. Real security is enforced on the server — every "
        "API route checks the cookie, role and ownership independently, so bypassing the UI achieves nothing.",
        ACCENT2_LIGHT, ACCENT2)

# =====================================================================
# 6. DATA MODEL
# =====================================================================
story.append(PageBreak())
H1("6. The data model")
P("The database has 15 tables defined in <font face='Mono'>schema.prisma</font>. They fall into five groups: "
  "identity, pets &amp; health, provider catalogue, scheduling &amp; booking, and cross-cutting (notifications, "
  "audit, and reserved AI tables).")

d = Drawing(170 * mm, 128 * mm)
bw_, bh_ = 36 * mm, 13 * mm


def ent(x, y, name, sub, fill, stroke):
    box(d, x * mm, y * mm, bw_, bh_, name, fill, stroke, sub, fs=8)


ent(67, 113, "User", "id · email · role", GREY_LIGHT, MUTED)
ent(10, 113, "Species → Breed", "lookup tables", GREY_LIGHT, MUTED)
ent(10, 90, "PetParentProfile", "phone · address", ACCENT_LIGHT, ACCENT)
ent(124, 90, "ProviderProfile", "type · address · lat/lng", ACCENT2_LIGHT, ACCENT2)
ent(10, 62, "Pet", "species · breed · age", ACCENT_LIGHT, ACCENT)
ent(10, 30, "PetRecord", "type · date · file", ACCENT_LIGHT, ACCENT)
ent(124, 67, "Service", "category · price · mins", ACCENT2_LIGHT, ACCENT2)
ent(124, 43, "StaffService", "join: staff ↔ service", ACCENT2_LIGHT, ACCENT2)
ent(124, 19, "StaffMember", "role · isActive", ACCENT2_LIGHT, ACCENT2)
ent(67, 22, "TimeSlot", "start · end · status", BLUE_LIGHT, BLUE)
ent(67, 58, "Booking", "status · updatedBy", BLUE_LIGHT, BLUE)
ent(67, 1, "Notification", "scheduledFor · sentAt", PURPLE_LIGHT, PURPLE)
ent(10, 1, "AuditLog", "table · action · old/new", PURPLE_LIGHT, PURPLE)


def rel(x1, y1, x2, y2, t, lx=0, ly=2):
    arrow(d, x1 * mm, y1 * mm, x2 * mm, y2 * mm, t, MUTED, lx=lx, ly=ly)


rel(67, 118, 46.3, 101, "1 : 0..1", ly=0)
rel(103, 118, 124, 101, "1 : 0..1", ly=0)
rel(28, 90, 28, 75.3, "1 : N")
rel(28, 62, 28, 43.3, "1 : N")
rel(142, 90, 142, 80.3, "1 : N")
rel(142, 67, 142, 56.3, "1 : N")
rel(142, 32, 142, 42.7, "1 : N")
rel(164, 90, 164, 32.3, "1 : N")
rel(124, 26, 103.3, 28, "1 : N", ly=3)
rel(46, 68, 66.7, 66, "1 : N", ly=3)
rel(85, 35, 85, 57.7, "1 : N")
rel(124, 72, 103.3, 67, "1 : N", ly=3)
rel(72, 58, 40, 43.3, "0..1 : N", lx=4)
story.append(d)
caption("Figure 5 — Simplified entity-relationship view (arrows point from the \"one\" side to the \"many\" side). "
        "Booking also references PetParentProfile, ProviderProfile and StaffMember directly; Service ↔ StaffMember is N : M via StaffService.")

H2("6.1 Key relationships explained")
BUL([
    "<b>User → profile (1 : 0..1).</b> A single <font face='Mono'>users</font> table holds login data for everyone; "
    "role-specific data lives in <font face='Mono'>PetParentProfile</font> or <font face='Mono'>ProviderProfile</font>, "
    "whose primary key <i>is</i> the user id (a shared-primary-key one-to-one).",
    "<b>Staff ↔ Service (N : M).</b> A groomer might do baths and nail trims; a nail trim might be done by several staff. "
    "The join table <font face='Mono'>StaffService</font> with composite key (staffId, serviceId) models this "
    "\"who is qualified for what\".",
    "<b>TimeSlot belongs to a StaffMember, not a Service.</b> Availability is a property of a person's time; any "
    "service that person is qualified for can be booked into it.",
    "<b>TimeSlot → Booking is 1 : N on purpose.</b> When a booking is cancelled its slot is freed and can be booked "
    "again, so a slot accumulates booking history. \"At most one <i>active</i> booking per slot\" is enforced by "
    "the slot's status, not by a unique constraint.",
    "<b>PetRecord → Booking is optional.</b> Parents can add records themselves (no booking), while providers "
    "attach records to the specific visit they came from.",
])
H2("6.2 Design decisions worth knowing")
TABLE([
    ["Decision", "Explanation"],
    ["UUID primary keys", "IDs are random UUIDs, not 1, 2, 3… — they cannot be guessed or enumerated and can be "
                          "generated without asking the database."],
    ["Enums as validated strings", "SQLite has no ENUM type, so columns like status/role are strings and the "
                                   "allowed values are enforced by Zod enums in <font face='Mono'>lib/enums.ts</font>."],
    ["snake_case in DB, camelCase in code", "<font face='Mono'>@map</font>/<font face='Mono'>@@map</font> keep SQL "
                                            "conventional while TypeScript stays idiomatic."],
    ["Soft deletes", "Pets and records get a <font face='Mono'>deletedAt</font> timestamp instead of being erased, "
                     "so medical and booking history survives; all reads filter <font face='Mono'>deletedAt: null</font>."],
    ["Selective cascades", "Deleting a user cascades to profile, pets, services, staff. Bookings and audit entries "
                           "deliberately do <i>not</i> cascade — history should not silently vanish."],
    ["Indexes on access paths", "e.g. (providerId, status) on bookings and (staffId, status, startDatetime) on "
                                "slots match the exact filters the dashboards use."],
    ["Unique (staffId, startDatetime)", "A staff member can never have two slots starting at the same moment, "
                                        "which also makes bulk slot generation idempotent."],
    ["JSON stored as text", "Notification payloads and audit old/new values are JSON strings — flexible, "
                            "schema-less details alongside strongly typed columns."],
    ["Migrations", "Every schema change is an ordered SQL migration, so any environment can be rebuilt to the "
                   "exact same structure."],
], [45, 125])

# =====================================================================
# 7. BOOKING ENGINE
# =====================================================================
story.append(PageBreak())
H1("7. The booking engine (concurrency and state)")
P("Booking is the most important write in the system and the one most exposed to a classic concurrency bug: "
  "<b>two people booking the same slot at the same moment</b>. PawTrack solves this with an atomic "
  "compare-and-set inside a database transaction.")
H2("7.1 The steps of POST /api/bookings")
TABLE([
    ["#", "Step", "Failure response"],
    ["1", "Validate body {petId, serviceId, staffId, slotId} with Zod", "400"],
    ["2", "Pet exists, is not deleted, and belongs to the caller", "404"],
    ["3", "Service exists and is active", "404"],
    ["4", "Staff member exists, is active, and works for that service's provider", "404"],
    ["5", "Staff member is qualified for the service (StaffService row exists)", "400"],
    ["6", "Slot exists for that staff member and is not in the past", "404 / 400"],
    ["7", "<b>Atomically flip the slot AVAILABLE → BOOKED</b> (see below)", "409 if someone else won"],
    ["8", "Create the booking row (status PENDING)", "—"],
    ["9", "Write an audit log entry", "—"],
    ["10", "Schedule four reminders (parent + provider × day-of 8am + 2 h before)", "—"],
    ["11", "Notify the provider instantly (\"New booking: Bruno for Grooming\")", "—"],
], [8, 130, 32])
P("All eleven steps run inside one <font face='Mono'>$transaction</font>. If anything fails, everything is rolled "
  "back — there can never be a booked slot with no booking, or a booking with no reminders.")
H2("7.2 The double-booking guard")
CODE("""
const locked = await tx.timeSlot.updateMany({
  where: { id: slotId, status: "AVAILABLE" },   // condition
  data:  { status: "BOOKED" },                  // change
});
if (locked.count === 0) throw new BookingError(409, "This slot was just booked by someone else");""")
P("The trick is that the check and the change happen in <b>one SQL statement</b>: "
  "<font face='Mono'>UPDATE time_slots SET status='BOOKED' WHERE id=? AND status='AVAILABLE'</font>. The database "
  "executes writes to a row one at a time, so if two requests race, the first changes one row; by the time the "
  "second runs, the status is already BOOKED, its WHERE clause matches nothing, and it gets "
  "<font face='Mono'>count = 0</font>.")
d = Drawing(170 * mm, 50 * mm)
d.add(String(20 * mm, 45 * mm, "Request A", fontName="Sans-Bold", fontSize=8, fillColor=ACCENT, textAnchor="middle"))
d.add(String(85 * mm, 45 * mm, "time_slots row", fontName="Sans-Bold", fontSize=8, fillColor=ACCENT2, textAnchor="middle"))
d.add(String(150 * mm, 45 * mm, "Request B", fontName="Sans-Bold", fontSize=8, fillColor=PURPLE, textAnchor="middle"))
for x, c in [(20, ACCENT), (85, ACCENT2), (150, PURPLE)]:
    ln = Line(x * mm, 3 * mm, x * mm, 42 * mm, strokeColor=c, strokeWidth=0.7)
    ln.strokeDashArray = [2, 2]
    d.add(ln)
arrow(d, 20 * mm, 36 * mm, 84 * mm, 36 * mm, "UPDATE … WHERE status='AVAILABLE'", ACCENT, ly=2)
arrow(d, 84 * mm, 29 * mm, 20 * mm, 29 * mm, "1 row changed → BOOKED ✓", ACCENT, ly=2)
arrow(d, 150 * mm, 21 * mm, 86 * mm, 21 * mm, "UPDATE … WHERE status='AVAILABLE'", PURPLE, ly=2)
arrow(d, 86 * mm, 13 * mm, 150 * mm, 13 * mm, "0 rows changed → 409 Conflict", PURPLE, ly=2)
story.append(d)
caption("Figure 6 — Two simultaneous booking attempts: exactly one wins, the other receives a clear 409.")
CALLOUT("Why not \"read, check, then write\"?",
        "If the code first read the slot, saw AVAILABLE, and then wrote BOOKED, both racing requests could read "
        "AVAILABLE before either wrote — the classic <b>check-then-act race condition</b>. Folding the check into "
        "the write's WHERE clause (optimistic concurrency / compare-and-set) removes the gap entirely. Rescheduling "
        "uses the same guard on the new slot before releasing the old one.")

H2("7.3 Booking lifecycle (state machine)")
d = Drawing(170 * mm, 46 * mm)
box(d, 0, 18 * mm, 30 * mm, 13 * mm, "PENDING", BLUE_LIGHT, BLUE)
box(d, 50 * mm, 18 * mm, 32 * mm, 13 * mm, "CONFIRMED", BLUE_LIGHT, BLUE)
box(d, 112 * mm, 32 * mm, 32 * mm, 12 * mm, "COMPLETED", ACCENT_LIGHT, ACCENT)
box(d, 112 * mm, 4 * mm, 32 * mm, 12 * mm, "CANCELLED", ACCENT2_LIGHT, ACCENT2)
box(d, 150 * mm, 18 * mm, 20 * mm, 12 * mm, "NO_SHOW", GREY_LIGHT, MUTED, fs=7)
arrow(d, 30.5 * mm, 24.5 * mm, 49.5 * mm, 24.5 * mm, "reserved", MUTED, dashed=True, ly=3)
arrow(d, 82.5 * mm, 28 * mm, 111.5 * mm, 37 * mm, color=ACCENT)
arrow(d, 82.5 * mm, 21 * mm, 111.5 * mm, 11 * mm, color=ACCENT2)
arrow(d, 15 * mm, 31.5 * mm, 111.5 * mm, 41 * mm, "provider: complete", ACCENT, lx=-10, ly=1)
arrow(d, 15 * mm, 17.5 * mm, 111.5 * mm, 7 * mm, "either side: cancel", ACCENT2, lx=-10, ly=-1)
d.add(String(0, 40 * mm, "Reschedule keeps the state and swaps the slot.", fontName="Sans", fontSize=6.8, fillColor=MUTED))
story.append(d)
caption("Figure 7 — Booking states. Cancel and reschedule are allowed only from PENDING or CONFIRMED; "
        "COMPLETED and CANCELLED are terminal.")
BUL([
    "<b>Cancel</b> (either party): slot goes back to AVAILABLE, booking becomes CANCELLED, "
    "<font face='Mono'>updatedByUserId</font> records who did it, and the <i>other</i> party is notified instantly.",
    "<b>Reschedule</b> (either party): lock new slot → free old slot → point booking at the new slot → audit → notify.",
    "<b>Complete</b> (provider only): marks the visit done. Completed visits are what populate the provider's "
    "client list, and records can only be attached to visits whose start time has passed and are not cancelled.",
    "<b>Deleting a pet</b> cancels its active bookings and frees their slots in the same transaction, so no orphaned "
    "appointments are left behind.",
])

# =====================================================================
# 8. SLOTS
# =====================================================================
story.append(PageBreak())
H1("8. Availability: generating time slots")
P("Providers do not create appointments one by one. They describe a <b>working pattern</b> and the server expands "
  "it into concrete slots. The request looks like:")
CODE("""
POST /api/providers/me/staff/:staffId/slots
{ "startDate": "2026-10-05", "endDate": "2026-10-09",
  "dailyStart": "09:00", "dailyEnd": "13:00",
  "slotMinutes": 30, "daysOfWeek": [1,2,3,4,5] }      // Mon–Fri""")
H2("The algorithm")
BUL([
    "Convert <font face='Mono'>dailyStart</font> and <font face='Mono'>dailyEnd</font> to minutes since midnight "
    "(09:00 → 540, 13:00 → 780) and reject if end ≤ start.",
    "Walk day by day from startDate to endDate. Skip days whose weekday is not in <font face='Mono'>daysOfWeek</font>.",
    "Inside each allowed day, step from dailyStart in increments of slotMinutes while "
    "<font face='Mono'>m + slotMinutes ≤ dailyEnd</font> (so a slot never overruns closing time). Each step is a candidate "
    "(start, end).",
    "Look up which candidate start times already exist for this staff member and <b>skip them</b>.",
    "Insert the rest in a single <font face='Mono'>createMany</font> and report {created, skipped}.",
])
P("With the example above: 4 hours ÷ 30 minutes = 8 slots/day × 5 days = <b>40 slots</b>. Running the same request "
  "again creates 0 and skips 40 — the operation is <b>idempotent</b>, which makes it safe to retry or to extend a "
  "schedule with overlapping ranges.")
H2("Availability as seen by pet parents")
P("<font face='Mono'>GET /api/providers/:providerId/services/:serviceId/slots</font> finds every <i>active</i> staff "
  "member qualified for the service, then returns their future slots with status AVAILABLE, sorted by time and "
  "labelled with the staff name. Removing a slot is only allowed while it is still AVAILABLE; booked history is "
  "protected.")
CALLOUT("Effective activity of a service",
        "A service can be switched on but have no active staff able to perform it, which would make it unbookable. "
        "The API computes <font face='Mono'>effectiveActive = isActive AND at least one qualified active staff</font> "
        "and shows that to the provider, without altering the stored flag — so re-assigning staff brings the "
        "service back automatically.")

# =====================================================================
# 9. NOTIFICATIONS
# =====================================================================
H1("9. Notifications: scheduled reminders and real-time push")
P("PawTrack has two kinds of notifications that share one table and one delivery channel:")
TABLE([
    ["", "Instant notifications", "Scheduled reminders"],
    ["Created by", "notifyNow()", "scheduleAppointmentReminders()"],
    ["Triggered by", "New booking, cancel, reschedule, provider uploads a record",
     "Creating a booking (four rows at once)"],
    ["sentAt when created", "Now", "null (hidden) — scheduledFor set to the future"],
    ["Becomes visible", "Immediately", "When the cron job finds scheduledFor ≤ now and sets sentAt"],
    ["Pushed live?", "Yes, from the request that caused it", "Yes, by the cron job when it delivers"],
], [30, 70, 70])
H2("The core idea: sentAt is the visibility switch")
P("<font face='Mono'>GET /api/notifications</font> only returns rows with <font face='Mono'>sentAt</font> set. A reminder "
  "for next Tuesday therefore exists in the database from the moment of booking but is invisible until it is due. "
  "Every 5 minutes, <font face='Mono'>node-cron</font> runs:")
CODE("""
due = notifications WHERE scheduledFor <= now AND sentAt IS NULL
for each: set sentAt = now, then pushToUser(userId, notification)""")
P("This is a simple, database-backed <b>job queue</b>: the table is the queue, <font face='Mono'>scheduledFor</font> is "
  "the due time and <font face='Mono'>sentAt</font> marks a job as done. Because state lives in the database, a "
  "server restart loses nothing — overdue reminders are simply delivered on the next tick. The granularity is up "
  "to 5 minutes, which is fine for \"day of\" and \"2 hours before\" reminders.")

H2("Server-Sent Events (SSE)")
P("To show a notification <i>without the user refreshing</i>, the server must be able to send data to the "
  "browser. PawTrack uses <b>Server-Sent Events</b>: the browser opens "
  "<font face='Mono'>new EventSource('/api/notifications/stream')</font>, and the server keeps that HTTP "
  "response open forever, writing <font face='Mono'>data: {json}\\n\\n</font> whenever there is news.")
d = Drawing(170 * mm, 50 * mm)
box(d, 0, 30 * mm, 40 * mm, 15 * mm, "Parent's tabs", ACCENT_LIGHT, ACCENT, "EventSource × N")
box(d, 0, 5 * mm, 40 * mm, 15 * mm, "Provider's tab", ACCENT2_LIGHT, ACCENT2, "EventSource")
box(d, 65 * mm, 16 * mm, 42 * mm, 18 * mm, "clients Map", PURPLE_LIGHT, PURPLE, ["userId → Set<Response>", "(in memory)"])
box(d, 130 * mm, 30 * mm, 40 * mm, 15 * mm, "Route handler", BLUE_LIGHT, BLUE, "notifyNow()")
box(d, 130 * mm, 5 * mm, 40 * mm, 15 * mm, "Cron (5 min)", BLUE_LIGHT, BLUE, "due reminders")
arrow(d, 129.5 * mm, 37 * mm, 107.5 * mm, 29 * mm, "pushToUser", PURPLE, ly=4)
arrow(d, 129.5 * mm, 12 * mm, 107.5 * mm, 21 * mm, "pushToUser", PURPLE, ly=-8)
arrow(d, 64.5 * mm, 29 * mm, 40.5 * mm, 37 * mm, "data: …", PURPLE, dashed=True, ly=4)
arrow(d, 64.5 * mm, 21 * mm, 40.5 * mm, 12 * mm, "data: …", PURPLE, dashed=True, ly=-8)
story.append(d)
caption("Figure 8 — Real-time delivery. A heartbeat comment (\":\") is written every 20 s to keep proxies from "
        "closing idle connections; on disconnect the response is removed from the map.")
BUL([
    "<b>Why SSE instead of WebSockets?</b> Traffic is one-way (server → browser), SSE is plain HTTP (works with the "
    "existing cookie auth and the Vite proxy), and <font face='Mono'>EventSource</font> reconnects automatically.",
    "<b>Why a Set per user?</b> One person may have several tabs open; each gets the event.",
    "<b>Resilience.</b> If a push is missed (tab closed, connection dropped), nothing is lost: the notification row is "
    "already in the database and appears on the next page load via the normal GET.",
    "<b>Frontend.</b> <font face='Mono'>useNotifications()</font> loads the latest 50, subscribes to the stream, prepends "
    "new events, computes the unread count for <font face='Mono'>NotificationBell</font>, and marks items read "
    "optimistically (UI first, then <font face='Mono'>PATCH /:id/read</font>).",
])

# =====================================================================
# 10. DISCOVERY
# =====================================================================
story.append(PageBreak())
H1("10. Provider discovery: geocoding and distance")
P("To answer \"which groomers are near me?\" the system needs coordinates for both the provider and the searcher.")
H2("10.1 Geocoding provider addresses")
P("Providers enter their address as separate fields — street, city, state, postal code. Geocoding (turning an "
  "address into latitude/longitude) is done with OpenStreetMap's free <b>Nominatim</b> service using its "
  "<i>structured</i> query parameters, which is more accurate than a single free-text line because the service does "
  "not have to guess which part is the city and which is the street.")
BUL([
    "<b>Graceful fallback.</b> Structured search is strict — a misspelt or poorly mapped street returns nothing. So "
    "the code retries without the street, landing at least on the city/postal area.",
    "<b>Best-effort, outside the transaction.</b> Geocoding runs <i>after</i> the account is saved. A slow or failed "
    "external call never blocks sign-up; the provider simply has no coordinates and sorts last.",
    "<b>Re-geocode on change.</b> Updating any address field through PATCH /api/auth/me recomputes (or clears) the coordinates.",
    "<b>Storage.</b> Only the joined address string and the lat/lng are stored; the structured parts exist just long "
    "enough to be sent to the geocoder.",
])
H2("10.2 The searcher's position")
P("On the Find-a-Provider page, \"Use my location\" calls the browser's <font face='Mono'>navigator.geolocation</font> "
  "API (the user must grant permission) and sends <font face='Mono'>lat</font>/<font face='Mono'>lng</font> as query "
  "parameters. Alternatively the user can type a location, which filters providers whose address text contains it.")
H2("10.3 Distance with the Haversine formula")
P("The Earth is (approximately) a sphere, so the straight-line \"flat map\" distance is wrong over any real "
  "distance. The <b>Haversine formula</b> gives the great-circle distance — the shortest path along the surface:")
CODE("""
a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
d = 2 · R · asin(√a)          φ = latitude, λ = longitude (radians), R = 6371 km""")
P("For each provider with coordinates, the API computes <font face='Mono'>distanceKm</font> and sorts ascending. "
  "Providers without coordinates are not dropped — they sort to the end, so they remain discoverable. Search by "
  "name and filter by provider type are applied before ranking.")
CALLOUT("Design trade-off",
        "Distances are computed in application code over all matching providers. That is simple and exact for a small "
        "dataset. At large scale you would pre-filter with a bounding box on indexed lat/lng columns, or use a spatial "
        "database (e.g. PostGIS) — see section 16.")

# =====================================================================
# 11. RECORDS
# =====================================================================
H1("11. Medical records and secure file handling")
P("A pet's medical history is a list of <font face='Mono'>PetRecord</font> rows — each with a type "
  "(VACCINATION, DEWORMING, LAB_RESULT, PRESCRIPTION, VISIT_SUMMARY, IMAGING, OTHER), title, description, date and an "
  "optional attached file.")
H2("11.1 Uploading")
BUL([
    "The browser sends <font face='Mono'>multipart/form-data</font> (the <font face='Mono'>api.upload</font> helper "
    "deliberately omits the JSON Content-Type so the browser can set the multipart boundary).",
    "<b>multer</b> validates the file <i>before</i> saving: only PNG, JPEG, WebP, HEIC or PDF, maximum 15 MB. Bad files "
    "produce a 400 via the global error handler.",
    "Files are stored as <font face='Mono'>uploads/&lt;petId&gt;/&lt;random-uuid&gt;.&lt;ext&gt;</font>. The random name "
    "prevents collisions, path tricks and guessable URLs; the original filename is not trusted.",
    "When a <b>provider</b> uploads, the record may be tied to a booking — but only their own, not cancelled, and not "
    "before the appointment starts — and the owner is notified instantly.",
])
H2("11.2 Downloading: no public URLs")
P("The <font face='Mono'>uploads/</font> directory is <b>not</b> served statically. The database stores only the "
  "internal filename; the API exposes <font face='Mono'>fileUrl</font> as <font face='Mono'>/api/pets/records/:id/file</font>. "
  "That route re-checks access (owner, or provider with a booking for that pet) on every request before streaming the "
  "file. Health records are sensitive, so there is deliberately no way to reach a file without passing authorization.")
H2("11.3 Browsing the timeline")
P("Records can be filtered by category and time: presets (3 months, 6 months, 1 year, all) or an explicit "
  "from/to range, sorted newest first. Deleting a record is a soft delete.")

# =====================================================================
# 12. REFERENCE DATA
# =====================================================================
H1("12. Reference data: species and breeds")
P("Free-text fields drift: \"dog\", \"Dog\", \"DOG\", \"doggo\". To keep data clean without being restrictive, "
  "<font face='Mono'>Species</font> and <font face='Mono'>Breed</font> are lookup tables that power the "
  "<font face='Mono'>SpeciesBreedPicker</font> dropdowns.")
BUL([
    "<b>Seeded</b> with common species and breeds by an idempotent <font face='Mono'>upsert</font> script (safe to run many times).",
    "<b>Find-or-create.</b> If a user types a species/breed not in the list, POST /species or /breeds first looks for a "
    "case-insensitive match and returns the existing canonical entry; only a genuinely new name is inserted.",
    "<b>Case-insensitivity in code.</b> SQLite's Prisma connector lacks case-insensitive matching, so the comparison is "
    "done in JavaScript — acceptable because the tables are small.",
    "<b>Public on purpose.</b> These endpoints need no login because the pet-parent sign-up form uses them before an "
    "account exists; the data is non-sensitive shared vocabulary.",
    "<b>Loose coupling.</b> Pet.species/breed remain plain strings (not foreign keys); the lookup tables govern "
    "<i>input</i>, not storage.",
])

# =====================================================================
# 13. FRONTEND
# =====================================================================
story.append(PageBreak())
H1("13. Frontend architecture")
d = Drawing(170 * mm, 70 * mm)
box(d, 0, 55 * mm, 170 * mm, 11 * mm, "main.jsx — StrictMode › BrowserRouter › AuthProvider › App", GREY_LIGHT, MUTED)
box(d, 0, 36 * mm, 80 * mm, 14 * mm, "App.jsx — route table", BLUE_LIGHT, BLUE, "PublicOnlyRoute / ProtectedRoute(role)")
box(d, 90 * mm, 36 * mm, 80 * mm, 14 * mm, "AuthContext", ACCENT_LIGHT, ACCENT, "user · profile · login · logout · refresh")
box(d, 0, 18 * mm, 55 * mm, 13 * mm, "Layouts", BLUE_LIGHT, BLUE, "PetParentLayout · ProviderLayout")
box(d, 60 * mm, 18 * mm, 50 * mm, 13 * mm, "Pages (16)", BLUE_LIGHT, BLUE, "one per screen")
box(d, 115 * mm, 18 * mm, 55 * mm, 13 * mm, "Components", BLUE_LIGHT, BLUE, "Modal · FormField · Pickers · Bell")
box(d, 0, 0, 80 * mm, 13 * mm, "lib/api.js", PURPLE_LIGHT, PURPLE, "fetch wrapper · ApiError · upload")
box(d, 90 * mm, 0, 80 * mm, 13 * mm, "hooks/useNotifications", PURPLE_LIGHT, PURPLE, "GET list + EventSource stream")
arrow(d, 40 * mm, 54.5 * mm, 40 * mm, 50.5 * mm, color=MUTED)
arrow(d, 130 * mm, 54.5 * mm, 130 * mm, 50.5 * mm, color=MUTED)
arrow(d, 40 * mm, 35.5 * mm, 30 * mm, 31.5 * mm, color=MUTED)
arrow(d, 40 * mm, 35.5 * mm, 80 * mm, 31.5 * mm, color=MUTED)
arrow(d, 85 * mm, 17.5 * mm, 45 * mm, 13.5 * mm, color=MUTED)
arrow(d, 130 * mm, 17.5 * mm, 130 * mm, 13.5 * mm, color=MUTED)
story.append(d)
caption("Figure 9 — Frontend composition.")
H2("Routes")
TABLE([
    ["Area", "Routes"],
    ["Public only", "/login, /signup (role select), /signup/pet-parent, /signup/provider"],
    ["Pet parent", "/ (home, pets), /account, /pets/:petId (profile + records), /providers (search), "
                   "/providers/:providerId (services + booking), /bookings, /bookings/:bookingId"],
    ["Provider", "/provider/dashboard (weekly calendar), /provider/services (services, staff, slots), "
                 "/provider/settings, /provider/appointments/:bookingId, /provider/clients"],
    ["Fallback", "* → redirect to /"],
], [28, 142])
H2("Key concepts")
BUL([
    "<b>Global state via Context.</b> Only the session is global (AuthContext). Everything else is local page state "
    "fetched on mount — a deliberate choice that keeps data fresh and avoids a heavyweight state library.",
    "<b>A single API wrapper.</b> <font face='Mono'>lib/api.js</font> prefixes <font face='Mono'>/api</font>, sends "
    "cookies (<font face='Mono'>credentials: 'include'</font>), serialises JSON, handles 204, and converts error "
    "responses into an <font face='Mono'>ApiError</font> carrying the HTTP status and the server's message — so every "
    "page handles errors the same way.",
    "<b>Custom hooks</b> encapsulate reusable behaviour (e.g. notifications) so components stay presentational.",
    "<b>Role-specific layouts</b> provide each side's navigation shell; pages render inside them.",
    "<b>Reusable form primitives</b> (FormField, AgeInput, SpeciesBreedPicker, UploadRecordForm, RescheduleModal, "
    "ConfirmDialog) keep behaviour and styling consistent.",
    "<b>Utility-first styling</b> with Tailwind and a design-token palette (surface, on-surface, outline…) gives a "
    "consistent look and responsive layouts.",
    "<b>App icons.</b> 192/512 px and Apple touch icons ship in <font face='Mono'>public/</font>, a starting point "
    "for making the app installable as a PWA (a web manifest and service worker would complete it).",
])

# =====================================================================
# 14. INTEGRITY & SECURITY
# =====================================================================
H1("14. Data integrity, auditing and security principles")
H2("14.1 Audit trail")
P("Important changes — bookings created/cancelled/rescheduled/completed, services and staff edited or deleted, pets "
  "deleted, profiles updated, accounts deleted — write an <font face='Mono'>AuditLog</font> row with the table, record "
  "id, action (INSERT/UPDATE/DELETE), who did it, when, and JSON snapshots of old and new values. Because it is "
  "written in the <b>same transaction</b> as the change, the log can never disagree with the data. When a user deletes "
  "their account, their audit entries are kept but anonymised (<font face='Mono'>changedBy</font> set to null).")
H2("14.2 Protecting history")
BUL([
    "Accounts with any booking history cannot be deleted (409) — the other party's records depend on them.",
    "Staff with booking history cannot be deleted, only deactivated.",
    "Only AVAILABLE slots can be removed; cancelled/completed bookings cannot be changed again.",
    "Pets and records are soft-deleted.",
])
H2("14.3 Security checklist")
TABLE([
    ["Threat", "Mitigation in PawTrack"],
    ["Password database leak", "bcrypt salted hashing (cost 10)"],
    ["Session theft via XSS", "httpOnly cookie; React escapes rendered text by default"],
    ["Cross-site request forgery", "SameSite=Lax cookie; CORS limited to the configured origin with credentials"],
    ["Accessing others' data (IDOR)", "Every query scoped to the caller; 404 for \"not yours\""],
    ["Privilege escalation", "requireRole on role-specific routes; role is inside the signed JWT"],
    ["Malformed / malicious input", "Zod validation on every body; Prisma parameterises all SQL (no injection)"],
    ["Leaking password hashes", "Explicit <font face='Mono'>select</font> of safe user fields in included relations"],
    ["Malicious uploads", "MIME whitelist, 15 MB limit, random filenames, non-public folder, auth-checked download"],
    ["Race conditions", "Transactions and conditional updates (compare-and-set)"],
    ["Account enumeration", "Identical error for unknown email and wrong password"],
], [50, 120])

# =====================================================================
# 15. API
# =====================================================================
story.append(PageBreak())
H1("15. API reference")
P("All paths are prefixed with <font face='Mono'>/api</font>. <b>Auth</b>: Public, Any (logged in), Parent, Provider.")
TABLE([
    ["Method & path", "Auth", "Purpose"],
    ["GET /health", "Public", "Liveness check"],
    ["POST /auth/register", "Public", "Create parent (+ first pet) or provider; sets cookie"],
    ["POST /auth/login · POST /auth/logout", "Public", "Start / end session"],
    ["GET · PATCH · DELETE /auth/me", "Any", "Current user + profile / update / delete account"],
    ["GET · POST /pets", "Parent", "List / create own pets"],
    ["GET · PUT · DELETE /pets/:petId", "Parent*", "View (provider-with-booking may read) / edit / soft-delete"],
    ["GET · POST /pets/:petId/records", "Owner or provider-with-booking", "Filtered timeline / upload record (+file)"],
    ["GET /pets/records/:id/file", "Owner or provider-with-booking", "Authorised file download"],
    ["DELETE /pets/records/:id", "Parent (owner)", "Soft-delete a record"],
    ["GET /providers", "Public", "Search: category, search, location, lat, lng"],
    ["GET /providers/:id", "Public", "Provider profile and active services"],
    ["GET /providers/:id/services/:sid/slots", "Public", "Future available slots for a service"],
    ["GET · POST /providers/me/services", "Provider", "List (with effectiveActive) / create"],
    ["PUT · DELETE /providers/me/services/:id", "Provider", "Edit / delete service"],
    ["PATCH /providers/me/services/:id/(activate|deactivate)", "Provider", "Toggle service"],
    ["GET · POST /providers/me/staff", "Provider", "List / add staff (with service assignments)"],
    ["PUT · DELETE /providers/me/staff/:id", "Provider", "Edit / delete staff (409 if has history)"],
    ["PATCH /providers/me/staff/:id/(activate|deactivate)", "Provider", "Toggle staff member"],
    ["GET · POST /providers/me/staff/:id/slots", "Provider", "List future slots / bulk-generate"],
    ["DELETE /providers/me/slots/:slotId", "Provider", "Remove an AVAILABLE slot"],
    ["GET /providers/me/clients", "Provider", "Pets seen in completed visits, grouped"],
    ["GET /bookings?status=", "Any", "Own bookings (as parent or provider)"],
    ["POST /bookings", "Parent", "Create booking (transactional, race-safe)"],
    ["GET /bookings/:id", "Participant", "Details incl. owner and visit records"],
    ["PATCH /bookings/:id/cancel · /reschedule", "Participant", "Cancel / move to another slot"],
    ["PATCH /bookings/:id/complete", "Provider", "Mark visit completed"],
    ["GET /notifications · /notifications/stream", "Any", "Latest 50 delivered / live SSE stream"],
    ["PATCH /notifications/:id/read", "Any", "Mark as read"],
    ["GET · POST /species; GET /species/:id/breeds; POST /breeds", "Public", "Lookup + find-or-create"],
], [72, 38, 60])

# =====================================================================
# 16. LIMITATIONS
# =====================================================================
H1("16. Limitations, scaling path and future work")
P("PawTrack is intentionally optimised for simplicity: one process, one file database, no paid services. Being able "
  "to name the trade-offs — and how you would lift them — is part of understanding the design.")
TABLE([
    ["Current choice", "Limitation", "How it would scale"],
    ["SQLite single file", "One writer at a time; lives on one machine", "PostgreSQL (Prisma makes the switch mostly a "
                                                                         "config change; enums could become native)"],
    ["In-memory SSE map", "Works only with one server instance", "Redis pub/sub or a message broker to fan out across instances"],
    ["In-process node-cron", "Duplicated if several instances run; 5-min granularity",
     "Dedicated worker / job queue (e.g. BullMQ) with locking"],
    ["Local uploads/ folder", "Tied to one disk; no backups/CDN", "Object storage (e.g. S3) with short-lived signed URLs"],
    ["Stateless 7-day JWT", "Cannot revoke a stolen token early", "Short-lived access token + refresh token, or a "
                                                                    "server-side session/deny list"],
    ["Distance computed in JS", "Scans all providers", "Bounding-box pre-filter on indexed columns, or PostGIS"],
    ["Local time for slots/reminders", "Server timezone determines \"8 am\"", "Store provider timezone; compute in UTC"],
    ["Public Nominatim", "Rate-limited, best-effort", "Cache results or use a commercial geocoder"],
    ["No automated tests yet", "Regressions caught manually", "Unit tests for lib/, integration tests per route "
                                                              "(e.g. concurrent booking test)"],
], [38, 55, 77])
H2("Visible hooks for future features")
BUL([
    "<b>AI assistant</b> — <font face='Mono'>AiConversation</font> and <font face='Mono'>AiMessage</font> tables already "
    "exist (a conversation per parent, optionally about a specific pet), ready for a chat-style pet-care assistant.",
    "<b>Booking confirmation step</b> — the CONFIRMED and NO_SHOW states are modelled but not yet driven by an endpoint.",
    "<b>Community features</b> — a COMMUNITY_REPLY notification type is reserved.",
    "<b>BLOCKED slots</b> — a slot status reserved for breaks/holidays.",
])

# =====================================================================
# 17. Q&A
# =====================================================================
story.append(PageBreak())
H1("17. Explaining PawTrack: common questions and model answers")
qa = [
    ("Describe PawTrack's architecture in two sentences.",
     "It is a React single-page app that talks to a Node/Express REST API over JSON, and the API uses Prisma to read and "
     "write a SQLite database. Real-time notifications are pushed from the server with Server-Sent Events, and a cron "
     "job inside the same process delivers scheduled reminders."),
    ("How do you prevent two users from booking the same slot?",
     "Inside a transaction, the slot is claimed with one conditional UPDATE: set status BOOKED where id matches and "
     "status is AVAILABLE. The database applies it atomically, so only one request changes the row; the other sees "
     "zero affected rows and gets a 409. There is no gap between checking and writing."),
    ("How does login work and why use a cookie?",
     "The password is checked with bcrypt, then the server signs a JWT containing the user id and role and sets it as an "
     "httpOnly, SameSite=Lax cookie. The browser sends it automatically, the server verifies the signature on each "
     "request, and JavaScript can't read it, which protects the session against XSS."),
    ("What is the difference between authentication and authorization here?",
     "Authentication is requireAuth verifying the JWT. Authorization is layered: requireRole for role, queries scoped "
     "to the caller for ownership, and booking-based access for providers reading a pet's records."),
    ("How do reminders get sent at the right time?",
     "Four reminder rows are created when the booking is made, with scheduledFor set and sentAt empty. A node-cron job "
     "runs every five minutes, finds due rows, sets sentAt and pushes them over SSE. The list endpoint only shows rows "
     "with sentAt, so reminders appear exactly when due and survive restarts."),
    ("Why SSE and not WebSockets or polling?",
     "Updates only flow server-to-client, so SSE is sufficient; it is plain HTTP that reuses cookie auth, reconnects "
     "automatically, and avoids the wasted requests of polling."),
    ("How is 'providers near me' calculated?",
     "Provider addresses are geocoded to coordinates with Nominatim at signup or update. The browser supplies the user's "
     "coordinates, and the server computes great-circle distance with the Haversine formula and sorts by it."),
    ("How are medical files kept private?",
     "They are stored outside any public folder with random names, and the only way to fetch one is an API route that "
     "re-checks the requester is the owner or a provider who has a booking with that pet."),
    ("Why soft deletes?",
     "Medical and booking history is valuable and referenced by other people's data. Marking rows deleted hides them "
     "from normal queries without destroying history or breaking relationships."),
    ("What is a transaction and where do you use it?",
     "A group of writes that succeed or fail together (atomicity). PawTrack uses them for registration (user + profile "
     "+ pet), bookings (slot + booking + audit + reminders + notification), cancel/reschedule, pet deletion and account "
     "deletion."),
    ("Why is TimeSlot linked to a staff member rather than a service?",
     "Availability belongs to a person's time. Any service that person is qualified for (via the StaffService join "
     "table) can use their slot, which avoids duplicating calendars per service."),
    ("What would you change for production scale?",
     "Move to PostgreSQL, store files in object storage, replace the in-memory SSE map with Redis pub/sub, run reminders "
     "in a separate worker, add refresh tokens, handle timezones explicitly and add automated tests."),
]
for q, a in qa:
    story.append(KeepTogether([
        Paragraph(f"<b>Q. {q}</b>", ParagraphStyle("q", parent=base, textColor=ACCENT, spaceBefore=4, spaceAfter=2)),
        Paragraph(a, ParagraphStyle("a", parent=base, leftIndent=10, spaceAfter=6)),
    ]))

H2("Glossary")
TABLE([
    ["Term", "Meaning"],
    ["SPA", "Single-page application — the page loads once and JavaScript swaps views."],
    ["REST API", "HTTP endpoints organised around resources (pets, bookings) using GET/POST/PUT/PATCH/DELETE."],
    ["Middleware", "A function in Express's request pipeline that can inspect, modify or end a request."],
    ["ORM", "Object-relational mapper — lets code query the database with objects instead of raw SQL (Prisma)."],
    ["Migration", "A versioned script that changes the database schema in a repeatable way."],
    ["JWT", "JSON Web Token — a signed, self-contained token proving identity."],
    ["bcrypt / salt", "A slow password-hashing algorithm / random data mixed in so equal passwords hash differently."],
    ["Transaction (ACID)", "All-or-nothing group of database operations."],
    ["Race condition", "A bug where the result depends on the timing of concurrent operations."],
    ["Compare-and-set", "Update a value only if it still has the expected value, in one atomic step."],
    ["Idempotent", "Doing an operation twice has the same effect as doing it once."],
    ["SSE", "Server-Sent Events — a one-way, long-lived HTTP stream from server to browser."],
    ["Geocoding", "Converting an address into latitude/longitude."],
    ["Haversine", "Formula for distance between two points on a sphere."],
    ["Soft delete", "Marking a row as deleted with a timestamp instead of removing it."],
    ["IDOR", "Insecure direct object reference — accessing someone else's data by changing an id."],
], [36, 134])

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm,
                        bottomMargin=18 * mm, title="PawTrack — Technical Overview",
                        author="PawTrack", subject="Architecture and theory of operation")
doc.build(story, onFirstPage=on_cover, onLaterPages=on_page)
print("wrote", OUT)
