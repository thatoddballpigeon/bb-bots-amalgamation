import { CharacterSheetData } from "../components/castingScreen/castingScreen";
import { GameState, nonEvictedHouseguests, PlayerProfile } from "../model";

export let popSnapshot: { [id: string]: Popularity } = {};

export const FAME = {
    celebrity: { label: 'Celebrity', start: 70, skew: 10, color: '#fbbf24' },
    alumni: { label: 'Alumni Relative', start: 65, skew: 5, color: '#60a5fa' },
};
export const FAME_BY_ARCHETYPE = {
    "The Celebrity": 'celebrity',
    "The Fan Favorite": 'celebrity',
    "The Reality Vet": 'alumni',
    "The Alumni's Relative": 'alumni',
};

export const CLASS_POP_DRIFT = {
    'Comp Beasts': 0.20,
    'Outcasts': 0.20,
    'Confessionalists': 0.18,
    'Jesters': 0.18,
    'Showmances': 0.18,
    'Social Butterflies': 0.18,
    'Villains': 0.18,
    'Floaters': 0.16,
    'Strategists': 0.13,
    'Superfans': 0.13,
    'Homemakers': 0.10,
    'Production Pets': 0.10,
    'Underdogs': 0.10,
};
export const CLASS_POP_SKEW = {
    'Production Pets':    +4,   // the edit is on their side all season
    'Underdogs':          +4,   // the crowd roots for them by default
    'Comp Beasts':        +3,   // viewers reward the player who keeps winning
    'Homemakers':         +2,   // easy to like, hard to dislike
    'Jesters':            +2,   // comic relief buys a lot of goodwill
    'Showmances':         +1,
    'Social Butterflies': +1,
    'Superfans':          +1,   // the audience is on their side
    'Confessionalists':    0,   // pure amplifier, they earn whatever they get
    'Strategists':        -1,   // respected more than liked
    'Floaters':           -2,   // forgettable reads slightly negative
    'Outcasts':           -3,
    'Villains':           -5,
};
export const POP_DRIFT_DEFAULT = 0.13;

export interface Popularity {
    fame: string | null;
    popularity: number;
    startPopularity?: number;
    _popTouched?: boolean;
}

export function fameOf(c: PlayerProfile) {
    if (!c) return null;
    const fame = c.popularity.fame as keyof typeof FAME;
    return (fame && FAME[fame]) ? FAME[fame] : null;
}

function applyFamePreset(c: PlayerProfile) {
    if (!c || c.popularity.fame) return c;
    const preset = FAME_BY_ARCHETYPE[c.archetype as keyof typeof FAME_BY_ARCHETYPE];
    if (preset) c.popularity.fame = preset;
    return c;
}

export function applyStartingPopularity(c: PlayerProfile) {
    if (c && typeof c.popularity.startPopularity === 'number') return Math.max(0, Math.min(100, c.popularity.startPopularity));
    return fameOf(c)?.start ?? 50;
}

export function toggleCustomPop(player: PlayerProfile, checked: boolean): PlayerProfile {
    const updatedPopularity = { ...player.popularity };

    if (checked) {
        updatedPopularity.startPopularity = (updatedPopularity._popTouched && typeof updatedPopularity.startPopularity === 'number')
            ? updatedPopularity.startPopularity
            : (fameOf(player)?.start ?? 50);
    } else {
        updatedPopularity.startPopularity = undefined;
        updatedPopularity._popTouched = undefined;
    }

    return {
        ...player,
        popularity: updatedPopularity
    };
}

export function toggleFame(player: PlayerProfile, checked: boolean): PlayerProfile {
    const updatedPopularity = {
        ...player.popularity,
        fame: checked ? (player.popularity.fame || 'celebrity') : null
    };

    if (typeof updatedPopularity.startPopularity === 'number' && !updatedPopularity._popTouched) {
        updatedPopularity.startPopularity = fameOf(player)?.start ?? 50;
    }

    return {
        ...player,
        popularity: updatedPopularity
    };
}

export function takePopularitySnapshot(gameState: GameState) {
    const houseguests = nonEvictedHouseguests(gameState);
    const snap = Object.fromEntries(houseguests.map(c => [c.id, c.popularity ?? 50]));
    popSnapshot = snap;
}