-- Migration: Refresh materialized view helper
CREATE OR REPLACE FUNCTION public.refresh_institution_student_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY institution_student_counts;
END;
$$;
