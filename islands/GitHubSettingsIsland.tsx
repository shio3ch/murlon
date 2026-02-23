import { useSignal } from "@preact/signals";

interface GitHubConnectionData {
  githubLogin: string;
  lastImportedAt: string | null;
}

interface RepoData {
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  private: boolean;
  updatedAt: string;
}

interface GitHubSettingsProps {
  connection: GitHubConnectionData | null;
}

export default function GitHubSettingsIsland(
  { connection: initialConnection }: GitHubSettingsProps,
) {
  const connection = useSignal<GitHubConnectionData | null>(initialConnection);
  const repos = useSignal<RepoData[]>([]);
  const reposLoaded = useSignal(false);
  const reposLoading = useSignal(false);
  const selectedRepo = useSignal<RepoData | null>(null);
  const importing = useSignal(false);
  const disconnecting = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);
  const sinceDays = useSignal("7");

  async function handleDisconnect() {
    if (!confirm("GitHub連携を解除しますか？")) return;

    disconnecting.value = true;
    error.value = null;

    try {
      const res = await fetch("/api/github/disconnect", { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "解除に失敗しました";
        return;
      }
      connection.value = null;
      repos.value = [];
      reposLoaded.value = false;
      selectedRepo.value = null;
      success.value = "GitHub連携を解除しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      disconnecting.value = false;
    }
  }

  async function handleLoadRepos() {
    reposLoading.value = true;
    error.value = null;

    try {
      const res = await fetch("/api/github/repos");
      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "リポジトリの取得に失敗しました";
        return;
      }
      repos.value = json.data;
      reposLoaded.value = true;
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      reposLoading.value = false;
    }
  }

  async function handleImport() {
    if (!selectedRepo.value) {
      error.value = "リポジトリを選択してください";
      return;
    }

    importing.value = true;
    error.value = null;
    success.value = null;

    const days = parseInt(sinceDays.value, 10) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const res = await fetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selectedRepo.value.owner,
          repo: selectedRepo.value.name,
          since: since.toISOString(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "インポートに失敗しました";
        return;
      }

      success.value = `${json.data.importedCount}件のコミットをインポートしました`;
      if (connection.value) {
        connection.value = {
          ...connection.value,
          lastImportedAt: new Date().toISOString(),
        };
      }
      setTimeout(() => (success.value = null), 5000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      importing.value = false;
    }
  }

  // 未連携
  if (!connection.value) {
    return (
      <div class="space-y-4">
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
        <div class="text-center py-10 text-gray-400">
          <p class="text-4xl mb-3">&#x1F4BB;</p>
          <p class="text-sm mb-4">GitHubアカウントが連携されていません</p>
          <a
            href="/api/github/auth"
            class="inline-block bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            GitHubと連携する
          </a>
        </div>
      </div>
    );
  }

  // 連携済み
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

      {/* 連携情報 */}
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                連携済み
              </span>
              <span class="text-sm font-medium text-gray-900">
                @{connection.value.githubLogin}
              </span>
            </div>
            {connection.value.lastImportedAt && (
              <p class="text-xs text-gray-500">
                最終インポート: {new Date(connection.value.lastImportedAt).toLocaleString("ja-JP")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting.value}
            class="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
          >
            {disconnecting.value ? "解除中..." : "連携解除"}
          </button>
        </div>
      </div>

      {/* コミットインポート */}
      <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h3 class="text-sm font-semibold text-gray-900">
          コミットをインポート
        </h3>
        <p class="text-xs text-gray-500">
          GitHubリポジトリのコミットを分報として取り込みます
        </p>

        {!reposLoaded.value
          ? (
            <button
              type="button"
              onClick={handleLoadRepos}
              disabled={reposLoading.value}
              class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {reposLoading.value ? "読み込み中..." : "リポジトリを読み込む"}
            </button>
          )
          : (
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  リポジトリ
                </label>
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  value={selectedRepo.value?.fullName || ""}
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    selectedRepo.value = repos.value.find((r) => r.fullName === val) || null;
                  }}
                  disabled={importing.value}
                >
                  <option value="">-- 選択してください --</option>
                  {repos.value.map((r) => (
                    <option key={r.fullName} value={r.fullName}>
                      {r.fullName}
                      {r.private ? " (private)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  取得期間（過去N日）
                </label>
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  value={sinceDays.value}
                  onChange={(e) => (sinceDays.value = (e.target as HTMLSelectElement).value)}
                  disabled={importing.value}
                >
                  <option value="1">1日</option>
                  <option value="3">3日</option>
                  <option value="7">7日</option>
                  <option value="14">14日</option>
                  <option value="30">30日</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={importing.value || !selectedRepo.value}
                class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {importing.value ? "インポート中..." : "インポート実行"}
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
