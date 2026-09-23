import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class AiService {
  private configured() { return Boolean(process.env.LLM_API_KEY); }

  async explain(issue: { title: string; category: string; severity: string; filePath?: string | null; lineNumber?: number | null; evidence?: string | null; description: string; recommendation: string }) {
    if (!this.configured()) return 'AI is not configured. Set LLM_API_KEY in .env to enable AI explanations.';
    return this.call(`Explain this code-review issue to a developer. Be concise, concrete, and include why it matters, what to change, and one practical example.\n\n${JSON.stringify(issue)}`);
  }

  async fix(issue: { title: string; category: string; severity: string; filePath?: string | null; lineNumber?: number | null; evidence?: string | null; description: string; recommendation: string }) {
    if (!this.configured()) return 'AI is not configured. Set LLM_API_KEY in .env to enable suggested fixes.';
    return this.call(`Generate a safe, minimal suggested fix for this code-review issue. Return only a short explanation followed by a code example when useful. Do not invent unavailable project context.\n\n${JSON.stringify(issue)}`);
  }

  private async call(prompt: string) {
    const base = (process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.LLM_MODEL ?? 'gpt-4.1-mini', temperature: 0.2, messages: [{ role: 'system', content: 'You are CodePilot AI, a code review assistant. Never claim to have executed the repository.' }, { role: 'user', content: prompt }] }),
    });
    if (!response.ok) throw new BadRequestException('LLM request failed');
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content ?? 'The AI returned no text.';
  }
}
