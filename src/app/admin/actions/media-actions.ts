"use server";

import { getIsAdmin } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getStoragePathFromPublicUrl,
  IMAGES_BUCKET,
  revalidateAdminPathsForQuizId,
} from "./shared";

/**
 * Upload an image to Storage and return its public URL for use in theory_blocks.
 * FormData must contain: file (File). Optional: quizId (string) for path grouping.
 */
export async function uploadTheoryImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0)
    return { ok: false, error: "No file provided" };

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.type))
    return { ok: false, error: "Allowed types: JPEG, PNG, GIF, WebP" };

  const supabase = await createServerClient();
  const quizId = (formData.get("quizId") as string)?.trim() || "draft";
  const folder = (formData.get("folder") as string | null)?.trim() || "theory";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
  const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : ".jpg";
  const path = `${folder}/${quizId}/${crypto.randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  return { ok: true, url: publicUrl };
}

/** Delete one theory block (and its Storage file if image). Immediate delete. */
export async function deleteTheoryBlock(
  blockId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: block, error: fetchErr } = await supabase
    .from("theory_blocks")
    .select("id, quiz_id, type, content")
    .eq("id", blockId)
    .single();

  if (fetchErr || !block) return { ok: false, error: fetchErr?.message ?? "Block not found" };

  if (block.type === "image" && block.content) {
    const path = getStoragePathFromPublicUrl(block.content, IMAGES_BUCKET);
    if (path) {
      const { error: storageErr } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
  }

  const { error: del } = await supabase.from("theory_blocks").delete().eq("id", blockId);
  if (del) return { ok: false, error: del.message };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/quiz/${block.quiz_id}`);
  await revalidateAdminPathsForQuizId(supabase, block.quiz_id);
  return { ok: true };
}

/** Remove only question image (db field + storage file). Immediate update. */
export async function deleteQuestionImage(
  questionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select("id, page_id, question_image_url")
    .eq("id", questionId)
    .single();

  if (qErr || !q) return { ok: false, error: qErr?.message ?? "Question not found" };

  let quizId: string | null = null;
  if (q.page_id) {
    const { data: p } = await supabase
      .from("quiz_pages")
      .select("quiz_id")
      .eq("id", q.page_id)
      .single();
    quizId = p?.quiz_id ?? null;
  }

  if (q.question_image_url) {
    const path = getStoragePathFromPublicUrl(q.question_image_url, IMAGES_BUCKET);
    if (path) {
      const { error: storageErr } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
  }

  const { error: upErr } = await supabase
    .from("questions")
    .update({ question_image_url: null })
    .eq("id", questionId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/");
  revalidatePath("/admin");
  if (quizId) {
    revalidatePath(`/admin/quiz/${quizId}`);
    await revalidateAdminPathsForQuizId(supabase, quizId);
  }
  return { ok: true };
}
