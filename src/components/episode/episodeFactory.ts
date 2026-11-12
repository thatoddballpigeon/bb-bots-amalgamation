import { GameState, MutableGameState, nonEvictedHouseguests } from "../../model/gameState";
import { Episode } from "../../model";
import { EpisodeType, Split } from "./episodes";
import { firstImpressions } from "../../utils";
import { EpisodeLog } from "../../model/logging/episodeLog";
import { refreshHgStats } from "./utilities/evictHouseguest";
import { cast$ } from "../../subjects/subjects";
import { applyPopularityDecay } from "../../utils/popularity";

export function nextEpisode(oldState: GameState, episodeType: EpisodeType): Episode {
    console.time("⏱️totalNextEpisode");
    let newState = new MutableGameState(oldState);

    if (oldState.episode === 0) {
        firstImpressions(newState);
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
    const activeHouseguests = nonEvictedHouseguests(newState);
    for (let i = 0; i < activeHouseguests.length; i++) {
        const hg = activeHouseguests[i];
        hg.previousPopularity = hg.housePopularity;
        applyPopularityDecay(hg);
    }
    
    const finalState = new GameState(newState);

    if (!episodeType.canPlayWith(finalState.remainingPlayers, finalState.finalFinalistsSize()))
        throw new Error(
            `Episode type ${episodeType.name} not playable with ${finalState.remainingPlayers} players`
        );
        
    console.time("💥episodeType.generate");
    const result = episodeType.generate(finalState);
    console.timeEnd("💥episodeType.generate");
    
    console.timeEnd("⏱️totalNextEpisode");
    return result;
}
