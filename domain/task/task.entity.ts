export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "HOLD";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export interface Task {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueDate: Date | null;
  readonly assigneeId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
