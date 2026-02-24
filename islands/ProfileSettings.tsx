import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

const MAX_FILE_SIZE = 1 * 1024 * 1024;
const OUTPUT_SIZE = 200;

interface ProfileSettingsProps {
  initialName: string;
  initialAvatarUrl: string | null;
  authProvider: string;
}

// deno-lint-ignore no-explicit-any
type CropperInstance = any;

export default function ProfileSettings(
  { initialName, initialAvatarUrl, authProvider }: ProfileSettingsProps,
) {
  const name = useSignal(initialName);
  const avatarDataUrl = useSignal<string | null>(initialAvatarUrl);
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  const cropMode = useSignal(false);
  const cropOriginalSrc = useSignal<string | null>(null);
  const isDragOver = useSignal(false);

  const cropperRef = useRef<CropperInstance>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocal = authProvider === "LOCAL";

  // Cropper.js CSS を一度だけ動的ロード
  useEffect(() => {
    if (document.getElementById("cropperjs-css")) return;
    const link = document.createElement("link");
    link.id = "cropperjs-css";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.css";
    document.head.appendChild(link);
  }, []);

  // cropMode が true になったら Cropper.js を初期化
  useEffect(() => {
    if (!cropMode.value) return;

    let destroyed = false;

    import("https://esm.sh/cropperjs@1.6.2").then(({ default: Cropper }) => {
      if (destroyed || !imgRef.current) return;
      cropperRef.current = new Cropper(imgRef.current, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.8,
        background: false,
        responsive: true,
      });
    });

    return () => {
      destroyed = true;
      cropperRef.current?.destroy();
      cropperRef.current = null;
    };
  }, [cropMode.value]);

  function applyCrop() {
    const cropper: CropperInstance = cropperRef.current;
    if (!cropper) return;
    const canvas: HTMLCanvasElement = cropper.getCroppedCanvas({
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    avatarDataUrl.value = canvas.toDataURL("image/png");
    cropMode.value = false;
    cropOriginalSrc.value = null;
  }

  function cancelCrop() {
    cropMode.value = false;
    cropOriginalSrc.value = null;
  }

  function handleFileSelect(file: File) {
    error.value = null;
    if (!file.type.startsWith("image/")) {
      error.value = "画像ファイルを選択してください";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      error.value = "画像ファイルは1MB以下にしてください";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      cropOriginalSrc.value = ev.target?.result as string;
      cropMode.value = true;
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver.value = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  }

  function handleFileInputChange(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) handleFileSelect(files[0]);
    (e.target as HTMLInputElement).value = "";
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    submitting.value = true;
    error.value = null;
    success.value = null;

    const body: Record<string, string | null> = {};
    if (isLocal) {
      const trimmedName = name.value.trim();
      if (!trimmedName) {
        error.value = "名前を入力してください";
        submitting.value = false;
        return;
      }
      body.name = trimmedName;
    }
    body.avatarUrl = avatarDataUrl.value || null;

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "保存に失敗しました";
        return;
      }
      success.value = "プロフィールを更新しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      submitting.value = false;
    }
  }

  return (
    <div class="space-y-6">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error.value}
        </div>
      )}
      {success.value && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success.value}
        </div>
      )}

      <form onSubmit={handleSubmit} class="space-y-6">
        {/* アバター */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            アバター画像
          </label>

          {cropMode.value && cropOriginalSrc.value
            ? (
              /* Cropper.js トリミングUI */
              <div class="space-y-3">
                <p class="text-xs text-gray-500">ドラッグして位置を調整してください</p>
                <div style={{ width: "100%", maxWidth: "400px", height: "300px" }}>
                  <img
                    ref={imgRef}
                    src={cropOriginalSrc.value}
                    alt="トリミング用"
                    class="block max-w-full"
                  />
                </div>
                <div class="flex gap-3">
                  <button
                    type="button"
                    onClick={applyCrop}
                    class="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                  >
                    切り取る
                  </button>
                  <button
                    type="button"
                    onClick={cancelCrop}
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )
            : (
              /* 通常のアバター表示 + アップロードゾーン */
              <div class="flex items-start gap-4">
                {/* プレビュー */}
                <div class="shrink-0">
                  {avatarDataUrl.value
                    ? (
                      <img
                        src={avatarDataUrl.value}
                        alt="アバタープレビュー"
                        class="w-16 h-16 rounded-full object-cover border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )
                    : (
                      <span class="w-16 h-16 rounded-full bg-brand-100 text-brand-700 text-xl font-semibold flex items-center justify-center">
                        {(isLocal ? name.value : initialName).charAt(0).toUpperCase()}
                      </span>
                    )}
                </div>

                {/* ドロップゾーン */}
                <div class="flex-1 min-w-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    class="hidden"
                    onChange={handleFileInputChange}
                    disabled={submitting.value}
                  />
                  <div
                    class={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      isDragOver.value
                        ? "border-brand-400 bg-brand-50"
                        : "border-gray-300 hover:border-brand-400 hover:bg-gray-50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      isDragOver.value = true;
                    }}
                    onDragLeave={() => (isDragOver.value = false)}
                  >
                    <p class="text-sm text-gray-500">
                      <span class="font-medium text-brand-600">クリックして選択</span>
                      <span class="mx-1">または</span>
                      <span>ドラッグ&ドロップ</span>
                    </p>
                    <p class="text-xs text-gray-400 mt-1">PNG・JPG・GIF等 / 1MBまで</p>
                  </div>
                  {avatarDataUrl.value && (
                    <button
                      type="button"
                      onClick={() => (avatarDataUrl.value = null)}
                      disabled={submitting.value}
                      class="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      アバターを削除
                    </button>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* 名前 */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            名前
          </label>
          {isLocal
            ? (
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                value={name.value}
                onInput={(e) => (name.value = (e.target as HTMLInputElement).value)}
                disabled={submitting.value}
                maxLength={100}
              />
            )
            : (
              <div>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
                  value={initialName}
                  disabled
                />
                <p class="text-xs text-gray-400 mt-1">
                  外部認証で連携されているため、名前の変更はできません
                </p>
              </div>
            )}
        </div>

        {/* 保存ボタン */}
        <div>
          <button
            type="submit"
            disabled={submitting.value}
            class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {submitting.value ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
