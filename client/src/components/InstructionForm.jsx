import { useState, useEffect } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT = {
  content: '',
  category: 'schedule',
  schedule_relevance: 'everyday',
  specific_days: [],
};

export default function InstructionForm({ instruction, onSave, onCancel, loading }) {
  const [form, setForm] = useState(DEFAULT);

  useEffect(() => {
    if (instruction) {
      setForm({
        content: instruction.content || '',
        category: instruction.category || 'schedule',
        schedule_relevance: instruction.schedule_relevance || 'everyday',
        specific_days: instruction.specific_days || [],
      });
    } else {
      setForm(DEFAULT);
    }
  }, [instruction]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleDay = (d) => {
    set('specific_days', form.specific_days.includes(d)
      ? form.specific_days.filter((x) => x !== d)
      : [...form.specific_days, d]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.schedule_relevance !== 'specific_days') data.specific_days = null;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Content</label>
        <textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          rows={4}
          required
          placeholder="e.g. The daycare bus comes Monday, Wednesday, and Friday at 9am."
        />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select value={form.category} onChange={(e) => set('category', e.target.value)}>
          <option value="schedule">Schedule</option>
          <option value="howto">How-to</option>
          <option value="contact">Contact</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Recurrence</label>
        <select value={form.schedule_relevance} onChange={(e) => set('schedule_relevance', e.target.value)}>
          <option value="everyday">Everyday</option>
          <option value="weekdays">Weekdays</option>
          <option value="weekends">Weekends</option>
          <option value="specific_days">Specific days</option>
        </select>
      </div>

      {form.schedule_relevance === 'specific_days' && (
        <div className="form-group">
          <label>Select days</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {DAYS.map((name, i) => (
              <button
                key={i}
                type="button"
                className={`btn ${form.specific_days.includes(i) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleDay(i)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
