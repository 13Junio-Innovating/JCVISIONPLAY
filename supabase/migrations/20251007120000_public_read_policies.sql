-- Public read policies to allow anonymous player access

-- screens: allow SELECT to anyone
DROP POLICY IF EXISTS "Public can read screens" ON public.screens;
CREATE POLICY "Public can read screens"
  ON public.screens FOR SELECT
  USING (true);

-- playlists: allow SELECT to anyone
DROP POLICY IF EXISTS "Public can read playlists" ON public.playlists;
CREATE POLICY "Public can read playlists"
  ON public.playlists FOR SELECT
  USING (true);

-- media: allow SELECT to anyone
DROP POLICY IF EXISTS "Public can read media" ON public.media;
CREATE POLICY "Public can read media"
  ON public.media FOR SELECT
  USING (true);

-- Note: INSERT/UPDATE/DELETE policies remain as defined previously,
-- keeping write access restricted to the content owner.