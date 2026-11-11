import { PlayerProfile } from "./playerProfile";
import { Tribe } from "./tribe";
import { HitListEntry } from "../utils/ai/hitList";
import { listFullName } from "../utils/listStrings";
import { GameState } from "./gameState";

interface HouseguestInit extends PlayerProfile {
    id: number;
}

interface HohOptions {
    isHoH: boolean;
    hohWins: number;
    nominated: Houseguest[];
}
interface PovOptions {
    hasVeto: boolean;
    povWins: number;
    saved: Houseguest[];
    replacements: Houseguest[];
}
interface PlayerBuffs {
    exercise?: { amount: number, episode: number } | null;
}

export class Houseguest extends PlayerProfile {
    public hoh: HohOptions = { isHoH: false, hohWins: 0, nominated: [] };
    public pov: PovOptions = { hasVeto: false, povWins: 0, saved: [], replacements: [] };
    public buffs: PlayerBuffs = {};

    public isEvicted: boolean = false;
    public isJury: boolean = false;
    public isNominated: boolean = false;
    public nominatedBy: number[] = [];
    public nominatorId: number = -1;
    public isHaveNot: boolean = false;
    public isHidden: boolean = this.intruder.isIntruder || (this.secretTwin.isTwin && !this.secretTwin.isPrimaryTwin);

    public tribe?: Tribe;
    readonly id: number = 0;

    public nominations: number = 0;
    public hohWins: number = 0;
    public povWins: number = 0;

    // Popularity ranges from -1 to 1
    public compatibility: [number, number, number] = [0, 0, 0];
    public housePopularity: number = 0;
    public deltaPopularity: number = 0;
    public previousPopularity: number = 0;

    public interactedWith: Set<number> = new Set<number>();

    // Power rankings range from 0 to 1
    public powerRanking: number = 0;
    readonly superiors: { [id: number]: number } = {}; // { id : pHeroWins }

    public preferredName(fullName?: boolean): string {
        return fullName ? listFullName(this.name) : this.alias || this.name[0];
    }
    public pronoun(type?: number): string {
        switch (this.gender) {
            case "Female":
                return type === 0 ? "she" : type === 1 || type === 3 ? "her" : type === 2 ? "hers" : type === 4 ? "she's" : "herself";
            case "Male":
                return type === 0 ? "he" : type === 1 || type === 2 ? "his" : type === 3 ? "him" : type === 4 ? "he's" : "himself";
            default:
                return type === 0 ? "they" : type === 1 ? "their" : type === 2 ? "theirs" : type === 3 ? "them" : type === 4 ? "they're" : "themselves";
        }
    }

    public relationshipWith(gameState: GameState, villain: Houseguest): number { return gameState.relationships[this.id]?.[villain.id]?.strength ?? 0; }
    public romanceWith(gameState: GameState, villain: Houseguest): number { return gameState.relationships[this.id]?.[villain.id]?.romance ?? 0; }
    
    public friends = 0;
    public enemies = 0;
    public targetingMe = 0;

    // FIXME: uhhh maybe add a day/night cycle while randomizing everyone's locations per... time of day. yea
    public location: string = "Living Room";

    constructor(init: HouseguestInit) {
        super(init);
        Object.assign(this, init);
    }
}
