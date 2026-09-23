import { create } from "zustand";
import type {
  ClientCreatePayload,
  ImagePayload,
  ImageUpdatePayload,
  SettingsPayload,
} from "@/lib/validators";

// ── Types ───────────────────────────────────────────────────────────

export interface GalleryImage {
  id: string;
  client_id?: string | null;
  url: string;
  public_id: string;
  width: number | null;
  height: number | null;
  caption?: string | null;
  memory_date?: string | null;
  created_at: string;
}

export interface MemoryModalOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GalleryClient {
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

export interface SiteSettings {
  sphere_color: string;
  floating_text: string;
  target_name: string;
  particle_count: number;
  music_url: string;
}

type Status = "idle" | "loading" | "ready" | "error";

interface GalleryState {
  // ── State ──────────────────────────────────────────────────────────
  client: GalleryClient | null;
  clients: GalleryClient[];
  selectedClientId: string | null;
  images: GalleryImage[];
  settings: SiteSettings;
  status: Status;
  error: string | null;

  // Scatter animation
  scatterMix: number;

  // Interactive Memory Modal
  activeMemoryIndex: number | null;
  memoryOriginRect: MemoryModalOrigin | null;
  hiddenInstanceId: number | null;
  getCurrentInstanceOrigin?: (instanceId: number) => MemoryModalOrigin | null;

  // ── Actions — public ───────────────────────────────────────────────
  fetchPublicData: (slug: string) => Promise<void>;
  triggerScatter: () => void;
  openMemoryModal: (
    index: number,
    originRect?: MemoryModalOrigin | null,
    hiddenInstanceId?: number | null
  ) => void;
  closeMemoryModal: () => void;
  setMemoryOriginRect: (originRect: MemoryModalOrigin | null) => void;
  setGetCurrentInstanceOrigin: (
    fn?: (instanceId: number) => MemoryModalOrigin | null
  ) => void;
  nextMemory: () => void;
  prevMemory: () => void;

  // ── Actions — admin ────────────────────────────────────────────────
  fetchAdminClients: () => Promise<void>;
  setSelectedClient: (clientId: string) => void;
  fetchAdminImages: (clientId?: string) => Promise<void>;
  fetchAdminSettings: () => Promise<void>;
  createClient: (payload: ClientCreatePayload) => Promise<GalleryClient>;
  addImage: (payload: ImagePayload) => Promise<GalleryImage>;
  deleteImage: (id: string) => Promise<void>;
  updateImageCaption: (
    id: string,
    payload: ImageUpdatePayload
  ) => Promise<GalleryImage>;
  updateSettings: (payload: SettingsPayload) => Promise<void>;
}

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SiteSettings = {
  sphere_color: "#e8a87c",
  floating_text: "Only For U",
  target_name: "Pendek.",
  particle_count: 50,
  music_url: "",
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

function buildAdminImagesUrl(clientId?: string): string {
  if (!clientId) return "/api/admin/images";
  const query = new URLSearchParams({ client_id: clientId });
  return `/api/admin/images?${query.toString()}`;
}

function toSettingsFromClient(client: GalleryClient): SiteSettings {
  return {
    sphere_color: client.sphere_color,
    floating_text: client.floating_text,
    target_name: client.target_name,
    particle_count: client.particle_count,
    music_url: client.music_url ?? "",
  };
}

function resolveSelectedClient(
  clients: GalleryClient[],
  selectedClientId: string | null
): GalleryClient | null {
  if (clients.length === 0) return null;
  return (
    clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null
  );
}

function applyClientToCollection(
  clients: GalleryClient[],
  nextClient: GalleryClient
): GalleryClient[] {
  const existing = clients.some((client) => client.id === nextClient.id);
  if (!existing) {
    return [nextClient, ...clients];
  }

  return clients.map((client) =>
    client.id === nextClient.id ? nextClient : client
  );
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
let latestPublicRequestId = 0;

// ── Store ───────────────────────────────────────────────────────────

export const useGalleryStore = create<GalleryState>((set, get) => ({
  client: null,
  clients: [],
  selectedClientId: null,
  images: [],
  settings: DEFAULT_SETTINGS,
  status: "idle",
  error: null,
  scatterMix: 0,
  activeMemoryIndex: null,
  memoryOriginRect: null,
  hiddenInstanceId: null,
  getCurrentInstanceOrigin: undefined,

  // ── Public actions ─────────────────────────────────────────────────

  fetchPublicData: async (slug) => {
    const requestId = ++latestPublicRequestId;

    set({
      status: "loading",
      error: null,
      client: null,
      images: [],
      settings: DEFAULT_SETTINGS,
      scatterMix: 0,
      activeMemoryIndex: null,
      memoryOriginRect: null,
      hiddenInstanceId: null,
    });

    try {
      const data = await fetchJson<{
        client: GalleryClient;
        images: GalleryImage[];
        settings: SiteSettings | null;
      }>(buildPublicGalleryUrl(slug));

      if (requestId !== latestPublicRequestId) {
        return;
      }

      set({
        client: data.client ?? null,
        images: data.images ?? [],
        settings: {
          ...DEFAULT_SETTINGS,
          ...(data.settings ?? DEFAULT_SETTINGS),
          music_url: data.client?.music_url ?? "",
        },
        status: "ready",
        error: null,
        activeMemoryIndex: null,
        memoryOriginRect: null,
        hiddenInstanceId: null,
      });
    } catch (err) {
      if (requestId !== latestPublicRequestId) {
        return;
      }

      set({
        client: null,
        images: [],
        settings: DEFAULT_SETTINGS,
        status: "error",
        error: toPublicErrorMessage(err),
        activeMemoryIndex: null,
        memoryOriginRect: null,
        hiddenInstanceId: null,
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

  openMemoryModal: (
    index: number,
    originRect?: MemoryModalOrigin | null,
    hiddenInstanceId?: number | null
  ) => {
    const images = get().images;
    if (index >= 0 && index < images.length) {
      set({
        activeMemoryIndex: index,
        memoryOriginRect: originRect ?? null,
        hiddenInstanceId: hiddenInstanceId ?? null,
      });
    }
  },

  closeMemoryModal: () => {
    set({
      activeMemoryIndex: null,
      memoryOriginRect: null,
      hiddenInstanceId: null,
    });
  },

  setMemoryOriginRect: (originRect: MemoryModalOrigin | null) => {
    set({ memoryOriginRect: originRect });
  },

  setGetCurrentInstanceOrigin: (fn) => {
    set({ getCurrentInstanceOrigin: fn });
  },

  nextMemory: () => {
    const { images, activeMemoryIndex } = get();
    if (images.length === 0 || activeMemoryIndex === null) return;
    set({ activeMemoryIndex: (activeMemoryIndex + 1) % images.length });
  },

  prevMemory: () => {
    const { images, activeMemoryIndex } = get();
    if (images.length === 0 || activeMemoryIndex === null) return;
    set({
      activeMemoryIndex:
        (activeMemoryIndex - 1 + images.length) % images.length,
    });
  },

  // ── Admin actions ──────────────────────────────────────────────────

  fetchAdminClients: async () => {
    set({ status: "loading", error: null });
    try {
      const data = await fetchJson<{ clients: GalleryClient[] }>(
        "/api/admin/clients"
      );

      const clients = data.clients ?? [];
      const selected = resolveSelectedClient(clients, get().selectedClientId);

      set({
        clients,
        client: selected,
        selectedClientId: selected?.id ?? null,
        images: [],
        settings: selected ? toSettingsFromClient(selected) : DEFAULT_SETTINGS,
        status: "ready",
      });
    } catch (err) {
      set({ status: "error", error: toErrorMessage(err) });
    }
  },

  setSelectedClient: (clientId) => {
    const selected = resolveSelectedClient(get().clients, clientId);
    set({
      selectedClientId: selected?.id ?? null,
      client: selected,
      images: [],
      settings: selected ? toSettingsFromClient(selected) : DEFAULT_SETTINGS,
      error: null,
    });
  },

  fetchAdminImages: async (clientId) => {
    set({ status: "loading", error: null });
    try {
      const targetClientId = clientId ?? get().selectedClientId ?? undefined;
      const data = await fetchJson<{ images: GalleryImage[] }>(
        buildAdminImagesUrl(targetClientId)
      );
      set({ images: data.images ?? [], status: "ready" });
    } catch (err) {
      set({ status: "error", error: toErrorMessage(err) });
    }
  },

  fetchAdminSettings: async () => {
    const selected = resolveSelectedClient(get().clients, get().selectedClientId);
    set({
      client: selected,
      settings: selected ? toSettingsFromClient(selected) : DEFAULT_SETTINGS,
      status: "ready",
      error: null,
    });
  },

  createClient: async (payload) => {
    const previousClients = get().clients;
    try {
      const data = await fetchJson<{ client: GalleryClient }>(
        "/api/admin/clients",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const clients = applyClientToCollection(previousClients, data.client);
      set({
        clients,
        client: data.client,
        selectedClientId: data.client.id,
        images: [],
        settings: toSettingsFromClient(data.client),
        error: null,
      });
      return data.client;
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
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

  updateImageCaption: async (id, payload) => {
    const prev = get().images;
    try {
      const data = await fetchJson<{ image: GalleryImage }>(
        `/api/admin/images/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      set({
        images: prev.map((img) => (img.id === id ? data.image : img)),
      });
      return data.image;
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  updateSettings: async (payload) => {
    const selectedClientId = get().selectedClientId;
    if (!selectedClientId) {
      const error = new Error("Select a client first");
      set({ error: error.message });
      throw error;
    }

    const prev = get().settings;
    const prevClient = get().client;
    const prevClients = get().clients;

    const nextMusicUrl = payload.music_url ?? prev.music_url;
    const optimisticClient = prevClient
      ? {
          ...prevClient,
          sphere_color: payload.sphere_color,
          floating_text: payload.floating_text,
          target_name: payload.target_name,
          particle_count: payload.particle_count,
          music_url: nextMusicUrl || null,
        }
      : null;

    // Optimistic update
    set({
      settings: { ...prev, ...payload, music_url: nextMusicUrl },
      client: optimisticClient,
      clients: optimisticClient
        ? applyClientToCollection(prevClients, optimisticClient)
        : prevClients,
    });
    try {
      const data = await fetchJson<{ client: GalleryClient }>(
        `/api/admin/clients/${encodeURIComponent(selectedClientId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      set({
        client: data.client,
        clients: applyClientToCollection(get().clients, data.client),
        settings: toSettingsFromClient(data.client),
      });
    } catch (err) {
      // Rollback on failure
      set({
        settings: prev,
        client: prevClient,
        clients: prevClients,
        error: toErrorMessage(err),
      });
      throw err;
    }
  },
}));
