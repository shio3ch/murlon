import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { entryRepository, projectRepository } from "../../../lib/repositories.ts";
import { createEntryUseCase } from "../../../application/entry/create-entry.usecase.ts";
import { listEntriesUseCase } from "../../../application/entry/list-entries.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const url = new URL(req.url);
    const entries = await listEntriesUseCase(
      { entryRepository },
      {
        userId: session.userId,
        limit: Math.min(parseInt(url.searchParams.get("limit") || "50"), 100),
        cursor: url.searchParams.get("cursor") || undefined,
        date: url.searchParams.get("date") || undefined,
        projectId: url.searchParams.get("projectId") || undefined,
        orderBy: "desc",
      },
    );

    return Response.json({ success: true, data: entries } satisfies ApiResponse);
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { content?: string; projectId?: string; tension?: number; templateType?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const entry = await createEntryUseCase(
        { entryRepository, projectRepository },
        { content: body.content ?? "", ...body, userId: session.userId },
      );
      return Response.json({ success: true, data: entry } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
