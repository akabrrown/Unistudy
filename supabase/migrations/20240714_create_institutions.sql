-- Migration: Create institutions table for Ghanaian universities
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  domain TEXT,
  country TEXT DEFAULT 'Ghana',
  city TEXT,
  type TEXT DEFAULT 'university',
  verified BOOLEAN DEFAULT FALSE,
  student_count INT DEFAULT 0
);

-- Seed with a few Ghanaian institutions (can be expanded later)
INSERT INTO public.institutions (name, abbreviation, domain, city, type, verified)
VALUES
  ('University of Professional Studies, Accra', 'UPSA', 'upsamail.edu.gh', 'Accra', 'university', TRUE),
  ('Kwame Nkrumah University of Science and Technology', 'KNUST', 'knust.edu.gh', 'Kumasi', 'university', TRUE),
  ('University of Ghana', 'UG', 'ug.edu.gh', 'Accra', 'university', TRUE),
  ('Ashesi University', 'AU', 'ashesi.edu.gh', 'Berekuso', 'university', TRUE);
