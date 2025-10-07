-- Restrict public reads to only assigned content and add RPCs

-- Drop broad public read policies
DROP POLICY IF EXISTS "Public can read screens" ON public.screens;
DROP POLICY IF EXISTS "Public can read playlists" ON public.playlists;
DROP POLICY IF EXISTS "Public can read media" ON public.media;

-- Allow reading playlists only if assigned to any screen
CREATE POLICY "Public playlists assigned to screens"
  ON public.playlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.screens s
      WHERE s.assigned_playlist = public.playlists.id
    )
  );

-- Allow reading media only if referenced by a playlist assigned to any screen
CREATE POLICY "Public media referenced by assigned playlists"
  ON public.media FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playlists p
      JOIN public.screens s ON s.assigned_playlist = p.id
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p.items) it
        WHERE (it->>'mediaId')::uuid = public.media.id
      )
    )
  );

-- RPC to update screen last_seen by player_key
CREATE OR REPLACE FUNCTION public.update_screen_last_seen(p_player_key text)
RETURNS void AS $$
BEGIN
  UPDATE public.screens SET last_seen = now()
  WHERE player_key = p_player_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.update_screen_last_seen(text) TO anon;

-- RPC to get assigned playlist id by player_key
CREATE OR REPLACE FUNCTION public.get_assigned_playlist_by_player_key(p_player_key text)
RETURNS uuid AS $$
DECLARE
  result uuid;
BEGIN
  SELECT assigned_playlist INTO result
  FROM public.screens
  WHERE player_key = p_player_key;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_assigned_playlist_by_player_key(text) TO anon;