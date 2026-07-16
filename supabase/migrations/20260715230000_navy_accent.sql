-- Site theme moved from crimson/red to navy blue; recolor the one
-- production whose accent still pointed at the old crimson swatch so it
-- doesn't clash with the new palette.

update public.productions
set accent = '#2454a8'
where slug = 'spring-mainstage-2026' and accent = '#b11e37';
