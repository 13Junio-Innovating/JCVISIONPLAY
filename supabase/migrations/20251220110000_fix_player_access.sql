-- Enable RLS to ensure security policies are active
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PUBLIC READ ACCESS (For Player)
-- -----------------------------------------------------------------------------

-- Drop existing public read policies if they exist
DROP POLICY IF EXISTS "Public screens read access" ON public.screens;
DROP POLICY IF EXISTS "Public playlists read access" ON public.playlists;
DROP POLICY IF EXISTS "Public media read access" ON public.media;

-- Create policies to allow public read access
CREATE POLICY "Public screens read access" ON public.screens FOR SELECT USING (true);
CREATE POLICY "Public playlists read access" ON public.playlists FOR SELECT USING (true);
CREATE POLICY "Public media read access" ON public.media FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- AUTHENTICATED WRITE ACCESS (For Admin)
-- -----------------------------------------------------------------------------
-- We add these to ensure that if RLS was previously disabled, enabling it
-- doesn't lock out the admin. We drop potential existing policies first.

-- SCREENS
DROP POLICY IF EXISTS "Users can insert their own screens" ON public.screens;
DROP POLICY IF EXISTS "Users can update their own screens" ON public.screens;
DROP POLICY IF EXISTS "Users can delete their own screens" ON public.screens;

CREATE POLICY "Users can insert their own screens" ON public.screens FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own screens" ON public.screens FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own screens" ON public.screens FOR DELETE USING (auth.uid() = created_by);

-- PLAYLISTS
DROP POLICY IF EXISTS "Users can insert their own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can update their own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can delete their own playlists" ON public.playlists;

CREATE POLICY "Users can insert their own playlists" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own playlists" ON public.playlists FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own playlists" ON public.playlists FOR DELETE USING (auth.uid() = created_by);

-- MEDIA
DROP POLICY IF EXISTS "Users can insert their own media" ON public.media;
DROP POLICY IF EXISTS "Users can update their own media" ON public.media;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media;

CREATE POLICY "Users can insert their own media" ON public.media FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can update their own media" ON public.media FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete their own media" ON public.media FOR DELETE USING (auth.uid() = uploaded_by);

-- -----------------------------------------------------------------------------
-- REALTIME PUBLICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.screens;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.media;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;
