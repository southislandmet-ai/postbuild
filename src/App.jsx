import { useCallback, useEffect, useMemo, useState } from 'react';
import { watchPath } from './lib/firebase';
import { normalizeSnapshot } from './lib/normalize';
import { CONTENT_TYPES, loadSettings, saveSettings } from './lib/settings';
import { buildPrompts } from './lib/buildPrompt';
import { generatePost } from './lib/claude';
import { extractForecastFromUrl } from './lib/webExtract';
import SettingsModal from './components/SettingsModal';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import ForecastTypePanel from './components/ForecastTypePanel';
import StyleControls from './components/StyleControls';
import PostOutput from './components/PostOutput';
import './App.css';

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  const [liveData, setLiveData] = useState(() =>
    Object.fromEntries(
      CONTENT_TYPES.map((t) => [
        t.key,
        { status: settings.sourceModes[t.key] === 'website' ? 'idle' : 'loading', items: [] },
      ])
    )
  );
  const [enabledTypes, setEnabledTypes] = useState({});
  const [selections, setSelections] = useState({});
  const [style, setStyle] = useState({ length: 'standard' });
  const [extraInstructions, setExtraInstructions] = useState('');
  const [post, setPost] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [rootKeys, setRootKeys] = useState(null);
  const [rootError, setRootError] = useState('');
  const [refreshing, setRefreshing] = useState({});

  const applyItems = useCallback((typeKey, items, raw) => {
    setLiveData((d) => ({
      ...d,
      [typeKey]: { status: items.length ? 'ok' : 'empty', items, raw },
    }));
    setSelections((sel) => {
      if (sel[typeKey]?.itemId && items.some((i) => i.id === sel[typeKey].itemId)) return sel;
      const first = items[0];
      if (!first) return sel;
      return {
        ...sel,
        [typeKey]: {
          itemId: first.id,
          regionIds: first.regions.filter((r) => r.active).map((r) => r.id),
          dayIds: first.days.map((d) => d.id),
          includeOverview: !!first.overview,
          includeExtended: !!first.extendedOutlook,
        },
      };
    });
  }, []);

  const refreshFromWebsite = useCallback(
    async (typeKey) => {
      const type = CONTENT_TYPES.find((t) => t.key === typeKey);
      setRefreshing((r) => ({ ...r, [typeKey]: true }));
      setLiveData((d) => ({ ...d, [typeKey]: { ...d[typeKey], status: 'loading' } }));
      try {
        const raw = await extractForecastFromUrl({
          apiKey: settings.apiKey,
          model: settings.model,
          url: settings.websiteUrls[typeKey],
          typeLabel: type.label,
          hasDays: type.hasDays,
        });
        const items = normalizeSnapshot(raw, {
          overrides: settings.fieldOverrides[typeKey],
          includeInactive: settings.includeInactive,
        });
        applyItems(typeKey, items, raw);
      } catch (error) {
        setLiveData((d) => ({ ...d, [typeKey]: { status: 'error', items: [], error: error.message } }));
      } finally {
        setRefreshing((r) => ({ ...r, [typeKey]: false }));
      }
    },
    [settings, applyItems]
  );

  // Diagnostics: list the top-level keys actually in the database, so
  // mismatched paths in Settings are easy to spot.
  useEffect(() => {
    const unsub = watchPath(
      '/',
      (raw, exists) => setRootKeys(exists && raw && typeof raw === 'object' ? Object.keys(raw) : []),
      (error) => setRootError(error.message)
    );
    return unsub;
  }, []);

  // Subscribe live to every Firebase-backed content type's path. Website-
  // sourced types are fetched on demand instead (see refreshFromWebsite).
  useEffect(() => {
    const firebaseTypes = CONTENT_TYPES.filter((t) => (settings.sourceModes[t.key] || 'firebase') === 'firebase');
    const unsubs = firebaseTypes.map((type) =>
      watchPath(
        settings.paths[type.key],
        (raw, exists) => {
          if (!exists) {
            setLiveData((d) => ({ ...d, [type.key]: { status: 'empty', items: [], raw: null } }));
            return;
          }
          const items = normalizeSnapshot(raw, {
            overrides: settings.fieldOverrides[type.key],
            includeInactive: settings.includeInactive,
          });
          applyItems(type.key, items, raw);
        },
        (error) => {
          setLiveData((d) => ({ ...d, [type.key]: { status: 'error', items: [], error: error.message } }));
        }
      )
    );
    return () => unsubs.forEach((u) => u && u());
  }, [settings.paths, settings.fieldOverrides, settings.includeInactive, settings.sourceModes, applyItems]);

  const contentTypeLabels = useMemo(
    () => Object.fromEntries(CONTENT_TYPES.map((t) => [t.key, t.label])),
    []
  );

  const activeSelections = useMemo(() => {
    const out = {};
    for (const type of CONTENT_TYPES) {
      if (!enabledTypes[type.key]) continue;
      const sel = selections[type.key];
      const item = liveData[type.key]?.items.find((i) => i.id === sel?.itemId);
      if (!item) continue;
      out[type.key] = {
        item,
        regionIds: sel.regionIds || [],
        dayIds: sel.dayIds || [],
        includeOverview: !!sel.includeOverview,
        includeExtended: !!sel.includeExtended,
      };
    }
    return out;
  }, [enabledTypes, selections, liveData]);

  const canGenerate = useMemo(
    () =>
      Object.values(activeSelections).some(
        (sel) =>
          (sel.regionIds && sel.regionIds.length) ||
          (sel.dayIds && sel.dayIds.length) ||
          sel.includeOverview ||
          sel.includeExtended
      ),
    [activeSelections]
  );

  async function handleGenerate() {
    setGenError('');
    setGenerating(true);
    try {
      const { systemPrompt, userPrompt } = buildPrompts({
        selections: activeSelections,
        contentTypeLabels,
        style,
        extraInstructions,
      });
      const result = await generatePost({
        apiKey: settings.apiKey,
        model: settings.model,
        systemPrompt,
        userPrompt,
      });
      setPost(result.trim());
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleSaveSettings(next) {
    setSettings(next);
    saveSettings(next);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>South Island Met — Smart Post Generator</h1>
          <p className="subtitle">Live forecast data, written up in your Facebook voice.</p>
        </div>
        <button className="btn" onClick={() => setShowSettings(true)}>
          Settings
        </button>
      </header>

      <main className="app-main">
        <section className="column">
          <h2>1. Choose what to include</h2>
          <DiagnosticsPanel
            rootKeys={rootKeys}
            rootError={rootError}
            liveData={liveData}
            contentTypes={CONTENT_TYPES}
          />
          {CONTENT_TYPES.map((type) => {
            const sourceMode = settings.sourceModes[type.key] || 'firebase';
            return (
              <ForecastTypePanel
                key={type.key}
                type={type}
                sourceMode={sourceMode}
                liveState={liveData[type.key] || { status: 'loading', items: [] }}
                enabled={!!enabledTypes[type.key]}
                onToggleEnabled={(v) => {
                  setEnabledTypes((e) => ({ ...e, [type.key]: v }));
                  if (v && sourceMode === 'website' && liveData[type.key]?.status === 'idle') {
                    refreshFromWebsite(type.key);
                  }
                }}
                selection={selections[type.key]}
                onChangeSelection={(sel) => setSelections((s) => ({ ...s, [type.key]: sel }))}
                onRefresh={() => refreshFromWebsite(type.key)}
                refreshing={!!refreshing[type.key]}
              />
            );
          })}
        </section>

        <section className="column">
          <h2>2. Choose the style</h2>
          <StyleControls
            style={style}
            onChange={setStyle}
            extraInstructions={extraInstructions}
            onChangeExtra={setExtraInstructions}
          />

          <h2>3. Generate</h2>
          <PostOutput
            post={post}
            generating={generating}
            error={genError}
            onGenerate={handleGenerate}
            canGenerate={canGenerate}
          />
        </section>
      </main>

      {showSettings && (
        <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
