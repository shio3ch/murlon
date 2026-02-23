import type { ReportType } from "../report/report.entity.ts";

export interface ReportTemplate {
  readonly id: string;
  readonly userId: string | null;
  readonly name: string;
  readonly type: ReportType;
  readonly prompt: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
