import { DomainError } from "../../domain/shared/domain-error.ts";
import type { IntegrationSetting } from "../../domain/integration/integration.entity.ts";
import type { IIntegrationRepository } from "../../domain/integration/integration.repository.ts";

export interface UpdateIntegrationDeps {
  integrationRepository: IIntegrationRepository;
}

export async function updateIntegrationUseCase(
  deps: UpdateIntegrationDeps,
  input: {
    id: string;
    userId: string;
    webhookUrl?: string;
    channelName?: string | null;
    enabled?: boolean;
  },
): Promise<IntegrationSetting> {
  const setting = await deps.integrationRepository.findById(input.id);
  if (!setting) {
    throw new DomainError("連携設定が見つかりません", "NOT_FOUND");
  }
  if (setting.userId !== input.userId) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  const params: { webhookUrl?: string; channelName?: string | null; enabled?: boolean } = {};
  if (input.webhookUrl !== undefined) {
    const webhookUrl = input.webhookUrl.trim();
    if (!webhookUrl) throw new DomainError("Webhook URLを入力してください");
    params.webhookUrl = webhookUrl;
  }
  if ("channelName" in input) params.channelName = input.channelName;
  if (input.enabled !== undefined) params.enabled = input.enabled;

  return await deps.integrationRepository.update(input.id, params);
}
