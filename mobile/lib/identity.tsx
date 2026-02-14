// Player Identity — "Who are you?" picker stored in AsyncStorage
// No passwords, no authentication. Just select your name from the player list.
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'smfc_player_identity';
const ADMIN_KEY = 'smfc_is_admin';

// Admin players who can manage matches
const ADMIN_PLAYERS = ['Jibin', 'Aravind', 'PK', 'Anoop', 'Melwin', 'Agin', 'Adarsh']; // Agin/Adarsh for testing

interface IdentityContextType {
    playerName: string | null;
    isAdmin: boolean;
    setIdentity: (name: string) => Promise<void>;
    clearIdentity: () => Promise<void>;
    isLoading: boolean;
}

const IdentityContext = createContext<IdentityContextType>({
    playerName: null,
    isAdmin: false,
    setIdentity: async () => { },
    clearIdentity: async () => { },
    isLoading: true,
});

export function IdentityProvider({ children }: { children: ReactNode }): React.JSX.Element {
    const [playerName, setPlayerName] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadIdentity();
    }, []);

    const loadIdentity = async () => {
        try {
            const name = await AsyncStorage.getItem(STORAGE_KEY);
            if (name) {
                setPlayerName(name);
                setIsAdmin(ADMIN_PLAYERS.some(admin => admin.toLowerCase() === name.toLowerCase()));
            }
        } catch (err) {
            console.error('Error loading identity:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const setIdentity = async (name: string) => {
        await AsyncStorage.setItem(STORAGE_KEY, name);
        setPlayerName(name);
        setIsAdmin(ADMIN_PLAYERS.some(admin => admin.toLowerCase() === name.toLowerCase()));
    };

    const clearIdentity = async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setPlayerName(null);
        setIsAdmin(false);
    };

    return (
        <IdentityContext.Provider value={{ playerName, isAdmin, setIdentity, clearIdentity, isLoading }}>
            {children}
        </IdentityContext.Provider>
    );
}

export function useIdentity() {
    return useContext(IdentityContext);
}
