// @ts-nocheck
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual .env parser
function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[key] = value;
        }
    });
    return env;
}

const envPath = path.resolve(__dirname, '../mobile/.env');
console.log("Loading .env from:", envPath);
const env = loadEnv(envPath);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars. Looking at:", envPath);
    console.error("Found Keys:", Object.keys(env));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("1. Creating Match...");
    const { data: match, error: mErr } = await supabase.from('matches').insert([{
        date: new Date().toISOString(),
        venue: 'Test Venue',
        kickoff: '10:00 AM',
        format: '5v5',
        red_team: [],
        blue_team: [],
        status: 'draft',
        created_by: 'script',
        allow_predictions: true
    }]).select().single();

    if (mErr) { console.error("Match Create Fail", mErr); return; }
    console.log("Match Created:", match.id);

    console.log("2. User Predicting...");
    const playerName = 'TestJibin';
    const { error: pErr } = await supabase.from('predictions').insert({
        match_id: match.id,
        player_name: playerName,
        prediction: 'red',
        pred_goals_red: 2,
        pred_goals_blue: 1
    });

    if (pErr) { console.error("Prediction Fail", pErr); return; }
    console.log("Prediction Saved for", playerName);

    console.log("3. Fetching Active Match (Simulate Lobby)...");
    const { data: activeMatch } = await supabase.from('matches')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!activeMatch || activeMatch.id !== match.id) {
        console.error("CRITICAL: Active match mismatch!", activeMatch?.id, match.id);
        console.warn("Continuing test with original match ID...");
    } else {
        console.log("Active match verified:", activeMatch.id);
    }

    console.log("4. Admin Finishing Match (Simulate Analytics)...");
    // Analytics calls database.getLatestMatch() which does:
    const { data: latestMatch } = await supabase.from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!latestMatch || latestMatch.id !== match.id) {
        console.error("CRITICAL: Analytics fetched wrong match!", latestMatch?.id, match.id);
    } else {
        console.log("Analytics fetched correct match:", latestMatch.id);
    }

    const { error: fErr } = await supabase.from('matches').update({
        status: 'completed',
        score_red: 3,
        score_blue: 0,
        comments: 'Red wins'
    }).eq('id', match.id);

    if (fErr) { console.error("Finish Fail", fErr); return; }
    console.log("Match Finished.");

    console.log("5. Verification - Fetch Predictions...");
    const { data: preds } = await supabase.from('predictions').select('*').eq('match_id', match.id);
    console.log("Predictions for match:", match.id, "Count:", preds ? preds.length : 0);

    if (!preds || preds.length === 0) {
        console.error("FAIL: Prediction gone!");
    } else {
        const p = preds[0];
        console.log("SUCCESS: Prediction persists. ID:", p.id, "Points column:", p.points);
        // Simulate Frontend Point Calculation
        let calculatedPoints = 0;
        const winner = 'red'; // 3-0
        if (p.prediction === winner) calculatedPoints += 3;
        if (p.pred_goals_red === 3) calculatedPoints += 2;
        if (p.pred_goals_blue === 0) calculatedPoints += 2;

        console.log("Frontend Calculated Points:", calculatedPoints);
        if (calculatedPoints === 3) console.log("SUCCESS: Point Calculation verify: 3 Points.");
        else console.error("FAIL: Point Calculation mismatch. Expected 3, got", calculatedPoints);
    }
}

runTest();
