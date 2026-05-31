import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import askRouter from './routes/ask.js';
import transcribeRouter from './routes/transcribe.js';
import instructionsRouter from './routes/instructions.js';
import configRouter from './routes/config.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () =>
    console.log(`[${req.method}] ${req.path} ${res.statusCode} ${Date.now() - start}ms`)
  );
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/ask', askRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/instructions', instructionsRouter);
app.use('/api/config', configRouter);
// Logs are served at /api/instructions/logs (handled by instructionsRouter)

app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
