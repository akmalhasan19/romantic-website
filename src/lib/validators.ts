import { z } from "zod";

export const clientSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(100, "Slug is too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug format is invalid");

export const clientIdSchema = z.string().uuid("Client ID must be a valid UUID");

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
});

export const settingsSchema = z.object({
  sphere_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
  floating_text: z.string().min(1).max(100),
  target_name: z.string().min(1).max(50),
  particle_count: z.number().int().min(1).max(500),
});

export type LoginPayload = z.infer<typeof loginSchema>;
export type ImagePayload = z.infer<typeof imagePayloadSchema>;
export type SettingsPayload = z.infer<typeof settingsSchema>;
export type ClientSlug = z.infer<typeof clientSlugSchema>;
export type ClientId = z.infer<typeof clientIdSchema>;
