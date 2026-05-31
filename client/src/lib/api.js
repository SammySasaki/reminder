import { supabase } from './supabase.js';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function transcribeAudio(blob, mimeType, language = 'ko') {
  const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
  const formData = new FormData();
  formData.append('audio', blob, `recording.${ext}`);
  formData.append('language', language);
  const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Transcription failed');
  return res.json();
}

export async function askQuestion(question, language = 'ko') {
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, language }),
  });
  if (!res.ok) throw new Error('Ask failed');
  return res.json();
}

export async function getInstructions() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/instructions`, { headers });
  if (!res.ok) throw new Error('Failed to load instructions');
  return res.json();
}

export async function createInstruction(data) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/instructions`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create instruction');
  return res.json();
}

export async function updateInstruction(id, data) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/instructions/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update instruction');
  return res.json();
}

export async function deleteInstruction(id) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/instructions/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete instruction');
  return res.json();
}

export async function getLogs() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/instructions/logs`, { headers });
  if (!res.ok) throw new Error('Failed to load logs');
  return res.json();
}
