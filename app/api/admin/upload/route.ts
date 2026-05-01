import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Server-proxied Cloudinary upload. The admin sends a file as multipart/form-data,
// we verify they're an admin, then forward to Cloudinary using the API secret.
// This avoids any client-side credentials and works with both signed and
// unsigned upload presets.
//
// POST /api/admin/upload
// Body: multipart/form-data with `file` (and optional `folder`)
// Returns: { url: secure_url }
export async function POST(req: Request) {
  // Auth gate.
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cloudinary config check.
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  // The preset is OPTIONAL. Default presets like `ml_default` are unsigned and
  // are incompatible with our signed (server-side) uploads — supplying them
  // can cause Cloudinary to return a URL that 404s. Only honour the env value
  // if the admin has explicitly set a SIGNED preset.
  const upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloud_name || !api_key || !api_secret) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const folderInput = String(formData.get("folder") || "uploads").replace(/[^a-z0-9_\-/]/gi, "");
  const folder = `subscribai/${folderInput || "uploads"}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${(file as any).type || "image/png"};base64,${buf.toString("base64")}`;

  try {
    // Build options conditionally so we don't accidentally pass an unsigned
    // preset (which silently breaks signed uploads).
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: "auto",
    };
    if (upload_preset && upload_preset !== "ml_default") {
      uploadOptions.upload_preset = upload_preset;
    }
    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
    return NextResponse.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed", details: e?.http_code ? `HTTP ${e.http_code}` : undefined },
      { status: 502 },
    );
  }
}
