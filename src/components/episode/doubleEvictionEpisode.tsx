import { GameState, MutableGameState } from "../../model";
import { generateBBVanillaScenes } from "./bigBrotherEpisode";
import { Episode, EpisodeType } from "./episodes";
import React from "react";
import { Scene } from "./scenes/scene";
import { GoldenVeto } from "./veto/veto";

let offset = 1;

export const DoubleEviction: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n >= finalists + 1,
    eliminates: 1,
    emoji: "⏩",
    chainable: true,
    name: "Double Eviction",
    description: "A second round of Big Brother plays out in a single scene.",
    generate: generateDoubleEviction,
};

function generateDoubleEviction(initialGamestate: GameState): Episode {
    let currentGameState = new MutableGameState(initialGamestate);

    currentGameState.incrementLogIndex();
    const doubleEviction = generateBBVanillaScenes(currentGameState, {
        veto: GoldenVeto,
        doubleEviction: true,
    });
    currentGameState = doubleEviction.gameState;

    return new Episode({
        gameState: new GameState(currentGameState),
        initialGamestate,
        scenes: doubleEviction.scenes,
        type: DoubleEviction,
    });
}
