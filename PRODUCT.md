# Bandapa Web — Product Context

## Product purpose
Companion web service for the Bandapa Android app. Serves three distinct surfaces: a public download/marketing page for new users, an email auth confirmation handler, and a password-protected admin portal for managing platform content.

## Users
- **Public visitors**: musicians discovering the app, clicking email confirmation links
- **Admins**: platform operators managing bands, artists, venues, albums, and announcements via a full CRUD dashboard

## Brand
"Eco-Systemic Modernism" — the intersection of organic natural systems and precise digital infrastructure. Not earthy-crunchy, not sterile tech. Both at once.

Primary palette: Chlorophyll Green `#6EE384` (energy, action) + Obsidian Deep `#0F1509` (depth, authority). Supporting: muted sage secondaries, earthy tertiary neutrals.

Typography: Plus Jakarta Sans (headlines) / Inter (body) / JetBrains Mono (labels, metadata, codes).

Anti-references: generic SaaS purple gradients, flat startup pastels, overdesigned brutalism, dark-mode-for-cool's-sake.

## Register
- `/download` and `/auth/confirm`: **brand** — color IS the voice, Committed strategy
- `/admin/*`: **product** — color serves function, Restrained strategy; semantic-first

## Tone
Precise, professional, slightly alive. Not corporate. Not casual.

## Strategic principles
- Chlorophyll green = action and life. Reserved for primary CTAs, active states, success.
- Obsidian = depth and authority. Used for sidebar, dark cards, contrast moments.
- Error = `#ba1a1a` / error-container `#ffdad6` — brand-system error, never raw Tailwind red.
- Secondary container = `#dbe2ce` (earthy sage) — subtle category backgrounds, instrument/type tags.
- Never: glassmorphism as decoration, hero-metric templates, side-stripe borders, gradient text.
