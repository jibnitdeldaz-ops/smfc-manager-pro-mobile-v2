import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useIdentity } from '../lib/identity';

interface PredictionModalProps {
    visible: boolean;
    onClose: () => void;
    matchId: string;
    onPredictionSuccess: () => void;
    initialPrediction: any;
}

export default function PredictionModal({ visible, onClose, matchId, onPredictionSuccess, initialPrediction }: PredictionModalProps) {
    const { playerName } = useIdentity();
    const [loading, setLoading] = useState(false);

    // Form State
    const [redGoals, setRedGoals] = useState('');
    const [blueGoals, setBlueGoals] = useState('');
    const [winner, setWinner] = useState<'red' | 'blue' | 'draw' | null>(null);

    // Pre-fill existing prediction
    useEffect(() => {
        if (initialPrediction) {
            setRedGoals(initialPrediction.pred_goals_red?.toString() || '');
            setBlueGoals(initialPrediction.pred_goals_blue?.toString() || '');
            // Winner will be auto-calculated by the next useEffect
        } else {
            // Reset if opening fresh
            setRedGoals('');
            setBlueGoals('');
        }
    }, [initialPrediction, visible]); // Re-run when modal opens

    // Auto-determine winner based on score
    useEffect(() => {
        if (redGoals === '' || blueGoals === '') {
            setWinner(null);
            return;
        }
        const r = parseInt(redGoals);
        const b = parseInt(blueGoals);
        if (isNaN(r) || isNaN(b)) {
            setWinner(null);
        } else if (r > b) {
            setWinner('red');
        } else if (b > r) {
            setWinner('blue');
        } else {
            setWinner('draw');
        }
    }, [redGoals, blueGoals]);

    const handleSubmit = async () => {
        if (redGoals === '' || blueGoals === '') {
            Alert.alert('Missing Info', 'Please enter goals for both teams.');
            return;
        }
        if (!winner) {
            // Should not happen if scores are entered, unless NaN
            Alert.alert('Invalid Score', 'Please enter valid numbers.');
            return;
        }

        setLoading(true);
        try {
            // Upsert prediction
            const { error } = await supabase.from('predictions').upsert({
                match_id: matchId,
                player_name: playerName,
                prediction: winner,
                pred_goals_red: parseInt(redGoals),
                pred_goals_blue: parseInt(blueGoals)
            }, { onConflict: 'match_id, player_name' });

            if (error) throw error;

            Alert.alert('Success', 'Prediction saved! Good luck! 🍀');
            onPredictionSuccess();
            onClose();
        } catch (err) {
            console.error('Prediction Error:', err);
            Alert.alert('Error', 'Could not save prediction.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.content}>
                    <View style={s.header}>
                        <Text style={s.title}>PREDICT MATCH</Text>
                        <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#94a3b8" /></Pressable>
                    </View>

                    {/* Winner visual feedback only - No interaction needed */}
                    <View style={s.winnerFeedback}>
                        <Text style={s.label}>PREDICT SCORE</Text>
                        {winner && (
                            <View style={[
                                s.badge,
                                winner === 'red' ? s.badgeRed : winner === 'blue' ? s.badgeBlue : s.badgeDraw
                            ]}>
                                <Text style={s.badgeText}>
                                    {winner === 'red' ? 'RED WINS' : winner === 'blue' ? 'BLUE WINS' : 'DRAW'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={s.scoreRow}>
                        <View style={s.scoreInputWrap}>
                            <Text style={s.teamLabelRed}>RED</Text>
                            <TextInput
                                style={[s.input, winner === 'red' && { borderColor: '#ef4444', borderWidth: 2 }]}
                                value={redGoals}
                                onChangeText={setRedGoals}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="0"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                        <Text style={s.vs}>-</Text>
                        <View style={s.scoreInputWrap}>
                            <Text style={s.teamLabelBlue}>BLUE</Text>
                            <TextInput
                                style={[s.input, winner === 'blue' && { borderColor: '#3b82f6', borderWidth: 2 }]}
                                value={blueGoals}
                                onChangeText={setBlueGoals}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="0"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                    </View>

                    <Pressable style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>SUBMIT PREDICTION</Text>}
                    </Pressable>

                    {/* NEW: Remove Prediction Button */}
                    {initialPrediction && (
                        <Pressable
                            style={s.removeBtn}
                            disabled={loading}
                            onPress={async () => {
                                if (!playerName) return;
                                setLoading(true);
                                const success = await import('../lib/matches').then(m => m.deletePredictionById(initialPrediction.id));
                                if (success) {
                                    onPredictionSuccess();
                                    onClose();
                                }
                                setLoading(false);
                            }}
                        >
                            <Text style={s.removeText}>REMOVE PREDICTION</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );

}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    content: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { color: '#F97316', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

    label: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 12, marginTop: 12 },

    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 32 },
    scoreInputWrap: { alignItems: 'center' },
    input: {
        backgroundColor: '#0f172a', width: 80, height: 80, borderRadius: 16,
        color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 1, borderColor: '#334155'
    },
    teamLabelRed: { color: '#ef4444', fontWeight: 'bold', marginBottom: 8 },
    teamLabelBlue: { color: '#3b82f6', fontWeight: 'bold', marginBottom: 8 },
    vs: { color: '#64748b', fontSize: 32, fontWeight: '300' },

    winnerFeedback: { alignItems: 'center', marginBottom: 24 },
    badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
    badgeRed: { backgroundColor: '#ef4444' },
    badgeBlue: { backgroundColor: '#3b82f6' },
    badgeDraw: { backgroundColor: '#64748b' },
    badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    submitBtn: { backgroundColor: '#F97316', padding: 16, borderRadius: 12, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

    removeBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
    removeText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }
});
