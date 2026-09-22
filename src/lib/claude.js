const API_URL = 'https://api.anthropic.com/v1/messages';

export const MODEL_OPTIONS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-5', label: 'Claude Opus 5 (highest quality, slower)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest)' },
];

/**
 * Calls the Claude Messages API directly from the browser. This app is for
 * personal/private use only — the API key lives in this browser's
 * localStorage and is sent straight to Anthropic, never to any third party.
 */
export async function generatePost({ apiKey, model, systemPrompt, userPrompt }) {
  if (!apiKey) throw new Error('Add your Claude API key in Settings first.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`Claude API error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return data?.content?.map((block) => block.text).join('\n') ?? '';
}
