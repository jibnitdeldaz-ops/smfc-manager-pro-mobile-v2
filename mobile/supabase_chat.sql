-- Create messages table for Team Chat
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS but allow public access for now (matching app's current auth model)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON messages FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
