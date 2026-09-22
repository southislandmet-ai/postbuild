// Firebase data can come back in a variety of shapes depending on how each
// "console" writes to the database (a single object, an object keyed by
// push-ids, or an array). These helpers normalise whatever comes back into
// a predictable shape the UI can render, while trying a range of common
// field-name spellings so the app has a good chance of working out of the
// box against your real data.

function pick(obj, candidates, fallback = undefined) {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const key of candidates) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return fallback;
}

// Field names that only ever appear on a single forecast item, never as a
// push-id key. Their presence at the top level means "this whole object IS
// one item", not "this object contains multiple items keyed by these names".
const SINGLE_ITEM_MARKERS = [
  'title', 'headline', 'name', 'issuedAt', 'issueDate', 'status',
  'lastUpdated', 'updatedAt', 'nextUpdate', 'masterExpiry',
  'regions', 'regionalData', 'regionalBreakdown', 'areas', 'regionalNotices',
  'days', 'outlookDays', 'forecastDays', 'dailyOutlook',
  'shortTerm', 'extended',
];

function asEntries(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((v, i) => [String(i), v]).filter(([, v]) => v != null);
  }
  if (typeof raw === 'object') {
    const looksLikeSingleItem = SINGLE_ITEM_MARKERS.some((k) => k in raw);
    if (looksLikeSingleItem) return [['single', raw]];
    return Object.entries(raw);
  }
  return [];
}

const ACTIVE_VALUES = new Set(['active', 'live', 'current', 'published', true, 1, 'true']);
const INACTIVE_VALUES = new Set(['inactive', 'archived', 'expired', 'draft', 'cancelled', 'canceled', false, 0, 'false']);

export function isActiveItem(item) {
  const status = pick(item, ['status', 'state', 'isActive', 'active']);
  if (status === undefined) return true; // no status field -> assume it's active/current
  if (typeof status === 'string') return !INACTIVE_VALUES.has(status.toLowerCase());
  return ACTIVE_VALUES.has(status) || !INACTIVE_VALUES.has(status);
}

function formatBands(bands) {
  if (!Array.isArray(bands) || !bands.length) return '';
  return bands
    .map((b) => `${pick(b, ['elevation'], '')}: ${pick(b, ['accumulation'], '')}`.trim())
    .filter((s) => s !== ':')
    .join('; ');
}

function normalizeRegion(raw, idx) {
  const extraBits = [];
  const freezingLevel = pick(raw, ['freezingLevel']);
  const peakSnowRate = pick(raw, ['peakSnowRate']);
  const significance = pick(raw, ['significance']);
  const expiry = pick(raw, ['expiry']);
  const bands = formatBands(raw?.bands);
  if (significance) extraBits.push(`Significance: ${significance}`);
  if (freezingLevel) extraBits.push(`Freezing level: ${freezingLevel}`);
  if (bands) extraBits.push(`Snowfall by elevation: ${bands}`);
  if (peakSnowRate) extraBits.push(`Peak rate: ${peakSnowRate}`);
  if (expiry) extraBits.push(`Valid until: ${expiry}`);

  return {
    id: pick(raw, ['id', 'key', 'regionId'], `region-${idx}`),
    area: pick(raw, ['area', 'region', 'name', 'location', 'district'], `Area ${idx + 1}`),
    timeframe: pick(raw, ['hours', 'timeframe', 'timeFrame', 'time', 'period', 'validPeriod', 'when'], ''),
    analysis: pick(raw, ['breakdown', 'analysis', 'details', 'description', 'text', 'summary', 'forecast', 'commentary'], ''),
    extraDetail: extraBits.join(' | '),
    active: raw?.active !== false,
    raw,
  };
}

function normalizeDay(raw, idx) {
  return {
    id: pick(raw, ['id', 'key', 'dayId'], `day-${idx}`),
    day: pick(raw, ['day', 'dayName', 'label', 'weekday'], `Day ${idx + 1}`),
    date: pick(raw, ['date', 'validDate', 'forDate'], ''),
    analysis: pick(raw, ['analysis', 'summary', 'description', 'text', 'outlook', 'commentary'], ''),
    raw,
  };
}

function findArrayField(obj, candidates) {
  for (const key of candidates) {
    const val = obj?.[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return Object.values(val);
  }
  return [];
}

export function normalizeItem(id, raw, overrides = {}) {
  const regionsRaw = overrides.regionsField
    ? findArrayField(raw, [overrides.regionsField])
    : findArrayField(raw, ['regionalData', 'regions', 'regionalBreakdown', 'areas', 'regionalNotices']);

  const daysRaw = overrides.daysField
    ? findArrayField(raw, [overrides.daysField])
    : findArrayField(raw, ['days', 'outlookDays', 'forecastDays', 'dailyOutlook']);

  return {
    id,
    title: pick(raw, ['title', 'headline', 'name'], ''),
    headline: pick(raw, ['headline', 'summary', 'subtitle', 'shortTerm'], ''),
    // Overview/extended outlook are whole-console commentary, not tied to a
    // single region — kept separate so they can be included/excluded on
    // their own rather than as part of the regional breakdown.
    overview: pick(raw, ['shortTerm', 'overview'], ''),
    extendedOutlook: pick(raw, ['extended', 'extendedOutlook'], ''),
    issuedAt: pick(raw, ['lastUpdated', 'issuedAt', 'issueDate', 'issued', 'timestamp', 'updatedAt', 'createdAt'], ''),
    status: pick(raw, ['status', 'state'], 'active'),
    regions: regionsRaw.map(normalizeRegion),
    days: daysRaw.map(normalizeDay),
    raw,
  };
}

/**
 * Normalize a raw Firebase snapshot value for a given content type into an
 * array of items (most recent first when a timestamp/order is available),
 * filtered to active items only (unless includeInactive is true).
 */
export function normalizeSnapshot(raw, { overrides = {}, includeInactive = false } = {}) {
  const entries = asEntries(raw);
  const items = entries.map(([key, val]) => normalizeItem(key, val, overrides));
  const filtered = includeInactive ? items : items.filter(isActiveItem);
  return filtered.sort((a, b) => String(b.issuedAt).localeCompare(String(a.issuedAt)));
}
