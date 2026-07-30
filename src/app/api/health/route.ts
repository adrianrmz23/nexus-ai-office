import { hasSupabasePublicConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = hasSupabasePublicConfig();
  return Response.json(
    {
      status: configured ? "ok" : "degraded",
      service: "nexus-ai-office",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      checks: {
        supabasePublicConfig: configured,
        credentialEncryptionKey: Boolean(
          process.env.NEXUS_CREDENTIAL_ENCRYPTION_KEY,
        ),
      },
    },
    {
      status: configured ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
