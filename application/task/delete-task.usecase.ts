import { DomainError } from "../../domain/shared/domain-error.ts";
import type { ITaskRepository } from "../../domain/task/task.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";

export interface DeleteTaskDeps {
  taskRepository: ITaskRepository;
  projectRepository: IProjectRepository;
}

export async function deleteTaskUseCase(
  deps: DeleteTaskDeps,
  input: { id: string; userId: string },
): Promise<void> {
  const task = await deps.taskRepository.findById(input.id);
  if (!task) {
    throw new DomainError("タスクが見つかりません", "NOT_FOUND");
  }

  const project = await deps.projectRepository.findById(task.projectId);
  if (!project || !hasProjectAccess(project, input.userId)) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  await deps.taskRepository.delete(input.id);
}
