const API_URL = 'https://api.anthropic.com/v1/messages';

// Ask the model to emit exactly the shape normalize.js already understands
// (see SINGLE_ITEM_MARKERS / pick() candidates), so extracted pages plug
// into the same region/day checkboxes as the Firebase-backed consoles.
function buildExtractionPrompt(typeLabel, hasDays) {
  const schema = `{
  "title": "string, the forecast's headline/title if shown, else omit",
  "issuedAt": "string, when this forecast was issued/last updated, as shown on the page",
  "overview": "string, a short-term/at-a-glance summary if the page has one separate from the regional breakdown, else omit",
  "extendedOutlook": "string, a longer-range/extended outlook section if the page has one separate from the main breakdown, else omit",
  "regions": [
    { "area": "string, the region/area name", "timeframe": "string, the time period this applies to", "analysis": "string, the forecast text/analysis for this area" }
  ]${hasDays ? ',\n  "days": [\n    { "day": "string, e.g. Monday", "date": "string, the date if shown", "analysis": "string, the forecast text for that day" }\n  ]' : ''}
}`;

  return `You are a data-extraction assistant for South Island Met, a New Zealand weather page. Use the web_fetch tool to fetch the given URL, then extract the CURRENT, ACTIVE ${typeLabel} forecast content from that page into strict JSON matching this exact shape:

${schema}

Rules:
- Only extract what is actually present on the page right now. Never invent regions, figures, or dates that aren't there.
- If the page presents a breakdown by region/area, capture every region as a separate entry in "regions" with its own timeframe and analysis text.
- If the page has both a short overview/summary AND a more detailed regional or extended section, capture the overview separately in "overview" rather than folding it into a region.
- If the page has no active ${typeLabel} content right now, return {"regions": []}.
- Respond with ONLY the JSON object. No markdown code fences, no commentary, no explanation before or after.`;
}

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Claude did not return JSON. Raw response: ' + text.slice(0, 300));
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Fetches a live forecast page via Claude's server-side web_fetch tool and
 * extracts it into the same shape normalize.js expects from Firebase data.
 */
export async function extractForecastFromUrl({ apiKey, model, url, typeLabel, hasDays }) {
  if (!apiKey) throw new Error('Add your Claude API key in Settings first.');
  if (!url) throw new Error(`No website URL configured for ${typeLabel} — add one in Settings.`);

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  let messages = [
    { role: 'user', content: `Fetch this page and extract the ${typeLabel} forecast: ${url}` },
  ];
  const body = {
    model,
    max_tokens: 4000,
    system: buildExtractionPrompt(typeLabel, hasDays),
    // Basic (non-dynamic-filtering) variant: a single direct fetch of the
    // page, no code-execution container spun up — faster and simpler for
    // "fetch one known page and extract it" than the _20260209 variant.
    tools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 3 }],
  };
  const REQUEST_TIMEOUT_MS = 90000;

  // A long-running server-tool turn can stop with stop_reason "pause_turn";
  // resume by feeding the assistant turn back until it finishes.
  for (let attempt = 0; attempt < 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, messages }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s waiting for Claude to fetch and read the page. Try again, or check the URL loads normally in a browser.`
        );
      }
      throw new Error(`Network error reaching Claude's API: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json();
        detail = errBody?.error?.message || JSON.stringify(errBody);
      } catch {
        detail = await res.text();
      }
      throw new Error(`Claude API error (${res.status}): ${detail}`);
    }

    const data = await res.json();

    if (data.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: data.content }];
      continue;
    }

    if (data.stop_reason === 'refusal') {
      throw new Error('Claude declined to fetch/extract that page.');
    }

    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return extractJson(text);
  }

  throw new Error('Gave up waiting for the page fetch to finish (too many pause_turn continuations).');
}
