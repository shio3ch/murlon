import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { updateMemberUseCase } from "../../../application/project/update-member.usecase.ts";
import { removeMemberUseCase } from "../../../application/project/remove-member.usecase.ts";
import {
  createProject,
  createProjectMember,
  mockProjectMemberRepository,
  mockProjectRepository,
} from "../../helpers.ts";

// ── updateMember ──

Deno.test("updateMember - ADMINが正常にロールを更新できる", async () => {
  const project = createProject({ ownerId: "user-1" });
  const member = createProjectMember({ userId: "user-2", role: "VIEWER" });
  const updated = createProjectMember({ userId: "user-2", role: "CONTRIBUTOR" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository({
      findByProjectAndUser: () => Promise.resolve(member),
      update: () => Promise.resolve(updated),
    }),
  };

  const result = await updateMemberUseCase(deps, {
    projectId: "project-1",
    memberId: "user-2",
    requestUserId: "user-1",
    role: "CONTRIBUTOR",
  });
  assertEquals(result.role, "CONTRIBUTOR");
});

Deno.test("updateMember - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
    projectMemberRepository: mockProjectMemberRepository(),
  };

  const err = await assertRejects(
    () =>
      updateMemberUseCase(deps, {
        projectId: "no-such",
        memberId: "user-2",
        requestUserId: "user-1",
        role: "VIEWER",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("updateMember - ADMIN以外は FORBIDDEN", async () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-3", role: "CONTRIBUTOR" })],
  });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository(),
  };

  const err = await assertRejects(
    () =>
      updateMemberUseCase(deps, {
        projectId: "project-1",
        memberId: "user-2",
        requestUserId: "user-3",
        role: "VIEWER",
      }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("updateMember - 無効なロールはバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository(),
  };

  const err = await assertRejects(
    () =>
      updateMemberUseCase(deps, {
        projectId: "project-1",
        memberId: "user-2",
        requestUserId: "user-1",
        role: "SUPERADMIN",
      }),
    DomainError,
  );
  assertEquals(err.message, "無効なロールです");
});

Deno.test("updateMember - メンバーが見つからない場合は NOT_FOUND", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository({
      findByProjectAndUser: () => Promise.resolve(null),
    }),
  };

  const err = await assertRejects(
    () =>
      updateMemberUseCase(deps, {
        projectId: "project-1",
        memberId: "user-unknown",
        requestUserId: "user-1",
        role: "VIEWER",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
  assertEquals(err.message, "メンバーが見つかりません");
});

// ── removeMember ──

Deno.test("removeMember - ADMINが正常にメンバーを削除できる", async () => {
  let removedId: string | null = null;
  const project = createProject({ ownerId: "user-1" });
  const member = createProjectMember({ id: "member-1", userId: "user-2" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository({
      findByProjectAndUser: () => Promise.resolve(member),
      remove: (id: string) => {
        removedId = id;
        return Promise.resolve();
      },
    }),
  };

  await removeMemberUseCase(deps, {
    projectId: "project-1",
    memberId: "user-2",
    requestUserId: "user-1",
  });
  assertEquals(removedId, "user-2");
});

Deno.test("removeMember - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
    projectMemberRepository: mockProjectMemberRepository(),
  };

  const err = await assertRejects(
    () =>
      removeMemberUseCase(deps, {
        projectId: "no-such",
        memberId: "user-2",
        requestUserId: "user-1",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("removeMember - ADMIN以外は FORBIDDEN", async () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-3", role: "VIEWER" })],
  });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository(),
  };

  const err = await assertRejects(
    () =>
      removeMemberUseCase(deps, {
        projectId: "project-1",
        memberId: "user-2",
        requestUserId: "user-3",
      }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("removeMember - メンバーが見つからない場合は NOT_FOUND", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository({
      findByProjectAndUser: () => Promise.resolve(null),
    }),
  };

  const err = await assertRejects(
    () =>
      removeMemberUseCase(deps, {
        projectId: "project-1",
        memberId: "user-unknown",
        requestUserId: "user-1",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("removeMember - オーナーを削除することはできない", async () => {
  const project = createProject({ ownerId: "user-1" });
  const member = createProjectMember({ id: "member-owner", userId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository({
      findByProjectAndUser: () => Promise.resolve(member),
    }),
  };

  const err = await assertRejects(
    () =>
      removeMemberUseCase(deps, {
        projectId: "project-1",
        memberId: "user-1",
        requestUserId: "user-1",
      }),
    DomainError,
  );
  assertEquals(err.message, "オーナーを削除することはできません");
});
