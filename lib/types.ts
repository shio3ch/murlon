export type ReportType = "DAILY" | "WEEKLY" | "MONTHLY";

export interface EntryRecord {
  id: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRecord {
  id: string;
  type: ReportType;
  content: string;
  startDate: Date;
  endDate: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
