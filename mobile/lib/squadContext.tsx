import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ScoredPlayer } from './squadEngine';

interface MatchSettings {
    matchDate: Date;
    venue: string;
    kickoff: string;
    duration: number;
    format: string;
    cost: string;
    upi: string;
}

interface SquadContextType {
    matchSquad: ScoredPlayer[];
    setMatchSquad: React.Dispatch<React.SetStateAction<ScoredPlayer[]>>;
    matchSettings: MatchSettings;
    setMatchSettings: React.Dispatch<React.SetStateAction<MatchSettings>>;
}

const defaultSettings: MatchSettings = {
    matchDate: new Date(),
    venue: 'BFC',
    kickoff: '7:00 PM',
    duration: 90,
    format: '9 vs 9',
    cost: '***',
    upi: '***',
};

const SquadContext = createContext<SquadContextType>({
    matchSquad: [],
    setMatchSquad: () => { },
    matchSettings: {
        matchDate: new Date(),
        venue: 'Turf',
        kickoff: '07:30 PM',
        duration: 90,
        cost: '120',
        upi: '9746069905',
        format: '7v7',
    },
    setMatchSettings: () => { },
});

export function SquadProvider({ children }: { children: ReactNode }) {
    const [matchSquad, setMatchSquad] = useState<ScoredPlayer[]>([]);
    const [matchSettings, setMatchSettings] = useState<MatchSettings>({
        matchDate: new Date(),
        venue: 'Turf',
        kickoff: '07:30 PM',
        duration: 90,
        cost: '120',
        upi: '9746069905',
        format: '7v7',
    });

    return (
        <SquadContext.Provider value={{ matchSquad, setMatchSquad, matchSettings, setMatchSettings }}>
            {children}
        </SquadContext.Provider>
    );
}

export function useSquad() {
    return useContext(SquadContext);
}

export type { MatchSettings };
