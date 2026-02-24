import { DomainError } from "../../domain/shared/domain-error.ts";
import type { User } from "../../domain/user/user.entity.ts";
import type { IUserRepository } from "../../domain/user/user.repository.ts";

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  avatarUrl?: string | null;
}

export interface UpdateProfileDeps {
  userRepository: IUserRepository;
}

/**
 * PNG data URL のバリデーション
 * - data:image/png;base64,... 形式であること
 * - デコード後のサイズが 1MB 以下であること
 * - PNG シグネチャが正しいこと
 * - 200×200 ピクセルであること
 */
function validateAvatarDataUrl(dataUrl: string): void {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) {
    throw new DomainError("アバター画像はPNG形式でアップロードしてください");
  }

  const base64 = dataUrl.slice(prefix.length);
  let bytes: Uint8Array;
  try {
    const binaryString = atob(base64);
    bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
  } catch {
    throw new DomainError("アバター画像のデータが不正です");
  }

  if (bytes.length > 1 * 1024 * 1024) {
    throw new DomainError("アバター画像は1MB以下にしてください");
  }

  // PNG シグネチャ確認: 89 50 4E 47 0D 0A 1A 0A
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24) {
    throw new DomainError("アバター画像のデータが不正です");
  }
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSig[i]) {
      throw new DomainError("アバター画像はPNG形式でアップロードしてください");
    }
  }

  // IHDR チャンク確認（オフセット 8〜）: length(4) + type(4) + width(4) + height(4) ...
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunkType !== "IHDR") {
    throw new DomainError("アバター画像のデータが不正です");
  }

  const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
  const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;

  if (width !== 200 || height !== 200) {
    throw new DomainError(
      `アバター画像は200×200ピクセルである必要があります（現在: ${width}×${height}）`,
    );
  }
}

export async function updateProfileUseCase(
  deps: UpdateProfileDeps,
  input: UpdateProfileInput,
): Promise<User> {
  const user = await deps.userRepository.findById(input.userId);
  if (!user) {
    throw new DomainError("ユーザーが見つかりません", "NOT_FOUND");
  }

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name || name.length < 1) {
      throw new DomainError("名前を入力してください");
    }
    if (name.length > 50) {
      throw new DomainError("名前は50文字以内で入力してください");
    }
    input.name = name;
  }

  if (input.avatarUrl !== undefined && input.avatarUrl !== null) {
    const val = input.avatarUrl;
    if (val.startsWith("data:")) {
      // アップロードされた画像: PNG data URL として検証
      validateAvatarDataUrl(val);
    } else {
      // 既存の外部URL（OAuth連携ユーザー等）: http/https URL として検証
      try {
        const url = new URL(val);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new DomainError("アバターURLはhttp/https形式で指定してください");
        }
      } catch (e) {
        if (e instanceof DomainError) throw e;
        throw new DomainError("アバターURLの形式が正しくありません");
      }
    }
  }

  return await deps.userRepository.updateProfile(input.userId, {
    ...(input.name !== undefined && { name: input.name }),
    ...("avatarUrl" in input && { avatarUrl: input.avatarUrl }),
  });
}
