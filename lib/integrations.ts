/**
 * Slack/Discord Webhook連携
 */

/**
 * Slack Incoming Webhookでメッセージ投稿
 */
export async function postToSlack(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Slack Webhook送信に失敗しました (${res.status}): ${body}`);
  }
}

/**
 * Discord Webhookでメッセージ投稿
 */
export async function postToDiscord(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord Webhook送信に失敗しました (${res.status}): ${body}`);
  }
}
