import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { deleteProjectUseCase } from "../../../application/project/delete-project.usecase.ts";
import { createProject, mockProjectRepository } from "../../helpers.ts";

Deno.test("deleteProject - オーナーは正常に削除できる", async () => {
  let deletedId: string | null = null;
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({
      findById: () => Promise.resolve(project),
      delete: (id: string) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  };

  await deleteProjectUseCase(deps, { id: "project-1", userId: "user-1" });
  assertEquals(deletedId, "project-1");
});

Deno.test("deleteProject - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => deleteProjectUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("deleteProject - オーナー以外は FORBIDDEN", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => deleteProjectUseCase(deps, { id: "project-1", userId: "user-2" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});
