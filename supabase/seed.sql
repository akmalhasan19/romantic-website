-- ============================================
-- Seed data for Romantic Website (multi-tenant)
-- Run after schema.sql
-- ============================================

-- Seed clients. `default` is the compatibility fallback for routes that have
-- not yet been migrated to pass the x-client-slug header into Supabase.
INSERT INTO clients (
  slug,
  name,
  sphere_color,
  floating_text,
  target_name,
  particle_count,
  music_url
)
VALUES
  (
    'default',
    'Default Romantic Experience',
    '#e8a87c',
    'Only For U',
    'Pendek.',
    50,
    '/message-in-a-bottle-taylor-swift.mp3'
  ),
  (
    'pasangan-demo',
    'Pasangan Demo',
    '#ff7a59',
    'Forever Us',
    'Sayang.',
    72,
    '/message-in-a-bottle-taylor-swift.mp3'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sphere_color = EXCLUDED.sphere_color,
  floating_text = EXCLUDED.floating_text,
  target_name = EXCLUDED.target_name,
  particle_count = EXCLUDED.particle_count,
  music_url = EXCLUDED.music_url;

-- Keep the legacy single-row settings table aligned with the default client.
INSERT INTO site_settings (id, sphere_color, floating_text, target_name, particle_count)
VALUES (1, '#e8a87c', 'Only For U', 'Pendek.', 50)
ON CONFLICT (id) DO UPDATE SET
  sphere_color = EXCLUDED.sphere_color,
  floating_text = EXCLUDED.floating_text,
  target_name = EXCLUDED.target_name,
  particle_count = EXCLUDED.particle_count;

-- Backfill legacy images into the default client before inserting new samples.
UPDATE gallery_images
SET client_id = (SELECT id FROM clients WHERE slug = 'default')
WHERE client_id IS NULL;

-- Sample gallery images grouped per client (placeholder URLs - replace as needed).
INSERT INTO gallery_images (client_id, url, public_id, width, height)
VALUES
  (
    (SELECT id FROM clients WHERE slug = 'default'),
    'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains',
    'default/landscapes/nature-mountains',
    1920,
    1080
  ),
  (
    (SELECT id FROM clients WHERE slug = 'default'),
    'https://res.cloudinary.com/demo/image/upload/v1/samples/food/spices',
    'default/food/spices',
    1920,
    1280
  ),
  (
    (SELECT id FROM clients WHERE slug = 'pasangan-demo'),
    'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/beach-boat',
    'pasangan-demo/landscapes/beach-boat',
    1920,
    1280
  ),
  (
    (SELECT id FROM clients WHERE slug = 'pasangan-demo'),
    'https://res.cloudinary.com/demo/image/upload/v1/samples/people/bicycle',
    'pasangan-demo/people/bicycle',
    1600,
    1067
  )
ON CONFLICT (client_id, public_id) DO UPDATE SET
  url = EXCLUDED.url,
  width = EXCLUDED.width,
  height = EXCLUDED.height;
