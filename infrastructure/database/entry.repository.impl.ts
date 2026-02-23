import type { PrismaClient } from "@prisma/client";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { FindEntriesOptions, IEntryRepository } from "../../domain/entry/entry.repository.ts";

function toEntry(record: {
  id: string;
  content: string;
  userId: string;
  projectId: string | null;
  taskId: string | null;
  tension: number | null;
  templateType: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Entry {
  return {
    id: record.id,
    content: record.content,
    userId: record.userId,
    projectId: record.projectId,
    taskId: record.taskId,
    tension: record.tension,
    templateType: record.templateType,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaEntryRepository implements IEntryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Entry | null> {
    const record = await this.prisma.entry.findUnique({ where: { id } });
    return record ? toEntry(record) : null;
  }

  async findByUserId(userId: string, options: FindEntriesOptions = {}): Promise<Entry[]> {
    const { limit = 50, cursor, date, dateRange, projectId, orderBy = "desc" } = options;

    const where: Record<string, unknown> = { userId };

    if (date) {
      where.createdAt = {
        gte: new Date(date + "T00:00:00"),
        lte: new Date(date + "T23:59:59"),
      };
    } else if (dateRange) {
      where.createdAt = { gte: dateRange.from, lte: dateRange.to };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const records = await this.prisma.entry.findMany({
      where,
      orderBy: { createdAt: orderBy },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return records.map(toEntry);
  }

  async save(entry: Entry): Promise<Entry> {
    const record = await this.prisma.entry.create({
      data: {
        id: entry.id,
        content: entry.content,
        userId: entry.userId,
        projectId: entry.projectId,
        taskId: entry.taskId,
        tension: entry.tension,
        templateType: entry.templateType,
      },
    });
    return toEntry(record);
  }

  async update(entry: Partial<Entry> & { id: string }): Promise<Entry> {
    const record = await this.prisma.entry.update({
      where: { id: entry.id },
      data: {
        ...(entry.content !== undefined && { content: entry.content }),
        ...(entry.projectId !== undefined && { projectId: entry.projectId }),
        ...(entry.taskId !== undefined && { taskId: entry.taskId }),
        ...(entry.tension !== undefined && { tension: entry.tension }),
        ...(entry.templateType !== undefined && { templateType: entry.templateType }),
      },
    });
    return toEntry(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.entry.delete({ where: { id } });
  }
}
