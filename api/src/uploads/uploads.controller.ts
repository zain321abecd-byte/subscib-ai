import {
  BadRequestException,
  Body,
  Controller,
  PayloadTooLargeException,
  Post,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminGuard } from "../auth/admin.guard";
import { UploadsService } from "./uploads.service";

// Multer file shape (we avoid pulling @types/multer just for this).
type UploadedFileLike = { buffer: Buffer; mimetype: string; originalname: string; size: number };

/**
 * Upload size + type limits enforced at the API boundary before we even
 * touch Cloudinary. Keeping these here (not just in Multer) means the
 * error surfaces as a proper 4xx to the client, not a 500 from downstream.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;                        // 10 MB — Cloudinary free tier is happy up to ~10 MB per image
const ALLOWED_MIMETYPES = new Set([
  "image/jpeg", "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);
const FOLDER_PATTERN = /^[a-z0-9_\-/]{1,64}$/i;                   // storage key — never allow spaces or dots

@Controller("uploads")
@UseGuards(AdminGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** POST /uploads — multipart/form-data with `file` (+ optional `folder`). */
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(@UploadedFile() file: UploadedFileLike, @Body("folder") folder?: string) {
    // 1. File must be present.
    if (!file) {
      throw new BadRequestException("No file was sent. Include a 'file' field in the multipart form-data body.");
    }
    // 2. Buffer must be non-empty (some clients send an empty file input).
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException("Uploaded file is empty.");
    }
    // 3. Size check — Multer's limit interceptor will already reject
    //    anything past MAX_UPLOAD_BYTES, but keep an explicit guard for
    //    clarity + a nicer error message.
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(
        `File is ${Math.round(file.size / 1024)} KB — max upload size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
      );
    }
    // 4. Mimetype allowlist. Cloudinary would accept more, but we don't
    //    want random binaries flowing through the admin uploader.
    const mimetype = (file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIMETYPES.has(mimetype)) {
      throw new UnsupportedMediaTypeException(
        `File type "${file.mimetype || "unknown"}" isn't allowed. Use JPG, PNG, WebP, GIF, SVG, or AVIF.`,
      );
    }
    // 5. Folder — optional, but if provided it must be a clean storage key.
    const cleanFolder = validateFolder(folder);
    return this.uploads.uploadBuffer(file.buffer, mimetype, cleanFolder);
  }

  /** POST /uploads/signature — params for a direct signed browser upload. */
  @Post("signature")
  signature(@Body("folder") folder?: string) {
    return this.uploads.signUpload(validateFolder(folder));
  }
}

/** Enforce the folder-name pattern. Returns a safe default when empty. */
function validateFolder(folder: unknown): string {
  const raw = typeof folder === "string" ? folder.trim() : "";
  if (!raw) return "uploads";
  if (!FOLDER_PATTERN.test(raw)) {
    throw new BadRequestException(
      `Invalid folder name. Use letters, digits, underscore, hyphen, or forward slash (up to 64 chars).`,
    );
  }
  return raw;
}
