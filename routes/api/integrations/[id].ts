import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse } from "../../../lib/types.ts";

interface IntegrationSettingData {
  id: string;
  userId: string;
  projectId: string | null;
  type: "SLACK" | "DISCORD";
  webhookUrl: string;
  channelName: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const handler: Handlers = {
  async PUT(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const existing = await prisma.integrationSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json(
        { success: false, error: "連携設定が見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (existing.userId !== session.userId) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    let body: {
      enabled?: boolean;
      webhookUrl?: string;
      channelName?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.enabled !== undefined) {
      updateData.enabled = body.enabled;
    }

    if (body.webhookUrl !== undefined) {
      const webhookUrl = body.webhookUrl.trim();
      if (!webhookUrl.startsWith("https://")) {
        return Response.json(
          {
            success: false,
            error: "Webhook URLはhttps://から始まる有効なURLを入力してください",
          } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.webhookUrl = webhookUrl;
    }

    if (body.channelName !== undefined) {
      updateData.channelName = body.channelName.trim() || null;
    }

    const updated = await prisma.integrationSetting.update({
      where: { id },
      data: updateData,
    });

    const data: IntegrationSettingData = {
      id: updated.id,
      userId: updated.userId,
      projectId: updated.projectId,
      type: updated.type as "SLACK" | "DISCORD",
      webhookUrl: updated.webhookUrl,
      channelName: updated.channelName,
      enabled: updated.enabled,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<IntegrationSettingData>,
    );
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const existing = await prisma.integrationSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json(
        { success: false, error: "連携設定が見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (existing.userId !== session.userId) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    await prisma.integrationSetting.delete({ where: { id } });

    return Response.json({ success: true } satisfies ApiResponse);
  },
};
