import { getSupabase } from "@/lib/supabase";
import { clientSlugSchema } from "@/lib/validators";

const CLIENT_SELECT =
  "id, slug, name, sphere_color, floating_text, target_name, particle_count, music_url, created_at, updated_at";

/** GET /api/clients — list clients or fetch one by slug */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const slugParam = requestUrl.searchParams.get("slug");
  const supabase = getSupabase();

  if (slugParam) {
    const parsedSlug = clientSlugSchema.safeParse(slugParam);
    if (!parsedSlug.success) {
      return Response.json({ error: "Invalid client slug" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_SELECT)
      .eq("slug", parsedSlug.data)
      .single();

    if (error || !data) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    return Response.json({ client: data });
  }

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Failed to fetch clients" }, { status: 500 });
  }

  return Response.json({ clients: data ?? [] });
}