-- Migration: Replace course_programmes with the canonical UPSA academic catalog
-- Date: 2026-11-22
-- Covers: Diploma, Undergraduate, Postgraduate (PhD, MPhil, MBA, MSc, MA, LLM), and Professional programmes.

BEGIN;

-- 1. Ensure table has all metadata columns
ALTER TABLE public.course_programmes 
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS faculty_code TEXT,
  ADD COLUMN IF NOT EXISTS admissions_url TEXT,
  ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- 2. Clear old legacy/non-UPSA programmes
DELETE FROM public.course_programmes;

-- 3. Insert canonical UPSA Diploma Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Diploma in Accounting', 'Accounting & Finance', 'Diploma', 'Diploma', 'FAF', 'Department of Accounting', NULL, FALSE),
('Diploma in Marketing', 'Management Studies', 'Diploma', 'Diploma', 'FMS', 'Department of Marketing', NULL, FALSE),
('Diploma in Management', 'Management Studies', 'Diploma', 'Diploma', 'FMS', 'Department of Business Administration', NULL, FALSE),
('Diploma in Public Relations', 'Information Technology & Communication', 'Diploma', 'Diploma', 'FITCS', 'Department of Communication Studies', NULL, FALSE),
('Diploma in Information Technology Management', 'Information Technology & Communication', 'Diploma', 'Diploma', 'FITCS', 'Department of Information Technology Studies', NULL, FALSE);

-- 4. Insert canonical UPSA Undergraduate Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Bachelor of Science in Agribusiness and Finance', 'Accounting & Finance', 'Undergraduate', 'Undergraduate', 'FAF', 'Department of Banking and Finance', 'https://admissions.upsa.edu.gh/admissions/bsc-agribusines-and-finance/', FALSE),
('Bachelor of Arts in Applied French and Communications', 'Information Technology & Communication', 'Undergraduate', 'Undergraduate', 'FITCS', 'Department of Communication Studies', 'https://admissions.upsa.edu.gh/admissions/ba-applied-french-and-communication/', FALSE),
('Bachelor of Science in Data Science and Analytics', 'Information Technology & Communication', 'Undergraduate', 'Undergraduate', 'FITCS', 'Department of Information Technology Studies', 'https://admissions.upsa.edu.gh/admissions/bsc-data-science-and-analytics/', FALSE),
('Bachelor of Science in Applied Statistics', 'Accounting & Finance', 'Undergraduate', 'Undergraduate', 'FAF', 'Department of Economics and Actuarial Science', NULL, FALSE),
('Bachelor of Laws (LLB)', 'Law', 'Undergraduate', 'Undergraduate', 'LAW', 'UPSA Law School', 'https://admissions.upsa.edu.gh/admissions/bachelor-of-laws/', FALSE),
('Bachelor of Arts in Communication Studies', 'Information Technology & Communication', 'Undergraduate', 'Undergraduate', 'FITCS', 'Department of Communication Studies', NULL, FALSE),
('Bachelor of Science in Logistics and Transport Management', 'Management Studies', 'Undergraduate', 'Undergraduate', 'FMS', 'Department of Business Administration', NULL, FALSE),
('Bachelor of Arts in Public Relations Management', 'Information Technology & Communication', 'Undergraduate', 'Undergraduate', 'FITCS', 'Department of Communication Studies', NULL, FALSE),
('Bachelor of Science in Accounting', 'Accounting & Finance', 'Undergraduate', 'Undergraduate', 'FAF', 'Department of Accounting', NULL, FALSE),
('Bachelor of Science in Accounting and Finance', 'Accounting & Finance', 'Undergraduate', 'Undergraduate', 'FAF', 'Department of Accounting', NULL, FALSE),
('Bachelor of Science in Business Economics', 'Accounting & Finance', 'Undergraduate', 'Undergraduate', 'FAF', 'Department of Economics and Actuarial Science', NULL, FALSE),
('Bachelor of Science in Actuarial Science', 'Accounting & Finance', 'Undergraduate', 'Undergraduate', 'FAF', 'Department of Economics and Actuarial Science', NULL, FALSE),
('Bachelor of Science in Banking and Finance', 'Accounting & Finance', 'Undergraduate', 'Undergraduate', 'FAF', 'Department of Banking and Finance', NULL, FALSE),
('Bachelor of Business Administration', 'Management Studies', 'Undergraduate', 'Undergraduate', 'FMS', 'Department of Business Administration', NULL, FALSE),
('Bachelor of Science in Information Technology', 'Information Technology & Communication', 'Undergraduate', 'Undergraduate', 'FITCS', 'Department of Information Technology Studies', NULL, FALSE),
('Bachelor of Science in Applied Marketing', 'Management Studies', 'Undergraduate', 'Undergraduate', 'FMS', 'Department of Marketing', NULL, FALSE),
('Bachelor of Science in Real Estate Management and Finance', 'Management Studies', 'Undergraduate', 'Undergraduate', 'FMS', 'Department of Business Administration', NULL, FALSE);

-- 5. Insert canonical UPSA PhD Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Doctor of Philosophy in Management', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'Department of Business Administration', 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-management/', FALSE),
('Doctor of Philosophy in Marketing', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'Department of Marketing', 'https://admissions.upsa.edu.gh/admissions/graduate/phd-marketing/', FALSE),
('Doctor of Philosophy in Accounting', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'Department of Accounting', 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-accounting/', FALSE),
('Doctor of Philosophy in International Security and Intelligence', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'School of Graduate Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-international-security-and-intelligence/', FALSE),
('Doctor of Philosophy in Interdisciplinary Studies', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'School of Graduate Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-interdisciplinary-studies/', FALSE),
('Doctor of Philosophy in Finance', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'Department of Banking and Finance', 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-finance/', FALSE),
('Doctor of Philosophy in Information Systems', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'Department of Information Technology Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/pdh-information-systems/', FALSE),
('Doctor of Philosophy in Public Policy and Leadership (PhD. PPL)', 'Postgraduate Studies', 'Postgraduate', 'PhD', 'GRAD', 'School of Graduate Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-public-policy-and-leadership/', FALSE);

-- 6. Insert canonical UPSA MPhil Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Master of Philosophy in Applied Statistics', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'Department of Economics and Actuarial Science', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-applied-statistics', FALSE),
('Master of Philosophy in Accounting', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'Department of Accounting', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-accounting/', FALSE),
('Master of Philosophy in Leadership', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'School of Graduate Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-leadership/', FALSE),
('Master of Philosophy in Finance', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'Department of Banking and Finance', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-finance/', FALSE),
('Master of Philosophy in Media & Digital Communication Management', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'Department of Communication Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-media-and-digital-communication-management/', FALSE),
('Master of Philosophy in Information Systems', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'Department of Information Technology Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-information-systems/', FALSE),
('Master of Philosophy in Management', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'Department of Business Administration', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-management', FALSE),
('Master of Philosophy in Marketing', 'Postgraduate Studies', 'Postgraduate', 'MPhil', 'GRAD', 'Department of Marketing', NULL, FALSE);

-- 7. Insert canonical UPSA MBA Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Master of Business Administration in Assets and Wealth Management', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Banking and Finance', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-assets-and-wealth-management/', FALSE),
('Master of Business Administration in Human Resources Management', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Business Administration', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-human-resources-management/', FALSE),
('Master of Business Administration in Accounting and Finance', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Accounting', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-accounting-and-finance/', FALSE),
('Master of Business Administration in Auditing', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Accounting', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-auditing/', FALSE),
('Master of Business Administration in Corporate Governance', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Business Administration', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-corporate-governance/', FALSE),
('Master of Business Administration in Corporate Communications', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Communication Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-corporate-communications/', FALSE),
('Master of Business Administration in Marketing', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Marketing', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-marketing/', FALSE),
('Master of Business Administration in Internal Auditing', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Accounting', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-internal-auditing/', FALSE),
('Master of Business Administration in Petroleum Accounting & Finance', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Accounting', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-petroleum-accounting-finance/', FALSE),
('Master of Business Administration in Total Quality Management (TQM)', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Business Administration', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-total-quality-management-tqm/', FALSE),
('Master of Business Administration in Impact Entrepreneurship and Innovation', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Business Administration', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-impact-entrepreneurship-and-innovation/', FALSE),
('Master of Business Administration in Business Management', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Business Administration', NULL, FALSE),
('Master of Business Administration in Management Information Systems', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'Department of Information Technology Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-management-information-systems/', FALSE),
('Master of Business Administration in Leadership and Strategy', 'Business Administration', 'Postgraduate', 'MBA', 'GRAD', 'School of Graduate Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-leadership-and-strategy/', FALSE);

-- 8. Insert canonical UPSA MSc Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Master of Science in Applied Statistics', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'Department of Economics and Actuarial Science', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-applied-statistics', FALSE),
('Master of Science in Risk Management and Insurance', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'Department of Banking and Finance', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-risk-management-insurance', FALSE),
('Master of Science in Energy Economics and Finance', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'Department of Economics and Actuarial Science', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-energy-economics-and-finance/', FALSE),
('Master of Science in Leadership and Organisational Development', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'School of Graduate Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-leadership-and-organisational-development/', FALSE),
('Master of Science in Procurement Management', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'Department of Business Administration', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-procurement-management/', FALSE),
('Master of Science in Pensions Management', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'Department of Banking and Finance', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-pensions-management', FALSE),
('Master of Science in Information Systems', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'Department of Information Technology Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-information-systems/', FALSE),
('Master of Science in Information Security Management', 'Postgraduate Studies', 'Postgraduate', 'MSc', 'GRAD', 'Department of Information Technology Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-information-security-management/', FALSE);

-- 9. Insert canonical UPSA MA Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Master of Arts in Natural Resources and Climate Change Law', 'Law & Governance', 'Postgraduate', 'MA', 'LAW', 'UPSA Law School', 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-natural-resources-and-climate-change-law/', FALSE),
('Master of Arts in Peace, Security and Intelligence Management', 'Security & Leadership', 'Postgraduate', 'MA', 'GRAD', 'School of Graduate Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-peace-security-and-intelligence-management/', FALSE),
('Master of Arts in Brands and Communications Management', 'Communication & Media', 'Postgraduate', 'MA', 'FITCS', 'Department of Communication Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-brands-and-communications-management/', FALSE),
('Master of Arts in Media & Digital Communication Management', 'Communication & Media', 'Postgraduate', 'MA', 'FITCS', 'Department of Communication Studies', 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-media-and-digital-communication-management/', FALSE),
('Master of Arts in Digital and Strategic Marketing Management', 'Marketing & Strategy', 'Postgraduate', 'MA', 'FMS', 'Department of Marketing', 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-digital-and-strategic-marketing-management/', FALSE);

-- 10. Insert canonical UPSA LLM Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Master of Laws (LLM) in Competition and Consumer Protection Law', 'Law', 'Postgraduate', 'LLM', 'LAW', 'UPSA Law School', 'https://admissions.upsa.edu.gh/admissions/postgraduate/llm-competition-and-consumer-protection-law/', FALSE),
('Master of Laws (LLM) in International Business And Commercial Law', 'Law', 'Postgraduate', 'LLM', 'LAW', 'UPSA Law School', 'https://admissions.upsa.edu.gh/admissions/postgraduate/llm-international-business-and-commercial-law/', FALSE),
('Master of Laws (LLM) in Natural Resources and Climate Change Law', 'Law', 'Postgraduate', 'LLM', 'LAW', 'UPSA Law School', 'https://admissions.upsa.edu.gh/admissions/postgraduate/llm-natural-resources-and-climate-change-law/', FALSE);

-- 11. Insert canonical UPSA Professional Body Programmes
INSERT INTO public.course_programmes (name, field, level, sub_category, faculty_code, department, admissions_url, is_professional) VALUES
('Chartered Institute of Marketing Ghana (CIMG)', 'Professional Certification', 'Professional', 'Professional', 'IPS', 'Institute of Professional Studies', 'https://admissions.upsa.edu.gh/admissions/professional/cimg/', TRUE),
('Chartered Institute of Human Resource Management (CIHRM)', 'Professional Certification', 'Professional', 'Professional', 'IPS', 'Institute of Professional Studies', 'https://admissions.upsa.edu.gh/admissions/professional/cihrmg', TRUE),
('Institute Of Project Management Professional, Ghana (IPMPG)', 'Professional Certification', 'Professional', 'Professional', 'IPS', 'Institute of Professional Studies', 'https://admissions.upsa.edu.gh/admissions/professional/ipmpg/', TRUE),
('Institute of Chartered Accountants, Ghana (ICAG)', 'Professional Certification', 'Professional', 'Professional', 'IPS', 'Institute of Professional Studies', 'https://admissions.upsa.edu.gh/admissions/professional/icag/', TRUE),
('Association of Certified Chartered Accountants (ACCA-UK)', 'Professional Certification', 'Professional', 'Professional', 'IPS', 'Institute of Professional Studies', 'https://admissions.upsa.edu.gh/admissions/professional/acca-uk/', TRUE),
('Chartered Institute of Management Accountant (CIMA-UK)', 'Professional Certification', 'Professional', 'Professional', 'IPS', 'Institute of Professional Studies', 'https://admissions.upsa.edu.gh/admissions/professional/cima-uk/', TRUE),
('Chartered Institute of Marketing (CIM), UK', 'Professional Certification', 'Professional', 'Professional', 'IPS', 'Institute of Professional Studies', 'https://admissions.upsa.edu.gh/admissions/professional/cim/', TRUE);

COMMIT;
