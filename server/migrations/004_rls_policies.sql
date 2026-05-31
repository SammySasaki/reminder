-- Enable RLS
ALTER TABLE instructions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_logs ENABLE ROW LEVEL SECURITY;

-- instructions: anon can read, authenticated users can write
CREATE POLICY "anon can read instructions"
  ON instructions FOR SELECT USING (true);

CREATE POLICY "authenticated can insert instructions"
  ON instructions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated can update instructions"
  ON instructions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated can delete instructions"
  ON instructions FOR DELETE TO authenticated USING (true);

-- question_logs: anon can log questions, authenticated users can read logs
CREATE POLICY "anon can log questions"
  ON question_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "authenticated can read logs"
  ON question_logs FOR SELECT TO authenticated USING (true);
