import { useEffect, useMemo, useState } from 'react';
import { watchPath } from './lib/firebase';
import { normalizeSnapshot } from './lib/normalize';
import { CONTENT_TYPES, loadSettings, saveSettings } from './lib/settings';
import { buildPrompts } from './lib/buildPrompt';
import { generatePost } from './lib/claude';
import SettingsModal from './components/SettingsModal';
import ForecastTypePanel from './components/ForecastTypePanel';
import StyleControls from './components/StyleControls';
import PostOutput from './components/PostOutput';
import './App.css';

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  const [liveData, setLiveData] = useState(() =>
    Object.fromEntries(CONTENT_TYPES.map((t) => [t.key, { status: 'loading', items: [] }]))
  );
  const [enabledTypes, setEnabledTypes] = useState({});
  const [selections, setSelections] = useState({});
  const [style, setStyle] = useState({ length: 'standard' });
  const [extraInstructions, setExtraInstructions] = useState('');
  const [post, setPost] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Subscribe live to every content type's Firebase path.
  useEffect(() => {
    const unsubs = CONTENT_TYPES.map((type) =>
      watchPath(
        settings.paths[type.key],
        (raw, exists) => {
          if (!exists) {
            setLiveData((d) => ({ ...d, [type.key]: { status: 'empty', items: [] } }));
            return;
          }
          const items = normalizeSnapshot(raw, {
            overrides: settings.fieldOverrides[type.key],
            includeInactive: settings.includeInactive,
          });
          setLiveData((d) => ({
            ...d,
            [type.key]: { status: items.length ? 'ok' : 'empty', items },
          }));
          setSelections((sel) => {
            if (sel[type.key]?.itemId && items.some((i) => i.id === sel[type.key].itemId)) return sel;
            const first = items[0];
            if (!first) return sel;
            return {
              ...sel,
              [type.key]: {
                itemId: first.id,
                regionIds: first.regions.map((r) => r.id),
                dayIds: first.days.map((d) => d.id),
              },
            };
          });
        },
        (error) => {
          setLiveData((d) => ({ ...d, [type.key]: { status: 'error', items: [], error: error.message } }));
        }
      )
    );
    return () => unsubs.forEach((u) => u && u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.paths, settings.fieldOverrides, settings.includeInactive]);

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
      out[type.key] = { item, regionIds: sel.regionIds || [], dayIds: sel.dayIds || [] };
    }
    return out;
  }, [enabledTypes, selections, liveData]);

  const canGenerate = useMemo(
    () =>
      Object.values(activeSelections).some(
        (sel) => (sel.regionIds && sel.regionIds.length) || (sel.dayIds && sel.dayIds.length)
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
          {CONTENT_TYPES.map((type) => (
            <ForecastTypePanel
              key={type.key}
              type={type}
              liveState={liveData[type.key] || { status: 'loading', items: [] }}
              enabled={!!enabledTypes[type.key]}
              onToggleEnabled={(v) => setEnabledTypes((e) => ({ ...e, [type.key]: v }))}
              selection={selections[type.key]}
              onChangeSelection={(sel) => setSelections((s) => ({ ...s, [type.key]: sel }))}
            />
          ))}
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
