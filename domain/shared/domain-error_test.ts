import { assertEquals, assertInstanceOf } from "$std/assert/mod.ts";
import { DomainError } from "./domain-error.ts";

Deno.test("DomainError - デフォルトコードはVALIDATION", () => {
  const error = new DomainError("テストエラー");
  assertEquals(error.message, "テストエラー");
  assertEquals(error.code, "VALIDATION");
  assertEquals(error.name, "DomainError");
  assertInstanceOf(error, Error);
});

Deno.test("DomainError - カスタムコードを指定できる", () => {
  const codes = ["NOT_FOUND", "FORBIDDEN", "CONFLICT", "VALIDATION"] as const;
  for (const code of codes) {
    const error = new DomainError(`${code}エラー`, code);
    assertEquals(error.code, code);
  }
});
