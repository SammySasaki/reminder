import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

async function getUserFromToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user || null;
}

// GET /api/config
router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('general_config')
    .select('info')
    .eq('id', 1)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ info: data?.info || '' });
});

// PUT /api/config
router.put('/', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { info } = req.body;
  if (typeof info !== 'string') return res.status(400).json({ error: 'info must be a string' });

  const { error } = await supabaseAdmin
    .from('general_config')
    .upsert({ id: 1, info, updated_at: new Date().toISOString() });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
