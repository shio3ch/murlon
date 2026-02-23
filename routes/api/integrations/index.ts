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
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const settings = await prisma.integrationSetting.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    const data: IntegrationSettingData[] = settings.map((s) => ({
      id: s.id,
      userId: s.userId,
      projectId: s.projectId,
      type: s.type as "SLACK" | "DISCORD",
      webhookUrl: s.webhookUrl,
      channelName: s.channelName,
      enabled: s.enabled,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return Response.json(
      { success: true, data } satisfies ApiResponse<IntegrationSettingData[]>,
    );
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    let body: {
      type?: string;
      webhookUrl?: string;
      channelName?: string;
      projectId?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.type || !["SLACK", "DISCORD"].includes(body.type)) {
      return Response.json(
        { success: false, error: "無効な連携タイプです" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const webhookUrl = body.webhookUrl?.trim();
    if (!webhookUrl || !webhookUrl.startsWith("https://")) {
      return Response.json(
        {
          success: false,
          error: "Webhook URLはhttps://から始まる有効なURLを入力してください",
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const setting = await prisma.integrationSetting.create({
      data: {
        userId: session.userId,
        type: body.type as "SLACK" | "DISCORD",
        webhookUrl,
        channelName: body.channelName?.trim() || null,
        projectId: body.projectId || null,
      },
    });

    const data: IntegrationSettingData = {
      id: setting.id,
      userId: setting.userId,
      projectId: setting.projectId,
      type: setting.type as "SLACK" | "DISCORD",
      webhookUrl: setting.webhookUrl,
      channelName: setting.channelName,
      enabled: setting.enabled,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<IntegrationSettingData>,
      { status: 201 },
    );
  },
};
