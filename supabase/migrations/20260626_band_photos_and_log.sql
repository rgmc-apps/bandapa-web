-- ─────────────────────────────────────────────────────────────────────────────
-- Band Photos
-- Stores gallery images uploaded by band admins.
-- Images live in the `band-images` storage bucket under {band_id}/gallery/.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "bandapa-main".band_photos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  band_id     uuid        NOT NULL REFERENCES "bandapa-main".bands(id) ON DELETE CASCADE,
  url         text        NOT NULL,
  uploaded_by uuid        REFERENCES "bandapa-main".users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE "bandapa-main".band_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view band photos"
  ON "bandapa-main".band_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "bandapa-main".band_members
      WHERE band_id = band_photos.band_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert band photos"
  ON "bandapa-main".band_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "bandapa-main".band_members
      WHERE band_id = band_photos.band_id
        AND user_id = auth.uid()
        AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete band photos"
  ON "bandapa-main".band_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "bandapa-main".band_members
      WHERE band_id = band_photos.band_id
        AND user_id = auth.uid()
        AND is_admin = true
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Band Log
-- Audit trail for membership changes: joined, removed, quit.
-- user_id  = the affected member
-- actor_id = who performed the action (admin for removes, same as user_id for joins/quits)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "bandapa-main".band_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  band_id    uuid        NOT NULL REFERENCES "bandapa-main".bands(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES "bandapa-main".users(id) ON DELETE SET NULL,
  action     text        NOT NULL CHECK (action IN ('joined', 'removed', 'quit')),
  actor_id   uuid        REFERENCES "bandapa-main".users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE "bandapa-main".band_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view band log"
  ON "bandapa-main".band_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "bandapa-main".band_members
      WHERE band_id = band_log.band_id
        AND user_id = auth.uid()
    )
  );

-- Insert must happen while the user is still a member (before the band_members delete).
CREATE POLICY "Members can insert to band log"
  ON "bandapa-main".band_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "bandapa-main".band_members
      WHERE band_id = band_log.band_id
        AND user_id = auth.uid()
    )
  );
