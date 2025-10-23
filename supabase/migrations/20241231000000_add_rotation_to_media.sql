-- Add rotation column to media table
ALTER TABLE public.media 
ADD COLUMN rotation INTEGER DEFAULT 0 NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.media.rotation IS 'Rotation angle in degrees (0, 90, 180, 270)';