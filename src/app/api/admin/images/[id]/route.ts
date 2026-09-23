import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { imageUpdateSchema } from "@/lib/validators";

/** DELETE /api/admin/images/[id] — remove an image from DB + Cloudinary */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json({ error: "Invalid image ID" }, { status: 400 });
  }

  // Fetch the image first to get the public_id for Cloudinary cleanup
  const supabaseAdmin = getSupabaseAdmin();
  const { data: image, error: fetchError } = await supabaseAdmin
    .from("gallery_images")
    .select("id, public_id")
    .eq("id", id)
    .single();

  if (fetchError || !image) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  // Delete from Cloudinary (best-effort — don't block DB deletion)
  await deleteCloudinaryImage(image.public_id).catch(() => {
    // Log but don't fail if Cloudinary removal fails
    console.warn(`Cloudinary delete failed for ${image.public_id}`);
  });

  // Delete from database
  const { error: deleteError } = await supabaseAdmin
    .from("gallery_images")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return Response.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}

/** PATCH /api/admin/images/[id] — update caption and memory_date for an image */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json({ error: "Invalid image ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = imageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateFields: { caption?: string | null; memory_date?: string | null } = {};
  if (parsed.data.caption !== undefined) {
    updateFields.caption = parsed.data.caption;
  }
  if (parsed.data.memory_date !== undefined) {
    updateFields.memory_date = parsed.data.memory_date;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("gallery_images")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return Response.json(
      { error: "Failed to update image" },
      { status: 500 }
    );
  }

  return Response.json({ image: data });
}
