import { DomainError } from "../../domain/shared/domain-error.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";

export interface DeleteProjectDeps {
  projectRepository: IProjectRepository;
}

export async function deleteProjectUseCase(
  deps: DeleteProjectDeps,
  input: { id: string; userId: string },
): Promise<void> {
  const project = await deps.projectRepository.findById(input.id);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }
  if (project.ownerId !== input.userId) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }
  await deps.projectRepository.delete(input.id);
}
