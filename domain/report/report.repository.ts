import type { Report, ReportType } from "./report.entity.ts";

export interface IReportRepository {
  findFirst(params: {
    userId: string;
    type: ReportType;
    startDate: Date;
    endDate: Date;
    projectId?: string;
  }): Promise<Report | null>;
  delete(id: string): Promise<void>;
  save(params: {
    type: ReportType;
    content: string;
    startDate: Date;
    endDate: Date;
    userId: string;
    projectId: string | null;
    promptTemplate: string | null;
    entryIds: string[];
  }): Promise<Report>;
}
