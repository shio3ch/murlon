import type { AIProvider } from "./provider.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

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

export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
    this.model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
  }

  async generateText(prompt: string): Promise<string> {
    const messages: AnthropicMessage[] = [
      { role: "user", content: prompt },
    ];

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
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
}
