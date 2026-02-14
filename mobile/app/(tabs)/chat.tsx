import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, Pressable, StyleSheet, FlatList,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useIdentity } from '../../lib/identity';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

interface ChatMessage {
    id: string;
    content: string;
    user_name: string;
    created_at: string;
}

export default function TeamChat() {
    const { playerName } = useIdentity();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    // Initial Load & Subscription
    useEffect(() => {
        fetchMessages();

        // Realtime Subscription
        const channel = supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => [newMsg, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Fetch initial messages (last 50)
    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error('Error fetching messages:', error);
        else if (data) setMessages(data);
        setLoading(false);
    };

    // Auto-Clear Old Messages (7 Days)
    // Runs once when screen is focused
    useFocusEffect(
        useCallback(() => {
            const cleanupOldMessages = async () => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const { error } = await supabase
                    .from('messages')
                    .delete()
                    .lt('created_at', sevenDaysAgo.toISOString());

                if (error) console.error('Error cleaning old messages:', error);
            };
            cleanupOldMessages();
        }, [])
    );

    const handleSend = async () => {
        if (!inputText.trim()) return;
        if (!playerName) {
            alert('Please set your name in the Match Lobby first!');
            return;
        }

        const text = inputText.trim();
        setInputText(''); // Optimistic clear

        const { error } = await supabase
            .from('messages')
            .insert({
                content: text,
                user_name: playerName,
            });

        if (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message.');
            setInputText(text); // Revert on failure
        }
    };

    const renderItem = ({ item }: { item: ChatMessage }) => {
        const isMe = item.user_name === playerName;
        return (
            <View style={[s.msgRow, isMe ? s.msgRowMe : s.msgRowOther]}>
                {!isMe && <Text style={s.senderName}>{item.user_name}</Text>}
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                    <Text style={[s.msgText, isMe ? s.textMe : s.textOther]}>{item.content}</Text>
                    <Text style={[s.timeText, isMe ? s.textMe : s.textOther, { opacity: 0.7 }]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={s.container}>
                <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container} edges={['bottom']}>
            <View style={s.header}>
                <Text style={s.headerTitle}>TEAM CHAT 💬</Text>
                <Text style={s.headerSub}>Auto-clears every 7 days</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                inverted // Newest at bottom visually, so data[0] is newest? No, standard chat is usually inverted list
                // If inverted: data[0] should be newest (bottom of screen).
                // My fetch order is 'created_at' DESC, so data[0] is newest. Correct for Inverted.
                contentContainerStyle={s.listContent}
                keyboardShouldPersistTaps="handled"
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={s.inputBar}>
                    <TextInput
                        style={s.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor="#64748b"
                        onSubmitEditing={handleSend}
                    />
                    <Pressable style={s.sendBtn} onPress={handleSend}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', alignItems: 'center', backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#F97316', letterSpacing: 1 },
    headerSub: { fontSize: 10, color: '#64748b', marginTop: 2 },

    listContent: { padding: 16 },

    msgRow: { marginBottom: 12, maxWidth: '80%' },
    msgRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    msgRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },

    senderName: { fontSize: 10, color: '#64748b', marginBottom: 2, marginLeft: 4, fontWeight: 'bold' },

    bubble: { padding: 10, borderRadius: 12, minWidth: 80 },
    bubbleMe: { backgroundColor: '#3b82f6', borderBottomRightRadius: 2 },
    bubbleOther: { backgroundColor: '#1e293b', borderBottomLeftRadius: 2 },

    msgText: { fontSize: 15, lineHeight: 20 },
    textMe: { color: '#fff' },
    textOther: { color: '#e2e8f0' },

    timeText: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },

    inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#1e293b', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#0f172a', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, marginRight: 8 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' },
});
