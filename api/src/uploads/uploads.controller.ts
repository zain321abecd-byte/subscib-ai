import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminGuard } from "../auth/admin.guard";
import { UploadsService } from "./uploads.service";

// Multer file shape (we avoid pulling @types/multer just for this).
type UploadedFileLike = { buffer: Buffer; mimetype: string; originalname: string };

@Controller("uploads")
@UseGuards(AdminGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** POST /uploads — multipart/form-data with `file` (+ optional `folder`). */
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async upload(@UploadedFile() file: UploadedFileLike, @Body("folder") folder?: string) {
    if (!file) throw new BadRequestException("Missing file");
    return this.uploads.uploadBuffer(file.buffer, file.mimetype, folder || "uploads");
  }

  /** POST /uploads/signature — params for a direct signed browser upload. */
  @Post("signature")
  signature(@Body("folder") folder?: string) {
    return this.uploads.signUpload(folder);
  }
}
