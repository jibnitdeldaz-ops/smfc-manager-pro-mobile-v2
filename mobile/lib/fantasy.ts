import { MatchRecord } from './matches';

export interface PredictionRecord {
    id: string;
    match_id: string;
    player_name: string;
    prediction: 'red' | 'blue' | 'draw';
    pred_goals_red: number | null;
    pred_goals_blue: number | null;
    is_correct?: boolean; // Legacy field, we calculate dynamic now
    created_at: string;
}

export interface FantasyPlayer {
    name: string;
    totalPoints: number;
    winPoints: number;  // Points from correct results (3 pts each)
    redPoints: number;  // Points from correct red scores (2 pts each)
    bluePoints: number; // Points from correct blue scores (2 pts each)
    played: number;     // Number of predictions (NO)
}

/**
 * Calculates points for a single prediction based on the new system:
 * - Correct Winner/Draw: +3 Points
 * - Correct Red Score: +2 Points
 * - Correct Blue Score: +2 Points
 * - Max Total: 7 Points (Exact Score)
 */
export function calculatePredictionPoints(
    prediction: PredictionRecord,
    match: MatchRecord
): { points: number; winPts: number; redPts: number; bluePts: number } {
    if (match.status !== 'completed' || match.score_red === null || match.score_blue === null) {
        return { points: 0, winPts: 0, redPts: 0, bluePts: 0 };
    }

    let points = 0;
    let winPts = 0;
    let redPts = 0;
    let bluePts = 0;

    // Force number type for safer comparison
    const predRed = prediction.pred_goals_red !== null ? Number(prediction.pred_goals_red) : null;
    const predBlue = prediction.pred_goals_blue !== null ? Number(prediction.pred_goals_blue) : null;
    const actualRed = Number(match.score_red);
    const actualBlue = Number(match.score_blue);

    // Determine Actual Winner
    let actualWinner: 'red' | 'blue' | 'draw' = 'draw';
    if (actualRed > actualBlue) actualWinner = 'red';
    else if (actualBlue > actualRed) actualWinner = 'blue';

    // Determine Predicted Winner logic (if not explicitly stored, derive from goals)
    let predWinner = prediction.prediction;
    if (!predWinner && predRed !== null && predBlue !== null) {
        if (predRed > predBlue) predWinner = 'red';
        else if (predBlue > predRed) predWinner = 'blue';
        else predWinner = 'draw';
    }

    // 1. Correct Result (+3)
    const isCorrectResult = predWinner === actualWinner;
    if (isCorrectResult) {
        winPts = 3;
        points += 3;
    }

    // 2. Correct Red Score (+2)
    if (predRed === actualRed) {
        redPts = 2;
        points += 2;
    }

    // 3. Correct Blue Score (+2)
    if (predBlue === actualBlue) {
        bluePts = 2;
        points += 2;
    }

    return { points, winPts, redPts, bluePts };
}

/**
 * Aggregates points for all players.
 */
export function generateLeaderboard(matches: MatchRecord[], predictions: PredictionRecord[]): FantasyPlayer[] {
    const playerMap = new Map<string, FantasyPlayer>();

    const getPlayer = (name: string) => {
        if (!playerMap.has(name)) {
            playerMap.set(name, {
                name,
                totalPoints: 0,
                winPoints: 0,
                redPoints: 0,
                bluePoints: 0,
                played: 0
            });
        }
        return playerMap.get(name)!;
    };

    predictions.forEach(pred => {
        const match = matches.find(m => m.id === pred.match_id);
        // Count participation regardless of match status (User Request: "NO should increase with every prediction")
        const player = getPlayer(pred.player_name);
        player.played += 1;

        // Calculate points ONLY if match is completed
        if (match && match.status === 'completed') {
            const { points, winPts, redPts, bluePts } = calculatePredictionPoints(pred, match);
            player.totalPoints += points;
            player.winPoints += winPts;
            player.redPoints += redPts;
            player.bluePoints += bluePts;
        }
    });

    return Array.from(playerMap.values()).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.played !== a.played) return a.played - b.played; // Efficiency? Less matches = better? Or more matches better? Let's just break ties by name if needed.
        return 0;
    });
}

/**
 * Gets the top scorers from the very last completed match.
 */
export function getLastMatchTopScorers(matches: MatchRecord[], predictions: PredictionRecord[]) {
    // 1. Find the last completed match
    const lastMatch = matches
        .filter(m => m.status === 'completed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!lastMatch) return null;

    // 2. Calculate points for everyone in that match
    const matchPreds = predictions.filter(p => p.match_id === lastMatch.id);
    if (matchPreds.length === 0) return null;

    const scores = matchPreds.map(p => {
        const { points } = calculatePredictionPoints(p, lastMatch);
        return { name: p.player_name, points };
    });

    // 3. Find max score
    const maxScore = Math.max(...scores.map(s => s.points));
    if (maxScore === 0) return null; // Ignore if everyone got 0? Or maybe show them if 0 is max? Let's show.

    const bestPlayers = scores.filter(s => s.points === maxScore);

    return {
        matchDate: lastMatch.date,
        matchScore: `${lastMatch.score_red}-${lastMatch.score_blue}`,
        topScore: maxScore,
        players: bestPlayers.map(p => p.name)
    };
}
