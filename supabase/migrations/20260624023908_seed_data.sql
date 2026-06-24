-- CHS CHAOS — seed data (ported from the reference prototype's data layer).
-- Run AFTER schema.sql, in the Supabase SQL Editor or `supabase db reset`.
-- Re-runnable: it clears content tables first (intake tables are untouched).
-- Showtimes are stored in Eastern time (-04, daylight) to match the school's
-- local schedule.


delete from public.productions; -- cascades to showtimes + cast_members
delete from public.people;

-- ---------------------------------------------------------------------------
-- Productions
-- ---------------------------------------------------------------------------
insert into public.productions
  (slug, title, title_note, type, tag_text, tag_class, poster_url, accent,
   venue, address, tagline, synopsis, ticket_url, date_range, has_microsite,
   cast_is_sample, sort_order)
values
  ('spring-mainstage-2026', 'Spring Mainstage Musical', true,
   'Mainstage Musical', 'On Sale', 'onsale',
   'https://static.wixstatic.com/media/020dca_7535fbc88b494e10b8629400c63b8dbf~mv2.jpg/v1/fill/w_600,h_800,al_c,q_85,enc_avif,quality_auto/020dca_7535fbc88b494e10b8629400c63b8dbf~mv2.jpg',
   '#b11e37',
   'Cuthbertson High School Auditorium', '1520 Cuthbertson Rd, Waxhaw, NC 28173',
   'The whole company takes the stage for the spring main event.',
   'Our students close the season with the spring mainstage musical — months of rehearsal, a full pit, and a cast and crew that have poured everything into the show. Doors open 30 minutes before curtain. Reserved seating; CHAOS members get early access and discounted tickets.',
   'https://cuthbertsontheatre.ludus.com/index.php?sections=events', null, false,
   true, 1),

  ('summer-camp-revue-2026', 'One-Week Summer Camp', false,
   'Revue-Style Camp · Grades K–8', 'Camp', 'camp',
   null, '#2bb6a3',
   'Cuthbertson High School', '1520 Cuthbertson Rd, Waxhaw, NC 28173',
   'Five days, one revue, a stage full of new performers.',
   'A fast, joyful introduction to musical theatre. Campers learn songs and staging across the week and perform a revue-style showcase for family and friends. No experience required — just bring the energy.',
   'https://cuthbertsontheatre.ludus.com/index.php?sections=payments',
   'June 15–19, 2026', false, false, 2),

  ('finding-nemo-jr-2026', 'Finding Nemo Jr.', false,
   'Two-Week Musical Intensive', 'Registration Open', 'upcoming',
   null, '#2563c9',
   'Cuthbertson High School', '1520 Cuthbertson Rd, Waxhaw, NC 28173',
   'Dive in. A two-week intensive that ends with a full Jr. production.',
   'Our summer flagship: a two-week musical intensive where campers build a complete production of Disney''s Finding Nemo Jr. from the ground up — music, choreography, staging, and tech — ending in a live performance. Has its own immersive microsite (link below).',
   'https://cuthbertsontheatre.ludus.com/index.php?sections=payments',
   'July 13–17 & 20–24, 2026', true, false, 3);

-- ---------------------------------------------------------------------------
-- Showtimes
-- ---------------------------------------------------------------------------
insert into public.showtimes (production_id, starts_at, label, sort_order) values
  ((select id from public.productions where slug = 'spring-mainstage-2026'), '2026-04-16 19:00:00-04', 'Opening Night', 1),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), '2026-04-17 19:00:00-04', 'Friday', 2),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), '2026-04-18 13:00:00-04', 'Matinee', 3),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), '2026-04-18 19:00:00-04', 'Closing Night', 4),
  ((select id from public.productions where slug = 'summer-camp-revue-2026'), '2026-06-15 09:00:00-04', 'Camp begins', 1),
  ((select id from public.productions where slug = 'summer-camp-revue-2026'), '2026-06-19 09:00:00-04', 'Showcase week', 2),
  ((select id from public.productions where slug = 'finding-nemo-jr-2026'), '2026-07-13 09:00:00-04', 'Week 1 begins', 1),
  ((select id from public.productions where slug = 'finding-nemo-jr-2026'), '2026-07-17 09:00:00-04', 'Week 1 ends', 2),
  ((select id from public.productions where slug = 'finding-nemo-jr-2026'), '2026-07-20 09:00:00-04', 'Week 2 begins', 3),
  ((select id from public.productions where slug = 'finding-nemo-jr-2026'), '2026-07-24 18:00:00-04', 'Final performance', 4);

-- ---------------------------------------------------------------------------
-- Cast (spring mainstage — sample cast)
-- ---------------------------------------------------------------------------
insert into public.cast_members (production_id, role, actor, is_lead, sort_order) values
  ((select id from public.productions where slug = 'spring-mainstage-2026'), 'Lead', 'Cast TBA', true, 1),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), 'Supporting Lead', 'Cast TBA', true, 2),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), 'Featured Ensemble', 'Cast TBA', false, 3),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), 'Ensemble', 'The CHS Company', false, 4),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), 'Director', 'Ms. Kauffman', false, 5),
  ((select id from public.productions where slug = 'spring-mainstage-2026'), 'Stage Management', 'ITS Crew', false, 6);

-- ---------------------------------------------------------------------------
-- People — booster board
-- ---------------------------------------------------------------------------
insert into public.people (group_name, role, name, email, image_url, sort_order) values
  ('board', 'President', 'Michael Edleblute', 'president@chschaos.org', 'https://static.wixstatic.com/media/5b4780_63f33b13e46f439182f2df1910773852~mv2.jpeg/v1/crop/x_355,y_60,w_252,h_252/fill/w_331,h_344,al_c,lg_1,q_80,enc_avif,quality_auto/B7CC3542-11B5-4DDE-9BCD-2C0467C83E6A_1_105_c.jpeg', 1),
  ('board', 'Treasurer', 'David Krush', 'treasurer@chschaos.org', 'https://static.wixstatic.com/media/020dca_bc60327066644269816c33a693ff1450~mv2.jpeg/v1/crop/x_3,y_0,w_354,h_368/fill/w_331,h_344,al_c,q_80,enc_avif,quality_auto/0C6E5587-155A-4639-8DF3-40CE66ED963F_4_5005_c.jpeg', 2),
  ('board', 'VP of Chorus', 'Heather Moretti', 'vpchorus@chschaos.org', 'https://static.wixstatic.com/media/5b4780_8fc5357e291049ae9af2da59d5443fbd~mv2.jpeg/v1/fill/w_331,h_344,al_c,q_80,enc_avif,quality_auto/Moretti.jpeg', 3),
  ('board', 'VP of Theatre', 'Lindsay & Eric Santolucito', 'vptheatre@chschaos.org', 'https://static.wixstatic.com/media/020dca_b855f824f9b04cfa88e4e07b25d80702~mv2.jpeg/v1/crop/x_0,y_341,w_2316,h_2407/fill/w_331,h_344,al_c,q_80,enc_avif,quality_auto/IMG_9364.jpeg', 4),
  ('board', 'VP of Support', 'Hilary Washburn', 'vpsupport@chschaos.org', 'https://static.wixstatic.com/media/020dca_397941975a66426a8284811a658bbb09~mv2.jpg/v1/crop/x_0,y_21,w_1151,h_1196/fill/w_331,h_344,al_c,q_80,enc_avif,quality_auto/IMG_3087.jpg', 5),
  ('board', 'Secretary', 'Leigh Kippen', 'secretary@chschaos.org', 'https://static.wixstatic.com/media/5b4780_a41e409bf59b4f65b6ba44360d6598ec~mv2.jpeg/v1/fill/w_331,h_344,al_c,q_80,enc_avif,quality_auto/89fac388-4a8a-43de-b550-d774f87988c4.jpeg', 6);

-- ---------------------------------------------------------------------------
-- People — ITS student board
-- ---------------------------------------------------------------------------
insert into public.people (group_name, role, name, email, image_url, sort_order) values
  ('its', 'President', 'Lucy Garrett', null, 'https://static.wixstatic.com/media/e714f9_f9b0d169b3b9484ba0a186887f447fb0~mv2.jpeg/v1/fill/w_346,h_344,al_c,q_80,enc_avif,quality_auto/Lucy%20Garrett%20president.jpeg', 1),
  ('its', 'Vice President', 'Lexi Klein', null, 'https://static.wixstatic.com/media/e714f9_3f716f6f5bca469b9bb5439ee07b3490~mv2.jpeg/v1/fill/w_346,h_344,al_c,q_80,enc_avif,quality_auto/Lexi%20Klein%20Vice%20President.jpeg', 2),
  ('its', 'Secretary', 'Aimee Wlazlowski', null, 'https://static.wixstatic.com/media/e714f9_cf16d1a477fc43d2b52d7da71146ac79~mv2.jpeg/v1/fill/w_346,h_344,al_c,q_80,enc_avif,quality_auto/Aimee%20Wlazlowski%20Secretary.jpeg', 3),
  ('its', 'Treasurer', 'Owen Santolucito', null, 'https://static.wixstatic.com/media/e714f9_96e4b2e3af3b470f9239eedad1cf1ace~mv2.jpeg/v1/fill/w_346,h_344,al_c,q_80,enc_avif,quality_auto/Owen%20Santolucito%20%20Treasurer.jpeg', 4),
  ('its', 'Historian', 'Riley Washburn', null, 'https://static.wixstatic.com/media/e714f9_7533f75cc431428e8d0b55227304917f~mv2.jpeg/v1/fill/w_346,h_344,al_c,q_80,enc_avif,quality_auto/Riley%20Washburn%20Historian%20.jpeg', 5),
  ('its', 'Scribe', 'Genevieve Randall', null, 'https://static.wixstatic.com/media/e714f9_445a1ee198824c56aedbed5c5d590fc2~mv2.jpeg/v1/fill/w_346,h_344,al_c,q_80,enc_avif,quality_auto/Genevieve%20Randall%20Scribe.jpeg', 6),
  ('its', 'ICC Rep', 'Annabel Seawright', null, 'https://static.wixstatic.com/media/e714f9_c3a7b68c31c5421ca84cb51430771265~mv2.jpeg/v1/fill/w_346,h_344,al_c,q_80,enc_avif,quality_auto/Annabel%20Seawright%20ICC%20Rep.jpeg', 7);

