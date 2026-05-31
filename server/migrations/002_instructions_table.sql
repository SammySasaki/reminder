CREATE TABLE IF NOT EXISTS instructions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content            text NOT NULL,
  category           text NOT NULL DEFAULT 'other'
                       CHECK (category IN ('schedule','howto','contact','other')),
  schedule_relevance text NOT NULL DEFAULT 'everyday'
                       CHECK (schedule_relevance IN ('everyday','weekdays','weekends','specific_days')),
  specific_days      int[],
  embedding          vector(1536),
  created_by         uuid REFERENCES auth.users,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
