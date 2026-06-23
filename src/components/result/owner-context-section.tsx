"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProjectOwnerContext } from "@/lib/owner-context/project-owner-context";

export function OwnerContextSection({
  ownerContext,
  projectId,
}: {
  ownerContext: ProjectOwnerContext | null;
  projectId: string;
}) {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState(ownerContext?.owner_name ?? "");
  const [knownLotNumber, setKnownLotNumber] = useState(
    ownerContext?.known_lot_number ?? "",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function save() {
    setStatus("saving");

    try {
      const response = await fetch(`/api/projects/${projectId}/owner-context`, {
        body: JSON.stringify({
          known_lot_number: knownLotNumber,
          owner_name: ownerName,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("owner_context_save_failed");
      }

      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Propriétaire vendeur</h2>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Ce contexte manuel aide à rattacher les informations du dossier au bon
          copropriétaire. Il n’est jamais écrasé par l’extraction automatique.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-neutral-800">
          <span>Nom du propriétaire</span>
          <input
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal disabled:opacity-60"
            disabled={status === "saving"}
            onChange={(event) => {
              setOwnerName(event.target.value);
              setStatus("idle");
            }}
            placeholder="Jean DUPONT, SCI LES MIMOSAS, Indivision MARTIN"
            value={ownerName}
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-neutral-800">
          <span>Numéro de lot connu, optionnel</span>
          <input
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal disabled:opacity-60"
            disabled={status === "saving"}
            onChange={(event) => {
              setKnownLotNumber(event.target.value);
              setStatus("idle");
            }}
            placeholder="12, 203, A45"
            value={knownLotNumber}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={status === "saving" || ownerName.trim().length === 0}
          onClick={() => void save()}
          type="button"
        >
          {status === "saving" ? "Enregistrement…" : "Enregistrer"}
        </button>
        {status === "saved" ? (
          <p className="text-sm text-emerald-700">Contexte enregistré.</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-700">Enregistrement impossible.</p>
        ) : null}
      </div>
    </section>
  );
}
