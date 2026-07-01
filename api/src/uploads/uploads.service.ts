import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
import * as crypto from "node:crypto";

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private configured = false;

  private ensureConfigured() {
    // Trim aggressively — Render's dashboard sometimes lets a trailing
    // space slip into a pasted secret, which leaves the string truthy
    // but Cloudinary rejects it with a cryptic auth error.
    const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    const api_key    = (process.env.CLOUDINARY_API_KEY    || "").trim();
    const api_secret = (process.env.CLOUDINARY_API_SECRET || "").trim();

    const missing: string[] = [];
    if (!cloud_name) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!api_key)    missing.push("CLOUDINARY_API_KEY");
    if (!api_secret) missing.push("CLOUDINARY_API_SECRET");
    if (missing.length > 0) {
      this.logger.error(`Cloudinary env missing: ${missing.join(", ")}`);
      throw new ServiceUnavailableException(
        `Cloudinary is not configured. Missing on the backend: ${missing.join(", ")}. ` +
        `Set these in your Render service's environment tab and redeploy.`,
      );
    }
    if (!this.configured) {
      cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
      this.configured = true;
      this.logger.log(`Cloudinary configured (cloud_name=${cloud_name}, api_key=${api_key.slice(0, 4)}…).`);
    }
    return { cloud_name, api_key, api_secret };
  }

  /** Server-proxied upload: forward an in-memory file buffer to Cloudinary. */
  async uploadBuffer(buffer: Buffer, mimetype: string, folderInput: string) {
    this.ensureConfigured();
    const upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
    const cleanFolder = String(folderInput || "uploads").replace(/[^a-z0-9_\-/]/gi, "");
    const folder = `subscribai/${cleanFolder || "uploads"}`;
    const dataUri = `data:${mimetype || "image/png"};base64,${buffer.toString("base64")}`;

    const uploadOptions: Record<string, unknown> = { folder, resource_type: "auto" };
    if (upload_preset && upload_preset !== "ml_default") {
      uploadOptions.upload_preset = upload_preset;
    }

    try {
      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
      return { url: result.secure_url, public_id: result.public_id };
    } catch (e: any) {
      throw new BadRequestException(e?.message || "Upload failed");
    }
  }

  /** Signed-upload params for direct browser → Cloudinary uploads. */
  signUpload(folderInput?: string) {
    const { api_key, cloud_name, api_secret } = this.ensureConfigured();
    const uploadPreset = (process.env.CLOUDINARY_UPLOAD_PRESET || "").trim();
    if (!uploadPreset) {
      throw new ServiceUnavailableException(
        "Cloudinary is not configured. Missing CLOUDINARY_UPLOAD_PRESET on the backend. " +
        "Set it in your Render service's environment tab and redeploy.",
      );
    }

    const folder = folderInput
      ? `subscribai/${String(folderInput).replace(/[^a-z0-9_\-/]/gi, "")}`
      : "subscribai/uploads";

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = { folder, timestamp, upload_preset: uploadPreset };
    const stringToSign = Object.keys(paramsToSign).sort().map((k) => `${k}=${paramsToSign[k]}`).join("&");
    const signature = crypto.createHash("sha1").update(stringToSign + api_secret).digest("hex");

    return { signature, timestamp, apiKey: api_key, cloudName: cloud_name, folder, uploadPreset };
  }
}
