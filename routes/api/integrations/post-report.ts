import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import { postToDiscord, postToSlack } from "../../../lib/integrations.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    let body: { reportId?: string; integrationId?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.reportId || !body.integrationId) {
      return Response.json(
        {
          success: false,
          error: "reportIdとintegrationIdが必要です",
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: body.reportId },
    });

    if (!report) {
      return Response.json(
        { success: false, error: "レポートが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (report.userId !== session.userId) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    const setting = await prisma.integrationSetting.findUnique({
      where: { id: body.integrationId },
    });

    if (!setting) {
      return Response.json(
        { success: false, error: "連携設定が見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (setting.userId !== session.userId) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    try {
      if (setting.type === "SLACK") {
        await postToSlack(setting.webhookUrl, report.content);
      } else {
        await postToDiscord(setting.webhookUrl, report.content);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "送信に失敗しました";
      return Response.json(
        { success: false, error: message } satisfies ApiResponse,
        { status: 502 },
      );
    }

    return Response.json(
      {
        success: true,
        data: { message: "レポートを送信しました" },
      } satisfies ApiResponse<{ message: string }>,
    );
  },
};
