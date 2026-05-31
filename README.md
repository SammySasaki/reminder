# 할머니 도우미 — Voice Assistant for Grandma

A voice assistant PWA for an elderly family member with dementia. Family members upload plain-language instructions (schedules, contacts, how-tos). Grandma taps a button, asks a question out loud, and hears a short, calm answer in Korean — grounded only in those instructions.

## How it works

```
Tap button → record audio (MediaRecorder)
→ POST /api/transcribe  (OpenAI Whisper, Korean STT)
→ POST /api/ask         (embed → pgvector search → Claude → OpenAI TTS)
→ display answer text + play audio
```

Two interfaces:
- **`/`** — Grandma's screen. No login, fullscreen, one big button, large text, spoken answers in Korean.
- **`/family`** — Family portal. Magic-link login. Add/edit/delete instructions, view question logs, toggle test language.

---

## Project structure

```
reminder/
├── client/          # React PWA (Vite)
│   ├── src/
│   │   ├── routes/          # AssistantView.jsx, FamilyPortal.jsx
│   │   ├── components/      # InstructionForm, LogsTable, BulkUpload, etc.
│   │   ├── hooks/           # useRecorder.js, useAudioPlayer.js
│   │   └── lib/             # supabase.js, api.js
│   └── public/
│       ├── manifest.json    # PWA manifest (display: standalone)
│       └── sw.js            # Service worker (app shell cache)
└── server/          # Node/Express API (all secrets live here)
    ├── routes/      # ask.js, transcribe.js, instructions.js
    ├── lib/         # embed, tts, redis, normalize, dateUtils, scheduleFilter
    ├── prompts/     # Claude system prompt builder
    └── migrations/  # SQL to run in Supabase (001–006)
```

---

## Setup

### 1. Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run each migration file in order:
   - `server/migrations/001_enable_pgvector.sql`
   - `server/migrations/002_instructions_table.sql`
   - `server/migrations/003_question_logs_table.sql`
   - `server/migrations/004_rls_policies.sql`
   - `server/migrations/005_embedding_index.sql`
   - `server/migrations/006_match_instructions_rpc.sql`
3. In **Authentication → URL Configuration**, add your app URL to the redirect allow-list (e.g., `http://localhost:5173` for dev, your deployed URL for prod).

### 2. Redis (Railway)

1. Create a Redis service on [Railway](https://railway.app).
2. Copy the `REDIS_URL` from the service's **Variables** tab.

### 3. Environment variables

**Server** — create `server/.env` (copy from `.env.example`):

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://...
TIMEZONE=America/Los_Angeles
FALLBACK_FAMILY_MEMBER=딸 Sarah
DEFAULT_STT_LANGUAGE=ko
```

**Client** — create `client/.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are the only values that go to the browser. Every other key stays on the server.

### 4. Run locally

```bash
# Terminal 1 — server
cd server
node index.js          # or: npm run dev  (uses --watch)

# Terminal 2 — client
cd client
npm run dev
```

Open `http://localhost:5173` — grandma's screen.  
Open `http://localhost:5173/family` — family portal.

### 5. Add instructions

1. Log in to the family portal with your email (magic link).
2. Click **지침 추가** to add an instruction, or use **대량 등록** to paste several at once (one per line).
3. For schedule-based instructions (daycare days, medication times), set the correct **반복 일정** and days.

---

## Deployment

### Server (Railway)

1. Create a new Railway service pointing to the `server/` folder.
2. Set all server env vars in Railway's **Variables** tab.
3. Railway provides HTTPS automatically — copy the public URL.

### Client (Railway)

1. Create a new Railway service in the same project, pointing to the `client/` folder.
2. Set build command `npm run build` and output directory `dist`.
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Add a `client/railway.json` to handle SPA routing (so `/family` doesn't 404 on refresh):

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "npx serve dist --single" }
}
```

5. Copy the Railway-assigned public URL for the client and add it to Supabase **Authentication → URL Configuration** redirect allow-list.

### Install as a PWA on iPhone

1. Open the deployed URL in **Safari**.
2. Tap the Share button → **홈 화면에 추가** (Add to Home Screen).
3. Launch from the home screen — it opens fullscreen with no browser chrome.

> Microphone permission will be requested on the first tap. Accept it.

---

## Key design decisions

| Decision | Reason |
|----------|--------|
| OpenAI Whisper for STT | iOS Safari's Web Speech API is unreliable; Whisper works the same on every device |
| OpenAI TTS (`tts-1`, `nova` voice) | Warm, natural voice; MP3 plays natively in iOS `Audio()` |
| Redis cache keyed `ask:{question}:{date}` | Grandma repeats questions constantly; date in key gives automatic daily freshness |
| Conservative fallback | Wrong answers have real consequences — if similarity < 0.65 or Claude is unsure, answer is "잘 모르겠어요, [name]에게 물어봐 주세요" |
| Korean STT + cross-lingual retrieval | Family writes instructions in English; `text-embedding-3-small` is multilingual; Claude is told to always respond in Korean |
| RLS on Supabase | Grandma's device uses the anon key (read-only); family portal uses magic-link auth (write access) |

---

## Testing checklist

- [ ] Grandma's screen loads fullscreen (no address bar) when installed as PWA on iPhone
- [ ] Tapping the button, speaking in Korean, and releasing gives a spoken + displayed answer
- [ ] A question with no matching instruction returns "잘 모르겠어요, [name]에게 물어봐 주세요" — never a guess
- [ ] Asking the same question twice → second response is instant (Redis cache hit)
- [ ] Adding or editing an instruction in the family portal → cache is busted, next question re-runs the pipeline
- [ ] Family portal requires magic-link login; anon users cannot write instructions
- [ ] No `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `SERVICE_ROLE_KEY` appear in the built JS bundle
- [ ] "Test language: English" toggle in portal settings switches STT/TTS to English for testing

---

## Technical reference

### Data flow

```
Grandma's device:
  Tap → MediaRecorder → POST /api/transcribe → POST /api/ask → TTS audio + text

Family portal:
  Magic-link login → Supabase Auth (browser ↔ Supabase directly)
  Add/edit instructions → POST /api/instructions (browser → Express → Supabase)
  View logs → GET /api/instructions/logs (browser → Express → Supabase)
```

Auth is the only thing the browser talks to Supabase about directly. All data calls go through Express so secrets never leave the server.

### Why the client only needs two env vars

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used solely for the magic-link auth flow — the Supabase JS client needs to know where to send the sign-in request and which credential to use. Once the family member is logged in, the resulting JWT is attached as a `Bearer` token on requests to Express. Express validates it there.

Vite requires the `VITE_` prefix to expose any variable to the browser bundle. Any variable without it stays invisible to client code — this is the first line of defence against accidentally leaking secrets.

### RLS model

| Role | `instructions` | `question_logs` |
|------|---------------|-----------------|
| anon (grandma's device, anon key) | SELECT | INSERT |
| authenticated (family, magic-link JWT) | SELECT + INSERT + UPDATE + DELETE | SELECT |

RLS is enforced at the database level — even a bug in Express that tries to delete a row with the anon key will be rejected by Supabase before it touches the data.

### Secret key hierarchy

| Key | Where it lives | What it can do |
|-----|---------------|----------------|
| `SUPABASE_ANON_KEY` | Client + Server | Subject to RLS — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS entirely — never expose |
| `OPENAI_API_KEY` | Server only | Whisper STT, embeddings, TTS |
| `ANTHROPIC_API_KEY` | Server only | Claude answer generation |
| `REDIS_URL` | Server only | Response cache |
