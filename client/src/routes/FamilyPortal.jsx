import { useEffect, useState, useCallback } from 'react';
import '../styles/portal.css';
import { supabase } from '../lib/supabase.js';
import MagicLinkLogin from '../components/MagicLinkLogin.jsx';
import InstructionList from '../components/InstructionList.jsx';
import InstructionForm from '../components/InstructionForm.jsx';
import BulkUpload from '../components/BulkUpload.jsx';
import LogsTable from '../components/LogsTable.jsx';
import { getInstructions, createInstruction, updateInstruction, deleteInstruction } from '../lib/api.js';

const TABS = ['Instructions', 'Bulk Upload', 'Question Logs', 'Settings'];

function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem('testLanguage') || 'ko');
  const toggle = (l) => { setLang(l); localStorage.setItem('testLanguage', l); };
  return [lang, toggle];
}

export default function FamilyPortal() {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState(0);
  const [instructions, setInstructions] = useState([]);
  const [editTarget, setEditTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [lang, setLang] = useLang();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const loadInstructions = useCallback(() => {
    getInstructions().then(setInstructions).catch(console.error);
  }, []);

  useEffect(() => {
    if (session) loadInstructions();
  }, [session, loadInstructions]);

  if (session === undefined) return null;
  if (!session) return <MagicLinkLogin />;

  const handleSave = async (data) => {
    setFormLoading(true);
    try {
      if (editTarget) {
        await updateInstruction(editTarget.id, data);
      } else {
        await createInstruction(data);
      }
      setShowForm(false);
      setEditTarget(null);
      loadInstructions();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this instruction?')) return;
    try {
      await deleteInstruction(id);
      loadInstructions();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleEdit = (inst) => {
    setEditTarget(inst);
    setShowForm(true);
  };

  return (
    <div className="portal-root">
      <div className="portal-header">
        <h1>Family Portal</h1>
        <button
          className="btn btn-secondary"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </div>

      <nav className="portal-nav">
        {TABS.map((name, i) => (
          <button
            key={i}
            className={tab === i ? 'active' : ''}
            onClick={() => setTab(i)}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === 0 && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => { setEditTarget(null); setShowForm(true); }}>
              + Add instruction
            </button>
          </div>
          <InstructionList
            instructions={instructions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}

      {tab === 1 && <BulkUpload onDone={loadInstructions} />}
      {tab === 2 && <LogsTable />}

      {tab === 3 && (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Settings</h2>

          <div className="lang-toggle">
            <span>Grandma's screen language:</span>
            <div className="lang-toggle-btns">
              <button className={lang === 'ko' ? 'selected' : ''} onClick={() => setLang('ko')}>
                🇰🇷 Korean
              </button>
              <button className={lang === 'en' ? 'selected' : ''} onClick={() => setLang('en')}>
                🇺🇸 English
              </button>
            </div>
          </div>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            Controls the language of the assistant screen (speech recognition, answers, and voice).<br />
            This portal is always in English.
          </p>

          <div style={{ marginTop: '2rem', background: '#22223b', borderRadius: 8, padding: '1rem' }}>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
              The fallback family member name (FALLBACK_FAMILY_MEMBER) is set as a server environment variable.<br />
              To change it, edit the <code>.env</code> file on the server.
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <h2>{editTarget ? 'Edit instruction' : 'Add instruction'}</h2>
            <InstructionForm
              instruction={editTarget}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditTarget(null); }}
              loading={formLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
