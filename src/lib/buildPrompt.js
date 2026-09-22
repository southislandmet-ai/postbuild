const LENGTH_GUIDANCE = {
  quick: 'Write a QUICK SUMMARY: 3-6 short sentences or a tight bullet list. Hit only the headline points — no need to cover every region in depth. Should be scannable in a few seconds.',
  standard: 'Write a STANDARD post: a short intro line, then the key points per area covered, in clear paragraphs or bullets. This is the normal length for a South Island Met Facebook post.',
  detailed: 'Write a DETAILED post: cover every included region/day thoroughly, using the analysis text as the basis but written in your own natural voice, with clear structure per area. Do not omit meaningful detail from the source analysis.',
};

function formatItemSection(typeLabel, item, sel) {
  const { regionIds: selectedRegionIds = [], dayIds: selectedDayIds = [], includeOverview, includeExtended } = sel;
  const lines = [`### ${typeLabel}`];
  if (item.title) lines.push(`Title: ${item.title}`);
  if (item.headline && item.headline !== item.overview) lines.push(`Headline: ${item.headline}`);
  if (item.issuedAt) lines.push(`Issued: ${item.issuedAt}`);
  if (includeOverview && item.overview) lines.push(`Short-term overview: ${item.overview}`);
  if (includeExtended && item.extendedOutlook) lines.push(`Extended outlook: ${item.extendedOutlook}`);

  const regions = item.regions.filter((r) => selectedRegionIds.includes(r.id));
  if (regions.length) {
    lines.push('Regional breakdown:');
    for (const r of regions) {
      lines.push(`- Area: ${r.area}`);
      if (r.timeframe) lines.push(`  Timeframe: ${r.timeframe}`);
      if (r.analysis) lines.push(`  Analysis: ${r.analysis}`);
      if (r.extraDetail) lines.push(`  Additional detail: ${r.extraDetail}`);
    }
  }

  const days = item.days.filter((d) => selectedDayIds.includes(d.id));
  if (days.length) {
    lines.push('Day-by-day outlook:');
    for (const d of days) {
      lines.push(`- ${d.day}${d.date ? ` (${d.date})` : ''}`);
      if (d.analysis) lines.push(`  Analysis: ${d.analysis}`);
    }
  }

  return lines.join('\n');
}

/**
 * selections: {
 *   [contentTypeKey]: { item, regionIds: string[], dayIds: string[] }
 * }
 */
export function buildPrompts({ selections, contentTypeLabels, style, extraInstructions }) {
  const sections = Object.entries(selections)
    .filter(([, sel]) => sel && sel.item)
    .map(([key, sel]) => formatItemSection(contentTypeLabels[key] || key, sel.item, sel));

  const systemPrompt = `You are the social media writer for South Island Met, a New Zealand regional weather Facebook page (facebook.com/southislandmet). You turn structured forecast data from internal forecast consoles into a single ready-to-publish Facebook post.

Rules:
- Use New Zealand English spelling and phrasing throughout (e.g. "metre", "colour", "favourite", NZ place names spelled correctly). Never use American spelling.
- Write in the voice of a knowledgeable, friendly, community-focused NZ weather page: confident, clear, a little conversational, never alarmist but appropriately urgent for severe weather.
- Base every factual claim strictly on the forecast data provided below. Do not invent conditions, numbers, or areas that are not in the data.
- Structure the post so it reads naturally as one cohesive Facebook post, not a raw data dump — rephrase the analysis text in your own words rather than copying it verbatim, while preserving its meaning and any specific figures (snow levels, wind speeds, rainfall totals, etc).
- Where more than one forecast type is included, blend them into one coherent post with clear breaks between topics (e.g. short bold-style headers using CAPS or emoji sparingly, matching typical NZ weather page style), rather than listing them as disconnected sections.
- Use relevant, sparing emoji (❄️ ⛈️ 🌦️ ⚠️) where it fits the South Island Met style — do not overuse them.
- Finish with a short, on-brand sign-off line inviting readers to stay updated, unless the requested length is "quick summary".
- Output ONLY the finished Facebook post text — no preamble, no explanation, no markdown headers, no quotation marks around it.`;

  const lengthKey = style?.length === 'custom' ? null : style?.length || 'standard';
  const lengthLine = lengthKey ? LENGTH_GUIDANCE[lengthKey] : null;

  const userPromptParts = [
    'Here is the live forecast data to base the post on:',
    '',
    sections.join('\n\n') || '(No forecast content was selected.)',
    '',
    '---',
    lengthLine ? `Length/style: ${lengthLine}` : null,
    extraInstructions?.trim()
      ? `Additional instructions from the page owner (follow these closely, they override general guidance above where they conflict):\n${extraInstructions.trim()}`
      : null,
  ].filter(Boolean);

  return { systemPrompt, userPrompt: userPromptParts.join('\n') };
}
