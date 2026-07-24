-- Rename threshold column
ALTER TABLE platform_ai_balance RENAME COLUMN auto_restrict_free_pct TO auto_fallback_pct;

-- Rename status column
ALTER TABLE platform_ai_balance RENAME COLUMN is_free_restricted TO is_fallback_active;

-- Fix Gemini thresholds so fallback is activated at 5% remaining (95% used)
-- Previously they were 30, 15, 5, 3 which triggered warning at 30% used.
-- Now we set it to 70, 85, 95, 97 (Warning 30% left, Urgent 15% left, Fallback 5% left, Disable 3% left)
UPDATE platform_ai_balance
SET 
  alert_pct_warn = 70,
  alert_pct_urgent = 85,
  auto_fallback_pct = 95,
  auto_disable_pct = 97
WHERE provider = 'gemini';
