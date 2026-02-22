import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, {
        status: 401,
      });
    }

    const { id } = ctx.params;

    const entry = await prisma.entry.findUnique({ where: { id } });
    if (!entry) {
      return Response.json(
        { success: false, error: "分報が見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (entry.userId !== session.userId) {
      return Response.json({ success: false, error: "Forbidden" } satisfies ApiResponse, {
        status: 403,
      });
    }

    await prisma.entry.delete({ where: { id } });

    return Response.json({ success: true } satisfies ApiResponse);
  },

  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, {
        status: 401,
      });
    }

    const { id } = ctx.params;

    const entry = await prisma.entry.findUnique({ where: { id } });
    if (!entry) {
      return Response.json(
        { success: false, error: "分報が見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (entry.userId !== session.userId) {
      return Response.json({ success: false, error: "Forbidden" } satisfies ApiResponse, {
        status: 403,
      });
    }

    let body: { content?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const content = body.content?.trim();
    if (!content) {
      return Response.json(
        { success: false, error: "内容を入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const updated = await prisma.entry.update({
      where: { id },
      data: { content },
    });

    return Response.json({ success: true, data: updated } satisfies ApiResponse);
  },
};
