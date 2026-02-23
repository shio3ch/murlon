export type ReportType = "DAILY" | "WEEKLY" | "MONTHLY";
export type Visibility = "PRIVATE" | "LIMITED" | "PUBLIC";
export type ProjectRole = "VIEWER" | "COMMENTER" | "CONTRIBUTOR" | "ADMIN";

export interface EntryRecord {
  id: string;
  content: string;
  userId: string;
  projectId: string | null;
  tension: number | null;
  templateType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberRecord {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: Date;
}

export interface ReportRecord {
  id: string;
  type: ReportType;
  content: string;
  startDate: Date;
  endDate: Date;
  userId: string;
  projectId: string | null;
  promptTemplate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
