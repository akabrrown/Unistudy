-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Add vector columns
ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE public.past_paper_questions ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 2. Create HNSW indices for fast approximate nearest neighbor search
-- Note: hnsw requires the vector extension to be loaded.
CREATE INDEX IF NOT EXISTS slides_embedding_idx ON public.slides USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS flashcards_embedding_idx ON public.flashcards USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS past_paper_questions_embedding_idx ON public.past_paper_questions USING hnsw (embedding vector_cosine_ops);

-- 3. Create the match_study_content RPC
-- This function will search across all three tables and return a unified ranked list.
-- It filters by the provided user_id to ensure students only search their own courses/content.
CREATE OR REPLACE FUNCTION match_study_content (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  content_type text,
  course_id uuid,
  lecture_id uuid,
  past_paper_id uuid,
  slide_number int,
  front text,
  back text,
  text_content text,
  explanation text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH all_matches AS (
    -- Search Slides
    SELECT 
      s.id,
      'slide'::text as content_type,
      l.course_id,
      s.lecture_id,
      NULL::uuid as past_paper_id,
      s.slide_number,
      NULL::text as front,
      NULL::text as back,
      s.raw_text as text_content,
      s.explanation,
      1 - (s.embedding <=> query_embedding) as similarity
    FROM public.slides s
    JOIN public.lectures l ON s.lecture_id = l.id
    JOIN public.courses c ON l.course_id = c.id
    WHERE c.user_id = p_user_id
      AND s.embedding IS NOT NULL
      AND 1 - (s.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Search Flashcards
    SELECT 
      f.id,
      'flashcard'::text as content_type,
      l.course_id,
      f.lecture_id,
      NULL::uuid as past_paper_id,
      NULL::int as slide_number,
      f.front,
      f.back,
      NULL::text as text_content,
      NULL::text as explanation,
      1 - (f.embedding <=> query_embedding) as similarity
    FROM public.flashcards f
    JOIN public.lectures l ON f.lecture_id = l.id
    JOIN public.courses c ON l.course_id = c.id
    WHERE f.user_id = p_user_id  -- Flashcards also have user_id directly
      AND f.embedding IS NOT NULL
      AND 1 - (f.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Search Past Paper Questions
    SELECT 
      ppq.id,
      'past_paper_question'::text as content_type,
      pp.course_id,
      NULL::uuid as lecture_id,
      ppq.past_paper_id,
      NULL::int as slide_number,
      NULL::text as front,
      NULL::text as back,
      ppq.text_content,
      NULL::text as explanation,
      1 - (ppq.embedding <=> query_embedding) as similarity
    FROM public.past_paper_questions ppq
    JOIN public.past_papers pp ON ppq.past_paper_id = pp.id
    JOIN public.courses c ON pp.course_id = c.id
    WHERE c.user_id = p_user_id
      AND ppq.embedding IS NOT NULL
      AND 1 - (ppq.embedding <=> query_embedding) > match_threshold
  )
  SELECT 
    am.id,
    am.content_type,
    am.course_id,
    am.lecture_id,
    am.past_paper_id,
    am.slide_number,
    am.front,
    am.back,
    am.text_content,
    am.explanation,
    am.similarity
  FROM all_matches am
  ORDER BY am.similarity DESC
  LIMIT match_count;
END;
$$;
