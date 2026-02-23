import type { ReportTemplate } from "./template.entity.ts";
import type { ReportType } from "../report/report.entity.ts";

export interface ITemplateRepository {
  findByUserId(userId: string): Promise<ReportTemplate[]>;
  findById(id: string): Promise<ReportTemplate | null>;
  save(params: {
    userId: string | null;
    name: string;
    type: ReportType;
    prompt: string;
  }): Promise<ReportTemplate>;
  update(id: string, params: {
    name?: string;
    type?: ReportType;
    prompt?: string;
  }): Promise<ReportTemplate>;
  delete(id: string): Promise<void>;
}
