import type { EntryRecord, ReportType } from "./types.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  id: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Call the Anthropic Claude API directly via fetch (no SDK)
 */
async function callClaude(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const messages: AnthropicMessage[] = [
    { role: "user", content: prompt },
  ];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textContent = data.content.find((c) => c.type === "text");
  if (!textContent) {
    throw new Error("No text content in Anthropic response");
  }
  return textContent.text;
}

/**
 * Format entries into a readable list for the AI prompt
 */
function formatEntries(entries: EntryRecord[]): string {
  return entries
    .map((e) => {
      const time = new Date(e.createdAt).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${time}] ${e.content}`;
    })
    .join("\n");
}

/**
 * Build a date range label for the report
 */
function buildDateLabel(startDate: Date, endDate: Date, type: ReportType): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  switch (type) {
    case "DAILY":
      return fmt(startDate);
    case "WEEKLY":
      return `${fmt(startDate)} 〜 ${fmt(endDate)}`;
    case "MONTHLY":
      return startDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  }
}

/**
 * Generate a report from a list of entries using Claude
 */
export async function generateReport(
  entries: EntryRecord[],
  type: ReportType,
  startDate: Date,
  endDate: Date,
): Promise<string> {
  if (entries.length === 0) {
    throw new Error("レポートを生成するための分報がありません");
  }

  const reportTypeLabel =
    type === "DAILY" ? "日報" : type === "WEEKLY" ? "週報" : "月報";
  const dateLabel = buildDateLabel(startDate, endDate, type);
  const entryList = formatEntries(entries);

  const prompt = `以下は、${dateLabel}の作業ログ（分報）です。
この内容をもとに、ビジネスで使える${reportTypeLabel}を日本語で作成してください。

## 分報一覧
${entryList}

## ${reportTypeLabel}のフォーマット要件
- 本日（または期間）の作業サマリー
- 完了したタスク（箇条書き）
- 課題・懸念事項（あれば）
- 明日（または次の期間）の予定
- 所感・メモ（あれば）

読みやすく、プロフェッショナルなビジネス文書として整形してください。
Markdownフォーマットで出力してください。`;

  return await callClaude(prompt);
}

/**
 * Generate insights from recent entries
 */
export async function generateInsights(entries: EntryRecord[]): Promise<string> {
  if (entries.length === 0) {
    throw new Error("インサイトを生成するための分報がありません");
  }

  const entryList = formatEntries(entries);

  const prompt = `以下の作業ログを分析して、生産性向上のためのインサイトと提案を日本語で3〜5点挙げてください。

## 作業ログ
${entryList}

簡潔で実践的なアドバイスをMarkdownの箇条書きで出力してください。`;

  return await callClaude(prompt);
}
