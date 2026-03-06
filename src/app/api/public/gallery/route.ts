import { getSupabase } from "@/lib/supabase";
import { clientSlugSchema } from "@/lib/validators";
import type { ClientRow, GalleryImageRow, SiteSettingsRow } from "@/lib/types";

const DEFAULT_CLIENT_SLUG = "default";

function normalizeLegacySettings(
  settings: Partial<SiteSettingsRow>
): Partial<SiteSettingsRow> {
  if (
    settings.floating_text === "Only For U" &&
    settings.target_name === "My Love"
  ) {
    return { ...settings, target_name: "Pendek." };
  }
  return settings;
}

function toSettingsFromClient(client: ClientRow): Partial<SiteSettingsRow> {
  return normalizeLegacySettings({
    sphere_color: client.sphere_color,
    floating_text: client.floating_text,
    target_name: client.target_name,
    particle_count: client.particle_count,
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const slugParam = requestUrl.searchParams.get("slug") ?? DEFAULT_CLIENT_SLUG;
  const parsedSlug = clientSlugSchema.safeParse(slugParam);

  if (!parsedSlug.success) {
    return Response.json({ error: "Invalid client slug" }, { status: 400 });
  }

  const slug = parsedSlug.data;
  const supabase = getSupabase({ headers: { "x-client-slug": slug } });

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, slug, name, sphere_color, floating_text, target_name, particle_count, music_url, created_at, updated_at"
    )
    .eq("slug", slug)
    .single();

  if (clientError || !client) {
    return Response.json(
      { error: "Client not found" },
      { status: 404 }
    );
  }

  const imagesRes = await supabase
    .from("gallery_images")
    .select("id, client_id, url, public_id, width, height, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  if (imagesRes.error) {
    return Response.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }

  const images: GalleryImageRow[] = imagesRes.data ?? [];
  const settings: Partial<SiteSettingsRow> = toSettingsFromClient(client);

  return Response.json({ client, images, settings });
}
