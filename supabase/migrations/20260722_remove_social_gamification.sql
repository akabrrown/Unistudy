-- Migration: Remove Social and Gamification Features
-- Drops tables and columns associated with XP, Leaderboards, Groups, DMs, Audio Rooms, and Partner Matcher.

-- 1. Drop Gamification & Social Tables
DROP TABLE IF EXISTS flashcard_battles CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS shared_materials CASCADE;
DROP TABLE IF EXISTS doubt_board_answers CASCADE;
DROP TABLE IF EXISTS doubt_board_posts CASCADE;
DROP TABLE IF EXISTS discussion_replies CASCADE;
DROP TABLE IF EXISTS course_discussions CASCADE;
DROP TABLE IF EXISTS audio_room_participants CASCADE;
DROP TABLE IF EXISTS audio_rooms CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS study_group_messages CASCADE;
DROP TABLE IF EXISTS study_group_members CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;

-- 2. Alter Profiles (Remove Gamification & Social columns)
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS total_xp,
  DROP COLUMN IF EXISTS current_streak,
  DROP COLUMN IF EXISTS longest_streak,
  DROP COLUMN IF EXISTS weekly_study_hours,
  DROP COLUMN IF EXISTS partner_matcher_enabled,
  DROP COLUMN IF EXISTS last_study_date;

-- 3. Alter Platform Settings (Remove Toggles)
ALTER TABLE platform_settings
  DROP COLUMN IF EXISTS study_groups_enabled,
  DROP COLUMN IF EXISTS partner_matcher_enabled,
  DROP COLUMN IF EXISTS audio_rooms_enabled,
  DROP COLUMN IF EXISTS community_bank_enabled;
