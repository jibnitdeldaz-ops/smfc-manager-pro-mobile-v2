-- 1. Ensure allow_predictions column exists (Idempotent)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS allow_predictions BOOLEAN DEFAULT FALSE;

-- 2. Enable Realtime (Ignore error if already added)
DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.matches';
EXCEPTION
    WHEN duplicate_object THEN NULL; -- Handled automatically by some versions, but explicit check matches error 42710
    WHEN OTHERS THEN NULL; -- Ignore "already member" errors
END;
$$;

-- 3. Reset RLS Policies to ensure YOU have access
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all access" ON public.matches;
DROP POLICY IF EXISTS "Allow all access" ON public.predictions;

-- Re-create policies with full access
CREATE POLICY "Allow all access" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.predictions FOR ALL USING (true) WITH CHECK (true);

-- 4. Verify/Update Status
-- Optional: Force unlock predictions for testing if match is Locked
-- UPDATE matches SET allow_predictions = true WHERE status = 'locked';
