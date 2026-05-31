import { Router } from 'express';
import { normalizeQuestion } from '../lib/normalize.js';
import { embedText } from '../lib/embed.js';
import { generateSpeechBase64 } from '../lib/tts.js';
import { filterByScheduleRelevance } from '../lib/scheduleFilter.js';
import { getTodayLocal, getDayOfWeekLocal, getDayNameLocal } from '../lib/dateUtils.js';
import { buildSystemPrompt } from '../prompts/askSystemPrompt.js';
import { getRedis } from '../lib/redis.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { anthropic } from '../lib/anthropic.js';

const router = Router();

const SIMILARITY_THRESHOLD = 0.65;
const FALLBACK_MEMBER = process.env.FALLBACK_FAMILY_MEMBER || 'a family member';

async function logQuestion({ raw_question, normalized_question, answered_confidently, matched_instruction_ids }) {
  try {
    await supabaseAdmin.from('question_logs').insert({
      raw_question,
      normalized_question,
      answered_confidently,
      matched_instruction_ids,
    });
  } catch (err) {
    console.error('[log]', err.message);
  }
}

router.post('/', async (req, res) => {
  const { question: raw, language = process.env.DEFAULT_STT_LANGUAGE || 'ko' } = req.body;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  const normalized = normalizeQuestion(raw);
  const todayStr = getTodayLocal();
  const cacheKey = `ask:${normalized}:${todayStr}`;

  // Cache check
  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    console.error('[cache read]', err.message);
  }

  const dayOfWeek = getDayOfWeekLocal();
  const dayName = getDayNameLocal();

  // Fetch general config
  let generalConfig = '';
  try {
    const { data } = await supabaseAdmin
      .from('general_config')
      .select('info')
      .eq('id', 1)
      .single();
    generalConfig = data?.info || '';
  } catch (err) {
    console.error('[config]', err.message);
  }

  // Embed + retrieve
  let rawInstructions = [];
  try {
    const embedding = await embedText(normalized);
    const { data, error } = await supabaseAdmin.rpc('match_instructions', {
      query_embedding: embedding,
      match_count: 8,
    });
    if (error) throw error;
    rawInstructions = data || [];
  } catch (err) {
    console.error('[retrieval]', err.message);
    return res.status(500).json({ error: 'Retrieval failed' });
  }

  const filtered = filterByScheduleRelevance(rawInstructions, dayOfWeek);
  const maxSimilarity = filtered.length > 0 ? Math.max(...filtered.map((i) => i.similarity)) : 0;

  let answer;
  let confident;

  const notSureKo = `잘 모르겠어요. ${FALLBACK_MEMBER}에게 물어봐 주세요.`;
  const notSureEn = `I'm not sure. Please ask ${FALLBACK_MEMBER}.`;

  if (maxSimilarity < SIMILARITY_THRESHOLD) {
    answer = language === 'ko' ? notSureKo : notSureEn;
    confident = false;
  } else {
    try {
      const instructionsText = filtered
        .map((i, idx) => `[${idx + 1}] ${i.content}`)
        .join('\n');

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        system: buildSystemPrompt(todayStr, dayName, FALLBACK_MEMBER, language, generalConfig),
        messages: [
          {
            role: 'user',
            content: `Family instructions:\n${instructionsText}\n\nQuestion: ${raw}`,
          },
        ],
      });
      answer = message.content[0].text.trim();
      confident = true;
    } catch (err) {
      console.error('[claude]', err.message);
      answer = language === 'ko' ? notSureKo : notSureEn;
      confident = false;
    }
  }

  // TTS
  let audioBase64 = '';
  try {
    audioBase64 = await generateSpeechBase64(answer);
  } catch (err) {
    console.error('[tts]', err.message);
  }

  const payload = { answer, confident, audioBase64 };

  // Cache write
  try {
    const redis = getRedis();
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 172800);
  } catch (err) {
    console.error('[cache write]', err.message);
  }

  // Log
  await logQuestion({
    raw_question: raw,
    normalized_question: normalized,
    answered_confidently: confident,
    matched_instruction_ids: filtered.map((i) => i.id),
  });

  return res.json(payload);
});

export default router;
