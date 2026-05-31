CREATE TABLE IF NOT EXISTS question_logs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_question            text,
  normalized_question     text,
  answered_confidently    bool,
  matched_instruction_ids uuid[],
  asked_at                timestamptz DEFAULT now()
);
