import type { PrismaClient } from "@prisma/client";
import type { ReportTemplate } from "../../domain/template/template.entity.ts";
import type { ITemplateRepository } from "../../domain/template/template.repository.ts";
import type { ReportType } from "../../domain/report/report.entity.ts";

function toTemplate(record: {
  id: string;
  userId: string | null;
  name: string;
  type: string;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
}): ReportTemplate {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    type: record.type as ReportType,
    prompt: record.prompt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaTemplateRepository implements ITemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<ReportTemplate[]> {
    const records = await this.prisma.reportTemplate.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toTemplate);
  }

  async findById(id: string): Promise<ReportTemplate | null> {
    const record = await this.prisma.reportTemplate.findUnique({ where: { id } });
    return record ? toTemplate(record) : null;
  }

  async save(params: {
    userId: string | null;
    name: string;
    type: ReportType;
    prompt: string;
  }): Promise<ReportTemplate> {
    const record = await this.prisma.reportTemplate.create({ data: params });
    return toTemplate(record);
  }

  async update(
    id: string,
    params: { name?: string; type?: ReportType; prompt?: string },
  ): Promise<ReportTemplate> {
    const record = await this.prisma.reportTemplate.update({ where: { id }, data: params });
    return toTemplate(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reportTemplate.delete({ where: { id } });
  }
}
