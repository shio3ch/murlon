import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { entryRepository, projectRepository, standupRepository } from "../../../lib/repositories.ts";
import { generateStandupUseCase } from "../../../application/standup/generate-standup.usecase.ts";
import { getAIProvider } from "../../../infrastructure/ai/index.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const limit = Math.min(
      parseInt(new URL(req.url).searchParams.get("limit") || "10"),
      50,
    );

    const standups = await prisma.standup.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { project: { select: { id: true, name: true } } },
    });

    return Response.json({ success: true, data: standups } satisfies ApiResponse);
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { projectId?: string; date?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const standup = await generateStandupUseCase(
        {
          standupRepository,
          entryRepository,
          projectRepository,
          aiProvider: getAIProvider(),
        },
        { userId: session.userId, projectId: body.projectId, date: body.date },
      );
      return Response.json({ success: true, data: standup } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
