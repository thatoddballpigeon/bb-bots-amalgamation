import React from "react";
import { GameState, MutableGameState } from "../../model";
import { generateBBVanillaScenes } from "./bigBrotherEpisode";
import { EpisodeType, Episode } from "./episodes";

export const InstantEviction: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n >= finalists + 1,
    eliminates: 1,
    emoji: "⚡",
    chainable: true,
    name: "Instant Eviction",
    description: "A double eviction without a veto.",
    generate: generateInstantEviction,
};

function generateInstantEviction(initialGamestate: GameState): Episode {
    let currentGameState = new MutableGameState(initialGamestate);

    currentGameState.incrementLogIndex();
    const instantEviction = generateBBVanillaScenes(currentGameState, {
        veto: null,
        doubleEviction: true
    });
    currentGameState = instantEviction.gameState;

    return new Episode({
        gameState: new GameState(currentGameState),
        initialGamestate,
        scenes: instantEviction.scenes,
        type: InstantEviction,
    });
}
