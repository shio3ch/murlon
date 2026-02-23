import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async DELETE(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: session.userId },
    });

    if (!connection) {
      return Response.json(
        { success: false, error: "GitHub連携が設定されていません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    await prisma.gitHubConnection.delete({
      where: { userId: session.userId },
    });

    return Response.json(
      { success: true } satisfies ApiResponse,
    );
  },
};
