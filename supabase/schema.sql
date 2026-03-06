-- ============================================
-- Romantic Website Database Schema
-- Tables: clients, gallery_images, site_settings (legacy fallback)
-- ============================================

-- Shared trigger to keep updated_at fresh on mutable tables.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reads the client slug from a request header so public RLS can scope rows.
-- Current routes that do not forward this header will transparently fall back
-- to the seeded `default` client while the app is migrated to dynamic routes.
CREATE OR REPLACE FUNCTION get_requested_client_slug()
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(
      ((COALESCE(current_setting('request.headers', true), '{}'))::jsonb ->> 'x-client-slug'),
      ''
    ),
    'default'
  );
$$ LANGUAGE sql STABLE;

-- Clients table stores per-couple theme/configuration.
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sphere_color TEXT NOT NULL DEFAULT '#e8a87c',
  floating_text TEXT NOT NULL DEFAULT 'Only For U',
  target_name TEXT NOT NULL DEFAULT 'Pendek.',
  particle_count INTEGER NOT NULL DEFAULT 50,
  music_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT clients_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT clients_particle_count_range
    CHECK (particle_count BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS idx_clients_created_at
  ON clients (created_at DESC);

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Gallery images table. Existing single-tenant installs are migrated below.
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID,
  url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE gallery_images
  ADD COLUMN IF NOT EXISTS client_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gallery_images_public_id_key'
      AND conrelid = 'gallery_images'::regclass
  ) THEN
    ALTER TABLE gallery_images
      DROP CONSTRAINT gallery_images_public_id_key;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gallery_images_client_id_fkey'
      AND conrelid = 'gallery_images'::regclass
  ) THEN
    ALTER TABLE gallery_images
      ADD CONSTRAINT gallery_images_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES clients(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gallery_images_client_public_id
  ON gallery_images (client_id, public_id);

CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at
  ON gallery_images (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_images_client_created_at
  ON gallery_images (client_id, created_at DESC);

-- Legacy fallback table kept during migration. The default client mirrors it
-- so existing admin/public flows keep working until the multi-tenant routes land.
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sphere_color TEXT NOT NULL DEFAULT '#e8a87c',
  floating_text TEXT NOT NULL DEFAULT 'Only For U',
  target_name TEXT NOT NULL DEFAULT 'Pendek.',
  particle_count INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT site_settings_particle_count_range
    CHECK (particle_count BETWEEN 1 AND 500)
);

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================
-- Strategy:
--   • anon/authenticated roles can SELECT public rows
--   • gallery_images rows are filtered by the requested client slug
--   • INSERT / UPDATE / DELETE require service_role
--     (service_role bypasses RLS by default)
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read clients" ON clients;
CREATE POLICY "Public read clients"
  ON clients FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Public read gallery images by client slug" ON gallery_images;
CREATE POLICY "Public read gallery images by client slug"
  ON gallery_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM clients
      WHERE clients.id = gallery_images.client_id
        AND clients.slug = get_requested_client_slug()
    )
  );

DROP POLICY IF EXISTS "Public read site settings" ON site_settings;
CREATE POLICY "Public read site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);
