import { DomainError } from "../../domain/shared/domain-error.ts";
import type { IntegrationSetting, IntegrationType } from "../../domain/integration/integration.entity.ts";
import type { IIntegrationRepository } from "../../domain/integration/integration.repository.ts";

export interface CreateIntegrationDeps {
  integrationRepository: IIntegrationRepository;
}

export async function createIntegrationUseCase(
  deps: CreateIntegrationDeps,
  input: {
    userId: string;
    projectId?: string;
    type?: string;
    webhookUrl?: string;
    channelName?: string;
  },
): Promise<IntegrationSetting> {
  if (!input.type || !["SLACK", "DISCORD", "GITHUB", "GOOGLE_CALENDAR"].includes(input.type)) {
    throw new DomainError("無効な連携タイプです");
  }

  const webhookUrl = input.webhookUrl?.trim();
  if (!webhookUrl) throw new DomainError("Webhook URLを入力してください");

  return await deps.integrationRepository.save({
    userId: input.userId,
    projectId: input.projectId ?? null,
    type: input.type as IntegrationType,
    webhookUrl,
    channelName: input.channelName?.trim() || null,
  });
}
