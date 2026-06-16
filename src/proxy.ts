import { ipAddress } from "@vercel/functions";
import { type NextFetchEvent, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { extractQuizSlug, recordQuizVisit } from "@/lib/visitor-stats";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = await updateSession(request);

  const quizSlug = extractQuizSlug(request.nextUrl.pathname);
  if (quizSlug) {
    const ip = ipAddress(request);
    event.waitUntil(recordQuizVisit(ip ?? "", quizSlug).catch(console.error));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
