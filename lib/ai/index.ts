import type { AIProvider } from "./provider.ts";
import { AnthropicProvider } from "./anthropic.ts";
import { OpenAICompatibleProvider } from "./openai-compatible.ts";

export type { AIProvider } from "./provider.ts";

type AIProviderType = "anthropic" | "openai-compatible";

let cachedProvider: AIProvider | null = null;

/**
 * 環境変数 AI_PROVIDER に基づいてAIプロバイダーを取得する
 */
export function getAIProvider(): AIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType =
    (Deno.env.get("AI_PROVIDER") as AIProviderType) ?? "openai-compatible";

  switch (providerType) {
    case "anthropic":
      cachedProvider = new AnthropicProvider();
      break;
    case "openai-compatible":
      cachedProvider = new OpenAICompatibleProvider();
      break;
    default:
      throw new Error(
        `未対応のAIプロバイダー: ${providerType}。` +
        `"anthropic" または "openai-compatible" を指定してください。`
      );
  }

  return cachedProvider;
}
