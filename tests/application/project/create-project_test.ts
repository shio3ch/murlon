import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { createProjectUseCase } from "../../../application/project/create-project.usecase.ts";
import { createProject, mockProjectRepository } from "../../helpers.ts";

Deno.test("createProject - 正常にプロジェクトを作成できる", async () => {
  const saved = createProject({ name: "新プロジェクト" });
  const deps = {
    projectRepository: mockProjectRepository({ save: () => Promise.resolve(saved) }),
  };

  const result = await createProjectUseCase(deps, {
    name: "新プロジェクト",
    ownerId: "user-1",
  });
  assertEquals(result.name, "新プロジェクト");
});

Deno.test("createProject - 名前が空はバリデーションエラー", async () => {
  const deps = {
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => createProjectUseCase(deps, { name: "", ownerId: "user-1" }),
    DomainError,
  );
  assertEquals(err.message, "プロジェクト名を入力してください");
});

Deno.test("createProject - 名前が未指定はバリデーションエラー", async () => {
  const deps = {
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => createProjectUseCase(deps, { ownerId: "user-1" }),
    DomainError,
  );
  assertEquals(err.message, "プロジェクト名を入力してください");
});

Deno.test("createProject - 名前が50文字超はバリデーションエラー", async () => {
  const deps = {
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () =>
      createProjectUseCase(deps, {
        name: "あ".repeat(51),
        ownerId: "user-1",
      }),
    DomainError,
  );
  assertEquals(err.message, "プロジェクト名は50文字以内で入力してください");
});

Deno.test("createProject - 50文字ちょうどの名前は許容される", async () => {
  const saved = createProject();
  const deps = {
    projectRepository: mockProjectRepository({ save: () => Promise.resolve(saved) }),
  };

  await createProjectUseCase(deps, {
    name: "あ".repeat(50),
    ownerId: "user-1",
  });
});

Deno.test("createProject - 無効な公開範囲はバリデーションエラー", async () => {
  const deps = {
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () =>
      createProjectUseCase(deps, {
        name: "テスト",
        ownerId: "user-1",
        visibility: "INVALID",
      }),
    DomainError,
  );
  assertEquals(err.message, "無効な公開範囲です");
});

Deno.test("createProject - PRIVATE/LIMITED/PUBLIC は有効な公開範囲", async () => {
  const saved = createProject();
  const deps = {
    projectRepository: mockProjectRepository({ save: () => Promise.resolve(saved) }),
  };

  for (const visibility of ["PRIVATE", "LIMITED", "PUBLIC"]) {
    await createProjectUseCase(deps, {
      name: "テスト",
      ownerId: "user-1",
      visibility,
    });
  }
});

Deno.test("createProject - 公開範囲を指定しない場合は PRIVATE", async () => {
  let savedParams: Record<string, unknown> = {};
  const saved = createProject();
  const deps = {
    projectRepository: mockProjectRepository({
      save: (params) => {
        savedParams = params;
        return Promise.resolve(saved);
      },
    }),
  };

  await createProjectUseCase(deps, { name: "テスト", ownerId: "user-1" });
  assertEquals(savedParams.visibility, "PRIVATE");
});
