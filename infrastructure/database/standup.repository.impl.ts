import type { PrismaClient } from "@prisma/client";
import type { Standup } from "../../domain/standup/standup.entity.ts";
import type { IStandupRepository } from "../../domain/standup/standup.repository.ts";

function toStandup(record: {
  id: string;
  userId: string;
  projectId: string | null;
  content: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}): Standup {
  return {
    id: record.id,
    userId: record.userId,
    projectId: record.projectId,
    content: record.content,
    date: record.date,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaStandupRepository implements IStandupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserAndDate(
    userId: string,
    date: Date,
    projectId?: string,
  ): Promise<Standup | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      userId,
      date: { gte: startOfDay, lte: endOfDay },
    };
    if (projectId) where.projectId = projectId;

    const record = await this.prisma.standup.findFirst({ where });
    return record ? toStandup(record) : null;
  }

  async save(params: {
    userId: string;
    projectId: string | null;
    content: string;
    date: Date;
  }): Promise<Standup> {
    const record = await this.prisma.standup.create({ data: params });
    return toStandup(record);
  }

  async update(id: string, content: string): Promise<Standup> {
    const record = await this.prisma.standup.update({ where: { id }, data: { content } });
    return toStandup(record);
  }
}
