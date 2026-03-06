import { describe, it, expect } from "vitest";
import {
    clientSlugSchema,
    imagePayloadSchema,
    loginSchema,
    settingsSchema,
} from "@/lib/validators";

// ═══════════════════════════════════════════════════════════════════
// loginSchema
// ═══════════════════════════════════════════════════════════════════

describe("loginSchema", () => {
    it("accepts valid username + password", () => {
        const result = loginSchema.safeParse({
            username: "admin",
            password: "secret123",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.username).toBe("admin");
            expect(result.data.password).toBe("secret123");
        }
    });

    it("rejects empty username", () => {
        const result = loginSchema.safeParse({
            username: "",
            password: "secret123",
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
        const result = loginSchema.safeParse({
            username: "admin",
            password: "",
        });
        expect(result.success).toBe(false);
    });

    it("rejects missing both fields", () => {
        const result = loginSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it("rejects non-string fields", () => {
        const result = loginSchema.safeParse({
            username: 123,
            password: true,
        });
        expect(result.success).toBe(false);
    });

    it("accepts and keeps extra whitespace in values", () => {
        const result = loginSchema.safeParse({
            username: "  admin  ",
            password: "  pass  ",
        });
        expect(result.success).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════
// imagePayloadSchema
// ═══════════════════════════════════════════════════════════════════

describe("imagePayloadSchema", () => {
    it("accepts valid URL + public_id (no optional fields)", () => {
        const result = imagePayloadSchema.safeParse({
            url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            public_id: "romantic-gallery/sample",
        });
        expect(result.success).toBe(true);
    });

    it("accepts valid payload with optional width and height", () => {
        const result = imagePayloadSchema.safeParse({
            client_id: "550e8400-e29b-41d4-a716-446655440000",
            url: "https://example.com/photo.png",
            public_id: "folder/photo",
            width: 1920,
            height: 1080,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.width).toBe(1920);
            expect(result.data.height).toBe(1080);
        }
    });

    it("rejects invalid client_id format", () => {
        const result = imagePayloadSchema.safeParse({
            client_id: "not-a-uuid",
            url: "https://example.com/photo.png",
            public_id: "folder/photo",
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid URL format", () => {
        const result = imagePayloadSchema.safeParse({
            url: "not-a-url",
            public_id: "folder/photo",
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty public_id", () => {
        const result = imagePayloadSchema.safeParse({
            url: "https://example.com/photo.png",
            public_id: "",
        });
        expect(result.success).toBe(false);
    });

    it("rejects negative width", () => {
        const result = imagePayloadSchema.safeParse({
            url: "https://example.com/photo.png",
            public_id: "folder/photo",
            width: -100,
        });
        expect(result.success).toBe(false);
    });

    it("rejects non-integer height", () => {
        const result = imagePayloadSchema.safeParse({
            url: "https://example.com/photo.png",
            public_id: "folder/photo",
            height: 10.5,
        });
        expect(result.success).toBe(false);
    });

    it("rejects zero width", () => {
        const result = imagePayloadSchema.safeParse({
            url: "https://example.com/photo.png",
            public_id: "folder/photo",
            width: 0,
        });
        expect(result.success).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════
// clientSlugSchema
// ═══════════════════════════════════════════════════════════════════

describe("clientSlugSchema", () => {
    it("accepts lowercase kebab-case slugs", () => {
        expect(clientSlugSchema.safeParse("pasangan-demo").success).toBe(true);
    });

    it("rejects uppercase or spaced slugs", () => {
        expect(clientSlugSchema.safeParse("Pasangan Demo").success).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════
// settingsSchema
// ═══════════════════════════════════════════════════════════════════

describe("settingsSchema", () => {
    const validSettings = {
        sphere_color: "#e8a87c",
        floating_text: "Only For U",
        target_name: "My Love",
        particle_count: 50,
    };

    it("accepts valid settings", () => {
        const result = settingsSchema.safeParse(validSettings);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(validSettings);
        }
    });

    it("rejects invalid hex color — named color", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            sphere_color: "red",
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid hex color — wrong chars", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            sphere_color: "#GGGGGG",
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid hex color — 3-char shorthand", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            sphere_color: "#abc",
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid hex color — missing #", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            sphere_color: "e8a87c",
        });
        expect(result.success).toBe(false);
    });

    it("accepts lowercase hex color", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            sphere_color: "#abcdef",
        });
        expect(result.success).toBe(true);
    });

    it("accepts uppercase hex color", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            sphere_color: "#ABCDEF",
        });
        expect(result.success).toBe(true);
    });

    it("rejects empty floating_text", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            floating_text: "",
        });
        expect(result.success).toBe(false);
    });

    it("rejects floating_text exceeding 100 chars", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            floating_text: "a".repeat(101),
        });
        expect(result.success).toBe(false);
    });

    it("accepts floating_text at exactly 100 chars", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            floating_text: "a".repeat(100),
        });
        expect(result.success).toBe(true);
    });

    it("rejects target_name exceeding 50 chars", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            target_name: "b".repeat(51),
        });
        expect(result.success).toBe(false);
    });

    it("accepts target_name at exactly 50 chars", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            target_name: "b".repeat(50),
        });
        expect(result.success).toBe(true);
    });

    it("rejects particle_count of 0", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            particle_count: 0,
        });
        expect(result.success).toBe(false);
    });

    it("rejects particle_count of 501", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            particle_count: 501,
        });
        expect(result.success).toBe(false);
    });

    it("accepts particle_count at boundaries (1 and 500)", () => {
        expect(
            settingsSchema.safeParse({ ...validSettings, particle_count: 1 }).success
        ).toBe(true);
        expect(
            settingsSchema.safeParse({ ...validSettings, particle_count: 500 }).success
        ).toBe(true);
    });

    it("rejects non-integer particle_count", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            particle_count: 50.5,
        });
        expect(result.success).toBe(false);
    });

    it("rejects negative particle_count", () => {
        const result = settingsSchema.safeParse({
            ...validSettings,
            particle_count: -10,
        });
        expect(result.success).toBe(false);
    });
});
