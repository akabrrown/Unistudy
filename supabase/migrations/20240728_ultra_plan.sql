-- Add is_ultra column to pricing_features table
ALTER TABLE public.pricing_features ADD COLUMN IF NOT EXISTS is_ultra boolean DEFAULT true;

-- Update existing features: typically Ultra includes everything Pro has, plus maybe more
UPDATE public.pricing_features SET is_ultra = true;
