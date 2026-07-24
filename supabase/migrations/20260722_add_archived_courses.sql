-- Migration: Add is_archived to courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
