import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Pressable, TextInput,
    ActivityIndicator, Alert, Dimensions, Modal, FlatList, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchPlayers, Player } from '../../lib/sheets';
import {
    generateSquad, swapPlayers,
    ScoredPlayer, FORMAT_OPTIONS, VENUE_OPTIONS, generateTimeSlots,
} from '../../lib/squadEngine';
import { supabase } from '../../lib/supabase';
import { useSquad } from '../../lib/squadContext';
import FutbolCard from '../../components/FutbolCard';
import { useIdentity } from '../../lib/identity';
import {
    createMatch, updateMatchStatus, getLatestMatch, subscribeToMatch,
    MATCH_STATUS, MatchRecord
} from '../../lib/matches';
import ProfileModal from '../../components/ProfileModal';
import PredictionModal from '../../components/PredictionModal';
import LiveMatchBanner from '../../components/LiveMatchBanner';
import { useFocusEffect } from 'expo-router';

type PosFilter = 'ALL' | 'FWD' | 'MID' | 'DEF';

const DURATION_OPTIONS = [60, 90, 120];
const TIME_SLOTS = generateTimeSlots();

// ... (imports)

export default function MatchLobby() {
    const { matchSquad, setMatchSquad, matchSettings, setMatchSettings } = useSquad();
    const { isAdmin, playerName, clearIdentity } = useIdentity();
    // ...

    const [profileVisible, setProfileVisible] = useState(false);
    const [predictVisible, setPredictVisible] = useState(false);

    // Refresh control
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchActiveMatch();
        setRefreshing(false);
    };
    const [myPrediction, setMyPrediction] = useState<any>(null);
    const [activeMatch, setActiveMatch] = useState<MatchRecord | null>(null);

    // --- Data ---
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Selection ---
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [posFilter, setPosFilter] = useState<PosFilter>('ALL');

    // --- WhatsApp Paste ---
    const [waOpen, setWaOpen] = useState(false);
    const [waText, setWaText] = useState('');

    // --- Guests ---
    const [guestInput, setGuestInput] = useState('');

    // --- Match Settings ---
    const [msOpen, setMsOpen] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showVenuePicker, setShowVenuePicker] = useState(false);
    const [customVenue, setCustomVenue] = useState('');
    const [showKickoffPicker, setShowKickoffPicker] = useState(false);

    // --- Prediction Fetcher ---
    const fetchPrediction = async (matchId: string) => {
        if (!playerName) return;
        console.log('Fetching prediction for:', playerName, 'Match:', matchId);
        const { data, error } = await supabase.from('predictions')
            .select('*')
            .eq('match_id', matchId)
            .eq('player_name', playerName)
            .maybeSingle();

        console.log('Prediction Data:', data);
        setMyPrediction(data);
    };

    // --- Edit Positions ---
    const [epOpen, setEpOpen] = useState(false);
    const [editPlayerName, setEditPlayerName] = useState('');
    const [showPlayerPicker, setShowPlayerPicker] = useState(false);
    const [posChangeLog, setPosChangeLog] = useState<string[]>([]);

    // --- Transfer modals ---
    const [showRedModal, setShowRedModal] = useState(false);
    const [showBlueModal, setShowBlueModal] = useState(false);
    const [trRedPlayer, setTrRedPlayer] = useState('');
    const [trBluePlayer, setTrBluePlayer] = useState('');

    // --- Futbol Card ---
    const fetchActiveMatch = async () => {
        // Fetch the most recent match that is NOT completed
        const { data, error } = await supabase.from('matches')
            .select('*')
            .neq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            console.log('Active Match Found:', data.status);
            setActiveMatch(data);
            fetchPrediction(data.id);

            // If the match is not Draft (meaning it's Published, Locked, or Live), we sync the squad
            if (data.status !== MATCH_STATUS.DRAFT) {
                const red = typeof data.red_team === 'string' ? JSON.parse(data.red_team) : data.red_team;
                const blue = typeof data.blue_team === 'string' ? JSON.parse(data.blue_team) : data.blue_team;
                setMatchSquad(red.concat(blue));
            } else if (data.status === MATCH_STATUS.DRAFT && (data.red_team?.length === 0 || !data.red_team)) {
                // If match is draft and has NO teams (reset state), clear the squad
                console.log('Match is reset/draft, clearing squad');
                setMatchSquad([]);
                setActiveMatch(data);
            }
        } else {
            setActiveMatch(null);
            // Don't clear matchSquad here, allow local drafting if no match exists
        }
    };

    // Use Ref to access current activeMatch inside stale closures of useEffect
    const activeMatchRef = useRef(activeMatch);
    useEffect(() => { activeMatchRef.current = activeMatch; }, [activeMatch]);

    // RE-FETCH PREDICTION WHEN MATCH ID CHANGES
    useEffect(() => {
        if (activeMatch?.id && playerName) {
            fetchPrediction(activeMatch.id);
        } else {
            setMyPrediction(null);
        }
    }, [activeMatch?.id, playerName]);

    // Listen for match changes - OPTIMIZED FOR INSTANT UPDATES
    useEffect(() => {
        fetchActiveMatch();

        // Create a SINGLE channel for this component instance with a unique ID to enforce fresh connection
        const channelId = `lobby-realtime-${Date.now()}`;
        const channel = supabase.channel(channelId)
            // 1. Matches
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
                console.log('Realtime Match Update:', payload);

                if ((payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') && payload.new) {
                    setActiveMatch(payload.new as MatchRecord);

                    const data = payload.new as MatchRecord;
                    setActiveMatch(data);

                    // Update squad
                    if (data.status !== MATCH_STATUS.DRAFT || (data.red_team && data.red_team.length > 0)) {
                        const red = typeof data.red_team === 'string' ? JSON.parse(data.red_team) : data.red_team;
                        const blue = typeof data.blue_team === 'string' ? JSON.parse(data.blue_team) : data.blue_team;
                        setMatchSquad(red.concat(blue));
                    } else if (data.status === MATCH_STATUS.DRAFT && (data.red_team?.length === 0 || !data.red_team)) {
                        console.log('Realtime: Match reset/draft, clearing squad');
                        setMatchSquad([]);
                    }
                } else if (payload.eventType === 'DELETE') {
                    setActiveMatch(null);
                    setMatchSquad([]);
                } else {
                    fetchActiveMatch();
                }
            })
            // 2. Predictions
            .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, (payload) => {
                console.log('Realtime Prediction Event:', payload);
                if (activeMatchRef.current) fetchPrediction(activeMatchRef.current.id);
            })
            .subscribe((status) => {
                console.log(`Realtime Subscription Status (${channelId}):`, status);
            });

        return () => {
            console.log(`Unsubscribing from ${channelId}`);
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerName]); // Stable dependency, no re-subscribing on match updates
    const [cardPlayer, setCardPlayer] = useState<Player | null>(null);

    // --- Fetch data ---
    useEffect(() => {
        fetchPlayers().then(data => { setPlayers(data); setLoading(false); });
    }, []);

    const syncSquadFromMatch = (match: MatchRecord) => {
        const red = match.red_team.map(p => ({ ...p, team: 'Red' as const, goals: 0, assists: 0, saves: 0, ownGoals: 0, ovr: 0, sortOvr: 0 }));
        const blue = match.blue_team.map(p => ({ ...p, team: 'Blue' as const, goals: 0, assists: 0, saves: 0, ownGoals: 0, ovr: 0, sortOvr: 0 }));
        setMatchSquad([...red, ...blue]);

        // Also update settings (venue/time) if needed, but keeping it simple for now
    };

    // --- Publish --- (Removed duplicate)


    const handleCancelMatch = async () => {
        if (!activeMatch) return;
        setLoading(true);
        await supabase.from('matches').delete().eq('id', activeMatch.id);
        setActiveMatch(null);
        setMatchSquad([]);
        setLoading(false);
    };

    const handleLock = async () => {
        if (!activeMatch) return;
        const { updateMatchStatus } = await import('../../lib/matches');
        const result = await updateMatchStatus(activeMatch.id, MATCH_STATUS.LOCKED);
        if (!result.success) {
            Alert.alert('Error', result.error || 'Failed to lock team status.');
        }
    };

    const handleUnlock = async () => {
        if (!activeMatch) return;
        const { updateMatchStatus } = await import('../../lib/matches');
        const result = await updateMatchStatus(activeMatch.id, MATCH_STATUS.DRAFT);
        if (!result.success) {
            Alert.alert('Error', result.error || 'Failed to unlock team status.');
        }
    };

    // Is the UI locked? (If active match is LOCKED/LIVE and user is NOT admin)
    // Actually, even for admin, if it's LOCKED, we typically view it. Admin explicitly UNLOCKs to edit.
    const isLocked = activeMatch?.status === MATCH_STATUS.LOCKED || activeMatch?.status === MATCH_STATUS.LIVE;
    const canEdit = !isLocked || isAdmin; // Admin can always see controls, but maybe functionality differs

    // --- Derived ---
    const guests = guestInput.split(',').map(g => g.trim()).filter(Boolean);
    const smfcCount = selected.size;
    const guestCount = guests.length;
    const totalCount = smfcCount + guestCount;
    const displayVenue = matchSettings.venue === 'Other' ? (customVenue || 'Ground') : matchSettings.venue;
    const redTeam = matchSquad.filter(p => p.team === 'Red');
    const blueTeam = matchSquad.filter(p => p.team === 'Blue');
    const selectedPlayersList = useMemo(() => players.filter(p => selected.has(p.name)), [players, selected]);
    const filteredPlayers = players.filter(p => posFilter === 'ALL' || p.position === posFilter);

    const togglePlayer = (name: string) => {
        setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
    };

    // --- Date/Time helpers ---
    const formatDateDisplay = () => {
        const d = matchSettings.matchDate;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    };
    const getEndTime = () => {
        const m = matchSettings.kickoff.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return '';
        let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3].toUpperCase();
        if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
        const total = h * 60 + min + matchSettings.duration;
        const eH = Math.floor(total / 60) % 24; const eM = total % 60;
        const eAp = eH < 12 ? 'AM' : 'PM'; const eH12 = eH === 0 ? 12 : eH > 12 ? eH - 12 : eH;
        return `${eH12}:${eM === 0 ? '00' : '30'} ${eAp}`;
    };

    // --- WhatsApp auto-select ---
    const handleSelectPlayers = () => {
        if (!waText.trim()) return;
        const newSelected = new Set<string>();
        const newGuests: string[] = [];
        for (const line of waText.split('\n')) {
            const match = line.match(/^\s*\d+[.)]\s*(.+)/);
            if (!match) continue;
            let name = match[1].trim().replace(/\s*\([tT]\)/, '').replace(/\s*[\(\[\{（].*?[\)\]\}）]/, '').replace(/[\u200b\u2060\ufeff]/g, '').trim();
            if (name.length < 2) continue;
            const found = players.find(p => p.name.toLowerCase() === name.toLowerCase());
            found ? newSelected.add(found.name) : newGuests.push(name);
        }
        setSelected(newSelected);
        if (newGuests.length > 0) {
            const existing = guestInput.split(',').map(g => g.trim()).filter(Boolean);
            setGuestInput([...new Set([...existing, ...newGuests])].join(', '));
        }
        setWaOpen(false);
    };

    // --- Generate ---
    const handleGenerate = () => {
        const sel = players.filter(p => selected.has(p.name));
        if (sel.length + guests.length < 2) { Alert.alert('Not enough players', 'Select at least 2.'); return; }
        const result = generateSquad(sel, guests);
        setMatchSquad([...result.red, ...result.blue]);
        setTrRedPlayer(''); setTrBluePlayer('');
        Alert.alert('🔥 Teams Generated!');
    };

    // --- Transfer ---
    const handleTransfer = async () => {
        if (!trRedPlayer || !trBluePlayer) { Alert.alert('Select both players'); return; }

        const updatedSquad = swapPlayers(matchSquad, trRedPlayer, trBluePlayer);
        setMatchSquad(updatedSquad);

        setTrRedPlayer(''); setTrBluePlayer('');

        // ⚡ SYNC TO SUPABASE IMMEDIATELY if active match exists
        if (activeMatch) {
            const red = updatedSquad.filter(p => p.team === 'Red');
            const blue = updatedSquad.filter(p => p.team === 'Blue');

            const { error } = await supabase.from('matches').update({
                red_team: JSON.stringify(red),
                blue_team: JSON.stringify(blue)
            }).eq('id', activeMatch.id);

            if (error) console.error('Failed to sync transfer:', error);
        }
    };

    // --- Publish ---
    const handlePublish = async () => {
        // Validation
        if (matchSquad.length === 0) { Alert.alert('Empty Squad', 'Generate a squad first.'); return; }

        console.log('Attempting to publish match...');

        // If active match exists and is DRAFT, we update it
        if (activeMatch && activeMatch.status === MATCH_STATUS.DRAFT) {
            console.log('Updating existing draft:', activeMatch.id);
            // Logic to update existing match (we need an updateMatch function or direct supabase call)
            // MERGE local logs with existing history if needed.
            // Actually, if we are in draft, we just want to save current state.
            // If user did swaps locally without active match sync (shouldn't happen if activeMatch exists), 
            // we should probably trust local transferLog?
            // But handleTransfer syncs immediately if activeMatch exists.
            // So activeMatch.transfer_history should be up to date.
            // Unless we generated LOCALLY while activeMatch was NULL?
            // "Generate" clears activeMatch? No.
            // "Generate" replaces matchSquad locally.
            // If activeMatch is DRAFT, we should probably update it with the generated squad.
            // But handleGenerate is local.
            // So handlePublish is definitely the sync point.

            // If transferLog has items that are NOT in activeMatch.transfer_history?
            // Simpler: Just save transferLog from context as the history?
            // Or append?
            // If handleTransfer updates activeMatch immediately, then activeMatch.transfer_history is truth.
            // But handleGenerate updates LOCAL log.
            // So we might have local logs (e.g. "Squad Generated") that are not in DB.
            // Let's union them? Or just append local changes?
            // Safest: Use transferLog from context, assuming it captures everything user sees.

            const { error } = await supabase.from('matches').update({
                red_team: JSON.stringify(matchSquad.filter(p => p.team === 'Red')),
                blue_team: JSON.stringify(matchSquad.filter(p => p.team === 'Blue')),
                venue: matchSettings.venue === 'Other' ? customVenue : matchSettings.venue,
                kickoff: matchSettings.kickoff,
            }).eq('id', activeMatch.id);

            if (error) { console.error('Update failed:', error); Alert.alert('Error', 'Failed to update match.'); return; }
            Alert.alert('✅ Match Updated!', 'The lineup has been updated live.');
            return;
        }

        // Create new match
        console.log('Creating new match...');
        const red = matchSquad.filter(p => p.team === 'Red');
        const blue = matchSquad.filter(p => p.team === 'Blue');

        // Ensure createMatch is actually calling Supabase correctly
        const result = await createMatch(
            matchSettings.matchDate.toISOString(),
            matchSettings.venue === 'Other' ? customVenue : matchSettings.venue,
            matchSettings.kickoff,
            matchSettings.format,
            red,
            blue,
            playerName || 'Member'
        );

        if (result) {
            console.log('Match created successfully:', result.id);
            if (!activeMatch) {
                setActiveMatch(result);
            }
            Alert.alert('✅ Match Published Live!', 'Admins can now see this lineup and Lock it for predictions.');
        } else {
            console.error('createMatch returned null');
            Alert.alert('Error', 'Failed to publish match. Please try again.');
        }
    };

    // --- Copy ---
    const handleCopy = async () => {
        if (matchSquad.length === 0) return;
        const blueList = blueTeam.map(p => p.name).join('\n');
        const redList = redTeam.map(p => p.name).join('\n');
        const text = `Date: ${formatDateDisplay()}\nTime: ${matchSettings.kickoff} - ${getEndTime()}\nGround: ${displayVenue}\nScore: Blue 0-0 Red\nCost per player: ${matchSettings.cost}\nGpay: ${matchSettings.upi}\nLateFee: 50\n\n🔵 *BLUE TEAM*\n${blueList}\n\n🔴 *RED TEAM*\n${redList}`;
        await Clipboard.setStringAsync(text);
        Alert.alert('✅ Copied!', 'Team list copied to clipboard.');
    };

    // --- Position change ---
    const handleChangePosition = (newPos: 'DEF' | 'MID' | 'FWD') => {
        if (!editPlayerName) return;
        const idx = players.findIndex(p => p.name === editPlayerName);
        if (idx === -1) return;
        const old = players[idx].position;
        if (old === newPos) return;
        const u = [...players]; u[idx] = { ...u[idx], position: newPos }; setPlayers(u);
        setPosChangeLog(prev => [...prev, `${editPlayerName}  ${old} → ${newPos}`]);
    };

    // --- Player Picker Modal ---
    const PlayerPickerModal = ({ visible, onClose, players: list, onSelect, title, color }: {
        visible: boolean; onClose: () => void; players: ScoredPlayer[];
        onSelect: (name: string) => void; title: string; color: string;
    }) => (
        <Modal visible={visible} transparent animationType="slide">
            <View style={ms.overlay}>
                <View style={ms.modal}>
                    <View style={[ms.modalHeader, { borderBottomColor: color }]}>
                        <Text style={[ms.modalTitle, { color }]}>{title}</Text>
                        <Pressable onPress={onClose}><Text style={ms.modalClose}>✕</Text></Pressable>
                    </View>
                    <FlatList
                        data={list}
                        keyExtractor={p => p.name}
                        renderItem={({ item }) => (
                            <Pressable style={ms.modalItem} onPress={() => { onSelect(item.name); onClose(); }}>
                                <Text style={ms.modalItemName}>{item.name}</Text>
                                <View style={[ms.modalPosBadge, { backgroundColor: color }]}>
                                    <Text style={ms.modalPosText}>{item.position}</Text>
                                </View>
                            </Pressable>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <SafeAreaView style={s.container}>
                <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 80 }} />
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>Loading players...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container}>
            <FutbolCard player={cardPlayer} visible={!!cardPlayer} onClose={() => setCardPlayer(null)} />
            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
            >
                {/* ═══ HEADER ═══ */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 }}>
                    <Text style={[s.title, { marginVertical: 0, flex: 1, textAlign: 'left' }]}>SMFC MANAGER PRO</Text>
                    <Pressable onPress={() => setProfileVisible(true)} style={{ padding: 8 }}>
                        <Ionicons name="person-circle-outline" size={28} color="#F97316" />
                    </Pressable>
                </View>

                <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />

                {/* ═══ LIVE MATCH BANNER ═══ */}
                {/* ═══ LIVE MATCH BANNER ═══ */}
                {activeMatch && (
                    <LiveMatchBanner
                        activeMatch={activeMatch}
                        isAdmin={isAdmin}
                        myPrediction={myPrediction}
                        onLock={handleLock}
                        onUnlock={handleUnlock}
                        onPredict={() => setPredictVisible(true)}
                        onPredictionUpdate={() => fetchPrediction(activeMatch.id)}
                    />
                )}

                {/* REMOVED FROM HERE - WILL MOVE DOWN */}
                {/* PUBLISH BUTTON - Visible to ALL if activeMatch is null or status is draft/published (not locked/live) */}
                {/* MOVED */}

                {activeMatch && (
                    <PredictionModal
                        visible={predictVisible}
                        onClose={() => setPredictVisible(false)}
                        matchId={activeMatch.id}
                        onPredictionSuccess={() => fetchPrediction(activeMatch.id)}
                        initialPrediction={myPrediction}
                    />
                )}

                {/* ═══ PLAYER POOL HEADER ═══ */}
                <View style={s.poolHeader}>
                    <Text style={s.sectionLabel}>PLAYER POOL</Text>
                    <View style={s.counters}>
                        <View style={s.cBadge}><Text style={s.cText}>{smfcCount} SMFC</Text></View>
                        <View style={s.cBadge}><Text style={s.cText}>{guestCount} GUEST</Text></View>
                        <View style={[s.cBadge, s.cTotal]}><Text style={[s.cText, { color: '#fff' }]}>{totalCount} TOTAL</Text></View>
                    </View>
                </View>

                {/* ═══ PASTE FROM WHATSAPP ═══ */}
                <Pressable style={s.collapseHead} onPress={() => setWaOpen(!waOpen)}>
                    <Text style={s.collapseIcon}>{waOpen ? '▼' : '▶'}</Text>
                    <Text style={s.collapseTitle}>📋 PASTE FROM WHATSAPP</Text>
                </Pressable>
                {waOpen && (
                    <View style={s.collapseBody}>
                        <TextInput style={s.textArea} placeholder="1. Akhil\n2. Isa..." placeholderTextColor="#94a3b8" multiline numberOfLines={4} value={waText} onChangeText={setWaText} />
                        <Pressable style={s.orangeBtn} onPress={handleSelectPlayers}>
                            <Text style={s.orangeBtnText}>SELECT PLAYERS</Text>
                        </Pressable>
                    </View>
                )}

                {/* ═══ POSITION TABS ═══ */}
                <View style={s.posTabs}>
                    {(['ALL', 'FWD', 'MID', 'DEF'] as PosFilter[]).map(tab => (
                        <Pressable key={tab} onPress={() => setPosFilter(tab)}>
                            <Text style={[s.posTab, posFilter === tab && s.posTabActive]}>{tab}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* ═══ PLAYER CHECKBOX GRID ═══ */}
                <View style={s.playerGrid}>
                    {filteredPlayers.map(player => (
                        <Pressable key={player.name} style={s.playerItem} onPress={() => togglePlayer(player.name)}>
                            <View style={[s.cb, selected.has(player.name) && s.cbChecked]}>
                                {selected.has(player.name) && <Ionicons name="checkmark" size={12} color="#0f172a" />}
                            </View>
                            <Text style={s.playerName}>{player.name.toUpperCase()}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* ═══ GUESTS ═══ */}
                <Text style={s.fieldLabel}>GUESTS (COMMA SEPARATED)</Text>
                <TextInput style={s.input} value={guestInput} onChangeText={setGuestInput} placeholderTextColor="#64748b" />

                {/* ═══ MATCH SETTINGS ═══ */}
                <Pressable style={s.collapseHead} onPress={() => setMsOpen(!msOpen)}>
                    <Text style={s.collapseIcon}>{msOpen ? '▼' : '▶'}</Text>
                    <Text style={s.collapseTitle}>⚙️ MATCH SETTINGS (Date, Time, Venue)</Text>
                </Pressable>
                {msOpen && (
                    <View style={s.collapseBody}>
                        <View style={s.settingsRow}>
                            <View style={s.settingsCol}>
                                <Text style={s.settingsLabel}>MATCH DATE</Text>
                                <Pressable style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
                                    <Text style={s.pickerBtnText}>{formatDateDisplay()}</Text>
                                    <Ionicons name="calendar" size={16} color="#F97316" />
                                </Pressable>
                                {showDatePicker && (
                                    <DateTimePicker value={matchSettings.matchDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) setMatchSettings({ ...matchSettings, matchDate: date }); }} />
                                )}
                            </View>
                            <View style={s.settingsCol}>
                                <Text style={s.settingsLabel}>VENUE</Text>
                                <Pressable style={s.pickerBtn} onPress={() => setShowVenuePicker(!showVenuePicker)}>
                                    <Text style={s.pickerBtnText}>{displayVenue}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#F97316" />
                                </Pressable>
                                {showVenuePicker && (
                                    <View style={s.dropdown}>
                                        {VENUE_OPTIONS.map(v => (
                                            <Pressable key={v} style={[s.dropdownItem, matchSettings.venue === v && s.dropdownItemActive]}
                                                onPress={() => { setMatchSettings({ ...matchSettings, venue: v }); setShowVenuePicker(false); }}>
                                                <Text style={[s.dropdownText, matchSettings.venue === v && s.dropdownTextActive]}>{v}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                                {matchSettings.venue === 'Other' && (
                                    <TextInput style={[s.input, { marginTop: 6 }]} value={customVenue} onChangeText={setCustomVenue} placeholder="Venue name" placeholderTextColor="#64748b" />
                                )}
                            </View>
                        </View>
                        <View style={s.settingsRow}>
                            <View style={s.settingsCol}>
                                <Text style={s.settingsLabel}>KICKOFF</Text>
                                <Pressable style={s.pickerBtn} onPress={() => setShowKickoffPicker(!showKickoffPicker)}>
                                    <Text style={s.pickerBtnText}>{matchSettings.kickoff}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#F97316" />
                                </Pressable>
                                {showKickoffPicker && (
                                    <ScrollView style={s.timeDropdown} nestedScrollEnabled>
                                        {TIME_SLOTS.map(t => (
                                            <Pressable key={t} style={[s.dropdownItem, matchSettings.kickoff === t && s.dropdownItemActive]}
                                                onPress={() => { setMatchSettings({ ...matchSettings, kickoff: t }); setShowKickoffPicker(false); }}>
                                                <Text style={[s.dropdownText, matchSettings.kickoff === t && s.dropdownTextActive]}>{t}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                            <View style={s.settingsCol}>
                                <Text style={s.settingsLabel}>DURATION</Text>
                                <View style={s.chipRow}>
                                    {DURATION_OPTIONS.map(d => (
                                        <Pressable key={d} onPress={() => setMatchSettings({ ...matchSettings, duration: d })} style={[s.chip, matchSettings.duration === d && s.chipActive]}>
                                            <Text style={[s.chipText, matchSettings.duration === d && s.chipTextActive]}>{d}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </View>
                        <View style={s.settingsRow}>
                            <View style={s.settingsCol}>
                                <Text style={s.settingsLabel}>COST</Text>
                                <TextInput style={s.settingsInput} value={matchSettings.cost} onChangeText={v => setMatchSettings({ ...matchSettings, cost: v })} />
                            </View>
                            <View style={s.settingsCol}>
                                <Text style={s.settingsLabel}>UPI / GPAY</Text>
                                <TextInput style={s.settingsInput} value={matchSettings.upi} onChangeText={v => setMatchSettings({ ...matchSettings, upi: v })} />
                            </View>
                        </View>
                    </View>
                )}

                {/* ═══ FORMAT ═══ */}
                <Text style={s.fieldLabel}>FORMAT</Text>
                <View style={s.chipRow}>
                    {FORMAT_OPTIONS.map(f => (
                        <Pressable key={f} onPress={() => setMatchSettings({ ...matchSettings, format: f })} style={[s.chip, matchSettings.format === f && s.chipActive]}>
                            <Text style={[s.chipText, matchSettings.format === f && s.chipTextActive]}>{f}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* ═══ EDIT POSITIONS ═══ */}
                <Pressable style={[s.collapseHead, { marginTop: 12 }]} onPress={() => setEpOpen(!epOpen)}>
                    <Text style={s.collapseIcon}>{epOpen ? '▼' : '▶'}</Text>
                    <Text style={s.collapseTitle}>🔧 EDIT POSITIONS (Session Only)</Text>
                </Pressable>
                {epOpen && (
                    <View style={s.collapseBody}>
                        <Text style={s.settingsLabel}>SELECT PLAYER</Text>
                        <Pressable style={s.pickerBtn} onPress={() => setShowPlayerPicker(!showPlayerPicker)}>
                            <Text style={s.pickerBtnText}>{editPlayerName || 'Choose player...'}</Text>
                            <Ionicons name="chevron-down" size={16} color="#F97316" />
                        </Pressable>
                        {showPlayerPicker && (
                            <ScrollView style={s.timeDropdown} nestedScrollEnabled>
                                {selectedPlayersList.map(p => (
                                    <Pressable key={p.name} style={s.dropdownItem} onPress={() => { setEditPlayerName(p.name); setShowPlayerPicker(false); }}>
                                        <Text style={s.dropdownText}>{p.name} ({p.position})</Text>
                                    </Pressable>
                                ))}
                                {selectedPlayersList.length === 0 && <Text style={{ color: '#94a3b8', padding: 12, fontSize: 12 }}>No players selected yet</Text>}
                            </ScrollView>
                        )}
                        <Text style={[s.settingsLabel, { marginTop: 10 }]}>NEW POSITION</Text>
                        <View style={s.chipRow}>
                            {(['DEF', 'MID', 'FWD'] as const).map(pos => (
                                <Pressable key={pos} onPress={() => handleChangePosition(pos)} style={[s.chip, s.chipWide]}>
                                    <Text style={s.chipText}>{pos}</Text>
                                </Pressable>
                            ))}
                        </View>
                        {posChangeLog.length > 0 && (
                            <View style={{ marginTop: 8 }}>
                                {posChangeLog.map((log, i) => <Text key={i} style={s.changeLog}>{log}</Text>)}
                            </View>
                        )}
                    </View>
                )}

                {/* ═══ GENERATE SQUAD ═══ */}
                {/* Buttons (Only show GENERATE/PUBLISH if not locked, OR if admin unlocked it) */}
                {(!activeMatch || activeMatch.status === MATCH_STATUS.DRAFT) && (
                    <View style={{ gap: 12 }}>
                        <Pressable style={s.generateBtn} onPress={handleGenerate}>
                            <Text style={s.generateBtnText}>⚡ GENERATE SQUAD</Text>
                        </Pressable>
                        {matchSquad.length > 0 && (
                            <Pressable style={[s.generateBtn, { backgroundColor: '#22c55e' }]} onPress={handlePublish}>
                                <Text style={s.generateBtnText}> PUBLISH TEAM TO ALL</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* ═══ LINEUPS ═══ */}
                {matchSquad.length > 0 && (
                    <View style={s.lineupsSection}>
                        <Text style={s.lineupsTitle}>LINEUPS</Text>
                        <View style={s.lineupsColumns}>
                            <View style={s.lineupCol}>
                                <Text style={s.colTitleRed}>RED ({redTeam.length})</Text>
                                {redTeam
                                    .sort((a, b) => {
                                        const order: Record<string, number> = { 'DEF': 0, 'MID': 1, 'FWD': 2 };
                                        return (order[a.position] || 99) - (order[b.position] || 99);
                                    })
                                    .map((p, i) => (
                                        <Pressable key={i} style={[s.lineupCard, s.lineupCardRed]} onPress={() => setCardPlayer(p)}>
                                            <Text style={s.lineupName}>{p.name}</Text>
                                            <View style={s.posBadge}><Text style={s.posBadgeText}>{p.position}</Text></View>
                                        </Pressable>
                                    ))}
                            </View>
                            <View style={s.lineupCol}>
                                <Text style={s.colTitleBlue}>BLUE ({blueTeam.length})</Text>
                                {blueTeam
                                    .sort((a, b) => {
                                        const order: Record<string, number> = { 'DEF': 0, 'MID': 1, 'FWD': 2 };
                                        return (order[a.position] || 99) - (order[b.position] || 99);
                                    })
                                    .map((p, i) => (
                                        <Pressable key={i} style={[s.lineupCard, s.lineupCardBlue]} onPress={() => setCardPlayer(p)}>
                                            <Text style={s.lineupName}>{p.name}</Text>
                                            <View style={s.posBadge}><Text style={s.posBadgeText}>{p.position}</Text></View>
                                        </Pressable>
                                    ))}
                            </View>
                        </View>

                        {/* COPY */}
                        <Pressable style={s.copyBtn} onPress={handleCopy}>
                            <Text style={s.copyBtnText}>📋 COPY TEAM LIST</Text>
                        </Pressable>


                        {/* ═══ TRANSFER WINDOW (Only if NOT locked) ═══ */}
                        {!isLocked && (
                            <>
                                <Text style={s.transferTitle}>PLAYER TRANSFER WINDOW</Text>
                                <View style={s.transferRow}>
                                    <View style={s.transferCol}>
                                        <View style={s.transferLabel}><Text style={[s.transferLabelText, { color: '#ff4b4b' }]}>🔴 FROM RED</Text></View>
                                        <Pressable style={s.transferPickerBtn} onPress={() => setShowRedModal(true)}>
                                            <Text style={s.transferPickerText}>{trRedPlayer || 'Select player...'}</Text>
                                            <Ionicons name="chevron-down" size={14} color="#F97316" />
                                        </Pressable>
                                    </View>

                                    <Pressable style={s.swapBtn} onPress={handleTransfer}>
                                        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>↔️</Text>
                                    </Pressable>

                                    <View style={s.transferCol}>
                                        <View style={[s.transferLabel, { borderColor: '#1c83e1' }]}><Text style={[s.transferLabelText, { color: '#1c83e1' }]}>🔵 FROM BLUE</Text></View>
                                        <Pressable style={s.transferPickerBtn} onPress={() => setShowBlueModal(true)}>
                                            <Text style={s.transferPickerText}>{trBluePlayer || 'Select player...'}</Text>
                                            <Ionicons name="chevron-down" size={14} color="#F97316" />
                                        </Pressable>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* Transfer Modals */}
                <PlayerPickerModal visible={showRedModal} onClose={() => setShowRedModal(false)} players={redTeam}
                    onSelect={setTrRedPlayer} title="SELECT RED PLAYER" color="#ff4b4b" />
                <PlayerPickerModal visible={showBlueModal} onClose={() => setShowBlueModal(false)} players={blueTeam}
                    onSelect={setTrBluePlayer} title="SELECT BLUE PLAYER" color="#1c83e1" />

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView >
    );
}

// ═══════════ STYLES ═══════════
const { width } = Dimensions.get('window');
const COL3 = (width - 48) / 3;

const ms = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#1e293b', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2 },
    modalTitle: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    modalClose: { color: '#94a3b8', fontSize: 18, fontWeight: '800' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
    modalItemName: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalPosBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    modalPosText: { color: '#fff', fontWeight: '900', fontSize: 10 },
});

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scroll: { padding: 16 },
    title: { fontSize: 28, fontWeight: '900', color: '#F97316', textAlign: 'center', letterSpacing: 2, marginVertical: 16 },
    poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionLabel: { color: '#F97316', fontWeight: '900', fontSize: 14 },
    counters: { flexDirection: 'row', gap: 4 },
    cBadge: { backgroundColor: '#1e293b', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#334155' },
    cTotal: { backgroundColor: '#F97316', borderColor: '#F97316' },
    cText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
    collapseHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 4, padding: 12, marginBottom: 4, marginTop: 8 },
    collapseIcon: { color: '#94a3b8', fontSize: 10, marginRight: 8 },
    collapseTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 12 },
    collapseBody: { backgroundColor: '#1e293b', padding: 12, borderRadius: 4, marginBottom: 8 },
    textArea: { backgroundColor: '#fff', borderRadius: 4, padding: 12, color: '#0f172a', fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 },
    orangeBtn: { backgroundColor: '#F97316', borderRadius: 4, paddingVertical: 10, alignItems: 'center' },
    orangeBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    posTabs: { flexDirection: 'row', gap: 16, marginTop: 12, marginBottom: 12 },
    posTab: { color: '#64748b', fontWeight: '700', fontSize: 12, paddingBottom: 4 },
    posTabActive: { color: '#ef4444', borderBottomWidth: 2, borderBottomColor: '#ef4444' },
    playerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    playerItem: { flexDirection: 'row', alignItems: 'center', width: COL3, marginBottom: 10 },
    cb: { width: 16, height: 16, backgroundColor: '#fff', borderRadius: 2, marginRight: 6, justifyContent: 'center', alignItems: 'center' },
    cbChecked: { backgroundColor: '#fff' },
    playerName: { color: '#fff', fontWeight: '800', fontSize: 11 },
    fieldLabel: { color: '#e2e8f0', fontWeight: '900', fontSize: 11, letterSpacing: 0.5, marginTop: 16, marginBottom: 4 },
    input: { backgroundColor: '#fff', borderRadius: 4, padding: 12, color: '#0f172a', fontSize: 14, marginBottom: 8 },
    pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: 10 },
    pickerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    dropdown: { backgroundColor: '#fff', borderRadius: 4, marginTop: 2, overflow: 'hidden' },
    dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    dropdownItemActive: { backgroundColor: '#FFF3E0' },
    dropdownText: { color: '#0f172a', fontWeight: '600', fontSize: 13 },
    dropdownTextActive: { color: '#F97316', fontWeight: '800' },
    timeDropdown: { backgroundColor: '#fff', borderRadius: 4, marginTop: 2, maxHeight: 200 },
    settingsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    settingsCol: { flex: 1 },
    settingsLabel: { color: '#F97316', fontWeight: '900', fontSize: 10, marginBottom: 4, letterSpacing: 0.5 },
    settingsInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: 10, color: '#fff', fontSize: 14 },
    chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    chip: { backgroundColor: '#334155', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
    chipActive: { backgroundColor: '#F97316' },
    chipWide: { flex: 1, alignItems: 'center' },
    chipText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
    chipTextActive: { color: '#fff' },
    changeLog: { color: '#76FF03', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
    generateBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 20, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
    generateBtnText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 2 },
    lineupsSection: { marginTop: 24 },
    lineupsTitle: { color: '#F97316', fontWeight: '900', fontSize: 14, marginBottom: 12 },
    lineupsColumns: { flexDirection: 'row', gap: 8 },
    lineupCol: { flex: 1 },
    colTitleRed: { color: '#ff4b4b', fontWeight: '700', fontSize: 12, marginBottom: 6, textAlign: 'center' },
    colTitleBlue: { color: '#1c83e1', fontWeight: '700', fontSize: 12, marginBottom: 6, textAlign: 'center' },
    lineupCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, marginBottom: 4, borderRadius: 6, borderLeftWidth: 3 },
    lineupCardRed: { backgroundColor: '#1a1f26', borderLeftColor: '#ff4b4b' },
    lineupCardBlue: { backgroundColor: '#1a1f26', borderLeftColor: '#1c83e1' },
    lineupName: { color: '#fff', fontWeight: '700', fontSize: 12, flex: 1 },
    posBadge: { backgroundColor: '#F97316', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
    posBadgeText: { color: '#fff', fontWeight: '900', fontSize: 9 },
    copyBtn: { backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
    copyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
    transferTitle: { color: '#F97316', fontWeight: '900', fontSize: 16, textAlign: 'center', marginTop: 24, marginBottom: 12, letterSpacing: 2 },
    transferRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    transferCol: { flex: 1 },
    transferLabel: { borderWidth: 2, borderColor: '#ff4b4b', borderRadius: 8, padding: 8, alignItems: 'center', marginBottom: 6, backgroundColor: 'rgba(255,0,0,0.05)' },
    transferLabelText: { fontWeight: 'bold', fontSize: 12 },
    transferPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 6, padding: 12 },
    transferPickerText: { color: '#e2e8f0', fontWeight: '600', fontSize: 13 },
    swapBtn: { backgroundColor: '#F97316', borderRadius: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
    swapLogContainer: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#334155' },
    swapLogTitle: { color: '#F97316', fontWeight: '900', fontSize: 11, letterSpacing: 1, marginBottom: 6 },
    swapLogItem: { color: '#76FF03', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
    modalPosBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    modalPosText: { color: '#fff', fontWeight: '900', fontSize: 10 },

    liveBanner: {
        marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 12,
        borderWidth: 2, backgroundColor: 'rgba(15, 23, 42, 0.8)',
        alignItems: 'center', gap: 10,
    },
    liveTitle: { fontWeight: '900', fontSize: 16, letterSpacing: 1, textAlign: 'center' },
    unlockBtn: { backgroundColor: '#334155', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    unlockText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12 },
    lockBtn: { backgroundColor: '#F97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    lockText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    publishBtn: {
        marginHorizontal: 20, marginBottom: 20, backgroundColor: '#22c55e',
        padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#22c55e', shadowOpacity: 0.4, shadowRadius: 10
    },
    publishText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});
