import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, Dimensions, Image, Modal, TextInput
} from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIdentity } from '../lib/identity';
import { fetchPlayers, Player } from '../lib/sheets';

const { width: SW } = Dimensions.get('window');

export default function LoginScreen() {
    const { setIdentity } = useIdentity();
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        try {
            const data = await fetchPlayers();
            setPlayers(data);
        } catch (err) {
            console.error('Failed to load players for login:', err);
            Alert.alert('Error', 'Could not load player list. Check connection.');
        } finally {
            setLoading(false);
        }
    };

    // --- PIN Verification ---
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [pin, setPin] = useState('');
    const [verifying, setVerifying] = useState(false);

    const handleSelect = (name: string) => {
        setSelectedPlayer(name);
        setPin('');
        setPinModalVisible(true);
    };

    const handleVerify = async () => {
        if (pin.length !== 4) {
            Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
            return;
        }

        setVerifying(true);
        try {
            // Call Supabase RPC to verify
            const { data, error } = await supabase.rpc('verify_pin', {
                try_name: selectedPlayer,
                try_pin: pin
            });

            if (error) throw error;

            if (data === true) {
                // Success!
                setPinModalVisible(false);
                setSubmitting(true);
                await setIdentity(selectedPlayer!);
                setSubmitting(false);
            } else {
                Alert.alert('Incorrect PIN', 'Please try again.');
                setPin('');
            }
        } catch (err) {
            console.error('PIN Verification Error:', err);
            Alert.alert('Error', 'Could not verify PIN. Check connection.');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <View style={s.center}>
                <ActivityIndicator size="large" color="#F97316" />
                <Text style={s.loadingText}>Loading Squad...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <Image source={require('../assets/icon.png')} style={s.logo} />
                <Text style={s.title}>SMFC MANAGER PRO</Text>
                <Text style={s.subtitle}>WHO ARE YOU?</Text>
            </View>

            <FlatList
                data={players}
                keyExtractor={p => p.name}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <Pressable
                        style={({ pressed }) => [s.card, pressed && s.cardPressed]}
                        onPress={() => handleSelect(item.name)}
                        disabled={submitting}
                    >
                        <View style={[s.avatar, { borderColor: getPosColor(item.position) }]}>
                            <Text style={s.avatarText}>{getInitials(item.name)}</Text>
                        </View>
                        <View style={s.info}>
                            <Text style={s.name}>{item.name}</Text>
                            <Text style={s.pos}>{item.position}</Text>
                        </View>
                        <Text style={s.arrow}>→</Text>
                    </Pressable>
                )}
            />

            {/* PIN MODAL */}
            <Modal visible={pinModalVisible} transparent animationType="fade" onRequestClose={() => setPinModalVisible(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Enter PIN for {selectedPlayer}</Text>
                        <Text style={s.modalSub}>First time? Use 1234</Text>

                        <TextInput
                            style={s.pinInput}
                            value={pin}
                            onChangeText={setPin}
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                            autoFocus
                        />

                        <View style={s.modalBtns}>
                            <Pressable style={s.cancelBtn} onPress={() => setPinModalVisible(false)}>
                                <Text style={s.btnTextSec}>CANCEL</Text>
                            </Pressable>
                            <Pressable style={s.verifyBtn} onPress={handleVerify} disabled={verifying}>
                                {verifying ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>VERIFY</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {submitting && (
                <View style={s.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={s.loggingIn}>Signing in...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

// Helpers
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const getPosColor = (pos: string) => {
    switch (pos) {
        case 'FWD': return '#ef4444';
        case 'MID': return '#22c55e';
        case 'DEF': return '#3b82f6';
        default: return '#facc15';
    }
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#94a3b8', marginTop: 12, letterSpacing: 1 },

    header: { alignItems: 'center', paddingVertical: 40 },
    logo: { width: 80, height: 80, borderRadius: 16, marginBottom: 16 },
    title: { color: '#F97316', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
    subtitle: { color: '#fff', fontSize: 24, fontWeight: '300', marginTop: 8 },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b',
        borderRadius: 12, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#334155',
    },
    cardPressed: { backgroundColor: '#334155', transform: [{ scale: 0.98 }] },

    avatar: {
        width: 48, height: 48, borderRadius: 24, borderWidth: 2,
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a',
        marginRight: 16,
    },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    info: { flex: 1 },
    name: { color: '#fff', fontSize: 16, fontWeight: '700' },
    pos: { color: '#94a3b8', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginTop: 2 },

    arrow: { color: '#64748b', fontSize: 20 },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center', alignItems: 'center',
    },
    loggingIn: { color: '#fff', marginTop: 16, fontWeight: '600', letterSpacing: 1 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1e293b', width: '100%', maxWidth: 320, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 20 },
    pinInput: {
        backgroundColor: '#0f172a', width: '100%', height: 60, borderRadius: 12,
        color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 8,
        borderWidth: 1, borderColor: '#F97316', marginBottom: 24
    },
    modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#334155', alignItems: 'center' },
    verifyBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F97316', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    btnTextSec: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 },
});
