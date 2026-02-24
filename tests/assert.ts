/**
 * ローカルアサーションヘルパー
 * deno.land/std が利用不可の環境で Deno.test と組み合わせて使用する。
 */

export function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(msg ?? `assertEquals failed:\n  actual:   ${a}\n  expected: ${e}`);
  }
}

export function assertInstanceOf<T>(
  actual: unknown,
  // deno-lint-ignore no-explicit-any
  expectedType: new (...args: any[]) => T,
  msg?: string,
): void {
  if (!(actual instanceof expectedType)) {
    throw new Error(
      msg ?? `assertInstanceOf failed: expected instance of ${expectedType.name}`,
    );
  }
}

export async function assertRejects<E extends Error>(
  fn: () => Promise<unknown>,
  // deno-lint-ignore no-explicit-any
  ErrorClass?: new (...args: any[]) => E,
  _msgIncludes?: string,
): Promise<E> {
  try {
    await fn();
  } catch (error) {
    if (ErrorClass && !(error instanceof ErrorClass)) {
      throw new Error(
        `assertRejects: expected ${ErrorClass.name} but got ${
          (error as Error)?.constructor?.name
        }: ${(error as Error)?.message}`,
      );
    }
    return error as E;
  }
  throw new Error("assertRejects: function did not throw");
}
