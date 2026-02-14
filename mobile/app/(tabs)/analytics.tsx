import { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TextInput, Pressable,
    ActivityIndicator, Alert, Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchMatchHistory, MatchRecord } from '../../lib/sheets';
import { supabase } from '../../lib/supabase';
import { generatePanelDiscussion, PanelMessage } from '../../lib/kaarthumbi';

const { width: SCREEN_W } = Dimensions.get('window');

// ═══ LEADERBOARD BUILDER ═══
interface LeaderboardEntry {
    rank: number;
    name: string;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    winPct: number;
    form: ('W' | 'L' | 'D')[];
}

function buildLeaderboard(history: MatchRecord[]): LeaderboardEntry[] {
    const stats: Record<string, { m: number; w: number; l: number; d: number; recent: ('W' | 'L' | 'D')[] }> = {};
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

    for (const match of sorted) {
        const allPlayers = [...match.teamBlue, ...match.teamRed];
        for (const name of allPlayers) {
            if (!name) continue;
            if (!stats[name]) stats[name] = { m: 0, w: 0, l: 0, d: 0, recent: [] };
            stats[name].m++;
            const isBlue = match.teamBlue.includes(name);
            let result: 'W' | 'L' | 'D' = 'D';
            if (match.winner === 'Blue') result = isBlue ? 'W' : 'L';
            else if (match.winner === 'Red') result = isBlue ? 'L' : 'W';
            if (result === 'W') stats[name].w++;
            else if (result === 'L') stats[name].l++;
            else stats[name].d++;
            stats[name].recent.push(result);
            if (stats[name].recent.length > 5) stats[name].recent.shift();
        }
    }

    return Object.entries(stats)
        .map(([name, s]) => ({
            rank: 0, name,
            matches: s.m, wins: s.w, losses: s.l, draws: s.d,
            winPct: s.m > 0 ? Math.round((s.w / s.m) * 100) : 0,
            form: s.recent.slice(-5),
        }))
        .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins)
        .map((e, i) => ({ ...e, rank: i + 1 }));
}

// ═══ STATS ═══
function computeStats(history: MatchRecord[], leaderboard: LeaderboardEntry[]) {
    const totalMatches = history.length;
    const totalGoals = history.reduce((s, m) => s + m.scoreBlue + m.scoreRed, 0);
    const allNames = new Set<string>();
    history.forEach(m => { m.teamBlue.forEach(n => allNames.add(n)); m.teamRed.forEach(n => allNames.add(n)); });
    const totalPlayers = allNames.size;

    // Most Wins (was Commitment)
    const maxWins = Math.max(...leaderboard.map(p => p.wins), 0);
    const mostWins = leaderboard.filter(p => p.wins === maxWins && p.wins > 0);

    // Lucky Star: highest win% (Leaderboard is already sorted by Win% then Wins)
    const luckyStar = leaderboard.length > 0 ? leaderboard[0] : null;

    // Most Losses
    const maxLosses = Math.max(...leaderboard.map(p => p.losses), 0);
    const mostLosses = leaderboard.filter(p => p.losses === maxLosses && p.losses > 0);

    return { totalMatches, totalGoals, totalPlayers, mostWins, luckyStar, mostLosses };
}

// ═══ MATCH LOG PARSER ═══
function parseMatchLog(text: string): {
    date: string; venue: string; scoreBlue: number; scoreRed: number;
    teamBlue: string[]; teamRed: string[];
} | null {
    try {
        const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
        let date = '', venue = 'BFC', scoreBlue = 0, scoreRed = 0;
        const teamBlue: string[] = [];
        const teamRed: string[] = [];
        let section: 'none' | 'blue' | 'red' = 'none';

        for (const line of lines) {
            const lower = line.toLowerCase();
            // Parse date
            if (lower.startsWith('date:')) { date = line.replace(/date:\s*/i, '').trim(); continue; }
            // Parse venue
            if (lower.startsWith('venue:') || lower.startsWith('ground:')) { venue = line.replace(/(?:venue|ground):\s*/i, '').trim(); continue; }
            // Parse score line: "Blue 5 - 3 Red" or "BLUE 5-3 RED"
            const scoreMatch = line.match(/blue\s*(\d+)\s*[-–]\s*(\d+)\s*red/i);
            if (scoreMatch) { scoreBlue = parseInt(scoreMatch[1]); scoreRed = parseInt(scoreMatch[2]); continue; }
            // Team headers
            if (lower.includes('blue team') || lower.includes('blue:') || lower === 'blue') { section = 'blue'; continue; }
            if (lower.includes('red team') || lower.includes('red:') || lower === 'red') { section = 'red'; continue; }
            // Score line: "Score: Blue 0-0 Red"
            const scoreLine2 = line.match(/score:\s*blue\s*(\d+)\s*[-–]\s*(\d+)\s*red/i);
            if (scoreLine2) { scoreBlue = parseInt(scoreLine2[1]); scoreRed = parseInt(scoreLine2[2]); continue; }
            // Player names (numbered list or plain)
            const nameMatch = line.match(/^\s*\d+[.)]\s*(.+)/);
            const name = nameMatch ? nameMatch[1].trim() : (section !== 'none' ? line.trim() : null);
            if (name && name.length > 1 && section === 'blue') teamBlue.push(name);
            else if (name && name.length > 1 && section === 'red') teamRed.push(name);
        }

        if (teamBlue.length === 0 && teamRed.length === 0) return null;
        if (!date) date = new Date().toISOString().split('T')[0];
        return { date, venue, scoreBlue, scoreRed, teamBlue, teamRed };
    } catch {
        return null;
    }
}

// ═══ MAIN COMPONENT ═══
export default function Analytics() {
    // Unified History State
    const [sheetsHistory, setSheetsHistory] = useState<MatchRecord[]>([]);
    const [supabaseHistory, setSupabaseHistory] = useState<MatchRecord[]>([]);

    // Derived complete history (Supabase matches first, then Sheets)
    // Note: Supabase matches are likely newer, so we should prioritize them or just concatenate.
    // We'll rely on sorting by date later.
    const history = useMemo(() => [...supabaseHistory, ...sheetsHistory], [supabaseHistory, sheetsHistory]);

    const [loading, setLoading] = useState(true);

    // Kaarthumbi chat
    const [chatQuery, setChatQuery] = useState('');
    const [chatMessages, setChatMessages] = useState<PanelMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Log Match
    const [logOpen, setLogOpen] = useState(false);
    const [logText, setLogText] = useState('');
    const [logParsed, setLogParsed] = useState<ReturnType<typeof parseMatchLog>>(null);
    const [logPassword, setLogPassword] = useState('');
    const [showLogPassword, setShowLogPassword] = useState(false);

    // Reuse / Add Match Mode
    const [reuseMode, setReuseMode] = useState(false);
    const [draftBlue, setDraftBlue] = useState<string[]>([]);
    const [draftRed, setDraftRed] = useState<string[]>([]);

    // Manual Score Entry State (Replacing window)
    const [manualBlue, setManualBlue] = useState('');
    const [manualRed, setManualRed] = useState('');
    const [manualComments, setManualComments] = useState('');

    const [logMatchId, setLogMatchId] = useState<string | null>(null);

    // Load History on mount and when log panel closes (refresh)
    useEffect(() => {
        loadSupabaseHistory();
    }, [logOpen]);

    const loadSupabaseHistory = async () => {
        const { getCompletedMatches } = await import('../../lib/matches');
        const data = await getCompletedMatches();

        if (data) {
            // Transform Supabase data to match MatchRecord interface
            const transformed: MatchRecord[] = data.map((m: any) => {
                // Team data in Supabase is stored as JSON string or array of objects with 'name'
                // We need array of strings for MatchRecord
                let blueNames: string[] = [];
                let redNames: string[] = [];

                try {
                    // Handle potential string vs object array
                    const b = typeof m.blue_team === 'string' ? JSON.parse(m.blue_team) : m.blue_team;
                    const r = typeof m.red_team === 'string' ? JSON.parse(m.red_team) : m.red_team;

                    if (Array.isArray(b)) blueNames = b.map((p: any) => p.name || p);
                    if (Array.isArray(r)) redNames = r.map((p: any) => p.name || p);
                } catch (e) {
                    console.error("Error parsing team data for match", m.id, e);
                }

                // Determine winner string
                const sBlue = m.score_blue || 0;
                const sRed = m.score_red || 0;
                let winner = 'Draw';
                if (sBlue > sRed) winner = 'Blue';
                else if (sRed > sBlue) winner = 'Red';

                return {
                    date: new Date(m.created_at).toISOString().split('T')[0], // YYYY-MM-DD
                    venue: m.venue,
                    teamBlue: blueNames,
                    teamRed: redNames,
                    scoreBlue: sBlue,
                    scoreRed: sRed,
                    winner: winner,
                    time: m.kickoff || ''
                };
            });
            setSupabaseHistory(transformed);
        }
    };

    // Auto-fetch active match for logging
    const fetchActiveLoggingMatch = async () => {
        const { getActiveMatch } = await import('../../lib/matches');
        const m = await getActiveMatch();
        if (m) {
            setLogMatchId(m.id);
            setLogText(`Live Match: ${m.venue} \nID: ${m.id}`);
        } else {
            setLogMatchId(null);
            setLogText('No active live match found.');
        }
    };

    // Refresh data when screen focuses
    const { useFocusEffect } = require('expo-router');
    const { useCallback } = require('react');

    useFocusEffect(
        useCallback(() => {
            fetchActiveLoggingMatch();
            loadSupabaseHistory();
        }, [])
    );

    // Load initial data from Google Sheets (via existing logic)
    useEffect(() => {
        fetchMatchHistory().then(data => { setSheetsHistory(data); setLoading(false); });
    }, []);

    const leaderboard = useMemo(() => buildLeaderboard(history), [history]);
    const stats = useMemo(() => computeStats(history, leaderboard), [history, leaderboard]);

    const recentMatches = useMemo(() =>
        [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
        [history]
    );

    // Form icon
    const formIcon = (r: string) => r === 'W' ? '✅' : r === 'L' ? '❌' : '➖';

    // Rank color gradient (green → orange → red)
    const rankColor = (rank: number, total: number) => {
        if (total <= 1) return '#F97316';
        const pct = (rank - 1) / (total - 1);
        if (pct < 0.33) return '#4ade80';
        if (pct < 0.66) return '#F97316';
        return '#ef4444';
    };

    // Chat handler
    const handleAskPanel = () => {
        if (!chatQuery.trim()) return;
        setChatLoading(true);
        setTimeout(() => {
            const msgs = generatePanelDiscussion(chatQuery);
            setChatMessages(msgs);
            setChatLoading(false);
        }, 600);
    };

    // Parse log
    const handleParseLog = () => {
        const parsed = parseMatchLog(logText);
        if (!parsed) { Alert.alert('Could not parse', 'Check the format and try again.'); return; }
        setLogParsed(parsed);
        setShowLogPassword(true);
    };

    // Save log
    const handleSaveLog = () => {
        if (logPassword !== '1234') { Alert.alert('Wrong password'); return; }
        if (!logParsed) return;
        const winner = logParsed.scoreBlue > logParsed.scoreRed ? 'Blue' :
            logParsed.scoreRed > logParsed.scoreBlue ? 'Red' : 'Draw';
        const newMatch: MatchRecord = {
            date: logParsed.date,
            venue: logParsed.venue,
            teamBlue: logParsed.teamBlue,
            teamRed: logParsed.teamRed,
            scoreBlue: logParsed.scoreBlue,
            scoreRed: logParsed.scoreRed,
            winner,
            time: '',
        };

        // We push to Sheets history locally for instant update, but ideally we should push to Supabase
        // Since this function is the "Log Match" feature (Las Vegas style), 
        // it updates local state only in the original code.
        // But wait, the new parser logic above just sets local state.
        // If we want this to be persistent, we should probably be using the Supabase flow via 'Mission Control'.
        // However, to keep existing functionality working:
        setSheetsHistory(prev => [...prev, newMatch]);
        Alert.alert('✅ Match Saved!', `${winner === 'Draw' ? 'Draw' : winner + ' wins'} — Blue ${logParsed.scoreBlue}-${logParsed.scoreRed} Red`);
        setLogText(''); setLogParsed(null); setLogPassword(''); setShowLogPassword(false); setLogOpen(false);
    };

    if (loading) {
        return (
            <SafeAreaView style={s.container} edges={['bottom']}>
                <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 60 }} />
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>Loading match history...</Text>
            </SafeAreaView>
        );
    }



    return (
        <SafeAreaView style={s.container} edges={['bottom']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                    {/* ═══ KAARTHUMBI'S CORNER ═══ */}
                    <View style={s.kaartSection}>
                        <View style={s.kaartHeader}>
                            <Text style={s.kaartEmoji}>🐵</Text>
                            <Text style={s.kaartTitle}>KAARTHUMBI'S CORNER</Text>
                        </View>
                        <Text style={s.kaartSub}>ASK THE PANEL...</Text>
                        <TextInput
                            style={s.kaartInput}
                            value={chatQuery}
                            onChangeText={setChatQuery}
                            placeholder="E.g. Who played well? What about Gilson?"
                            placeholderTextColor="#64748b"
                        />
                        <Pressable style={s.askBtn} onPress={handleAskPanel} disabled={chatLoading}>
                            <Text style={s.askBtnText}>{chatLoading ? '⏳ THINKING...' : '🎙️ ASK KAARTHUMBI'}</Text>
                        </Pressable>

                        {/* Chat bubbles */}
                        {chatMessages.length > 0 && (
                            <View style={s.chatContainer}>
                                {chatMessages.map((msg, i) => (
                                    <View key={i} style={[s.chatRow, msg.side === 'left' ? s.chatRowLeft : s.chatRowRight]}>
                                        {msg.side === 'left' && <Text style={s.chatAvatar}>{msg.emoji}</Text>}
                                        <View style={[s.chatBubble, { backgroundColor: msg.color }]}>
                                            <Text style={s.chatName}>{msg.character}</Text>
                                            <Text style={s.chatText}>{msg.text}</Text>
                                        </View>
                                        {msg.side === 'right' && <Text style={s.chatAvatar}>{msg.emoji}</Text>}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ═══ STATS SUMMARY ═══ */}
                    <View style={s.statsRow}>
                        <View style={s.statCard}>
                            <Text style={s.statLabel}>MATCHES</Text>
                            <Text style={s.statValue}>{stats.totalMatches}</Text>
                        </View>
                        <View style={s.statCard}>
                            <Text style={s.statLabel}>GOALS</Text>
                            <Text style={s.statValue}>{stats.totalGoals}</Text>
                        </View>
                        <View style={s.statCard}>
                            <Text style={s.statLabel}>PLAYERS</Text>
                            <Text style={s.statValue}>{stats.totalPlayers}</Text>
                        </View>
                    </View>

                    {/* Highlight cards */}
                    <View style={s.highlightRow}>
                        <View style={[s.highlightCard, { borderBottomColor: '#1c83e1' }]}>
                            <Text style={s.hlValue}>{stats.mostWins.length > 0 ? stats.mostWins[0].wins : 0}</Text>
                            <Text style={s.hlLabel}>MOST WINS</Text>
                            <Text style={s.hlSub} numberOfLines={2}>
                                {stats.mostWins.map(p => p.name).join(', ') || '—'}
                            </Text>
                        </View>
                        <View style={[s.highlightCard, { borderBottomColor: '#FCD34D' }]}>
                            <Text style={s.hlValue}>{stats.luckyStar ? stats.luckyStar.winPct + '%' : '—'}</Text>
                            <Text style={s.hlLabel}>LUCKY STAR</Text>
                            <Text style={s.hlSub}>{stats.luckyStar?.name || '—'}</Text>
                        </View>
                        <View style={[s.highlightCard, { borderBottomColor: '#ef4444' }]}>
                            <Text style={s.hlValue}>{stats.mostLosses.length > 0 ? stats.mostLosses[0].losses : 0}</Text>
                            <Text style={s.hlLabel}>MOST LOSSES</Text>
                            <Text style={s.hlSub} numberOfLines={2}>
                                {stats.mostLosses.map(p => p.name).join(', ') || '—'}
                            </Text>
                        </View>
                    </View>

                    {/* ═══ PLAYER LEADERBOARD ═══ */}
                    <Text style={s.sectionTitle}>🏆 PLAYER LEADERBOARD</Text>
                    {leaderboard.map((entry) => (
                        <View key={entry.name} style={[s.lbCard, { borderLeftColor: rankColor(entry.rank, leaderboard.length) }]}>
                            <Text style={[s.lbRank, { color: rankColor(entry.rank, leaderboard.length) }]}>#{entry.rank}</Text>
                            <View style={s.lbInfo}>
                                <Text style={s.lbName}>{entry.name.toUpperCase()}</Text>
                                <Text style={s.lbStats}>{entry.matches} Matches • {entry.wins} Wins</Text>
                            </View>
                            <View style={s.lbRight}>
                                <Text style={s.lbForm}>{entry.form.map(formIcon).join(' ')}</Text>
                                <Text style={[s.lbPct, { color: rankColor(entry.rank, leaderboard.length) }]}>{entry.winPct}%</Text>
                            </View>
                        </View>
                    ))}

                    {leaderboard.length === 0 && (
                        <Text style={s.emptyText}>No match history found</Text>
                    )}

                    {/* ═══ RECENT MATCHES ═══ */}
                    <Text style={[s.sectionTitle, { marginTop: 24 }]}>📅 RECENT MATCHES</Text>
                    {recentMatches.map((m, i) => {
                        const blueWins = m.winner === 'Blue';
                        const redWins = m.winner === 'Red';
                        const isDraw = !blueWins && !redWins;

                        // Winner Colors: Gold for win, Grey for loss, White for draw
                        const blueColor = blueWins ? '#FCD34D' : isDraw ? '#fff' : '#94a3b8';
                        const redColor = redWins ? '#FCD34D' : isDraw ? '#fff' : '#94a3b8';

                        return (
                            <Pressable
                                key={i}
                                style={[s.rmCard, { borderLeftColor: blueWins ? '#3b82f6' : redWins ? '#ef4444' : '#fff' }]}
                                onPress={() => {
                                    Alert.alert(
                                        'Re-use Lineup?',
                                        `Log a new match with these players?`,
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Yes, Load Players', onPress: () => {
                                                    setDraftBlue(m.teamBlue);
                                                    setDraftRed(m.teamRed);
                                                    setReuseMode(true);
                                                    setLogText(`REUSING LINEUP:\n${m.venue} (${m.date})`);
                                                    setLogOpen(true);
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Text style={s.rmDate}>{m.date} | {m.venue}</Text>
                                <View style={s.rmScoreRow}>
                                    {/* Team Names always their own color */}
                                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {blueWins && <Text style={{ fontSize: 14, marginRight: 4 }}>🏆</Text>}
                                            <Text style={{ color: '#3b82f6', fontWeight: '900', fontSize: 13 }}>BLUE</Text>
                                        </View>
                                        <Text style={[s.rmScore, { color: isDraw ? '#fff' : '#3b82f6' }]}>{m.scoreBlue}</Text>
                                    </View>
                                    <Text style={[s.rmDash, { color: '#fff' }]}>-</Text>
                                    <View style={{ alignItems: 'flex-start', flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 13 }}>RED</Text>
                                            {redWins && <Text style={{ fontSize: 14, marginLeft: 4 }}>🏆</Text>}
                                        </View>
                                        <Text style={[s.rmScore, { color: isDraw ? '#fff' : '#ef4444' }]}>{m.scoreRed}</Text>
                                    </View>
                                </View>

                                {/* Team rosters with Golden Glow for winners */}
                                <Text
                                    style={[
                                        s.rmTeam,
                                        { color: blueColor },
                                        blueWins && { textShadowColor: 'rgba(252, 211, 77, 0.6)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }
                                    ]}
                                    numberOfLines={2}
                                >
                                    {m.teamBlue.join(', ')}
                                </Text>
                                <Text
                                    style={[
                                        s.rmTeam,
                                        { color: redColor, marginTop: 4 },
                                        redWins && { textShadowColor: 'rgba(252, 211, 77, 0.6)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }
                                    ]}
                                    numberOfLines={2}
                                >
                                    {m.teamRed.join(', ')}
                                </Text>
                            </Pressable>
                        );
                    })}

                    {/* ═══ LOG MATCH (VEGAS STYLE) ═══ */}
                    {/* Reusing existing 'logOpen' state but restyling completely */}
                    <View style={s.vegasContainer}>
                        <View style={s.vegasHeader}>
                            <Text style={s.vegasTitle}>🎰 LOG LIVE MATCH</Text>
                            <Text style={s.vegasSub}>PASSWORD PROTECTED</Text>
                        </View>

                        <Pressable
                            style={s.vegasBtn}
                            onPress={() => {
                                if (showLogPassword) {
                                    setShowLogPassword(false);
                                    setLogOpen(false);
                                } else {
                                    setLogOpen(true);
                                    if (!logOpen) {
                                        // Reset reuse mode when opening fresh (unless set by Add Match)
                                        // Actually difficult to differentiate 'fresh' vs 'add match' here unless state is managed
                                        // If reuseMode is true, keep it?
                                        // But if user closes panel, we should reset.
                                        // Let's reset on Close.
                                    }
                                }
                            }}
                        >
                            <Text style={s.vegasBtnText}>{logOpen ? 'CLOSE PANEL' : '🔓 UNLOCK & LOG SCORE'}</Text>
                        </Pressable>

                        {logOpen && !showLogPassword && (
                            <View style={s.pinPad}>
                                <Text style={s.pinTitle}>ENTER ADMIN PIN</Text>
                                <TextInput
                                    style={s.pinInput}
                                    value={logPassword}
                                    onChangeText={(t) => {
                                        setLogPassword(t);
                                        if (t === '1234') { setShowLogPassword(true); }
                                    }}
                                    placeholder="----"
                                    placeholderTextColor="#64748b"
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    secureTextEntry
                                />
                            </View>
                        )}

                        {showLogPassword && (
                            <View style={s.missionControl}>
                                <Text style={s.mcTitle}>{reuseMode ? 'LOG PAST MATCH' : 'MISSION CONTROL ACTIVE'}</Text>

                                {reuseMode ? (
                                    <View style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>BLUE TEAM</Text>
                                                <Text style={{ color: '#fff', fontSize: 10 }}>{draftBlue.join(', ')}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>RED TEAM</Text>
                                                <Text style={{ color: '#fff', fontSize: 10 }}>{draftRed.join(', ')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Text style={s.mcLabel}>ACTIVE MATCH</Text>
                                        {logText ? <Text style={s.activeMatchText}>{logText}</Text> : null}
                                    </>
                                )}

                                <View style={s.scoreRow}>
                                    <View>
                                        <Text style={[s.scoreLbl, { color: '#3b82f6' }]}>BLUE</Text>
                                        <TextInput
                                            style={s.mcInput}
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            placeholderTextColor="#555"
                                            value={manualBlue}
                                            onChangeText={setManualBlue}
                                        />
                                    </View>
                                    <Text style={s.mcVs}>VS</Text>
                                    <View>
                                        <Text style={[s.scoreLbl, { color: '#ef4444' }]}>RED</Text>
                                        <TextInput
                                            style={s.mcInput}
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            placeholderTextColor="#555"
                                            value={manualRed}
                                            onChangeText={setManualRed}
                                        />
                                    </View>
                                </View>

                                <TextInput
                                    style={s.mcComments}
                                    placeholder="Match comments..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                    value={manualComments}
                                    onChangeText={setManualComments}
                                />

                                <Pressable
                                    style={s.mcFinishBtn}
                                    onPress={async () => {
                                        const b = parseInt(manualBlue || '0');
                                        const r = parseInt(manualRed || '0');
                                        const c = manualComments || '';

                                        if (reuseMode) {
                                            // LOG NEW COMPLETED MATCH
                                            const { createCompletedMatch } = await import('../../lib/matches');

                                            // Need Player objects for DB insert?
                                            // createCompletedMatch takes any[] for teams (for now) but ideally structured
                                            // match.ts createCompletedMatch expects any[] (JSON)
                                            // We have string[] in draftBlue/Red. map to objects {name: "..."}
                                            const blueObjs = draftBlue.map(n => ({ name: n }));
                                            const redObjs = draftRed.map(n => ({ name: n }));

                                            const success = await createCompletedMatch(
                                                new Date().toISOString(),
                                                'Turf', // Default venue? Or grab from previous match? We don't have it easily here unless stored.
                                                new Date().toLocaleTimeString(),
                                                '5v5',
                                                redObjs,
                                                blueObjs,
                                                r,
                                                b,
                                                c,
                                                'admin'
                                            );

                                            if (success) {
                                                Alert.alert('SUCCESS', 'Historical Match Logged!');
                                                setManualBlue(''); setManualRed(''); setManualComments('');
                                                setLogPassword(''); setShowLogPassword(false); setLogOpen(false);
                                                setReuseMode(false);
                                                loadSupabaseHistory(); // Refresh to show new match
                                            } else {
                                                Alert.alert('Error', 'Failed to log match.');
                                            }

                                        } else {
                                            // FINISH ACTIVE MATCH
                                            if (!logMatchId) { Alert.alert('Error', 'No active match found to log.'); return; }

                                            const { finishMatch, startNewMatch } = await import('../../lib/matches');

                                            // 1. Finish Current Match
                                            const success = await finishMatch(logMatchId, r, b, c);
                                            if (success) {
                                                // 2. Auto-Start Next Match (Reset Lobby)
                                                await startNewMatch();

                                                Alert.alert('SUCCESS', 'Match Logged! Lobby has been reset for the next game.');

                                                // Reset fields & Close Panel
                                                setManualBlue('');
                                                setManualRed('');
                                                setManualComments('');
                                                setLogPassword('');
                                                setShowLogPassword(false);
                                                setLogOpen(false);

                                                fetchActiveLoggingMatch();
                                                loadSupabaseHistory();
                                            } else {
                                                Alert.alert('Error', 'Failed to log match.');
                                            }
                                        }
                                    }}
                                >
                                    <Text style={s.mcFinishText}>{reuseMode ? '💾 LOG MATCH & SAVE' : '🚀 FINISH & START NEW'}</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {/* ═══ RECENT SUPABASE LOGS (REMOVED - MERGED ABOVE) ═══ */}
                    {/* The Supabase logs are now part of the main history and appear in "RECENT MATCHES" section */}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ═══════════ STYLES ═══════════
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scroll: { padding: 16 },

    // Kaarthumbi
    kaartSection: { marginBottom: 20 },
    kaartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    kaartEmoji: { fontSize: 28, marginRight: 8 },
    kaartTitle: { color: '#4ade80', fontWeight: '900', fontSize: 18, letterSpacing: 1, fontStyle: 'italic' },
    kaartSub: { color: '#94a3b8', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 6 },
    kaartInput: { backgroundColor: '#fff', borderRadius: 6, padding: 12, color: '#0f172a', fontSize: 14, marginBottom: 8 },
    askBtn: { backgroundColor: '#F97316', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' },
    askBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

    // Chat bubbles
    chatContainer: { marginTop: 16 },
    chatRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    chatRowLeft: { justifyContent: 'flex-start' },
    chatRowRight: { justifyContent: 'flex-end' },
    chatAvatar: { fontSize: 22, marginHorizontal: 4, marginTop: 4 },
    chatBubble: { maxWidth: SCREEN_W * 0.72, borderRadius: 12, padding: 12 },
    chatName: { color: '#fff', fontWeight: '900', fontSize: 10, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
    chatText: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 19 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, padding: 12, borderTopWidth: 2, borderTopColor: '#334155' },
    statLabel: { color: '#F97316', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
    statValue: { color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 2 },

    // Highlight cards
    highlightRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    highlightCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, padding: 10, borderBottomWidth: 3, alignItems: 'center' },
    hlValue: { color: '#fff', fontWeight: '900', fontSize: 22 },
    hlLabel: { color: '#94a3b8', fontWeight: '900', fontSize: 9, letterSpacing: 1, marginTop: 2 },
    hlSub: { color: '#F97316', fontWeight: '700', fontSize: 9, marginTop: 4, textAlign: 'center' },

    // Section title
    sectionTitle: { color: '#F97316', fontWeight: '900', fontSize: 14, letterSpacing: 1, marginBottom: 12 },

    // Leaderboard cards
    lbCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 6, borderLeftWidth: 4 },
    lbRank: { fontWeight: '900', fontSize: 16, width: 36, textAlign: 'center' },
    lbInfo: { flex: 1, marginLeft: 4 },
    lbName: { color: '#fff', fontWeight: '900', fontSize: 14 },
    lbStats: { color: '#94a3b8', fontWeight: '600', fontSize: 11, marginTop: 1 },
    lbRight: { alignItems: 'flex-end' },
    lbForm: { fontSize: 12, marginBottom: 2 },
    lbPct: { fontWeight: '900', fontSize: 14 },

    // Recent matches
    rmCard: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 4 },
    rmDate: { color: '#64748b', fontWeight: '600', fontSize: 10, marginBottom: 4 },
    rmScoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rmScore: { fontWeight: '900', fontSize: 20 },
    rmDash: { color: '#64748b', fontWeight: '700', fontSize: 16, marginHorizontal: 4 },
    rmTeam: { color: '#e2e8f0', fontSize: 11, fontWeight: '600', lineHeight: 16, marginBottom: 2 },
    rmWinTeam: { color: '#4ade80', fontWeight: '800' },

    // Log match
    logToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 6, padding: 14, marginTop: 20 },
    logToggleIcon: { color: '#94a3b8', fontSize: 10, marginRight: 8 },
    logToggleText: { color: '#e2e8f0', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    logBody: { backgroundColor: '#1e293b', borderRadius: 8, padding: 14, marginTop: 4 },
    logHint: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8 },
    logTextArea: { backgroundColor: '#fff', borderRadius: 6, padding: 12, color: '#0f172a', fontSize: 13, minHeight: 180, textAlignVertical: 'top', marginBottom: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    parseBtn: { backgroundColor: '#F97316', borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
    parseBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

    // Preview
    previewBox: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#334155' },
    previewTitle: { color: '#F97316', fontWeight: '900', fontSize: 12, letterSpacing: 1, marginBottom: 6 },
    previewLine: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 2 },
    previewScore: { color: '#fff', fontWeight: '900', fontSize: 18, marginVertical: 4 },
    previewTeam: { fontSize: 11, fontWeight: '700', lineHeight: 16 },

    // Save
    saveSection: { marginTop: 12, alignItems: 'center' },
    saveLabel: { color: '#F97316', fontWeight: '900', fontSize: 11, letterSpacing: 1, marginBottom: 8 },
    passInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: 12, color: '#fff', fontSize: 16, width: 160, textAlign: 'center', letterSpacing: 6, fontWeight: '900', marginBottom: 8 },
    saveBtn: { backgroundColor: '#4ade80', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32 },
    saveBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 30, fontSize: 13 },

    // VEGAS LOGGING STYLES
    vegasContainer: { marginTop: 40, padding: 2, borderRadius: 16, backgroundColor: '#F59E0B' }, // Gold border
    vegasHeader: { backgroundColor: '#78350f', padding: 12, borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center' },
    vegasTitle: { color: '#FCD34D', fontWeight: '900', fontSize: 16, letterSpacing: 2 },
    vegasSub: { color: '#FDE68A', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

    vegasBtn: { backgroundColor: '#fff', padding: 16, alignItems: 'center', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
    vegasBtnText: { color: '#B45309', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

    pinPad: { backgroundColor: '#1e293b', padding: 24, alignItems: 'center' },
    pinTitle: { color: '#94a3b8', fontWeight: 'bold', marginBottom: 12, letterSpacing: 1, fontSize: 11 },
    pinInput: { backgroundColor: '#0f172a', width: 140, height: 50, borderRadius: 8, color: '#fff', fontWeight: '900', fontSize: 24, textAlign: 'center', letterSpacing: 8, borderWidth: 1, borderColor: '#334155' },

    missionControl: { backgroundColor: '#0f172a', padding: 20 },
    mcTitle: { color: '#10B981', textAlign: 'center', fontWeight: '900', letterSpacing: 1, marginBottom: 20 },
    mcLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    syncBtn: { backgroundColor: '#334155', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
    syncText: { color: '#e2e8f0', fontWeight: 'bold', fontSize: 11 },
    activeMatchText: { color: '#F97316', textAlign: 'center', fontWeight: 'bold', marginBottom: 16, fontSize: 12 },

    scoreRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 16 },
    scoreLbl: { fontWeight: '900', fontSize: 10, marginBottom: 4, textAlign: 'center' },
    mcInput: { backgroundColor: '#1e293b', width: 60, height: 50, borderRadius: 8, color: '#fff', fontWeight: '900', fontSize: 24, textAlign: 'center', borderWidth: 1, borderColor: '#334155' },
    mcVs: { color: '#64748b', fontWeight: '900' },

    mcComments: { backgroundColor: '#1e293b', height: 80, borderRadius: 8, padding: 12, color: '#fff', textAlignVertical: 'top', marginBottom: 16 },
    mcFinishBtn: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 8 },
    mcFinishText: { color: '#78350f', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

    // RECENT LOGS
    historyCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
    histHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    histDate: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
    histBadge: { backgroundColor: '#064e3b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    histBadgeText: { color: '#34d399', fontSize: 9, fontWeight: 'bold' },
    histScore: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
    histTeam: { fontSize: 12, fontWeight: '900' },
    histNum: { color: '#fff', fontSize: 18, fontWeight: '900' },
    histComm: { color: '#cbd5e1', fontSize: 12, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8, marginTop: 4 },
});
