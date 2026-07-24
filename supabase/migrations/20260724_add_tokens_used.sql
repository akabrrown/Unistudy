-- Add missing total_tokens_used column to ai_api_keys table
ALTER TABLE ai_api_keys ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0;
