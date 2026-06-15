import { NextResponse } from "next/server";
import { generateQuizPages, type GenerateQuizPagesParams } from "@/app/admin/ai-generate";
import { getIsAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let params: GenerateQuizPagesParams;
  try {
    params = (await request.json()) as GenerateQuizPagesParams;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await generateQuizPages(params, { signal: request.signal });
  return NextResponse.json(result);
}
