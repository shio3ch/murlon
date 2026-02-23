import { useSignal } from "@preact/signals";
import type { ProjectRecord } from "../lib/types.ts";

interface IntegrationSetting {
  id: string;
  userId: string;
  projectId: string | null;
  type: "SLACK" | "DISCORD";
  webhookUrl: string;
  channelName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationSettingsProps {
  projects: ProjectRecord[];
}

const TYPE_LABELS: Record<"SLACK" | "DISCORD", string> = {
  SLACK: "Slack",
  DISCORD: "Discord",
};

export default function IntegrationSettingsIsland(
  { projects }: IntegrationSettingsProps,
) {
  const settings = useSignal<IntegrationSetting[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);
  const showForm = useSignal(false);
  const submitting = useSignal(false);

  // 新規作成フォーム
  const formType = useSignal<"SLACK" | "DISCORD">("SLACK");
  const formWebhookUrl = useSignal("");
  const formChannelName = useSignal("");
  const formProjectId = useSignal("");

  // 初回ロード
  const loaded = useSignal(false);
  if (!loaded.value) {
    loaded.value = true;
    fetchSettings();
  }

  async function fetchSettings() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/integrations");
      const json = await res.json();
      if (json.success) {
        settings.value = json.data;
      } else {
        error.value = json.error || "設定の取得に失敗しました";
      }
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    formType.value = "SLACK";
    formWebhookUrl.value = "";
    formChannelName.value = "";
    formProjectId.value = "";
    showForm.value = false;
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    const webhookUrl = formWebhookUrl.value.trim();
    if (!webhookUrl) {
      error.value = "Webhook URLを入力してください";
      return;
    }
    if (!webhookUrl.startsWith("https://")) {
      error.value = "Webhook URLはhttps://から始まる必要があります";
      return;
    }

    submitting.value = true;
    error.value = null;
    success.value = null;

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType.value,
          webhookUrl,
          channelName: formChannelName.value.trim() || undefined,
          projectId: formProjectId.value || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "作成に失敗しました";
        return;
      }

      settings.value = [json.data, ...settings.value];
      resetForm();
      success.value = "連携設定を作成しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      submitting.value = false;
    }
  }

  async function handleToggle(setting: IntegrationSetting) {
    error.value = null;
    success.value = null;

    try {
      const res = await fetch(`/api/integrations/${setting.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !setting.enabled }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "更新に失敗しました";
        return;
      }

      settings.value = settings.value.map((s) => s.id === setting.id ? json.data : s);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    }
  }

  async function handleDelete(setting: IntegrationSetting) {
    if (!confirm(`${TYPE_LABELS[setting.type]}連携を削除しますか？`)) {
      return;
    }

    error.value = null;
    success.value = null;

    try {
      const res = await fetch(`/api/integrations/${setting.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "削除に失敗しました";
        return;
      }

      settings.value = settings.value.filter((s) => s.id !== setting.id);
      success.value = "連携設定を削除しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    }
  }

  async function handleTest(setting: IntegrationSetting) {
    error.value = null;
    success.value = null;

    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: setting.id }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "テスト送信に失敗しました";
        return;
      }

      success.value = `${TYPE_LABELS[setting.type]}へのテスト送信が成功しました`;
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    }
  }

  function getProjectName(projectId: string | null): string {
    if (!projectId) return "全体";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : "不明なプロジェクト";
  }

  if (loading.value) {
    return (
      <div class="text-center py-10 text-gray-400">
        <p class="text-sm">読み込み中...</p>
      </div>
    );
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

      {/* 既存の設定一覧 */}
      {settings.value.length === 0 && !showForm.value && (
        <div class="text-center py-10 text-gray-400">
          <p class="text-4xl mb-3">🔗</p>
          <p class="text-sm">連携設定はまだありません</p>
        </div>
      )}

      <div class="space-y-4">
        {settings.value.map((setting) => (
          <div
            key={setting.id}
            class={`border rounded-lg p-4 ${
              setting.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-70"
            }`}
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span
                  class={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    setting.type === "SLACK"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {TYPE_LABELS[setting.type]}
                </span>
                {setting.channelName && (
                  <span class="text-sm text-gray-600">
                    #{setting.channelName}
                  </span>
                )}
                <span class="text-xs text-gray-400">
                  ({getProjectName(setting.projectId)})
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(setting)}
                  class={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    setting.enabled ? "bg-brand-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    class={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      setting.enabled ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div class="text-xs text-gray-500 mb-3 break-all">
              {setting.webhookUrl}
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTest(setting)}
                class="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                テスト送信
              </button>
              <button
                type="button"
                onClick={() => handleDelete(setting)}
                class="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 新規追加ボタン / フォーム */}
      {!showForm.value
        ? (
          <button
            type="button"
            onClick={() => (showForm.value = true)}
            class="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            + 新しい連携を追加
          </button>
        )
        : (
          <form
            onSubmit={handleCreate}
            class="bg-white border border-brand-200 rounded-lg p-4 space-y-4"
          >
            <h3 class="text-sm font-semibold text-gray-900">
              新しい連携設定
            </h3>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                連携タイプ <span class="text-red-500">*</span>
              </label>
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                value={formType.value}
                onChange={(
                  e,
                ) => (formType.value = (e.target as HTMLSelectElement).value as
                  | "SLACK"
                  | "DISCORD")}
                disabled={submitting.value}
              >
                <option value="SLACK">Slack</option>
                <option value="DISCORD">Discord</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL <span class="text-red-500">*</span>
              </label>
              <input
                type="url"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                placeholder="https://hooks.slack.com/services/..."
                value={formWebhookUrl.value}
                onInput={(e) => (formWebhookUrl.value = (e.target as HTMLInputElement).value)}
                disabled={submitting.value}
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                チャンネル名（任意）
              </label>
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                placeholder="general"
                value={formChannelName.value}
                onInput={(e) => (formChannelName.value = (e.target as HTMLInputElement).value)}
                disabled={submitting.value}
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                プロジェクト（任意）
              </label>
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                value={formProjectId.value}
                onChange={(e) => (formProjectId.value = (e.target as HTMLSelectElement).value)}
                disabled={submitting.value}
              >
                <option value="">全体（プロジェクト指定なし）</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting.value}
                class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {submitting.value ? "保存中..." : "作成"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                class="text-sm text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
    </div>
  );
}
