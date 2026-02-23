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

    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: session.userId },
    });

    if (!connection) {
      return Response.json(
        {
          success: false,
          error: "Google Calendarの連携が見つかりません",
        } satisfies ApiResponse,
        { status: 404 },
      );
    }

    await prisma.googleCalendarConnection.delete({
      where: { id: connection.id },
    });

    return Response.json(
      { success: true } satisfies ApiResponse,
    );
  },
};
