import { Router } from 'express';
import multer from 'multer';
import { openai } from '../lib/openai.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 24 * 1024 * 1024 },
});

router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file received' });
  }

  const lang = req.body.language || process.env.DEFAULT_STT_LANGUAGE || 'ko';
  const originalName = req.file.originalname || 'audio.webm';

  const audioFile = new File([req.file.buffer], originalName, {
    type: req.file.mimetype,
  });

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
      language: lang,
    });
    return res.json({ transcription: transcription.text });
  } catch (err) {
    console.error('[transcribe]', err.message);
    return res.status(500).json({ error: 'Transcription failed' });
  }
});

export default router;
