-- ============================================================
-- Now Showing: explicit admin display order (Adam, Alex, Rob)
-- Run this in Supabase SQL Editor after 0007_two_decimal_ratings.sql
-- ============================================================

-- Without this, the admin breakdown row was ordered by signup time
-- (whoever created their account first showed up first) -- not a
-- fixed Adam/Alex/Rob order. This lets you set that explicitly.
alter table profiles add column sort_order int;
