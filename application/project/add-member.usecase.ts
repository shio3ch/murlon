import { DomainError } from "../../domain/shared/domain-error.ts";
import type { ProjectMember, ProjectRole } from "../../domain/project/project.entity.ts";
import { getProjectRole } from "../../domain/project/project.entity.ts";
import type {
  IProjectMemberRepository,
  IProjectRepository,
} from "../../domain/project/project.repository.ts";
import type { IUserRepository } from "../../domain/user/user.repository.ts";

export interface AddMemberInput {
  projectId: string;
  requestUserId: string;
  targetEmail: string;
  role?: string;
}

export interface AddMemberDeps {
  projectRepository: IProjectRepository;
  projectMemberRepository: IProjectMemberRepository;
  userRepository: IUserRepository;
}

export async function addMemberUseCase(
  deps: AddMemberDeps,
  input: AddMemberInput,
): Promise<ProjectMember> {
  const project = await deps.projectRepository.findById(input.projectId);
  if (!project) {
    throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
  }

  const requesterRole = getProjectRole(project, input.requestUserId);
  if (requesterRole !== "ADMIN") {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  const email = input.targetEmail.trim();
  if (!email) {
    throw new DomainError("メールアドレスを入力してください");
  }

  const role = (input.role || "VIEWER") as ProjectRole;
  if (!["VIEWER", "COMMENTER", "CONTRIBUTOR", "ADMIN"].includes(role)) {
    throw new DomainError("無効なロールです");
  }

  const targetUser = await deps.userRepository.findByEmail(email);
  if (!targetUser) {
    throw new DomainError("ユーザーが見つかりません", "NOT_FOUND");
  }

  if (targetUser.id === project.ownerId) {
    throw new DomainError("オーナーをメンバーとして追加することはできません");
  }

  const existingMember = await deps.projectMemberRepository.findByProjectAndUser(
    input.projectId,
    targetUser.id,
  );
  if (existingMember) {
    throw new DomainError("既にメンバーです", "CONFLICT");
  }

  return await deps.projectMemberRepository.add(input.projectId, targetUser.id, role);
}
