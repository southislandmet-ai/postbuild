const STORAGE_KEY = 'sim-post-generator-settings-v1';

export const CONTENT_TYPES = [
  {
    key: 'snowcast',
    label: 'SnowCast',
    defaultPath: 'snowcast',
    defaultSourceMode: 'firebase',
    defaultWebsiteUrl: '',
    hasDays: false,
    blurb: 'Snow-specific forecast console',
  },
  {
    key: 'stormcast',
    label: 'StormCast',
    defaultPath: 'stormcast',
    defaultSourceMode: 'website',
    defaultWebsiteUrl: 'https://sima.co.nz/storm',
    hasDays: false,
    blurb: 'Severe storm forecast console',
  },
  {
    key: 'regionalNotice',
    label: 'Regional Weather Notice',
    defaultPath: 'regionalWeatherNotice',
    defaultSourceMode: 'website',
    defaultWebsiteUrl: 'https://sima.co.nz/rwn',
    hasDays: false,
    blurb: 'General regional weather notice',
  },
  {
    key: 'outlook',
    label: 'Significant Weather Outlook',
    defaultPath: 'significantWeatherOutlook',
    defaultSourceMode: 'website',
    defaultWebsiteUrl: 'https://sima.co.nz/significant-weather-outlook',
    hasDays: true,
    blurb: 'Multi-day significant weather outlook',
  },
];

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'claude-sonnet-5',
  includeInactive: false,
  paths: Object.fromEntries(CONTENT_TYPES.map((c) => [c.key, c.defaultPath])),
  fieldOverrides: Object.fromEntries(
    CONTENT_TYPES.map((c) => [c.key, { regionsField: '', daysField: '' }])
  ),
  sourceModes: Object.fromEntries(CONTENT_TYPES.map((c) => [c.key, c.defaultSourceMode])),
  websiteUrls: Object.fromEntries(CONTENT_TYPES.map((c) => [c.key, c.defaultWebsiteUrl])),
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      paths: { ...DEFAULT_SETTINGS.paths, ...(parsed.paths || {}) },
      fieldOverrides: { ...DEFAULT_SETTINGS.fieldOverrides, ...(parsed.fieldOverrides || {}) },
      sourceModes: { ...DEFAULT_SETTINGS.sourceModes, ...(parsed.sourceModes || {}) },
      websiteUrls: { ...DEFAULT_SETTINGS.websiteUrls, ...(parsed.websiteUrls || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export { DEFAULT_SETTINGS };
