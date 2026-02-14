import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useIdentity } from '../lib/identity';

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
    const { playerName, clearIdentity } = useIdentity();
    const [mode, setMode] = useState<'view' | 'change_pin'>('view');

    // Change PIN State
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogOut = () => {
        Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: () => {
                    onClose();
                    clearIdentity();
                }
            }
        ]);
    };

    const handleChangePin = async () => {
        if (oldPin.length !== 4 || newPin.length !== 4) {
            Alert.alert('Invalid PIN', 'PINs must be 4 digits.');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('change_pin', {
                player_name: playerName,
                old_pin: oldPin,
                new_pin: newPin
            });

            if (error) throw error;

            if (data === true) {
                Alert.alert('Success', 'PIN changed successfully!');
                setMode('view');
                setOldPin('');
                setNewPin('');
            } else {
                Alert.alert('Error', 'Old PIN was incorrect.');
            }
        } catch (err) {
            console.error('Change PIN Error:', err);
            Alert.alert('Error', 'Could not change PIN.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.content}>
                    {/* Header */}
                    <View style={s.header}>
                        <Text style={s.title}>MY PROFILE</Text>
                        <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#94a3b8" /></Pressable>
                    </View>

                    {/* Avatar / Name */}
                    <View style={s.profileInfo}>
                        <View style={s.avatar}>
                            <Text style={s.avatarText}>{playerName?.substring(0, 2).toUpperCase()}</Text>
                        </View>
                        <Text style={s.name}>{playerName}</Text>
                        <Text style={s.role}>SMFC Player</Text>
                    </View>

                    {/* VIEW MODE */}
                    {mode === 'view' && (
                        <View style={s.actions}>
                            <Pressable style={s.btn} onPress={() => setMode('change_pin')}>
                                <Ionicons name="key-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                                <Text style={s.btnText}>Change PIN</Text>
                            </Pressable>

                            <Pressable style={[s.btn, s.logoutBtn]} onPress={handleLogOut}>
                                <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 10 }} />
                                <Text style={[s.btnText, { color: '#ef4444' }]}>Log Out</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* CHANGE PIN MODE */}
                    {mode === 'change_pin' && (
                        <View style={s.form}>
                            <Text style={s.label}>Verify Old PIN</Text>
                            <TextInput
                                style={s.input}
                                value={oldPin}
                                onChangeText={setOldPin}
                                placeholder="1234"
                                placeholderTextColor="#64748b"
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                            />

                            <Text style={s.label}>New PIN</Text>
                            <TextInput
                                style={s.input}
                                value={newPin}
                                onChangeText={setNewPin}
                                placeholder="Enter new 4-digit PIN"
                                placeholderTextColor="#64748b"
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                            />

                            <View style={s.formBtns}>
                                <Pressable style={s.cancelBtn} onPress={() => setMode('view')}>
                                    <Text style={s.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={s.saveBtn} onPress={handleChangePin} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save PIN</Text>}
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    content: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, minHeight: 400 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

    profileInfo: { alignItems: 'center', marginBottom: 32 },
    avatar: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#0f172a',
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F97316',
        marginBottom: 12
    },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    role: { color: '#94a3b8', fontSize: 14, marginTop: 4 },

    actions: { gap: 12 },
    btn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155',
        padding: 16, borderRadius: 12, justifyContent: 'center'
    },
    logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    // Form
    form: { gap: 16 },
    label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
    input: {
        backgroundColor: '#0f172a', color: '#fff', padding: 16, borderRadius: 8,
        fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: '#334155'
    },
    formBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#334155', borderRadius: 8 },
    saveBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#F97316', borderRadius: 8 },
    cancelText: { color: '#fff', fontWeight: 'bold' },
    saveText: { color: '#fff', fontWeight: 'bold' }
});
