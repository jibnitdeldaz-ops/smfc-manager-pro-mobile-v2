-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('FWD', 'MID', 'DEF', 'GK')),
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
  team TEXT NOT NULL CHECK (team IN ('Red', 'Blue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on team for faster queries
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);

-- Create index on position for faster queries
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on players" ON players
  FOR ALL
  USING (true)
  WITH CHECK (true);

