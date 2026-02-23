export type ReportType = "DAILY" | "WEEKLY" | "MONTHLY";

export interface Report {
  readonly id: string;
  readonly type: ReportType;
  readonly content: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly userId: string;
  readonly projectId: string | null;
  readonly promptTemplate: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
