import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { addMemberUseCase } from "../../../application/project/add-member.usecase.ts";
import {
  createProject,
  createProjectMember,
  createUser,
  mockProjectMemberRepository,
  mockProjectRepository,
  mockUserRepository,
} from "../../helpers.ts";

function baseDeps() {
  const project = createProject({ ownerId: "user-1" });
  const targetUser = createUser({ id: "user-2", email: "target@example.com" });
  return {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository(),
    userRepository: mockUserRepository({
      findByEmail: (email: string) =>
        email === "target@example.com"
          ? Promise.resolve({ ...targetUser, passwordHash: "hash" })
          : Promise.resolve(null),
    }),
  };
}

Deno.test("addMember - ADMINが正常にメンバーを追加できる", async () => {
  const deps = baseDeps();
  const result = await addMemberUseCase(deps, {
    projectId: "project-1",
    requestUserId: "user-1",
    targetEmail: "target@example.com",
    role: "CONTRIBUTOR",
  });
  assertEquals(result.role, "CONTRIBUTOR");
});

Deno.test("addMember - ロール未指定の場合はVIEWER", async () => {
  const deps = baseDeps();
  const result = await addMemberUseCase(deps, {
    projectId: "project-1",
    requestUserId: "user-1",
    targetEmail: "target@example.com",
  });
  assertEquals(result.role, "VIEWER");
});

Deno.test("addMember - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () =>
      addMemberUseCase(deps, {
        projectId: "no-such",
        requestUserId: "user-1",
        targetEmail: "target@example.com",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("addMember - ADMIN以外は FORBIDDEN", async () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-3", role: "CONTRIBUTOR" })],
  });
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      addMemberUseCase(deps, {
        projectId: "project-1",
        requestUserId: "user-3",
        targetEmail: "target@example.com",
      }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("addMember - 空のメールアドレスはバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () =>
      addMemberUseCase(deps, {
        projectId: "project-1",
        requestUserId: "user-1",
        targetEmail: "",
      }),
    DomainError,
  );
  assertEquals(err.message, "メールアドレスを入力してください");
});

Deno.test("addMember - 無効なロールはバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () =>
      addMemberUseCase(deps, {
        projectId: "project-1",
        requestUserId: "user-1",
        targetEmail: "target@example.com",
        role: "SUPERADMIN",
      }),
    DomainError,
  );
  assertEquals(err.message, "無効なロールです");
});

Deno.test("addMember - 存在しないユーザーは NOT_FOUND", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () =>
      addMemberUseCase(deps, {
        projectId: "project-1",
        requestUserId: "user-1",
        targetEmail: "unknown@example.com",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
  assertEquals(err.message, "ユーザーが見つかりません");
});

Deno.test("addMember - オーナーをメンバーとして追加できない", async () => {
  const project = createProject({ ownerId: "user-1" });
  const ownerUser = createUser({ id: "user-1", email: "owner@example.com" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
    projectMemberRepository: mockProjectMemberRepository(),
    userRepository: mockUserRepository({
      findByEmail: () => Promise.resolve({ ...ownerUser, passwordHash: "hash" }),
    }),
  };

  const err = await assertRejects(
    () =>
      addMemberUseCase(deps, {
        projectId: "project-1",
        requestUserId: "user-1",
        targetEmail: "owner@example.com",
      }),
    DomainError,
  );
  assertEquals(err.message, "オーナーをメンバーとして追加することはできません");
});

Deno.test("addMember - 既にメンバーの場合は CONFLICT", async () => {
  const existingMember = createProjectMember({ userId: "user-2" });
  const deps = {
    ...baseDeps(),
    projectMemberRepository: mockProjectMemberRepository({
      findByProjectAndUser: () => Promise.resolve(existingMember),
    }),
  };

  const err = await assertRejects(
    () =>
      addMemberUseCase(deps, {
        projectId: "project-1",
        requestUserId: "user-1",
        targetEmail: "target@example.com",
      }),
    DomainError,
  );
  assertEquals(err.code, "CONFLICT");
  assertEquals(err.message, "既にメンバーです");
});
