import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { addCommentUseCase } from "../../../application/entry/add-comment.usecase.ts";
import {
  createComment,
  createEntry,
  mockCommentRepository,
  mockEntryRepository,
} from "../../helpers.ts";

Deno.test("addComment - 正常にコメントを追加できる", async () => {
  const entry = createEntry();
  const saved = createComment({ content: "良い分報ですね" });
  const deps = {
    commentRepository: mockCommentRepository({ save: () => Promise.resolve(saved) }),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
  };

  const result = await addCommentUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
    content: "良い分報ですね",
  });
  assertEquals(result.content, "良い分報ですね");
});

Deno.test("addComment - 存在しないエントリは NOT_FOUND", async () => {
  const deps = {
    commentRepository: mockCommentRepository(),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => addCommentUseCase(deps, { entryId: "no-such", userId: "user-1", content: "test" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("addComment - 空のコメントはバリデーションエラー", async () => {
  const entry = createEntry();
  const deps = {
    commentRepository: mockCommentRepository(),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
  };

  const err = await assertRejects(
    () => addCommentUseCase(deps, { entryId: "entry-1", userId: "user-1", content: "" }),
    DomainError,
  );
  assertEquals(err.message, "コメントを入力してください");
});

Deno.test("addComment - 空白のみのコメントはバリデーションエラー", async () => {
  const entry = createEntry();
  const deps = {
    commentRepository: mockCommentRepository(),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
  };

  const err = await assertRejects(
    () => addCommentUseCase(deps, { entryId: "entry-1", userId: "user-1", content: "   " }),
    DomainError,
  );
  assertEquals(err.message, "コメントを入力してください");
});
