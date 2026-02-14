-- Create a migration to add transfer_history column to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS transfer_history TEXT[] DEFAULT '{}';
