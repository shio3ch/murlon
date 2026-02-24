import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { createTemplateUseCase } from "../../../application/template/create-template.usecase.ts";
import { updateTemplateUseCase } from "../../../application/template/update-template.usecase.ts";
import { deleteTemplateUseCase } from "../../../application/template/delete-template.usecase.ts";
import { createTemplate, mockTemplateRepository } from "../../helpers.ts";

// ── createTemplate ──

Deno.test("createTemplate - 正常にテンプレートを作成できる", async () => {
  const saved = createTemplate({ name: "新テンプレート" });
  const deps = {
    templateRepository: mockTemplateRepository({ save: () => Promise.resolve(saved) }),
  };

  const result = await createTemplateUseCase(deps, {
    userId: "user-1",
    name: "新テンプレート",
    type: "DAILY",
    prompt: "テストプロンプト",
  });
  assertEquals(result.name, "新テンプレート");
});

Deno.test("createTemplate - 名前が空はバリデーションエラー", async () => {
  const deps = { templateRepository: mockTemplateRepository() };

  const err = await assertRejects(
    () =>
      createTemplateUseCase(deps, {
        userId: "user-1",
        name: "",
        type: "DAILY",
        prompt: "test",
      }),
    DomainError,
  );
  assertEquals(err.message, "テンプレート名を入力してください");
});

Deno.test("createTemplate - 名前が未指定はバリデーションエラー", async () => {
  const deps = { templateRepository: mockTemplateRepository() };

  const err = await assertRejects(
    () =>
      createTemplateUseCase(deps, {
        userId: "user-1",
        type: "DAILY",
        prompt: "test",
      }),
    DomainError,
  );
  assertEquals(err.message, "テンプレート名を入力してください");
});

Deno.test("createTemplate - 無効なタイプはバリデーションエラー", async () => {
  const deps = { templateRepository: mockTemplateRepository() };

  const err = await assertRejects(
    () =>
      createTemplateUseCase(deps, {
        userId: "user-1",
        name: "test",
        type: "INVALID",
        prompt: "test",
      }),
    DomainError,
  );
  assertEquals(err.message, "type は DAILY, WEEKLY, MONTHLY のいずれかを指定してください");
});

Deno.test("createTemplate - タイプが未指定はバリデーションエラー", async () => {
  const deps = { templateRepository: mockTemplateRepository() };

  const err = await assertRejects(
    () =>
      createTemplateUseCase(deps, {
        userId: "user-1",
        name: "test",
        prompt: "test",
      }),
    DomainError,
  );
  assertEquals(err.message, "type は DAILY, WEEKLY, MONTHLY のいずれかを指定してください");
});

Deno.test("createTemplate - 有効なタイプは許容される", async () => {
  const saved = createTemplate();
  const deps = {
    templateRepository: mockTemplateRepository({ save: () => Promise.resolve(saved) }),
  };

  for (const type of ["DAILY", "WEEKLY", "MONTHLY"]) {
    await createTemplateUseCase(deps, {
      userId: "user-1",
      name: "test",
      type,
      prompt: "test",
    });
  }
});

Deno.test("createTemplate - プロンプトが空はバリデーションエラー", async () => {
  const deps = { templateRepository: mockTemplateRepository() };

  const err = await assertRejects(
    () =>
      createTemplateUseCase(deps, {
        userId: "user-1",
        name: "test",
        type: "DAILY",
        prompt: "",
      }),
    DomainError,
  );
  assertEquals(err.message, "プロンプトを入力してください");
});

Deno.test("createTemplate - プロンプトが未指定はバリデーションエラー", async () => {
  const deps = { templateRepository: mockTemplateRepository() };

  const err = await assertRejects(
    () =>
      createTemplateUseCase(deps, {
        userId: "user-1",
        name: "test",
        type: "DAILY",
      }),
    DomainError,
  );
  assertEquals(err.message, "プロンプトを入力してください");
});

// ── updateTemplate ──

Deno.test("updateTemplate - 正常に更新できる", async () => {
  const existing = createTemplate({ userId: "user-1" });
  const updated = createTemplate({ name: "更新後" });
  const deps = {
    templateRepository: mockTemplateRepository({
      findById: () => Promise.resolve(existing),
      update: () => Promise.resolve(updated),
    }),
  };

  const result = await updateTemplateUseCase(deps, {
    id: "template-1",
    userId: "user-1",
    name: "更新後",
  });
  assertEquals(result.name, "更新後");
});

Deno.test("updateTemplate - 存在しないテンプレートは NOT_FOUND", async () => {
  const deps = {
    templateRepository: mockTemplateRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => updateTemplateUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("updateTemplate - 他人のテンプレートは FORBIDDEN", async () => {
  const existing = createTemplate({ userId: "user-1" });
  const deps = {
    templateRepository: mockTemplateRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () => updateTemplateUseCase(deps, { id: "template-1", userId: "user-2", name: "不正更新" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("updateTemplate - システムテンプレート(userId=null)は誰でも更新できる", async () => {
  const existing = createTemplate({ userId: null });
  const updated = createTemplate({ name: "更新後" });
  const deps = {
    templateRepository: mockTemplateRepository({
      findById: () => Promise.resolve(existing),
      update: () => Promise.resolve(updated),
    }),
  };

  const result = await updateTemplateUseCase(deps, {
    id: "template-1",
    userId: "any-user",
    name: "更新後",
  });
  assertEquals(result.name, "更新後");
});

Deno.test("updateTemplate - 名前が空はバリデーションエラー", async () => {
  const existing = createTemplate({ userId: "user-1" });
  const deps = {
    templateRepository: mockTemplateRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () => updateTemplateUseCase(deps, { id: "template-1", userId: "user-1", name: "" }),
    DomainError,
  );
  assertEquals(err.message, "テンプレート名を入力してください");
});

Deno.test("updateTemplate - 無効なタイプはバリデーションエラー", async () => {
  const existing = createTemplate({ userId: "user-1" });
  const deps = {
    templateRepository: mockTemplateRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () => updateTemplateUseCase(deps, { id: "template-1", userId: "user-1", type: "INVALID" }),
    DomainError,
  );
  assertEquals(err.message, "type は DAILY, WEEKLY, MONTHLY のいずれかを指定してください");
});

Deno.test("updateTemplate - プロンプトが空はバリデーションエラー", async () => {
  const existing = createTemplate({ userId: "user-1" });
  const deps = {
    templateRepository: mockTemplateRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () => updateTemplateUseCase(deps, { id: "template-1", userId: "user-1", prompt: "" }),
    DomainError,
  );
  assertEquals(err.message, "プロンプトを入力してください");
});

// ── deleteTemplate ──

Deno.test("deleteTemplate - 正常に削除できる", async () => {
  let deletedId: string | null = null;
  const existing = createTemplate({ userId: "user-1" });
  const deps = {
    templateRepository: mockTemplateRepository({
      findById: () => Promise.resolve(existing),
      delete: (id: string) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  };

  await deleteTemplateUseCase(deps, { id: "template-1", userId: "user-1" });
  assertEquals(deletedId, "template-1");
});

Deno.test("deleteTemplate - 存在しないテンプレートは NOT_FOUND", async () => {
  const deps = {
    templateRepository: mockTemplateRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => deleteTemplateUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("deleteTemplate - 他人のテンプレートは FORBIDDEN", async () => {
  const existing = createTemplate({ userId: "user-1" });
  const deps = {
    templateRepository: mockTemplateRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () => deleteTemplateUseCase(deps, { id: "template-1", userId: "user-2" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("deleteTemplate - システムテンプレート(userId=null)は誰でも削除できる", async () => {
  let deletedId: string | null = null;
  const existing = createTemplate({ userId: null });
  const deps = {
    templateRepository: mockTemplateRepository({
      findById: () => Promise.resolve(existing),
      delete: (id: string) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  };

  await deleteTemplateUseCase(deps, { id: "template-1", userId: "any-user" });
  assertEquals(deletedId, "template-1");
});
