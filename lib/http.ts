import { DomainError } from "../domain/shared/domain-error.ts";
import type { ApiResponse } from "./types.ts";

export function unauthorized(): Response {
  return Response.json(
    { success: false, error: "認証が必要です" } satisfies ApiResponse,
    { status: 401 },
  );
}

export function domainErrorResponse(e: DomainError): Response {
  const status = (() => {
    switch (e.code) {
      case "NOT_FOUND": return 404;
      case "FORBIDDEN": return 403;
      case "CONFLICT": return 409;
      default: return 400;
    }
  })();
  return Response.json({ success: false, error: e.message } satisfies ApiResponse, { status });
}
