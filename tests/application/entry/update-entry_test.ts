import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { updateEntryUseCase } from "../../../application/entry/update-entry.usecase.ts";
import { createEntry, mockEntryRepository } from "../../helpers.ts";

Deno.test("updateEntry - 正常に更新できる", async () => {
  const existing = createEntry({ userId: "user-1" });
  const updated = createEntry({ content: "更新済み" });
  const deps = {
    entryRepository: mockEntryRepository({
      findById: () => Promise.resolve(existing),
      update: () => Promise.resolve(updated),
    }),
  };

  const result = await updateEntryUseCase(deps, {
    id: "entry-1",
    userId: "user-1",
    content: "更新済み",
  });
  assertEquals(result.content, "更新済み");
});

Deno.test("updateEntry - 存在しないエントリは NOT_FOUND", async () => {
  const deps = {
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => updateEntryUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("updateEntry - 他人のエントリは FORBIDDEN", async () => {
  const existing = createEntry({ userId: "user-1" });
  const deps = {
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () =>
      updateEntryUseCase(deps, {
        id: "entry-1",
        userId: "user-2",
        content: "不正更新",
      }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("updateEntry - 空の内容はバリデーションエラー", async () => {
  const existing = createEntry({ userId: "user-1" });
  const deps = {
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () =>
      updateEntryUseCase(deps, {
        id: "entry-1",
        userId: "user-1",
        content: "",
      }),
    DomainError,
  );
  assertEquals(err.message, "内容を入力してください");
});

Deno.test("updateEntry - 5000文字超はバリデーションエラー", async () => {
  const existing = createEntry({ userId: "user-1" });
  const deps = {
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () =>
      updateEntryUseCase(deps, {
        id: "entry-1",
        userId: "user-1",
        content: "あ".repeat(5001),
      }),
    DomainError,
  );
  assertEquals(err.message, "内容は5000文字以内で入力してください");
});

Deno.test("updateEntry - テンションが範囲外はバリデーションエラー", async () => {
  const existing = createEntry({ userId: "user-1" });
  const deps = {
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(existing) }),
  };

  await assertRejects(
    () =>
      updateEntryUseCase(deps, {
        id: "entry-1",
        userId: "user-1",
        tension: 0,
      }),
    DomainError,
  );
});

Deno.test("updateEntry - content を指定しない場合はバリデーションをスキップ", async () => {
  const existing = createEntry({ userId: "user-1" });
  const updated = createEntry({ tension: 3 });
  const deps = {
    entryRepository: mockEntryRepository({
      findById: () => Promise.resolve(existing),
      update: () => Promise.resolve(updated),
    }),
  };

  const result = await updateEntryUseCase(deps, {
    id: "entry-1",
    userId: "user-1",
    tension: 3,
  });
  assertEquals(result.tension, 3);
});
