import { supabase } from './supabase';
import { Player } from './sheets';
import { ScoredPlayer, MatchFormat, Venue } from './squadEngine';

export interface MatchRecord {
    id: string;
    date: string;
    venue: string;
    kickoff: string;
    format: string;
    red_team: Player[];
    blue_team: Player[];
    status: 'draft' | 'locked' | 'live' | 'completed';
    score_red: number | null;
    score_blue: number | null;
    comments: string | null;
    created_by: string;
    created_at: string;
    allow_predictions: boolean;
}

export const MATCH_STATUS = {
    DRAFT: 'draft',
    LOCKED: 'locked',
    LIVE: 'live',
    COMPLETED: 'completed',
} as const;

/**
 * Creates a new match in 'draft' status.
 */
export async function createMatch(
    date: string,
    venue: string,
    kickoff: string,
    format: string,
    red_team: Player[],
    blue_team: Player[],
    created_by: string
): Promise<MatchRecord | null> {
    const { data, error } = await supabase
        .from('matches')
        .insert([
            {
                date,
                venue,
                kickoff,
                format,
                red_team,
                blue_team,
                status: 'draft',
                created_by,
                allow_predictions: true
            },
        ])
        .select()
        .single();

    if (error) {
        console.error('Error creating match:', error);
        return null;
    }
    return data;
}

/**
 * Creates a COMPLETED match directly (e.g. from Analytics log)
 */
export async function createCompletedMatch(
    date: string,
    venue: string,
    kickoff: string,
    format: string,
    red_team: any[], // Allow simple strings if needed, but DB expects JSON
    blue_team: any[],
    score_red: number,
    score_blue: number,
    comments: string,
    created_by: string
): Promise<boolean> {
    const { error } = await supabase
        .from('matches')
        .insert([
            {
                date,
                venue,
                kickoff,
                format,
                red_team,
                blue_team,
                status: 'completed',
                score_red,
                score_blue,
                comments,
                created_by,
                allow_predictions: false // Completed matches don't need predictions open
            },
        ]);

    if (error) {
        console.error('Error logging completed match:', error);
        return false;
    }
    return true;
}

export async function togglePredictions(matchId: string, allowed: boolean) {
    const { error } = await supabase
        .from('matches')
        .update({ allow_predictions: allowed })
        .eq('id', matchId);

    if (error) {
        console.error('Error toggling predictions:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

export async function deletePrediction(matchId: string, playerName: string) {
    const { error } = await supabase
        .from('predictions')
        .delete()
        .eq('match_id', matchId)
        .eq('player_name', playerName);

    if (error) {
        console.error('Error deleting prediction:', error);
        return false;
    }
    return true;
}

/**
 * Updates the status of a match (e.g., lock, live, complete).
 */
export async function updateMatchStatus(matchId: string, status: MatchRecord['status']) {
    const { error } = await supabase
        .from('matches')
        .update({ status })
        .eq('id', matchId);

    if (error) {
        console.error('Error updating match status:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

/**
 * Updates the score of a match.
 */
export async function updateMatchScore(matchId: string, scoreRed: number, scoreBlue: number) {
    const { error } = await supabase
        .from('matches')
        .update({ score_red: scoreRed, score_blue: scoreBlue })
        .eq('id', matchId);

    if (error) console.error('Error updating match score:', error);
    return !error;
}

/**
 * Fetches the most recent active match (not completed).
 */
export async function getActiveMatch(): Promise<MatchRecord | null> {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error fetching active match:', error);
        return null;
    }
    return data;
}

/**
 * Fetches the most recent match (any status).
 */
export async function getLatestMatch(): Promise<MatchRecord | null> {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error fetching latest match:', error);
        return null;
    }
    return data;
}

/**
 * Subscribes to changes on a specific match.
 * callback is called whenever the match record updates.
 */
/**
 * Finish match with final scores and comments
 */
export async function finishMatch(matchId: string, redScore: number, blueScore: number, comments: string) {
    const { error } = await supabase
        .from('matches')
        .update({
            status: 'completed',
            score_red: redScore,
            score_blue: blueScore,
            comments: comments
        })
        .eq('id', matchId);

    if (error) {
        console.error('Error finishing match:', error);
        return false;
    }
    return true;
}

/**
 * Get last 10 completed matches
 */
export async function getCompletedMatches() {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }
    return data;
}

/**
 * RESET DRAFT (Was resetActiveMatch)
 * Clears teams and predictions for a match that is being re-drafted.
 * ONLY use this for matches that were scrapped/cancelled, NOT for starting a new game after a finished one.
 */
export async function resetDraftMatch(matchId: string) {
    // 2. Reset match fields ONLY (Do NOT delete predictions, as per user request to preserve fantasy points)
    const { error: resetError } = await supabase
        .from('matches')
        .update({
            // allow_predictions: true, // Keep previous setting or maybe don't toggle? Let's leave it true if resetting.
            status: 'draft',
            red_team: [],
            blue_team: [],
            score_red: 0,
            score_blue: 0,
            comments: null
        })
        .eq('id', matchId);


    if (resetError) {
        console.error('Error resetting match:', resetError);
        return false;
    }
    return true;
}

/**
 * START NEW MATCH
 * Creates a fresh match record to preserve history of the previous one.
 */
export async function startNewMatch(venue: string = 'Turf', format: string = '5v5') {
    const { data, error } = await supabase
        .from('matches')
        .insert([
            {
                date: new Date().toISOString(),
                venue,
                kickoff: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                format,
                red_team: [],
                blue_team: [],
                status: 'draft',
                created_by: 'admin', // In real app, use actual user ID
                allow_predictions: true
            },
        ])
        .select()
        .single();

    if (error) {
        console.error('Error creating match:', error);
        return null;
    }
    return data;
}

/**
 * Delete a user's prediction by ID (Member Reset)
 */
export async function deletePredictionById(predictionId: string) {
    const { error } = await supabase
        .from('predictions')
        .delete()
        .eq('id', predictionId);

    if (error) {
        console.error('Error deleting prediction:', error);
        return false;
    }
    return true;
}

/**
 * Subscribes to changes on a specific match.
 * callback is called whenever the match record updates.
 */
export function subscribeToMatch(matchId: string, callback: (payload: any) => void) {
    return supabase
        .channel(`match-${matchId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
            callback
        )
        .subscribe();
}
