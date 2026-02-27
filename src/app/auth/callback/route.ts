import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Редирект через промежуточную страницу, чтобы браузер успел применить Set-Cookie
      // и следующий запрос уже шёл с сессией (иначе первый заход показывает "не авторизован")
      const completeUrl = `${baseUrl}/auth/complete?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(completeUrl);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`);
}
