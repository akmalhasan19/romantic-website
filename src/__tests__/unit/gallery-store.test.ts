import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGalleryStore } from "@/store/gallery-store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const DEFAULT_SETTINGS = {
  sphere_color: "#e8a87c",
  floating_text: "Only For U",
  target_name: "Pendek.",
  particle_count: 50,
  music_url: "",
};

describe("gallery-store public route state", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    useGalleryStore.setState({
      client: null,
      clients: [],
      selectedClientId: null,
      images: [],
      settings: DEFAULT_SETTINGS,
      status: "idle",
      error: null,
      scatterMix: 0,
    });
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the latest slug data when older requests resolve later", async () => {
    const firstRequest = deferred<Response>();
    const secondRequest = deferred<Response>();

    fetchMock
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const firstFetch = useGalleryStore.getState().fetchPublicData("pasangan-a");
    const secondFetch = useGalleryStore.getState().fetchPublicData("pasangan-b");

    secondRequest.resolve(
      new Response(
        JSON.stringify({
          client: {
            id: "client-b",
            slug: "pasangan-b",
            name: "Pasangan B",
            sphere_color: "#00ffaa",
            floating_text: "Untuk B",
            target_name: "B",
            particle_count: 24,
            music_url: "/shared.mp3",
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
          },
          images: [
            {
              id: "img-b",
              client_id: "client-b",
              url: "https://example.com/b.jpg",
              public_id: "b",
              width: 100,
              height: 100,
              created_at: "2024-01-02",
            },
          ],
          settings: {
            sphere_color: "#00ffaa",
            floating_text: "Untuk B",
            target_name: "B",
            particle_count: 24,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await secondFetch;

    firstRequest.resolve(
      new Response(
        JSON.stringify({
          client: {
            id: "client-a",
            slug: "pasangan-a",
            name: "Pasangan A",
            sphere_color: "#ff6688",
            floating_text: "Untuk A",
            target_name: "A",
            particle_count: 12,
            music_url: "/shared.mp3",
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
          },
          images: [
            {
              id: "img-a",
              client_id: "client-a",
              url: "https://example.com/a.jpg",
              public_id: "a",
              width: 100,
              height: 100,
              created_at: "2024-01-02",
            },
          ],
          settings: {
            sphere_color: "#ff6688",
            floating_text: "Untuk A",
            target_name: "A",
            particle_count: 12,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await firstFetch;

    const state = useGalleryStore.getState();
    expect(state.client?.slug).toBe("pasangan-b");
    expect(state.images.map((image) => image.id)).toEqual(["img-b"]);
    expect(state.settings).toMatchObject({
      sphere_color: "#00ffaa",
      floating_text: "Untuk B",
      target_name: "B",
      particle_count: 24,
      music_url: "/shared.mp3",
    });
  });

  it("resets scene settings and scatter state while a new slug is loading", () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));

    useGalleryStore.setState({
      scatterMix: 1,
      settings: {
        sphere_color: "#111111",
        floating_text: "Lama",
        target_name: "Sebelumnya",
        particle_count: 120,
        music_url: "/old.mp3",
      },
      status: "ready",
    });

    void useGalleryStore.getState().fetchPublicData("pasangan-baru");

    const state = useGalleryStore.getState();
    expect(state.status).toBe("loading");
    expect(state.scatterMix).toBe(0);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("handles openMemoryModal with originRect and closeMemoryModal", () => {
    useGalleryStore.setState({
      images: [
        {
          id: "img-1",
          url: "https://example.com/1.jpg",
          public_id: "1",
          width: 800,
          height: 600,
          created_at: "2024-01-01",
        },
        {
          id: "img-2",
          url: "https://example.com/2.jpg",
          public_id: "2",
          width: 800,
          height: 600,
          created_at: "2024-01-02",
        },
      ],
      activeMemoryIndex: null,
      memoryOriginRect: null,
      hiddenInstanceId: null,
    });

    const origin = { x: 320, y: 240, width: 64, height: 86 };
    useGalleryStore.getState().openMemoryModal(1, origin, 7);

    let state = useGalleryStore.getState();
    expect(state.activeMemoryIndex).toBe(1);
    expect(state.memoryOriginRect).toEqual(origin);
    expect(state.hiddenInstanceId).toBe(7);

    useGalleryStore.getState().nextMemory();
    state = useGalleryStore.getState();
    expect(state.activeMemoryIndex).toBe(0);
    expect(state.hiddenInstanceId).toBe(7);

    useGalleryStore.getState().prevMemory();
    state = useGalleryStore.getState();
    expect(state.activeMemoryIndex).toBe(1);
    expect(state.hiddenInstanceId).toBe(7);

    useGalleryStore.getState().closeMemoryModal();
    state = useGalleryStore.getState();
    expect(state.activeMemoryIndex).toBeNull();
    expect(state.memoryOriginRect).toBeNull();
    expect(state.hiddenInstanceId).toBeNull();
  });

  it("registers and calls getCurrentInstanceOrigin", () => {
    const mockGetter = (id: number) => ({
      x: 100 + id,
      y: 200 + id,
      width: 50,
      height: 70,
    });

    useGalleryStore.getState().setGetCurrentInstanceOrigin(mockGetter);
    const getter = useGalleryStore.getState().getCurrentInstanceOrigin;
    expect(getter).toBeDefined();
    expect(getter!(5)).toEqual({ x: 105, y: 205, width: 50, height: 70 });

    useGalleryStore.getState().setGetCurrentInstanceOrigin(undefined);
    expect(useGalleryStore.getState().getCurrentInstanceOrigin).toBeUndefined();
  });

  it("handles 9:16 and custom aspect ratio images with matching origin projections", () => {
    // 9:16 aspect ratio image
    const portraitImage = {
      id: "img-portrait",
      url: "https://example.com/portrait.jpg",
      public_id: "portrait",
      width: 1080,
      height: 1920,
      created_at: "2024-01-01",
    };

    useGalleryStore.setState({
      images: [portraitImage],
      activeMemoryIndex: null,
      memoryOriginRect: null,
      hiddenInstanceId: null,
    });

    const ratio = portraitImage.width / portraitImage.height; // 9:16 = 0.5625
    const projHeight = 80;
    const projWidth = Math.round(projHeight * ratio); // 45px

    const origin = { x: 400, y: 300, width: projWidth, height: projHeight };
    useGalleryStore.getState().openMemoryModal(0, origin, 3);

    const state = useGalleryStore.getState();
    expect(state.activeMemoryIndex).toBe(0);
    expect(state.memoryOriginRect?.width).toBe(45);
    expect(state.memoryOriginRect?.height).toBe(80);
    expect(state.memoryOriginRect!.width / state.memoryOriginRect!.height).toBeCloseTo(0.5625, 2);
  });
});