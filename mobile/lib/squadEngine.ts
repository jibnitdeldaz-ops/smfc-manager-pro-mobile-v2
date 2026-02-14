// Squad Generation Algorithm — Matches actual Streamlit app (app_checkedinfinalversiongolden.py)
import { Player } from './sheets';

export interface ScoredPlayer extends Player {
    ovr: number;
    sortOvr: number;
    team: 'Red' | 'Blue';
}

// Actual algorithm from golden app:
// OVR = mean(PAC, SHO, PAS, DRI, DEF, PHY)
// Sort_OVR = OVR + random(-3, 3)
// Sort descending, assign teams: index % 4 in [0,3] = Red, [1,2] = Blue
// Helper to sort by position: DEF -> MID -> FWD (then by OVR)
export function sortTeamByPos(team: ScoredPlayer[]): ScoredPlayer[] {
    const posOrder: Record<string, number> = { 'DEF': 1, 'MID': 2, 'FWD': 3 };
    return [...team].sort((a, b) => {
        const pa = posOrder[a.position] || 99;
        const pb = posOrder[b.position] || 99;
        if (pa !== pb) return pa - pb;
        return b.sortOvr - a.sortOvr; // Secondary sort by strength
    });
}

export function generateSquad(
    selectedPlayers: Player[],
    guests: string[] = [],
): { red: ScoredPlayer[]; blue: ScoredPlayer[]; } {
    // Compute OVR for SMFC players
    const allPlayers: ScoredPlayer[] = selectedPlayers.map(p => {
        const ovr = (p.pac + p.sho + p.pas + p.dri + p.def + p.phy) / 6;
        const sortOvr = ovr + (Math.random() * 6 - 3); // random(-3, 3)
        return { ...p, ovr: Math.round(ovr * 10) / 10, sortOvr, team: 'Red' as const };
    });

    // Add guests as MID with default stats
    for (const name of guests) {
        const ovr = 70;
        const sortOvr = ovr + (Math.random() * 6 - 3);
        allPlayers.push({
            name,
            position: 'MID' as const,
            pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70,
            starRating: 3, avg: 70,
            ovr, sortOvr, team: 'Red',
        });
    }

    // Sort descending by Sort_OVR for draft balance
    allPlayers.sort((a, b) => b.sortOvr - a.sortOvr);

    // Assign teams: index % 4 in [0,3] = Red, [1,2] = Blue (snake draft)
    for (let i = 0; i < allPlayers.length; i++) {
        const mod = i % 4;
        allPlayers[i].team = (mod === 0 || mod === 3) ? 'Red' : 'Blue';

        // Assign keeper if position is GK (though user didn't ask for this explicitly, let's keep it safe)
    }

    const red = sortTeamByPos(allPlayers.filter(p => p.team === 'Red'));
    const blue = sortTeamByPos(allPlayers.filter(p => p.team === 'Blue'));

    return { red, blue };
}

// Transfer: swap two players between teams
export function swapPlayers(
    allPlayers: ScoredPlayer[],
    redPlayerName: string,
    bluePlayerName: string
): ScoredPlayer[] {
    const updated = [...allPlayers];
    const redIdx = updated.findIndex(p => p.name === redPlayerName && p.team === 'Red');
    const blueIdx = updated.findIndex(p => p.name === bluePlayerName && p.team === 'Blue');

    if (redIdx !== -1 && blueIdx !== -1) {
        updated[redIdx] = { ...updated[redIdx], team: 'Blue' };
        updated[blueIdx] = { ...updated[blueIdx], team: 'Red' };
    }

    // Re-sort ONLY the teams involved (which is both)
    // Actually, simpler to split, sort, and re-merge
    const red = sortTeamByPos(updated.filter(p => p.team === 'Red'));
    const blue = sortTeamByPos(updated.filter(p => p.team === 'Blue'));

    return [...red, ...blue];
}

// Formation presets for Tactical Board — exact coordinates from backend.py
// Coordinates are [x, y] where x = vertical position (0=top, 100=bottom), y = horizontal (0=left, 100=right)
export interface FormationPreset {
    limit: number;
    RED_COORDS: [number, number][];
    BLUE_COORDS: [number, number][];
}

export const FORMATION_PRESETS: Record<string, FormationPreset> = {
    "9 vs 9": {
        limit: 9,
        RED_COORDS: [[10, 20], [10, 50], [10, 80], [30, 15], [30, 38], [30, 62], [30, 85], [45, 35], [45, 65]],
        BLUE_COORDS: [[90, 20], [90, 50], [90, 80], [70, 15], [70, 38], [70, 62], [70, 85], [55, 35], [55, 65]],
    },
    "7 vs 7": {
        limit: 7,
        RED_COORDS: [[10, 30], [10, 70], [30, 20], [30, 50], [30, 80], [45, 35], [45, 65]],
        BLUE_COORDS: [[90, 30], [90, 70], [70, 20], [70, 50], [70, 80], [55, 35], [55, 65]],
    },
    "6 vs 6": {
        limit: 6,
        RED_COORDS: [[10, 30], [10, 70], [30, 30], [30, 70], [45, 35], [45, 65]],
        BLUE_COORDS: [[90, 30], [90, 70], [70, 30], [70, 70], [55, 35], [55, 65]],
    },
    "5 vs 5": {
        limit: 5,
        RED_COORDS: [[10, 30], [10, 70], [30, 50], [45, 30], [45, 70]],
        BLUE_COORDS: [[90, 30], [90, 70], [70, 50], [55, 30], [55, 70]],
    },
};

export const FORMAT_OPTIONS = ['9 vs 9', '7 vs 7', '6 vs 6', '5 vs 5'];
export const VENUE_OPTIONS = ['BFC', 'GoatArena', 'SportZ', 'Other'];

export type MatchFormat = string;
export type Venue = string;

// Generate time slots (30-min gaps, AM/PM)
export function generateTimeSlots(): string[] {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (const m of [0, 30]) {
            const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h < 12 ? 'AM' : 'PM';
            const min = m === 0 ? '00' : '30';
            slots.push(`${hour12}:${min} ${ampm}`);
        }
    }
    return slots;
}
