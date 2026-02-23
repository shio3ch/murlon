import type { Project } from "../../domain/project/project.entity.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";

export interface ListProjectsDeps {
  projectRepository: IProjectRepository;
}

export async function listProjectsUseCase(
  deps: ListProjectsDeps,
  input: { userId: string },
): Promise<Project[]> {
  return await deps.projectRepository.findByUserId(input.userId);
}
