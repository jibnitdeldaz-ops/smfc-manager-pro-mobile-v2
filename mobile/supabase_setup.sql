-- Run this in your Supabase SQL Editor to set up the tables

-- 1. Matches Table
create table if not exists public.matches (
    id uuid default gen_random_uuid() primary key,
    date text not null,
    venue text not null,
    kickoff text not null,
    format text not null,
    red_team jsonb not null,  -- Array of player objects
    blue_team jsonb not null, -- Array of player objects
    status text default 'draft' check (status in ('draft', 'locked', 'live', 'completed')),
    score_red int default null,
    score_blue int default null,
    allow_predictions boolean default false,
    comments text,
    created_by text,
    created_at timestamptz default now()
);

-- 2. Predictions Table
create table if not exists public.predictions (
    id uuid default gen_random_uuid() primary key,
    match_id uuid references public.matches(id) on delete cascade not null,
    player_name text not null,
    prediction text not null check (prediction in ('red', 'blue')),
    is_correct boolean default null,
    created_at timestamptz default now(),
    unique(match_id, player_name) -- One prediction per player per match
);

-- 3. Enable Realtime
alter publication supabase_realtime add table public.matches;

-- 4. Player Auth & Security
create table if not exists public.player_auth (
    name text primary key,
    pin text not null default '1234',
    created_at timestamptz default now()
);

-- Secure Function to Verify PIN (so frontend essentially never sees the table)
create or replace function verify_pin(try_name text, try_pin text)
returns boolean as $$
declare
    stored_pin text;
begin
    -- Check if player exists in auth table
    select pin into stored_pin from public.player_auth where name = try_name;
    
    -- If no PIN set yet, allow '1234' (Default)
    if not found then
        if try_pin = '1234' then
            -- Auto-create record for them with default PIN
            insert into public.player_auth (name, pin) values (try_name, '1234');
            return true;
        else
            return false;
        end if;
    end if;

    return stored_pin = try_pin;
end;
$$ language plpgsql security definer;

-- Function to Change PIN
create or replace function change_pin(player_name text, old_pin text, new_pin text)
returns boolean as $$
begin
    if verify_pin(player_name, old_pin) then
        update public.player_auth set pin = new_pin where name = player_name;
        return true;
    else
        return false;
    end if;
end;
$$ language plpgsql security definer;


-- 4. RLS Policies (Simple: allow everything for now since it's a closed trusted group app)
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

create policy "Allow all access" on public.matches for all using (true) with check (true);
create policy "Allow all access" on public.predictions for all using (true) with check (true);
