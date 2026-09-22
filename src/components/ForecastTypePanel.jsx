function StatusBadge({ status }) {
  const map = {
    loading: { label: 'Fetching…', cls: 'badge-loading' },
    ok: { label: 'Live', cls: 'badge-ok' },
    empty: { label: 'No active forecast', cls: 'badge-empty' },
    error: { label: 'Connection error', cls: 'badge-error' },
    idle: { label: 'Not fetched yet', cls: 'badge-empty' },
  };
  const info = map[status] || map.loading;
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export default function ForecastTypePanel({
  type,
  sourceMode,
  liveState,
  enabled,
  onToggleEnabled,
  selection,
  onChangeSelection,
  onRefresh,
  refreshing,
}) {
  const items = liveState.items || [];
  const selectedItem = items.find((i) => i.id === selection?.itemId) || items[0] || null;
  const regionIds = selection?.regionIds || [];
  const dayIds = selection?.dayIds || [];

  function selectItem(itemId) {
    const item = items.find((i) => i.id === itemId);
    onChangeSelection({
      itemId,
      regionIds: item ? item.regions.filter((r) => r.active).map((r) => r.id) : [],
      dayIds: item ? item.days.map((d) => d.id) : [],
      includeOverview: !!item?.overview,
      includeExtended: !!item?.extendedOutlook,
    });
  }

  function toggleRegion(id) {
    const next = regionIds.includes(id) ? regionIds.filter((r) => r !== id) : [...regionIds, id];
    onChangeSelection({ ...selection, regionIds: next });
  }

  function toggleDay(id) {
    const next = dayIds.includes(id) ? dayIds.filter((d) => d !== id) : [...dayIds, id];
    onChangeSelection({ ...selection, dayIds: next });
  }

  function setAllRegions(value) {
    onChangeSelection({ ...selection, regionIds: value ? selectedItem.regions.map((r) => r.id) : [] });
  }

  function setAllDays(value) {
    onChangeSelection({ ...selection, dayIds: value ? selectedItem.days.map((d) => d.id) : [] });
  }

  return (
    <div className={`panel ${enabled ? 'panel-enabled' : ''}`}>
      <div className="panel-header">
        <label className="panel-toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggleEnabled(e.target.checked)} />
          <span className="panel-title">{type.label}</span>
        </label>
        <StatusBadge status={liveState.status} />
      </div>
      <p className="panel-blurb">{type.blurb}</p>

      {enabled && sourceMode === 'website' && (
        <div className="website-refresh-row">
          <button className="btn" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Fetching from website…' : 'Refresh from website'}
          </button>
        </div>
      )}

      {enabled && liveState.status === 'ok' && (
        <div className="panel-body">
          {items.length > 1 && (
            <label className="field">
              <span>Active forecast</span>
              <select value={selectedItem?.id} onChange={(e) => selectItem(e.target.value)}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.headline || item.id}
                    {item.issuedAt ? ` — ${item.issuedAt}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedItem && (item => item.title || item.headline)(selectedItem) && (
            <p className="item-headline">{selectedItem.title || selectedItem.headline}</p>
          )}

          {(selectedItem?.overview || selectedItem?.extendedOutlook) && (
            <div className="region-picker">
              {selectedItem.overview && (
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={!!selection?.includeOverview}
                    onChange={(e) => onChangeSelection({ ...selection, includeOverview: e.target.checked })}
                  />
                  <span>
                    <strong>Short-term overview</strong>
                    <div className="check-row-detail">{selectedItem.overview}</div>
                  </span>
                </label>
              )}
              {selectedItem.extendedOutlook && (
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={!!selection?.includeExtended}
                    onChange={(e) => onChangeSelection({ ...selection, includeExtended: e.target.checked })}
                  />
                  <span>
                    <strong>Extended outlook</strong>
                    <div className="check-row-detail">{selectedItem.extendedOutlook}</div>
                  </span>
                </label>
              )}
            </div>
          )}

          {selectedItem?.regions?.length > 0 && (
            <div className="region-picker">
              <div className="region-picker-header">
                <span>Regions to include</span>
                <span className="mini-links">
                  <button className="link-btn" onClick={() => setAllRegions(true)}>
                    All
                  </button>
                  <button className="link-btn" onClick={() => setAllRegions(false)}>
                    None
                  </button>
                </span>
              </div>
              {selectedItem.regions.map((r) => (
                <label key={r.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={regionIds.includes(r.id)}
                    onChange={() => toggleRegion(r.id)}
                  />
                  <span>
                    <strong>{r.area}</strong>
                    {r.timeframe && <em> — {r.timeframe}</em>}
                    {!r.active && <em className="inactive-tag"> (inactive)</em>}
                    {r.analysis && <div className="check-row-detail">{r.analysis}</div>}
                    {r.extraDetail && <div className="check-row-detail check-row-extra">{r.extraDetail}</div>}
                  </span>
                </label>
              ))}
            </div>
          )}

          {type.hasDays && selectedItem?.days?.length > 0 && (
            <div className="region-picker">
              <div className="region-picker-header">
                <span>Days to include</span>
                <span className="mini-links">
                  <button className="link-btn" onClick={() => setAllDays(true)}>
                    All
                  </button>
                  <button className="link-btn" onClick={() => setAllDays(false)}>
                    None
                  </button>
                </span>
              </div>
              {selectedItem.days.map((d) => (
                <label key={d.id} className="check-row">
                  <input type="checkbox" checked={dayIds.includes(d.id)} onChange={() => toggleDay(d.id)} />
                  <span>
                    <strong>
                      {d.day}
                      {d.date ? ` (${d.date})` : ''}
                    </strong>
                    {d.analysis && <div className="check-row-detail">{d.analysis}</div>}
                  </span>
                </label>
              ))}
            </div>
          )}

          {selectedItem && !selectedItem.regions.length && !selectedItem.days.length && (
            <p className="hint">
              Couldn't find a regions/days array in this item automatically — check Settings to point
              at the right field, or view raw data below.
            </p>
          )}
        </div>
      )}

      {enabled && liveState.status === 'idle' && (
        <p className="hint">Click "Refresh from website" to fetch the current {type.label} page.</p>
      )}

      {enabled && liveState.status === 'empty' && (
        <p className="hint">
          No active {type.label} content found{' '}
          {sourceMode === 'website' ? 'on the page right now' : 'currently live in Firebase'}.
        </p>
      )}

      {enabled && liveState.status === 'error' && (
        <p className="hint hint-error">{liveState.error}</p>
      )}
    </div>
  );
}
