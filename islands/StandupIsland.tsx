import { useSignal } from "@preact/signals";
import type { JSX } from "preact";

interface ProjectOption {
  id: string;
  name: string;
}

interface StandupRecord {
  id: string;
  content: string;
  date: string;
  projectId: string | null;
  project?: { id: string; name: string } | null;
  createdAt: string;
}

interface StandupIslandProps {
  projects: ProjectOption[];
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} class="text-lg font-bold text-gray-800 mt-5 mb-2">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} class="text-base font-semibold text-gray-700 mt-4 mb-1">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} class="text-xl font-bold text-gray-900 mt-4 mb-3">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={i} class="font-bold text-gray-800 mt-4 mb-1">
          {line.slice(2, -2)}
        </p>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} class="ml-4 text-gray-700 text-sm leading-relaxed list-disc">
          {line.slice(2)}
        </li>,
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} class="h-2" />);
    } else {
      elements.push(
        <p key={i} class="text-gray-700 text-sm leading-relaxed">
          {line}
        </p>,
      );
    }
    i++;
  }

  return <div class="prose prose-sm max-w-none">{elements}</div>;
}

export default function StandupIsland({ projects }: StandupIslandProps) {
  const selectedProjectId = useSignal<string>("");
  const generating = useSignal(false);
  const error = useSignal<string | null>(null);
  const latestStandup = useSignal<StandupRecord | null>(null);
  const standups = useSignal<StandupRecord[]>([]);
  const loaded = useSignal(false);
  const copied = useSignal(false);

  async function loadStandups() {
    try {
      const res = await fetch("/api/standup?limit=10");
      const json = await res.json();
      if (json.success) {
        standups.value = json.data;
      }
    } catch {
      // silent fail for list loading
    }
    loaded.value = true;
  }

  if (!loaded.value) {
    loadStandups();
  }

  async function handleGenerate() {
    generating.value = true;
    error.value = null;
    copied.value = false;

    try {
      const payload: Record<string, string> = {};
      if (selectedProjectId.value) {
        payload.projectId = selectedProjectId.value;
      }

      const res = await fetch("/api/standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "スタンドアップの生成に失敗しました";
        return;
      }

      latestStandup.value = json.data;
      // Reload list
      await loadStandups();
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      generating.value = false;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このスタンドアップを削除しますか?")) return;

    try {
      const res = await fetch(`/api/standup/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        if (latestStandup.value?.id === id) {
          latestStandup.value = null;
        }
        standups.value = standups.value.filter((s) => s.id !== id);
      }
    } catch {
      // silent fail
    }
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <div class="space-y-6">
      {/* Generate section */}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 class="text-base font-bold text-gray-800 mb-4">
          スタンドアップを生成
        </h2>

        <div class="flex items-end gap-3">
          {projects.length > 0 && (
            <div class="flex-1">
              <label class="block text-sm text-gray-600 mb-1">
                プロジェクト（任意）
              </label>
              <select
                class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={selectedProjectId.value}
                onChange={(e) => (selectedProjectId.value = (e.target as HTMLSelectElement).value)}
              >
                <option value="">すべての分報</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating.value}
            class="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {generating.value
              ? (
                <>
                  <span class="animate-spin text-base">&#10227;</span>
                  生成中...
                </>
              )
              : "生成する"}
          </button>
        </div>

        {error.value && (
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 text-sm">
            {error.value}
          </div>
        )}
      </div>

      {/* Latest standup result */}
      {latestStandup.value && (
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-gray-800">生成結果</h2>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(latestStandup.value!.content)}
                class="text-sm text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 border border-brand-300 rounded-lg transition-colors"
              >
                {copied.value ? "コピーしました" : "クリップボードにコピー"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(latestStandup.value!.id)}
                class="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 border border-red-300 rounded-lg transition-colors"
              >
                削除
              </button>
            </div>
          </div>
          <MarkdownRenderer content={latestStandup.value.content} />
          <p class="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
            生成日時: {new Date(latestStandup.value.createdAt).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}

      {/* Past standups */}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          過去のスタンドアップ
        </h2>

        {standups.value.length === 0
          ? (
            <p class="text-gray-400 text-sm text-center py-6">
              スタンドアップはまだありません
            </p>
          )
          : (
            <div class="space-y-4">
              {standups.value.map((s) => (
                <div
                  key={s.id}
                  class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-700">
                        {new Date(s.date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </span>
                      {s.project && (
                        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {s.project.name}
                        </span>
                      )}
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(s.content)}
                        class="text-xs text-gray-500 hover:text-brand-600 transition-colors"
                      >
                        コピー
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        class="text-xs text-gray-500 hover:text-red-600 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div class="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                    {s.content.length > 200 ? s.content.slice(0, 200) + "..." : s.content}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
