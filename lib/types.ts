// HTTPレスポンス共通型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ドメイン型の再エクスポート（既存コードの後方互換性のため）
export type { ReportType } from "../domain/report/report.entity.ts";
export type { ProjectRole, Visibility } from "../domain/project/project.entity.ts";
export type { TaskPriority, TaskStatus } from "../domain/task/task.entity.ts";

// フロントエンド向けレコード型（readonly を除去）
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

import type { Entry } from "../domain/entry/entry.entity.ts";
import type { Report } from "../domain/report/report.entity.ts";
import type { Project, ProjectMember } from "../domain/project/project.entity.ts";
import type { Task } from "../domain/task/task.entity.ts";

export type EntryRecord = Mutable<Entry>;
export type ReportRecord = Mutable<Report>;
// Project.members は必須だが一覧取得では含まないケースがあるため optional に
export type ProjectRecord = Omit<Mutable<Project>, "members"> & {
  members?: Mutable<ProjectMember>[];
};
export type ProjectMemberRecord = Mutable<ProjectMember>;
export type TaskRecord = Mutable<Task>;

import type { ReportType } from "../domain/report/report.entity.ts";

export interface ReportTemplateRecord {
  id: string;
  userId: string | null;
  name: string;
  type: ReportType;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
}
