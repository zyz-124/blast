/**
 * Blast AI — OpenAI-compatible API Client
 */

export interface AiConfig {
  provider: string;
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
}

export interface AiSolution {
  type: string;
  title: string;
  steps: string[];
}

export interface AiKbEntry {
  id: string;
  patterns: string[];
  language: string;
}

export interface AiAnalysis {
  title: string;
  summary: string;
  solutions: AiSolution[];
  code_fix?: string;
  ref?: string;
  kb_entry?: AiKbEntry;
}

export interface AiCallResult {
  success: boolean;
  analysis?: AiAnalysis;
  error?: string;
}

const FETCH_TIMEOUT_MS = 30000;

/**
 * Call an OpenAI-compatible chat completions API.
 * Returns parsed AiAnalysis or error.
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  config: AiConfig,
  signal?: AbortSignal
): Promise<AiCallResult> {
  const url = normalizeEndpoint(config.endpoint);

  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // Merge external signal
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        detail = JSON.parse(text)?.error?.message || text;
      } catch { /* use raw */ }
      return { success: false, error: `API ${response.status}: ${detail.slice(0, 200)}` };
    }

    const data: any = await response.json();
    const content: string = data?.choices?.[0]?.message?.content || '';

    // Parse JSON from AI response (may be wrapped in ```json fences)
    const json = extractJSON(content);
    if (!json) {
      return { success: false, error: 'AI response was not valid JSON' };
    }

    return {
      success: true,
      analysis: {
        title: json.title || 'Unknown Error',
        summary: json.summary || '',
        solutions: (json.solutions || []).map((s: any) => ({
          type: s.type || 'fix',
          title: s.title || 'Fix',
          steps: s.steps || [],
        })),
        code_fix: json.code_fix,
        ref: json.ref,
        kb_entry: json.kb_entry ? {
          id: json.kb_entry.id || '',
          patterns: json.kb_entry.patterns || [],
          language: json.kb_entry.language || 'common',
        } : undefined,
      },
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Request timed out (30s)' };
    }
    const detail = err.message || 'Unknown error';
    const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
    return { success: false, error: `${detail} → ${hostname}` };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);
  }
}

function normalizeEndpoint(url: string): string {
  let u = url.replace(/\/+$/, '');
  if (!u.endsWith('/chat/completions')) {
    u += '/chat/completions';
  }
  return u;
}

function extractJSON(text: string): any {
  // Try direct parse
  try { return JSON.parse(text); } catch { /* no */ }

  // Try ```json fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* no */ }
  }

  // Try { ... } extraction
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* no */ }
  }

  return null;
}
