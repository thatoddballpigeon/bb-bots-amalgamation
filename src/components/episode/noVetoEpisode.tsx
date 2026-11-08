import { GameState } from "../../model";
import { generateBBVanillaScenes } from "./bigBrotherEpisode";
import { EpisodeType, Episode } from "./episodes";

let offset = 1;

export const NoVeto: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n >= finalists + 1,
    eliminates: 1,
    emoji: "🚫",
    name: "No Power of Veto",
    description: "A week without a veto.",
    generate: generateNoVeto,
};

function generateNoVeto(initialGamestate: GameState): Episode {
    const episode = generateBBVanillaScenes(initialGamestate, { veto: null });
    return new Episode({
        gameState: new GameState(episode.gameState),
        initialGamestate,
        scenes: episode.scenes,
        type: NoVeto,
    });
}
