import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { embedText } from '../lib/embed.js';
import { getRedis } from '../lib/redis.js';
import { getTodayLocal } from '../lib/dateUtils.js';

const router = Router();

async function getUserFromToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user || null;
}

async function bustTodayCache() {
  try {
    const redis = getRedis();
    const today = getTodayLocal();
    const keys = await redis.keys(`ask:*:${today}`);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    console.error('[cache bust]', err.message);
  }
}

// GET /api/instructions
router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('instructions')
    .select('id, content, category, schedule_relevance, specific_days, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/instructions
router.post('/', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { content, category, schedule_relevance, specific_days } = req.body;
  if (!content || !category) return res.status(400).json({ error: 'content and category required' });

  let embedding;
  try {
    embedding = await embedText(content);
  } catch (err) {
    return res.status(500).json({ error: 'Embedding failed' });
  }

  const { data, error } = await supabaseAdmin.from('instructions').insert({
    content,
    category,
    schedule_relevance: schedule_relevance || 'everyday',
    specific_days: specific_days || null,
    embedding,
    created_by: user.id,
  }).select('id, content, category, schedule_relevance, specific_days, created_at').single();

  if (error) return res.status(500).json({ error: error.message });
  await bustTodayCache();
  return res.status(201).json(data);
});

// PUT /api/instructions/:id
router.put('/:id', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { content, category, schedule_relevance, specific_days } = req.body;
  const updates = { category, schedule_relevance, specific_days, updated_at: new Date().toISOString() };

  if (content) {
    updates.content = content;
    try {
      updates.embedding = await embedText(content);
    } catch (err) {
      return res.status(500).json({ error: 'Embedding failed' });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('instructions')
    .update(updates)
    .eq('id', req.params.id)
    .select('id, content, category, schedule_relevance, specific_days, updated_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  await bustTodayCache();
  return res.json(data);
});

// DELETE /api/instructions/:id
router.delete('/:id', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { error } = await supabaseAdmin.from('instructions').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await bustTodayCache();
  return res.json({ ok: true });
});

// GET /api/logs
router.get('/logs', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabaseAdmin
    .from('question_logs')
    .select('id, raw_question, answered_confidently, asked_at')
    .order('asked_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
