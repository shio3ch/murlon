// HTTPレスポンス共通型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ドメイン型の再エクスポート（既存コードの後方互換性のため）
export type { ReportType } from "../domain/report/report.entity.ts";
export type { Visibility, ProjectRole } from "../domain/project/project.entity.ts";
export type { TaskStatus, TaskPriority } from "../domain/task/task.entity.ts";
