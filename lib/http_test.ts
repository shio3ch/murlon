import { assertEquals } from "$std/assert/mod.ts";
import { DomainError } from "../domain/shared/domain-error.ts";
import { domainErrorResponse, unauthorized } from "./http.ts";

Deno.test("unauthorized - 401レスポンスを返す", async () => {
  const res = unauthorized();
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body, { success: false, error: "認証が必要です" });
});

Deno.test("domainErrorResponse - NOT_FOUNDは404を返す", async () => {
  const error = new DomainError("見つかりません", "NOT_FOUND");
  const res = domainErrorResponse(error);
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body, { success: false, error: "見つかりません" });
});

Deno.test("domainErrorResponse - FORBIDDENは403を返す", async () => {
  const error = new DomainError("アクセス拒否", "FORBIDDEN");
  const res = domainErrorResponse(error);
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body, { success: false, error: "アクセス拒否" });
});

Deno.test("domainErrorResponse - CONFLICTは409を返す", async () => {
  const error = new DomainError("競合", "CONFLICT");
  const res = domainErrorResponse(error);
  assertEquals(res.status, 409);
  const body = await res.json();
  assertEquals(body, { success: false, error: "競合" });
});

Deno.test("domainErrorResponse - VALIDATIONは400を返す", async () => {
  const error = new DomainError("バリデーションエラー");
  const res = domainErrorResponse(error);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body, { success: false, error: "バリデーションエラー" });
});
