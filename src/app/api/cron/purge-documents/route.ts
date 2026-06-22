import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUploadConfig } from "@/lib/upload/config";
import { SOURCE_DOCUMENTS_BUCKET } from "@/lib/upload/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET absent." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { purgeBatchSize } = getUploadConfig();
  const { data: documents, error: selectionError } = await supabase
    .from("documents")
    .select("id, storage_path")
    .is("deleted_at", null)
    .not("auto_delete_after", "is", null)
    .lte("auto_delete_after", now)
    .order("auto_delete_after", { ascending: true })
    .limit(purgeBatchSize);

  if (selectionError) {
    console.error("purge_selection_failed", { code: selectionError.code });
    return NextResponse.json(
      { error: "Impossible de sélectionner les documents." },
      { status: 500 },
    );
  }

  let deleted = 0;
  let failures = 0;

  for (const document of documents) {
    if (document.storage_path) {
      const { error: removalError } = await supabase.storage
        .from(SOURCE_DOCUMENTS_BUCKET)
        .remove([document.storage_path]);

      if (removalError) {
        failures += 1;
        console.error("purge_storage_removal_failed", {
          documentId: document.id,
          message: removalError.message,
        });
        continue;
      }
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("documents")
      .update({
        deleted_at: now,
        deleted_reason: "retention_expired",
        error_message: null,
        processing_status: "deleted",
        storage_path: null,
      })
      .eq("id", document.id)
      .is("deleted_at", null)
      .lte("auto_delete_after", now)
      .select("id");

    if (updateError) {
      failures += 1;
      console.error("purge_document_update_failed", {
        code: updateError.code,
        documentId: document.id,
      });
      continue;
    }

    deleted += updatedRows.length;
  }

  return NextResponse.json({
    deleted,
    examined: documents.length,
    failures,
  });
}
