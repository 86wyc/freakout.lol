import { headers } from "next/headers";

const LOCAL_APP_URL = "https://localhost:3000";

function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(withProtocol(value.trim())).origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export async function getRequestAppUrl(): Promise<string> {
  const headersList = await headers();
  const forwardedHost =
    firstHeaderValue(headersList.get("x-forwarded-host")) ??
    firstHeaderValue(headersList.get("host"));

  if (forwardedHost) {
    const forwardedProto =
      firstHeaderValue(headersList.get("x-forwarded-proto")) ?? "https";
    const requestOrigin = normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
    if (requestOrigin) return requestOrigin;
  }

  return getConfiguredAppUrl();
}

export function getConfiguredAppUrl(): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeOrigin(process.env.VERCEL_URL) ??
    normalizeOrigin(process.env.AUTH_URL) ??
    LOCAL_APP_URL
  );
}
