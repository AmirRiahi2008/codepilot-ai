type Issue = {
  title: string;
  severity: string;
  category: string;
  filePath?: string;
  lineNumber?: number;
  description: string;
  recommendation: string;
  evidence?: string;
};

type AiExplanation = {
  explanation?: string;
  fix?: string;
};

type AiResponse = {
  items?: Array<{
    index?: number;
    explanation?: unknown;
    fix?: unknown;
  }>;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_ISSUES = 20;
const MAX_TEXT_LENGTH = 2000;

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const text = value.trim();

  if (!text) {
    return undefined;
  }

  return text.slice(0, maxLength);
}

function extractJson(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('LLM returned invalid JSON');
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function buildPrompt(issues: Issue[]) {
  return `
You are an expert software engineer performing static code-review analysis.

Your task is to enrich the provided findings with:
1. A concise explanation of why each finding matters.
2. A practical suggested fix.

Important rules:
- Return ONLY valid JSON.
- Do not return Markdown.
- Do not wrap the JSON in code fences.
- Do not claim that you executed, ran, compiled, tested, or verified the repository.
- Base your response only on the provided findings.
- Do not invent files, line numbers, APIs, dependencies, or behavior that are not supported by the finding.
- Keep explanations concise and technically accurate.
- Keep fixes practical and actionable.
- If there is not enough information for a specific fix, provide a safe general recommendation instead.
- Preserve the issue index exactly.

Required JSON format:
{
  "items": [
    {
      "index": 0,
      "explanation": "Why this issue matters.",
      "fix": "How the developer can address it."
    }
  ]
}

Findings:
${JSON.stringify(issues.slice(0, MAX_ISSUES), null, 2)}
`.trim();
}

export async function enrichWithAi(issues: Issue[]) {
  const explanations = new Map<string, AiExplanation>();

  if (!issues.length) {
    return { explanations };
  }

  const key = process.env.LLM_API_KEY?.trim();

  if (!key) {
    console.warn('LLM_API_KEY is not configured. Skipping AI enrichment.');
    return { explanations };
  }

  const baseUrl = (
    process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/$/, '');

  const model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;

  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const prompt = buildPrompt(issues);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a precise senior software engineer specializing in secure static code review.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');

      console.warn(
        `LLM request failed: ${response.status} ${response.statusText}`,
        errorBody.slice(0, 500),
      );

      return { explanations };
    }

    const body = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };

    const content = body.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      console.warn('LLM returned an empty response.');
      return { explanations };
    }

    let parsed: AiResponse;

    try {
      const json = extractJson(content);
      parsed = JSON.parse(json) as AiResponse;
    } catch (error) {
      console.warn(
        'Failed to parse LLM JSON response:',
        error instanceof Error ? error.message : error,
      );

      return { explanations };
    }

    if (!Array.isArray(parsed.items)) {
      console.warn('LLM response does not contain a valid items array.');
      return { explanations };
    }

    for (const item of parsed.items) {
      if (
        typeof item.index !== 'number' ||
        !Number.isInteger(item.index) ||
        item.index < 0 ||
        item.index >= issues.length
      ) {
        continue;
      }

      const explanation = cleanText(item.explanation);
      const fix = cleanText(item.fix);

      if (!explanation && !fix) {
        continue;
      }

      explanations.set(String(item.index), {
        explanation,
        fix,
      });
    }

    console.log(
      `AI enrichment completed: ${explanations.size}/${Math.min(
        issues.length,
        MAX_ISSUES,
      )} issues enriched.`,
    );

    return { explanations };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`LLM request timed out after ${timeoutMs}ms.`);
    } else {
      console.warn(
        'LLM enrichment failed:',
        error instanceof Error ? error.message : error,
      );
    }

    return { explanations };
  } finally {
    clearTimeout(timeout);
  }
}