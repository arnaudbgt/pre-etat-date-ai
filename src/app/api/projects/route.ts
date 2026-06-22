import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { UPLOAD_SESSION_COOKIE } from "@/lib/upload/constants";
import { createUploadSession } from "@/lib/upload/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateProjectBody = {
  email?: unknown;
  propertyAddress?: unknown;
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  let body: CreateProjectBody;

  try {
    body = (await request.json()) as CreateProjectBody;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const propertyAddress =
    typeof body.propertyAddress === "string" ? body.propertyAddress.trim() : "";

  if (!isEmail(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Adresse email invalide." },
      { status: 400 },
    );
  }

  if (propertyAddress.length < 5 || propertyAddress.length > 500) {
    return NextResponse.json(
      { error: "Adresse du bien invalide." },
      { status: 400 },
    );
  }

  const projectId = randomUUID();

  try {
    const session = createUploadSession(projectId);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("projects").insert({
      email,
      id: projectId,
      property_address: propertyAddress,
    });

    if (error) {
      console.error("project_create_failed", { code: error.code });
      return NextResponse.json(
        { error: "Impossible de créer le dossier." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ projectId }, { status: 201 });
    response.cookies.set(UPLOAD_SESSION_COOKIE, session.value, {
      httpOnly: true,
      maxAge: session.maxAge,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("project_configuration_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Configuration serveur incomplète." },
      { status: 500 },
    );
  }
}
