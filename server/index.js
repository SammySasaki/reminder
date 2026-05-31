import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import askRouter from './routes/ask.js';
import transcribeRouter from './routes/transcribe.js';
import instructionsRouter from './routes/instructions.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/ask', askRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/instructions', instructionsRouter);
// Logs are served at /api/instructions/logs (handled by instructionsRouter)

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
