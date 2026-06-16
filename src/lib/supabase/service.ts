import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null | undefined;

export function getSupabaseServiceKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim() ??
    null
  );
}

function isJwtServiceKey(key: string): boolean {
  return key.startsWith("eyJ");
}

function getServiceKeyKind(key: string): string {
  if (key.startsWith("eyJ")) {
    try {
      const payloadSegment = key.split(".")[1];
      if (!payloadSegment) {
        return "jwt:malformed";
      }
      const payload = JSON.parse(
        Buffer.from(payloadSegment, "base64url").toString("utf8")
      ) as { role?: string };
      return `jwt:${payload.role ?? "unknown-role"}`;
    } catch {
      return "jwt:unparsed";
    }
  }

  if (key.startsWith("sb_secret_")) {
    return "sb_secret";
  }

  if (key.startsWith("sb_publishable_")) {
    return "sb_publishable";
  }

  return "unknown-format";
}

function shouldLogServiceRpc(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VISITOR_STATS_DEBUG === "1"
  );
}

function getSupabaseUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

function validateServiceKey(key: string): string | null {
  if (key.startsWith("sb_publishable_")) {
    return "SUPABASE_SERVICE_ROLE_KEY must be a secret key (sb_secret_...) or legacy service_role JWT, not a publishable key";
  }

  if (key.startsWith("sb_publishable")) {
    return "SUPABASE_SERVICE_ROLE_KEY looks like a publishable key";
  }

  return null;
}

/**
 * Supabase client with elevated key for server-only operations (bypasses RLS).
 * Prefer invokeServiceRpc() for sb_secret_ keys — supabase-js may send them as JWT.
 */
export function createServiceClient(): SupabaseClient | null {
  if (serviceClient !== undefined) {
    return serviceClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseServiceKey();

  if (!url || !key) {
    serviceClient = null;
    return serviceClient;
  }

  const keyError = validateServiceKey(key);
  if (keyError) {
    console.error(`[supabase] ${keyError}`);
    serviceClient = null;
    return serviceClient;
  }

  serviceClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceClient;
}

export async function invokeServiceRpc(
  functionName: string,
  args: Record<string, unknown>
): Promise<{ error: { code?: string; message: string } | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseServiceKey();

  if (!url || !key) {
    return {
      error: {
        message:
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the server",
      },
    };
  }

  const keyError = validateServiceKey(key);
  if (keyError) {
    return { error: { message: keyError } };
  }

  const normalizedUrl = url.replace(/\/+$/, "");
  const authMode = isJwtServiceKey(key) ? "apikey+bearer" : "apikey-only";
  const rpcUrl = `${normalizedUrl}/rest/v1/rpc/${functionName}`;

  if (shouldLogServiceRpc()) {
    console.info("[supabase-rpc] invoke start", {
      functionName,
      host: getSupabaseUrlHost(normalizedUrl),
      keyKind: getServiceKeyKind(key),
      keyLength: key.length,
      authMode,
      argKeys: Object.keys(args),
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key,
  };

  // Legacy JWT service_role keys use Authorization Bearer; sb_secret_ uses apikey only.
  if (isJwtServiceKey(key)) {
    headers.Authorization = `Bearer ${key}`;
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
    });

    if (response.ok) {
      if (shouldLogServiceRpc()) {
        console.info("[supabase-rpc] invoke ok", {
          functionName,
          status: response.status,
          host: getSupabaseUrlHost(normalizedUrl),
          keyKind: getServiceKeyKind(key),
          authMode,
        });
      }
      return { error: null };
    }

    let message = `RPC ${functionName} failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as {
        message?: string;
        hint?: string;
        code?: string;
      };
      if (payload.message) {
        message = payload.message;
      }

      if (shouldLogServiceRpc()) {
        console.error("[supabase-rpc] invoke failed", {
          functionName,
          status: response.status,
          host: getSupabaseUrlHost(normalizedUrl),
          keyKind: getServiceKeyKind(key),
          authMode,
          code: payload.code,
          message: payload.message,
          hint: payload.hint,
        });
      }

      return {
        error: {
          code: payload.code,
          message: payload.hint ? `${message} (${payload.hint})` : message,
        },
      };
    } catch {
      if (shouldLogServiceRpc()) {
        console.error("[supabase-rpc] invoke failed", {
          functionName,
          status: response.status,
          host: getSupabaseUrlHost(normalizedUrl),
          message,
        });
      }
      return { error: { message } };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC request failed";
    if (shouldLogServiceRpc()) {
      console.error("[supabase-rpc] invoke error", {
        functionName,
        host: getSupabaseUrlHost(normalizedUrl),
        message,
      });
    }
    return {
      error: {
        message,
      },
    };
  }
}
