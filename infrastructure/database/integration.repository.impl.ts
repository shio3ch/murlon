import type { PrismaClient } from "@prisma/client";
import type { IntegrationSetting, IntegrationType } from "../../domain/integration/integration.entity.ts";
import type { IIntegrationRepository } from "../../domain/integration/integration.repository.ts";

function toIntegration(record: {
  id: string;
  userId: string;
  projectId: string | null;
  type: string;
  webhookUrl: string;
  channelName: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): IntegrationSetting {
  return {
    id: record.id,
    userId: record.userId,
    projectId: record.projectId,
    type: record.type as IntegrationType,
    webhookUrl: record.webhookUrl,
    channelName: record.channelName,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaIntegrationRepository implements IIntegrationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<IntegrationSetting[]> {
    const records = await this.prisma.integrationSetting.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toIntegration);
  }

  async findById(id: string): Promise<IntegrationSetting | null> {
    const record = await this.prisma.integrationSetting.findUnique({ where: { id } });
    return record ? toIntegration(record) : null;
  }

  async save(params: {
    userId: string;
    projectId: string | null;
    type: IntegrationType;
    webhookUrl: string;
    channelName: string | null;
  }): Promise<IntegrationSetting> {
    const record = await this.prisma.integrationSetting.create({ data: params });
    return toIntegration(record);
  }

  async update(
    id: string,
    params: { webhookUrl?: string; channelName?: string | null; enabled?: boolean },
  ): Promise<IntegrationSetting> {
    const record = await this.prisma.integrationSetting.update({ where: { id }, data: params });
    return toIntegration(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.integrationSetting.delete({ where: { id } });
  }
}
