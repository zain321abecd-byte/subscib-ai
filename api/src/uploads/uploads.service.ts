import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
import * as crypto from "node:crypto";

@Injectable()
export class UploadsService {
  private configured = false;

  private ensureConfigured() {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud_name || !api_key || !api_secret) {
      throw new ServiceUnavailableException("Cloudinary is not configured.");
    }
    if (!this.configured) {
      cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
      this.configured = true;
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
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!uploadPreset) throw new ServiceUnavailableException("Cloudinary is not configured.");

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
