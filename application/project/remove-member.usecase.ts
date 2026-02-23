import { DomainError } from "../../domain/shared/domain-error.ts";
import { getProjectRole } from "../../domain/project/project.entity.ts";
import type {
  IProjectMemberRepository,
  IProjectRepository,
} from "../../domain/project/project.repository.ts";

export interface RemoveMemberDeps {
  projectRepository: IProjectRepository;
  projectMemberRepository: IProjectMemberRepository;
}

export async function removeMemberUseCase(
  deps: RemoveMemberDeps,
  input: { projectId: string; memberId: string; requestUserId: string },
): Promise<void> {
  const project = await deps.projectRepository.findById(input.projectId);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }

  if (getProjectRole(project, input.requestUserId) !== "ADMIN") {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  const member = await deps.projectMemberRepository.findByProjectAndUser(
    input.projectId,
    input.memberId,
  );
  if (!member) {
    throw new DomainError("メンバーが見つかりません", "NOT_FOUND");
  }

  if (member.userId === project.ownerId) {
    throw new DomainError("オーナーを削除することはできません");
  }

  await deps.projectMemberRepository.remove(input.memberId);
}
