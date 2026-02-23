import type { IntegrationSetting, IntegrationType } from "./integration.entity.ts";

export interface IIntegrationRepository {
  findByUserId(userId: string): Promise<IntegrationSetting[]>;
  findById(id: string): Promise<IntegrationSetting | null>;
  save(params: {
    userId: string;
    projectId: string | null;
    type: IntegrationType;
    webhookUrl: string;
    channelName: string | null;
  }): Promise<IntegrationSetting>;
  update(id: string, params: {
    webhookUrl?: string;
    channelName?: string | null;
    enabled?: boolean;
  }): Promise<IntegrationSetting>;
  delete(id: string): Promise<void>;
}
