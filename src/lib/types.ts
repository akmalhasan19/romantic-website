/** Row shape for the clients table */
export interface ClientRow {
  id: string;
  slug: string;
  name: string;
  sphere_color: string;
  floating_text: string;
  target_name: string;
  particle_count: number;
  music_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape for the gallery_images table */
export interface GalleryImageRow {
  id: string;
  client_id: string | null;
  url: string;
  public_id: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

/** Row shape for the legacy site_settings table */
export interface SiteSettingsRow {
  id: number;
  sphere_color: string;
  floating_text: string;
  target_name: string;
  particle_count: number;
  updated_at: string;
}
