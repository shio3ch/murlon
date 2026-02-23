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

    let body: {
      content?: string;
      projectId?: string | null;
      tension?: number | null;
      templateType?: string | null;
    };
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

    if (body.tension !== undefined && body.tension !== null) {
      if (!Number.isInteger(body.tension) || body.tension < 1 || body.tension > 5) {
        return Response.json(
          {
            success: false,
            error: "テンションは1〜5の整数で指定してください",
          } satisfies ApiResponse,
          { status: 400 },
        );
      }
    }

    const updateData: Record<string, unknown> = { content };
    if ("projectId" in body) {
      updateData.projectId = body.projectId || null;
    }
    if ("tension" in body) {
      updateData.tension = body.tension ?? null;
    }
    if ("templateType" in body) {
      updateData.templateType = body.templateType || null;
    }

    const updated = await prisma.entry.update({
      where: { id },
      data: updateData,
    });

    return Response.json({ success: true, data: updated } satisfies ApiResponse);
  },
};
