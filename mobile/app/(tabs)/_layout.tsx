import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Tabs
                screenOptions={{
                    headerStyle: { backgroundColor: '#0f172a' },
                    headerTintColor: '#F97316',
                    headerTitleStyle: { fontWeight: '900', fontSize: 14, color: '#F97316', letterSpacing: 1 },
                    headerShadowVisible: false,
                    tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b', borderTopWidth: 1 },
                    tabBarActiveTintColor: '#F97316',
                    tabBarInactiveTintColor: '#64748b',
                    tabBarLabelStyle: { fontWeight: '800', fontSize: 9, letterSpacing: 0.5 },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'MATCH LOBBY',
                        headerShown: false,
                        tabBarIcon: ({ color, size }) => <Ionicons name="football" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="tactical"
                    options={{
                        title: 'TACTICAL',
                        headerTitle: 'TACTICAL BOARD',
                        tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="analytics"
                    options={{
                        title: 'ANALYTICS',
                        headerTitle: 'ANALYTICS',
                        tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="chat"
                    options={{
                        title: 'TEAM CHAT',
                        headerShown: false,
                        tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="database"
                    options={{
                        title: 'FANTASY LEAGUE',
                        headerTitle: 'FANTASY LEAGUE',
                        tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}
