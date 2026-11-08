import { Episode, EpisodeType, GameState, MutableGameState } from "../../model";
import React from "react";
import { GoldenVeto } from "./veto/veto";
import { generateBBVanillaScenes } from "./bigBrotherEpisode";

export const TripleEvictionCad: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n >= finalists + 2,
    eliminates: 2,
    emoji: "🇨🇦",
    chainable: true,
    name: "Triple Eviction",
    description:
        "A double eviction with three nominees. Houseguests vote to save one, and the other two are evicted.",
    generate: generateTripleEvictionCad,
};

export function generateTripleEvictionCad(initialGamestate: GameState): Episode {
    let currentGameState = new MutableGameState(initialGamestate);

    currentGameState.incrementLogIndex();
    const tripleEvictionCad = generateBBVanillaScenes(currentGameState, {
        veto: GoldenVeto,
        doubleEviction: true,
        thirdNominee: true,
        votingTo: "Save",
        hohCompetitionCustomText:
            `Houseguests, please return to the living room. Tonight will be
                ${currentGameState.week > 1 ? "another triple" : "a triple"} eviction.`,
    });
    currentGameState = tripleEvictionCad.gameState;

    return new Episode({
        gameState: new GameState(currentGameState),
        initialGamestate,
        scenes: tripleEvictionCad.scenes,
        type: TripleEvictionCad,
    });
}
