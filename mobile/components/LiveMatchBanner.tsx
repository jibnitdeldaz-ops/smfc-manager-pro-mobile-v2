import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord, MATCH_STATUS } from '../lib/matches';

interface LiveMatchBannerProps {
    activeMatch: MatchRecord;
    isAdmin: boolean;
    myPrediction: any;
    onLock: () => void;
    onUnlock: () => void;
    onPredict: () => void;
    onPredictionUpdate: () => void;
}

export default function LiveMatchBanner({
    activeMatch, isAdmin, myPrediction, onLock, onUnlock, onPredict, onPredictionUpdate
}: LiveMatchBannerProps) {

    // Simplified Status Logic
    const isLocked = activeMatch.status === MATCH_STATUS.LOCKED;
    const isLive = activeMatch.status === MATCH_STATUS.LIVE;

    // Explicit check for boolean to avoid NULL issues
    const predictionsOpen = activeMatch.allow_predictions === true;

    // Toggle 1: TEAM LOCK
    const teamLockedColor = isLocked ? '#ef4444' : '#22c55e';
    const teamLockedAlign = isLocked ? 'flex-end' : 'flex-start';

    // Toggle 2: PREDICTIONS
    const predOpenColor = predictionsOpen ? '#22c55e' : '#ef4444';
    const predOpenAlign = predictionsOpen ? 'flex-start' : 'flex-end'; // Open is LEFT

    const handleTogglePredictions = async () => {
        if (!isAdmin) return;
        const newVal = !predictionsOpen;
        const { togglePredictions } = await import('../lib/matches');
        const result = await togglePredictions(activeMatch.id, newVal);
        if (!result.success) {
            Alert.alert('Error', result.error || 'Failed to toggle predictions');
        }
    };

    return (
        <View>
            {/* 1. ADMIN / STATUS PANEL */}
            <View style={s.container}>
                {/* LIVE BADGE */}
                {isLive && (
                    <View style={s.liveBadge}>
                        <Text style={s.liveText}>🔴 LIVE MATCH IN PROGRESS</Text>
                    </View>
                )}

                {!isLive && (
                    <View style={s.controlPanel}>
                        {/* ROW 1: TEAM STATUS */}
                        <View style={s.row}>
                            <View style={s.labelCol}>
                                <Text style={s.rowLabel}>TEAM STATUS</Text>
                                <Text style={[s.statusText, { color: teamLockedColor }]}>
                                    {isLocked ? 'LOCKED 🔴' : 'OPEN 🟢'}
                                </Text>
                            </View>

                            {isAdmin && (
                                <Pressable
                                    style={[s.toggleTrack, { backgroundColor: teamLockedColor }]}
                                    onPress={isLocked ? onUnlock : onLock}
                                >
                                    <Animated.View style={[s.toggleHandle, { alignSelf: teamLockedAlign }]} />
                                </Pressable>
                            )}
                        </View>

                        <View style={s.divider} />

                        {/* ROW 2: PREDICTION STATUS */}
                        <View style={s.row}>
                            <View style={s.labelCol}>
                                <Text style={s.rowLabel}>PREDICTIONS</Text>
                                <Text style={[s.statusText, { color: predOpenColor }]}>
                                    {predictionsOpen ? 'OPEN 🟢' : 'CLOSED 🔴'}
                                </Text>
                            </View>

                            {isAdmin && (
                                <Pressable
                                    style={[s.toggleTrack, { backgroundColor: predOpenColor }]}
                                    onPress={handleTogglePredictions}
                                >
                                    <Animated.View style={[s.toggleHandle, { alignSelf: predOpenAlign }]} />
                                </Pressable>
                            )}
                        </View>
                    </View>
                )}
            </View>

            {/* RESET / NEW MATCH BUTTONS */}

            {/* Case B: Match is DRAFT -> Reset Teams (Only when NOT locked) */}
            {activeMatch.status === 'draft' && (
                <Pressable
                    style={s.resetBtn}
                    onPress={() => {
                        Alert.alert(
                            'Reset Teams?',
                            'This will clear the lineups for this match. Predictions and points will remain safe.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Yes, Reset Teams',
                                    style: 'destructive',
                                    onPress: async () => {
                                        const { resetDraftMatch } = await import('../lib/matches');
                                        const success = await resetDraftMatch(activeMatch.id);
                                        if (success) Alert.alert('Done', 'Teams have been reset.');
                                        else Alert.alert('Error', 'Failed to reset.');
                                    }
                                }
                            ]
                        );
                    }}
                >
                    <Text style={s.resetText}>⚠️ TEAM RESET</Text>
                </Pressable>
            )}

            {/* 2. PREDICTION CARD */}
            {(!isLive) && (
                <View style={s.predictionContainer}>
                    {/* CASE 1: PREDICTIONS OPEN */}
                    {predictionsOpen && (
                        <>
                            {myPrediction ? (
                                // CONFIRMED BET SLIP
                                <Pressable
                                    style={({ pressed }) => [s.betSlip, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                                    onPress={onPredict}
                                >
                                    <View style={s.betHeader}>
                                        <Text style={s.betTitle}>MY PREDICTION</Text>
                                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                    </View>

                                    <View style={s.betContent}>
                                        <Text style={[s.betOutcome, {
                                            color: myPrediction.prediction === 'red' ? '#ef4444' :
                                                myPrediction.prediction === 'blue' ? '#3b82f6' : '#64748b'
                                        }]}>
                                            {myPrediction.prediction === 'red' ? 'RED WIN' :
                                                myPrediction.prediction === 'blue' ? 'BLUE WIN' : 'DRAW'}
                                        </Text>
                                        <Text style={s.betScore}>
                                            {myPrediction.pred_goals_red} - {myPrediction.pred_goals_blue}
                                        </Text>
                                    </View>

                                    {/* RESET PREDICTION (If Open) */}
                                    <View style={s.betFooter}>
                                        <Pressable
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                            onPress={() => {
                                                Alert.alert(
                                                    'Reset Prediction?',
                                                    'Do you want to clear your prediction and start over?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Yes, Reset',
                                                            style: 'destructive',
                                                            onPress: async () => {
                                                                const { deletePredictionById } = await import('../lib/matches');
                                                                await deletePredictionById(myPrediction.id);
                                                                onPredictionUpdate();
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Text style={s.tapEdit}>TAP TO RESET / CHANGE</Text>
                                            <Ionicons name="refresh-circle" size={16} color="#94a3b8" />
                                        </Pressable>
                                    </View>
                                </Pressable>
                            ) : (
                                // SLOT MACHINE BUTTON
                                <PulseButton onPress={onPredict} />
                            )}
                        </>
                    )}

                    {/* CASE 2: PREDICTIONS CLOSED */}
                    {!predictionsOpen && (
                        <>
                            {myPrediction ? (
                                <View style={[s.betSlip, { opacity: 0.8 }]}>
                                    <View style={s.betHeader}>
                                        <Text style={s.betTitle}>LOCKED PREDICTION 🔒</Text>
                                    </View>

                                    <View style={s.betContent}>
                                        <Text style={[s.betOutcome, {
                                            color: myPrediction.prediction === 'red' ? '#ef4444' :
                                                myPrediction.prediction === 'blue' ? '#3b82f6' : '#64748b'
                                        }]}>
                                            {myPrediction.prediction === 'red' ? 'RED WIN' :
                                                myPrediction.prediction === 'blue' ? 'BLUE WIN' : 'DRAW'}
                                        </Text>
                                        <Text style={s.betScore}>
                                            {myPrediction.pred_goals_red} - {myPrediction.pred_goals_blue}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                !isAdmin && (
                                    <View style={s.closedBanner}>
                                        <Text style={s.closedText}>⚠️ PREDICTIONS CLOSED</Text>
                                    </View>
                                )
                            )}
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

// PULSE BUTTON COMPONENT
function PulseButton({ onPress }: { onPress: () => void }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Pressable onPress={onPress}>
            <Animated.View style={[s.slotMachineBtn, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={s.slotMachineText}>🎰 PREDICT RESULT</Text>
                <Text style={s.slotMachineSub}>TAP TO WIN</Text>
            </Animated.View>
        </Pressable>
    );
}

const s = StyleSheet.create({
    container: {
        marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 16,
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    liveBadge: { backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 8, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
    liveText: { color: '#22c55e', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

    controlPanel: { gap: 0 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    divider: { height: 1, backgroundColor: '#1e293b', marginVertical: 4 },

    labelCol: { flex: 1 },
    rowLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    statusText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

    // Toggle Switch
    toggleTrack: {
        width: 50, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center'
    },
    toggleHandle: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2
    },

    // Member Static Bar
    memberBar: {
        width: 50, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center', opacity: 0.5
    },
    memberIndicator: {
        width: 24, height: 24, borderRadius: 12,
    },

    // RESET BUTTON
    resetBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        marginHorizontal: 16, marginBottom: 16,
        padding: 12, borderRadius: 12,
        alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)'
    },
    resetText: {
        color: '#ef4444', fontWeight: 'bold', fontSize: 12, letterSpacing: 1
    },

    // PREDICTION CONTAINER
    predictionContainer: { marginHorizontal: 16, marginBottom: 16 },

    // BET SLIP STYLE
    betSlip: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    betHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    betTitle: { fontSize: 12, color: '#64748b', fontWeight: '900', letterSpacing: 0.5 },

    betContent: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderStyle: 'dashed' },
    betOutcome: { fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    betScore: { fontSize: 32, fontWeight: '900', color: '#1e293b' },

    betFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 },
    tapEdit: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },

    // CLOSED BANNER
    closedBanner: { backgroundColor: '#334155', borderRadius: 12, padding: 16, alignItems: 'center' },
    closedText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12 },

    // PULSE BUTTON (SLOT MACHINE)
    slotMachineBtn: {
        backgroundColor: '#F59E0B',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FDE68A',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },
    slotMachineText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    slotMachineSub: { color: '#FEF3C7', fontSize: 11, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
});
