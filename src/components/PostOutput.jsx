import { useState } from 'react';

export default function PostOutput({ post, generating, error, onGenerate, canGenerate }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(post);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="panel output-panel">
      <div className="panel-header">
        <span className="panel-title">Generated post</span>
      </div>

      <button className="btn btn-primary btn-generate" onClick={onGenerate} disabled={!canGenerate || generating}>
        {generating ? 'Writing post…' : post ? 'Regenerate' : 'Generate post'}
      </button>

      {error && <p className="hint hint-error">{error}</p>}
      {!canGenerate && !error && (
        <p className="hint">Select at least one forecast and one region/day above to generate a post.</p>
      )}

      {post && (
        <>
          <textarea className="post-textarea" rows={14} value={post} readOnly />
          <button className="btn" onClick={copy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </>
      )}
    </div>
  );
}
