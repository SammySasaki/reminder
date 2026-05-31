import { useEffect, useState } from 'react';
import { getLogs } from '../lib/api.js';

export default function LogsTable() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLogs()
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#aaa' }}>Loading…</p>;
  if (error) return <p style={{ color: 'var(--error)' }}>{error}</p>;
  if (!logs.length) return <div className="empty-state"><p>No questions logged yet.</p></div>;

  return (
    <table className="log-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Question</th>
          <th>Answered</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td style={{ whiteSpace: 'nowrap', color: '#aaa', fontSize: '0.8rem' }}>
              {new Date(log.asked_at).toLocaleString('en-US')}
            </td>
            <td>{log.raw_question}</td>
            <td>
              {log.answered_confidently
                ? <span className="badge-yes">✓ Answered</span>
                : <span className="badge-no">✗ Unsure</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
