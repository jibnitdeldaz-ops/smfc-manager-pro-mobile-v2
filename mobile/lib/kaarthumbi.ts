// Kaarthumbi's Corner — Local Panel Discussion Generator
// Replicates the ai_scout.py Gemini prompt with all 5 characters
// 80% English, 20% Malayalam punchlines (matching the language rule)

export interface PanelMessage {
    character: string;
    text: string;
    color: string;    // bubble color
    emoji: string;    // avatar emoji
    side: 'left' | 'right'; // left = Kaarthumbi, right = panelists
}

// Character definitions from ai_scout.py
const CHARACTERS = {
    kaarthumbi: { name: 'KAARTHUMBI', color: '#43a047', emoji: '🐵', side: 'left' as const },
    induchoodan: { name: 'INDUCHOODAN', color: '#d32f2f', emoji: '🔥', side: 'right' as const },
    appukuttan: { name: 'APPUKUTTAN', color: '#F97316', emoji: '🐶', side: 'right' as const },
    bellaryRaja: { name: 'BELLARY RAJA', color: '#FBC02D', emoji: '😎', side: 'right' as const },
    ponjikkara: { name: 'PONJIKKARA', color: '#757575', emoji: '😴', side: 'right' as const },
};

// --- KAARTHUMBI (Host, rustic, innocent) ---
const KAARTHUMBI_OPENERS = [
    (q: string) => `Enthokkeyaanu ivide nadakkunnathu? Ivide footballine kurichu oru charcha nadakkaan pokunnu. ${q}... ningal enthu parayunnu?`,
    (q: string) => `Aaha! Nammal innale raathri muzhuvan aalochichathaa... ${q}. Ithine patti ningal enthenkilum parayuu.`,
    (q: string) => `Oru kaaryam chodicholotte... ${q}. Ithinte oru discussion nadathaam, enthaa ningalude abhipraayam?`,
    (q: string) => `Machane! ${q}... ithokke kettaal enikku thala churrunnu! Panel, ningal parayu!`,
    (q: string) => `Njan oru simple kaaryam chodyikkatte... ${q}. Ee vishayathil ningalude opinion enthaanu?`,
];

const KAARTHUMBI_REACTIONS = [
    (name: string) => `Appukutta! Enthuvaalaa nee ee parayunnathu?! ${name}ine patti enkilum parayu.`,
    (name: string) => `Aiyyo! Ningalokke enthu parayannaanu! Bellary Raajaa, ningal parayu.`,
    (name: string) => `Bas cheydaa! Bas cheydaa! Nirthu ithu! Enikku thala vedhanikunnu!`,
    () => `Ponjikkara, nee enthinaa urangunnath?! Ezhunelkk mone!`,
    () => `Sheri sheri... enikkum koode parayaanam... pakshe enikku confusion aanallo!`,
];

// --- INDUCHOODAN (Fiery, "Mone Dinesha!") ---
const INDUCHOODAN_LINES = [
    (player: string) => `${player}? ${player}inte ullil aashayundaayal, theeyundaayal, kazhivundaayal, avanu number 1 aavaan kazhiyum! Athu ningal urappikkenda kaaryamilla. Performance maatrame ulloo!`,
    (player: string) => `Mone Dinesha! ${player} ennalum nallavanaanu! But effort ondaakkanam! Fight aanu! Jeee...vitham aanu! ${player}inu chance undu!`,
    (player: string) => `Enthadaa ningalokke! Football ennu paranjal raktham aanu! Fight aanu! ${player} kalichaal, field thakarthum!`,
    (player: string) => `${player}ine patti chodiikkaruthu! Avanu maidaanam thanneya veendathu! Avalude footwork kandu nokkuu... *Spadikam* level!`,
    (player: string) => `*Polikkunnu shavam!* ${player}, nee kalikkumbol nammal CBI case pole investigate cheyyum! Every pass, every shot!`,
];

// --- APPUKUTTAN (Delusional corporate jargon, "Akosoto!") ---
const APPUKUTTAN_LINES = [
    (player: string) => `Akosoto! ${player}'s current situation presents a tactical constipation. He needs to engage in paradigm shifting and strategical discombobulation to achieve apex predator status!`,
    (player: string) => `Akosoto! Without proper econometric projections and a SWOT analysis, ${player}'s ascent to the zenith of footballing glory remains a stochastic probability!`,
    (player: string) => `Akosoto! ${player} needs to synergize his core competencies with a dynamic action plan! The KPIs are clear — footwork ROI must exceed 200%!`,
    (player: string) => `Akosoto! My comprehensive analysis using blockchain methodology and quantum computing reveals that ${player} has a fundamental infrastructure deficit in the midfield ecosystem!`,
    (player: string) => `Akosoto! I propose a 12-point agile framework for ${player}'s career development lifecycle! First, we need stakeholder alignment and then cross-functional calibration!`,
];

// --- BELLARY RAJA (Business/investment POV, "Yenthaada uvve") ---
const BELLARY_LINES = [
    (player: string) => `Yenthaada uvve! ${player} number 1 aakaan kazhiyumennu chothichaal, athoru valiya investment decision aanu. Avanu sponsor cheyyan kazhiyunath, avante market value enthaanu ennu nokkande? ROI kazhiyunnathre ulluu. Avare kurachu paisa labham undakkaan ulla chance undaaku.`,
    (player: string) => `Yenthaada uvve! ${player}nte performance graph nokkiiyaal, quarterly growth 15% aanu. But operating costs... athinu thante budget nokkande saare!`,
    (player: string) => `Induchoodane, shaantam! Athu chance undaavan vendi paisa valicheriyenda varaam. Loss vannal njan sammathikkilla. ${player}ine market rate il evaluate cheyyuu!`,
    (player: string) => `Yenthaada uvve! ${player}nte brand value 200% increase aayittundu last season! Avante shares vaangiyal nammukku profit kittiyal, football career manage cheyyaam! *Paisa varum machane!*`,
    (player: string) => `${player}ine sponsorship kodukkaanallo plan? Avante jersey la QR code idaam! Every goal nu 10% commission! *Business is business!*`,
];

// --- PONJIKKARA (Confused, wants to go home) ---
const PONJIKKARA_LINES = [
    () => `Football... athu basketball pole aano? Enikku veetil pokanam. Enikku enthu cheyyanamennu ariyilla.`,
    () => `Enikku veetil pokanam. Amme!`,
    () => `Njaan ivide enthinu vannu? Football aano cricket aano? *Confused panda noises*`,
    () => `Sheri... athu pole thanne... enikku oru chai koodi... pakshe veetil pokanam innale thanne!`,
    () => `*Yawns* Enthaa? Match kazhinjoo? Njan urangipoyee... veetil pokanam, ammayodu promise cheythathaa!`,
    () => `Evide pokanam ennanu ente chodyam. Football alla, bus stop enthaanu? Enikku iranganam!`,
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extractPlayerName(query: string): string {
    // Try to extract a player name from the question
    const words = query.split(/\s+/);
    // Look for capitalized words (player names) that aren't common words
    const commonWords = new Set(['can', 'is', 'the', 'a', 'an', 'who', 'what', 'how', 'why', 'about',
        'become', 'number', 'player', 'best', 'top', 'good', 'bad', 'played', 'well',
        'will', 'be', 'has', 'have', 'does', 'do', 'should', 'could', 'would', 'their']);
    for (const word of words) {
        const clean = word.replace(/[?!.,]/g, '');
        if (clean.length > 2 && !commonWords.has(clean.toLowerCase()) && clean[0] === clean[0].toUpperCase()) {
            return clean;
        }
    }
    return words[words.length - 1]?.replace(/[?!.,]/g, '') || 'this player';
}

export function generatePanelDiscussion(userQuery: string): PanelMessage[] {
    const player = extractPlayerName(userQuery);
    const messages: PanelMessage[] = [];

    // 1. Kaarthumbi opens
    messages.push({
        ...CHARACTERS.kaarthumbi,
        text: pick(KAARTHUMBI_OPENERS)(userQuery),
    });

    // 2. Induchoodan fires first
    messages.push({
        ...CHARACTERS.induchoodan,
        text: pick(INDUCHOODAN_LINES)(player),
    });

    // 3. Appukuttan tries corporate jargon
    messages.push({
        ...CHARACTERS.appukuttan,
        text: pick(APPUKUTTAN_LINES)(player),
    });

    // 4. Kaarthumbi reacts
    messages.push({
        ...CHARACTERS.kaarthumbi,
        text: pick(KAARTHUMBI_REACTIONS)(player),
    });

    // 5. Bellary Raja with business angle
    messages.push({
        ...CHARACTERS.bellaryRaja,
        text: pick(BELLARY_LINES)(player),
    });

    // 6. Ponjikkara confused
    messages.push({
        ...CHARACTERS.ponjikkara,
        text: pick(PONJIKKARA_LINES)(),
    });

    // 7. Induchoodan fires back
    messages.push({
        ...CHARACTERS.induchoodan,
        text: pick(INDUCHOODAN_LINES)(player),
    });

    // 8. Bellary Raja counters
    messages.push({
        ...CHARACTERS.bellaryRaja,
        text: pick(BELLARY_LINES)(player),
    });

    // 9. Appukuttan tries again
    messages.push({
        ...CHARACTERS.appukuttan,
        text: pick(APPUKUTTAN_LINES)(player),
    });

    // 10. Kaarthumbi closes
    messages.push({
        ...CHARACTERS.kaarthumbi,
        text: `Bas cheydaa! Bas cheydaa! Nirthu ithu! Enikku thala vedhanikunnu! Sheri... ${player}nu ella bhaaviiyum neriyude nethaavalloo! *Ellaavarkkum nalla divasam varaatte!*`,
    });

    // 11. Ponjikkara last word
    messages.push({
        ...CHARACTERS.ponjikkara,
        text: `Enikku veetil pokanam. Amme!`,
    });

    return messages;
}
