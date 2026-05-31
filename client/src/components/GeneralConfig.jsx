import { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../lib/api.js';

export default function GeneralConfig() {
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getConfig()
      .then((d) => setInfo(d.info || ''))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateConfig(info);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: '#aaa' }}>Loading…</p>;

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>General context</h3>
      <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>
        This text is injected into every Claude prompt. Use it for anything that should always be known — the person's name, family members, doctor, pets, address, or any standing instructions for how the assistant should behave.
      </p>
      <div className="form-group">
        <textarea
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          rows={8}
          placeholder={"e.g.\nName: Grandma Rose\nFamily: Daughter Eda (primary contact, 010-1234-5678), Son David\nDoctor: Dr. Kim at Seoul Clinic\nAlways speak slowly and reassuringly."}
        />
      </div>
      {error && <p style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>{error}</p>}
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  );
}
