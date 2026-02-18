import type { MatchRecord } from './smfcData'

export interface PredictionRecord {
    id: string
    match_id: string
    player_name: string
    prediction: 'red' | 'blue' | 'draw'
    pred_goals_red: number | null
    pred_goals_blue: number | null
    created_at: string
}

export interface FantasyPoints {
    total: number
    result: number
    redScore: number
    blueScore: number
}

export interface FantasyLeaderboardEntry {
    name: string
    points: number
    matchCount: number
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
    match: MatchRecord,
): FantasyPoints {
    if (match.winner === 'Pending' || match.scoreBlue === null || match.scoreRed === null) {
        return { total: 0, result: 0, redScore: 0, blueScore: 0 }
    }

    let points = 0
    let resultPts = 0
    let redPts = 0
    let bluePts = 0

    const predRed = prediction.pred_goals_red !== null ? Number(prediction.pred_goals_red) : null
    const predBlue = prediction.pred_goals_blue !== null ? Number(prediction.pred_goals_blue) : null
    const actualRed = match.scoreRed
    const actualBlue = match.scoreBlue

    // Determine Actual Winner
    let actualWinner: 'red' | 'blue' | 'draw' = 'draw'
    if (actualRed > actualBlue) actualWinner = 'red'
    else if (actualBlue > actualRed) actualWinner = 'blue'

    // Determine Predicted Winner logic
    let predWinner = prediction.prediction
    if (!predWinner && predRed !== null && predBlue !== null) {
        if (predRed > predBlue) predWinner = 'red'
        else if (predBlue > predRed) predWinner = 'blue'
        else predWinner = 'draw'
    }

    // 1. Correct Result (+3)
    const isCorrectResult = predWinner === actualWinner
    if (isCorrectResult) {
        resultPts = 3
        points += 3
    }

    // 2. Correct Red Score (+2)
    if (predRed === actualRed) {
        redPts = 2
        points += 2
    }

    // 3. Correct Blue Score (+2)
    if (predBlue === actualBlue) {
        bluePts = 2
        points += 2
    }

    return { total: points, result: resultPts, redScore: redPts, blueScore: bluePts }
}

export function generateLeaderboard(
    matches: MatchRecord[],
    predictions: PredictionRecord[],
): FantasyLeaderboardEntry[] {
    const playerMap = new Map<string, FantasyLeaderboardEntry>()

    predictions.forEach((pred) => {
        const match = matches.find((m) => m.id === pred.match_id)

        // Always count participation
        if (!playerMap.has(pred.player_name)) {
            playerMap.set(pred.player_name, {
                name: pred.player_name,
                points: 0,
                matchCount: 0,
            })
        }
        const player = playerMap.get(pred.player_name)!
        player.matchCount += 1

        // Calculate points if match is completed
        if (match && match.winner !== 'Pending' && match.scoreRed !== null && match.scoreBlue !== null) {
            const { total } = calculatePredictionPoints(pred, match)
            player.points += total
        }
    })

    return Array.from(playerMap.values()).sort((a, b) => b.points - a.points)
}
