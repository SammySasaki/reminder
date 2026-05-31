import { useState } from 'react';
import { createInstruction } from '../lib/api.js';

export default function BulkUpload({ onDone }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    setLoading(true);
    setError('');
    setProgress(`0 / ${lines.length} uploading…`);

    let completed = 0;
    const results = await Promise.allSettled(
      lines.map(async (content) => {
        const r = await createInstruction({ content, category: 'other', schedule_relevance: 'everyday' });
        completed++;
        setProgress(`${completed} / ${lines.length} uploading…`);
        return r;
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;

    if (failed > 0) {
      setError(`${failed} item(s) failed to upload.`);
      setProgress(`${succeeded} / ${lines.length} uploaded`);
    } else {
      setText('');
      setProgress('');
    }

    setLoading(false);
    if (succeeded > 0) onDone();
  };

  return (
    <div>
      <div className="form-group">
        <label>Enter one instruction per line</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"e.g.\nThe daycare bus comes Monday, Wednesday, and Friday at 9am.\nLunch is in the left side of the fridge.\nEmergency contact: daughter Sarah 010-1234-5678"}
          disabled={loading}
        />
      </div>
      {progress && <p style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>{progress}</p>}
      {error && <p style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>{error}</p>}
      <button className="btn btn-primary" onClick={handleUpload} disabled={loading || !text.trim()}>
        {loading ? 'Uploading…' : 'Upload all'}
      </button>
    </div>
  );
}
