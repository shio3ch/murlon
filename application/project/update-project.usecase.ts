import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Project, Visibility } from "../../domain/project/project.entity.ts";
import { getProjectRole } from "../../domain/project/project.entity.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";

export interface UpdateProjectInput {
  id: string;
  userId: string;
  name?: string;
  description?: string | null;
  visibility?: string;
}

export interface UpdateProjectDeps {
  projectRepository: IProjectRepository;
}

export async function updateProjectUseCase(
  deps: UpdateProjectDeps,
  input: UpdateProjectInput,
): Promise<Project> {
  const project = await deps.projectRepository.findById(input.id);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }

  const role = getProjectRole(project, input.userId);
  if (role !== "ADMIN") {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  const params: { name?: string; description?: string | null; visibility?: Visibility } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new DomainError("プロジェクト名を入力してください");
    if (name.length > 50) throw new DomainError("プロジェクト名は50文字以内で入力してください");
    params.name = name;
  }

  if ("description" in input) {
    params.description = input.description?.trim() || null;
  }

  if (input.visibility !== undefined) {
    if (!["PRIVATE", "LIMITED", "PUBLIC"].includes(input.visibility)) {
      throw new DomainError("無効な公開範囲です");
    }
    params.visibility = input.visibility as Visibility;
  }

  return await deps.projectRepository.update(input.id, params);
}
