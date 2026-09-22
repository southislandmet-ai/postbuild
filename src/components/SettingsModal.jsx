import { useState } from 'react';
import { MODEL_OPTIONS } from '../lib/claude';
import { CONTENT_TYPES } from '../lib/settings';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState(structuredClone(settings));

  function updatePath(key, value) {
    setDraft((d) => ({ ...d, paths: { ...d.paths, [key]: value } }));
  }

  function updateOverride(key, field, value) {
    setDraft((d) => ({
      ...d,
      fieldOverrides: {
        ...d.fieldOverrides,
        [key]: { ...d.fieldOverrides[key], [field]: value },
      },
    }));
  }

  function updateSourceMode(key, mode) {
    setDraft((d) => ({ ...d, sourceModes: { ...d.sourceModes, [key]: mode } }));
  }

  function updateWebsiteUrl(key, url) {
    setDraft((d) => ({ ...d, websiteUrls: { ...d.websiteUrls, [key]: url } }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <section>
          <h3>Claude API</h3>
          <label className="field">
            <span>API key</span>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={draft.apiKey}
              onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
              autoComplete="off"
            />
          </label>
          <p className="hint">
            Stored only in this browser's local storage. Never committed to source or sent anywhere
            except directly to Anthropic's API.
          </p>
          <label className="field">
            <span>Model</span>
            <select value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}>
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <h3>Data sources</h3>
          <p className="hint">
            Each console can either read live from Firebase, or be fetched from a page on your
            website (Claude fetches the page itself and extracts the forecast).
          </p>
          {CONTENT_TYPES.map((type) => {
            const mode = draft.sourceModes[type.key] || 'firebase';
            return (
              <div key={type.key} className="mapping-row">
                <strong>{type.label}</strong>
                <div className="source-mode-toggle">
                  <label>
                    <input
                      type="radio"
                      name={`mode-${type.key}`}
                      checked={mode === 'firebase'}
                      onChange={() => updateSourceMode(type.key, 'firebase')}
                    />
                    Firebase
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`mode-${type.key}`}
                      checked={mode === 'website'}
                      onChange={() => updateSourceMode(type.key, 'website')}
                    />
                    Website page
                  </label>
                </div>

                {mode === 'website' ? (
                  <label className="field">
                    <span>Page URL</span>
                    <input
                      placeholder="https://sima.co.nz/..."
                      value={draft.websiteUrls[type.key] || ''}
                      onChange={(e) => updateWebsiteUrl(type.key, e.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <label className="field">
                      <span>Database path</span>
                      <input
                        value={draft.paths[type.key]}
                        onChange={(e) => updatePath(type.key, e.target.value)}
                      />
                    </label>
                    <div className="field-pair">
                      <label className="field">
                        <span>Regions array field (optional override)</span>
                        <input
                          placeholder="auto-detect"
                          value={draft.fieldOverrides[type.key]?.regionsField || ''}
                          onChange={(e) => updateOverride(type.key, 'regionsField', e.target.value)}
                        />
                      </label>
                      {type.hasDays && (
                        <label className="field">
                          <span>Days array field (optional override)</span>
                          <input
                            placeholder="auto-detect"
                            value={draft.fieldOverrides[type.key]?.daysField || ''}
                            onChange={(e) => updateOverride(type.key, 'daysField', e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={draft.includeInactive}
              onChange={(e) => setDraft((d) => ({ ...d, includeInactive: e.target.checked }))}
            />
            <span>Also show inactive/archived items (useful while testing)</span>
          </label>
        </section>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
