import { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Pressable, Dimensions, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useSquad } from '../../lib/squadContext';
import { FORMATION_PRESETS, ScoredPlayer } from '../../lib/squadEngine';
import { generateCommentary, CommentaryResult } from '../../lib/commentary';
import { useFocusEffect } from 'expo-router';
import { getLatestMatch } from '../../lib/matches';

const { width: SCREEN_W } = Dimensions.get('window');
const PITCH_W = SCREEN_W - 32;
const PITCH_H = PITCH_W * 1.45; // Portrait pitch like the Streamlit mplsoccer version

export default function TacticalBoard() {
    const { matchSquad, setMatchSquad, matchSettings, setMatchSettings } = useSquad();
    const [commentary, setCommentary] = useState<CommentaryResult | null>(null);
    const [simulating, setSimulating] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const refresh = async () => {
                const latest = await getLatestMatch();
                if (latest && (latest.status === 'draft' || latest.status === 'locked' || latest.status === 'live')) {
                    // Update context with latest squad
                    // BUT: backend stores it as JSON strings in red_team/blue_team
                    // We need to parse it.
                    // Actually `getLatestMatch` returns raw DB rows.
                    // The `MatchRecord` in `lib/matches.ts` says `red_team: Player[]`.
                    // But Supabase returns JSON. We might need to cast/parse if `matches.ts` handles it?
                    // Let's assume `getLatestMatch` type matches DB.
                    // Wait, `index.tsx` parses it: `JSON.parse(data.red_team)`.
                    // `getLatestMatch` in `matches.ts` just returns `data`. 
                    // So we must parse here.
                    try {
                        let r = latest.red_team;
                        let b = latest.blue_team;
                        if (typeof r === 'string') r = JSON.parse(r) as any;
                        if (typeof b === 'string') b = JSON.parse(b) as any;

                        // Map to ScoredPlayer to satisfy type
                        const redSquad = (Array.isArray(r) ? r : []).map(p => ({ ...p, team: 'Red', ovr: 0, sortOvr: 0 } as ScoredPlayer));
                        const blueSquad = (Array.isArray(b) ? b : []).map(p => ({ ...p, team: 'Blue', ovr: 0, sortOvr: 0 } as ScoredPlayer));

                        const squad = [...redSquad, ...blueSquad];
                        setMatchSquad(squad);
                        // Also update settings if needed (venue, time)
                        setMatchSettings({
                            ...matchSettings,
                            venue: latest.venue,
                            kickoff: latest.kickoff,
                            format: latest.format || '9 vs 9',
                            matchDate: new Date(latest.date) // Ensure Date object
                        });
                    } catch (e) { console.error('Error parsing tactical squad', e); }
                }
            };
            refresh();
        }, [])
    );

    const format = matchSettings.format;
    const redTeam = matchSquad.filter(p => p.team === 'Red');
    const blueTeam = matchSquad.filter(p => p.team === 'Blue');
    const hasSquad = matchSquad.length > 0;

    // Get preset — exactly matching backend.py
    const formatKey = format in FORMATION_PRESETS ? format : '9 vs 9';
    const preset = FORMATION_PRESETS[formatKey];
    const limit = preset.limit;

    // Starters = first `limit` players, subs = rest
    // backend.py just assigns players to coords in order, no position-based logic
    const redStarters = redTeam.slice(0, limit);
    const redSubs = redTeam.slice(limit);
    const blueStarters = blueTeam.slice(0, limit);
    const blueSubs = blueTeam.slice(limit);

    // Scale backend.py coords (0-100) to pitch pixel position
    // backend.py uses (x, y) where x=vertical (0=top, 100=bottom), y=horizontal (0=left, 100=right)
    const scaleX = (val: number) => (val / 100) * PITCH_H;
    const scaleY = (val: number) => (val / 100) * PITCH_W;

    // Assign each starter to their coordinate in order — exactly like backend.py
    const redPositioned = redStarters.map((player, i) => ({
        player,
        top: scaleX(preset.RED_COORDS[i]?.[0] ?? 50),
        left: scaleY(preset.RED_COORDS[i]?.[1] ?? 50),
    }));
    const bluePositioned = blueStarters.map((player, i) => ({
        player,
        top: scaleX(preset.BLUE_COORDS[i]?.[0] ?? 50),
        left: scaleY(preset.BLUE_COORDS[i]?.[1] ?? 50),
    }));

    // Date formatting
    const formatDateHeader = () => {
        const d = matchSettings.matchDate;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} (${days[d.getDay()]})`;
    };
    const displayVenue = matchSettings.venue === 'Other' ? 'Ground' : matchSettings.venue;

    // Calculate team OVR average
    const teamOvr = (team: ScoredPlayer[]) => {
        if (team.length === 0) return 0;
        return Math.round(team.reduce((sum, p) => sum + p.ovr, 0) / team.length);
    };

    // Copy team list
    const handleCopy = async () => {
        const blueList = blueTeam.map(p => p.name).join('\n');
        const redList = redTeam.map(p => p.name).join('\n');
        const text = `🔵 *BLUE TEAM*\n${blueList}\n\n🔴 *RED TEAM*\n${redList}`;
        await Clipboard.setStringAsync(text);
        Alert.alert('✅ Copied!', 'Team list copied to clipboard.');
    };

    // Simulate match
    const handleSimulate = () => {
        if (!hasSquad) { Alert.alert('Generate squad first!'); return; }
        setSimulating(true);
        setTimeout(() => {
            const result = generateCommentary(redTeam, blueTeam);
            setCommentary(result);
            setSimulating(false);
        }, 800);
    };

    return (
        <SafeAreaView style={st.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
                {!hasSquad ? (
                    <View style={st.emptyState}>
                        <Text style={st.emptyIcon}>⚽</Text>
                        <Text style={st.emptyTitle}>NO SQUAD GENERATED</Text>
                        <Text style={st.emptySub}>Go to Match Lobby and generate a squad first</Text>
                    </View>
                ) : (
                    <>
                        {/* ═══ MATCH DAY HEADER ═══ */}
                        <View style={st.matchDayHeader}>
                            <Text style={st.matchDayTitle}>SMFC MATCH DAY</Text>
                            <Text style={st.matchDayInfo}>
                                {formatDateHeader()} ({displayVenue}) | {matchSettings.kickoff}
                            </Text>
                        </View>

                        {/* ═══ PITCH ═══ */}
                        <View style={[st.pitch, { width: PITCH_W, height: PITCH_H }]}>
                            {/* Pitch markings */}
                            <View style={[st.halfLine, { top: PITCH_H / 2 - 1 }]} />
                            <View style={[st.centerCircle, { left: PITCH_W / 2 - 40, top: PITCH_H / 2 - 40 }]} />
                            <View style={[st.centerDot, { left: PITCH_W / 2 - 3, top: PITCH_H / 2 - 3 }]} />
                            {/* Penalty boxes */}
                            <View style={[st.penaltyBox, { top: 0, left: PITCH_W * 0.15, width: PITCH_W * 0.7, height: PITCH_H * 0.12 }]} />
                            <View style={[st.penaltyBox, { bottom: 0, left: PITCH_W * 0.15, width: PITCH_W * 0.7, height: PITCH_H * 0.12 }]} />
                            {/* Goal boxes */}
                            <View style={[st.goalBox, { top: 0, left: PITCH_W * 0.3, width: PITCH_W * 0.4, height: PITCH_H * 0.05 }]} />
                            <View style={[st.goalBox, { bottom: 0, left: PITCH_W * 0.3, width: PITCH_W * 0.4, height: PITCH_H * 0.05 }]} />
                            {/* Goals */}
                            <View style={[st.goal, { top: -3, left: PITCH_W * 0.38, width: PITCH_W * 0.24 }]} />
                            <View style={[st.goal, { bottom: -3, left: PITCH_W * 0.38, width: PITCH_W * 0.24 }]} />
                            {/* Penalty dots */}
                            <View style={[st.penDot, { top: PITCH_H * 0.08, left: PITCH_W / 2 - 3 }]} />
                            <View style={[st.penDot, { bottom: PITCH_H * 0.08, left: PITCH_W / 2 - 3 }]} />

                            {/* Red team players */}
                            {redPositioned.map(({ player, top, left }, i) => (
                                <View key={`r_${i}`} style={[st.marker, { top: top - 18, left: left - 22 }]}>
                                    <View style={[st.hexagon, st.hexRed]}>
                                        <Text style={st.hexText}>⬡</Text>
                                    </View>
                                    <View style={st.nameTag}>
                                        <Text style={st.nameText}>{player.name}</Text>
                                    </View>
                                </View>
                            ))}

                            {/* Blue team players */}
                            {bluePositioned.map(({ player, top, left }, i) => (
                                <View key={`b_${i}`} style={[st.marker, { top: top - 18, left: left - 22 }]}>
                                    <View style={[st.hexagon, st.hexBlue]}>
                                        <Text style={st.hexText}>⬡</Text>
                                    </View>
                                    <View style={st.nameTag}>
                                        <Text style={st.nameText}>{player.name}</Text>
                                    </View>
                                </View>
                            ))}

                            {/* SUBSTITUTES label at bottom of pitch */}
                            <View style={st.subsOnPitch}>
                                <Text style={st.subsOnPitchLabel}>SUBSTITUTES</Text>
                                <View style={st.subsOnPitchRow}>
                                    <View style={st.subsOnPitchTeam}>
                                        <Text style={st.subsOnPitchHead}>RED SQUAD</Text>
                                        {redSubs.map((p, i) => <Text key={i} style={[st.subsOnPitchName, { color: '#ff4b4b' }]}>{p.name}</Text>)}
                                        {redSubs.length === 0 && <Text style={st.subsNone}>—</Text>}
                                    </View>
                                    <View style={st.subsOnPitchTeam}>
                                        <Text style={st.subsOnPitchHead}>BLUE SQUAD</Text>
                                        {blueSubs.map((p, i) => <Text key={i} style={[st.subsOnPitchName, { color: '#1c83e1' }]}>{p.name}</Text>)}
                                        {blueSubs.length === 0 && <Text style={st.subsNone}>—</Text>}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* ═══ SUBSTITUTES SECTION ═══ */}
                        <View style={st.subsSection}>
                            <Text style={st.subsTitle}>SUBSTITUTES</Text>
                            <View style={st.subsColumns}>
                                <View style={st.subsCol}>
                                    <Text style={[st.subsColTitle, { color: '#ff4b4b' }]}>🔴 RED SUBS</Text>
                                    {redSubs.map((p, i) => <Text key={i} style={st.subsPlayer}>• {p.name}</Text>)}
                                    {redSubs.length === 0 && <Text style={st.noSubs}>None</Text>}
                                </View>
                                <View style={st.subsCol}>
                                    <Text style={[st.subsColTitle, { color: '#1c83e1' }]}>🔵 BLUE SUBS</Text>
                                    {blueSubs.map((p, i) => <Text key={i} style={st.subsPlayer}>• {p.name}</Text>)}
                                    {blueSubs.length === 0 && <Text style={st.noSubs}>None</Text>}
                                </View>
                            </View>
                        </View>

                        {/* ═══ TEAM LISTS ═══ */}
                        <View style={st.teamListWrap}>
                            <View style={st.teamListHeaders}>
                                <Text style={[st.teamListTitle, { color: '#ff4b4b' }]}>RED ({teamOvr(redTeam)})</Text>
                                <Text style={[st.teamListTitle, { color: '#1c83e1' }]}>BLUE ({teamOvr(blueTeam)})</Text>
                            </View>
                            <View style={st.teamListCols}>
                                <View style={st.teamListCol}>
                                    {redTeam.map((p, i) => (
                                        <View key={i} style={[st.teamCard, { borderLeftColor: '#ff4b4b' }]}>
                                            <Text style={st.teamCardName}>{p.name}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={st.teamListCol}>
                                    {blueTeam.map((p, i) => (
                                        <View key={i} style={[st.teamCard, { borderLeftColor: '#1c83e1' }]}>
                                            <Text style={st.teamCardName}>{p.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* ═══ COPY TEAM LIST ═══ */}
                        <Pressable style={st.copyBtn} onPress={handleCopy}>
                            <Text style={st.copyBtnText}>📋 COPY TEAM LIST</Text>
                        </Pressable>

                        {/* ═══ SIMULATE MATCH SCENARIO ═══ */}
                        <Pressable
                            style={[st.simBtn, simulating && { opacity: 0.6 }]}
                            onPress={handleSimulate}
                            disabled={simulating}
                        >
                            <Text style={st.simBtnText}>
                                {simulating ? '⏳ SIMULATING...' : '🔮 SIMULATE MATCH SCENARIO'}
                            </Text>
                        </Pressable>

                        {/* ═══ COMMENTARY ═══ */}
                        {commentary && (
                            <View style={st.commentaryWrap}>
                                <Text style={st.commentaryTitle}>🎙️ MATCH COMMENTARY</Text>
                                {commentary.events.map((event, i) => (
                                    <View key={i} style={st.commentaryEvent}>
                                        <Text style={st.commentaryMin}>{event.minute}:</Text>
                                        <Text style={st.commentaryText}>{event.text}</Text>
                                    </View>
                                ))}
                                <View style={st.finalScoreWrap}>
                                    <Text style={st.finalScoreText}>
                                        FINAL: Blue {commentary.finalScore.blue} - {commentary.finalScore.red} Red
                                    </Text>
                                    <Text style={[st.finalWinner, {
                                        color: commentary.winner === 'Blue' ? '#1c83e1' : commentary.winner === 'Red' ? '#ff4b4b' : '#F97316'
                                    }]}>
                                        {commentary.winner === 'Draw' ? 'DRAW!' : `${commentary.winner.toUpperCase()} WINS!`}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { padding: 16 },

    // Empty
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { color: '#F97316', fontWeight: '900', fontSize: 18, letterSpacing: 2, marginBottom: 4 },
    emptySub: { color: '#94a3b8', fontSize: 13 },

    // Header
    matchDayHeader: { alignItems: 'center', marginBottom: 12 },
    matchDayTitle: { color: '#F97316', fontWeight: '900', fontSize: 22, letterSpacing: 2 },
    matchDayInfo: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2 },

    // Pitch
    pitch: {
        backgroundColor: '#43a047',
        borderRadius: 4,
        borderWidth: 3,
        borderColor: '#fff',
        position: 'relative',
        overflow: 'visible',
    },
    halfLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
    centerCircle: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    centerDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
    penaltyBox: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
    goalBox: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    goal: { position: 'absolute', height: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2 },
    penDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },

    // Player markers
    marker: { position: 'absolute', alignItems: 'center', width: 44, zIndex: 10 },
    hexagon: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    hexRed: { backgroundColor: '#ff4b4b' },
    hexBlue: { backgroundColor: '#1c83e1' },
    hexText: { color: '#fff', fontSize: 8, fontWeight: '900' },
    nameTag: { backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
    nameText: { color: '#fff', fontSize: 8, fontWeight: '900', textAlign: 'center' },

    // Subs on pitch
    subsOnPitch: { position: 'absolute', bottom: 4, left: 0, right: 0, alignItems: 'center' },
    subsOnPitchLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '900', fontSize: 10, letterSpacing: 2, marginBottom: 2 },
    subsOnPitchRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 12 },
    subsOnPitchTeam: { alignItems: 'center' },
    subsOnPitchHead: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 7, letterSpacing: 1, marginBottom: 1 },
    subsOnPitchName: { fontWeight: '900', fontSize: 9 },
    subsNone: { color: 'rgba(255,255,255,0.4)', fontSize: 8 },

    // Subs section
    subsSection: { marginTop: 16, backgroundColor: '#1e293b', borderRadius: 8, padding: 12 },
    subsTitle: { color: '#F97316', fontWeight: '900', fontSize: 14, letterSpacing: 1, marginBottom: 8 },
    subsColumns: { flexDirection: 'row', gap: 12 },
    subsCol: { flex: 1 },
    subsColTitle: { fontWeight: '900', fontSize: 12, marginBottom: 4 },
    subsPlayer: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginBottom: 2 },
    noSubs: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },

    // Team lists
    teamListWrap: { marginTop: 16 },
    teamListHeaders: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    teamListTitle: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    teamListCols: { flexDirection: 'row', gap: 8 },
    teamListCol: { flex: 1 },
    teamCard: { backgroundColor: '#1a1f26', borderLeftWidth: 3, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4, borderRadius: 4 },
    teamCardName: { color: '#e2e8f0', fontWeight: '700', fontSize: 13 },

    // Buttons
    copyBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    copyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
    simBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
    simBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

    // Commentary
    commentaryWrap: { backgroundColor: '#1e293b', borderRadius: 8, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#F97316' },
    commentaryTitle: { color: '#F97316', fontWeight: '900', fontSize: 16, letterSpacing: 1, marginBottom: 12 },
    commentaryEvent: { marginBottom: 14 },
    commentaryMin: { color: '#F97316', fontWeight: '900', fontSize: 13, marginBottom: 2 },
    commentaryText: { color: '#e2e8f0', fontSize: 13, fontWeight: '500', lineHeight: 20, fontStyle: 'italic' },
    finalScoreWrap: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, marginTop: 8, alignItems: 'center' },
    finalScoreText: { color: '#e2e8f0', fontWeight: '900', fontSize: 16 },
    finalWinner: { fontWeight: '900', fontSize: 20, letterSpacing: 2, marginTop: 4 },
});
