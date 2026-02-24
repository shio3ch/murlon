import { assertEquals, assertInstanceOf } from "../assert.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";

Deno.test("DomainError - デフォルトコードは VALIDATION", () => {
  const err = new DomainError("テストエラー");
  assertInstanceOf(err, Error);
  assertInstanceOf(err, DomainError);
  assertEquals(err.message, "テストエラー");
  assertEquals(err.code, "VALIDATION");
  assertEquals(err.name, "DomainError");
});

Deno.test("DomainError - NOT_FOUND コードを指定できる", () => {
  const err = new DomainError("見つかりません", "NOT_FOUND");
  assertEquals(err.code, "NOT_FOUND");
  assertEquals(err.message, "見つかりません");
});

Deno.test("DomainError - FORBIDDEN コードを指定できる", () => {
  const err = new DomainError("アクセス拒否", "FORBIDDEN");
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("DomainError - CONFLICT コードを指定できる", () => {
  const err = new DomainError("競合", "CONFLICT");
  assertEquals(err.code, "CONFLICT");
});
