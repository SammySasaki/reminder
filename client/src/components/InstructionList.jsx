const CATEGORY_LABELS = {
  schedule: 'Schedule',
  howto: 'How-to',
  contact: 'Contact',
  other: 'Other',
};

const RELEVANCE_LABELS = {
  everyday: 'Everyday',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  specific_days: 'Specific days',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function InstructionList({ instructions, onEdit, onDelete }) {
  if (!instructions.length) {
    return <div className="empty-state"><p>No instructions yet.<br />Use the button above to add one.</p></div>;
  }

  return (
    <div>
      {instructions.map((inst) => (
        <div key={inst.id} className="instruction-card">
          <div className="content">
            <p>{inst.content}</p>
            <p className="meta">
              {CATEGORY_LABELS[inst.category]} · {RELEVANCE_LABELS[inst.schedule_relevance]}
              {inst.schedule_relevance === 'specific_days' && inst.specific_days?.length > 0
                ? ` (${[...inst.specific_days].sort((a, b) => a - b).map((d) => DAYS[d]).join(', ')})`
                : ''}
            </p>
          </div>
          <div className="actions">
            <button className="btn btn-secondary" onClick={() => onEdit(inst)}>Edit</button>
            <button className="btn btn-danger" onClick={() => onDelete(inst.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
