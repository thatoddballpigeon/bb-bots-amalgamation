import { GameState } from "../../model";
import { generateBBVanillaScenes } from "./bigBrotherEpisode";
import { EpisodeType, Episode } from "./episodes";
import { GoldenVeto } from "./veto/veto";

export const DoubleVeto: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n >= finalists + 1,
    eliminates: 1,
    emoji: "💍💍",
    name: "Double Power of Veto",
    description: "A week with two Power of Veto winners.",
    generate: generateDoubleVeto,
};

function generateDoubleVeto(initialGamestate: GameState): Episode {
    const episode = generateBBVanillaScenes(initialGamestate, {
        doubleVeto: true,
        veto: GoldenVeto,
    });

    return new Episode({
        gameState: new GameState(episode.gameState),
        initialGamestate,
        scenes: episode.scenes,
        type: DoubleVeto,
    });
}