const LENGTH_OPTIONS = [
  { key: 'quick', label: 'Quick summary', desc: 'A few sentences — fast to read' },
  { key: 'standard', label: 'Standard post', desc: 'Your usual Facebook post length' },
  { key: 'detailed', label: 'Detailed', desc: 'Full breakdown, nothing left out' },
  { key: 'custom', label: 'Custom', desc: 'Fully controlled by your instructions below' },
];

export default function StyleControls({ style, onChange, extraInstructions, onChangeExtra }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">How should the post be written?</span>
      </div>

      <div className="length-options">
        {LENGTH_OPTIONS.map((opt) => (
          <label key={opt.key} className={`length-card ${style.length === opt.key ? 'length-card-active' : ''}`}>
            <input
              type="radio"
              name="length"
              checked={style.length === opt.key}
              onChange={() => onChange({ ...style, length: opt.key })}
            />
            <span className="length-card-label">{opt.label}</span>
            <span className="length-card-desc">{opt.desc}</span>
          </label>
        ))}
      </div>

      <label className="field">
        <span>Extra instructions for the AI (optional)</span>
        <textarea
          rows={4}
          placeholder="e.g. Lead with the storm warning, mention this is the final update for the event, keep it under 100 words, add our usual 'stay safe out there' sign-off..."
          value={extraInstructions}
          onChange={(e) => onChangeExtra(e.target.value)}
        />
      </label>
    </div>
  );
}
