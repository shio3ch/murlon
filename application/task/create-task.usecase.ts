import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Task, TaskPriority, TaskStatus } from "../../domain/task/task.entity.ts";
import type { ITaskRepository } from "../../domain/task/task.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";

export interface CreateTaskInput {
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
}

export interface CreateTaskDeps {
  taskRepository: ITaskRepository;
  projectRepository: IProjectRepository;
}

export async function createTaskUseCase(
  deps: CreateTaskDeps,
  input: CreateTaskInput,
): Promise<Task> {
  const project = await deps.projectRepository.findById(input.projectId);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }
  if (!hasProjectAccess(project, input.userId)) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  const title = input.title.trim();
  if (!title) throw new DomainError("タイトルを入力してください");

  if (input.status && !["TODO", "IN_PROGRESS", "DONE", "HOLD"].includes(input.status)) {
    throw new DomainError("無効なステータスです");
  }
  if (input.priority && !["HIGH", "MEDIUM", "LOW"].includes(input.priority)) {
    throw new DomainError("無効な優先度です");
  }

  return await deps.taskRepository.save({
    projectId: input.projectId,
    title,
    description: input.description?.trim() || null,
    status: (input.status as TaskStatus) || "TODO",
    priority: (input.priority as TaskPriority) || "MEDIUM",
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    assigneeId: input.assigneeId || null,
  });
}
