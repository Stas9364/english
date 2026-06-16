import { type NextFetchEvent, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/client-ip";
import { updateSession } from "@/lib/supabase/middleware";
import { extractQuizSlug, recordQuizVisit } from "@/lib/visitor-stats-record";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = await updateSession(request);

  const quizSlug = extractQuizSlug(request.nextUrl.pathname);
  if (quizSlug) {
    const ip = getClientIp(request);
    const task = recordQuizVisit(ip, quizSlug);

    if (event?.waitUntil) {
      event.waitUntil(task.catch(console.error));
    } else {
      void task.catch(console.error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
