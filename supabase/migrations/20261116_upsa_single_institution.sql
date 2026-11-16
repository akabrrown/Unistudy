-- Migration: Consolidate UniStudy as a dedicated, single-institution platform for
-- University of Professional Studies, Accra (UPSA)
-- Date: 2026-11-16

-- 1. Ensure UPSA is present and canonical in public.institutions
INSERT INTO public.institutions (id, name, abbreviation, domain, country, city, type, verified)
VALUES (
  '00000000-0000-0000-0000-000000007054',
  'University of Professional Studies, Accra',
  'UPSA',
  'upsamail.edu.gh',
  'Ghana',
  'Accra',
  'university',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = 'University of Professional Studies, Accra',
  abbreviation = 'UPSA',
  domain = 'upsamail.edu.gh',
  verified = TRUE;

-- If an existing UPSA record exists under another UUID, alias or consolidate it
DO $$
DECLARE
  v_upsa_id UUID;
BEGIN
  SELECT id INTO v_upsa_id FROM public.institutions 
  WHERE abbreviation = 'UPSA' OR name ILIKE '%Professional Studies%' 
  ORDER BY (id = '00000000-0000-0000-0000-000000007054'::uuid) DESC 
  LIMIT 1;

  IF v_upsa_id IS NOT NULL THEN
    -- Update all user profiles to UPSA
    UPDATE public.profiles
    SET 
      institution_id = v_upsa_id,
      university = 'University of Professional Studies, Accra'
    WHERE institution_id IS NULL OR institution_id != v_upsa_id OR university IS NULL OR university != 'University of Professional Studies, Accra';

    -- Update all past papers to UPSA
    UPDATE public.past_papers
    SET institution_id = v_upsa_id
    WHERE institution_id IS NULL OR institution_id != v_upsa_id;
  END IF;
END $$;

-- 2. Alter profiles table to standardize on UPSA academic structure
ALTER TABLE public.profiles 
  ALTER COLUMN university SET DEFAULT 'University of Professional Studies, Accra',
  ADD COLUMN IF NOT EXISTS faculty TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS student_id_number TEXT;

-- 3. Create UPSA faculties and departments reference table
CREATE TABLE IF NOT EXISTS public.upsa_faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  dean_or_head TEXT,
  description TEXT,
  departments JSONB DEFAULT '[]'::jsonb,
  programmes JSONB DEFAULT '[]'::jsonb,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on upsa_faculties
ALTER TABLE public.upsa_faculties ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anon users to read faculties
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read of upsa_faculties" ON public.upsa_faculties;
  CREATE POLICY "Allow public read of upsa_faculties"
    ON public.upsa_faculties FOR SELECT
    TO public
    USING (true);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Allow admins to manage upsa_faculties
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow admin write to upsa_faculties" ON public.upsa_faculties;
  CREATE POLICY "Allow admin write to upsa_faculties"
    ON public.upsa_faculties FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 4. Seed the 5 Official UPSA Faculties with their Departments & Degree Programmes
INSERT INTO public.upsa_faculties (code, name, short_name, description, departments, programmes, display_order)
VALUES
(
  'FITCS',
  'Faculty of Information Technology and Communication Studies',
  'FITCS',
  'Leading digital innovation, computing, and communications at UPSA.',
  '[
    {"name": "Department of Information Technology", "code": "IT"},
    {"name": "Department of Communication Studies", "code": "COMM"}
  ]'::jsonb,
  '[
    "BSc Information Technology Management",
    "BSc Computer Science",
    "BSc Business Information Systems",
    "BA Communication Studies",
    "BA Public Relations Management"
  ]'::jsonb,
  1
),
(
  'FAF',
  'Faculty of Accounting and Finance',
  'Accounting & Finance',
  'Premier accounting, actuarial science, and financial management institution.',
  '[
    {"name": "Department of Accounting", "code": "ACC"},
    {"name": "Department of Banking and Finance", "code": "BF"}
  ]'::jsonb,
  '[
    "BSc Accounting",
    "BSc Banking and Finance",
    "BSc Actuarial Science",
    "BSc Accounting and Finance"
  ]'::jsonb,
  2
),
(
  'FMS',
  'Faculty of Management Studies',
  'Management Studies',
  'Excellence in marketing, administration, and entrepreneurship.',
  '[
    {"name": "Department of Business Administration", "code": "BA"},
    {"name": "Department of Marketing", "code": "MKT"}
  ]'::jsonb,
  '[
    "Bachelor of Business Administration (BBA)",
    "BSc Marketing",
    "BSc Human Resource Management",
    "BSc Logistics and Supply Chain Management"
  ]'::jsonb,
  3
),
(
  'LAW',
  'UPSA Law School',
  'UPSA Law',
  'Training ethical, commercial, and constitutional legal scholars.',
  '[
    {"name": "Department of Private and Commercial Law", "code": "PCL"},
    {"name": "Department of Public and International Law", "code": "PIL"}
  ]'::jsonb,
  '[
    "Bachelor of Laws (LLB - 4-Year Regular)",
    "Bachelor of Laws (LLB - 3-Year Post-First Degree)"
  ]'::jsonb,
  4
),
(
  'GRAD',
  'School of Graduate Studies',
  'Graduate Studies',
  'Advanced research, executive MBAs, MSc, and doctoral degrees.',
  '[
    {"name": "Department of Postgraduate Business", "code": "PGB"},
    {"name": "Department of Postgraduate Technology & Leadership", "code": "PTL"}
  ]'::jsonb,
  '[
    "MBA Accounting and Finance",
    "MBA Corporate Governance",
    "MBA Marketing",
    "MBA Petroleum Accounting and Finance",
    "MSc Information Technology Management",
    "MSc Leadership",
    "MPhil Finance"
  ]'::jsonb,
  5
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  description = EXCLUDED.description,
  departments = EXCLUDED.departments,
  programmes = EXCLUDED.programmes,
  display_order = EXCLUDED.display_order;

-- 5. Mark non-UPSA institutions as inactive or archive them
UPDATE public.institutions
SET verified = FALSE
WHERE abbreviation != 'UPSA' AND name NOT ILIKE '%Professional Studies%';
