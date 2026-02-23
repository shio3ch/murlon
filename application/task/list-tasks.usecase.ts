import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Task } from "../../domain/task/task.entity.ts";
import type { ITaskRepository } from "../../domain/task/task.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";

export interface ListTasksDeps {
  taskRepository: ITaskRepository;
  projectRepository: IProjectRepository;
}

export async function listTasksUseCase(
  deps: ListTasksDeps,
  input: { projectId: string; userId: string },
): Promise<Task[]> {
  const project = await deps.projectRepository.findById(input.projectId);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }
  if (!hasProjectAccess(project, input.userId)) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }
  return await deps.taskRepository.findByProjectId(input.projectId);
}
