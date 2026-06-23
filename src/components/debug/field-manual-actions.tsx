"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Json } from "@/types/database.types";

function displayValue(value: Json | null, normalizedValue: string | null) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return normalizedValue ?? "";
}

export function FieldManualActions({
  fieldId,
  normalizedValue,
  projectId,
  value,
}: {
  fieldId: string;
  normalizedValue: string | null;
  projectId: string;
  value: Json | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue(value, normalizedValue));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function post(action: "update" | "validate", body?: unknown) {
    setStatus("saving");

    try {
      const response = await fetch(
        `/api/projects/${projectId}/fields/${fieldId}/${action}`,
        {
          body: body ? JSON.stringify(body) : undefined,
          headers: body ? { "content-type": "application/json" } : undefined,
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("manual_field_action_failed");
      }

      setIsEditing(false);
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <input
          className="w-56 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          disabled={status === "saving"}
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />
        <div className="flex gap-2">
          <button
            className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            disabled={status === "saving" || draft.trim().length === 0}
            onClick={() =>
              void post("update", { status: "confirmed", value: draft })
            }
            type="button"
          >
            Enregistrer
          </button>
          <button
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
            disabled={status === "saving"}
            onClick={() => {
              setDraft(displayValue(value, normalizedValue));
              setIsEditing(false);
              setStatus("idle");
            }}
            type="button"
          >
            Annuler
          </button>
        </div>
        {status === "error" ? (
          <p className="text-xs text-red-700">Mise à jour impossible.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
        disabled={status === "saving"}
        onClick={() => setIsEditing(true)}
        type="button"
      >
        Modifier
      </button>
      <button
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
        disabled={status === "saving"}
        onClick={() => void post("validate")}
        type="button"
      >
        Valider
      </button>
      {status === "error" ? (
        <p className="text-xs text-red-700">Action impossible.</p>
      ) : null}
    </div>
  );
}
