import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Cloudinary signed upload — the browser uploads directly to Cloudinary,
// we only sign the request server-side so the API secret never leaks.
// Docs: https://cloudinary.com/documentation/signatures
//
// Body: { folder?: string }
// Returns: { signature, timestamp, apiKey, cloudName, folder }
export async function POST(req: Request) {
  // Auth gate: must be a logged-in admin.
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const folder = typeof body.folder === "string" && body.folder ? `subscribai/${body.folder.replace(/[^a-z0-9_\-/]/gi, "")}` : "subscribai/uploads";

  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary requires params sorted alphabetically when signing.
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
    upload_preset: uploadPreset,
  };
  const sortedKeys = Object.keys(paramsToSign).sort();
  const stringToSign = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join("&");
  const signature = crypto.createHash("sha1").update(stringToSign + apiSecret).digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    uploadPreset,
  });
}
