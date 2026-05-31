CREATE OR REPLACE FUNCTION match_instructions(
  query_embedding vector(1536),
  match_count     int
)
RETURNS TABLE (
  id                  uuid,
  content             text,
  category            text,
  schedule_relevance  text,
  specific_days       int[],
  similarity          float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    category,
    schedule_relevance,
    specific_days,
    1 - (embedding <=> query_embedding) AS similarity
  FROM instructions
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
