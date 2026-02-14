import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { MatchRecord } from '../../lib/matches';
import { getLastMatchTopScorers, generateLeaderboard, calculatePredictionPoints, FantasyPlayer, PredictionRecord } from '../../lib/fantasy';
import { useFocusEffect } from 'expo-router';
import { useIdentity } from '../../lib/identity';

export default function FantasyLeague() {
    const { playerName } = useIdentity();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaderboard, setLeaderboard] = useState<FantasyPlayer[]>([]);
    const [matchesList, setMatchesList] = useState<MatchRecord[]>([]);
    const [predictionsList, setPredictionsList] = useState<PredictionRecord[]>([]);

    // Stats for header
    const [totalMatches, setTotalMatches] = useState(0);
    const [lastMatchStats, setLastMatchStats] = useState<{ players: string[], topScore: number } | null>(null);

    const fetchData = async () => {
        try {
            // 1. Fetch completed matches
            const { data: matches, error: mError } = await supabase
                .from('matches')
                .select('*')
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            if (mError) throw mError;

            // 2. Fetch predictions for these matches
            // We need to fetch ALL predictions, but ideally only for completed matches.
            // For simplicity, we can fetch all and filter in JS, or if the list grows large, filter by match IDs.
            // Given the scale, fetching all predictions is fine for now.
            const { data: predictions, error: pError } = await supabase
                .from('predictions')
                .select('*');

            if (pError) throw pError;

            if (matches && predictions) {
                setMatchesList(matches as MatchRecord[]);
                setPredictionsList(predictions as PredictionRecord[]);
                setTotalMatches(matches.length);

                const data = generateLeaderboard(matches as MatchRecord[], predictions as PredictionRecord[]);
                setLeaderboard(data);

                const kings = getLastMatchTopScorers(matches as MatchRecord[], predictions as PredictionRecord[]);
                setLastMatchStats(kings ? { players: kings.players, topScore: kings.topScore } : null);
            }
        } catch (err) {
            console.error('Error fetching fantasy data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Helper to get user's points for a match history item
    const getUserHistory = () => {
        if (!playerName) return [];
        const normalize = (s: string) => s ? s.trim().toLowerCase() : '';
        const myName = normalize(playerName);

        return matchesList.map(m => {
            const pred = predictionsList.find(p =>
                p.match_id === m.id &&
                normalize(p.player_name) === myName
            );
            const pts = pred ? calculatePredictionPoints(pred, m) : null;
            return { match: m, pred, pts };
        });
    };

    const userHistory = getUserHistory();

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <SafeAreaView style={s.container}>
                <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 100 }} />
                <Text style={s.loadingText}>Loading League Data...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container} edges={['bottom']}>
            <ScrollView
                contentContainerStyle={s.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
            >
                {/* 🏆 HEADER SECTION */}
                <View style={s.header}>
                    <Text style={s.title}>FANTASY LEAGUE</Text>
                    <Text style={s.subtitle}>
                        Logged in as: "{playerName}" • PREDICT & WIN
                    </Text>

                    <View style={s.statsRow}>
                        <View style={s.statBox}>
                            <Text style={s.statValue}>{totalMatches}</Text>
                            <Text style={s.statLabel}>MATCHES</Text>
                        </View>

                        {/* LAST MATCH KINGS */}
                        <View style={[s.statBox, { flex: 2, borderColor: '#F97316', backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                            {lastMatchStats ? (
                                <>
                                    <Text style={[s.statValue, { fontSize: 16 }]} numberOfLines={1}>
                                        {lastMatchStats.players.join(', ')}
                                    </Text>
                                    <Text style={[s.statLabel, { color: '#F97316' }]}>
                                        👑 LAST MATCH KINGS ({lastMatchStats.topScore} PTS)
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={s.statValue}>-</Text>
                                    <Text style={s.statLabel}>LAST MATCH KING</Text>
                                </>
                            )}
                        </View>

                        <View style={s.statBox}>
                            <Text style={s.statValue}>{leaderboard.length}</Text>
                            <Text style={s.statLabel}>PLAYERS</Text>
                        </View>
                    </View>
                </View>

                {/* 🥇 LEADERBOARD */}
                <View style={s.boardContainer}>
                    <View style={s.tableHeader}>
                        <Text style={[s.th, { flex: 0.5, textAlign: 'center' }]}>#</Text>
                        <Text style={[s.th, { flex: 2 }]}>PLAYER</Text>
                        <Text style={[s.th, { flex: 0.8, textAlign: 'center' }]}>PTS</Text>
                        <Text style={[s.th, { flex: 0.8, textAlign: 'center' }]}>WIN</Text>
                        <Text style={[s.th, { flex: 0.8, textAlign: 'center' }]}>BL</Text>
                        <Text style={[s.th, { flex: 0.8, textAlign: 'center' }]}>RD</Text>
                        <Text style={[s.th, { flex: 0.8, textAlign: 'center' }]}>NO</Text>
                    </View>

                    {leaderboard.map((player, index) => {
                        const isTop3 = index < 3;
                        let rankColor = '#fff';
                        let rankIcon = null;

                        if (index === 0) { rankColor = '#FFD700'; rankIcon = '🥇'; }
                        else if (index === 1) { rankColor = '#C0C0C0'; rankIcon = '🥈'; }
                        else if (index === 2) { rankColor = '#CD7F32'; rankIcon = '🥉'; }

                        return (
                            <View key={player.name} style={[s.row, index % 2 === 1 && s.rowAlt, isTop3 && s.rowTop3]}>
                                <View style={{ flex: 0.5, alignItems: 'center' }}>
                                    <Text style={[s.rank, { color: rankColor }]}>{rankIcon || index + 1}</Text>
                                </View>
                                <View style={{ flex: 2 }}>
                                    <Text style={[s.name, isTop3 && { color: rankColor, fontWeight: '900' }]}>{player.name}</Text>
                                </View>
                                <Text style={[s.cell, s.points]}>{player.totalPoints}</Text>
                                <Text style={s.cell}>{player.winPoints}</Text>
                                <Text style={[s.cell, { color: '#3b82f6' }]}>{player.bluePoints}</Text>
                                <Text style={[s.cell, { color: '#ef4444' }]}>{player.redPoints}</Text>
                                <Text style={[s.cell, { color: '#94a3b8' }]}>{player.played}</Text>
                            </View>
                        );
                    })}

                    {leaderboard.length === 0 && (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ color: '#64748b', textAlign: 'center' }}>No completed matches yet.{'\n'}Start predicting to see rankings!</Text>
                        </View>
                    )}
                </View>

                {/* 📜 MATCH HISTORY (For Debugging & fun) */}
                {playerName && userHistory.length > 0 && (
                    <View style={s.historyContainer}>
                        <Text style={s.historyTitle}>YOUR MATCH HISTORY ({playerName})</Text>
                        {userHistory.map((item, idx) => (
                            <View key={item.match.id} style={[s.histRow, idx !== userHistory.length - 1 && s.histBorder]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.histDate}>{new Date(item.match.created_at).toLocaleDateString()}</Text>
                                    <Text style={s.histScore}>
                                        Result: <Text style={{ color: '#ef4444' }}>{item.match.score_red}</Text> - <Text style={{ color: '#3b82f6' }}>{item.match.score_blue}</Text>
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    {item.pred ? (
                                        <>
                                            <Text style={s.histPred}>
                                                You: <Text style={{ color: '#ef4444' }}>{item.pred.pred_goals_red}</Text> - <Text style={{ color: '#3b82f6' }}>{item.pred.pred_goals_blue}</Text>
                                            </Text>
                                            <View style={s.histBadge}>
                                                <Text style={s.histPoints}>{item.pts?.points || 0} PTS</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <Text style={s.histMissed}>Missed</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ℹ️ LEGEND */}
                <View style={s.legend}>
                    <Text style={s.legendTitle}>POINT SYSTEM</Text>
                    <View style={s.legendItem}>
                        <Text style={s.legendPoints}>+3 PTS</Text>
                        <Text style={s.legendDesc}>CORRECT WINNER / DRAW</Text>
                    </View>
                    <View style={s.legendItem}>
                        <Text style={s.legendPoints}>+2 PTS</Text>
                        <Text style={s.legendDesc}>PER CORRECT TEAM SCORE</Text>
                    </View>
                    <View style={s.legendItem}>
                        <Text style={[s.legendPoints, { color: '#FFD700' }]}>7 PTS</Text>
                        <Text style={[s.legendDesc, { color: '#FFD700' }]}>EXACT SCORE (MAX)</Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingText: { color: '#94a3b8', textAlign: 'center', marginTop: 16 },
    scrollContent: { padding: 16 },

    header: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '900', color: '#F97316', letterSpacing: 2, marginBottom: 4 },
    subtitle: { fontSize: 10, color: '#94a3b8', letterSpacing: 1, fontWeight: '700', marginBottom: 20 },

    statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
    statBox: { flex: 1, backgroundColor: '#1e293b', padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    statValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
    statLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', marginTop: 4 },

    boardContainer: { backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#334155', marginBottom: 24 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#334155', paddingVertical: 12, paddingHorizontal: 8 },
    th: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#2b3544' },
    rowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
    rowTop3: { backgroundColor: 'rgba(249, 115, 22, 0.05)' },

    rank: { fontWeight: '900', fontSize: 14 },
    name: { color: '#e2e8f0', fontWeight: '700', fontSize: 13 },
    played: { color: '#64748b', fontSize: 9, marginTop: 2 },
    cell: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', flex: 0.8, textAlign: 'center' },
    points: { color: '#F97316', fontWeight: '900', fontSize: 15 },

    legend: { backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#334155' },
    legendTitle: { color: '#64748b', fontSize: 10, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    legendPoints: { color: '#F97316', fontWeight: '900', fontSize: 14, width: 60 },
    legendDesc: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },

    historyContainer: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
    historyTitle: { color: '#F97316', fontSize: 12, fontWeight: '900', marginBottom: 16, letterSpacing: 1 },
    histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    histBorder: { borderBottomWidth: 1, borderBottomColor: '#334155' },
    histDate: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
    histScore: { color: '#e2e8f0', fontSize: 14, fontWeight: '900' },
    histPred: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 4 },
    histBadge: { backgroundColor: 'rgba(249, 115, 22, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    histPoints: { color: '#F97316', fontWeight: '900', fontSize: 12 },
    histMissed: { color: '#64748b', fontStyle: 'italic', fontSize: 11 },
});

