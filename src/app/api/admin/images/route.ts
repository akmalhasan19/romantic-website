import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientIdSchema, clientSlugSchema, imagePayloadSchema } from "@/lib/validators";

const DEFAULT_CLIENT_SLUG = "default";

async function resolveClientIdFromSlug(slug: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return { error: "Client not found" as const, client: null };
  }

  return { error: null, client: data };
}

async function resolveTargetClientId(clientId?: string) {
  if (clientId) {
    return { error: null, clientId };
  }

  const defaultClient = await resolveClientIdFromSlug(DEFAULT_CLIENT_SLUG);
  if (defaultClient.error || !defaultClient.client) {
    return {
      error: "Default client is not configured. Run supabase/seed.sql first.",
      clientId: null,
    };
  }

  return { error: null, clientId: defaultClient.client.id };
}

/** GET /api/admin/images — list all gallery images (admin view) */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slugParam = url.searchParams.get("slug");
  const clientIdParam = url.searchParams.get("client_id");

  let clientId: string | null = null;

  if (slugParam) {
    const parsedSlug = clientSlugSchema.safeParse(slugParam);
    if (!parsedSlug.success) {
      return Response.json({ error: "Invalid client slug" }, { status: 400 });
    }

    const clientResult = await resolveClientIdFromSlug(parsedSlug.data);
    if (clientResult.error || !clientResult.client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    clientId = clientResult.client.id;
  } else if (clientIdParam) {
    const parsedClientId = clientIdSchema.safeParse(clientIdParam);
    if (!parsedClientId.success) {
      return Response.json({ error: "Invalid client ID" }, { status: 400 });
    }
    clientId = parsedClientId.data;
  }

  let query = getSupabaseAdmin().from("gallery_images").select("*");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }

  return Response.json({ images: data });
}

/** POST /api/admin/images — add a new gallery image after Cloudinary upload */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = imagePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { client_id, url, public_id, width, height } = parsed.data;

  const targetClient = await resolveTargetClientId(client_id);
  if (targetClient.error || !targetClient.clientId) {
    return Response.json({ error: targetClient.error }, { status: 500 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("gallery_images")
    .insert({
      client_id: targetClient.clientId,
      url,
      public_id,
      width: width ?? null,
      height: height ?? null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation on public_id
    if (error.code === "23505") {
      return Response.json(
        { error: "Image with this public_id already exists for this client" },
        { status: 409 }
      );
    }
    return Response.json(
      { error: "Failed to save image" },
      { status: 500 }
    );
  }

  return Response.json({ image: data }, { status: 201 });
}
