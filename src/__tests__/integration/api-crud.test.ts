import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase Admin ─────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

function createChainMock() {
    // Create a chainable mock that returns itself for chaining
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.upsert = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.single = vi.fn(() => chain);
    // Default: resolve with empty data
    chain.then = undefined as unknown as ReturnType<typeof vi.fn>;
    return chain;
}

let chainMock = createChainMock();

const mockFrom = vi.fn((table: string) => chainMock);

vi.mock("@/lib/supabase-admin", () => ({
    getSupabaseAdmin: () => ({
        from: mockFrom,
    }),
}));

// Mock Cloudinary
vi.mock("@/lib/cloudinary", () => ({
    deleteCloudinaryImage: vi.fn(() => Promise.resolve(true)),
}));

// ── Import route handlers after mocks ────────────────────────────────

import {
    GET as getImages,
    POST as postImage,
} from "@/app/api/admin/images/route";
import { DELETE as deleteImage } from "@/app/api/admin/images/[id]/route";
import {
    GET as getSettings,
    PUT as putSettings,
} from "@/app/api/admin/settings/route";

// ── Helpers ──────────────────────────────────────────────────────────

function makeRequest(
    path: string,
    method: string,
    body?: unknown
): Request {
    const init: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (body !== undefined) {
        init.body = JSON.stringify(body);
    }
    return new Request(`http://localhost:3000${path}`, init);
}

// ═══════════════════════════════════════════════════════════════════
// Images CRUD
// ═══════════════════════════════════════════════════════════════════

describe("GET /api/admin/images", () => {
    beforeEach(() => {
        chainMock = createChainMock();
        mockFrom.mockReturnValue(chainMock);
    });

    it("returns images array on success", async () => {
        const mockImages = [
            {
                id: "1",
                url: "https://example.com/img1.jpg",
                public_id: "folder/img1",
                width: 800,
                height: 600,
                created_at: "2024-01-01",
            },
        ];

        // Make the chain resolve with data
        chainMock.order.mockResolvedValue({ data: mockImages, error: null });

        const res = await getImages(
            new Request("http://localhost:3000/api/admin/images")
        );
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.images).toEqual(mockImages);
        expect(mockFrom).toHaveBeenCalledWith("gallery_images");
    });

    it("returns 500 on Supabase error", async () => {
        chainMock.order.mockResolvedValue({
            data: null,
            error: { message: "DB error" },
        });

        const res = await getImages(
            new Request("http://localhost:3000/api/admin/images")
        );
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe("Failed to fetch images");
    });

    it("filters images by slug when provided", async () => {
        const clientChain = createChainMock();
        clientChain.single.mockResolvedValue({
            data: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                slug: "pasangan-demo",
                name: "Pasangan Demo",
            },
            error: null,
        });

        const imageChain = createChainMock();
        imageChain.order.mockResolvedValue({ data: [], error: null });

        mockFrom.mockImplementation((table) => {
            if (table === "clients") return clientChain;
            return imageChain;
        });

        const res = await getImages(
            new Request("http://localhost:3000/api/admin/images?slug=pasangan-demo")
        );
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.images).toEqual([]);
        expect(clientChain.eq).toHaveBeenCalledWith("slug", "pasangan-demo");
        expect(imageChain.eq).toHaveBeenCalledWith(
            "client_id",
            "550e8400-e29b-41d4-a716-446655440000"
        );
    });
});

describe("POST /api/admin/images", () => {
    beforeEach(() => {
        chainMock = createChainMock();
        mockFrom.mockReturnValue(chainMock);
    });

    it("creates an image with valid payload and returns 201", async () => {
        const newImage = {
            id: "uuid-123",
            client_id: "550e8400-e29b-41d4-a716-446655440000",
            url: "https://example.com/new.jpg",
            public_id: "folder/new",
            width: null,
            height: null,
            created_at: "2024-01-01",
        };

        chainMock.single.mockResolvedValue({ data: newImage, error: null });

        const req = makeRequest("/api/admin/images", "POST", {
            client_id: "550e8400-e29b-41d4-a716-446655440000",
            url: "https://example.com/new.jpg",
            public_id: "folder/new",
        });

        const res = await postImage(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.image).toEqual(newImage);
        expect(chainMock.insert).toHaveBeenCalledWith({
            client_id: "550e8400-e29b-41d4-a716-446655440000",
            url: "https://example.com/new.jpg",
            public_id: "folder/new",
            width: null,
            height: null,
        });
    });

    it("returns 400 for invalid URL", async () => {
        const req = makeRequest("/api/admin/images", "POST", {
            url: "not-a-url",
            public_id: "folder/img",
        });

        const res = await postImage(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("Validation failed");
    });

    it("returns 400 for invalid JSON body", async () => {
        const req = new Request("http://localhost:3000/api/admin/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{invalid json",
        });

        const res = await postImage(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("Invalid JSON body");
    });

    it("returns 409 for duplicate public_id", async () => {
        chainMock.single.mockResolvedValue({
            data: null,
            error: { code: "23505", message: "unique violation" },
        });

        const req = makeRequest("/api/admin/images", "POST", {
            client_id: "550e8400-e29b-41d4-a716-446655440000",
            url: "https://example.com/dup.jpg",
            public_id: "folder/existing",
        });

        const res = await postImage(req);
        const data = await res.json();

        expect(res.status).toBe(409);
        expect(data.error).toContain("already exists");
    });
});

describe("DELETE /api/admin/images/[id]", () => {
    beforeEach(() => {
        chainMock = createChainMock();
        mockFrom.mockReturnValue(chainMock);
    });

    it("returns 400 for invalid UUID", async () => {
        const req = makeRequest("/api/admin/images/not-a-uuid", "DELETE");
        const res = await deleteImage(req, {
            params: Promise.resolve({ id: "not-a-uuid" }),
        });
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("Invalid image ID");
    });

    it("returns 404 when image not found", async () => {
        const validUUID = "550e8400-e29b-41d4-a716-446655440000";
        chainMock.single.mockResolvedValue({
            data: null,
            error: { message: "not found" },
        });

        const req = makeRequest(`/api/admin/images/${validUUID}`, "DELETE");
        const res = await deleteImage(req, {
            params: Promise.resolve({ id: validUUID }),
        });
        const data = await res.json();

        expect(res.status).toBe(404);
        expect(data.error).toBe("Image not found");
    });

    it("deletes successfully and returns ok:true", async () => {
        const validUUID = "550e8400-e29b-41d4-a716-446655440000";

        // First call: fetch image to get public_id
        const fetchChain = createChainMock();
        fetchChain.single.mockResolvedValue({
            data: { id: validUUID, public_id: "folder/img" },
            error: null,
        });

        // Second call: delete from DB
        const deleteChain = createChainMock();
        deleteChain.eq.mockResolvedValue({ error: null });

        let callCount = 0;
        mockFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) return fetchChain;
            return deleteChain;
        });

        const req = makeRequest(`/api/admin/images/${validUUID}`, "DELETE");
        const res = await deleteImage(req, {
            params: Promise.resolve({ id: validUUID }),
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ok).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════════════════

describe("GET /api/admin/settings", () => {
    beforeEach(() => {
        chainMock = createChainMock();
        mockFrom.mockReturnValue(chainMock);
    });

    it("returns settings object on success", async () => {
        const mockSettings = {
            id: 1,
            sphere_color: "#e8a87c",
            floating_text: "Only For U",
            target_name: "Pendek.",
            particle_count: 50,
            updated_at: "2024-01-01",
        };

        chainMock.single.mockResolvedValue({
            data: mockSettings,
            error: null,
        });

        const res = await getSettings();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.settings).toEqual(mockSettings);
    });

    it("returns 500 on Supabase error", async () => {
        chainMock.single.mockResolvedValue({
            data: null,
            error: { message: "DB down" },
        });

        const res = await getSettings();
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe("Failed to fetch settings");
    });
});

describe("PUT /api/admin/settings", () => {
    beforeEach(() => {
        chainMock = createChainMock();
        mockFrom.mockReturnValue(chainMock);
    });

    it("updates settings with valid payload", async () => {
        const updatedSettings = {
            id: 1,
            sphere_color: "#ff5500",
            floating_text: "Love You",
            target_name: "Darling",
            particle_count: 100,
            updated_at: "2024-01-02",
        };

        chainMock.single.mockResolvedValue({
            data: updatedSettings,
            error: null,
        });

        const req = makeRequest("/api/admin/settings", "PUT", {
            sphere_color: "#ff5500",
            floating_text: "Love You",
            target_name: "Darling",
            particle_count: 100,
        });

        const res = await putSettings(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.settings).toEqual(updatedSettings);
    });

    it("returns 400 for invalid hex color", async () => {
        const req = makeRequest("/api/admin/settings", "PUT", {
            sphere_color: "red",
            floating_text: "Love You",
            target_name: "Darling",
            particle_count: 100,
        });

        const res = await putSettings(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("Validation failed");
    });

    it("returns 400 for invalid JSON body", async () => {
        const req = new Request("http://localhost:3000/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: "not json {{",
        });

        const res = await putSettings(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("Invalid JSON body");
    });

    it("returns 400 for out-of-range particle count", async () => {
        const req = makeRequest("/api/admin/settings", "PUT", {
            sphere_color: "#ff5500",
            floating_text: "Love You",
            target_name: "Darling",
            particle_count: 999,
        });

        const res = await putSettings(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("Validation failed");
    });
});
