import { NextResponse } from "next/server";
import { UUID_REGEX, getConfig, getProviderMode, isPublicHttpUrl } from "@/lib/sahulatpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  const merchantId = config.merchantId || "";
  const apiKey = config.apiKey || "";
  const configured = config.missing.length === 0 && config.invalid.length === 0;

  return NextResponse.json({
    success: true,
    sahulatPayConfigured: configured,
    missing: config.missing,
    invalid: config.invalid,
    merchantIdLength: merchantId.length,
    merchantIdLooksLikeUuid: UUID_REGEX.test(merchantId),
    apiKeyPresent: Boolean(apiKey),
    masterSecretPresent: Boolean(config.masterSecret),
    baseUrlHost: config.baseUrl.replace(/^https?:\/\//, ""),
    siteUrl: config.siteUrl || null,
    siteUrlPublic: isPublicHttpUrl(config.siteUrl),
    walletModes: {
      jazzcash: getProviderMode("jazzcash"),
      easypaisa: getProviderMode("easypaisa"),
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Methods": "GET,OPTIONS" },
  });
}
