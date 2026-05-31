-- HNSW index for cosine similarity search (no training step required)
CREATE INDEX IF NOT EXISTS instructions_embedding_idx
  ON instructions
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
