-- 1. Player Auth Table (Stores PINs)
create table if not exists public.player_auth (
    name text primary key,
    pin text not null default '1234',
    created_at timestamptz default now()
);

-- 2. Secure Function to Verify PIN
-- This allows the app to check if a PIN is correct without ever reading the table directly.
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
            -- Auto-create record for them with default PIN so next time it's fast
            insert into public.player_auth (name, pin) values (try_name, '1234');
            return true;
        else
            return false;
        end if;
    end if;

    return stored_pin = try_pin;
end;
$$ language plpgsql security definer;

-- 3. Function to Change PIN
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
