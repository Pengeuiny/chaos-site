-- Ensemble rows (Gargoyles, Dance Ensemble, …) render as a full-width
-- heading + name list instead of a Role ...... Actor grid row, and a show
-- can carry a footnote explaining the asterisks in its cast list. Then
-- replace the sample casts for Hunchback and Gatsby with the posted casts.
alter table public.cast_members
  add column if not exists is_group boolean not null default false;
alter table public.productions
  add column if not exists cast_footnote text;

delete from public.cast_members
where production_id in (select id from public.productions
                        where slug in ('hunchback-of-notre-dame-2027', 'the-great-gatsby'));

with p as (select id from public.productions where slug = 'hunchback-of-notre-dame-2027')
insert into public.cast_members (production_id, role, actor, is_lead, is_group, sort_order)
select p.id, v.role, v.actor, v.is_lead, v.is_group, v.sort_order from p, (values
  ('Quasimodo',          'Owen Santolucito*',   true,  false, 1),
  ('Claude Frollo',      'Nicholas Kippen*',    true,  false, 2),
  ('Esméralda',          'Kaitlyn Achu',        true,  false, 3),
  ('Phoebus de Martin',  'Zachary Nelson*',     true,  false, 4),
  ('Clopin Trouillefou', 'Kate Coppinger',      true,  false, 5),
  ('Jehan Frollo',       'Sebastian Sarmiento', true,  false, 6),
  ('Florika',            'Opal Peterson*',      true,  false, 7),
  ('Saint Aphoridisius', 'Xander Luna',         false, false, 8),
  ('Frederic Charlus',   'Joshua Warnken',      false, false, 9),
  ('The Madam',          'Ilissia Irizarry',    false, false, 10),
  ('Father Dupin',       'Caevin Larsen',       false, false, 11),
  ('King Louis XI',      'Evan Schmotzer',      false, false, 12),
  ('Gargoyles', 'Thomas Benitez*, Ava Cruzan, Caroline Gallagher*, Lily Krush*, Xander Luna, Opal Peterson*, Ava Rojas*, Hannah Rue, Sebastian Sarmiento', false, true, 13),
  ('Dance Ensemble', 'Katie Freeman, Erin Hannun, Kathryn Hoehl, Jaxli Hirt, Carlie Lease, Aanya Menon, Ilissia Irizarry, Evan Schmotzer, Bailey Scruggs, Joshua Warnken, Davion Worth', false, true, 14),
  ('Dance Captain',      'Carlie Lease',        false, false, 15),
  ('Congregation & Townspeople', 'Abigail Barker, Elise Donatelli, Emily Gorpinenko, Caevin Larsen', false, true, 16),
  ('Notre Dame Chorus',  'Lola Aguilar, Malak Eidrous, Sofia Lopez, Alexis Quinn', false, true, 17),
  ('Director',           'Victoria Kauffman',   false, false, 18),
  ('Choreographer',      'Caleb Smith',         false, false, 19)
) as v(role, actor, is_lead, is_group, sort_order);

with p as (select id from public.productions where slug = 'the-great-gatsby')
insert into public.cast_members (production_id, role, actor, is_lead, is_group, sort_order)
select p.id, v.role, v.actor, v.is_lead, v.is_group, v.sort_order from p, (values
  ('Jay Gatsby',      'Nicholas Kippen',              true,  false, 1),
  ('Nick Carraway',   'Thomas Benitez',               true,  false, 2),
  ('Daisy Buchanan',  'Lily Krush',                   true,  false, 3),
  ('Jordan Baker',    'Bailey Scruggs',               false, false, 4),
  ('Tom Buchanan',    'Zachary Nelson',               false, false, 5),
  ('Myrtle Wilson',   'Ilissia Irizarry',             false, false, 6),
  ('George Wilson',   'Kai Boyle',                    false, false, 7),
  ('Meyer Wolfsheim', 'Kaitlyn Achu',                 false, false, 8),
  ('Mrs McKee',       'Ava Rojas',                    false, false, 9),
  ('Chester',         'Kate Coppinger*',              false, false, 10),
  ('Mrs. Michaelis',  'Jaxli Hirt',                   false, false, 11),
  ('Police',          'Katie Freeman & Hannah Rue',   false, false, 12),
  ('Party & Dance Ensemble', 'Kaitlyn Achu, Lola Aguilar, Kate Coppinger*, Lily Cruzan, Katie Freeman, Jaxli Hirt, Suhruti Javvadi, Aanya Menon, Ava Rojas, Hannah Rue, Jessica Schaefer & Olivia Shomphe', false, true, 13)
) as v(role, actor, is_lead, is_group, sort_order);

update public.productions set cast_is_sample = false, cast_footnote = '* Denotes Section Leaders'
where slug = 'hunchback-of-notre-dame-2027';
update public.productions set cast_is_sample = false, cast_footnote = '* Student Choreographer/Dance Captain'
where slug = 'the-great-gatsby';
