// Funny Stats Generator for Viral FIFA Cards
// Picks 6 random stat categories from a pool of 30+ each time

export interface FunnyStat {
    emoji: string;
    label: string;
    value: number;
}

interface StatTemplate {
    emoji: string;
    label: string;
    min: number;  // typical low range
    max: number;  // typical high range
}

const STAT_POOL: StatTemplate[] = [
    // Personality
    { emoji: '🎭', label: 'Drama', min: 60, max: 99 },
    { emoji: '⏰', label: 'Punctuality', min: 5, max: 45 },
    { emoji: '🤥', label: 'Excuses', min: 70, max: 99 },
    { emoji: '💤', label: 'Sleepiness', min: 30, max: 95 },
    { emoji: '📱', label: 'Phone Checking', min: 55, max: 99 },
    { emoji: '🙄', label: 'Eye Roll', min: 40, max: 88 },
    { emoji: '😤', label: 'Road Rage', min: 50, max: 99 },
    { emoji: '🗣️', label: 'Gossip Level', min: 60, max: 99 },
    { emoji: '🎤', label: 'Commentary', min: 45, max: 95 },
    { emoji: '😏', label: 'Sarcasm', min: 55, max: 99 },

    // Food & Drink
    { emoji: '🍖', label: 'Beef Fry', min: 70, max: 99 },
    { emoji: '🍗', label: 'Biryani Rating', min: 65, max: 99 },
    { emoji: '☕', label: 'Chai Addiction', min: 60, max: 99 },
    { emoji: '🫖', label: 'Filter Coffee', min: 50, max: 95 },
    { emoji: '🍰', label: 'Snack Game', min: 55, max: 92 },
    { emoji: '🥘', label: 'Porotta Love', min: 70, max: 99 },

    // Social Media & Tech
    { emoji: '📲', label: 'WhatsApp Fwd', min: 40, max: 99 },
    { emoji: '🤳', label: 'Selfie Game', min: 30, max: 90 },
    { emoji: '📸', label: 'Pose Level', min: 35, max: 95 },
    { emoji: '🎮', label: 'Late Night Gaming', min: 50, max: 99 },
    { emoji: '📺', label: 'Netflix Hours', min: 55, max: 99 },
    { emoji: '👀', label: 'Reels Addiction', min: 60, max: 99 },

    // Work & Life
    { emoji: '🏃', label: 'Meeting Escape', min: 45, max: 95 },
    { emoji: '🛌', label: 'Sleep Quality', min: 20, max: 85 },
    { emoji: '🚗', label: 'Parking Skill', min: 10, max: 60 },
    { emoji: '🏠', label: 'WFH Expert', min: 60, max: 99 },
    { emoji: '💼', label: 'Corporate BS', min: 50, max: 95 },
    { emoji: '⛽', label: 'Fuel Expense', min: 40, max: 90 },

    // Football-ish (but funny)
    { emoji: '🎬', label: 'Injury Acting', min: 70, max: 99 },
    { emoji: '💃', label: 'Goal Dance', min: 30, max: 99 },
    { emoji: '🗑️', label: 'Missed Sitters', min: 20, max: 85 },
    { emoji: '😡', label: 'Referee Abuse', min: 40, max: 95 },
    { emoji: '👟', label: 'Boot Show-off', min: 35, max: 90 },
    { emoji: '💪', label: 'Warm-up Skip', min: 55, max: 99 },
    { emoji: '🧃', label: 'Water Break', min: 60, max: 99 },

    // Kerala Specials
    { emoji: '🩳', label: 'Lungi Style', min: 60, max: 99 },
    { emoji: '🌴', label: 'Kerala Pride', min: 80, max: 99 },
    { emoji: '🛺', label: 'Auto Bargain', min: 40, max: 95 },
    { emoji: '🎶', label: 'Bathroom Singer', min: 30, max: 90 },
    { emoji: '🍌', label: 'Banana Chips', min: 55, max: 95 },
    { emoji: '⛪', label: 'Sunday Mass Skip', min: 15, max: 80 },
];

function randBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Shuffle array using Fisher-Yates */
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Generate 6 random funny stats for a player.
 * Each call produces different categories and values.
 */
export function generateFunnyStats(_playerName: string): FunnyStat[] {
    const picked = shuffle(STAT_POOL).slice(0, 6);
    return picked.map(s => ({
        emoji: s.emoji,
        label: s.label,
        value: randBetween(s.min, s.max),
    }));
}
