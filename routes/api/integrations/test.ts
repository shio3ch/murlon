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

    let body: { id?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.id) {
      return Response.json(
        { success: false, error: "連携設定IDが必要です" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const setting = await prisma.integrationSetting.findUnique({
      where: { id: body.id },
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

    const testMessage = "murlon テスト投稿 - 接続確認";

    try {
      if (setting.type === "SLACK") {
        await postToSlack(setting.webhookUrl, testMessage);
      } else {
        await postToDiscord(setting.webhookUrl, testMessage);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "送信に失敗しました";
      return Response.json(
        { success: false, error: message } satisfies ApiResponse,
        { status: 502 },
      );
    }

    return Response.json(
      { success: true, data: { message: "テスト送信が成功しました" } } satisfies ApiResponse<
        { message: string }
      >,
    );
  },
};
