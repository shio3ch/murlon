export type IntegrationType = "SLACK" | "DISCORD" | "GITHUB" | "GOOGLE_CALENDAR";

export interface IntegrationSetting {
  readonly id: string;
  readonly userId: string;
  readonly projectId: string | null;
  readonly type: IntegrationType;
  readonly webhookUrl: string;
  readonly channelName: string | null;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
