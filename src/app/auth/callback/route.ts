import { NextResponse } from "next/server";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getBaseUrl(request: Request): string {
  // Явный URL продакшена (в Vercel задай NEXT_PUBLIC_APP_URL=https://твой-проект.vercel.app)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");

  // Vercel автоматически задаёт VERCEL_URL (например my-app-xxx.vercel.app)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  const { origin } = new URL(request.url);
  return origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const baseUrl = getBaseUrl(request);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth`);
  }

  const cookieStore = await cookies();
  const capturedCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth`);
  }

  const supabase = createSupabaseServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          capturedCookies.push({ name, value, options });
          try {
            cookieStore.set(name, value, options);
          } catch {
            // ignore
          }
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth`);
  }

  const completeUrl = `${baseUrl}/auth/complete?next=${encodeURIComponent(next)}`;
  const response = NextResponse.redirect(completeUrl);

  // Явно прокидываем cookies в ответ редиректа (на Vercel иначе они могут не попасть в 302)
  capturedCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, (options ?? {}) as Parameters<NextResponse["cookies"]["set"]>[2]);
  });

  return response;
}
