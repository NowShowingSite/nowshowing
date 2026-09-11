-- ============================================================
-- Adds release_date to movies, so admins can add a title before
-- it's actually out (unreleased movies/shows now live in the
-- shared catalog too, not just individual watchlists -- this
-- lets them show up in director/collections lookups and the
-- countdown while staying hidden from general browse/search/
-- Movie of the Day until release_date has passed).
-- Run this once in Supabase (SQL Editor -> paste -> Run)
-- ============================================================

alter table movies add column release_date date;
