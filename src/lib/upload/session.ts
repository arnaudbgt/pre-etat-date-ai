import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { getUploadConfig } from "./config";
import { UPLOAD_SESSION_COOKIE, UUID_PATTERN } from "./constants";

function getSessionSecret() {
  const secret = process.env.UPLOAD_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "UPLOAD_SESSION_SECRET doit contenir au moins 32 caractères.",
    );
  }

  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createUploadSession(projectId: string) {
  const maxAge = getUploadConfig().retentionHours * 60 * 60;
  const expiresAt = Math.floor(Date.now() / 1000) + maxAge;
  const payload = `${projectId}.${expiresAt}`;

  return {
    maxAge,
    value: `${payload}.${sign(payload)}`,
  };
}

export function getUploadSessionProjectId(request: NextRequest) {
  const value = request.cookies.get(UPLOAD_SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  const [projectId, expiresAtRaw, suppliedSignature, ...extra] =
    value.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (
    extra.length > 0 ||
    !projectId ||
    !UUID_PATTERN.test(projectId) ||
    !Number.isInteger(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000) ||
    !suppliedSignature
  ) {
    return null;
  }

  const expectedSignature = sign(`${projectId}.${expiresAt}`);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  return projectId;
}
