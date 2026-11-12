import { Houseguest } from "./houseguest";
import { PlayerProfile } from "./playerProfile";
import _ from "lodash";
import { computeTraits, linear_transform, randomInt, Relationships } from "../utils";
import { EpisodeLog } from "./logging/episodeLog";
import { Split } from "../components/episode/episodes";
import { Alliances } from "../utils/alliances";
import { HouseguestMemory } from "./logging/episodeMemory";
import { Convictions } from "../utils/ai/convictions";

export function getHouseguestById(gameState: GameState, id: number): Houseguest {
    return gameState.houseguestCache[id];
}

export function excludeHouseguests(inclusions: Houseguest[], exclusions: Houseguest[]) {
    const excludedIds = exclusions.map((hg) => hg.id);
    return inclusions.filter((hg) => !excludedIds.includes(hg.id) && !hg.isEvicted);
}

export function randomPlayer(inclusions: Houseguest[], exclusions: Houseguest[] = []): Houseguest {
    if (inclusions.length === 0) {
        throw new Error("Tried to get a random player from a list of 0 players.");
    }
    const options = excludeHouseguests(inclusions, exclusions);
    const choice = Math.floor(Math.random() * options.length);

    return options[choice];
}

export function hgPreferredName(houseguest: Houseguest, fullName?: boolean): string {
    return fullName ? houseguest.name.join(" ") : houseguest.alias || houseguest.name[0];
}

export function hgPronoun(houseguest: Houseguest, type?: number): string {
    switch (houseguest.gender) {
        case "Female":
            return type === 0 ? "she" : type === 1 || type === 3 ? "her" : type === 2 ? "hers" : type === 4 ? "she's" : "herself";
        case "Male":
            return type === 0 ? "he" : type === 1 || type === 2 ? "his" : type === 3 ? "him" : type === 4 ? "he's" : "himself";
        default:
            return type === 0 ? "they" : type === 1 ? "their" : type === 2 ? "theirs" : type === 3 ? "them" : type === 4 ? "they're" : "themselves";
    }
}

export function nonEvictedHouseguests(gameState: GameState): Houseguest[] {
    return [...gameState.nonEvictedHouseguests.entries()].map(([_, id]) => getHouseguestById(gameState, id));
}

export function getJurors(gameState: GameState): Houseguest[] {
    return gameState.houseguests.filter((hg) => hg.isJury);
}

export function inJury(gameState: GameState): Boolean {
    return gameState.remainingPlayers - (gameState.finalFinalistsSize() - 1) <= gameState.finalJurySize();
}

export function calculatePopularity(gameState: GameState, hero: Houseguest, house: Houseguest[]) {
    let sum = 0;
    let count = 0;
    const targetId = hero.id;
    house.forEach((houseguest) => {
        if (houseguest.id !== targetId) {
            count++;
            sum += houseguest.relationshipWith(gameState, hero) / 100;
        }
    });
    return count === 0 ? 0 : sum / count;
}

export function calculateThreatScore(gameState: GameState, hero: Houseguest, perceptor?: Houseguest) {
    const compWins = hero.hoh.hohWins + hero.pov.povWins;
    const statWeight = Math.min(0.25 + compWins * 0.18, 1.0);
    const rawStats = (hero.stats.physical + hero.stats.mental + hero.stats.endurance) * statWeight;

    let threat = rawStats + (compWins * 2);

    if (perceptor) {
        const traits = perceptor.traits, personality = perceptor.personality;
        const relationship = perceptor.relationshipWith(gameState, hero);
        const clampedStrength = Math.max(-100, Math.min(100, relationship));
        const multiplier = linear_transform(clampedStrength, -100, 100, 2, 0.2);
        threat *= multiplier;

        const fearFactor = personality === "Neurotic" ? randomInt(2, 4) :
        personality === "Weak-willed" ? 4.5 : 5;
        if (fearFactor < 5) { 
            const fearAmplifier = (5 - fearFactor) * 0.15; // Up to 60% reduction for very fearful players
            threat *= (1 + fearAmplifier);
        }

        const loyalty = traits[1];
        if ((loyalty > 0.2 || personality === "Loyal Ally") && relationship >= 60 && compWins > 0) {
            threat *= 0.3; // 70% reduction for loyal players protecting liked challenge winners
        }

        if (perceptor.archetype === "Paranoid" || -traits[6] > 0.4) {
            threat *= 1.25;
        }
    }

    const activeShowmances = gameState.alliances.filter(s => s.isActive && s.isShowmance);
    const showmance = activeShowmances.find(s => s.members.includes(hero.id));
    if (showmance) {
        const episodesSinceFormation = gameState.episode - (showmance.episodeFormed || 1);
        const showmanceThreatBonus = episodesSinceFormation * 2;
        threat += showmanceThreatBonus;
    }

    return Math.max(0, Math.min(threat, 100));
}

export function defaultJurySize(castSize: number): number {
    castSize = Math.round(castSize * 0.55);
    if (castSize % 2 === 0) {
        castSize--;
    }
    return castSize;
}

export function validateJurySize(j: number, castSize: number): boolean {
    return j >= 1 && j % 2 === 1 && castSize - 2 >= j;
}

class _GameState {
    private jurors: number = 0;
    private finalists: number = 0;
    readonly houseguests: Houseguest[] = [];
    public hohPlaysVeto: boolean = true;
    public haveNotsEnabled: boolean = false;
    public split: Split[] = [];

    public finalJurySize() {
        return this.jurors;
    }
    public finalFinalistsSize() {
        return this.finalists;
    }

    set jurySize(j: number) {
        if (!validateJurySize(j, this.houseguests.length)) {
            return;
        }
        this.jurors = j;
    }
    set finalistSize(f: number) {
        if (f < 2 || f > 10) return;
        this.finalists = f;
    }
}

interface InitGameState {
    players: PlayerProfile[];
    jury: number;
    finalists: number;
    hohPlaysVeto?: boolean;
    haveNotsEnabled?: boolean;
    split?: Split[];
}

export class GameState extends _GameState {
    // State of the game after a phase.

    readonly houseguestCache: { [id: number]: Houseguest } = {};
    readonly nonEvictedHouseguests: Set<number> = new Set<number>();
    readonly remainingPlayers: number = 0;
    readonly episode: number = 0;
    readonly previousHOH: Houseguest[] = [];
    readonly log: EpisodeLog[][] = [];
    readonly alliances: Alliances[] = [];
    readonly relationships: Record<number, Record<number, Relationships>> = {};
    readonly convictions: Convictions[][] = [];
    readonly timeOfDay: string = "sunrise";
    readonly memory: HouseguestMemory = { lobbyingLog: [], whispers: [], alignmentChecks: [], allianceTargets: [], episodeRelDelta: [] };

    public week: number = 0;
    get currentLog(): EpisodeLog {
        if (!this.log[this.episode]) return new EpisodeLog();
        return this.log[this.episode][this.week];
    }

    public incrementLogIndex() {
        this.week++;
        this.log[this.episode].push(new EpisodeLog());
    }
    public resetLogIndex() {
        this.week = 0;
    }

    public constructor(init: InitGameState | GameState) {
        super();
        if (init instanceof GameState || init instanceof MutableGameState) {
            Object.assign(this, init);
        } else {
            const _init = init as InitGameState;
            const profiles = _init.players;
            this.remainingPlayers = profiles.length;
            profiles.forEach((profile, i) => {
                const hg: Houseguest = new Houseguest({
                    ...profile,
                    id: i,
                    traits: computeTraits(profile).map(v => Math.max(-1, Math.min(1, v + (Math.random() * 2 - 1) * 0.15))),
                });
                this.nonEvictedHouseguests.add(i);
                this.houseguestCache[i] = hg;
                this.houseguests.push(hg);
            });
            this.jurySize = _init.jury;
            this.finalistSize = _init.finalists;
            this.hohPlaysVeto = _init.hohPlaysVeto === false ? false : true;
            this.haveNotsEnabled = _init.haveNotsEnabled === false ? false : true;
        }
        if (!this.finalJurySize()) this.jurySize = defaultJurySize(this.houseguests.length);
        if (!this.finalFinalistsSize()) this.finalistSize = 3;
    }
}

export class MutableGameState extends _GameState {
    public houseguestCache: { [id: number]: Houseguest } = {};
    readonly nonEvictedHouseguests: Set<number> = new Set<number>();
    public timeOfDay: string = "sunrise";
    public remainingPlayers: number = 0;
    public episode: number = 0;
    public previousHOH: Houseguest[] = [];
    public alliances: Alliances[] = [];
    public relationships: Record<number, Record<number, Relationships>> = {};
    public convictions: Convictions[][] = [];
    public log: EpisodeLog[][] = [];
    public memory: HouseguestMemory = { lobbyingLog: [], whispers: [], alignmentChecks: [], allianceTargets: [], episodeRelDelta: [] };
    
    public week: number = 0;
    get currentLog(): EpisodeLog {
        if (!this.log[this.episode]) return new EpisodeLog();
        return this.log[this.episode][this.week];
    }

    public incrementLogIndex() {
        this.week++;
        this.log[this.episode].push(new EpisodeLog());
    }
    public resetLogIndex() {
        this.week = 0;
    }

    public constructor(init: GameState | MutableGameState) {
        super();
        const copy = _.cloneDeep(init);
        Object.assign(this, copy);
    }
}