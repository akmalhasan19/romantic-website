import { create } from "zustand";
import type { ImagePayload, SettingsPayload } from "@/lib/validators";

// ── Types ───────────────────────────────────────────────────────────

export interface GalleryImage {
  id: string;
  client_id?: string | null;
  url: string;
  public_id: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface GalleryClient {
  id: string;
  slug: string;
  name: string;
  music_url: string | null;
}

export interface SiteSettings {
  sphere_color: string;
  floating_text: string;
  target_name: string;
  particle_count: number;
}

type Status = "idle" | "loading" | "ready" | "error";

interface GalleryState {
  // ── State ──────────────────────────────────────────────────────────
  client: GalleryClient | null;
  images: GalleryImage[];
  settings: SiteSettings;
  status: Status;
  error: string | null;

  // Scatter animation
  scatterMix: number;

  // ── Actions — public ───────────────────────────────────────────────
  fetchPublicData: (slug: string) => Promise<void>;
  triggerScatter: () => void;

  // ── Actions — admin ────────────────────────────────────────────────
  fetchAdminImages: () => Promise<void>;
  fetchAdminSettings: () => Promise<void>;
  addImage: (payload: ImagePayload) => Promise<GalleryImage>;
  deleteImage: (id: string) => Promise<void>;
  updateSettings: (payload: SettingsPayload) => Promise<void>;
}

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SiteSettings = {
  sphere_color: "#e8a87c",
  floating_text: "Only For U",
  target_name: "Pendek.",
  particle_count: 50,
};

const INVALID_SLUG_MESSAGE = "Halaman Tidak Ditemukan / QR Tidak Valid";

// ── Helpers ─────────────────────────────────────────────────────────

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function toPublicErrorMessage(err: unknown): string {
  const message = toErrorMessage(err);
  if (message === "Client not found" || message === "Invalid client slug") {
    return INVALID_SLUG_MESSAGE;
  }
  return message;
}

function buildPublicGalleryUrl(slug: string): string {
  const query = new URLSearchParams({ slug });
  return `/api/public/gallery?${query.toString()}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`
    );
  }
  return res.json() as Promise<T>;
}

// ── Scatter timer handle ────────────────────────────────────────────
let scatterTimer: ReturnType<typeof setTimeout> | null = null;

// ── Store ───────────────────────────────────────────────────────────

export const useGalleryStore = create<GalleryState>((set, get) => ({
  client: null,
  images: [],
  settings: DEFAULT_SETTINGS,
  status: "idle",
  error: null,
  scatterMix: 0,

  // ── Public actions ─────────────────────────────────────────────────

  fetchPublicData: async (slug) => {
    set({ status: "loading", error: null, client: null, images: [] });
    try {
      const data = await fetchJson<{
        client: GalleryClient;
        images: GalleryImage[];
        settings: SiteSettings | null;
      }>(buildPublicGalleryUrl(slug));

      set({
        client: data.client ?? null,
        images: data.images ?? [],
        settings: data.settings ?? DEFAULT_SETTINGS,
        status: "ready",
      });
    } catch (err) {
      set({
        client: null,
        images: [],
        settings: DEFAULT_SETTINGS,
        status: "error",
        error: toPublicErrorMessage(err),
      });
    }
  },

  triggerScatter: () => {
    // Clear any pending reset so rapid triggers don't conflict
    if (scatterTimer) clearTimeout(scatterTimer);

    set({ scatterMix: 1 });
    scatterTimer = setTimeout(() => {
      set({ scatterMix: 0 });
      scatterTimer = null;
    }, 2000);
  },

  // ── Admin actions ──────────────────────────────────────────────────

  fetchAdminImages: async () => {
    set({ status: "loading", error: null });
    try {
      const data = await fetchJson<{ images: GalleryImage[] }>(
        "/api/admin/images"
      );
      set({ images: data.images ?? [], status: "ready" });
    } catch (err) {
      set({ status: "error", error: toErrorMessage(err) });
    }
  },

  fetchAdminSettings: async () => {
    set({ status: "loading", error: null });
    try {
      const data = await fetchJson<{ settings: SiteSettings }>(
        "/api/admin/settings"
      );
      set({ settings: data.settings ?? DEFAULT_SETTINGS, status: "ready" });
    } catch (err) {
      set({ status: "error", error: toErrorMessage(err) });
    }
  },

  addImage: async (payload) => {
    const prev = get().images;
    try {
      const data = await fetchJson<{ image: GalleryImage }>(
        "/api/admin/images",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      // Prepend the new image (newest first)
      set({ images: [data.image, ...prev] });
      return data.image;
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  deleteImage: async (id) => {
    const prev = get().images;
    // Optimistic removal
    set({ images: prev.filter((img) => img.id !== id) });
    try {
      await fetchJson<{ ok: boolean }>(`/api/admin/images/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      // Rollback on failure
      set({ images: prev, error: toErrorMessage(err) });
      throw err;
    }
  },

  updateSettings: async (payload) => {
    const prev = get().settings;
    // Optimistic update
    set({ settings: { ...prev, ...payload } });
    try {
      const data = await fetchJson<{ settings: SiteSettings }>(
        "/api/admin/settings",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      set({ settings: data.settings });
    } catch (err) {
      // Rollback on failure
      set({ settings: prev, error: toErrorMessage(err) });
      throw err;
    }
  },
}));
