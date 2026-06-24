# ── Stage 1: deps ─────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# ── Stage 2: builder ───────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Provide build-time env vars (values are safe to bake in — they're public keys)
ENV NEXT_PUBLIC_SUPABASE_URL=https://rrfelwwoypouqcjbdzrb.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyZmVsd3dveXBvdXFjamJkenJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDAxMTMsImV4cCI6MjA5NDc3NjExM30.zR53IJTlEkK0LFMvsMlqP-EZXlc8RRUBgL3wmce_yZ4
ENV NEXT_PUBLIC_APK_DOWNLOAD_URL=https://rrfelwwoypouqcjbdzrb.supabase.co/storage/v1/object/public/releases/bandapa-latest.apk
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: runner ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy only the standalone output + static assets
COPY --from=builder /app/public            ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs

# Cloud Run injects PORT (default 8080); Next.js standalone server respects it
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
