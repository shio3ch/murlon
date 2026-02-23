import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { InsightsData } from "../routes/api/insights/index.ts";

export default function InsightsIsland() {
  const data = useSignal<InsightsData | null>(null);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const period = useSignal<"30d" | "90d">("30d");

  async function fetchInsights(p: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/insights?period=${p}`);
      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "データの取得に失敗しました";
        return;
      }
      data.value = json.data;
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      loading.value = false;
    }
  }

  useEffect(() => {
    fetchInsights(period.value);
  }, []);

  function handlePeriodChange(p: "30d" | "90d") {
    period.value = p;
    fetchInsights(p);
  }

  if (loading.value) {
    return (
      <div class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        <span class="ml-3 text-gray-500">データを読み込み中...</span>
      </div>
    );
  }

  if (error.value) {
    return (
      <div class="text-center py-12">
        <p class="text-red-500">{error.value}</p>
        <button
          type="button"
          onClick={() => fetchInsights(period.value)}
          class="mt-4 text-sm text-brand-600 hover:underline"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (!data.value) return null;

  const { projectStats, taskStats, tensionHistory, stalledProjects, activitySummary } = data.value;

  return (
    <div class="space-y-6">
      {/* Period selector */}
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">期間:</span>
        {(["30d", "90d"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePeriodChange(p)}
            class={`text-sm px-3 py-1 rounded-lg font-medium transition-colors ${
              period.value === p
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p === "30d" ? "30日" : "90日"}
          </button>
        ))}
      </div>

      {/* Activity summary cards */}
      <div class="grid grid-cols-3 gap-4">
        <SummaryCard label="今週" count={activitySummary.thisWeek} />
        <SummaryCard label="今月" count={activitySummary.thisMonth} />
        <SummaryCard label="累計" count={activitySummary.total} />
      </div>

      {/* Tension history chart */}
      {tensionHistory.length > 0 && (
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">テンション推移</h3>
          <TensionChart data={tensionHistory} />
        </div>
      )}

      {/* Project stats */}
      {projectStats.length > 0 && (
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">プロジェクト別分報数</h3>
          <ProjectBarChart data={projectStats} />
        </div>
      )}

      {/* Task stats */}
      {taskStats.length > 0 && (
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">タスク別分報数</h3>
          <div class="space-y-2">
            {taskStats.map((t) => (
              <div key={t.taskTitle} class="flex items-center justify-between text-sm">
                <span class="text-gray-700 truncate max-w-[70%]">{t.taskTitle}</span>
                <span class="text-gray-500 font-medium">{t.entryCount}件</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stalled projects */}
      {stalledProjects.length > 0 && (
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">停滞中のプロジェクト</h3>
          <div class="space-y-2">
            {stalledProjects.map((p) => (
              <div key={p.id} class="flex items-center justify-between text-sm">
                <span class="text-gray-700">{p.name}</span>
                <span class="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {p.daysSinceLastEntry === -1 ? "投稿なし" : `${p.daysSinceLastEntry}日間停滞`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, count }: { label: string; count: number }) {
  return (
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
      <p class="text-xs text-gray-500 mb-1">{label}</p>
      <p class="text-2xl font-bold text-brand-600">{count}</p>
      <p class="text-xs text-gray-400">件</p>
    </div>
  );
}

interface TensionChartProps {
  data: { date: string; avgTension: number }[];
}

function TensionChart({ data }: TensionChartProps) {
  if (data.length === 0) return null;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minY = 1;
  const maxY = 5;

  function x(i: number): number {
    return padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  }

  function y(val: number): number {
    return padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
  }

  const points = data.map((d, i) => `${x(i)},${y(d.avgTension)}`).join(" ");

  // 横軸ラベル: 最大5個表示
  const labelStep = Math.max(1, Math.floor(data.length / 5));
  const labels = data.filter((_, i) => i % labelStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} class="w-full" style={{ maxHeight: "220px" }}>
      {/* Grid lines */}
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line
            x1={padding.left}
            y1={y(v)}
            x2={width - padding.right}
            y2={y(v)}
            stroke="#e5e7eb"
            stroke-width="1"
          />
          <text
            x={padding.left - 8}
            y={y(v) + 4}
            text-anchor="end"
            fill="#9ca3af"
            font-size="11"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#4f46e5"
        stroke-width="2"
        stroke-linejoin="round"
      />

      {/* Data points */}
      {data.map((d, i) => (
        <circle
          key={d.date}
          cx={x(i)}
          cy={y(d.avgTension)}
          r="3.5"
          fill="#4f46e5"
          stroke="white"
          stroke-width="1.5"
        />
      ))}

      {/* X-axis labels */}
      {labels.map((d) => {
        const idx = data.indexOf(d);
        const dateStr = d.date.slice(5); // MM-DD
        return (
          <text
            key={d.date}
            x={x(idx)}
            y={height - 8}
            text-anchor="middle"
            fill="#9ca3af"
            font-size="10"
          >
            {dateStr}
          </text>
        );
      })}
    </svg>
  );
}

interface ProjectBarChartProps {
  data: { projectName: string; entryCount: number; lastEntryAt: string | null }[];
}

function ProjectBarChart({ data }: ProjectBarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.entryCount), 1);

  return (
    <div class="space-y-2">
      {data.map((d) => (
        <div key={d.projectName} class="flex items-center gap-3">
          <span class="text-sm text-gray-700 w-28 truncate shrink-0" title={d.projectName}>
            {d.projectName}
          </span>
          <div class="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              class="bg-brand-500 h-full rounded-full transition-all"
              style={{ width: `${(d.entryCount / maxCount) * 100}%` }}
            />
          </div>
          <span class="text-sm text-gray-500 font-medium w-12 text-right shrink-0">
            {d.entryCount}件
          </span>
        </div>
      ))}
    </div>
  );
}
