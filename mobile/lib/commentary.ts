// Match Commentary Generator — Replicates the ai_scout.py Gemini-powered commentary
// Uses actual player names, Malayalam movie references, and funny football panel commentary
import { ScoredPlayer } from './squadEngine';

interface CommentaryEvent {
    minute: string;
    text: string;
}

interface CommentaryResult {
    events: CommentaryEvent[];
    finalScore: { blue: number; red: number };
    winner: string;
}

const MALAYALAM_PHRASES = [
    { phrase: 'Adipoli!', meaning: 'Fantastic!' },
    { phrase: 'Poda pulle!', meaning: 'Get out of here!' },
    { phrase: 'Kidilam!', meaning: 'Awesome!' },
    { phrase: 'Kalakki!', meaning: 'Nailed it!' },
    { phrase: 'Daivamme athu enthu goal aayirunnu!', meaning: 'Oh my god, what a goal was that!' },
    { phrase: 'Eee game oru sambhavam aanallo!', meaning: 'This game is quite the event!' },
    { phrase: 'Ellaavarkkum nalla divasam varaatte!', meaning: 'May everyone have a good day!' },
    { phrase: 'Machane!', meaning: 'Dude!' },
    { phrase: 'Pwoli!', meaning: 'Cool!' },
    { phrase: 'Thakarthan!', meaning: 'He smashed it!' },
    { phrase: 'Kidu padam pole!', meaning: 'Like a blockbuster movie!' },
    { phrase: 'Superb aayittundu!', meaning: 'Absolutely superb!' },
    { phrase: 'Enth oru shot!', meaning: 'What a shot!' },
    { phrase: 'Kollaam machane!', meaning: 'Well done bro!' },
];

const MOVIE_REFERENCES = [
    { actor: 'Mohanlal', movie: 'Lucifer', description: 'unstoppable' },
    { actor: 'Mammootty', movie: 'a courtroom drama', description: 'dominated' },
    { actor: 'Dulquer Salmaan', movie: 'Bangalore Days', description: 'smooth as ever' },
    { actor: 'Fahadh Faasil', movie: 'Kumbalangi Nights', description: 'cool and composed' },
    { actor: 'Prithviraj', movie: 'Driving License', description: 'taking charge' },
    { actor: 'Nivin Pauly', movie: 'Premam', description: 'pure magic' },
    { actor: 'Tovino Thomas', movie: 'Minnal Murali', description: 'superhero stuff' },
    { actor: 'Biju Menon', movie: 'Ayyappanum Koshiyumm', description: 'rock solid' },
    { actor: 'Suresh Gopi', movie: 'Commissioner', description: 'commanding authority' },
    { actor: 'Sethuramaiyyer', movie: 'CBI case', description: 'solving it like a detective' },
    { actor: 'Dileep', movie: 'CID Moosa', description: 'comedy gold' },
];

const GOAL_CELEBRATIONS = [
    "WHAT A GOAL! The crowd goes wild!",
    "AND HE SCORES! Absolutely brilliant!",
    "He shoots... GOAL! What a strike!",
    "GOOOAAAL! Nobody saw that coming!",
    "Past the keeper! WHAT A FINISH!",
    "Thunderous shot! The net is bulging!",
    "Top corner! What a beauty!",
    "Cheeky chip! GOAL! Pure genius!",
];

const ACTIONS = [
    "tries a long ball",
    "picks up the ball in midfield",
    "receives a beautiful pass",
    "intercepts a loose ball",
    "wins the ball in a tackle",
    "dribbles past two defenders",
    "plays a one-two pass",
    "makes a darting run down the wing",
    "steps up with a thunderous tackle",
    "nutmegs the opposition! Incredible skill!",
    "delivers a pinpoint cross",
    "with a brilliant through ball",
    "receives the ball... oh, her footwork is poetry in motion!",
];

const SAVES = [
    "But... it's cleared by",
    "It's intercepted by",
    "A beautiful pass to",
    "links up with",
];

const DANCE_REFERENCES = [
    "It's like watching Shobhana dance!",
    "Dancing past defenders like it's Thalapathi!",
    "Celebrating like Sethuramaiyyer solving a CBI case!",
    "Running like there's no tomorrow!",
    "Celebrating like it's Onam! 🎉",
    "That's a classic Spadikam style fight!",
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickPhrase(): string {
    const p = pick(MALAYALAM_PHRASES);
    return `*${p.phrase}* (${p.meaning})`;
}

function pickMovie(): string {
    const m = pick(MOVIE_REFERENCES);
    return `He's like ${m.actor} in ${m.movie}, ${m.description}!`;
}

export function generateCommentary(red: ScoredPlayer[], blue: ScoredPlayer[]): CommentaryResult {
    const allRed = [...red.map(p => p.name)];
    const allBlue = [...blue.map(p => p.name)];
    const events: CommentaryEvent[] = [];

    // Determine score (2-5 goals total, random distribution)
    const totalGoals = 3 + Math.floor(Math.random() * 3); // 3-5 goals
    let blueGoals = 0;
    let redGoals = 0;

    const goalMinutes: number[] = [];
    const usedMins = new Set<number>();
    while (goalMinutes.length < totalGoals) {
        const min = 5 + Math.floor(Math.random() * 85);
        if (!usedMins.has(min)) { goalMinutes.push(min); usedMins.add(min); }
    }
    goalMinutes.sort((a, b) => a - b);

    // Opening
    events.push({
        minute: 'KICK OFF',
        text: `Here we go! Lights, camera, ACTION! The crowd is roaring like a wounded *simham*! Let the game begin!`,
    });

    // Generate goal events
    for (let i = 0; i < goalMinutes.length; i++) {
        const min = goalMinutes[i];
        const isBlue = Math.random() > 0.45; // slight blue bias for drama
        const team = isBlue ? 'Blue' : 'Red';
        const roster = isBlue ? allBlue : allRed;
        const otherRoster = isBlue ? allRed : allBlue;

        if (isBlue) blueGoals++; else redGoals++;

        const scorer = pick(roster);
        const assist = pick(roster.filter(n => n !== scorer)) || scorer;
        const defender = pick(otherRoster);
        const action = pick(ACTIONS);
        const celebration = pick(GOAL_CELEBRATIONS);
        const movie = pickMovie();
        const phrase = pickPhrase();
        const dance = pick(DANCE_REFERENCES);

        const minLabel = min === 45 ? '45+1' : `${min}`;

        // Build narrative
        let narrative = '';
        if (i % 2 === 0) {
            narrative = `${scorer} of the ${team} team ${action}! ${defender} is down! ${assist} to ${scorer}.. ${celebration} ${movie} ${phrase} ${team} team ${isBlue ? 'leading' : 'scores'}! ${blueGoals}-${redGoals}!`;
        } else {
            narrative = `${assist} ${action}! ${dance} A beautiful pass to ${scorer}! But... it's blocked! Wait—${scorer} steps up... ${celebration} GOAL! ${team.toUpperCase()} TEAM SCORES! ${phrase} ${team} team ${min < 50 ? 'leading' : 'pulls one back'}! Score: Blue ${blueGoals} - ${redGoals} Red!`;
        }

        events.push({ minute: `Min ${minLabel}`, text: narrative });

        // Add half-time if we cross 45
        if (min < 45 && (i + 1 < goalMinutes.length ? goalMinutes[i + 1] >= 45 : true)) {
            if (!events.find(e => e.minute === 'HALF TIME')) {
                events.push({
                    minute: 'HALF TIME',
                    text: `Blue team leading ${blueGoals}-${redGoals} at half-time! *${pick(MALAYALAM_PHRASES).phrase}*`,
                });
            }
        }
    }

    // Full time
    const winner = blueGoals > redGoals ? 'Blue' : redGoals > blueGoals ? 'Red' : 'Draw';
    const winnerMovie = pick(MOVIE_REFERENCES);
    events.push({
        minute: 'FULL TIME',
        text: `🏆 The referee blows the whistle! ${winner === 'Draw' ? `It's a DRAW! ${blueGoals}-${redGoals}!` : `${winner.toUpperCase()} TEAM WINS! ${blueGoals}-${redGoals}!`} ${pickPhrase()} What a performance! ${winner !== 'Draw' ? `${winner} team ${winnerMovie.description} like ${winnerMovie.actor} in ${winnerMovie.movie}.` : ''} The ${winner === 'Draw' ? 'teams' : winner === 'Blue' ? 'Red team fought hard' : 'Blue team fought hard'}, but ${winner === 'Draw' ? 'neither could break the deadlock' : "it wasn't enough"}. Congratulations! *Ellaavarkkum nalla divasam varaatte!* (May everyone have a good day!)`,
    });

    return { events, finalScore: { blue: blueGoals, red: redGoals }, winner };
}
