-- Add allow_predictions column to matches table
ALTER TABLE matches ADD COLUMN allow_predictions BOOLEAN DEFAULT FALSE;

-- Update existing Locked matches to allow predictions? Optional, but safer to default false.
-- But if existing matches are Locked, maybe we should enable it to match previous behavior?
-- UPDATE matches SET allow_predictions = TRUE WHERE status = 'locked';
