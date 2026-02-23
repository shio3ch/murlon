import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { entryRepository, projectRepository, reportRepository } from "../../../lib/repositories.ts";
import { generateReportUseCase } from "../../../application/report/generate-report.usecase.ts";
import { getAIProvider } from "../../../infrastructure/ai/index.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse, ReportType } from "../../../lib/types.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: {
      type?: string;
      startDate?: string;
      endDate?: string;
      projectId?: string;
      promptTemplate?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.type || !["DAILY", "WEEKLY", "MONTHLY"].includes(body.type)) {
      return Response.json(
        {
          success: false,
          error: "type は DAILY, WEEKLY, MONTHLY のいずれかを指定してください",
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.startDate || !body.endDate) {
      return Response.json(
        { success: false, error: "startDate と endDate を指定してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const startDate = new Date(body.startDate + "T00:00:00");
    const endDate = new Date(body.endDate + "T23:59:59");

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return Response.json(
        { success: false, error: "日付形式が正しくありません (YYYY-MM-DD)" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const report = await generateReportUseCase(
        {
          reportRepository,
          entryRepository,
          projectRepository,
          aiProvider: getAIProvider(),
        },
        {
          userId: session.userId,
          type: body.type as ReportType,
          startDate,
          endDate,
          projectId: body.projectId,
          promptTemplate: body.promptTemplate,
        },
      );
      return Response.json({ success: true, data: report } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
