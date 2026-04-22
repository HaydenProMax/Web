import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { loadWorkspaceEnv } from "@/server/env";

export type ApiRequestAuth =
  | {
    userId: string;
    authMethod: "session";
  }
  | {
    userId: string;
    authMethod: "apiKey";
  };

function readApiKeyFromRequest(request: Request) {
  const directHeader = request.headers.get("x-api-key")?.trim();
  if (directHeader) {
    return directHeader;
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) {
    return "";
  }

  const [scheme, credential] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "apikey" || !credential) {
    return "";
  }

  return credential.trim();
}

function secretsMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function requireApiSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized"
      },
      { status: 401 }
    );
  }

  return null;
}

function buildUnauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Unauthorized"
    },
    { status: 401 }
  );
}

export async function authenticateApiRequest(request: Request): Promise<ApiRequestAuth | NextResponse> {
  loadWorkspaceEnv();

  const session = await auth();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      authMethod: "session"
    };
  }

  const configuredApiKey = process.env.OPENCLAW_API_KEY?.trim() ?? "";
  const providedApiKey = readApiKeyFromRequest(request);

  if (configuredApiKey && providedApiKey && secretsMatch(configuredApiKey, providedApiKey)) {
    const defaultUserId = process.env.DEFAULT_USER_ID?.trim() ?? "";

    if (!defaultUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "DEFAULT_USER_ID is required for API key requests."
        },
        { status: 500 }
      );
    }

    return {
      userId: defaultUserId,
      authMethod: "apiKey"
    };
  }

  return buildUnauthorizedResponse();
}

export async function requireApiSessionOrKey(request: Request) {
  const result = await authenticateApiRequest(request);

  if (result instanceof NextResponse) {
    return result;
  }

  return null;
}
