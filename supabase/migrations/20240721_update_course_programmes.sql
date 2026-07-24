-- Migration: Replace course_programmes with new Engineering & Technology batch
-- Generated on 2024-07-21

BEGIN;

-- Remove any existing programmes
DELETE FROM public.course_programmes;

-- Insert the fresh batch
INSERT INTO public.course_programmes (name, field, level) VALUES
    ('BSc Aerospace Engineering',               'Engineering & Technology', 'Undergraduate'),
    ('BSc Agricultural Engineering',            'Engineering & Technology', 'Undergraduate'),
    ('BSc Automobile Engineering',              'Engineering & Technology', 'Undergraduate'),
    ('BSc Biomedical Engineering',              'Engineering & Technology', 'Undergraduate'),
    ('BSc Chemical Engineering',                'Engineering & Technology', 'Undergraduate'),
    ('BSc Civil Engineering',                   'Engineering & Technology', 'Undergraduate'),
    ('BSc Computer Engineering',                'Engineering & Technology', 'Undergraduate'),
    ('BSc Electrical/Electronic Engineering',   'Engineering & Technology', 'Undergraduate'),
    ('BSc Food Process Engineering',            'Engineering & Technology', 'Undergraduate'),
    ('BSc Geological Engineering',              'Engineering & Technology', 'Undergraduate'),
    ('BSc Geomatic Engineering',                'Engineering & Technology', 'Undergraduate'),
    ('BSc Industrial Engineering',              'Engineering & Technology', 'Undergraduate'),
    ('BSc Marine Engineering',                  'Engineering & Technology', 'Undergraduate'),
    ('BSc Materials Engineering',               'Engineering & Technology', 'Undergraduate'),
    ('BSc Mechanical Engineering',              'Engineering & Technology', 'Undergraduate'),
    ('BSc Metallurgical Engineering',           'Engineering & Technology', 'Undergraduate'),
    ('BSc Petrochemical Engineering',           'Engineering & Technology', 'Undergraduate'),
    ('BSc Petroleum Engineering',               'Engineering & Technology', 'Undergraduate'),
    ('BSc Telecommunication Engineering',       'Engineering & Technology', 'Undergraduate'),
    ('BSc Quantity Surveying and Construction Economics', 'Engineering & Technology', 'Undergraduate'),
    ('BSc Construction Technology and Management','Engineering & Technology', 'Undergraduate'),
    ('BSc Architecture',                         'Engineering & Technology', 'Undergraduate'),
    ('BSc Land Economy',                         'Engineering & Technology', 'Undergraduate'),
    ('BSc Real Estate',                          'Engineering & Technology', 'Undergraduate'),
    ('BSc Development Planning',                 'Engineering & Technology', 'Undergraduate'),
    ('BSc Human Settlement Planning',            'Engineering & Technology', 'Undergraduate'),
    ('MSc Aerospace Engineering',                'Engineering & Technology', 'Postgraduate'),
    ('MSc Chemical Engineering',                 'Engineering & Technology', 'Postgraduate'),
    ('MSc Civil Engineering',                    'Engineering & Technology', 'Postgraduate'),
    ('MSc Electrical Engineering',               'Engineering & Technology', 'Postgraduate'),
    ('MSc Mechanical Engineering',               'Engineering & Technology', 'Postgraduate'),
    ('MSc Petroleum Engineering',                'Engineering & Technology', 'Postgraduate'),
    ('MPhil Engineering',                        'Engineering & Technology', 'Postgraduate'),
    ('PhD Engineering',                          'Engineering & Technology', 'Graduate'),
    ('MSc Geomatic Engineering',                 'Engineering & Technology', 'Postgraduate'),
    ('MSc Water Resources Engineering',          'Engineering & Technology', 'Postgraduate'),
    ('MSc Environmental Engineering',            'Engineering & Technology', 'Postgraduate'),
    ('MSc Structural Engineering',               'Engineering & Technology', 'Postgraduate'),
    ('MSc Geotechnical Engineering',             'Engineering & Technology', 'Postgraduate'),
    ('MSc Transportation Engineering',           'Engineering & Technology', 'Postgraduate'),
    ('MSc Renewable Energy Engineering',         'Engineering & Technology', 'Postgraduate');

COMMIT;
