import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { updateProfileUseCase } from "../../../application/user/update-profile.usecase.ts";
import { createUser, mockUserRepository } from "../../helpers.ts";

/**
 * 200x200 の最小限の有効な PNG を data URL として生成する。
 * PNG: signature(8) + IHDR(25) + IDAT(最小) + IEND(12)
 */
function createMinimalPngDataUrl(width = 200, height = 200): string {
  // PNG signature
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  // IHDR chunk: width(4) + height(4) + bitDepth(1) + colorType(1) + compression(1) + filter(1) + interlace(1) = 13 bytes
  const ihdrData = new Uint8Array(13);
  const dv = new DataView(ihdrData.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // CRC32 calculation (simple implementation for test purposes)
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = new TextEncoder().encode(type);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, data.length);
    const crcInput = new Uint8Array(typeBytes.length + data.length);
    crcInput.set(typeBytes, 0);
    crcInput.set(data, typeBytes.length);
    const crcVal = crc32(crcInput);
    const crcBytes = new Uint8Array(4);
    new DataView(crcBytes.buffer).setUint32(0, crcVal);
    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    chunk.set(len, 0);
    chunk.set(typeBytes, 4);
    chunk.set(data, 8);
    chunk.set(crcBytes, 8 + data.length);
    return chunk;
  }

  const ihdrChunk = makeChunk("IHDR", ihdrData);

  // IDAT: minimal deflate stream (empty image data with zlib header)
  const idatData = new Uint8Array([
    0x08,
    0xd7,
    0x01,
    0x00,
    0x00,
    0xff,
    0xff,
    0x00,
    0x01,
    0x00,
    0x01,
  ]);
  const idatChunk = makeChunk("IDAT", idatData);

  const iendChunk = makeChunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length,
  );
  let offset = 0;
  png.set(sig, offset);
  offset += sig.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(iendChunk, offset);

  // Convert to base64
  let binary = "";
  for (const byte of png) {
    binary += String.fromCharCode(byte);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

function baseDeps() {
  const user = createUser({ id: "user-1" });
  return {
    userRepository: mockUserRepository({
      findById: () => Promise.resolve(user),
      updateProfile: (_id: string, params: { name?: string; avatarUrl?: string | null }) =>
        Promise.resolve(createUser({ id: "user-1", ...params })),
    }),
  };
}

// ── 名前のバリデーション ──

Deno.test("updateProfile - 正常に名前を更新できる", async () => {
  const deps = baseDeps();
  const result = await updateProfileUseCase(deps, {
    userId: "user-1",
    name: "新しい名前",
  });
  assertEquals(result.name, "新しい名前");
});

Deno.test("updateProfile - 存在しないユーザーは NOT_FOUND", async () => {
  const deps = {
    userRepository: mockUserRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => updateProfileUseCase(deps, { userId: "no-such", name: "test" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("updateProfile - 空の名前はバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () => updateProfileUseCase(deps, { userId: "user-1", name: "" }),
    DomainError,
  );
  assertEquals(err.message, "名前を入力してください");
});

Deno.test("updateProfile - 空白のみの名前はバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () => updateProfileUseCase(deps, { userId: "user-1", name: "   " }),
    DomainError,
  );
  assertEquals(err.message, "名前を入力してください");
});

Deno.test("updateProfile - 名前が50文字超はバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () => updateProfileUseCase(deps, { userId: "user-1", name: "あ".repeat(51) }),
    DomainError,
  );
  assertEquals(err.message, "名前は50文字以内で入力してください");
});

Deno.test("updateProfile - 50文字ちょうどの名前は許容される", async () => {
  const deps = baseDeps();

  await updateProfileUseCase(deps, {
    userId: "user-1",
    name: "あ".repeat(50),
  });
});

// ── アバターURL（外部URL）のバリデーション ──

Deno.test("updateProfile - 有効な外部URLは許容される", async () => {
  const deps = baseDeps();

  await updateProfileUseCase(deps, {
    userId: "user-1",
    avatarUrl: "https://example.com/avatar.png",
  });
});

Deno.test("updateProfile - http URLも許容される", async () => {
  const deps = baseDeps();

  await updateProfileUseCase(deps, {
    userId: "user-1",
    avatarUrl: "http://example.com/avatar.png",
  });
});

Deno.test("updateProfile - ftp URLはバリデーションエラー", async () => {
  const deps = baseDeps();

  await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: "ftp://example.com/avatar.png",
      }),
    DomainError,
  );
});

Deno.test("updateProfile - 不正なURL形式はバリデーションエラー", async () => {
  const deps = baseDeps();

  await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: "not-a-url",
      }),
    DomainError,
  );
});

Deno.test("updateProfile - avatarUrl を null に設定できる", async () => {
  const deps = baseDeps();

  const result = await updateProfileUseCase(deps, {
    userId: "user-1",
    avatarUrl: null,
  });
  assertEquals(result.avatarUrl, null);
});

// ── アバターPNG data URLのバリデーション ──

Deno.test("updateProfile - 有効なPNG data URLは許容される", async () => {
  const deps = baseDeps();
  const dataUrl = createMinimalPngDataUrl(200, 200);

  await updateProfileUseCase(deps, {
    userId: "user-1",
    avatarUrl: dataUrl,
  });
});

Deno.test("updateProfile - PNG以外のdata URLはバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: "data:image/jpeg;base64,/9j/4AAQ",
      }),
    DomainError,
  );
  assertEquals(err.message, "アバター画像はPNG形式でアップロードしてください");
});

Deno.test("updateProfile - 不正なbase64はバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: "data:image/png;base64,!!!invalid!!!",
      }),
    DomainError,
  );
  assertEquals(err.message, "アバター画像のデータが不正です");
});

Deno.test("updateProfile - 200x200以外のサイズはバリデーションエラー", async () => {
  const deps = baseDeps();
  const dataUrl = createMinimalPngDataUrl(100, 100);

  const err = await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: dataUrl,
      }),
    DomainError,
  );
  assertEquals(err.message.includes("200×200"), true);
});

Deno.test("updateProfile - PNGシグネチャが不正な場合はバリデーションエラー", async () => {
  const deps = baseDeps();
  // Valid base64 but not a PNG (just random bytes that decode fine)
  const fakeData = new Uint8Array(30);
  fakeData[0] = 0x00; // Not PNG signature
  let binary = "";
  for (const byte of fakeData) {
    binary += String.fromCharCode(byte);
  }
  const dataUrl = `data:image/png;base64,${btoa(binary)}`;

  const err = await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: dataUrl,
      }),
    DomainError,
  );
  assertEquals(err.message, "アバター画像はPNG形式でアップロードしてください");
});
