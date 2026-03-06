import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMockState = vi.hoisted(() => {
    function createChainMock() {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.order = vi.fn(() => chain);
        chain.single = vi.fn(() => chain);
        chain.then = undefined as unknown as ReturnType<typeof vi.fn>;
        return chain;
    }

    const state = {
        createChainMock,
        clientChain: createChainMock(),
        imageChain: createChainMock(),
        mockFrom: vi.fn((table: string) => {
            if (table === "clients") return state.clientChain;
            if (table === "gallery_images") return state.imageChain;
            throw new Error(`Unexpected table: ${table}`);
        }),
        mockGetSupabase: vi.fn(() => ({
            from: state.mockFrom,
        })),
    };

    return state;
});

vi.mock("@/lib/supabase", () => ({
    getSupabase: supabaseMockState.mockGetSupabase,
}));

import { GET as getClients } from "@/app/api/clients/route";
import { GET as getPublicGallery } from "@/app/api/public/gallery/route";

describe("GET /api/clients", () => {
    beforeEach(() => {
        supabaseMockState.clientChain = supabaseMockState.createChainMock();
        supabaseMockState.imageChain = supabaseMockState.createChainMock();
        supabaseMockState.mockFrom.mockClear();
        supabaseMockState.mockGetSupabase.mockClear();
    });

    it("returns clients list on success", async () => {
        const clients = [
            {
                id: "550e8400-e29b-41d4-a716-446655440000",
                slug: "pasangan-demo",
                name: "Pasangan Demo",
                sphere_color: "#ff7a59",
                floating_text: "Forever Us",
                target_name: "Sayang.",
                particle_count: 72,
                music_url: "/song.mp3",
                created_at: "2024-01-01",
                updated_at: "2024-01-01",
            },
        ];

        supabaseMockState.clientChain.order.mockResolvedValue({ data: clients, error: null });

        const res = await getClients(new Request("http://localhost:3000/api/clients"));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.clients).toEqual(clients);
    });

    it("returns a single client when slug is provided", async () => {
        const client = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            slug: "pasangan-demo",
            name: "Pasangan Demo",
            sphere_color: "#ff7a59",
            floating_text: "Forever Us",
            target_name: "Sayang.",
            particle_count: 72,
            music_url: "/song.mp3",
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
        };

        supabaseMockState.clientChain.single.mockResolvedValue({ data: client, error: null });

        const res = await getClients(
            new Request("http://localhost:3000/api/clients?slug=pasangan-demo")
        );
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.client).toEqual(client);
        expect(supabaseMockState.clientChain.eq).toHaveBeenCalledWith("slug", "pasangan-demo");
    });
});

describe("GET /api/public/gallery", () => {
    beforeEach(() => {
        supabaseMockState.clientChain = supabaseMockState.createChainMock();
        supabaseMockState.imageChain = supabaseMockState.createChainMock();
        supabaseMockState.mockFrom.mockClear();
        supabaseMockState.mockGetSupabase.mockClear();
    });

    it("returns client-scoped images and settings for a slug", async () => {
        const client = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            slug: "pasangan-demo",
            name: "Pasangan Demo",
            sphere_color: "#ff7a59",
            floating_text: "Forever Us",
            target_name: "Sayang.",
            particle_count: 72,
            music_url: "/song.mp3",
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
        };
        const images = [
            {
                id: "img-1",
                client_id: client.id,
                url: "https://example.com/photo.jpg",
                public_id: "pasangan-demo/photo",
                width: 1200,
                height: 800,
                created_at: "2024-01-02",
            },
        ];

        supabaseMockState.clientChain.single.mockResolvedValue({ data: client, error: null });
        supabaseMockState.imageChain.order.mockResolvedValue({ data: images, error: null });

        const res = await getPublicGallery(
            new Request("http://localhost:3000/api/public/gallery?slug=pasangan-demo")
        );
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.client.slug).toBe("pasangan-demo");
        expect(data.images).toEqual(images);
        expect(data.settings).toEqual({
            sphere_color: "#ff7a59",
            floating_text: "Forever Us",
            target_name: "Sayang.",
            particle_count: 72,
        });
        expect(supabaseMockState.mockGetSupabase).toHaveBeenCalledWith({
            headers: { "x-client-slug": "pasangan-demo" },
        });
    });
});