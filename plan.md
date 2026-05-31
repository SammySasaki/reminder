Project Plan: Voice Assistant for a Family Member with Dementia
Purpose & Context (read this first)
This is an AI voice assistant for an elderly user with dementia. Family members upload plain-language "instructions" (schedules, how-tos, contact info). The user asks questions out loud and gets simple, calm spoken answers grounded in those instructions.
The user has dementia. This is the single most important design constraint and it shapes every decision below:
The user will repeat the same questions many times per day. This is expected.
The user must face zero friction — no login, no navigation, no small buttons.
Wrong answers have real consequences (medication, pickup times). The system must be conservative: when it is not confident, it must NOT guess. It says it is unsure and tells the user to ask a named family member.
Responses must be short, plain, warm, and unconfusing.
Two completely separate interfaces:
Assistant view — the user. No auth, fullscreen, tap-to-talk, large text + voice.
Family portal — relatives. Authenticated. Add/edit/delete instructions; view logs.

Tech Stack (decided — do not substitute)
Frontend: React, built as an installable PWA (manifest + minimal service worker, display: standalone, HTTPS). The assistant view must launch fullscreen with no browser chrome when added to the iOS/Android home screen.
Backend/DB/Auth/Storage: Supabase (free tier) — Postgres + pgvector for embeddings, Supabase Auth for the family portal, Row Level Security (RLS) for the no-auth-read / auth-write split.
Embeddings: OpenAI text-embedding-3-small (1536 dims). Requires an OpenAI API key.
Generation LLM: Anthropic Claude API (use the official SDK). Requires an Anthropic API key.
Voice: Web Speech API for both speech-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis). Free, browser-native, works on iOS Safari. (ElevenLabs TTS is a documented future upgrade — do NOT build it in v1.)
Cache: Redis on Railway (the developer already has a Railway account). Used for a response cache (see Caching section). Provide a REDIS_URL env var.
Environment variables the app expects
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-side only, never shipped to client
OPENAI_API_KEY=              # server-side only
ANTHROPIC_API_KEY=           # server-side only
REDIS_URL=                   # server-side only

Critical: OpenAI, Anthropic, and the Supabase service-role key must NEVER be exposed to the client. All embedding, retrieval, LLM, and cache calls happen on the server (a small Node/Express API or Supabase Edge Functions — see Architecture).

Architecture
[Assistant PWA] --voice--> STT (browser) --text--> 
    POST /ask  (server)
      -> normalize question
      -> check Redis cache key = ask:{normalized_question}:{YYYY-MM-DD}
         -> HIT: return cached answer
         -> MISS:
            1. embed question (OpenAI)
            2. pgvector similarity search over instructions (top-K, e.g. K=8),
               pre-filtered by schedule relevance for today (see Date Awareness)
            3. Claude rerank/answer with retrieved instructions + today's date/day
               injected into the prompt (see Conservative Behavior)
            4. write answer to Redis cache (no explicit TTL needed; date in key
               means tomorrow's key differs and old keys go cold)
            5. log the question + confidence to Postgres
      -> return { answer, confident: bool }
    <-- text answer --> TTS (browser) + large on-screen text

[Family Portal] (authenticated)
    create/edit/delete instruction
      -> on save: embed instruction text (OpenAI), store row + vector in Postgres
      -> bulk upload: embed multiple instructions CONCURRENTLY (Promise.all)
    view logs (what was asked, when, whether answered confidently)

Use a small server layer (Node/Express is fine, or Supabase Edge Functions) for all /ask logic so secrets stay server-side. The React app talks to this server, not directly to OpenAI/Anthropic.

Data Model (Postgres / Supabase)
Enable the vector extension (pgvector).
instructions
column
type
notes
id
uuid pk
default gen_random_uuid()
content
text
the plain-language instruction
category
text
enum-ish: 'schedule' | 'howto' | 'contact' | 'other'
schedule_relevance
text
'everyday' | 'weekdays' | 'weekends' | 'specific_days'
specific_days
int[]
nullable; 0=Sun..6=Sat, used when schedule_relevance='specific_days'
embedding
vector(1536)
OpenAI text-embedding-3-small
created_by
uuid
references auth.users
created_at
timestamptz
default now()
updated_at
timestamptz



Add an ivfflat (or hnsw) index on embedding for cosine distance.
question_logs
column
type
notes
id
uuid pk


raw_question
text


normalized_question
text


answered_confidently
bool


matched_instruction_ids
uuid[]
which instructions were retrieved
asked_at
timestamptz
default now()

(No separate users table — use Supabase auth.users.)
Row Level Security (this implements the no-auth-grandma / auth-family split)
instructions:
SELECT allowed for anon role (the assistant view reads with the anon key).
INSERT/UPDATE/DELETE allowed only for authenticated users.
question_logs:
INSERT allowed for anon (the assistant logs questions).
SELECT allowed only for authenticated users (family reviews logs).
Note for the developer: anon SELECT means anyone with the URL + anon key could read instructions. Acceptable for a private family project. A future hardening option is a dedicated read-only token for the assistant device — document it, don't build it in v1.

Date / Time Awareness (required — the core schedule use case)
The user's primary questions are time-dependent ("do I have daycare today?"). The system MUST know what day it is.
The server computes today's date and day-of-week (use the family's local timezone — make it a config constant, e.g. America/Los_Angeles).
Pre-filter retrieved instructions: when schedule_relevance rules out today (e.g. 'weekdays' instruction on a Saturday), drop or down-rank it before sending to Claude.
Inject the current date and day-of-week into Claude's prompt so it can reason ("Today is Saturday. There is no daycare on weekends, so the answer is no.").

Two-Stage Retrieval
Stage 1 — embedding retrieval: embed the question with OpenAI, pgvector cosine search for top-K (start K=8) instructions, after the date pre-filter.
Stage 2 — Claude rerank + answer: pass the retrieved instructions, today's date/day, and the question to Claude. Claude selects the relevant instruction(s) and writes the final simple answer.
Note for the developer: the instruction corpus is small (dozens), so embedding retrieval is not strictly necessary for quality — but it is intentional here. Keep it. (It is a deliberate demonstration of vector-based RAG.)

Conservative Behavior (safety — non-negotiable)
This system serves a vulnerable user. Wrong confident answers are the worst outcome.
Claude's system prompt must instruct: if the retrieved instructions do not clearly answer the question, respond that you are not sure and tell the user to ask a specific family member (configurable name/relationship). Do NOT guess or invent.
Return a confident boolean from the server (e.g. based on whether Claude indicated it had a grounded answer / similarity scores cleared a threshold). Log it.
Keep answers short, calm, literal, and reassuring. No medical advice. No improvising schedules, dosages, or contact details not present in the instructions.
If similarity scores are all weak (below a threshold), short-circuit to the "I'm not sure, please ask {family_member}" response without even calling Claude.

Caching (Redis on Railway)
Motivated directly by the user: she repeats questions constantly.
Key: ask:{normalized_question}:{YYYY-MM-DD} (date in the key = automatic daily freshness; an instruction edit mid-day is an acceptable rare staleness window for v1 — optionally bust the cache for the day on any instruction write).
Value: the { answer, confident } payload.
Flow: check cache before embedding; on miss, run the pipeline and write the result.
Normalization: lowercase, trim, collapse whitespace, strip trailing punctuation so "Daycare today?" and "daycare today" hit the same key.
Optional enhancement (document, don't require): if an instruction is created or edited, delete today's ask:*:{today} keys so answers refresh.

Concurrency
The per-question pipeline is sequential by nature — do not force parallelism there.
The ONE place to parallelize: bulk instruction upload in the family portal — embed multiple instructions concurrently with Promise.all rather than sequentially.
(Do NOT add a NoSQL database. Relational + pgvector is the correct fit; everything here is small and relational.)

Frontend Detail
Assistant view (/ — the user)
Fullscreen, high-contrast, very large text. One large central "Tap to talk" button.
Flow: tap -> listen (SpeechRecognition) -> show the recognized question in large text -> show + speak (SpeechSynthesis) the answer in large text.
No navigation, no auth, no settings visible. Forgiving: if STT fails, a big "try again" prompt.
PWA: manifest.json (name, icons, display: standalone, theme color), minimal service worker to cache the app shell so it loads even on flaky wifi.
Family portal (/family — authenticated)
Supabase Auth, magic link sign-in (no password to remember).
CRUD on instructions: content textarea, category select, schedule_relevance select (+ specific-days picker when relevant).
Logs view: table of recent questions, timestamp, and answered-confidently flag, so family can see what she struggles with.
A config area for the fallback family-member name/relationship used in the "I'm not sure, ask ___" responses.

Build Order (suggested milestones)
Scaffold: React + PWA shell, Express/Edge server, Supabase project, env wiring.
Data + RLS: create tables, pgvector extension + index, RLS policies. Verify anon can SELECT instructions and authenticated can write.
Family portal auth + instruction CRUD (embed on save; bulk upload concurrent).
/ask pipeline: normalize -> (cache) -> embed -> pgvector retrieve -> date filter -> Claude answer -> conservative fallback -> log. Cache last.
Assistant view: tap-to-talk STT/TTS wired to /ask, large-text UI.
Date awareness + conservative-behavior prompt hardening (test weekday vs weekend, test unanswerable questions -> must defer to family member).
Caching: add Redis, response cache by (question, date), optional write-busting.
Polish: PWA install on a real device, fullscreen check, voice quality pass.

Out of Scope for v1 (documented future work)
Always-listening / wake word (would need a dedicated device, e.g. Raspberry Pi).
ElevenLabs / premium TTS for a warmer voice.
Dedicated read-only token for the assistant device.
Multi-user / multiple care recipients.
Acceptance Checks
[ ] Assistant view requires no login and runs fullscreen as an installed PWA.
[ ] "Do I have daycare today?" gives the correct answer based on the real current day.
[ ] A question with no matching instruction yields a calm "I'm not sure, ask {name}", never a guess.
[ ] Asking the same question twice on the same day serves the second from cache.
[ ] Family portal: only authenticated users can add/edit/delete instructions.
[ ] No OpenAI/Anthropic/service-role keys are present in client-side bundles.
