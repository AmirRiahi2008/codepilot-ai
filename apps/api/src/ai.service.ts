import { BadRequestException, Injectable } from '@nestjs/common';

type IssueInput = {
  title: string;
  category: string;
  severity: string;
  filePath?: string | null;
  lineNumber?: number | null;
  evidence?: string | null;
  description: string;
  recommendation: string;
};

const DEFAULT_BASE_URL = 'http://localhost:11434/v1';
const DEFAULT_MODEL = 'qwen2.5-coder:7b';

@Injectable()
export class AiService {
  private getBaseUrl() {
    return (
      process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL
    ).replace(/\/$/, '');
  }

  private getModel() {
    return process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
  }

  private configured() {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.LLM_API_KEY?.trim();

    const isLocal =
      baseUrl.includes('localhost') ||
      baseUrl.includes('127.0.0.1');

    return isLocal || Boolean(apiKey);
  }

  async explain(issue: IssueInput) {
    if (!this.configured()) {
      return 'AI is not configured.';
    }

    return this.call(
      `Explain this code-review issue to a developer.

Be concise and concrete.

Include:
1. Why it matters.
2. What should be changed.
3. One practical example when useful.

Do not claim that you executed or tested the repository.

Issue:
${JSON.stringify(issue, null, 2)}`,
    );
  }

  async fix(issue: IssueInput) {
    if (!this.configured()) {
      return 'AI is not configured.';
    }

    return this.call(
      `Generate a safe and minimal suggested fix for this code-review issue.

Rules:
- Do not invent unavailable project context.
- Explain the recommended change briefly.
- Include a code example when useful.
- Do not claim that you executed or tested the repository.

Issue:
${JSON.stringify(issue, null, 2)}`,
    );
  }

  private async call(prompt: string) {
    const baseUrl = this.getBaseUrl();
    const model = this.getModel();
    const apiKey = process.env.LLM_API_KEY?.trim();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are CodePilot AI, a senior software engineer specializing in secure code review.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');

      throw new BadRequestException(
        `LLM request failed: ${response.status} ${errorBody.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      return 'The AI returned no text.';
    }

    return content.trim();
  }
}