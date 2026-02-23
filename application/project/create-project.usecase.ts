import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Project, Visibility } from "../../domain/project/project.entity.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";

export interface CreateProjectInput {
  name?: string;
  description?: string;
  visibility?: string;
  ownerId: string;
}

export interface CreateProjectDeps {
  projectRepository: IProjectRepository;
}

export async function createProjectUseCase(
  deps: CreateProjectDeps,
  input: CreateProjectInput,
): Promise<Project> {
  const name = (input.name ?? "").trim();
  if (!name) {
    throw new DomainError("プロジェクト名を入力してください");
  }
  if (name.length > 50) {
    throw new DomainError("プロジェクト名は50文字以内で入力してください");
  }

  const visibility = (input.visibility ?? "PRIVATE") as Visibility;
  if (!["PRIVATE", "LIMITED", "PUBLIC"].includes(visibility)) {
    throw new DomainError("無効な公開範囲です");
  }

  return await deps.projectRepository.save({
    name,
    description: input.description?.trim() || null,
    visibility,
    ownerId: input.ownerId,
  });
}
