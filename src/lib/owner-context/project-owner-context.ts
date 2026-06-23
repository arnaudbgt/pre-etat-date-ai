import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProjectOwnerContext = {
  known_lot_number: string | null;
  owner_name: string;
  project_id: string;
};

export type OwnerContextPayload = {
  known_lot_number?: unknown;
  owner_name?: unknown;
};

export function normalizeOwnerContextPayload(payload: OwnerContextPayload) {
  if (typeof payload.owner_name !== "string") {
    return null;
  }

  const ownerName = payload.owner_name.replace(/\s+/g, " ").trim();
  const knownLotNumber =
    typeof payload.known_lot_number === "string"
      ? payload.known_lot_number.replace(/\s+/g, " ").trim()
      : "";

  if (!ownerName) {
    return null;
  }

  return {
    known_lot_number: knownLotNumber || null,
    owner_name: ownerName,
  };
}

export async function getProjectOwnerContext(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_owner_context")
    .select("project_id, owner_name, known_lot_number")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`owner_context_read:${error.code}`);
  }

  return data satisfies ProjectOwnerContext | null;
}

export async function upsertProjectOwnerContext(input: {
  knownLotNumber: string | null;
  ownerName: string;
  projectId: string;
}) {
  const supabase = getSupabaseAdmin();
  const projectResult = await supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectResult.error) {
    throw new Error(`owner_context_project:${projectResult.error.code}`);
  }

  if (!projectResult.data) {
    throw new Error("owner_context_project:not_found");
  }

  const { data, error } = await supabase
    .from("project_owner_context")
    .upsert(
      {
        known_lot_number: input.knownLotNumber,
        owner_name: input.ownerName,
        project_id: input.projectId,
      },
      { onConflict: "project_id" },
    )
    .select("project_id, owner_name, known_lot_number")
    .single();

  if (error) {
    throw new Error(`owner_context_upsert:${error.code}`);
  }

  return data satisfies ProjectOwnerContext;
}
