import type { AIProvider } from "./provider.ts";

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OpenAICompatibleProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseUrl = Deno.env.get("OPENAI_API_BASE") ?? "http://localhost:11434/v1";
    this.apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    this.model = Deno.env.get("OPENAI_MODEL") ?? "gemma3";
  }

  async generateText(prompt: string): Promise<string> {
    const messages: OpenAIChatMessage[] = [
      { role: "user", content: prompt },
    ];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI Compatible API error: ${response.status} - ${errorText}`
      );
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error("No content in OpenAI Compatible API response");
    }
    return choice.message.content;
  }
}
