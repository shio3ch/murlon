import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return Response.json(
        { success: false, error: "コメントが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (comment.userId !== session.userId) {
      return Response.json(
        { success: false, error: "自分のコメントのみ削除できます" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    await prisma.comment.delete({ where: { id } });

    return Response.json({ success: true } satisfies ApiResponse);
  },
};
