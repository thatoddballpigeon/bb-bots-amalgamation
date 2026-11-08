import { SecretTwin } from "../utils";
import { Intruder } from "../utils/intruder";
import { Popularity } from "../utils/popularity";
import { StatsMap, newStatsMap } from "../utils/statsMap";

interface InitPlayerProfile {
    readonly imageURL: string;
    readonly name: string[];
    readonly alias: string;
    readonly gender: string;
    readonly age: number;
    readonly hometown: string;
    readonly occupation: string;
    readonly archetype: string;
    readonly stats: StatsMap;
    readonly traits: number[];
    readonly intruder: Intruder;
    readonly secretTwin: SecretTwin;
    readonly disableShowmances: boolean;
    readonly popularity: Popularity;
    readonly attractedTo: string[];
}

export class PlayerProfile {
    public imageURL: string = "";
    public name: string[] = [];
    public alias: string = "";
    public gender: string = "Female";
    public age: number = 0;
    public hometown: string = "";
    public occupation: string = "";
    public personality: string = "Balanced";
    public archetype: string = "Blank Slate";
    // Stats range from 1 to 10
    public stats: StatsMap = newStatsMap();
    public traits: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

    public disableShowmances: boolean = false;
    public attractedTo: string[] = [];

    public intruder: Intruder = { isIntruder: false, introWeek: 0 }
    public secretTwin: SecretTwin = { isTwin: false, isPrimaryTwin: false, twinPartner: null, twinEntryEpisode: null };

    public popularity: Popularity = { fame: null, popularity: 50, startPopularity: undefined, _popTouched: false };
    public castingScreenId?: number | undefined = 0;
    
    constructor(init: InitPlayerProfile) {
        if (!init) {
            return;
        }
        Object.assign(this, init);
    }
}
