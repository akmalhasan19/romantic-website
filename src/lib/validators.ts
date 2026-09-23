import { z } from "zod";

function isValidMusicUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const clientSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(100, "Slug is too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug format is invalid");

export const clientIdSchema = z.string().uuid("Client ID must be a valid UUID");

export const musicUrlSchema = z
  .string()
  .trim()
  .max(500, "Music URL is too long")
  .refine(isValidMusicUrl, "Must be a valid absolute URL or site-relative path");

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const imagePayloadSchema = z.object({
  client_id: clientIdSchema.optional(),
  url: z.string().url("Must be a valid URL"),
  public_id: z.string().min(1, "Public ID is required"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  caption: z.string().max(500, "Caption is too long").optional().nullable(),
  memory_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
    .optional()
    .nullable(),
});

export const imageUpdateSchema = z.object({
  caption: z.string().max(500, "Caption is too long").optional().nullable(),
  memory_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
    .optional()
    .nullable(),
});

export const settingsSchema = z.object({
  sphere_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
  floating_text: z.string().min(1).max(100),
  target_name: z.string().min(1).max(50),
  particle_count: z.number().int().min(1).max(500),
  music_url: musicUrlSchema.optional(),
});

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(100),
  slug: z.string().trim().max(100).optional(),
});

export type LoginPayload = z.infer<typeof loginSchema>;
export type ImagePayload = z.infer<typeof imagePayloadSchema>;
export type ImageUpdatePayload = z.infer<typeof imageUpdateSchema>;
export type SettingsPayload = z.infer<typeof settingsSchema>;
export type ClientSlug = z.infer<typeof clientSlugSchema>;
export type ClientId = z.infer<typeof clientIdSchema>;
export type ClientCreatePayload = z.infer<typeof clientCreateSchema>;
