// Google Sheets CSV Data Fetcher
// Sheet URL: https://docs.google.com/spreadsheets/d/1-ShO5kfDdPH4FxSX-S9tyUNeyLAIOHi44NePaKff7Lw

const SHEET_ID = '1-ShO5kfDdPH4FxSX-S9tyUNeyLAIOHi44NePaKff7Lw';

export interface Player {
    name: string;
    position: 'DEF' | 'MID' | 'FWD';
    pac: number;
    sho: number;
    pas: number;
    dri: number;
    def: number;
    phy: number;
    starRating: number;
    avg: number;
}

export interface MatchRecord {
    date: string;
    venue: string;
    teamBlue: string[];
    teamRed: string[];
    scoreBlue: number;
    scoreRed: number;
    winner: string;
    time: string;
}

function parseCSV(csv: string): string[][] {
    const lines = csv.trim().split('\n');
    return lines.map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
            else { current += char; }
        }
        result.push(current.trim());
        return result;
    });
}

export async function fetchPlayers(): Promise<Player[]> {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
    try {
        const response = await fetch(url);
        const csv = await response.text();
        const rows = parseCSV(csv);
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => h.replace(/"/g, '').trim());
        const nameIdx = headers.findIndex(h => h === 'Name');
        const posIdx = headers.findIndex(h => h === 'Position');
        const pacIdx = headers.findIndex(h => h === 'PAC');
        const shoIdx = headers.findIndex(h => h === 'SHO');
        const pasIdx = headers.findIndex(h => h === 'PAS');
        const driIdx = headers.findIndex(h => h === 'DRI');
        const defIdx = headers.findIndex(h => h === 'DEF');
        const phyIdx = headers.findIndex(h => h === 'PHY');
        const starIdx = headers.findIndex(h => h === 'StarRating');
        const avgIdx = headers.findIndex(h => h === 'Avg');

        const players: Player[] = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].map(c => c.replace(/"/g, '').trim());
            const name = row[nameIdx];
            if (!name) continue;
            players.push({
                name,
                position: (row[posIdx] || 'MID') as 'DEF' | 'MID' | 'FWD',
                pac: parseFloat(row[pacIdx]) || 70,
                sho: parseFloat(row[shoIdx]) || 70,
                pas: parseFloat(row[pasIdx]) || 70,
                dri: parseFloat(row[driIdx]) || 70,
                def: parseFloat(row[defIdx]) || 70,
                phy: parseFloat(row[phyIdx]) || 70,
                starRating: parseFloat(row[starIdx]) || 3,
                avg: parseFloat(row[avgIdx]) || 75,
            });
        }
        return players.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
        console.error('Error fetching players from Google Sheets:', err);
        return [];
    }
}

export async function fetchMatchHistory(): Promise<MatchRecord[]> {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Match_History`;
    try {
        const response = await fetch(url);
        const csv = await response.text();
        const rows = parseCSV(csv);
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => h.replace(/"/g, '').trim());
        const dateIdx = headers.findIndex(h => h === 'Date');
        const venueIdx = headers.findIndex(h => h === 'Venue');
        const tbIdx = headers.findIndex(h => h === 'Team_Blue');
        const trIdx = headers.findIndex(h => h === 'Team_Red');
        const sbIdx = headers.findIndex(h => h === 'Score_Blue');
        const srIdx = headers.findIndex(h => h === 'Score_Red');
        const wIdx = headers.findIndex(h => h === 'Winner');
        const tIdx = headers.findIndex(h => h === 'Time');

        const matches: MatchRecord[] = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].map(c => c.replace(/"/g, '').trim());
            const date = row[dateIdx];
            if (!date) continue;
            matches.push({
                date,
                venue: row[venueIdx] || 'BFC',
                teamBlue: (row[tbIdx] || '').split(',').map(s => s.trim()).filter(Boolean),
                teamRed: (row[trIdx] || '').split(',').map(s => s.trim()).filter(Boolean),
                scoreBlue: parseInt(row[sbIdx]) || 0,
                scoreRed: parseInt(row[srIdx]) || 0,
                winner: row[wIdx] || 'Draw',
                time: row[tIdx] || '',
            });
        }
        return matches;
    } catch (err) {
        console.error('Error fetching match history:', err);
        return [];
    }
}
