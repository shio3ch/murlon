import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import { generateReport } from "../../../lib/ai.ts";
import type { ApiResponse, ReportType } from "../../../lib/types.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, {
        status: 401,
      });
    }

    let body: { type?: string; startDate?: string; endDate?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const { type, startDate: startDateStr, endDate: endDateStr } = body;

    if (!type || !["DAILY", "WEEKLY", "MONTHLY"].includes(type)) {
      return Response.json(
        { success: false, error: "type は DAILY, WEEKLY, MONTHLY のいずれかを指定してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!startDateStr || !endDateStr) {
      return Response.json(
        { success: false, error: "startDate と endDate を指定してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T23:59:59");

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return Response.json(
        { success: false, error: "日付形式が正しくありません (YYYY-MM-DD)" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const entries = await prisma.entry.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: "asc" },
    });

    if (entries.length === 0) {
      return Response.json(
        { success: false, error: "指定した期間に分報がありません" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const reportType = type as ReportType;
    const content = await generateReport(
      entries.map((e) => ({ ...e, createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) })),
      reportType,
      startDate,
      endDate,
    );

    // Upsert report (delete existing and create new)
    const existing = await prisma.report.findFirst({
      where: {
        userId: session.userId,
        type: reportType,
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
    });

    if (existing) {
      await prisma.report.delete({ where: { id: existing.id } });
    }

    const report = await prisma.report.create({
      data: {
        type: reportType,
        content,
        startDate,
        endDate,
        userId: session.userId,
        entries: {
          create: entries.map((e) => ({ entryId: e.id })),
        },
      },
    });

    return Response.json({ success: true, data: report } satisfies ApiResponse, { status: 201 });
  },
};
