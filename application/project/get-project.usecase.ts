import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Project } from "../../domain/project/project.entity.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";

export interface GetProjectDeps {
  projectRepository: IProjectRepository;
}

export async function getProjectUseCase(
  deps: GetProjectDeps,
  input: { id: string; userId: string },
): Promise<Project> {
  const project = await deps.projectRepository.findByIdWithMemberUsers(input.id);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }
  if (!hasProjectAccess(project, input.userId)) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }
  return project;
}
