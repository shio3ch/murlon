import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { templateRepository } from "../../../lib/repositories.ts";
import { createTemplateUseCase } from "../../../application/template/create-template.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse, ReportType } from "../../../lib/types.ts";

const PRESET_TEMPLATES = [
  {
    id: "preset-simple-daily",
    userId: null,
    name: "シンプル日報",
    type: "DAILY" as ReportType,
    prompt: "以下の分報を元に、シンプルな日報を作成してください。\n\n" +
      "【フォーマット】\n## やったこと\n- ...\n\n## 明日の予定\n- ...",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-scrum-daily",
    userId: null,
    name: "Scrum形式",
    type: "DAILY" as ReportType,
    prompt: "以下の分報を元に、Scrum形式の日報を作成してください。\n\n" +
      "【フォーマット】\n## 昨日やったこと\n- ...\n\n## 今日やること\n- ...\n\n## ブロッカー\n- ...",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-kpt-daily",
    userId: null,
    name: "KPT形式",
    type: "DAILY" as ReportType,
    prompt: "以下の分報を元に、KPT形式の日報を作成してください。\n\n" +
      "【フォーマット】\n## Keep（続けること）\n- ...\n\n## Problem（課題）\n- ...\n\n## Try（試すこと）\n- ...",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const userTemplates = await templateRepository.findByUserId(session.userId);
    const data = [
      ...PRESET_TEMPLATES,
      ...userTemplates.filter((t) => t.userId !== null),
    ];

    return Response.json({ success: true, data } satisfies ApiResponse);
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { name?: string; type?: string; prompt?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const template = await createTemplateUseCase(
        { templateRepository },
        { userId: session.userId, ...body },
      );
      return Response.json({ success: true, data: template } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
