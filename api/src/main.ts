import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  // CORS: allow the Vercel frontend origin(s). Comma-separated list in
  // FRONTEND_ORIGIN, e.g. "https://subscribai.vercel.app,http://localhost:3001".
  const originsRaw = config.get<string>("FRONTEND_ORIGIN", "http://localhost:3001");
  const allowedOrigins = originsRaw.split(",").map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global input validation — DTOs with class-validator decorators get enforced
  // automatically. Strips unknown properties so clients can't smuggle fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Render injects PORT. Default 4000 for local dev.
  const port = Number(config.get<string>("PORT", "4000"));
  await app.listen(port, "0.0.0.0");
  logger.log(`SubscribAI API listening on :${port}`);
  logger.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
}

bootstrap();
