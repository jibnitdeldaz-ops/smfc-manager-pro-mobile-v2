import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SquadProvider } from '../lib/squadContext';
import { IdentityProvider, useIdentity } from '../lib/identity';
import LoginScreen from '../components/LoginScreen';

function AppContent() {
    const { playerName, isLoading } = useIdentity();

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#F97316" />
            </View>
        );
    }

    if (!playerName) {
        return <LoginScreen />;
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <IdentityProvider>
            <SquadProvider>
                <StatusBar style="light" />
                <AppContent />
            </SquadProvider>
        </IdentityProvider>
    );
}
