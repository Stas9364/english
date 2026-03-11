import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function getBaseUrl(request: Request): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) return appUrl;
  return new URL(request.url).origin.replace(/\/$/, "");
}

function normalizeNext(next: string | null): string {
  if (!next) return "/";
  // only allow internal redirects
  return next.startsWith("/") ? next : "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = normalizeNext(searchParams.get("next"));
  const baseUrl = getBaseUrl(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !key) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth`);
  }

  if (code) {
    // Важно: cookies должны быть установлены именно на redirect-response.
    const redirectUrl = `${baseUrl}${next}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`);
}
