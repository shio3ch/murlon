import type { Task, TaskPriority, TaskStatus } from "./task.entity.ts";

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByProjectId(projectId: string): Promise<Task[]>;
  save(params: {
    projectId: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    assigneeId: string | null;
  }): Promise<Task>;
  update(id: string, params: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date | null;
    assigneeId?: string | null;
  }): Promise<Task>;
  delete(id: string): Promise<void>;
}
