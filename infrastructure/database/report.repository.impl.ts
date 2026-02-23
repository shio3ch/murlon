import type { PrismaClient } from "@prisma/client";
import type { Report, ReportType } from "../../domain/report/report.entity.ts";
import type { IReportRepository } from "../../domain/report/report.repository.ts";

function toReport(record: {
  id: string;
  type: string;
  content: string;
  startDate: Date;
  endDate: Date;
  userId: string;
  projectId: string | null;
  promptTemplate: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Report {
  return {
    id: record.id,
    type: record.type as ReportType,
    content: record.content,
    startDate: record.startDate,
    endDate: record.endDate,
    userId: record.userId,
    projectId: record.projectId,
    promptTemplate: record.promptTemplate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findFirst(params: {
    userId: string;
    type: ReportType;
    startDate: Date;
    endDate: Date;
    projectId?: string;
  }): Promise<Report | null> {
    const where: Record<string, unknown> = {
      userId: params.userId,
      type: params.type,
      startDate: { gte: params.startDate },
      endDate: { lte: params.endDate },
    };
    if (params.projectId) where.projectId = params.projectId;

    const record = await this.prisma.report.findFirst({ where });
    return record ? toReport(record) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.report.delete({ where: { id } });
  }

  async save(params: {
    type: ReportType;
    content: string;
    startDate: Date;
    endDate: Date;
    userId: string;
    projectId: string | null;
    promptTemplate: string | null;
    entryIds: string[];
  }): Promise<Report> {
    const record = await this.prisma.report.create({
      data: {
        type: params.type,
        content: params.content,
        startDate: params.startDate,
        endDate: params.endDate,
        userId: params.userId,
        projectId: params.projectId,
        promptTemplate: params.promptTemplate,
        entries: { create: params.entryIds.map((entryId) => ({ entryId })) },
      },
    });
    return toReport(record);
  }
}
