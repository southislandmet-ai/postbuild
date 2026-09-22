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

function asEntries(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((v, i) => [String(i), v]).filter(([, v]) => v != null);
  }
  if (typeof raw === 'object') {
    // A single item posted directly at the path (not wrapped in push-ids)
    // typically has scalar-ish top-level fields like title/headline/status.
    const looksLikeSingleItem = ['title', 'headline', 'name', 'issuedAt', 'issueDate', 'status'].some(
      (k) => k in raw
    );
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

function normalizeRegion(raw, idx) {
  return {
    id: pick(raw, ['id', 'key', 'regionId'], `region-${idx}`),
    area: pick(raw, ['area', 'region', 'name', 'location', 'district'], `Area ${idx + 1}`),
    timeframe: pick(raw, ['timeframe', 'timeFrame', 'time', 'period', 'validPeriod', 'when'], ''),
    analysis: pick(raw, ['analysis', 'details', 'description', 'text', 'summary', 'forecast', 'commentary'], ''),
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
    : findArrayField(raw, ['regions', 'regionalBreakdown', 'areas', 'regionalNotices', 'breakdown']);

  const daysRaw = overrides.daysField
    ? findArrayField(raw, [overrides.daysField])
    : findArrayField(raw, ['days', 'outlookDays', 'forecastDays', 'dailyOutlook']);

  return {
    id,
    title: pick(raw, ['title', 'headline', 'name'], ''),
    headline: pick(raw, ['headline', 'summary', 'subtitle'], ''),
    issuedAt: pick(raw, ['issuedAt', 'issueDate', 'issued', 'timestamp', 'updatedAt', 'createdAt'], ''),
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
