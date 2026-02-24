import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { updateProjectUseCase } from "../../../application/project/update-project.usecase.ts";
import { createProject, createProjectMember, mockProjectRepository } from "../../helpers.ts";

Deno.test("updateProject - オーナーは正常に更新できる", async () => {
  const project = createProject({ ownerId: "user-1" });
  const updated = createProject({ name: "更新後" });
  const deps = {
    projectRepository: mockProjectRepository({
      findById: () => Promise.resolve(project),
      update: () => Promise.resolve(updated),
    }),
  };

  const result = await updateProjectUseCase(deps, {
    id: "project-1",
    userId: "user-1",
    name: "更新後",
  });
  assertEquals(result.name, "更新後");
});

Deno.test("updateProject - ADMINメンバーは更新できる", async () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-2", role: "ADMIN" })],
  });
  const updated = createProject({ name: "更新後" });
  const deps = {
    projectRepository: mockProjectRepository({
      findById: () => Promise.resolve(project),
      update: () => Promise.resolve(updated),
    }),
  };

  const result = await updateProjectUseCase(deps, {
    id: "project-1",
    userId: "user-2",
    name: "更新後",
  });
  assertEquals(result.name, "更新後");
});

Deno.test("updateProject - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => updateProjectUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("updateProject - ADMIN以外のロールは FORBIDDEN", async () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-2", role: "VIEWER" })],
  });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => updateProjectUseCase(deps, { id: "project-1", userId: "user-2", name: "更新" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("updateProject - 空の名前はバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => updateProjectUseCase(deps, { id: "project-1", userId: "user-1", name: "" }),
    DomainError,
  );
  assertEquals(err.message, "プロジェクト名を入力してください");
});

Deno.test("updateProject - 名前が50文字超はバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      updateProjectUseCase(deps, {
        id: "project-1",
        userId: "user-1",
        name: "あ".repeat(51),
      }),
    DomainError,
  );
  assertEquals(err.message, "プロジェクト名は50文字以内で入力してください");
});

Deno.test("updateProject - 無効な公開範囲はバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      updateProjectUseCase(deps, {
        id: "project-1",
        userId: "user-1",
        visibility: "INVALID",
      }),
    DomainError,
  );
  assertEquals(err.message, "無効な公開範囲です");
});
