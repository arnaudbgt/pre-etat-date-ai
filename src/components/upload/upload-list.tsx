import { CheckCircle2, CircleAlert, Clock3, LoaderCircle } from "lucide-react";

export type UploadEntry = {
  error?: string;
  id: string;
  name: string;
  status: "pending" | "uploading" | "uploaded" | "failed";
};

const statusLabels: Record<UploadEntry["status"], string> = {
  failed: "Échec",
  pending: "En attente",
  uploaded: "Envoyé",
  uploading: "Envoi…",
};

function StatusIcon({ status }: { status: UploadEntry["status"] }) {
  if (status === "uploaded") {
    return <CheckCircle2 aria-hidden className="size-5 text-green-700" />;
  }

  if (status === "failed") {
    return <CircleAlert aria-hidden className="size-5 text-red-700" />;
  }

  if (status === "uploading") {
    return (
      <LoaderCircle
        aria-hidden
        className="size-5 animate-spin text-neutral-700"
      />
    );
  }

  return <Clock3 aria-hidden className="size-5 text-neutral-500" />;
}

export function UploadList({ entries }: { entries: UploadEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
      {entries.map((entry) => (
        <li className="flex items-start gap-3 p-4" key={entry.id}>
          <StatusIcon status={entry.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{entry.name}</p>
            <p
              className={
                entry.status === "failed"
                  ? "text-sm text-red-700"
                  : "text-sm text-neutral-500"
              }
            >
              {entry.error ?? statusLabels[entry.status]}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
