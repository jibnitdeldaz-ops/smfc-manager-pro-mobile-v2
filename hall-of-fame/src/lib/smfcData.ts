const SHEET_ID = '1-ShO5kfDdPH4FxSX-S9tyUNeyLAIOHi44NePaKff7Lw'

type TeamSide = 'Red' | 'Blue'
type Position = 'DEF' | 'MID' | 'FWD'

interface SheetPlayer {
  name: string
  position: Position
  pac: number
  sho: number
  pas: number
  dri: number
  def: number
  phy: number
  starRating: number
  avg: number
}

export interface MatchRecord {
  id: string
  date: string
  venue: string
  teamBlue: string[]
  teamRed: string[]
  scoreBlue: number | null
  scoreRed: number | null
  winner: string
  time: string
}

export interface HallPlayer {
  id: string
  name: string
  position: Position
  team: TeamSide
  ovr: number
  starRating: number
  attributes: {
    pac: number
    sho: number
    pas: number
    dri: number
    def: number
    phy: number
  }
  accent: string
  aura: string
  lore: string
}

export interface HallLeaderboardEntry {
  name: string
  rank: number
  points: number
  matchCount: number
  team: TeamSide
  accent: string
}

export interface HallOfFameData {
  source: 'live-sheet' | 'fallback' | 'supabase-hybrid'
  players: HallPlayer[]
  leaderboard: HallLeaderboardEntry[]
}

const LORE_LINES = [
  'Controls the midfield tempo with laser-sharp distribution.',
  'Wins second balls and flips defense into instant attack.',
  'Always finds one extra pass when the press gets intense.',
  'Builds pressure with relentless high-speed transitions.',
  'Owns duels and commands the big moments near goal.',
  'Reads passing lanes early and turns interceptions into chances.',
  'Leads the squad with clutch decisions under pressure.',
  'Combines composure and aggression in equal measure.',
]

const TEAM_PALETTE: Record<TeamSide, { accent: string; aura: string }> = {
  Red: { accent: '#ff5f5f', aura: '#ff3157' },
  Blue: { accent: '#66b9ff', aura: '#2f80ff' },
}

const FALLBACK_PLAYERS: SheetPlayer[] = [
  { name: 'Karthik', position: 'MID', pac: 84, sho: 82, pas: 88, dri: 86, def: 72, phy: 80, starRating: 5, avg: 82 },
  { name: 'Sujith', position: 'FWD', pac: 88, sho: 86, pas: 79, dri: 84, def: 60, phy: 78, starRating: 4, avg: 79 },
  { name: 'Ramesh', position: 'DEF', pac: 74, sho: 62, pas: 76, dri: 71, def: 86, phy: 84, starRating: 4, avg: 76 },
  { name: 'Anchal', position: 'MID', pac: 82, sho: 79, pas: 84, dri: 83, def: 70, phy: 76, starRating: 4, avg: 79 },
  { name: 'Jithin', position: 'FWD', pac: 86, sho: 84, pas: 74, dri: 81, def: 59, phy: 77, starRating: 4, avg: 77 },
  { name: 'Ajith', position: 'DEF', pac: 71, sho: 58, pas: 73, dri: 70, def: 85, phy: 82, starRating: 3, avg: 73 },
  { name: 'Arjun', position: 'MID', pac: 79, sho: 76, pas: 81, dri: 80, def: 68, phy: 74, starRating: 3, avg: 76 },
  { name: 'Rahul', position: 'FWD', pac: 83, sho: 82, pas: 70, dri: 79, def: 56, phy: 72, starRating: 3, avg: 74 },
  { name: 'Dinesh', position: 'MID', pac: 76, sho: 74, pas: 79, dri: 77, def: 66, phy: 73, starRating: 3, avg: 74 },
  { name: 'Amal', position: 'DEF', pac: 72, sho: 60, pas: 74, dri: 69, def: 82, phy: 81, starRating: 3, avg: 73 },
]

function csvToRows(csv: string): string[][] {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let inQuotes = false

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i]
    const nextChar = csv[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1
      }

      if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim())
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
      }
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    rows.push(currentRow)
  }

  return rows
}

function toNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function normalizePosition(raw: string | undefined): Position {
  if (raw === 'DEF' || raw === 'MID' || raw === 'FWD') {
    return raw
  }
  return 'MID'
}

function parsePlayersFromCsv(csv: string): SheetPlayer[] {
  const rows = csvToRows(csv)
  if (rows.length < 2) {
    return []
  }

  const headers = rows[0].map((item) => item.replace(/"/g, '').trim())
  const nameIdx = headers.findIndex((header) => header === 'Name')
  const positionIdx = headers.findIndex((header) => header === 'Position')
  const pacIdx = headers.findIndex((header) => header === 'PAC')
  const shoIdx = headers.findIndex((header) => header === 'SHO')
  const pasIdx = headers.findIndex((header) => header === 'PAS')
  const driIdx = headers.findIndex((header) => header === 'DRI')
  const defIdx = headers.findIndex((header) => header === 'DEF')
  const phyIdx = headers.findIndex((header) => header === 'PHY')
  const starIdx = headers.findIndex((header) => header === 'StarRating')
  const avgIdx = headers.findIndex((header) => header === 'Avg')

  const players: SheetPlayer[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index].map((item) => item.replace(/"/g, '').trim())
    const name = row[nameIdx]
    if (!name) {
      continue
    }

    players.push({
      name,
      position: normalizePosition(row[positionIdx]),
      pac: toNumber(row[pacIdx], 70),
      sho: toNumber(row[shoIdx], 70),
      pas: toNumber(row[pasIdx], 70),
      dri: toNumber(row[driIdx], 70),
      def: toNumber(row[defIdx], 70),
      phy: toNumber(row[phyIdx], 70),
      starRating: toNumber(row[starIdx], 3),
      avg: toNumber(row[avgIdx], 75),
    })
  }

  return players.sort((left, right) => right.avg - left.avg)
}

function computeHallPoints(player: SheetPlayer): number {
  const blend = player.pac + player.sho + player.pas + player.dri + player.def + player.phy
  return Math.round(player.avg * 18 + player.starRating * 95 + blend * 1.6)
}

function mapToHallData(players: SheetPlayer[], source: HallOfFameData['source']): HallOfFameData {
  const drafted = players
    .slice(0, 16)
    .map((player, index) => {
      const team: TeamSide = index % 2 === 0 ? 'Red' : 'Blue'
      const palette = TEAM_PALETTE[team]

      return {
        id: `${player.name}-${index}`.toLowerCase().replace(/\s+/g, '-'),
        name: player.name,
        position: player.position,
        team,
        ovr: Math.round(player.avg),
        starRating: Math.max(1, Math.min(5, Math.round(player.starRating))),
        attributes: {
          pac: Math.round(player.pac),
          sho: Math.round(player.sho),
          pas: Math.round(player.pas),
          dri: Math.round(player.dri),
          def: Math.round(player.def),
          phy: Math.round(player.phy),
        },
        accent: palette.accent,
        aura: palette.aura,
        lore: LORE_LINES[index % LORE_LINES.length],
      } satisfies HallPlayer
    })

  const leaderboard = drafted
    .map((player) => ({
      name: player.name,
      team: player.team,
      accent: player.accent,
      points: computeHallPoints(
        players.find((candidate) => candidate.name === player.name) ?? {
          name: player.name,
          position: player.position,
          pac: 70,
          sho: 70,
          pas: 70,
          dri: 70,
          def: 70,
          phy: 70,
          starRating: player.starRating,
          avg: player.ovr,
        },
      ),
      rank: 0,
    }))
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      matchCount: 0,
    }))

  return {
    source,
    players: drafted,
    leaderboard,
  }
}

async function fetchLivePlayers(signal?: AbortSignal): Promise<SheetPlayer[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Unable to fetch Sheet1 data (${response.status})`)
  }

  const csv = await response.text()
  const parsed = parsePlayersFromCsv(csv)
  if (parsed.length === 0) {
    throw new Error('No players available in Sheet1')
  }
  return parsed
}

export function getFallbackHallData(): HallOfFameData {
  return mapToHallData(FALLBACK_PLAYERS, 'fallback')
}

import { supabase } from './supabase'
import { generateLeaderboard, type PredictionRecord } from './fantasy'

async function fetchMatchHistory(signal?: AbortSignal): Promise<MatchRecord[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Match_History`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Failed to fetch matches')

  const csv = await response.text()
  const rows = csvToRows(csv)
  if (rows.length < 2) return []

  const headers = rows[0].map(h => h.replace(/"/g, '').trim())
  const dateIdx = headers.findIndex(h => h === 'Date')
  const tbIdx = headers.findIndex(h => h === 'Team_Blue')
  const trIdx = headers.findIndex(h => h === 'Team_Red')
  const sbIdx = headers.findIndex(h => h === 'Score_Blue')
  const srIdx = headers.findIndex(h => h === 'Score_Red')
  const wIdx = headers.findIndex(h => h === 'Winner')

  return rows.slice(1).map((row, i) => {
    const safeRow = row.map(c => c.replace(/"/g, '').trim())
    return {
      id: `match-${i}`,
      date: safeRow[dateIdx] || '',
      venue: 'Turf',
      teamBlue: (safeRow[tbIdx] || '').split(',').map(s => s.trim()),
      teamRed: (safeRow[trIdx] || '').split(',').map(s => s.trim()),
      scoreBlue: safeRow[sbIdx] ? Number(safeRow[sbIdx]) : null,
      scoreRed: safeRow[srIdx] ? Number(safeRow[srIdx]) : null,
      winner: safeRow[wIdx] || 'Pending',
      time: '00:00'
    }
  })
}

async function fetchPredictions(): Promise<PredictionRecord[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')

  if (error) {
    console.error('Supabase error:', error)
    return []
  }
  return data as PredictionRecord[]
}

export async function getHallOfFameData(signal?: AbortSignal): Promise<HallOfFameData> {
  try {
    // 1. Fetch Players (Sheet1)
    const players = await fetchLivePlayers(signal)

    // 2. Fetch Matches (Match_History)
    const matches = await fetchMatchHistory(signal)

    // 3. Fetch Predictions (Supabase)
    const predictions = await fetchPredictions()

    // 4. Generate Real Leaderboard
    const fantasyLeaderboard = generateLeaderboard(matches, predictions)

    // 5. Map to Hall Data
    return mapToRealHallData(players, fantasyLeaderboard, 'supabase-hybrid')

  } catch (err) {
    console.error('Data fetch failed, using fallback:', err)
    return getFallbackHallData()
  }
}

function mapToRealHallData(
  players: SheetPlayer[],
  leaderboard: import('./fantasy').FantasyLeaderboardEntry[],
  source: HallOfFameData['source']
): HallOfFameData {

  const drafted = players.slice(0, 16).map((p, i) => {
    const team: TeamSide = i % 2 === 0 ? 'Red' : 'Blue'
    return {
      id: `${p.name}-${i}`.toLowerCase().replace(/\s+/g, '-'),
      name: p.name,
      position: p.position,
      team,
      ovr: Math.round(p.avg),
      starRating: Math.max(1, Math.min(5, Math.round(p.starRating))),
      attributes: {
        pac: Math.round(p.pac),
        sho: Math.round(p.sho),
        pas: Math.round(p.pas),
        dri: Math.round(p.dri),
        def: Math.round(p.def),
        phy: Math.round(p.phy),
      },
      accent: TEAM_PALETTE[team].accent,
      aura: TEAM_PALETTE[team].aura,
      lore: LORE_LINES[i % LORE_LINES.length],
    }
  })

  // Merge fantasy data with visual data
  const finalLeaderboard = leaderboard.slice(0, 7).map((entry, i) => {
    const playerMeta = drafted.find(p => p.name === entry.name)
    const team = playerMeta ? playerMeta.team : (i % 2 === 0 ? 'Red' : 'Blue')
    return {
      name: entry.name,
      rank: i + 1,
      points: entry.points,
      matchCount: entry.matchCount,
      team,
      accent: TEAM_PALETTE[team].accent
    }
  })

  return {
    source,
    players: drafted,
    leaderboard: finalLeaderboard
  }
}
