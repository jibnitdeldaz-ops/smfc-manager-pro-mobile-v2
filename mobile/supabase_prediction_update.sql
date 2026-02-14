-- Add columns for goal predictions
alter table public.predictions 
add column if not exists pred_goals_red int default 0,
add column if not exists pred_goals_blue int default 0;

-- Add points column to store the calculated score
alter table public.predictions 
add column if not exists points int default 0;

-- Function to Calculate Points for a Match
create or replace function calculate_match_points(match_id_param uuid)
returns void as $$
declare
    m_record record;
    p_record record;
    match_winner text;
    pts int;
begin
    -- Get Match Result
    select * into m_record from public.matches where id = match_id_param;
    
    if m_record.score_red > m_record.score_blue then
        match_winner := 'red';
    elsif m_record.score_blue > m_record.score_red then
        match_winner := 'blue';
    else
        match_winner := 'draw';
    end if;

    -- Loop through all predictions for this match
    for p_record in select * from public.predictions where match_id = match_id_param loop
        pts := 0;

        -- 1. Winner Prediction (3 pts)
        if p_record.prediction = match_winner then
            pts := pts + 3;
        end if;

        -- 2. Red Goals Prediction (2 pts)
        if p_record.pred_goals_red = m_record.score_red then
            pts := pts + 2;
        end if;

        -- 3. Blue Goals Prediction (2 pts)
        if p_record.pred_goals_blue = m_record.score_blue then
            pts := pts + 2;
        end if;

        -- Update the points for this prediction
        update public.predictions set points = pts where id = p_record.id;
    end loop;
end;
$$ language plpgsql security definer;
