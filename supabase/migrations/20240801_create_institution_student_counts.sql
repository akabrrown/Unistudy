-- 20240801_create_institution_student_counts.sql
-- Migration: create table for institution student counts and backfill data.

create table if not exists institution_student_counts (
  institution_id uuid primary key references institutions(id) on delete cascade,
  student_count integer not null default 0
);

-- Back‑fill counts from existing profiles
insert into institution_student_counts (institution_id, student_count)
select
  institution_id,
  count(*) as student_count
from profiles
where institution_id is not null
group by institution_id
on conflict (institution_id) do update
  set student_count = excluded.student_count;
