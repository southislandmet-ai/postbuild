import { useState } from 'react';

export default function DiagnosticsPanel({ rootKeys, rootError, liveData, contentTypes }) {
  const [open, setOpen] = useState(false);
  const [rawOpenKey, setRawOpenKey] = useState(null);

  return (
    <div className="panel diagnostics-panel">
      <button className="link-btn diagnostics-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Show'} Firebase diagnostics
      </button>

      {open && (
        <div className="panel-body">
          <h4>Top-level keys in your database</h4>
          {rootError && <p className="hint hint-error">{rootError}</p>}
          {!rootError && rootKeys === null && <p className="hint">Loading…</p>}
          {!rootError && rootKeys?.length === 0 && (
            <p className="hint">The database root looks empty, or read access is blocked.</p>
          )}
          {!rootError && rootKeys?.length > 0 && (
            <ul className="key-list">
              {rootKeys.map((k) => (
                <li key={k}>
                  <code>{k}</code>
                </li>
              ))}
            </ul>
          )}
          <p className="hint">
            If your console names above don't match what's set in Settings → Firebase data mapping,
            update the path there to match exactly (case-sensitive).
          </p>

          <h4>Raw data per console</h4>
          {contentTypes.map((type) => {
            const state = liveData[type.key];
            return (
              <div key={type.key} className="mapping-row">
                <div className="region-picker-header">
                  <strong>{type.label}</strong>
                  <button className="link-btn" onClick={() => setRawOpenKey(rawOpenKey === type.key ? null : type.key)}>
                    {rawOpenKey === type.key ? 'Hide' : 'View'} raw JSON
                  </button>
                </div>
                {rawOpenKey === type.key && (
                  <pre className="raw-json">{JSON.stringify(state?.raw ?? null, null, 2)}</pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
