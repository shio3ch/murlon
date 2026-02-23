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

    const standup = await prisma.standup.findUnique({ where: { id } });
    if (!standup) {
      return Response.json(
        { success: false, error: "スタンドアップが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (standup.userId !== session.userId) {
      return Response.json({ success: false, error: "Forbidden" } satisfies ApiResponse, {
        status: 403,
      });
    }

    await prisma.standup.delete({ where: { id } });

    return Response.json({ success: true } satisfies ApiResponse);
  },
};
