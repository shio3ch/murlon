import { DomainError } from "../../domain/shared/domain-error.ts";
import type { ProjectMember, ProjectRole } from "../../domain/project/project.entity.ts";
import { getProjectRole } from "../../domain/project/project.entity.ts";
import type { IProjectRepository, IProjectMemberRepository } from "../../domain/project/project.repository.ts";

export interface UpdateMemberDeps {
  projectRepository: IProjectRepository;
  projectMemberRepository: IProjectMemberRepository;
}

export async function updateMemberUseCase(
  deps: UpdateMemberDeps,
  input: { projectId: string; memberId: string; requestUserId: string; role: string },
): Promise<ProjectMember> {
  const project = await deps.projectRepository.findById(input.projectId);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }

  if (getProjectRole(project, input.requestUserId) !== "ADMIN") {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  if (!["VIEWER", "COMMENTER", "CONTRIBUTOR", "ADMIN"].includes(input.role)) {
    throw new DomainError("無効なロールです");
  }

  const member = await deps.projectMemberRepository.findByProjectAndUser(
    input.projectId,
    input.memberId,
  );
  if (!member) {
    throw new DomainError("メンバーが見つかりません", "NOT_FOUND");
  }

  return await deps.projectMemberRepository.update(input.memberId, input.role as ProjectRole);
}
