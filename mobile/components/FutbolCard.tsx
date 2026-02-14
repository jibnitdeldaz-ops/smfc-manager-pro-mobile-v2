import { useRef, useState, useCallback } from 'react';
import {
    Modal, View, Text, Pressable, StyleSheet, Dimensions, Platform, Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Player } from '../lib/sheets';
import { generateFunnyStats, FunnyStat } from '../lib/funnyStats';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW * 0.88;

/* Position-based card themes */
const POS_THEME: Record<string, { bg1: string; bg2: string; accent: string; label: string }> = {
    FWD: { bg1: '#7f1d1d', bg2: '#450a0a', accent: '#ef4444', label: 'FORWARD' },
    MID: { bg1: '#14532d', bg2: '#052e16', accent: '#22c55e', label: 'MIDFIELDER' },
    DEF: { bg1: '#1e3a5f', bg2: '#0c1929', accent: '#3b82f6', label: 'DEFENDER' },
};

interface Props {
    player: Player | null;
    visible: boolean;
    onClose: () => void;
}

export default function FutbolCard({ player, visible, onClose }: Props) {
    const shotRef = useRef<ViewShot>(null);
    const [stats, setStats] = useState<FunnyStat[]>([]);
    const [key, setKey] = useState(0); // force re-render on regenerate

    // Generate new stats whenever player changes or regenerate is pressed
    const regenerate = useCallback(() => {
        if (!player) return;
        setStats(generateFunnyStats(player.name));
        setKey(k => k + 1);
    }, [player]);

    // Generate on first open
    const handleShow = useCallback(() => {
        if (player) {
            setStats(generateFunnyStats(player.name));
            setKey(k => k + 1);
        }
    }, [player]);

    // Share card as image
    const handleShare = async () => {
        try {
            if (!shotRef.current?.capture) return;
            const uri = await shotRef.current.capture();
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    dialogTitle: `${player?.name}'s SMFC Futbol Card`,
                });
            } else {
                Alert.alert('Sharing not available on this device');
            }
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    if (!player) return null;

    const theme = POS_THEME[player.position] ?? POS_THEME.MID;
    const initials = player.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const ovr = Math.round(player.avg);
    const stars = '★'.repeat(Math.min(player.starRating, 5)) + '☆'.repeat(Math.max(0, 5 - player.starRating));

    /* Bar width for stat value (0-100) */
    const barWidth = (v: number) => `${Math.min(v, 99)}%`;
    const barColor = (v: number) =>
        v >= 90 ? '#22c55e' : v >= 70 ? '#facc15' : v >= 50 ? '#f97316' : '#ef4444';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={handleShow}>
            <Pressable style={s.overlay} onPress={onClose}>
                <Pressable style={s.modalContent} onPress={() => { }}>
                    {/* Capturable card area */}
                    <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={s.shotWrap}>
                        <View key={key} style={[s.card, { backgroundColor: theme.bg1 }]}>
                            {/* Top section */}
                            <View style={s.topSection}>
                                {/* OVR + Position */}
                                <View style={s.ovrWrap}>
                                    <Text style={[s.ovrNum, { color: theme.accent }]}>{ovr}</Text>
                                    <View style={[s.posBadge, { backgroundColor: theme.accent }]}>
                                        <Text style={s.posText}>{player.position}</Text>
                                    </View>
                                </View>

                                {/* Avatar */}
                                <View style={[s.avatar, { borderColor: theme.accent }]}>
                                    <Text style={s.avatarText}>{initials}</Text>
                                </View>

                                {/* Name + Stars */}
                                <View style={s.nameWrap}>
                                    <Text style={s.playerName}>{player.name.toUpperCase()}</Text>
                                    <Text style={s.stars}>{stars}</Text>
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={[s.divider, { backgroundColor: theme.accent }]} />

                            {/* Funny Stats */}
                            <View style={s.statsSection}>
                                {stats.map((st, i) => (
                                    <View key={`${key}-${i}`} style={s.statRow}>
                                        <Text style={s.statEmoji}>{st.emoji}</Text>
                                        <Text style={s.statLabel}>{st.label}</Text>
                                        <View style={s.barTrack}>
                                            <View style={[s.barFill, { width: barWidth(st.value) as any, backgroundColor: barColor(st.value) }]} />
                                        </View>
                                        <Text style={[s.statValue, { color: barColor(st.value) }]}>{st.value}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Footer */}
                            <View style={s.footer}>
                                <Text style={s.footerText}>⚽ SMFC MANAGER PRO</Text>
                            </View>
                        </View>
                    </ViewShot>

                    {/* Action buttons OUTSIDE the capture area */}
                    <View style={s.actions}>
                        <Pressable style={[s.actionBtn, { backgroundColor: '#334155' }]} onPress={regenerate}>
                            <Text style={s.actionText}>🔄 REGENERATE</Text>
                        </Pressable>
                        <Pressable style={[s.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleShare}>
                            <Text style={s.actionText}>📤 SHARE</Text>
                        </Pressable>
                    </View>

                    <Text style={s.closeHint}>TAP OUTSIDE TO CLOSE</Text>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalContent: { alignItems: 'center' },
    shotWrap: { borderRadius: 16, overflow: 'hidden' },

    card: {
        width: CARD_W, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 16,
        borderWidth: 2, borderColor: 'rgba(249,115,22,0.4)',
    },

    /* Top section — OVR, Avatar, Name */
    topSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    ovrWrap: { alignItems: 'center', marginRight: 12 },
    ovrNum: { fontSize: 44, fontWeight: '900', lineHeight: 48 },
    posBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
    posText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

    avatar: {
        width: 64, height: 64, borderRadius: 32, borderWidth: 3,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },

    nameWrap: { flex: 1 },
    playerName: {
        color: '#fff', fontSize: 18, fontWeight: '900',
        letterSpacing: 2, marginBottom: 2,
    },
    stars: { color: '#facc15', fontSize: 16, letterSpacing: 1 },

    /* Divider */
    divider: { height: 2, borderRadius: 1, marginBottom: 14, opacity: 0.4 },

    /* Stats */
    statsSection: { gap: 8 },
    statRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    statEmoji: { fontSize: 16, width: 22, textAlign: 'center' },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', width: 90 },
    barTrack: {
        flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 4, overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 4 },
    statValue: { fontWeight: '900', fontSize: 16, width: 30, textAlign: 'right' },

    /* Footer */
    footer: {
        marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 8, alignItems: 'center',
    },
    footerText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

    /* Actions */
    actions: {
        flexDirection: 'row', gap: 10, marginTop: 12,
    },
    actionBtn: {
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
    },
    actionText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

    closeHint: {
        color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600',
        letterSpacing: 2, marginTop: 10,
    },
});
