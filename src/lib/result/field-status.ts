import type { Database } from "@/types/database.types";

type FieldStatus = Database["public"]["Enums"]["field_status"];

export function fieldStatusLabel(status: FieldStatus) {
  if (status === "confirmed") {
    return "Confirmé";
  }

  if (status === "uncertain") {
    return "À vérifier";
  }

  if (status === "inconsistent") {
    return "Incohérent";
  }

  return "Manquant";
}

export function fieldStatusTone(status: FieldStatus) {
  if (status === "confirmed") {
    return "green";
  }

  if (status === "uncertain") {
    return "amber";
  }

  if (status === "inconsistent") {
    return "red";
  }

  return "neutral";
}
