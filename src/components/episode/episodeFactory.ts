import { GameState, MutableGameState, nonEvictedHouseguests } from "../../model/gameState";
import { Episode, Houseguest } from "../../model";
import { EpisodeType, Split } from "./episodes";
import { Relationship, seedTraitsAndRelationships } from "../../utils";
import { EpisodeLog } from "../../model/logging/episodeLog";
import { refreshHgStats } from "./utilities/evictHouseguest";
import { cast$ } from "../../subjects/subjects";
import { applyPopularityDecay } from "./utilities/houseEventFactory";
import { computeEpisodeRating } from "./utilities/tvRatings";

export function firstImpressionsMap(hgs: number): Record<number, Record<number, Relationship>> {
    const { sin, cos, acos, PI, random } = Math;
    const TWO_PI = PI * 2;

    const compX = new Float64Array(hgs);
    const compY = new Float64Array(hgs);
    const compZ = new Float64Array(hgs);

    const map: Record<number, Record<number, Relationship>> = {};

    for (let i = 0; i < hgs; i++) {
        map[i] = {};
        // generate random spherical co-ordinates on the unit sphere
        const u = random();
        const v = random();
        const θ = 2 * PI * u;
        const φ = acos(2 * v - 1);

        const sinPhi = sin(φ);
        let x = sinPhi * cos(θ);
        let y = sin(θ) * sinPhi;
        let z = cos(φ);

        if (x === 0 && y === 0 && z === 0) {
            x = 1;
        }

        compX[i] = x;
        compY[i] = y;
        compZ[i] = z;
    }

    for (let i = 0; i < hgs; i++) {
        const mapI = map[i];
        const xi = compX[i];
        const yi = compY[i];
        const zi = compZ[i];
        for (let j = i + 1; j < hgs; j++) {
            const xj = compX[j];
            const yj = compY[j];
            const zj = compZ[j];
            const dotProduct = xi * xj + yi * yj + zi * zj;
            const angle = acos(Math.max(-1, Math.min(1, dotProduct))); 
            const impression = 1 - (2 * angle) / PI;
            mapI[j] = { friendship: impression, romance: 100, isRelated: false };
            map[j][i] = { friendship: impression, romance: 100, isRelated: false };
        }
    }
    return map;
}

export function nextEpisode(oldState: GameState, episodeType: EpisodeType): Episode {
    let newState = new MutableGameState(oldState);

    if (oldState.episode === 0) {
        seedTraitsAndRelationships(newState);
        if (cast$.value.options?.currentTribes) {
            const tribes = cast$.value.options.currentTribes;
            newState.houseguests.forEach((hg) => {
                hg.tribe = tribes[hg.id];
            });
        }
    }
    !episodeType.pseudo && newState.episode++;
    !episodeType.pseudo && newState.resetLogIndex();
    if (oldState.remainingPlayers > oldState.finalFinalistsSize() && !episodeType.pseudo) {
        newState.log[newState.episode] = [new EpisodeLog()];
    }
    !episodeType.pseudo && (newState.currentLog.weekEmoji = episodeType.emoji || "");
    const split: Split[] = episodeType.splitFunction ? episodeType.splitFunction(newState) : [];
    newState.split = split;
    refreshHgStats(newState, split, true);
    nonEvictedHouseguests(newState).forEach((hg) => {
        hg.previousPopularity = hg.housePopularity;
        applyPopularityDecay(hg);
    });
    const finalState = new GameState(newState);

    if (!episodeType.canPlayWith(finalState.remainingPlayers, finalState.finalFinalistsSize()))
        throw new Error(
            `Episode type ${episodeType.name} not playable with ${finalState.remainingPlayers} players`
        );
    return episodeType.generate(finalState);
}
