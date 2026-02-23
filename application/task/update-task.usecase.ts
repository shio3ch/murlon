import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Task, TaskPriority, TaskStatus } from "../../domain/task/task.entity.ts";
import type { ITaskRepository } from "../../domain/task/task.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";

export interface UpdateTaskInput {
  id: string;
  userId: string;
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface UpdateTaskDeps {
  taskRepository: ITaskRepository;
  projectRepository: IProjectRepository;
}

export async function updateTaskUseCase(
  deps: UpdateTaskDeps,
  input: UpdateTaskInput,
): Promise<Task> {
  const task = await deps.taskRepository.findById(input.id);
  if (!task) {
    throw new DomainError("タスクが見つかりません", "NOT_FOUND");
  }

  const project = await deps.projectRepository.findById(task.projectId);
  if (!project || !hasProjectAccess(project, input.userId)) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  if (input.status && !["TODO", "IN_PROGRESS", "DONE", "HOLD"].includes(input.status)) {
    throw new DomainError("無効なステータスです");
  }
  if (input.priority && !["HIGH", "MEDIUM", "LOW"].includes(input.priority)) {
    throw new DomainError("無効な優先度です");
  }

  const params: Parameters<typeof deps.taskRepository.update>[1] = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new DomainError("タイトルを入力してください");
    params.title = title;
  }
  if ("description" in input) params.description = input.description;
  if (input.status) params.status = input.status as TaskStatus;
  if (input.priority) params.priority = input.priority as TaskPriority;
  if ("dueDate" in input) params.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if ("assigneeId" in input) params.assigneeId = input.assigneeId;

  return await deps.taskRepository.update(input.id, params);
}
