import { useSignal } from "@preact/signals";
import type { JSX } from "preact";
import type {
  EntryRecord,
  ReportRecord,
  ReportTemplateRecord,
  ReportType,
} from "../lib/types.ts";

interface ReportViewProps {
  report: ReportRecord | null;
  entries: EntryRecord[];
  reportType: ReportType;
  startDate: string;
  endDate: string;
  userId: string;
  projectId?: string;
  templates?: ReportTemplateRecord[];
}

function MarkdownRenderer({ content }: { content: string }) {
  // Simple markdown renderer for basic formatting
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

export default function ReportView(
  { report: initialReport, entries, reportType, startDate, endDate, projectId, templates }:
    ReportViewProps,
) {
  const report = useSignal<ReportRecord | null>(initialReport);
  const generating = useSignal(false);
  const error = useSignal<string | null>(null);
  const selectedTemplateId = useSignal<string>("");

  const reportTypeLabel = reportType === "DAILY"
    ? "日報"
    : reportType === "WEEKLY"
    ? "週報"
    : "月報";

  async function handleGenerate() {
    generating.value = true;
    error.value = null;

    try {
      const payload: Record<string, unknown> = {
        type: reportType,
        startDate,
        endDate,
      };
      if (projectId) payload.projectId = projectId;

      if (selectedTemplateId.value && templates) {
        const selected = templates.find((t) => t.id === selectedTemplateId.value);
        if (selected) {
          payload.promptTemplate = selected.prompt;
        }
      }

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || `${reportTypeLabel}の生成に失敗しました`;
        return;
      }

      report.value = {
        ...json.data,
        startDate: new Date(json.data.startDate),
        endDate: new Date(json.data.endDate),
        createdAt: new Date(json.data.createdAt),
        updatedAt: new Date(json.data.updatedAt),
      };
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      generating.value = false;
    }
  }

  return (
    <div class="space-y-6">
      {/* Entries summary */}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            分報 ({entries.length}件)
          </h2>
        </div>

        {entries.length === 0
          ? (
            <p class="text-gray-400 text-sm text-center py-6">
              この期間の分報はありません
            </p>
          )
          : (
            <div class="space-y-2 max-h-72 overflow-y-auto">
              {entries.map((entry) => (
                <div key={entry.id} class="flex gap-3 text-sm">
                  <span class="text-gray-400 shrink-0 w-12 text-right">
                    {new Date(entry.createdAt).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <p class="text-gray-700 leading-relaxed">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Report */}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-gray-800">{reportTypeLabel}</h2>
          <div class="flex items-center gap-2">
            {templates && templates.length > 0 && (
              <select
                class="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={selectedTemplateId.value}
                onChange={(e) =>
                  (selectedTemplateId.value =
                    (e.target as HTMLSelectElement).value)}
              >
                <option value="">デフォルト（テンプレートなし）</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating.value || entries.length === 0}
              class="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {generating.value
                ? (
                  <>
                    <span class="animate-spin text-base">⟳</span>
                    生成中...
                  </>
                )
                : (
                  <>
                    ✨ {report.value ? "再生成" : `AIで${reportTypeLabel}を生成`}
                  </>
                )}
            </button>
          </div>
        </div>

        {error.value && (
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error.value}
          </div>
        )}

        {report.value
          ? (
            <div>
              <MarkdownRenderer content={report.value.content} />
              <p class="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
                生成日時: {new Date(report.value.createdAt).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )
          : (
            <div class="text-center py-10 text-gray-400">
              <p class="text-4xl mb-3">📋</p>
              <p class="text-sm">
                {entries.length === 0
                  ? "この期間の分報がないため、レポートを生成できません"
                  : `「AIで${reportTypeLabel}を生成」ボタンを押して自動生成しましょう`}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
