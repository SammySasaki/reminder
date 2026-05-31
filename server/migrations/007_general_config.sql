CREATE TABLE general_config (
  id         integer PRIMARY KEY DEFAULT 1,
  info       text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO general_config (id, info) VALUES (1, '');

ALTER TABLE general_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read config"
  ON general_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can update config"
  ON general_config FOR UPDATE TO authenticated USING (true);

GRANT SELECT, UPDATE ON general_config TO authenticated;
GRANT ALL ON general_config TO service_role;
